/*
 * Cielo continuo de toda la experiencia.
 * No modifica la lógica de las 14 estrellas: solo proporciona el fondo vivo
 * que las acompaña desde «Comenzar» hasta que empieza el final.
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

    // La mirada se mueve desde el cielo general hacia Acuario y allí se asienta.
    const LOOK_START = 1.2;
    const LOOK_END = 8.6;
    const CONSTELLATION_START = 7.0;
    const CONSTELLATION_END = 14.6;

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
    const shooting = [
        { at: 3.6, x: .84, y: .18, angle: 2.55, speed: .135, length: .060, alpha: .62, life: 2.45 },
        { at: 7.9, x: .12, y: .30, angle: .48, speed: .125, length: .056, alpha: .56, life: 2.50 },
        { at: 11.9, x: .80, y: .56, angle: 2.70, speed: .118, length: .052, alpha: .58, life: 2.55 },
        { at: 16.8, x: .20, y: .16, angle: .58, speed: .105, length: .048, alpha: .50, life: 2.65 },
        { at: 21.7, x: .74, y: .72, angle: 3.78, speed: .10, length: .044, alpha: .46, life: 2.70 }
    ];

    const count = reduced ? 90 : 205;
    for (let i = 0; i < count; i++) {
        const r = rnd();
        const bright = r > .88;
        const medium = !bright && r > .54;
        bgStars.push({
            x: rnd(), y: rnd(),
            radius: bright ? .90 + rnd() * 1.10 : (medium ? .48 + rnd() * .46 : .20 + rnd() * .30),
            alpha: bright ? .48 + rnd() * .28 : (medium ? .20 + rnd() * .26 : .075 + rnd() * .17),
            twinkle: bright ? .22 + rnd() * .36 : (medium && rnd() < .38 ? .16 + rnd() * .25 : 0),
            phase: rnd() * Math.PI * 2,
            depth: .25 + rnd() * .95,
            cross: bright && rnd() < .28
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
        const p = smooth((t - LOOK_START) / (LOOK_END - LOOK_START));
        return {
            // Giro lateral evidente, pero suave; no es un paneo brusco.
            x: -width * .20 * p,
            y: height * .025 * Math.sin(p * Math.PI),
            zoom: 1 + .085 * p
        };
    }

    function drawStar(x, y, r, alpha, twinkle, phase, cross, t) {
        const pulse = twinkle ? 1 + .14 * Math.sin(t * twinkle + phase) : 1;
        const rr = Math.max(.35, r * pulse);
        if (cross && rr > 1.0) {
            const ray = rr * 2.6;
            ctx.strokeStyle = 'rgba(245,248,255,' + (alpha * .20) + ')';
            ctx.lineWidth = .5;
            ctx.beginPath();
            ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        ctx.beginPath();
        const points = rr > 1.1 ? 4 : 5;
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
        // Azul profundo neutro: negro de borde + azul de atmósfera, nunca «azul sólido».
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#030811');
        g.addColorStop(.30, '#071321');
        g.addColorStop(.56, '#0a1828');
        g.addColorStop(.82, '#050e1a');
        g.addColorStop(1, '#02070d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // Velo de polvo estelar muy tenue, como una banda irregular de profundidad.
        const band = ctx.createLinearGradient(width * .02, height * .06, width * .95, height * .86);
        band.addColorStop(0, 'rgba(125,145,175,0)');
        band.addColorStop(.38, 'rgba(143,161,188,.020)');
        band.addColorStop(.50, 'rgba(198,207,222,.040)');
        band.addColorStop(.62, 'rgba(125,145,175,.020)');
        band.addColorStop(1, 'rgba(125,145,175,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, width, height);

        const cam = camera(t);
        const floatX = Math.sin(t * .055) * width * .004;
        const floatY = Math.cos(t * .047) * height * .0025;

        for (let i = 0; i < bgStars.length; i++) {
            const s = bgStars[i];
            let x = s.x * width + cam.x * s.depth + floatX * s.depth;
            let y = s.y * height + cam.y * s.depth + floatY * s.depth;
            x = ((x % width) + width) % width;
            y = ((y % height) + height) % height;
            const pulse = s.twinkle ? 1 + .18 * Math.sin(t * s.twinkle + s.phase) : 1;
            drawStar(x, y, s.radius, clamp(s.alpha * pulse, .018, .92), s.twinkle, s.phase, s.cross, t);
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
            ctx.strokeStyle = '#f4f7fb';
            ctx.lineWidth = .65 + .22 * fade;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, .85 + .45 * fade, 0, Math.PI * 2);
            ctx.fill();
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
            const radius = 1.25 + ((i * 5) % 4) * .22 + e * .75;
            const alpha = .36 + e * (.43 + ((i * 3) % 3) * .05);
            drawStar(x, y, radius, alpha, .18 + (i % 4) * .055, i * .81, i % 5 === 0, t);
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
        // El cielo de esta capa es el fondo principal hasta el final.
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        resize();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }

    // El final tiene su propio cielo vivo; evitamos el salto a las capas antiguas.
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
