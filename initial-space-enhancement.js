/*
 * Intro cinematográfica — cielo nocturno vivo -> giro de mirada -> Acuario.
 * Las mismas 14 estrellas pasan a la experiencia interactiva sin cambiar su geometría.
 */
(function () {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-sky';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed','inset:0','width:100%','height:100%',
        'z-index:20','pointer-events:none','display:none','opacity:1','will-change:opacity'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const button = document.getElementById('intro-begin');
    const baseCanvas = document.getElementById('starfield');
    const nebula = document.getElementById('nebula');
    if (!button || !baseCanvas) { canvas.remove(); return; }

    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    // La intro ahora termina pronto: primero cielo vivo, luego giro de mirada y Acuario.
    const ACTUAL_END = 19.0;
    const RELEASE_TIME = 19.5;
    const LOOK_START = 3.8;
    const LOOK_END = 10.8;
    const CONSTELLATION_START = 9.8;
    const CONSTELLATION_END = 16.9;

    const AQUARIUS = [
        { id: 1, x: 16, y: 54 }, { id: 2, x: 34, y: 42 },
        { id: 3, x: 48, y: 26 }, { id: 4, x: 58, y: 17 },
        { id: 5, x: 58, y: 31 }, { id: 6, x: 65, y: 26 },
        { id: 7, x: 71, y: 29 }, { id: 8, x: 52, y: 53 },
        { id: 9, x: 57, y: 63 }, { id: 10, x: 72, y: 74 },
        { id: 11, x: 76, y: 48 }, { id: 12, x: 70, y: 83 },
        { id: 13, x: 82, y: 89 }, { id: 14, x: 87, y: 42 }
    ];

    const bgStars = [];
    let seed = 81211;
    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    // Menos objetos costosos por frame. La variación de tamaño/brillo sigue siendo amplia.
    const starCount = reduced ? 105 : 190;
    for (let i = 0; i < starCount; i++) {
        const roll = rnd();
        const bright = roll > 0.86;
        const medium = !bright && roll > 0.55;
        bgStars.push({
            x: rnd(), y: rnd(),
            r: bright ? 1.0 + rnd() * 1.15 : (medium ? 0.55 + rnd() * 0.52 : 0.25 + rnd() * 0.35),
            a: bright ? 0.48 + rnd() * 0.30 : (medium ? 0.22 + rnd() * 0.25 : 0.08 + rnd() * 0.20),
            twinkle: bright ? 0.28 + rnd() * 0.50 : (medium && rnd() < 0.48 ? 0.18 + rnd() * 0.32 : 0),
            phase: rnd() * Math.PI * 2,
            depth: 0.22 + rnd() * 1.0,
            cross: bright && rnd() < 0.40,
            drift: (rnd() - 0.5) * 0.55
        });
    }

    // Fugaces limpias y ligeras: pocas, delgadas y sin gradientes creados en cada frame.
    const shooting = [
        { at: 4.9,  x: 0.86, y: 0.18, angle: 2.56, speed: 0.23, length: 0.075, alpha: 0.72 },
        { at: 8.7,  x: 0.14, y: 0.30, angle: 0.46, speed: 0.21, length: 0.070, alpha: 0.64 },
        { at: 12.7, x: 0.80, y: 0.54, angle: 2.70, speed: 0.20, length: 0.067, alpha: 0.66 },
        { at: 16.2, x: 0.22, y: 0.16, angle: 0.58, speed: 0.18, length: 0.060, alpha: 0.56 }
    ];

    let width = 1, height = 1, dpr = 1, startedAt = 0, running = false, raf = 0;

    function resize() {
        width = window.innerWidth; height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.35);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
    function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
    function smoother(v) { v = clamp(v); return v * v * v * (v * (v * 6 - 15) + 10); }

    function cinematicTime(now) {
        const M = window.ExperienceMusic;
        const raw = M && typeof M.now === 'function' ? M.now() : (now - startedAt) / 1000;
        if (!Number.isFinite(raw) || raw < 0) return (now - startedAt) / 1000;
        return Math.min(ACTUAL_END, raw * 1.0);
    }

    // El movimiento es evidente: la cámara desplaza el campo y Acuario entra desde otra zona.
    function camera(t) {
        const p = smoother((t - LOOK_START) / (LOOK_END - LOOK_START));
        const ease = smooth(p);
        return {
            x: -width * 0.17 * ease,
            y: height * 0.022 * Math.sin(ease * Math.PI),
            zoom: 1 + 0.055 * ease
        };
    }

    function starPath(x, y, r, points = 4) {
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const rr = (i % 2 === 0) ? r : r * 0.34;
            const a = -Math.PI / 2 + i * Math.PI / points;
            const px = x + Math.cos(a) * rr;
            const py = y + Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    function drawStar(x, y, radius, alpha, twinkle, phase, cross, t, emphasis = 1) {
        const pulse = twinkle ? (0.84 + 0.16 * Math.sin(t * twinkle + phase)) : 1;
        const a = clamp(alpha * pulse, 0.02, 1);
        const r = Math.max(0.4, radius * emphasis);

        if (cross && r > 1.05) {
            const ray = r * 2.8;
            ctx.strokeStyle = 'rgba(245,248,255,' + (a * 0.24) + ')';
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        starPath(x, y, r, r > 1.2 ? 4 : 5);
        ctx.fill();
    }

    function drawSky(t) {
        // El mismo lenguaje de fondo que el resto del proyecto: azul noche visible, sin negro dominante.
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#08172a');
        g.addColorStop(0.42, '#0c2038');
        g.addColorStop(0.72, '#09192d');
        g.addColorStop(1, '#061322');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const cam = camera(t);
        const floatX = Math.sin(t * 0.07) * width * 0.003;
        const floatY = Math.cos(t * 0.05) * height * 0.002;

        for (let i = 0; i < bgStars.length; i++) {
            const s = bgStars[i];
            let x = s.x * width + cam.x * s.depth + floatX * s.depth + s.drift * t * 0.08;
            let y = s.y * height + cam.y * s.depth + floatY * s.depth;
            x = ((x % width) + width) % width;
            y = ((y % height) + height) % height;
            drawStar(x, y, s.r, s.a, s.twinkle, s.phase, s.cross, t, 1);
        }

        for (let i = 0; i < shooting.length; i++) {
            const s = shooting[i];
            const local = t - s.at;
            if (local < 0 || local > 1.45) continue;
            const p = smoother(local / 1.45);
            const fade = local < 0.22 ? smoother(local / 0.22) : 1 - smoother((local - 0.22) / 1.23);
            const distance = p * width * s.speed;
            const x = s.x * width + Math.cos(s.angle) * distance;
            const y = s.y * height + Math.sin(s.angle) * distance;
            const len = Math.min(width, height) * s.length;
            const tx = x - Math.cos(s.angle) * len;
            const ty = y - Math.sin(s.angle) * len;

            ctx.save();
            ctx.globalAlpha = s.alpha * fade;
            ctx.strokeStyle = '#eaf2ff';
            ctx.lineWidth = 0.65 + fade * 0.30;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(x, y, 1.0 + fade * 0.55, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function drawAquarius(t) {
        if (t < CONSTELLATION_START) return;
        const p = smooth((t - CONSTELLATION_START) / (CONSTELLATION_END - CONSTELLATION_START));
        const reveal = smoother(p) * AQUARIUS.length;
        const cam = camera(t);

        for (let i = 0; i < AQUARIUS.length; i++) {
            const star = AQUARIUS[i];
            const local = clamp(reveal - i);
            if (local <= 0) continue;
            const e = smoother(local);
            const x = star.x / 100 * width + cam.x;
            const y = star.y / 100 * height + cam.y;
            // Variación visual por estrella sin tocar sus coordenadas.
            const size = 1.35 + (0.12 * ((i * 7) % 5)) + e * 0.95;
            const alpha = 0.42 + e * (0.42 + 0.07 * ((i * 3) % 4));
            drawStar(x, y, size, alpha, 0.22 + (i % 5) * 0.08, i * 0.73, i % 4 === 0, t, 1);
        }
    }

    function render(now) {
        if (!running) return;
        const raw = window.ExperienceMusic && typeof window.ExperienceMusic.now === 'function'
            ? window.ExperienceMusic.now() : (now - startedAt) / 1000;
        const t = cinematicTime(now);
        drawSky(t); drawAquarius(t);
        if (Number.isFinite(raw) && raw >= RELEASE_TIME) {
            running = false;
            cancelAnimationFrame(raf);
            canvas.style.display = 'none';
            canvas.style.opacity = '1';
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            return;
        }
        raf = requestAnimationFrame(render);
    }

    function begin() {
        if (running) return;
        running = true;
        startedAt = performance.now();
        canvas.style.display = 'block';
        canvas.style.opacity = '1';
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        resize(); drawSky(0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    button.addEventListener('click', begin, { capture: false });
    resize();
})();
