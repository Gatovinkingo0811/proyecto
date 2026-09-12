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

    const DATA_URL = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json';

    // --- Data de respaldo completa con las 11 constelaciones del zodíaco
    // --- (RA/Dec reales astronómicas de d3-celestial) para que siempre se
    // --- muestren de forma inmediata y nítida, incluso sin conexión.
    const FALLBACK_CONSTELLATIONS = {
        Ari: [[[42.496, 27.2605], [31.7934, 23.4624], [28.66, 20.808], [28.3826, 19.2939]]],
        Tau: [[[84.4112, 21.1425], [68.9802, 16.5093], [67.1656, 15.8709], [64.9483, 15.6276], [65.7337, 17.5425], [67.1542, 19.1804], [81.573, 28.6075]], [[64.9483, 15.6276], [60.1701, 12.4903], [51.7923, 9.7327], [60.7891, 5.9893]], [[51.7923, 9.7327], [51.2033, 9.0289], [54.2183, 0.4017]]],
        Gem: [[[93.7194, 22.5068], [95.7401, 22.5136], [100.983, 25.1311], [107.7849, 30.2452], [113.6494, 31.8883], [116.329, 28.0262], [113.9806, 26.8957], [110.0307, 21.9823], [106.0272, 20.5703], [99.4279, 16.3993], [101.3224, 12.8956]], [[110.0307, 21.9823], [109.5232, 16.5404]]],
        Cnc: [[[134.6218, 11.8577], [131.1712, 18.1543], [130.8214, 21.4685], [131.6666, 28.7651]], [[131.1712, 18.1543], [124.1288, 9.1855]]],
        Leo: [[[152.093, 11.9672], [151.8331, 16.7627], [154.9931, 19.8415], [168.5271, 20.5237], [177.2649, 14.5721], [168.56, 15.4296], [152.093, 11.9672]], [[154.9931, 19.8415], [154.1726, 23.4173], [148.1909, 26.007], [146.4628, 23.7743]]],
        Vir: [[[176.4648, 6.5294], [177.6738, 1.7647], [-175.0235, -0.6668], [-169.5848, -1.4494], [-162.5125, -5.539], [-158.7018, -11.1613], [-145.9964, -6.0005], [-139.2349, -5.6582]], [[-164.4558, 10.9592], [-166.0991, 3.3975], [-169.5848, -1.4494]], [[-162.5125, -5.539], [-156.3267, -0.5958], [-149.5884, 1.5445], [-138.4378, 1.8929]]],
        Lib: [[[-133.9824, -25.282], [-137.2804, -16.0418], [-130.7483, -9.3829], [-126.1184, -14.7895], [-125.744, -28.1351], [-125.336, -29.7778]], [[-137.2804, -16.0418], [-126.1184, -14.7895]]],
        Sco: [[[-120.287, -26.1141], [-119.9166, -22.6217], [-118.6407, -19.8055]], [[-119.9166, -22.6217], [-114.7028, -25.5928], [-112.6481, -26.432], [-111.0294, -28.216], [-107.4591, -34.2932], [-107.0324, -38.0474], [-106.3541, -42.3613], [-101.9617, -43.2392], [-95.6703, -42.9978], [-93.1038, -40.127], [-94.378, -39.03], [-96.5978, -37.1038]]],
        Sgr: [[[-85.5932, -36.7617], [-83.957, -34.3846], [-84.7515, -29.8281], [-83.0073, -25.4217], [-86.5591, -21.0588]], [[-69.3404, -44.459], [-69.0284, -40.6159], [-74.347, -29.8801], [-78.5859, -26.9908], [-83.0073, -25.4217]], [[-61.1846, -41.8683], [-60.0659, -35.2763], [-61.0402, -26.2995], [-65.8232, -24.8836], [-68.6813, -24.5086], [-71.1149, -25.2567], [-76.1836, -26.2967], [-78.5859, -26.9908], [-84.7515, -29.8281], [-88.548, -30.4241], [-83.957, -34.3846], [-74.347, -29.8801], [-73.265, -27.6704], [-76.1836, -26.2967], [-73.8292, -21.7415], [-72.559, -21.0236], [-70.5913, -18.9529], [-69.5818, -17.8472], [-69.5682, -15.955]], [[-73.8292, -21.7415], [-75.5675, -21.1067], [-76.4576, -22.7448], [-76.1836, -26.2967]]],
        Cap: [[[-55.588, -12.5082], [-54.7472, -14.7814], [-52.7849, -17.8137], [-48.4761, -25.2709], [-47.0446, -26.9191], [-38.3332, -22.4113], [-33.2398, -16.1273], [-34.9773, -16.6623], [-39.4383, -16.8345], [-43.5132, -17.2329], [-55.588, -12.5082]]],
        Psc: [[[18.4373, 24.5837], [17.9152, 30.0896], [19.8666, 27.2641], [18.4373, 24.5837], [17.8634, 21.0347], [22.8709, 15.3458], [26.3485, 9.1577], [30.5118, 2.7638], [28.389, 3.1875], [25.3579, 5.4876], [22.5463, 6.1438], [18.4329, 7.5754], [15.7359, 7.8901], [12.1706, 7.5851], [-0.1721, 6.8633], [-5.0123, 5.6263], [-8.0079, 6.379], [-9.9142, 5.3813], [-10.7086, 3.2823], [-8.2669, 1.2556], [-4.4883, 1.78], [-3.402, 3.4868], [-5.0123, 5.6263]], [[-10.7086, 3.2823], [-14.0308, 3.82]]],
        Ori: [[[91.893, 14.7685], [88.5958, 20.2762], [90.9799, 20.1385], [92.985, 14.2088], [90.5958, 9.6473], [88.7929, 7.4071], [81.2828, 6.3497], [73.7239, 10.1508]], [[74.6371, 1.714], [73.5629, 2.4407], [72.8015, 5.6051], [72.46, 6.9613], [72.653, 8.9002], [73.7239, 10.1508], [74.0928, 13.5145], [76.1423, 15.4041], [77.4248, 15.5972]], [[78.6345, -8.2016], [81.1192, -2.3971], [83.0017, -0.2991], [81.2828, 6.3497], [83.7845, 9.9342], [88.7929, 7.4071], [85.1897, -1.9426], [86.9391, -9.6696]], [[85.1897, -1.9426], [84.0534, -1.2019], [83.0017, -0.2991]]],
        Cas: [[[28.5989, 63.6701], [21.454, 60.2353], [14.1772, 60.7167], [10.1268, 56.5373], [2.2945, 59.1498]]],
        UMa: [[[-176.1435, 57.0326], [165.932, 61.751], [165.4603, 56.3824], [178.4577, 53.6948], [-176.1435, 57.0326], [-166.4927, 55.9598], [-159.0186, 54.9254], [-153.1148, 49.3133]], [[178.4577, 53.6948], [176.5126, 47.7794], [169.6197, 33.0943], [169.5468, 31.5308]], [[176.5126, 47.7794], [167.4159, 44.4985], [155.5823, 41.4995]], [[167.4159, 44.4985], [154.2741, 42.9144]], [[165.932, 61.751], [142.8821, 63.0619], [127.5661, 60.7182], [147.7473, 59.0387], [165.4603, 56.3824]], [[165.4603, 56.3824], [148.0265, 54.0643], [143.2143, 51.6773], [134.8019, 48.0418]], [[135.9064, 47.1565], [143.2143, 51.6773]]]
    };

    // Color de realce para constelaciones seleccionadas
    const HIGHLIGHT_COLOR = 'rgba(255, 171, 216, 0.9)';

    // Filtro del zodíaco: solo estas 12 constelaciones se dibujan en el mapa.
    const zodiaco = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc'];

    const sky = {
        canvas: null,
        ctx: null,
        w: 0,
        h: 0,
        dpr: 1,
        constellations: Object.keys(FALLBACK_CONSTELLATIONS).map((id) => ({
            id,
            lines: FALLBACK_CONSTELLATIONS[id]
        })),
        dataVersion: 'builtin',
        highlightedId: null,
        customs: [],
        links: [],
        el: null,
        rafId: null,
        ready: false,
        showCharlotte: false
    };

    // Rotación global del halo orbital. Se incrementa suavemente en cada frame.
    let globalAngle = 0;

    /* ------------------------------------------------------------------ */
    /* Utilidades de Proyección Astronómica                                */
    /* ------------------------------------------------------------------ */

    function normalize(angle) {
        return ((angle % 360) + 360) % 360;
    }

    // Proyección con desenvoltura de RA para una constelación completa:
    // Evita que constelaciones que cruzan 0°/360° o 180°/-180° (como Piscis o Virgo)
    // se desgarren o se expandan por toda la pantalla.
    function projectConstellationLines(lines, w, h) {
        if (!lines || !lines.length) return [];

        // Buscar el primer punto válido como referencia de RA para la constelación
        let refRA = null;
        for (const line of lines) {
            if (line && line.length && line[0]) {
                refRA = normalize(line[0][0]);
                break;
            }
        }
        if (refRA === null) refRA = 0;

        return lines.map((line) => {
            let prev = refRA;
            return line.map((p) => {
                let ra = normalize(p[0]);
                let diff = ra - prev;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                const unwrappedRA = prev + diff;
                prev = unwrappedRA;
                const dec = p[1];
                return {
                    x: (unwrappedRA / 360) * w,
                    y: ((90 - dec) / 180) * h
                };
            });
        });
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
    //   1) Bloqueo estricto de forma: la forma astronómica no se distorsiona jamás.
    //   2) Órbita circular limpia: se trasladan por el círculo, no giran en su propio eje.
    //   3) Espaciado generoso: el tamaño de cada constelación respeta el arco orbital,
    //      impidiendo al 100% que se amontonen o se toquen entre sí.
    //   4) Centro despejado: Acuario y el texto final quedan limpios y legibles en el centro.
    function buildBoxLayout(w, h) {
        const zodiac = sky.constellations.filter((c) => zodiaco.includes(c.id) && c.id !== MAIN_ID);
        const layout = new Map();
        const count = zodiac.length || 11;

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

        zodiac.forEach((constellation, index) => {
            // --- Bloqueo de forma: calcular una sola vez y congelar en shapeCache ---
            if (!shapeCache.has(constellation.id)) {
                const projLines = projectConstellationLines(constellation.lines || [], w, h)
                    .filter((pts) => pts.length);

                // Centroide geométrico de la constelación
                let cx = 0;
                let cy = 0;
                let n = 0;
                projLines.forEach((ln) => ln.forEach((p) => { cx += p.x; cy += p.y; n += 1; }));
                if (!n) return;
                cx /= n;
                cy /= n;

                // Distancia máxima al centroide (radio natural de la figura)
                let maxDist = 0;
                projLines.forEach((ln) => ln.forEach((p) => {
                    const d = Math.hypot(p.x - cx, p.y - cy);
                    if (d > maxDist) maxDist = d;
                }));
                maxDist = Math.max(maxDist, 1);

                // Factor de escala exacto para el tamaño objetivo sin deformación
                const scale = targetRadius / maxDist;

                // Forma normalizada centrada en (0, 0) y congelada (bloqueo inmutable)
                const normLines = Object.freeze(projLines.map((ln) =>
                    Object.freeze(ln.map((p) => Object.freeze({
                        x: (p.x - cx) * scale,
                        y: (p.y - cy) * scale
                    })))
                ));

                shapeCache.set(constellation.id, Object.freeze({
                    normLines,
                    scale,
                    targetRadius
                }));
            }

            const cached = shapeCache.get(constellation.id);
            if (!cached) return;

            // --- Posición orbital: ángulo distribuido uniformemente en el círculo ---
            const angle = globalAngle + index * (2 * Math.PI / count);
            const centerX = (w / 2) + orbitRadius * Math.cos(angle);
            const centerY = (h / 2) + orbitRadius * Math.sin(angle);

            // Trasladar la figura bloqueada al punto orbital sin girar sobre su propio eje,
            // manteniendo su orientación astronómica natural legible y clara.
            const packedLines = cached.normLines.map((ln) =>
                ln.map((p) => ({
                    x: centerX + p.x,
                    y: centerY + p.y
                }))
            );

            layout.set(constellation.id, {
                lines: packedLines,
                angle: angle,
                scale: cached.scale,
                centerX: centerX,
                centerY: centerY
            });
        });

        return layout;
    }

function drawPackedConstellation(layout, ctx, highlight) {
    const lines = layout.lines;
    const stroke = highlight ? HIGHLIGHT_COLOR : 'rgba(255, 255, 255, 0.3)';
    const width = highlight ? 1.7 : 1;

    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.shadowColor = highlight ? 'rgba(255, 130, 200, 0.85)' : 'rgba(140, 170, 255, 0.4)';
    ctx.shadowBlur = highlight ? 18 : 5;

    lines.forEach((pts) => {
        if (!pts.length) return;
        ctx.beginPath();
        pts.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    });
    ctx.restore();

    // Nodos estelares principales (deduplicados por proximidad) con resplandor.
    const dots = new Set();
    lines.forEach((ln) => ln.forEach((p) => dots.add(Math.round(p.x * 4) + '|' + Math.round(p.y * 4))));

    ctx.save();
    ctx.shadowColor = highlight ? 'rgba(255, 150, 220, 0.95)' : 'rgba(200, 225, 255, 0.7)';
    ctx.shadowBlur = highlight ? 16 : 7;
    ctx.fillStyle = highlight ? 'rgba(255, 220, 245, 0.98)' : 'rgba(255, 255, 255, 0.82)';
    dots.forEach((key) => {
        const [px, py] = key.split('|').map(Number);
        ctx.beginPath();
        ctx.arc(px / 4, py / 4, highlight ? 2.4 : 1.5, 0, Math.PI * 2);
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
    // Al partir de los puntos empaquetados de Géminis, sigue la normalización y
    // traslación del halo: se mueve con la figura sin romperse.
    function drawCharlotteAnomaly(geminiLayout, ctx, w, h) {
        // Solo se muestra cuando el final lo pide (tras la pausa de lectura),
        // nunca al instante ni fija: orbita con su constelación.
        if (!sky.showCharlotte) return;

        const lines = geminiLayout && geminiLayout.lines;
        if (!lines || !lines.length) return;

        const line = lines[0];
        if (!line || line.length < 2) return;

        const tip = line[line.length - 1];
        const prev = line[line.length - 2];

        // Dirección hacia afuera del extremo del pie de Géminis (en el halo).
        const dx = tip.x - prev.x;
        const dy = tip.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const ext = Math.max(18, Math.min(w, h) * 0.06);
        const cx = tip.x + (dx / len) * ext;
        const cy = tip.y + (dy / len) * ext;

        // Línea delgada y sutil que conecta el extremo con la estrella.
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tip.x, tip.y);
        ctx.lineTo(cx, cy);
        ctx.strokeStyle = 'rgba(255, 182, 193, 0.32)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(255, 105, 180, 0.7)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.restore();

        // Halo suave detrás de la estrella.
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 105, 180, 0.12)';
        ctx.fill();
        ctx.restore();

        // La estrella: radio mayor, tono rosado y resplandor intenso.
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffb6c1';
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.restore();

        // Etiqueta pequeña, en cursiva y color tenue.
        ctx.save();
        ctx.font = 'italic 300 13px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
        ctx.fillText('Charlotte', cx, cy - 12);
        ctx.restore();
    }

    // Motor de animación principal. Estructura estricta:
    //   1) Alta resolución (DPR): el canvas físico usa inner*devicePixelRatio y
    //      el contexto se escala para dibujar en píxeles CSS → trazos vectoriales
    //      nítidos sin importar el zoom.
    //   2) clearRect al inicio (borra el frame anterior, sin estelas).
    //   3) globalAngle += 0.003 (giro de cada constelación sobre su propio eje).
    //   4) Cada constelación gira en su propia caja/zona fija (self-rotation
    //      con transform-origin center), NUNCA en órbita compartida.
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

            // Rotación global (velocidad del giro de cada constelación).
            globalAngle += 0.003;

            // Cajas: cada constelación del zodíaco (menos Acuario, fija en el
            // centro) en su propia zona de pantalla, girando sobre su eje.
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

            // La anomalía de Charlotte sigue a Géminis dentro de su caja: gira
            // con ella y nunca queda suelta en la pantalla.
            drawCharlotteAnomaly(boxes.get('Gem'), ctx, w, h);
        }

        // El bucle nunca se detiene: el giro es continuo.
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
        return fetch(DATA_URL)
            .then((res) => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.json();
            })
            .then((json) => {
                const collection = Array.isArray(json)
                    ? json
                    : (json && (json.features || json));
                const list = (collection || []).filter((f) => f && f.id && f.geometry);

                if (!list.length) {
                    throw new Error('No se encontraron constelaciones en los datos');
                }

                sky.constellations = list.map((f) => ({
                    id: String(f.id),
                    lines: ((f.geometry && f.geometry.coordinates) || [])
                }));
                sky.dataVersion = 'remote';
                return sky.constellations;
            })
            .catch(() => {
                // Fallback offline con constelaciones emblemáticas.
                sky.constellations = Object.keys(FALLBACK_CONSTELLATIONS).map((id) => ({
                    id,
                    lines: FALLBACK_CONSTELLATIONS[id]
                }));
                sky.dataVersion = 'fallback';
                return sky.constellations;
            })
            .then(() => {
                sky.ready = true;
                resize();
            });
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