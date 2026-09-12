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
 * API pública: window.CelestialSky
 *   .init(canvas)          prepara el canvas y lanza la animación.
 *   .resize()              recalcula dimensiones (móvil/escritorio).
 *   .showCharlotte()       dibuja la anomalía de Charlotte (sigue a Géminis).
 *   .getConstellation(id)  { id, name } de una constelación real.
 *   .isReady() / .dataVersion()
 * ========================================================================== */

(function (global) {
    'use strict';

    /* ------------------------------------------------------------------ */
    /* Fuente de datos única: zodiac-data.js                               */
    /* ------------------------------------------------------------------ */

    const RAW_ZODIAC = (global.ZODIAC_DATA || []);

    // Acuario, la constelación principal, queda fija en el centro.
    const MAIN_ID = 'Aqr';

    // Las 11 que orbitan: todas las del zodíaco excepto Acuario.
    const ORBIT_IDS = RAW_ZODIAC
        .filter((c) => c && c.id && c.id !== MAIN_ID)
        .map((c) => c.id);

    const ORBIT_COUNT = ORBIT_IDS.length;

    // Velocidad orbital global (radianes por frame). Solo este ángulo avanza;
    // cada constelación añade su fase fija para repartirse en el círculo.
    const ORBIT_SPEED = 0.003;

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

        // Extremo guía (anomalía de Charlotte): último nodo del último
        // segmento real (el pie de Géminis).
        let tipIdx = unitStars.length - 1;
        for (let s = proj.segments.length - 1; s >= 0; s--) {
            const seg = proj.segments[s];
            if (seg && seg.length) { tipIdx = seg[seg.length - 1]; break; }
        }
        const tip = unitStars[tipIdx] || unitStars[0];

        const shape = {
            id,
            name: cz.name,
            unitStars: Object.freeze(unitStars.map(Object.freeze)),
            unitLines: Object.freeze(
                unitLines.map((ln) => Object.freeze(ln.map(Object.freeze)))
            ),
            tip: Object.freeze({ x: tip.x, y: tip.y })
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
                lines,
                tip: {
                    x: ox + shape.tip.x * targetRadius,
                    y: oy + shape.tip.y * targetRadius
                }
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

        // Estrellas reales de la figura.
        ctx.save();
        ctx.fillStyle = STAR_COLOR;
        ctx.shadowColor = 'rgba(210, 230, 255, 0.85)';
        ctx.shadowBlur = 8;

        entry.stars.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    // Anomalía de Charlotte: estrella que no pertenece a ningún mapa, nace en
    // un extremo de Géminis y orbita con la figura (traslación de grupo).
    function drawCharlotteAnomaly(entry, ctx, w, h) {
        if (!sky.showCharlotte || !entry) return;

        const tip = entry.tip;
        const dx = tip.x - entry.originX;
        const dy = tip.y - entry.originY;
        const len = Math.hypot(dx, dy) || 1;
        const ext = Math.max(22, Math.min(w, h) * 0.055);
        const cx = tip.x + (dx / len) * ext;
        const cy = tip.y + (dy / len) * ext;

        // Línea delgada desde el extremo de Géminis hasta la estrella.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = 'rgba(255, 182, 193, 0.38)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255, 105, 180, 0.75)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();

        // Halo suave tras la estrella.
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 105, 180, 0.14)';
        ctx.fill();
        ctx.restore();

        // La estrella: radio mayor, tono rosado y resplandor intenso.
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffb6c1';
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 22;
        ctx.fill();
        ctx.restore();

        // Etiqueta pequeña en cursiva tenue.
        ctx.save();
        ctx.font = 'italic 300 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 182, 193, 0.75)';
        ctx.shadowColor = 'rgba(255, 105, 180, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText('Charlotte', cx, cy - 13);
        ctx.restore();
    }

    function animate() {
        const ctx = sky.ctx;
        const canvas = sky.canvas;

        if (ctx && canvas && sky.w) {
            const w = sky.w;
            const h = sky.h;
            const dpr = sky.dpr || 1;

            // Alta resolución: dibuja en píxeles CSS con el contexto escalado.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Único movimiento orbital: avanza el ángulo global.
            globalAngle += ORBIT_SPEED;

            // Las 11 constelaciones en su anillo circular (traslación pura).
            const layout = orbitLayout(w, h);
            layout.forEach((entry) => drawConstellation(entry, ctx));

            // La anomalía de Charlotte sigue a Géminis en la órbita.
            drawCharlotteAnomaly(layout.get('Gem'), ctx, w, h);
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
        showCharlotte: false,
        rafId: null
    };

    function startLoop() {
        if (sky.rafId) return;
        sky.rafId = requestAnimationFrame(animate);
    }

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
        startLoop();
        return sky;
    }

    // Enciende la anomalía de Charlotte junto a Géminis. El final la invoca
    // tras la pausa de lectura; orbita con su constelación, no es un punto fijo.
    function showCharlotte() {
        sky.showCharlotte = true;
        document.body.classList.add('show-charlotte');
    }

    function getConstellation(id) {
        const shape = getUnitShape(id);
        if (!shape) return null;
        return { id: shape.id, name: shape.name };
    }

    global.CelestialSky = {
        init,
        resize,
        showCharlotte,
        getConstellation,
        isReady: () => sky.ready,
        dataVersion: () => 'real-ra-dec-zodiac'
    };

    // Arranca el bucle: el halo orbita de forma continua desde la carga.
    startLoop();
}(window));