/*
 * Cielo continuo de toda la experiencia.
 * Solo cambia la capa visual: no toca la lógica ni las posiciones de las 14 estrellas.
 * Inspirado en cielos de observación real: fondo oscuro, banda de Vía Láctea,
 * estrellas de distintas magnitudes, polvo tenue y movimiento de cámara desde el primer frame.
 */
(function () {
    'use strict';

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-sky';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed', 'inset:0', 'width:100%', 'height:100%',
        'z-index:1', 'pointer-events:none', 'display:none', 'opacity:1',
        'will-change:opacity', 'transform:translateZ(0)'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const button = document.getElementById('intro-begin');
    const baseCanvas = document.getElementById('starfield');
    const nebula = document.getElementById('nebula');
    if (!button || !baseCanvas) { canvas.remove(); return; }

    const reduced = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    const CONSTELLATION_START = 4.8;
    const CONSTELLATION_END = 12.8;

    const AQUARIUS = [
        { id: 1, x: 16, y: 54 }, { id: 2, x: 34, y: 42 },
        { id: 3, x: 48, y: 26 }, { id: 4, x: 58, y: 17 },
        { id: 5, x: 58, y: 31 }, { id: 6, x: 65, y: 26 },
        { id: 7, x: 71, y: 29 }, { id: 8, x: 52, y: 53 },
        { id: 9, x: 57, y: 63 }, { id: 10, x: 72, y: 74 },
        { id: 11, x: 76, y: 48 }, { id: 12, x: 70, y: 83 },
        { id: 13, x: 82, y: 89 }, { id: 14, x: 87, y: 42 }
    ];

    let width = 1;
    let height = 1;
    let dpr = 1;
    let startedAt = 0;
    let running = false;
    let raf = 0;
    let seed = 81211;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const bgStars = [];
    const dust = [];
    const shooting = [
        { at: 1.5, x: .86, y: .17, angle: 2.55, speed: .105, length: .075, alpha: .62, life: 2.6 },
        { at: 6.2, x: .12, y: .28, angle: .50, speed: .095, length: .070, alpha: .54, life: 2.7 },
        { at: 10.8, x: .80, y: .54, angle: 2.72, speed: .090, length: .064, alpha: .58, life: 2.8 },
        { at: 16.0, x: .22, y: .14, angle: .56, speed: .080, length: .058, alpha: .48, life: 2.9 },
        { at: 21.0, x: .74, y: .74, angle: 3.76, speed: .075, length: .055, alpha: .44, life: 3.0 }
    ];

    const count = reduced ? 150 : 430;
    for (let i = 0; i < count; i++) {
        const r = rnd();
        const bright = r > .945;
        const medium = !bright && r > .67;
        const hueRoll = rnd();
        bgStars.push({
            x: rnd(), y: rnd(),
            radius: bright ? 1.00 + rnd() * 1.30 : (medium ? .52 + rnd() * .62 : .16 + rnd() * .34),
            alpha: bright ? .54 + rnd() * .28 : (medium ? .22 + rnd() * .25 : .065 + rnd() * .15),
            twinkle: bright ? .25 + rnd() * .55 : (medium && rnd() < .44 ? .12 + rnd() * .36 : 0),
            phase: rnd() * Math.PI * 2,
            depth: .18 + rnd() * 1.12,
            cross: bright && rnd() < .52,
            tone: hueRoll < .09 ? 'warm' : (hueRoll > .91 ? 'cool' : 'white')
        });
    }

    const dustCount = reduced ? 550 : 1700;
    for (let i = 0; i < dustCount; i++) {
        const u = rnd();
        const center = .82 - u * .60;
        const spread = .035 + u * .09;
        dust.push({
            x: u + (rnd() - .5) * .05,
            y: center + (rnd() - .5) * spread,
            size: .18 + rnd() * .54,
            alpha: .012 + rnd() * .042,
            drift: (rnd() - .5) * .0006,
            phase: rnd() * Math.PI * 2
        });
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.35);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
    function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
    function smoother(v) {
        v = clamp(v);
        return v * v * v * (v * (v * 6 - 15) + 10);
    }

    function timeNow(now) {
        const M = window.ExperienceMusic;
        const audio = M && typeof M.now === 'function' ? M.now() : -1;
        if (Number.isFinite(audio) && audio >= 0) return audio;
        return (now - startedAt) / 1000;
    }

    function camera(t) {
        const settle = 1 - Math.exp(-t / 8.5);
        return {
            x: -width * .115 * settle + Math.sin(t * .10) * width * .010,
            y: Math.sin(t * .065) * height * .012 + Math.cos(t * .030) * height * .004,
            zoom: 1 + .028 * settle + Math.sin(t * .028) * .004
        };
    }

    function drawStar(x, y, r, alpha, twinkle, phase, cross, tone, t) {
        const pulse = twinkle ? 1 + .13 * Math.sin(t * twinkle + phase) : 1;
        const rr = Math.max(.35, r * pulse);
        if (cross && rr > 1.10) {
            const ray = rr * 3.0;
            const rayAlpha = alpha * (.18 + .06 * Math.sin(t * .55 + phase));
            ctx.strokeStyle = tone === 'cool' ? 'rgba(197,220,255,' + rayAlpha + ')' : 'rgba(250,248,241,' + rayAlpha + ')';
            ctx.lineWidth = .45;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
            ctx.stroke();
        }
        const color = tone === 'warm' ? '255,242,216' : (tone === 'cool' ? '224,239,255' : '255,255,255');
        ctx.fillStyle = 'rgba(' + color + ',' + alpha + ')';
        ctx.beginPath();
        const points = rr > 1.25 ? 4 : 5;
        for (let i = 0; i < points * 2; i++) {
            const rad = i % 2 === 0 ? rr : rr * .30;
            const a = -Math.PI / 2 + i * Math.PI / points;
            const px = x + Math.cos(a) * rad;
            const py = y + Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    function drawBackground(t) {
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#020711');
        g.addColorStop(.25, '#06101e');
        g.addColorStop(.48, '#09182a');
        g.addColorStop(.72, '#071321');
        g.addColorStop(1, '#02060d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const haze = [
            { x: .16, y: .18, r: .43, c: 'rgba(42,86,132,.075)' },
            { x: .76, y: .32, r: .36, c: 'rgba(48,62,111,.055)' },
            { x: .52, y: .80, r: .54, c: 'rgba(20,72,112,.050)' }
        ];
        for (let i = 0; i < haze.length; i++) {
            const q = haze[i];
            const rg = ctx.createRadialGradient(q.x * width, q.y * height, 0, q.x * width, q.y * height, Math.min(width, height) * q.r);
            rg.addColorStop(0, q.c);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, width, height);
        }

        ctx.save();
        ctx.translate(width * .03, height * .03);
        ctx.rotate(-0.21);
        const mw = ctx.createRadialGradient(width * .50, height * .51, 0, width * .50, height * .51, width * .62);
        mw.addColorStop(0, 'rgba(222,231,244,.065)');
        mw.addColorStop(.28, 'rgba(174,194,223,.044)');
        mw.addColorStop(.60, 'rgba(123,151,188,.024)');
        mw.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mw;
        ctx.globalAlpha = .74 + Math.sin(t * .035) * .04;
        ctx.fillRect(-width * .18, -height * .05, width * 1.36, height * 1.12);
        ctx.restore();

        const cam = camera(t);
        for (let i = 0; i < dust.length; i++) {
            const d = dust[i];
            let x = d.x * width + cam.x * .17 + t * d.drift * width;
            let y = d.y * height + cam.y * .10;
            x = ((x % width) + width) % width;
            y = ((y % height) + height) % height;
            const alpha = d.alpha * (.82 + .18 * Math.sin(t * .16 + d.phase));
            ctx.fillStyle = 'rgba(226,235,247,' + alpha + ')';
            ctx.fillRect(x, y, d.size, d.size);
        }

        for (let i = 0; i < bgStars.length; i++) {
            const s = bgStars[i];
            let x = s.x * width + cam.x * s.depth;
            let y = s.y * height + cam.y * s.depth;
            x = ((x % width) + width) % width;
            y = ((y % height) + height) % height;
            const pulse = s.twinkle ? .82 + .18 * Math.sin(t * s.twinkle + s.phase) : 1;
            drawStar(x, y, s.radius * cam.zoom, clamp(s.alpha * pulse, .018, .96), s.twinkle, s.phase, s.cross, s.tone, t);
        }

        for (let i = 0; i < shooting.length; i++) {
            const s = shooting[i];
            const local = t - s.at;
            if (local <= 0 || local >= s.life) continue;
            const u = smoother(local / s.life);
            const fade = Math.sin((local / s.life) * Math.PI);
            const travel = u * Math.min(width, height) * s.speed * 2.1;
            const x = s.x * width + Math.cos(s.angle) * travel;
            const y = s.y * height + Math.sin(s.angle) * travel;
            const len = Math.min(width, height) * s.length;
            const tx = x - Math.cos(s.angle) * len;
            const ty = y - Math.sin(s.angle) * len;
            ctx.save();
            ctx.globalAlpha = s.alpha * fade;
            const mg = ctx.createLinearGradient(tx, ty, x, y);
            mg.addColorStop(0, 'rgba(240,244,250,0)');
            mg.addColorStop(.70, 'rgba(240,244,250,.42)');
            mg.addColorStop(1, 'rgba(255,255,255,.95)');
            ctx.strokeStyle = mg;
            ctx.lineWidth = .65 + .18 * fade;
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(x, y, .75 + .45 * fade, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    function drawAquarius(t) {
        if (t < CONSTELLATION_START) return;
        const p = smooth((t - CONSTELLATION_START) / (CONSTELLATION_END - CONSTELLATION_START));
        const reveal = smoother(p) * AQUARIUS.length;
        const cam = camera(t);
        for (let i = 0; i < AQUARIUS.length; i++) {
            const s = AQUARIUS[i];
            const local = clamp(reveal - i);
            if (local <= 0) continue;
            const e = smoother(local);
            const x = s.x / 100 * width + cam.x;
            const y = s.y / 100 * height + cam.y;
            const radius = 1.30 + ((i * 5) % 4) * .24 + e * .72;
            const alpha = .46 + e * (.39 + ((i * 3) % 3) * .045);
            drawStar(x, y, radius, alpha, .18 + (i % 4) * .055, i * .81, i % 5 === 0, 'white', t);
        }
    }

    function render(now) {
        if (!running) return;
        const t = timeNow(now);
        drawBackground(t);
        drawAquarius(t);
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
        resize();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }

    window.__stopInitialSpaceEnhancement = function () {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
    };

    const observer = new MutationObserver(function () {
        if (!document.body.classList.contains('constellation-complete')) return;
        canvas.style.transition = 'opacity .9s ease';
        canvas.style.opacity = '0';
        setTimeout(function () {
            if (!document.body.classList.contains('constellation-complete')) return;
            canvas.style.display = 'none';
            running = false;
            cancelAnimationFrame(raf);
        }, 950);
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('resize', resize, { passive: true });
    button.addEventListener('click', begin, { capture: false });
    resize();
})();