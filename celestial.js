/* ============================================================================
 * celestial.js — Halo orbital del zodíaco sobre Canvas
 *
 * FUENTE ÚNICA DE DATOS: window.ZODIAC_DATA (zodiac-data.js) con estrellas
 * reales RA/Dec J2000 (Hipparcos) y segmentos de Stellarium. NO existe ningún
 * catálogo manual: las figuras nunca se definen con coordenadas inventadas.
 *
 * Acuario (Aqr, la principal):
 *   - Queda SIEMPRE fija exactamente en el centro de la pantalla.
 *   - No orbita, no gira, no cambia de orientación y no se deforma.
 *   - Se dibuja por el sistema interactivo (#universe-container), centrado
 *     con transform-origin 50% 50% que coincide con el origen del halo.
 *
 * Las otras 11 constelaciones (Aries..Piscis) ORBITAN alrededor de Acuario:
 *   - Distribuidas uniformemente en un círculo con fases f_i = i * 2π/11.
 *   - La animación solo avanza el ángulo orbital global:
 *         globalAngle += ORBIT_SPEED
 *         x = centerX + cos(globalAngle + f_i) * R
 *         y = centerY + sin(globalAngle + f_i) * R
 *   - Es una TRASLACIÓN de la figura completa: las coordenadas internas de sus
 *     estrellas NO se modifican jamás (ni deformación, ni estiramiento, ni
 *     rotación sobre su propio eje).
 *
 * Pipeline por constelación (construida desde zodiac-data.js):
 *   1) Proyección RA/Dec (desenrollado de RA por la mayor brecha circular,
 *      misma lógica que usaba constellation-viewer.js).
 *   2) Cálculo del bounding box.
 *   3) Centrado de la geometría en su propio origen local (centro del bbox).
 *   4) Conservación de las posiciones relativas entre sus estrellas.
 *   5) Escala uniforme hasta un tamaño visual razonable (proporciones intactas).
 *   6) Transformación orbital aplicada solo al grupo (traslación pura).
 *
 * Responsivo: el radio orbital y el tamaño de cada figura se derivan de
 * min(w, h) y quedan acotados para que ninguna constelación salga de pantalla
 * (radio ≤ 42% de minDim + cota superior de tamaño ≤ 7.5% de minDim).
 *
 * Estrella especial (narrativa, sin etiquetas):
 *   - Nace en una de las 14 estrellas interactivas de Acuario (coordenadas de
 *     pantalla del DOM, ya transformadas por el zoom). Destaca en su sitio y,
 *     después, se desprende de Acuario y emprende un VIAJE por el cielo con
 *     estela, en cuatro fases dentro del MISMO ciclo animate() (sin RAF extra):
 *       1) SALIDA: se aleja del centro, despegando de su posición exacta.
 *       2) VUELTAS: traza ~2 vueltas completas alrededor del zodíaco.
 *       3) ACERCAMIENTO: deja la órbita y cierra gradualmente sobre un punto
 *          REAL de Géminis: la estrella 16 de su figura (el pie, nodo real de
 *          zodiac-data.js). El destino se re-evalúa en CADA frame (la órbita
 *          nunca se detiene ni se reinicia): persigue el nodo orbitante.
 *       4) INTEGRACIÓN: al alcanzarlo se fusiona (destello sutil) y, desde ese
 *          instante, se coloca en cada frame en la posición orbital actual del
 *          nodo, conservando su color especial y sin coordenadas absolutas.
 *     La duración total es cinematográfica (~29-30s en escritorio, salida
 *     ~2-3s, dos vueltas ~16-20s, acercamiento ~6-8s; tiempo real con
 *     performance.now(), independiente del FPS) y se adapta a pantalla;
 *     Acuario queda visualmente con 13 estrellas (la nº14 es la viajera).
 *     Con prefers-reduced-motion el viaje se conserva como una travesía real y
 *     calmada (~12s), nunca un parpadeo de menos de un segundo.
 *
 * Accesibilidad: con prefers-reduced-motion la trayectoria se resuelve casi
 * instantánea manteniendo el estado narrativo final (órbita y viaje cortos);
 * las animaciones CSS (resplandores, intro) también se reducen.
 *
 * API pública: window.CelestialSky
 *   .init(canvas)                  prepara el canvas y lanza la animación.
 *   .resize()                      recalcula dimensiones (móvil/escritorio).
 *   .getConstellation(id)          { id, name } de una constelación real.
 *   .getStarScreenPosition(c,i)    posición px (CSS) de un nodo real [c][i].
 *   .departStar(opts)              lanza el viaje de la estrella especial.
 *   .isReady() / .dataVersion()
 * ========================================================================== */

(function (global) {
    'use strict';

    /* ------------------------------------------------------------------ */
    /* Fuente de datos única: zodiac-data.js                               */
    /* ------------------------------------------------------------------ */

    const RAW_ZODIAC = (global.ZODIAC_DATA || []);

    // El usuario prefiere menos movimiento: órbita congelada y viaje "instantáneo".
    const reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Acuario, la constelación principal, queda fija en el centro.
    const MAIN_ID = 'Aqr';

    // Las 11 que orbitan: todas las del zodíaco excepto Acuario.
    const ORBIT_IDS = RAW_ZODIAC
        .filter((c) => c && c.id && c.id !== MAIN_ID)
        .map((c) => c.id);

    const ORBIT_COUNT = ORBIT_IDS.length;

    // Velocidad orbital global (radianes por frame). Solo este ángulo avanza;
    // cada constelación añade su fase fija para repartirse en el círculo.
    // Lenta y elegante: una vuelta completa ≈ 65s en 60fps.
    // IMPORTANTE: la órbita NUNCA debe detenerse ni ralentizarse — el final es
    // un cielo vivo detrás del mensaje. Bajo prefers-reduced-motion se mantiene
    // este giro constante; lo que se reduce ahí son las animaciones CSS y la
    // duración del viaje de la estrella, no el movimiento del zodíaco.
    const ORBIT_SPEED = 0.0016;

    // Escala de referencia de la proyección (misma que constellation-viewer.js).
    const PROJECT_BOX = 200;

    /* ------------------------------------------------------------------ */
    /* Proyección RA/Dec → figura local (paso 1 del pipeline)              */
    /* ------------------------------------------------------------------ */

    function normalizeAngle(deg) {
        return ((deg % 360) + 360) % 360;
    }

    // Convierte una constelación real a coordenadas relativas {x, y} sin
    // deformarla. El RA se desenrolla por la mayor brecha circular para que la
    // figura no se corte por el límite de las horas.
    function projectFromData(cz) {
        const n = cz.stars.length;
        if (!n) return null;

        const ras = cz.stars.map((s) => normalizeAngle(s.ra));
        const decs = cz.stars.map((s) => s.dec);

        // Orden de las estrellas por RA para localizar la mayor brecha.
        const order = ras.map((_, i) => i).sort((a, b) => ras[a] - ras[b]);
        let maxGap = -1;
        let gAt = 0;
        for (let i = 0; i < n; i++) {
            const gap = (i === n - 1)
                ? ras[order[0]] + 360 - ras[order[n - 1]]
                : ras[order[i + 1]] - ras[order[i]];
            if (gap > maxGap) { maxGap = gap; gAt = i; }
        }
        const start = ras[order[(gAt + 1) % n]];
        const shift = (gAt === n - 1) ? 0 : start;

        const raU = ras.map((r) => {
            let v = r - shift;
            if (v < 0) v += 360;
            return v;
        });

        let minRa = Infinity, maxRa = -Infinity;
        let minDec = Infinity, maxDec = -Infinity;
        for (let i = 0; i < n; i++) {
            if (raU[i] < minRa) minRa = raU[i];
            if (raU[i] > maxRa) maxRa = raU[i];
            if (decs[i] < minDec) minDec = decs[i];
            if (decs[i] > maxDec) maxDec = decs[i];
        }

        const spanRa = (maxRa - minRa) || 1;
        const spanDec = (maxDec - minDec) || 1;
        const scale = (PROJECT_BOX / Math.max(spanRa, spanDec)) * 0.92;

        const xs = raU.map((r) => (maxRa - r) * scale);
        const ys = decs.map((d) => (maxDec - d) * scale);

        return {
            stars: cz.stars.map((s, i) => ({
                x: xs[i],
                y: ys[i],
                hip: s.hip,
                mag: s.mag
            })),
            segments: cz.segments || []
        };
    }

    function getRawById(id) {
        for (let i = 0; i < RAW_ZODIAC.length; i++) {
            if (RAW_ZODIAC[i] && RAW_ZODIAC[i].id === id) return RAW_ZODIAC[i];
        }
        return null;
    }

    /* ------------------------------------------------------------------ */
    /* Normalización individual → figura "unidad" centrada (pasos 2-5)     */
    /* ------------------------------------------------------------------ */

    // Por constelación: bounding box → origen local → escala uniforme a media
    // diagonal = 1. Solo se calcula una vez (caché inmutable independiente de
    // la pantalla); después la figura se escalará y trasladará como un todo.
    const unitCache = new Map();

    function buildUnitShape(id) {
        const cz = getRawById(id);
        if (!cz) return null;

        const proj = projectFromData(cz);
        if (!proj || !proj.stars.length) return null;

        // 2) Bounding box de la figura proyectada.
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        proj.stars.forEach((p) => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        });

        // 3) Centro del bounding box → origen local de la constelación,
        //    conservando intactas las posiciones relativas (paso 4).
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // 5) Escala uniforme: media diagonal del bbox → 1. Proporciones y
        //    geometría interna sin alterar.
        const halfW = (maxX - minX) / 2 || 0.5;
        const halfH = (maxY - minY) / 2 || 0.5;
        const extent = Math.max(1, Math.hypot(halfW, halfH));

        const unitStars = proj.stars.map((p) => ({
            x: (p.x - cx) / extent,
            y: (p.y - cy) / extent,
            hip: p.hip,
            mag: p.mag
        }));

        // Conexiones reales de zodiac-data.js como polilíneas de la figura unidad.
        const unitLines = proj.segments
            .map((seg) => seg.map((idx) => unitStars[idx]).filter(Boolean))
            .filter((ln) => ln.length >= 2);

        const shape = {
            id,
            name: cz.name,
            unitStars: Object.freeze(unitStars.map(Object.freeze)),
            unitLines: Object.freeze(
                unitLines.map((ln) => Object.freeze(ln.map(Object.freeze)))
            )
        };

        unitCache.set(id, Object.freeze(shape));
        return shape;
    }

    function getUnitShape(id) {
        if (unitCache.has(id)) return unitCache.get(id);
        return buildUnitShape(id);
    }

    /* ------------------------------------------------------------------ */
    /* Órbita circular alrededor de Acuario (paso 6: traslación)           */
    /* ------------------------------------------------------------------ */

    // Ángulo orbital global (radianes). Solo él avanza en la animación.
    let globalAngle = 0;

    // Un error puntual de dibujo jamás debe apagar el cielo: el frame se marca
    // una sola vez y el bucle continúa en el siguiente frame.
    let frameFailureLogged = false;

    // Radio orbital y tamaño objetivo responsivos. Garantías:
    //   - Radio ≤ 42% de min(w,h) con ≥ 40px de margen al borde más próximo.
    //   - Tamaño ≤ 30% del arco entre constelaciones (no se tocan) y ≤ 7.5%
    //     de minDim (cota de pantalla).
    //   - Extremo más lejano = radio + tamaño ≤ ~49% de minDim → nunca se sale.
    function computeOrbitParams(w, h) {
        const minDim = Math.min(w, h);
        const margin = 40;
        const orbitRadius = Math.max(120, Math.min(minDim * 0.42, (minDim / 2) - margin));
        const arcDistance = (2 * Math.PI * orbitRadius) / ORBIT_COUNT;
        const targetRadius = Math.min(arcDistance * 0.30, minDim * 0.075);
        return { orbitRadius, targetRadius };
    }

    // Layout orbital del frame actual: las 11 constelaciones repartidas con
    // fases f_i = i * 2π/11 y trasladadas como un bloque:
    //   x = centerX + cos(globalAngle + f_i) * R
    //   y = centerY + sin(globalAngle + f_i) * R
    // La figura unidad se escala UNA vez (uniforme, tamaño razonable) y se
    // desplaza al punto orbital; sus coordenadas internas NO se modifican.
    function orbitLayout(w, h) {
        const { orbitRadius, targetRadius } = computeOrbitParams(w, h);
        const centerX = w / 2;
        const centerY = h / 2;
        const layout = new Map();

        ORBIT_IDS.forEach((id, index) => {
            const shape = getUnitShape(id);
            if (!shape) return;

            const angle = globalAngle + index * ((2 * Math.PI) / ORBIT_COUNT);
            const ox = centerX + Math.cos(angle) * orbitRadius;
            const oy = centerY + Math.sin(angle) * orbitRadius;

            const stars = shape.unitStars.map((p) => ({
                x: ox + p.x * targetRadius,
                y: oy + p.y * targetRadius
            }));
            const lines = shape.unitLines.map((ln) => ln.map((p) => ({
                x: ox + p.x * targetRadius,
                y: oy + p.y * targetRadius
            })));

            layout.set(id, {
                id,
                name: shape.name,
                originX: ox,
                originY: oy,
                stars,
                lines
            });
        });

        return layout;
    }

    /* ------------------------------------------------------------------ */
    /* Render                                                              */
    /* ------------------------------------------------------------------ */

    const LINE_COLOR = 'rgba(215, 230, 255, 0.50)';
    const STAR_COLOR = 'rgba(255, 255, 255, 0.92)';

    function drawConstellation(entry, ctx) {
        // Trazos vectoriales de las conexiones reales (Stellarium).
        ctx.save();
        ctx.strokeStyle = LINE_COLOR;
        ctx.lineWidth = 1.25;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(150, 185, 255, 0.45)';
        ctx.shadowBlur = 6;

        entry.lines.forEach((pts) => {
            ctx.beginPath();
            pts.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });
        ctx.restore();

        // Estrellas reales de la figura. Si la viajera pasa cerca, ESA estrella
        // concreta destella un momento (nunca toda la constelación, ni mueve su
        // posición ni altera su geometría).
        ctx.save();
        ctx.fillStyle = STAR_COLOR;
        ctx.shadowColor = 'rgba(210, 230, 255, 0.85)';
        ctx.shadowBlur = 8;

        entry.stars.forEach((p, idx) => {
            const glow = sparkleGlow(entry.id, idx);
            if (glow > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (0.92 + 0.12 * glow) + ')';
                ctx.shadowBlur = 8 + 14 * glow;
            } else {
                ctx.shadowBlur = 8;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.8 + 1.2 * glow, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = STAR_COLOR;
        });
        ctx.restore();
    }

    // Factor de brillo vivo de una estrella de constelación (0 = normal, 1 =
    // destello máximo). Decae solo; las marcas viejas se limpian aquí.
    function sparkleGlow(constId, starIndex) {
        const spark = starSparkles.get(constId + ':' + starIndex);
        if (!spark) return 0;
        const age = performance.now() - spark.t0;
        if (age >= SPARKLE_LIFE) {
            starSparkles.delete(constId + ':' + starIndex);
            return 0;
        }
        return 1 - age / SPARKLE_LIFE;
    }

    /* ------------------------------------------------------------------ */
    /* Estrella especial: de Acuario a un punto real de Géminis            */
    /* ------------------------------------------------------------------ */

    // Posición (px CSS) de un nodo real de la figura [constId][starIndex] en el
    // layout del frame actual. El canvas pinta en px CSS (contexto escalado por
    // dpr), así que estas coordenadas son directamente comparables con las del
    // DOM (getBoundingClientRect), ya incluidas las transformaciones de zoom.
    function getStarScreenPosition(constId, starIndex) {
        const layout = sky.currentLayout || orbitLayout(sky.w, sky.h);
        const entry = layout.get(constId);
        if (!entry) return null;
        const star = entry.stars[starIndex];
        if (!star) return null;
        return { x: star.x, y: star.y };
    }

    // Punto real de destino: la estrella 16 de Géminis (el pie, último nodo del
    // último segmento de zodiac-data.js). No es un lugar inventado.
    const NARRATIVE_TARGET = { destId: 'Gem', destIndex: 16 };

    // Estado del vuelo y del aterrizaje. Una sola estrella, sin etiquetas.
    let travel = null;
    let departed = false;
    // Destello/expansión de luz muy sutil al fusionarse con Géminis.
    let arrivalFx = null;
    // Destellos efímeros: cuando la viajera pasa cerca de una constelación,
    // alguna de sus estrellas brilla un instante (cielo vivo, muy discreto).
    let starSparkles = new Map();
    const SPARKLE_RANGE = 68;          // px de proximidad que provoca el destello
    const SPARKLE_LIFE = 750;          // ms que dura el brillo en esa estrella

    // Fases del viaje narrativo de la estrella especial. NO es una ruta directa
    // Acuario→Géminis: la estrella (1) se desprende de Acuario (~2-3s), (2) traza
    // dos vueltas visibles alrededor del centro (~16-20s), (3) deja la órbita y
    // persigue el nodo real 16 de Géminis (~6-8s), y (4) se integra con un
    // destello. Total ≈ 29-30s en escritorio: un vuelo cinematográfico y lento.
    const EXIT_DURATION = 2600;        // desprendimiento visible de Acuario
    const ORBIT_TURNS = 2;             // dos vueltas completas alrededor del centro
    const APPROACH_DURATION = 7000;    // cierre gradual sobre Géminis
    const ORBIT_RING_FACTOR = 0.92;    // órbita interior al anillo de las 11
    const TRAIL_MAX = 36;              // estela corta, nunca un cometa

    // La duración se adapta a la pantalla (igual que el radio orbital): dos
    // vueltas ≈ 17s base en escritorio (~8.5s por vuelta). El progreso y el
    // ángulo se calculan SIEMPRE con tiempo real (performance.now()), nunca por
    // frames, así que la duración es idéntica a cualquier FPS.
    function journeyScale() {
        return Math.max(0.75, Math.min(1.15, Math.min(sky.w, sky.h) / 700));
    }

    // Con prefers-reduced-motion el viaje también se ve (no es un parpadeo de
    // <1s): dura ~12s en total, quieto pero real, sin efectos accesorios.
    function orbitDurationFor() {
        return reducedMotion ? 9000 : Math.round(17000 * journeyScale());
    }

    function departStar(opts) {
        if (travel || !opts) return false;

        const fromX = Number(opts.fromX);
        const fromY = Number(opts.fromY);
        if (!isFinite(fromX) || !isFinite(fromY)) return false;

        const target = opts.destId
            ? { destId: opts.destId, destIndex: Number(opts.destIndex) }
            : NARRATIVE_TARGET;

        // El vuelo arranca EXACTAMENTE en la posición visual de la estrella nº14
        // de Acuario (px CSS del DOM, ya con el zoom aplicado). Sin salto inicial.
        const ccx = sky.w / 2;
        const ccy = sky.h / 2;
        const ddx = fromX - ccx;
        const ddy = fromY - ccy;
        const startRadius = Math.hypot(ddx, ddy);

        travel = {
            fromX,
            fromY,
            destId: target.destId,
            destIndex: target.destIndex,
            // Máquina de fases del trayecto (salida → vueltas → acercamiento).
            phase: 'exit',
            phaseStart: performance.now(),
            startAngle: startRadius < 4 ? Math.PI / 2 : Math.atan2(ddy, ddx),
            startRadius,
            orbitStart: 0,
            orbitStartAngle: 0,
            approachStart: 0,
            ringRadius: null,
            // Posición de partida EXACTA (sin salto) + última referencia del nodo.
            pos: { x: fromX, y: fromY },
            lastDest: null,
            trail: [],
            // Partículas diminutas que se desprenden de la estela y se apagan.
            particles: [],
            emitAcc: 0,
            onArrive: typeof opts.onArrive === 'function' ? opts.onArrive : null
        };
        return true;
    }

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    // Salida enérgica: arranca rápido y decelera al incorporarse a la órbita
    // (sensación de "desprender" la estrella de Acuario, no de arrastrarla).
    function easeOutQuart(t) {
        return 1 - Math.pow(1 - Math.min(1, t), 4);
    }

    // Estela tenue y delgada: una polilínea de recuerdos recientes, tonos
    // blanco/rosa/lila que desaparecen hacia la cola.
    function drawTrail(ctx, trail) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < trail.length; i++) {
            ctx.strokeStyle = 'rgba(224, 205, 240, ' + ((i / trail.length) * 0.4) + ')';
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Núcleo brillante del viaje con halo suave.
    function drawTravelBody(ctx, x, y) {
        // Halo difuso pequeño (nunca un globo gigante).
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = 'rgba(160, 200, 255, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Núcleo principal de la estrella.
        ctx.save();
        ctx.shadowColor = 'rgba(170, 205, 255, 0.95)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#eef4ff';
        ctx.beginPath();
        ctx.arc(x, y, 3.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Punto central luminoso: el corazón de la estrella viajera.
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 1)';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Partículas: motas diminutas que caen de la cola y se desvanecen en el
    // espacio. Son pocas y tenues: sensación de vuelo, no un rastro sólido.
    function emitStarParticles(x, y, now) {
        if (!travel.particles || reducedMotion) return;
        travel.emitAcc += 1;
        if (travel.emitAcc < 4) return; // ~cada 4 frames a 60fps
        travel.emitAcc = 0;
        travel.particles.push({
            x: x + (Math.random() - 0.5) * 6,
            y: y + (Math.random() - 0.5) * 6,
            vx: (Math.random() - 0.5) * 0.24,
            vy: (Math.random() - 0.5) * 0.24,
            born: now,
            life: 850,
            r: Math.random() * 0.8 + 0.45
        });
        if (travel.particles.length > 14) travel.particles.shift();
    }

    function updateStarParticles(now) {
        if (!travel || !travel.particles) return;
        for (let i = travel.particles.length - 1; i >= 0; i--) {
            const p = travel.particles[i];
            if (now - p.born >= p.life) {
                travel.particles.splice(i, 1);
                continue;
            }
            p.x += p.vx;
            p.y += p.vy;
        }
    }

    function drawStarParticles(ctx, particles, now) {
        if (!particles || !particles.length) return;
        ctx.save();
        ctx.fillStyle = 'rgba(226, 234, 255, 1)';
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const life = 1 - (now - p.born) / p.life;
            ctx.globalAlpha = Math.max(0, life * 0.16);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * (0.5 + life * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    // Tras el aterrizaje, la especial ya pertenece a Géminis: se dibuja en su
    // punto real a cada frame (sigue la órbita con la figura).
    function drawIntegratedStar(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = 'rgba(196, 181, 253, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = 'rgba(214, 200, 255, 0.95)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#fff4fb';
        ctx.beginPath();
        ctx.arc(x, y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Línea muy sutil de aproximación en la fase final: una pequeña "unión" entre
    // la estrella y el nodo real de Géminis al que se integra.
    function drawApproachLink(ctx, x, y, tx, ty, strength) {
        if (strength <= 0) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(214, 200, 255, ' + (0.3 * strength) + ')';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.restore();
    }

    // Expansión de luz muy sutil al fusionarse: dos anillos que crecen y se
    // funden en pocos frames sobre el punto de integración.
    function drawArrivalFx(ctx, now) {
        if (!arrivalFx) return;
        const p = (now - arrivalFx.t0) / 950;
        if (p >= 1) {
            arrivalFx = null;
            return;
        }
        const x = arrivalFx.x;
        const y = arrivalFx.y;
        const fade = 1 - p;

        ctx.save();
        ctx.globalAlpha = 0.32 * fade;
        ctx.fillStyle = 'rgba(196, 181, 253, 1)';
        ctx.beginPath();
        ctx.arc(x, y, 7 + p * 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = 'rgba(232, 222, 255, 1)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(x, y, 4 + p * 22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Avanza cada fase del vuelo y dibuja la estrella especial. El destino se
    // re-evalúa en CADA frame desde el orbitLayout actual: Géminis sigue girando
    // mientras la estrella cruza el cielo, así que ella lo persigue sin puntos
    // fijos ni teletransporte. Todas las fases viven dentro del MISMO ciclo
    // animate() (sin loops ni RAF adicionales) y jamás tocan globalAngle: el
    // zodíaco no se detiene ni se reinicia durante el viaje.
    function updateTravel(ctx) {
        const now = performance.now();

        if (travel) {
            // 0) Posición ACTUAL del nodo real 16 de Géminis en este frame.
            const dest = getStarScreenPosition(travel.destId, travel.destIndex);
            const dx = dest ? dest.x : (travel.lastDest ? travel.lastDest.x : travel.fromX);
            const dy = dest ? dest.y : (travel.lastDest ? travel.lastDest.y : travel.fromY);
            if (dest) travel.lastDest = dest;

            // Centro del cielo (donde reposa Acuario): referencia de la órbita.
            const ccx = sky.w / 2;
            const ccy = sky.h / 2;

            // Gran órbita: interior al anillo de las 11 (recorre una parte enorme
            // del mapa, claramente visible, sin estorbar a las figuras).
            if (!travel.ringRadius) {
                travel.ringRadius = computeOrbitParams(sky.w, sky.h).orbitRadius * ORBIT_RING_FACTOR;
            }
            const ringR = travel.ringRadius;
            const scale = journeyScale();
            const exitDur = reducedMotion ? 1000 : Math.round(EXIT_DURATION * scale);
            const approachDur = reducedMotion ? 2500 : Math.round(APPROACH_DURATION * scale);

            let point;
            const phase = travel.phase;

            if (phase === 'exit') {
                // FASE 1 · SALIDA: la estrella se desprende de Acuario alejándose
                // del centro, con una curva que la incorpora a la órbita. Parte de
                // su posición EXACTA y permanece visible en todo momento.
                const p = Math.min(1, (now - travel.phaseStart) / exitDur);
                const e = easeOutQuart(p);
                const angle = travel.startAngle + 0.7 * p;
                const rad = travel.startRadius + (ringR - travel.startRadius) * e;
                point = {
                    x: ccx + Math.cos(angle) * rad,
                    y: ccy + Math.sin(angle) * rad
                };
                if (p >= 1) {
                    travel.phase = 'orbit';
                    travel.orbitStart = now;
                    travel.orbitStartAngle = angle;
                }
            } else if (phase === 'orbit') {
                // FASE 2 · VUELTAS: dos vueltas completas alrededor del centro con
                // un ligero vaivén de radio (orgánico, no robótico). Las 11 siguen
                // girando en su propio anillo exactamente como siempre. El ángulo
                // se calcula con tiempo real: la duración no depende del FPS.
                const duration = orbitDurationFor();
                const vel = (2 * Math.PI * ORBIT_TURNS) / duration; // rad/ms
                const t = now - travel.orbitStart;
                const wobble = reducedMotion
                    ? 0
                    : ringR * 0.045 *
                        Math.sin(t * 0.0011) * Math.sin(t * 0.00023 + 1.7);
                const angle = travel.orbitStartAngle + vel * t;
                point = {
                    x: ccx + Math.cos(angle) * (ringR + wobble),
                    y: ccy + Math.sin(angle) * (ringR + wobble)
                };
                if (t >= duration) {
                    travel.phase = 'approach';
                    travel.approachStart = now;
                }
            } else {
                // FASE 3 · ACERCAMIENTO: deja la órbita y cierra gradualmente sobre
                // el nodo real en movimiento. Interpola entre el arco orbital y el
                // destino ACTUAL de Géminis en cada frame → persecución continua,
                // sin saltos ni coordenadas fijas.
                const p = Math.min(1, (now - travel.approachStart) / approachDur);
                const e = easeInOutQuad(p);

                const duration = orbitDurationFor();
                const vel = (2 * Math.PI * ORBIT_TURNS) / duration;
                const t = now - travel.approachStart;
                const aArc = travel.orbitStartAngle + vel * (duration + t);
                const base = {
                    x: ccx + Math.cos(aArc) * ringR,
                    y: ccy + Math.sin(aArc) * ringR
                };
                point = {
                    x: base.x + (dx - base.x) * e,
                    y: base.y + (dy - base.y) * e
                };
            }

            // Inercia: la estrella tiende hacia el punto de la fase sin giros
            // bruscos (suaviza la trayectoria y refuerza la sensación de vuelo).
            const blend = 0.65;
            travel.pos.x += (point.x - travel.pos.x) * blend;
            travel.pos.y += (point.y - travel.pos.y) * blend;
            const sx = travel.pos.x;
            const sy = travel.pos.y;

            travel.trail.push({ x: sx, y: sy });
            if (travel.trail.length > TRAIL_MAX) travel.trail.shift();

            drawTrail(ctx, travel.trail);

            // Cielo vivo: si la viajera pasa cerca de una constelación, alguna de
            // sus estrellas destella un instante (brillo breve y muy discreto;
            // nunca toda la figura, nunca su geometría).
            if (sky.currentLayout && phase !== 'exit') {
                sky.currentLayout.forEach((entry) => {
                    entry.stars.forEach((sp, idx) => {
                        const dxx = sp.x - sx;
                        const dyy = sp.y - sy;
                        if (dxx * dxx + dyy * dyy < SPARKLE_RANGE * SPARKLE_RANGE) {
                            starSparkles.set(entry.id + ':' + idx, { t0: now });
                        }
                    });
                });
            }

            // Partículas que se desprenden de la cola y se apagan en el espacio.
            emitStarParticles(sx, sy, now);
            updateStarParticles(now);
            drawStarParticles(ctx, travel.particles, now);

            // Unión sutil solo durante la aproximación final.
            const dToTarget = Math.hypot(dx - sx, dy - sy);
            if (travel.phase === 'approach') {
                const approach = Math.max(0, Math.min(1, 1 - dToTarget / 180));
                if (approach > 0) drawApproachLink(ctx, sx, sy, dx, dy, approach);
            }

            drawTravelBody(ctx, sx, sy);

            // FASE 4 · INTEGRACIÓN: se cierra SOLO dentro de una fase de
            // aproximación válida y con progreso suficiente. La cercanía
            // incidental (p. ej. pasar cerca del nodo durante la órbita) no
            // basta: ap se mide desde el arranque real de la aproximación, así
            // que la estrella nunca "termina demasiado pronto" ni salta.
            const ap = (travel.phase === 'approach')
                ? Math.min(1, (now - travel.approachStart) / approachDur)
                : 0;
            if (travel.phase === 'approach' &&
                (ap >= 0.999 || (dToTarget < 20 && ap > 0.55))) {
                const cb = travel.onArrive;
                travel = null;
                departed = true;
                arrivalFx = { x: dx, y: dy, t0: now };
                if (cb) cb({ x: dx, y: dy });
            }
        }

        drawArrivalFx(ctx, now);

        // Tras la fusión, la especial ya NO usa trayectoria propia: cada frame se
        // coloca exactamente en la posición orbital actual del nodo 16 real de
        // Géminis (nada de coordenadas absolutas), conservando su color.
        if (departed) {
            const dest = getStarScreenPosition('Gem', 16);
            if (dest) drawIntegratedStar(ctx, dest.x, dest.y);
        }
    }

    function animate() {
        const ctx2 = sky.ctx;
        const canvas = sky.canvas;

        try {
            if (ctx2 && canvas && sky.w) {
                const w = sky.w;
                const h = sky.h;
                const dpr = sky.dpr || 1;

                // Alta resolución: dibuja en píxeles CSS con el contexto escalado.
                ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
                ctx2.clearRect(0, 0, canvas.width, canvas.height);

                // Único movimiento orbital: avanza el ángulo global.
                globalAngle += ORBIT_SPEED;

                // Las 11 constelaciones en su anillo circular (traslación pura).
                const layout = orbitLayout(w, h);
                sky.currentLayout = layout;
                layout.forEach((entry) => drawConstellation(entry, ctx2));

                // La estrella especial: viaje o integración en Géminis.
                // Comparte el MISMO requestAnimationFrame que la órbita (vive en el
                // ciclo principal de animate), sin loops ni timers independientes.
                updateTravel(ctx2);
            }
        } catch (err) {
            // NUNCA dejar morir el bucle: un frame fallido se salta y el cielo
            // continúa orbitando en el siguiente frame (sin romper la cadena).
            if (!frameFailureLogged) {
                frameFailureLogged = true;
                console.warn('[CelestialSky] frame omitido:', err && err.message);
            }
        }

        requestAnimationFrame(animate);
    }

    /* ------------------------------------------------------------------ */
    /* Estado + API pública                                                */
    /* ------------------------------------------------------------------ */

    const sky = {
        canvas: null,
        ctx: null,
        w: 0,
        h: 0,
        dpr: 1,
        ready: false,
        currentLayout: null,
        rafId: null
    };

    function resize() {
        if (!sky.canvas) return;

        sky.w = window.innerWidth;
        sky.h = window.innerHeight;
        sky.dpr = window.devicePixelRatio || 1;

        const canvas = sky.canvas;
        canvas.width = Math.round(sky.w * sky.dpr);
        canvas.height = Math.round(sky.h * sky.dpr);
        canvas.style.width = sky.w + 'px';
        canvas.style.height = sky.h + 'px';

        sky.ready = Boolean(sky.ctx);
    }

    function init(canvasEl) {
        sky.canvas = canvasEl;
        if (canvasEl) {
            sky.ctx = canvasEl.getContext('2d');
            canvasEl.classList.add('is-armed');
        }
        window.addEventListener('resize', resize);
        window.addEventListener('orientationchange', () => setTimeout(resize, 150));
        resize();
        return sky;
    }

    function getConstellation(id) {
        const shape = getUnitShape(id);
        if (!shape) return null;
        return { id: shape.id, name: shape.name };
    }

    global.CelestialSky = {
        init,
        resize,
        getConstellation,
        getStarScreenPosition,
        departStar,
        isReady: () => sky.ready,
        dataVersion: () => 'real-ra-dec-zodiac'
    };

    // Arranca el bucle: el halo dibuja el cielo orbital de forma continua.
    requestAnimationFrame(animate);
}(window));