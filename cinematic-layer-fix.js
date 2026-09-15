/* Capa visual ligera para la intro. El cielo sigue vivo sin sobrecargar el navegador. */
(function () {
    'use strict';

    const button = document.getElementById('intro-begin');
    if (!button) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-layer-fix';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed','inset:0','width:100%','height:100%',
        'z-index:2','pointer-events:none','display:none','opacity:1',
        'transform:translateZ(0)'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const backdrop = document.createElement('canvas');
    const bctx = backdrop.getContext('2d', { alpha: false });
    if (!bctx) return;

    let w = 1, h = 1, dpr = 1;
    let started = false;
    let startTime = 0;
    let raf = 0;
    let lastFrame = 0;
    let stars = [];
    let seed = 271828;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }

    function resize() {
        w = innerWidth;
        h = innerHeight;
        dpr = Math.min(devicePixelRatio || 1, 1.2);

        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        backdrop.width = Math.floor(w * dpr);
        backdrop.height = Math.floor(h * dpr);
        bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        buildStaticBackdrop();
        buildStars();
    }

    function buildStars() {
        stars = [];
        seed = 271828;
        // Mucha profundidad visual con menos objetos reales que dibujar por frame.
        const count = w < 768 ? 125 : 190;
        for (let i = 0; i < count; i++) {
            const q = rnd();
            stars.push({
                x: rnd(),
                y: rnd(),
                r: q > .94 ? 1.15 + rnd() * 1.35 : q > .63 ? .55 + rnd() * .55 : .22 + rnd() * .28,
                a: q > .94 ? .60 + rnd() * .24 : q > .63 ? .22 + rnd() * .23 : .08 + rnd() * .13,
                tw: q > .80 ? .20 + rnd() * .45 : 0,
                phase: rnd() * Math.PI * 2,
                depth: .25 + rnd() * .95,
                cross: q > .95
            });
        }
    }

    function buildStaticBackdrop() {
        const g = bctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#040913');
        g.addColorStop(.28, '#071321');
        g.addColorStop(.52, '#0b1827');
        g.addColorStop(.75, '#07111e');
        g.addColorStop(1, '#03070d');
        bctx.fillStyle = g;
        bctx.fillRect(0, 0, w, h);

        // Atmósfera estática: se calcula una sola vez, no cada frame.
        const haze = [
            [.16, .20, .43, 'rgba(48,88,130,.065)'],
            [.74, .34, .34, 'rgba(72,75,118,.045)'],
            [.49, .82, .54, 'rgba(30,73,108,.045)']
        ];
        for (const q of haze) {
            const rg = bctx.createRadialGradient(
                q[0] * w, q[1] * h, 0,
                q[0] * w, q[1] * h, Math.min(w, h) * q[2]
            );
            rg.addColorStop(0, q[3]);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            bctx.fillStyle = rg;
            bctx.fillRect(0, 0, w, h);
        }

        // Vía Láctea estática y suave. Solo la rotación/mirada se mueve en la capa dinámica.
        bctx.save();
        bctx.translate(w * .02, h * .02);
        bctx.rotate(-0.26);
        const milk = bctx.createRadialGradient(
            w * .49, h * .52, 0,
            w * .49, h * .52, w * .68
        );
        milk.addColorStop(0, 'rgba(224,234,246,.060)');
        milk.addColorStop(.22, 'rgba(195,211,231,.044)');
        milk.addColorStop(.46, 'rgba(140,163,192,.028)');
        milk.addColorStop(.72, 'rgba(96,123,157,.014)');
        milk.addColorStop(1, 'rgba(0,0,0,0)');
        bctx.fillStyle = milk;
        bctx.fillRect(-w * .20, -h * .06, w * 1.40, h * 1.12);
        bctx.restore();

        // Textura mínima, fija: aporta polvo sin 1.000+ operaciones por frame.
        seed = 919191;
        const dustCount = w < 768 ? 150 : 260;
        for (let i = 0; i < dustCount; i++) {
            const x = rnd() * w;
            const band = .78 - (x / w) * .58;
            const y = (band + (rnd() - .5) * (.035 + rnd() * .085)) * h;
            const s = .25 + rnd() * .55;
            bctx.fillStyle = 'rgba(224,233,245,' + (0.012 + rnd() * 0.025) + ')';
            bctx.fillRect(Math.floor(x), Math.floor(y), s, s);
        }
    }

    function drawStar(s, t, cameraX, cameraY, zoom) {
        let x = s.x * w + cameraX * s.depth;
        let y = s.y * h + cameraY * s.depth;
        x = ((x % w) + w) % w;
        y = ((y % h) + h) % h;

        const pulse = s.tw ? 0.86 + 0.14 * Math.sin(t * s.tw + s.phase) : 1;
        const r = Math.max(.35, s.r * zoom * pulse);
        const a = clamp(s.a * pulse, .035, .96);

        if (s.cross && r > 1.25) {
            const ray = r * 3.0;
            ctx.strokeStyle = 'rgba(245,248,252,' + (a * .25) + ')';
            ctx.lineWidth = .45;
            ctx.beginPath();
            ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.fillRect(Math.round(x - r * .5), Math.round(y - r * .5), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)));
    }

    function drawMeteor(t, slot) {
        const cycle = slot === 0 ? 8.5 : 11.5;
        const start = slot === 0 ? 1.2 : 4.5;
        const local = (t - start) % cycle;
        if (local <= 0 || local >= 1.35) return;

        const p = ease(local / 1.35);
        const fromRight = slot === 0;
        const x = (fromRight ? .84 : .18) * w + (fromRight ? -1 : 1) * p * w * .20;
        const y = (fromRight ? .16 : .22) * h + p * h * .14;
        const tx = x + (fromRight ? .065 : -.065) * w;
        const ty = y - .045 * h;

        ctx.save();
        ctx.globalAlpha = Math.sin((local / 1.35) * Math.PI) * .52;
        const mg = ctx.createLinearGradient(tx, ty, x, y);
        mg.addColorStop(0, 'rgba(255,255,255,0)');
        mg.addColorStop(.72, 'rgba(239,244,250,.40)');
        mg.addColorStop(1, 'rgba(255,255,255,.88)');
        ctx.strokeStyle = mg;
        ctx.lineWidth = .6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
    }

    function frame(now) {
        if (!started) return;

        // Limita el trabajo a ~45 fps; el movimiento sigue siendo suave, pero el CPU respira.
        if (lastFrame && now - lastFrame < 22) {
            raf = requestAnimationFrame(frame);
            return;
        }
        lastFrame = now;

        const t = (now - startTime) / 1000;
        const settle = 1 - Math.exp(-t / 7.5);
        const cameraX = -w * .075 * settle + Math.sin(t * .11) * w * .008;
        const cameraY = Math.sin(t * .065) * h * .009;
        const zoom = 1 + .022 * settle + Math.sin(t * .025) * .002;

        ctx.drawImage(backdrop, 0, 0, w, h);

        for (let i = 0; i < stars.length; i++) {
            drawStar(stars[i], t, cameraX, cameraY, zoom);
        }

        drawMeteor(t, 0);
        drawMeteor(t, 1);

        raf = requestAnimationFrame(frame);
    }

    function begin() {
        if (started) return;
        started = true;
        startTime = performance.now();
        lastFrame = 0;
        resize();
        canvas.style.display = 'block';

        const old = document.getElementById('cinematic-sky');
        if (old) old.style.visibility = 'hidden';
        const base = document.getElementById('starfield');
        if (base) base.style.visibility = 'hidden';
        const nebula = document.getElementById('nebula');
        if (nebula) nebula.style.visibility = 'hidden';

        cancelAnimationFrame(raf);
        frame(startTime);
    }

    button.addEventListener('click', begin);
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();
