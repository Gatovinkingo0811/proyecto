/*
 * Nueva intro cinematográfica:
 * cielo nocturno realista -> estrellas de diferentes magnitudes -> fugaces lentas
 * -> desplazamiento de mirada -> descubrimiento de Acuario.
 *
 * NO hay galaxia artificial, círculos atravesando la pantalla ni agujero negro.
 * Acuario se revela con las MISMAS 14 posiciones de la experiencia interactiva.
 * Las conexiones NO se dibujan durante la intro: aparecen únicamente después
 * de descubrir las estrellas desde script.js.
 */
(function () {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-sky';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100%',
        'height:100%',
        'z-index:20',
        'pointer-events:none',
        'display:none',
        'opacity:1',
        'will-change:opacity'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const button = document.getElementById('intro-begin');
    const baseCanvas = document.getElementById('starfield');
    const nebula = document.getElementById('nebula');
    if (!button || !baseCanvas) {
        canvas.remove();
        return;
    }

    const reduced = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // Mantiene el mismo punto de salida que la cinemática existente para que
    // script.js pueda cerrar el cine sin saltos ni estados intermedios.
    const TOTAL = 39.5;
    const LOOK_START = 11.5;
    const LOOK_END = 25.5;
    const CONSTELLATION_START = 25.5;
    const CONSTELLATION_END = 38.2;
    const FADE_TO_BASE = 38.6;

    const AQUARIUS = [
        { id: 1, x: 16, y: 54 },
        { id: 2, x: 34, y: 42 },
        { id: 3, x: 48, y: 26 },
        { id: 4, x: 58, y: 17 },
        { id: 5, x: 58, y: 31 },
        { id: 6, x: 65, y: 26 },
        { id: 7, x: 71, y: 29 },
        { id: 8, x: 52, y: 53 },
        { id: 9, x: 57, y: 63 },
        { id: 10, x: 72, y: 74 },
        { id: 11, x: 76, y: 48 },
        { id: 12, x: 70, y: 83 },
        { id: 13, x: 82, y: 89 },
        { id: 14, x: 87, y: 42 }
    ];

    const bgStars = [];
    let seed = 81211;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    // Un cielo denso, pero no saturado. Hay magnitudes claramente distintas y
    // solo una parte de las estrellas tiene titileo perceptible.
    const starCount = reduced ? 150 : 320;
    for (let i = 0; i < starCount; i++) {
        const roll = rnd();
        const bright = roll > 0.80;
        const medium = !bright && roll > 0.53;
        bgStars.push({
            x: rnd(),
            y: rnd(),
            radius: bright ? 1.15 + rnd() * 1.5 : (medium ? 0.72 + rnd() * 0.62 : 0.32 + rnd() * 0.48),
            alpha: bright ? 0.50 + rnd() * 0.38 : (medium ? 0.25 + rnd() * 0.36 : 0.10 + rnd() * 0.30),
            twinkle: bright ? 0.45 + rnd() * 0.65 : (medium ? 0.24 + rnd() * 0.58 : (rnd() < 0.18 ? 0.20 + rnd() * 0.35 : 0)),
            phase: rnd() * Math.PI * 2,
            depth: 0.25 + rnd() * 1.1,
            cross: bright && rnd() < 0.58
        });
    }

    const shooting = [
        { at: 5.6, x: 0.86, y: 0.20, angle: 2.56, speed: 0.38, length: 0.15, alpha: 0.80 },
        { at: 12.7, x: 0.10, y: 0.27, angle: 0.46, speed: 0.34, length: 0.14, alpha: 0.68 },
        { at: 19.8, x: 0.79, y: 0.52, angle: 2.70, speed: 0.32, length: 0.13, alpha: 0.72 },
        { at: 28.4, x: 0.22, y: 0.18, angle: 0.56, speed: 0.30, length: 0.12, alpha: 0.64 },
        { at: 34.9, x: 0.75, y: 0.73, angle: 3.82, speed: 0.27, length: 0.11, alpha: 0.58 }
    ];

    let width = 1;
    let height = 1;
    let dpr = 1;
    let startedAt = 0;
    let running = false;
    let raf = 0;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.45);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function smoothstep(v) {
        v = clamp(v);
        return v * v * (3 - 2 * v);
    }

    function smootherstep(v) {
        v = clamp(v);
        return v * v * v * (v * (v * 6 - 15) + 10);
    }

    function cinematicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function camera(t) {
        const p = smoothstep((t - LOOK_START) / (LOOK_END - LOOK_START));
        // Se desplaza lentamente hacia la derecha de la escena para que el ojo
        // “descubra” Acuario, que ocupa el plano central cuando termina.
        const x = -width * 0.075 * p;
        const y = height * 0.018 * Math.sin(p * Math.PI);
        const zoom = 1 + 0.028 * p;
        return { x, y, zoom };
    }

    function drawStar(x, y, radius, alpha, twinkle, phase, cross = false, t = 0, emphasis = 1) {
        const pulse = twinkle ? (0.82 + 0.18 * Math.sin(t * twinkle + phase)) : 1;
        const a = clamp(alpha * pulse);
        const r = Math.max(0.45, radius * emphasis);

        if (r >= 1.0) {
            const glowR = r * 4.6;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            glow.addColorStop(0, 'rgba(224,234,255,' + (a * 0.18) + ')');
            glow.addColorStop(0.18, 'rgba(205,222,255,' + (a * 0.07) + ')');
            glow.addColorStop(1, 'rgba(180,205,255,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        if (cross) {
            const ray = r * (2.6 + 0.9 * emphasis);
            ctx.strokeStyle = 'rgba(240,246,255,' + (a * 0.36) + ')';
            ctx.lineWidth = Math.max(0.45, Math.min(0.95, r * 0.3));
            ctx.beginPath();
            ctx.moveTo(x - ray, y);
            ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray);
            ctx.lineTo(x, y + ray);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawSky(t) {
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#01030a');
        g.addColorStop(0.38, '#040915');
        g.addColorStop(0.70, '#030611');
        g.addColorStop(1, '#010207');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cam = camera(t);
        const breathe = 0.94 + 0.06 * Math.sin(t * 0.16);

        for (let i = 0; i < bgStars.length; i++) {
            const s = bgStars[i];
            let sx = s.x * width + cam.x * s.depth;
            let sy = s.y * height + cam.y * s.depth;
            sx = ((sx % width) + width) % width;
            sy = ((sy % height) + height) % height;
            drawStar(sx, sy, s.radius, s.alpha * breathe, s.twinkle, s.phase, s.cross, t, 1);
        }

        // Fugaces más lentas y finas: cruzan el cielo sin convertirse en una lluvia.
        for (let i = 0; i < shooting.length; i++) {
            const s = shooting[i];
            const local = t - s.at;
            if (local < 0 || local > 2.25) continue;

            const p = local < 0.28
                ? smoothstep(local / 0.28)
                : 1 - smoothstep((local - 0.28) / 1.97);

            const x = s.x * width + Math.cos(s.angle) * local * width * s.speed;
            const y = s.y * height + Math.sin(s.angle) * local * height * s.speed;
            const len = Math.min(width, height) * s.length * (0.35 + 0.65 * p);
            const tx = x - Math.cos(s.angle) * len;
            const ty = y - Math.sin(s.angle) * len;

            const grad = ctx.createLinearGradient(tx, ty, x, y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.76, 'rgba(228,238,255,' + (s.alpha * p * 0.28) + ')');
            grad.addColorStop(1, 'rgba(255,255,255,' + (s.alpha * p) + ')');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.0 + p * 0.55;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();
            drawStar(x, y, 1.0 + p * 0.8, s.alpha * p * 0.82, 0, 0, true, t, 1.1);
        }
    }

    function drawAquarius(t) {
        if (t < CONSTELLATION_START) return;

        const p = smoothstep((t - CONSTELLATION_START) / (CONSTELLATION_END - CONSTELLATION_START));
        const reveal = smootherstep(p) * AQUARIUS.length;
        const cam = camera(t);

        for (let i = 0; i < AQUARIUS.length; i++) {
            const star = AQUARIUS[i];
            const local = clamp(reveal - i);
            if (local <= 0) continue;
            const e = smootherstep(local);
            const x = star.x / 100 * width + cam.x;
            const y = star.y / 100 * height + cam.y;
            const emphasis = 1.10 + 0.28 * e;
            drawStar(x, y, 1.7 + 1.25 * e, 0.26 + 0.72 * e, 0.52, i * 0.73, true, t, emphasis);

            if (e < 1) {
                const flash = Math.sin(e * Math.PI);
                const r = 7 + flash * 11;
                const fx = ctx.createRadialGradient(x, y, 0, x, y, r);
                fx.addColorStop(0, 'rgba(255,255,255,' + (flash * 0.34) + ')');
                fx.addColorStop(0.22, 'rgba(218,230,255,' + (flash * 0.10) + ')');
                fx.addColorStop(1, 'rgba(170,195,255,0)');
                ctx.fillStyle = fx;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // IMPORTANTE: no dibujamos NINGUNA conexión aquí. Las líneas nacen con
        // los descubrimientos reales de script.js después de la intro.
    }

    function frame(now) {
        if (!running) return;
        const t = cinematicTime(now);
        drawSky(t);
        drawAquarius(t);

        if (t >= FADE_TO_BASE) {
            const p = clamp((t - FADE_TO_BASE) / (TOTAL - FADE_TO_BASE));
            canvas.style.opacity = String(1 - smoothstep(p));
        } else {
            canvas.style.opacity = '1';
        }

        if (t >= TOTAL) {
            running = false;
            cancelAnimationFrame(raf);
            canvas.style.display = 'none';
            canvas.style.opacity = '1';
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            return;
        }

        raf = requestAnimationFrame(frame);
    }

    function begin() {
        if (running) return;
        running = true;
        startedAt = performance.now();
        canvas.style.display = 'block';
        canvas.style.opacity = '1';
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        resize();
        drawSky(0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize, { passive: true });
    button.addEventListener('click', begin, { capture: false });
    resize();
})();
