/*
 * Intro cinematográfica: cielo nocturno -> cámara se desplaza -> Acuario aparece.
 *
 * Este archivo sustituye por completo la antigua galaxia/agujero negro.
 * No usa librerías externas ni modifica la geometría/interacción existente.
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
        'opacity:1'
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

    const prefersReducedMotion = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    const TOTAL = 39.5;
    const SKY_FOCUS_END = 15.0;
    const CAMERA_MOVE_START = 15.0;
    const CONSTELLATION_START = 27.0;
    const CONSTELLATION_FULL = 36.8;
    const FADE_TO_REAL = 38.7;

    // Las mismas 14 posiciones existentes de Acuario.
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

    const LINES = [
        [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7],
        [3, 8], [8, 9], [9, 10], [9, 11], [11, 14], [10, 12], [12, 13]
    ];

    // Estrellas de fondo: posiciones deterministas, diferentes tamaños y brillos.
    const bgStars = [];
    let seed = 81211;
    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const starCount = prefersReducedMotion ? 120 : 210;
    for (let i = 0; i < starCount; i++) {
        const edgeBias = rnd();
        const sizeRoll = rnd();
        bgStars.push({
            x: rnd(),
            y: rnd(),
            radius: sizeRoll < 0.72 ? 0.45 + rnd() * 0.65 : 1.1 + rnd() * 1.55,
            alpha: 0.18 + rnd() * 0.68,
            twinkle: 0.55 + rnd() * 1.8,
            phase: rnd() * Math.PI * 2,
            tint: 0.72 + rnd() * 0.28,
            drift: (rnd() - 0.5) * (edgeBias < 0.65 ? 0.012 : 0.028)
        });
    }

    const shooting = [];
    function makeShootingStar(delay, x, y, angle, speed, length, alpha) {
        shooting.push({
            delay,
            x, y, angle, speed, length, alpha,
            life: 0
        });
    }

    makeShootingStar(6.4, 0.08, 0.22, 0.44, 0.96, 0.25, 0.95);
    makeShootingStar(12.8, 0.76, 0.18, 2.62, 0.88, 0.20, 0.72);
    makeShootingStar(19.2, 0.18, 0.61, 0.35, 0.80, 0.18, 0.82);
    makeShootingStar(23.7, 0.83, 0.55, 2.73, 0.92, 0.22, 0.76);
    makeShootingStar(29.6, 0.26, 0.25, 0.54, 0.72, 0.17, 0.70);

    let startedAt = 0;
    let running = false;
    let raf = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function easeInOut(v) {
        v = clamp(v);
        return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
    }

    function easeOut(v) {
        v = clamp(v);
        return 1 - Math.pow(1 - v, 3);
    }

    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying() && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function drawBackground(t) {
        // Fondo azul-negro con un gradiente muy suave, sin óvalos ni formas artificiales.
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#02040b');
        g.addColorStop(0.42, '#050814');
        g.addColorStop(1, '#010208');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // Bruma casi imperceptible para evitar un negro completamente plano.
        const haze = ctx.createRadialGradient(width * 0.25, height * 0.30, 0, width * 0.25, height * 0.30, Math.min(width, height) * 0.72);
        haze.addColorStop(0, 'rgba(92,112,170,0.055)');
        haze.addColorStop(0.52, 'rgba(70,80,125,0.025)');
        haze.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, width, height);

        const move = clamp((t - CAMERA_MOVE_START) / 20, 0, 1);
        const panX = Math.sin(easeInOut(move) * Math.PI * 0.5) * width * 0.055;
        const panY = Math.cos(easeInOut(move) * Math.PI * 0.5) * height * 0.025;

        bgStars.forEach((s, i) => {
            let sx = s.x * width + panX * (0.25 + s.drift * 4);
            let sy = s.y * height + panY * (0.25 + s.drift * 4);
            sx = ((sx % width) + width) % width;
            sy = ((sy % height) + height) % height;

            const pulse = 0.74 + 0.26 * Math.sin(t * s.twinkle + s.phase);
            const a = clamp(s.alpha * pulse, 0.06, 0.96);
            const r = s.radius;
            const warm = s.tint;

            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + Math.floor(235 + 20 * warm) + ',' + Math.floor(238 + 15 * warm) + ',255,' + a + ')';
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();

            if (r > 1.2 && a > 0.45) {
                const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 4.5);
                glow.addColorStop(0, 'rgba(225,235,255,' + (a * 0.22) + ')');
                glow.addColorStop(1, 'rgba(225,235,255,0)');
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(sx, sy, r * 4.5, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        shooting.forEach((s) => {
            const local = t - s.delay;
            if (local < 0 || local > 1.15) return;
            const p = local < 0.18 ? easeOut(local / 0.18) : 1 - clamp((local - 0.18) / 0.97);
            const x = s.x * width + Math.cos(s.angle) * local * width * s.speed;
            const y = s.y * height + Math.sin(s.angle) * local * height * s.speed;
            const len = Math.min(width, height) * s.length * clamp(p + 0.2, 0.25, 1);
            const tx = x - Math.cos(s.angle) * len;
            const ty = y - Math.sin(s.angle) * len;

            const grad = ctx.createLinearGradient(tx, ty, x, y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.72, 'rgba(228,238,255,' + (s.alpha * p * 0.35) + ')');
            grad.addColorStop(1, 'rgba(255,255,255,' + (s.alpha * p) + ')');
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(1, Math.min(2.3, 1.15 + p));
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();
        });
    }

    function constellationPoint(star) {
        // El nacimiento queda hacia la zona derecha del cielo que la cámara termina mirando.
        const drift = clamp((currentTime - CAMERA_MOVE_START) / 20, 0, 1);
        const panX = Math.sin(easeInOut(drift) * Math.PI * 0.5) * width * 0.055;
        const panY = Math.cos(easeInOut(drift) * Math.PI * 0.5) * height * 0.025;
        return {
            x: star.x / 100 * width + panX,
            y: star.y / 100 * height + panY
        };
    }

    let currentTime = 0;

    function drawConstellation(t) {
        if (t < CONSTELLATION_START) return;

        const progress = easeOut((t - CONSTELLATION_START) / (CONSTELLATION_FULL - CONSTELLATION_START));
        const visibleCount = Math.min(AQUARIUS.length, Math.floor(progress * (AQUARIUS.length + 1)));
        const revealT = progress * AQUARIUS.length;

        // Primero se revelan los puntos, después comienzan a conectarse.
        AQUARIUS.forEach((star, index) => {
            const local = clamp(revealT - index);
            if (local <= 0) return;
            const p = easeOut(local);
            const pos = constellationPoint(star);
            const baseR = 1.8 + (index % 3) * 0.5;
            const radius = baseR + p * 1.25;
            const glowR = radius * (5 + p * 4);

            const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowR);
            glow.addColorStop(0, 'rgba(255,255,255,' + (0.80 * p) + ')');
            glow.addColorStop(0.18, 'rgba(215,228,255,' + (0.26 * p) + ')');
            glow.addColorStop(1, 'rgba(160,190,255,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, glowR, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,' + (0.28 + 0.72 * p) + ')';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // Las líneas aparecen como si la figura se estuviera revelando desde el cielo.
        const lineProgress = clamp((progress - 0.48) / 0.52);
        LINES.forEach((line, index) => {
            const local = clamp(lineProgress * LINES.length - index);
            if (local <= 0) return;
            const p = easeOut(local);
            const a = AQUARIUS.find(s => s.id === line[0]);
            const b = AQUARIUS.find(s => s.id === line[1]);
            if (!a || !b) return;
            const pa = constellationPoint(a);
            const pb = constellationPoint(b);
            const ex = pa.x + (pb.x - pa.x) * p;
            const ey = pa.y + (pb.y - pa.y) * p;

            ctx.strokeStyle = 'rgba(195,210,240,' + (0.14 + 0.30 * p) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
        });

        // Pequeña respiración final para que no parezca un dibujo estático.
        if (progress > 0.82) {
            const pulse = 0.05 + Math.sin(t * 2.5) * 0.02;
            AQUARIUS.forEach((star, i) => {
                const pos = constellationPoint(star);
                const p = clamp((progress * AQUARIUS.length) - i);
                if (p < 1) return;
                ctx.strokeStyle = 'rgba(224,235,255,' + pulse + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4 + Math.sin(t * 1.8 + i) * 0.7, 0, Math.PI * 2);
                ctx.stroke();
            });
        }
    }

    function frame(now) {
        if (!running) return;

        currentTime = musicTime(now);
        const t = prefersReducedMotion ? currentTime / 0.42 : currentTime;

        drawBackground(t);
        drawConstellation(t);

        const fade = t > FADE_TO_REAL ? clamp((t - FADE_TO_REAL) / (TOTAL - FADE_TO_REAL)) : 0;
        canvas.style.opacity = String(1 - fade);

        if (t >= TOTAL) {
            running = false;
            cancelAnimationFrame(raf);
            canvas.style.display = 'none';
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
        // El renderer antiguo queda completamente tapado durante esta intro.
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        resize();
        drawBackground(0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize, { passive: true });
    button.addEventListener('click', begin, { capture: false });
    resize();
})();
