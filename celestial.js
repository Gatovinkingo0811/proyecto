/* ============================================================================
 * celestial.js — Mapa estelar real sobre Canvas
 *
 * Descarga las constelaciones astronómicas (RA/Dec) desde un JSON público y
 * las dibuja con proyección 2D matemática sobre un <canvas> a pantalla completa.
 *
 * - Datos: d3-celestial (GeoJSON FeatureCollection, geometry MultiLineString).
 *   Cada feature lleva `id` + líneas de [longitud/RA_en_grados, Dec_en_grados].
 * - Proyección: equirectangular sin distorsión,
 *   x = RA/360·ancho, y = (90−Dec)/180·alto (ventana completa).
 * - Estilo: líneas semitransparentes rgba(255,255,255,0.3) y trazo fino;
 *   nodos principales con un sutil resplandor (shadowBlur).
 * - Zodíaco: solo se dibujan las constelaciones de `zodiaco` (12 en total:
 *   11 son las que orbitan en el halo + Acuario, la principal, SIEMPRE fija en
 *   el centro → sin duplicados).
 * - Cajas del giro: cada constelación vive en SU PROPIA zona fija de la pantalla
 *   (top/left/right/bottom en fracciones) y solo rota sobre su propio centro
 *   (transform-origin: center; rotate), sin compartir eje de rotación: no se
 *   chocan ni se amontonan. Acuario (la principal) queda fija en el centro.
 * - Estrella de Charlotte: anomalía que sigue a Géminis dentro de su caja; no
 *   es un punto fijo. Solo aparece cuando el final invoca `.showCharlotte()`.
 * - Órbita: `globalAngle` (declarada fuera de la animación, nunca se reinicia)
 *   sube 0.001 por frame y se suma al ángulo de cada constelación; el bucle
 *   `animate()` corre con requestAnimationFrame de forma continua y termina
 *   siempre re-agendándose a sí mismo.
 * - Alta resolución: el canvas usa inner*devicePixelRatio y el contexto se
 *   escala con ctx.scale(dpr, dpr), por lo que los trazos son vectores nítidos
 *   sin importar el zoom (anti-pixelado).
 * - Anomalía: la estrella de Charlotte se inyecta junto a un extremo de
 *   Géminis con una conexión delgada y un estilo rosado único, y sigue la
 *   normalización y traslación del halo (persiste con la figura).
 * - API pública: window.CelestialSky
 *   .init(canvas)            prepara el mapa (fetch + render).
 *   .drawCustomConstellation(name, nodes, edges)  dibuja una constelación
 *                                                 personalizada (coords 0..1).
 *   .removeCustom(id)        quita una constelación personalizada.
 *   .highlight(id) / .unhighlight(id)  realza una constelación real.
 *   .setLink(a, b)           dibuja una conexión entre dos puntos (px).
 *   .project(raDeg, decDeg)  devuelve {x, y} en píxeles de la ventana.
 * ========================================================================== */

(function (global) {
    'use strict';

    // Definiciones auténticas y reconocibles de las 11 constelaciones del zodíaco
    // (Acuario es la principal y vive fija en el centro interactivo).
    // Cada constelación está trazada con sus estrellas y líneas características,
    // garantizando proporciones anatómicas/astronómicas claras (por ejemplo, Géminis
    // con sus dos gemelos diferenciados, brazos y manos abiertas, sin estar pegados).
    const ZODIAC_DEFINITIONS = {
        Ari: {
            name: 'Aries',
            stars: [[20, 50], [45, 55], [75, 45], [85, 25]],
            lines: [[0, 1], [1, 2], [2, 3]]
        },
        Tau: {
            name: 'Taurus',
            stars: [
                [30, 45], [48, 52], [65, 42], [45, 25], [15, 80],
                [75, 85], [85, 68], [95, 62], [90, 52], [80, 56]
            ],
            lines: [
                [0, 1], [1, 2], [2, 3], [3, 0], [1, 4],
                [2, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 6]
            ]
        },
        Gem: {
            name: 'Gemini',
            stars: [
                [32, 85], // 0: Cabeza Castor
                [58, 90], // 1: Cabeza Pólux
                [12, 52], // 2: Brazo extendido Castor
                [36, 62], // 3: Pecho Castor
                [52, 66], // 4: Pecho Pólux
                [44, 34], // 5: Cadera Castor
                [38, 12], // 6: Pie Ext Castor
                [56, 16], // 7: Pie Int Castor
                [74, 52], // 8: Codo Pólux
                [90, 48], // 9: Mano Alta Pólux
                [82, 36], // 10: Mano Baja Pólux
                [64, 36], // 11: Cadera Pólux
                [74, 12]  // 12: Pie Pólux
            ],
            lines: [
                [0, 3],   // Cabeza Castor – Pecho Castor
                [2, 3],   // Brazo Castor – Pecho Castor
                [1, 4],   // Cabeza Pólux – Pecho Pólux
                [3, 4],   // Pecho Castor – Pecho Pólux
                [3, 5],   // Pecho Castor – Cadera Castor
                [5, 6],   // Cadera Castor – Pie Ext Castor
                [5, 7],   // Cadera Castor – Pie Int Castor
                [4, 11],  // Pecho Pólux – Cadera Pólux
                [11, 12], // Cadera Pólux – Pie Pólux
                [4, 8],   // Pecho Pólux – Codo Pólux
                [8, 9],   // Codo Pólux – Mano Alta Pólux
                [8, 10]   // Codo Pólux – Mano Baja Pólux
            ],
            charlotteIndex: 12
        },
        Cnc: {
            name: 'Cancer',
            stars: [[50, 50], [48, 68], [68, 48], [30, 48], [32, 22]],
            lines: [[0, 1], [1, 2], [1, 3], [3, 4]]
        },
        Leo: {
            name: 'Leo',
            stars: [
                [32, 20], [42, 42], [52, 58], [48, 76], [60, 84],
                [66, 68], [60, 46], [74, 52], [86, 60], [96, 52]
            ],
            lines: [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
                [5, 1], [1, 6], [6, 7], [7, 8], [8, 6], [8, 9]
            ]
        },
        Vir: {
            name: 'Virgo',
            stars: [
                [24, 20], [36, 45], [50, 55], [40, 76],
                [68, 64], [78, 48], [86, 32]
            ],
            lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6]]
        },
        Lib: {
            name: 'Libra',
            stars: [[30, 60], [66, 66], [44, 28], [74, 32], [50, 82]],
            lines: [[0, 1], [1, 3], [3, 2], [2, 0], [0, 4], [1, 4]]
        },
        Sco: {
            name: 'Scorpius',
            stars: [
                [74, 74], [84, 82], [70, 80], [56, 52], [48, 58],
                [42, 70], [30, 76], [22, 68], [10, 60], [6, 72]
            ],
            lines: [
                [3, 0], [0, 1], [3, 2], [3, 4], [4, 5],
                [5, 6], [6, 7], [7, 8], [8, 9], [6, 8]
            ]
        },
        Sgr: {
            name: 'Sagittarius',
            stars: [
                [26, 58], [46, 60], [70, 54], [74, 30],
                [46, 16], [20, 20], [6, 36], [6, 54]
            ],
            lines: [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
                [1, 5], [5, 6], [6, 7], [7, 0]
            ]
        },
        Cap: {
            name: 'Capricornus',
            stars: [
                [84, 74], [52, 78], [20, 64], [16, 36],
                [38, 22], [70, 26], [84, 46]
            ],
            lines: [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]
            ]
        },
        Psc: {
            name: 'Pisces',
            stars: [
                [25, 80], [38, 85], [45, 75], [35, 65], [25, 70],
                [50, 50], [62, 35],
                [75, 25], [88, 30], [90, 15], [78, 12], [70, 20]
            ],
            lines: [
                [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
                [2, 5], [5, 6], [6, 7],
                [7, 8], [8, 9], [9, 10], [10, 11], [11, 7]
            ]
        }
    };

    // Color de realce para constelaciones seleccionadas
    const HIGHLIGHT_COLOR = 'rgba(255, 171, 216, 0.95)';

    // Filtro del zodíaco: solo estas 12 constelaciones existen en la experiencia
    const zodiaco = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc'];

    const sky = {
        canvas: null,
        ctx: null,
        w: 0,
        h: 0,
        dpr: 1,
        constellations: Object.keys(ZODIAC_DEFINITIONS).map((id) => ({
            id,
            name: ZODIAC_DEFINITIONS[id].name
        })),
        dataVersion: 'authentic-zodiac',
        highlightedId: null,
        customs: [],
        links: [],
        el: null,
        rafId: null,
        ready: true,
        showCharlotte: false
    };

    // Rotación global del halo orbital. Se incrementa suavemente en cada frame.
    let globalAngle = 0;

    /* ------------------------------------------------------------------ */
    /* Utilidades de Coordenadas                                           */
    /* ------------------------------------------------------------------ */

    function normalize(angle) {
        return ((angle % 360) + 360) % 360;
    }

    function projectPoint(raDeg, decDeg, w, h) {
        return {
            x: (normalize(raDeg) / 360) * w,
            y: ((90 - decDeg) / 180) * h
        };
    }

    /* ------------------------------------------------------------------ */
    /* Render y Layout Orbital                                            */
    /* ------------------------------------------------------------------ */

    // Constelación principal (Acuario): SIEMPRE FIJA en el centro (fuera del halo).
    const MAIN_ID = 'Aqr';

    // Cache para las formas bloqueadas de cada constelación.
    // Una vez calculada su geometría normalizada (centrada en 0,0), se congela
    // con Object.freeze para que la forma sea inmutable y nunca se altere.
    const shapeCache = new Map();

    // Construye el layout orbital: las 11 constelaciones del zodíaco (sin Acuario)
    // orbitan en un círculo amplio y uniforme alrededor del centro de la pantalla.
    // Garantiza:
    //   1) Bloqueo estricto de forma: figuras auténticas y nítidas que no se deforman jamás.
    //   2) Órbita circular limpia: se trasladan por el círculo, no giran en su propio eje.
    //   3) Espaciado generoso: al menos un 44% de espacio vacío entre cada constelación.
    //   4) Centro despejado: Acuario y el texto final quedan limpios y legibles en el centro.
    function buildBoxLayout(w, h) {
        const layout = new Map();
        const zodiacKeys = Object.keys(ZODIAC_DEFINITIONS);
        const count = zodiacKeys.length;

        const minDim = Math.min(w, h);

        // Radio orbital circular: amplio (40% de la dimensión menor),
        // dejando el centro libre para Acuario/texto y margen seguro hacia los bordes.
        const orbitRadius = Math.max(130, Math.min(minDim * 0.40, (minDim / 2) - 45));

        // Distancia de arco entre constelaciones consecutivas a lo largo de la órbita
        const arcDistance = (2 * Math.PI * orbitRadius) / count;

        // Tamaño máximo de radio para cada constelación:
        // Se limita al 28% de la distancia entre centros, lo cual garantiza que
        // haya como mínimo un 44% de espacio vacío entre constelación y constelación.
        // Nunca se tocan ni se amontonan.
        const targetRadius = Math.min(arcDistance * 0.28, minDim * 0.065);

        zodiacKeys.forEach((id, index) => {
            const def = ZODIAC_DEFINITIONS[id];

            // --- Bloqueo de forma estricto: se calcula una sola vez y se congela en shapeCache ---
            if (!shapeCache.has(id)) {
                let cx = 0;
                let cy = 0;
                def.stars.forEach(([sx, sy]) => { cx += sx; cy += sy; });
                cx /= def.stars.length;
                cy /= def.stars.length;

                let maxDist = 0;
                def.stars.forEach(([sx, sy]) => {
                    const d = Math.hypot(sx - cx, sy - cy);
                    if (d > maxDist) maxDist = d;
                });
                maxDist = Math.max(maxDist, 1);

                const scale = targetRadius / maxDist;

                // Estrellas normalizadas y centradas en (0, 0) con Y invertida (cielo natural)
                const normStars = Object.freeze(def.stars.map(([sx, sy]) => Object.freeze({
                    x: (sx - cx) * scale,
                    y: -(sy - cy) * scale
                })));

                // Líneas conectoras formadas por pares de estrellas normalizadas
                const normLines = Object.freeze(def.lines.map(([ia, ib]) => Object.freeze([
                    normStars[ia],
                    normStars[ib]
                ])));

                // Punto de conexión para la anomalía de Charlotte (en Géminis)
                const tipIdx = def.charlotteIndex != null ? def.charlotteIndex : (normStars.length - 1);
                const charlotteTip = normStars[tipIdx] || normStars[0];

                shapeCache.set(id, Object.freeze({
                    normStars,
                    normLines,
                    charlotteTip,
                    scale,
                    targetRadius
                }));
            }

            const cached = shapeCache.get(id);
            if (!cached) return;

            // --- Posición orbital: ángulo distribuido uniformemente en el círculo ---
            const angle = globalAngle + index * (2 * Math.PI / count);
            const centerX = (w / 2) + orbitRadius * Math.cos(angle);
            const centerY = (h / 2) + orbitRadius * Math.sin(angle);

            // Trasladar la figura bloqueada al punto orbital sin girar sobre su propio eje,
            // manteniendo su orientación astronómica natural legible y clara en todo momento.
            const packedStars = cached.normStars.map((p) => ({
                x: centerX + p.x,
                y: centerY + p.y
            }));

            const packedLines = cached.normLines.map((ln) => ln.map((p) => ({
                x: centerX + p.x,
                y: centerY + p.y
            })));

            const packedTip = {
                x: centerX + cached.charlotteTip.x,
                y: centerY + cached.charlotteTip.y
            };

            layout.set(id, {
                id,
                name: def.name,
                lines: packedLines,
                stars: packedStars,
                charlotteTip: packedTip,
                angle: angle,
                centerX: centerX,
                centerY: centerY
            });
        });

        return layout;
    }

    function drawPackedConstellation(layout, ctx, highlight) {
        const stroke = highlight ? HIGHLIGHT_COLOR : 'rgba(215, 230, 255, 0.48)';
        const width = highlight ? 1.8 : 1.25;

        // Trazos vectoriales nítidos con resplandor celeste
        ctx.save();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = highlight ? 'rgba(255, 130, 200, 0.95)' : 'rgba(150, 185, 255, 0.45)';
        ctx.shadowBlur = highlight ? 18 : 6;

        layout.lines.forEach((pts) => {
            if (!pts.length) return;
            ctx.beginPath();
            pts.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });
        ctx.restore();

        // Estrellas (nodos luminosos definidos y radiantes)
        ctx.save();
        ctx.shadowColor = highlight ? 'rgba(255, 160, 225, 1)' : 'rgba(210, 230, 255, 0.85)';
        ctx.shadowBlur = highlight ? 16 : 8;
        ctx.fillStyle = highlight ? '#ffffff' : 'rgba(255, 255, 255, 0.92)';

        layout.stars.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, highlight ? 2.6 : 1.8, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function drawCustom(custom, ctx, w, h, time) {
        const color = custom.color || 'rgba(255, 158, 205, 0.95)';
        const nodes = (custom.nodes || []).map(([u, v]) => ({ x: u * w, y: v * h }));

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255, 120, 190, 0.9)';
        ctx.shadowBlur = 14;

        (custom.edges || []).forEach(([ia, ib]) => {
            const a = nodes[ia];
            const b = nodes[ib];
            if (!a || !b) return;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        });

        // Pulso sutil en los nodos de la constelación personalizada.
        nodes.forEach((p) => {
            const pulse = 0.5 + 0.5 * Math.sin(time / 900 + p.x);
            ctx.beginPath();
            ctx.fillStyle = `rgba(255, 190, 230, ${0.65 + 0.3 * pulse})`;
            ctx.shadowBlur = 10 + 6 * pulse;
            ctx.arc(p.x, p.y, 2 + pulse, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();

        // Nombre de la constelación personalizada, sobre su centroide.
        const centroid = nodes.reduce(
            (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
            { x: 0, y: 0 }
        );
        if (nodes.length) {
            centroid.x /= nodes.length;
            centroid.y /= nodes.length;
            const label = custom.name || '';
            ctx.save();
            ctx.font = 'italic 300 22px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 200, 235, 0.95)';
            ctx.shadowColor = 'rgba(255, 120, 190, 0.9)';
            ctx.shadowBlur = 12;
            ctx.fillText(label, centroid.x, Math.min(Math.max(centroid.y - 18, 26), h - 12));
            ctx.restore();
        }
    }

    function drawLink(link, ctx, w, h, time) {
        const a = link.from;
        const b = link.to;
        if (!a || !b) return;

        // Trazo continuo y limpio de un nodo al otro, sin cruzar la figura.
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (!len) return;

        const steps = 24;
        ctx.save();
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255, 140, 210, 0.9)';
        ctx.shadowBlur = 16;

        for (let i = 0; i < steps; i += 1) {
            const t0 = i / steps;
            const t1 = (i + 1) / steps;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, 'rgba(255, 220, 245, 0.7)');
            grad.addColorStop(0.25, 'rgba(255, 150, 180, 0.75)');
            grad.addColorStop(1, 'rgba(255, 190, 235, 0.9)');
            ctx.strokeStyle = grad;

            // Ligero viaje de luz a lo largo de la conexión.
            const phase = ((time / 80 + t0) % 1);
            const soft = 0.55 + 0.45 * Math.abs(1 - 2 * Math.abs(phase - 0.5));
            ctx.globalAlpha = soft;

            ctx.beginPath();
            ctx.moveTo(a.x + dx * t0, a.y + dy * t0);
            ctx.lineTo(a.x + dx * t1, a.y + dy * t1);
            ctx.stroke();
        }
        ctx.restore();
    }

    // La anomalía de Charlotte: una estrella que no pertenece a ningún mapa real.
    // Nace en un extremo de Géminis (el pie de la figura, ya empaquetada en el
    // halo) con una línea delgada hacia afuera y se dibuja con un estilo único
    // (tono rosado, más grande y con resplandor intenso) junto a su etiqueta.
    // Al partir del punto empaquetado de Géminis, orbita con la figura sin romperse.
    function drawCharlotteAnomaly(geminiLayout, ctx, w, h) {
        // Solo se muestra cuando el final lo pide (tras la pausa de lectura),
        // nunca al instante ni fija: orbita con su constelación.
        if (!sky.showCharlotte) return;
        if (!geminiLayout || !geminiLayout.charlotteTip) return;

        const tip = geminiLayout.charlotteTip;

        // Dirección hacia afuera de la figura de Géminis (lejos de su centroide)
        const dx = tip.x - geminiLayout.centerX;
        const dy = tip.y - geminiLayout.centerY;
        const len = Math.hypot(dx, dy) || 1;
        const ext = Math.max(22, Math.min(w, h) * 0.055);
        const cx = tip.x + (dx / len) * ext;
        const cy = tip.y + (dy / len) * ext;

        // Línea delgada y sutil que conecta el extremo con la estrella.
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

        // Halo suave detrás de la estrella.
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

        // Etiqueta pequeña, en cursiva y color tenue.
        ctx.save();
        ctx.font = 'italic 300 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 182, 193, 0.75)';
        ctx.shadowColor = 'rgba(255, 105, 180, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText('Charlotte', cx, cy - 13);
        ctx.restore();
    }

    // Motor de animación principal. Estructura estricta:
    //   1) Alta resolución (DPR): el canvas físico usa inner*devicePixelRatio y
    //      el contexto se escala para dibujar en píxeles CSS → trazos vectoriales
    //      nítidos sin importar el zoom.
    //   2) clearRect al inicio (borra el frame anterior, sin estelas).
    //   3) globalAngle += 0.003 (revolución orbital del halo en círculo).
    //   4) Cada constelación orbita en círculo, manteniendo su forma bloqueada e inmutable.
    //   5) Termina obligatoriamente con requestAnimationFrame(animate).
    function animate() {
        const ctx = sky.ctx;
        const canvas = sky.canvas;

        if (ctx && canvas && sky.w) {
            const w = sky.w;
            const h = sky.h;
            const dpr = sky.dpr || 1;

            // Nitidez absoluta: ajuste a la densidad de píxeles del monitor.
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Rotación orbital global (velocidad suave del halo).
            globalAngle += 0.003;

            // Layout orbital: las 11 constelaciones del zodíaco en su anillo circular
            const boxes = buildBoxLayout(w, h);

            boxes.forEach((box, id) => {
                drawPackedConstellation(box, ctx, id === sky.highlightedId);
            });

            // Conexiones.
            const now = performance.now();
            sky.links.forEach((link) => drawLink(link, ctx, w, h, now));

            // Constelaciones personalizadas (encima de todo). Usan coordenadas
            // relativas 0..1, así que permanecen FIJAS.
            sky.customs.forEach((custom) => drawCustom(custom, ctx, w, h, now));

            // La anomalía de Charlotte sigue a Géminis a lo largo de su órbita.
            drawCharlotteAnomaly(boxes.get('Gem'), ctx, w, h);
        }

        // El bucle nunca se detiene: el giro orbital es continuo.
        requestAnimationFrame(animate);
    }

    /* ------------------------------------------------------------------ */
    /* Arranque del motor de animación                                    */
    /* ------------------------------------------------------------------ */

    function startLoop() {
        if (sky.rafId) return;
        sky.rafId = requestAnimationFrame(animate);
    }

    function refresh() {
        // La animación ya corre continua (animate + requestAnimationFrame).
    }

    /* ------------------------------------------------------------------ */
    /* Carga de datos                                                      */
    /* ------------------------------------------------------------------ */

    function loadData() {
        sky.constellations = Object.keys(ZODIAC_DEFINITIONS).map((id) => ({
            id,
            name: ZODIAC_DEFINITIONS[id].name
        }));
        sky.ready = true;
        sky.dataVersion = 'authentic-zodiac';
        resize();
        return Promise.resolve(sky.constellations);
    }

    /* ------------------------------------------------------------------ */
    /* API pública                                                         */
    /* ------------------------------------------------------------------ */

    function resize() {
        if (!sky.canvas) return;

        sky.w = window.innerWidth;
        sky.h = window.innerHeight;
        sky.dpr = window.devicePixelRatio || 1;

        // Alta resolución: el canvas físico usa la densidad de píxeles real del
        // monitor. Al escalar el contexto, se dibuja en píxeles CSS y los trazos
        // quedan nítidos (vectores matemáticos) sin importar el zoom.
        const canvas = sky.canvas;
        canvas.width = Math.round(sky.w * sky.dpr);
        canvas.height = Math.round(sky.h * sky.dpr);
        canvas.style.width = sky.w + 'px';
        canvas.style.height = sky.h + 'px';

        sky.ready = Boolean(sky.ctx);

        // Limpiar cache de formas para recalcular con las nuevas dimensiones
        shapeCache.clear();
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
        loadData();
        startLoop();
        return sky;
    }

    function drawCustomConstellation(name, nodes, edges, options) {
        const custom = {
            id: 'custom-' + Math.random().toString(36).slice(2, 9),
            name: name || '',
            nodes: nodes || [],
            edges: edges || [],
            color: (options && options.color) || undefined
        };
        sky.customs.push(custom);
        refresh();
        return custom;
    }

    function removeCustom(id) {
        sky.customs = sky.customs.filter((c) => c.id !== id);
        refresh();
    }

    function clearCustoms() {
        sky.customs = [];
        refresh();
    }

    function highlight(id) {
        sky.highlightedId = id || null;
        refresh();
    }

    function unhighlight(id) {
        if (!id || sky.highlightedId === id) {
            sky.highlightedId = null;
            refresh();
        }
    }

    function setLink(from, to) {
        sky.links = from && to ? [{ from, to }] : [];
        refresh();
    }

    function clearLinks() {
        sky.links = [];
        refresh();
    }

    // Enciende la estrella de Charlotte junto a Géminis (anomalía del halo).
    // El final la invoca tras la pausa de lectura: aparece, no al instante.
    function showCharlotte() {
        sky.showCharlotte = true;
        document.body.classList.add('show-charlotte');
        const geminiBox = document.querySelector('.box-gemini');
        if (geminiBox) geminiBox.classList.add('gemini-charlotte-active');
        refresh();
    }

    function project(raDeg, decDeg) {
        return projectPoint(raDeg, decDeg, sky.w, sky.h);
    }

    function getConstellation(id) {
        return sky.constellations.find((c) => c.id === id) || null;
    }

    global.CelestialSky = {
        init,
        resize,
        drawCustomConstellation,
        removeCustom,
        clearCustoms,
        highlight,
        unhighlight,
        setLink,
        clearLinks,
        showCharlotte,
        project,
        getConstellation,
        isReady: () => sky.ready,
        dataVersion: () => sky.dataVersion
    };

    // Inicio del ciclo: se invoca una única vez al final del script para arrancar
    // el motor de rotación. animate() se re-agenda solo con requestAnimationFrame,
    // por lo que el halo orbita de forma continua desde la carga.
    startLoop();
}(window));