/*
 * Pulido cinematográfico independiente.
 * No modifica la geometría, mensajes ni interacción de las 14 estrellas.
 *
 * Escena 1: galaxia espiral lejana, integrada en el espacio.
 * Escena 2: el mismo punto de Gargantúa, pero con disco irregular, plasma móvil,
 * zonas calientes y entrada de cámara. No dibuja el aro tipo Saturno.
 */
(function () {
    'use strict';

    const baseCanvas = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!baseCanvas || !button) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-polish-layer';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;display:none;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let width = 0, height = 0, dpr = 1, raf = 0, running = false, startAt = 0, seed = 1;
    let stars = [], galaxyPoints = [], hot = [];

    function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
    function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
    function rnd(i, s = 7) {
        const n = Math.sin((i + 1) * 127.17 + s * 37.91 + seed * 0.17) * 43758.5453;
        return n - Math.floor(n);
    }
    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying() && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startAt) / 1000;
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.35);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildScene();
    }

    function buildScene() {
        const mobile = width < 768;
        const starCount = mobile ? 54 : 82;
        const pointCount = mobile ? 92 : 148;
        const hotCount = mobile ? 5 : 8;
        stars = [];
        galaxyPoints = [];
        hot = [];

        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: rnd(i + 10, 11) * width,
                y: rnd(i + 100, 13) * height,
                r: 0.22 + rnd(i + 200, 17) * 0.72,
                a: 0.10 + rnd(i + 300, 19) * 0.28,
                tw: rnd(i + 400, 23) * Math.PI * 2
            });
        }

        for (let i = 0; i < pointCount; i++) {
            const arm = i % 2;
            const u = Math.pow(rnd(i + 500, 29), 0.78);
            galaxyPoints.push({
                r: 0.06 + u * 0.94,
                a: arm * Math.PI + u * 5.5 * Math.PI + (rnd(i + 600, 31) - 0.5) * 0.62,
                size: 0.25 + rnd(i + 700, 37) * 0.9,
                alpha: 0.08 + (1 - u) * 0.34 + rnd(i + 800, 41) * 0.12,
                warm: rnd(i + 900, 43) > 0.70,
                phase: rnd(i + 1000, 47) * Math.PI * 2
            });
        }

        for (let i = 0; i < hotCount; i++) {
            hot.push({
                a: rnd(i + 1100, 53) * Math.PI * 2,
                r: 1.10 + rnd(i + 1200, 59) * 0.78,
                speed: 0.00042 + rnd(i + 1300, 61) * 0.00064,
                size: 1.0 + rnd(i + 1400, 67) * 1.8,
                phase: rnd(i + 1500, 71) * Math.PI * 2
            });
        }
    }

    function drawTinyStar(x, y, r, a, warm) {
        if (a <= 0.005) return;
        ctx.globalAlpha = a;
        ctx.fillStyle = warm ? '#ffdcb7' : '#e7eeff';
        ctx.fillRect(x, y, Math.max(0.4, r), Math.max(0.4, r));
    }

    function drawSpaceStars(now, alpha) {
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const pulse = 1 + Math.sin(now * 0.0008 + s.tw) * 0.09;
            drawTinyStar(s.x, s.y, s.r, s.a * pulse * alpha, false);
        }
        ctx.globalAlpha = 1;
    }

    function drawGalaxy(now, alpha) {
        if (alpha <= 0.005) return;
        const mobile = width < 768;
        const cx = width * 0.70;
        const cy = height * 0.48;
        const R = Math.min(width, height) * (mobile ? 0.095 : 0.125);
        const rot = now * 0.000008;

        // Halo irregular y muy suave; no forma un óvalo visible.
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.65);
        g.addColorStop(0, 'rgba(255,232,211,' + (0.19 * alpha) + ')');
        g.addColorStop(0.18, 'rgba(214,203,255,' + (0.075 * alpha) + ')');
        g.addColorStop(0.48, 'rgba(109,119,203,' + (0.028 * alpha) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.19);
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        // Estructura de brazos continua: dos brazos + dos pasadas finas.
        for (let arm = 0; arm < 2; arm++) {
            for (let pass = 0; pass < 2; pass++) {
                ctx.beginPath();
                for (let j = 0; j <= 88; j++) {
                    const u = j / 88;
                    const rr = R * (0.10 + u * 1.02);
                    const a = arm * Math.PI + u * 5.35 * Math.PI + rot + pass * 0.02;
                    const x = Math.cos(a) * rr * 1.72;
                    const y = Math.sin(a) * rr * 0.50;
                    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = pass === 0
                    ? 'rgba(255,216,179,' + (0.13 * alpha) + ')'
                    : 'rgba(177,190,255,' + (0.085 * alpha) + ')';
                ctx.lineWidth = Math.max(0.65, R * (pass === 0 ? 0.028 : 0.013));
                ctx.stroke();
            }
        }

        for (let i = 0; i < galaxyPoints.length; i++) {
            const p = galaxyPoints[i];
            const a = p.a + rot * (1.3 + p.r * 1.6) + Math.sin(now * 0.0005 + p.phase) * 0.012;
            const rr = R * p.r;
            const x = Math.cos(a) * rr * 1.72;
            const y = Math.sin(a) * rr * 0.50;
            const tw = 1 + Math.sin(now * 0.001 + p.phase) * 0.08;
            drawTinyStar(x, y, p.size, p.alpha * tw * alpha, p.warm);
        }

        const core = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.36);
        core.addColorStop(0, 'rgba(255,250,237,' + (0.86 * alpha) + ')');
        core.addColorStop(0.23, 'rgba(255,222,181,' + (0.34 * alpha) + ')');
        core.addColorStop(1, 'rgba(255,170,110,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        // Tres puntos de referencia, como estrellas lejanas alrededor de la galaxia.
        for (let i = 0; i < 3; i++) {
            const a = i * 2.1 + now * 0.00002;
            const rr = R * (1.3 + i * 0.22);
            drawTinyStar(cx + Math.cos(a) * rr * 1.15, cy + Math.sin(a) * rr * 0.42, 0.65 + i * 0.12, 0.20 * alpha, false);
        }
    }

    function diskSample(cx, cy, r, a, flatten) {
        const wobble =
            Math.sin(a * 5.0) * r * 0.018 +
            Math.sin(a * 13.0 + 1.7) * r * 0.007;
        const rr = r + wobble;
        return {
            x: cx + Math.cos(a) * rr * 1.65,
            y: cy + Math.sin(a) * rr * flatten
        };
    }

    function drawBlackHole(now, p) {
        const cx = width * 0.5;
        const cy = height * 0.44;
        const r = Math.min(width, height) * 0.16;
        const strength = 0.90 + Math.sin(now * 0.0016) * 0.05;
        const zoom = smooth(p);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Campo gravitacional: circular, amplio y difuso.
        const field = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 4.2);
        field.addColorStop(0, 'rgba(255,209,155,' + (0.16 * strength) + ')');
        field.addColorStop(0.24, 'rgba(255,164,99,' + (0.065 * strength) + ')');
        field.addColorStop(0.58, 'rgba(134,117,225,' + (0.023 * strength) + ')');
        field.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = field;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 4.2, 0, Math.PI * 2);
        ctx.fill();

        // Disco de acreción en muchos fragmentos: la ausencia de un arco cerrado
        // es deliberada para que deje de parecer un planeta con anillos.
        const rings = 5;
        for (let k = 0; k < rings; k++) {
            const rr = r * (1.08 + k * 0.23);
            const flatten = 0.25 + k * 0.026;
            const spin = now * (0.00012 + k * 0.000028);
            const pieces = width < 768 ? 8 : 11;

            for (let piece = 0; piece < pieces; piece++) {
                const seedA = piece * (Math.PI * 2 / pieces) + k * 0.41 + spin;
                const len = 0.25 + rnd(piece + k * 50 + 1700, 79) * 0.42;
                const start = seedA + rnd(piece + k * 50 + 1800, 83) * 0.30;
                const end = start + len;
                const grad = ctx.createLinearGradient(cx - rr, cy, cx + rr, cy);
                grad.addColorStop(0, 'rgba(113,117,255,0)');
                grad.addColorStop(0.26, 'rgba(255,116,58,' + (0.06 * strength) + ')');
                grad.addColorStop(0.50, 'rgba(255,236,197,' + (0.50 * strength) + ')');
                grad.addColorStop(0.72, 'rgba(255,165,83,' + (0.25 * strength) + ')');
                grad.addColorStop(1, 'rgba(100,86,181,0)');
                ctx.strokeStyle = grad;
                ctx.lineWidth = Math.max(1.0, r * (0.018 - k * 0.0013));
                ctx.beginPath();
                for (let s = 0; s <= 16; s++) {
                    const q = s / 16;
                    const a = start + (end - start) * q;
                    const pt = diskSample(cx, cy, rr, a, flatten);
                    if (s === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
            }
        }

        // Nudos de plasma: se desplazan y pulsan individualmente.
        for (let i = 0; i < hot.length; i++) {
            const h = hot[i];
            const a = h.a + now * h.speed;
            const pt = diskSample(cx, cy, r * h.r, a, 0.29 + (i % 2) * 0.03);
            const pulse = 1 + Math.sin(now * 0.0021 + h.phase) * 0.24;
            const size = h.size * pulse;
            const hg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size * 4);
            hg.addColorStop(0, 'rgba(255,250,224,' + (0.72 * strength) + ')');
            hg.addColorStop(0.18, 'rgba(255,193,111,' + (0.38 * strength) + ')');
            hg.addColorStop(1, 'rgba(255,97,46,0)');
            ctx.fillStyle = hg;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, size * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,242,211,' + (0.90 * strength) + ')';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(0.7, size * 0.55), 0, Math.PI * 2);
            ctx.fill();
        }

        // Photon ring, extremadamente fino. No es el disco: solo contornea el horizonte.
        ctx.globalAlpha = 0.24 * strength;
        ctx.strokeStyle = '#fff2d9';
        ctx.lineWidth = Math.max(0.8, r * 0.018);
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.035 + Math.sin(now * 0.0008) * 0.006), 0, Math.PI * 2);
        ctx.stroke();

        // Horizonte de sucesos perfectamente oscuro y redondo.
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.035);
        core.addColorStop(0, '#000000');
        core.addColorStop(0.82, '#000104');
        core.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.035, 0, Math.PI * 2);
        ctx.fill();

        // Pequeña variación de brillo: arriba y abajo no respiran igual.
        ctx.globalAlpha = 0.17 * strength;
        ctx.strokeStyle = '#ffe0ae';
        ctx.lineWidth = Math.max(0.8, r * 0.02);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.06, -0.55, 1.65);
        ctx.stroke();

        // Durante la entrada aparecen filamentos que se estiran hacia el centro.
        if (zoom > 0.18) {
            const count = width < 768 ? 18 : 28;
            for (let i = 0; i < count; i++) {
                const a = rnd(i + 2000, 89) * Math.PI * 2;
                const inner = r * (1.25 + rnd(i + 2100, 97) * 0.85);
                const len = (18 + rnd(i + 2200, 101) * 90) * zoom;
                ctx.globalAlpha = 0.07 * zoom;
                ctx.strokeStyle = '#dbe5ff';
                ctx.lineWidth = 0.35 + rnd(i + 2300, 103) * 0.65;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
                ctx.lineTo(cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len));
                ctx.stroke();
            }
        }

        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }

    function draw(now) {
        if (!running) return;
        const t = musicTime(now);
        const galaxyEnd = reduced ? 9.2 : 16.15;
        const holeStart = reduced ? 20.6 : 24.5;
        const approachStart = reduced ? 23.7 : 28.3;
        const entryEnd = reduced ? 27.2 : 31.9;

        ctx.clearRect(0, 0, width, height);

        if (t < galaxyEnd) {
            baseCanvas.style.visibility = 'hidden';
            if (nebula) nebula.style.visibility = 'hidden';
            const appear = smooth((t - (reduced ? 1.0 : 2.43)) / 1.8);
            const fade = t > galaxyEnd - 1.25 ? 1 - smooth((t - (galaxyEnd - 1.25)) / 1.25) : 1;
            const a = clamp(appear * fade);

            ctx.fillStyle = 'rgba(1,3,10,' + (0.80 * a) + ')';
            ctx.fillRect(0, 0, width, height);
            drawSpaceStars(now, 0.62 * a);
            drawGalaxy(now, a);
        }

        if (t >= galaxyEnd && t < holeStart) {
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            canvas.style.display = 'none';
        }

        if (t >= holeStart && t < entryEnd) {
            baseCanvas.style.visibility = 'hidden';
            if (nebula) nebula.style.visibility = 'hidden';
            canvas.style.display = 'block';

            const p = t < approachStart
                ? smooth((t - holeStart) / Math.max(0.1, approachStart - holeStart))
                : smooth((t - approachStart) / Math.max(0.1, entryEnd - approachStart));

            ctx.fillStyle = 'rgba(1,2,8,0.94)';
            ctx.fillRect(0, 0, width, height);
            drawSpaceStars(now, 0.38 + 0.22 * (1 - p));
            drawBlackHole(now, p);

            if (t >= approachStart) {
                const q = smooth((t - approachStart) / Math.max(0.1, entryEnd - approachStart));
                // Zoom visual del entorno, sin dibujar un segundo agujero.
                const vignette = ctx.createRadialGradient(width * 0.5, height * 0.44, 0, width * 0.5, height * 0.44, Math.hypot(width, height) * 0.72);
                vignette.addColorStop(0, 'rgba(0,0,2,' + (0.30 + q * 0.64) + ')');
                vignette.addColorStop(0.74, 'rgba(0,0,2,' + (0.16 + q * 0.32) + ')');
                vignette.addColorStop(1, 'rgba(0,0,2,0)');
                ctx.fillStyle = vignette;
                ctx.fillRect(0, 0, width, height);
            }
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        if (t >= entryEnd) {
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            ctx.clearRect(0, 0, width, height);
            canvas.style.display = 'none';
            running = false;
            return;
        }

        raf = requestAnimationFrame(draw);
    }

    function begin() {
        if (running) return;
        running = true;
        startAt = performance.now();
        seed = Math.floor(Math.random() * 100000);
        resize();
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        canvas.style.display = 'block';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();
