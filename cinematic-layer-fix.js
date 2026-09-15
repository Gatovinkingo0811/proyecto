/* Capa visual muy ligera para la intro. Mantiene movimiento y profundidad con poco trabajo por frame. */
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

    let w = 1, h = 1;
    let started = false;
    let startTime = 0;
    let raf = 0;
    let lastFrame = 0;
    let stars = [];
    let staticStars = [];
    let seed = 271828;
    let cameraX = 0;
    let cameraY = 0;
    let zoom = 1;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }

    function resize() {
        w = innerWidth;
        h = innerHeight;
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        backdrop.width = w;
        backdrop.height = h;
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        buildStaticBackdrop();
        buildStars();
    }

    function buildStars() {
        stars = [];
        staticStars = [];
        seed = 271828;
        const count = w < 768 ? 65 : 100;
        for (let i = 0; i < count; i++) {
            const q = rnd();
            const star = {
                x: rnd(), y: rnd(),
                r: q > .93 ? 1.05 + rnd() * 1.1 : q > .60 ? .55 + rnd() * .45 : .25 + rnd() * .22,
                a: q > .93 ? .60 + rnd() * .20 : q > .60 ? .24 + rnd() * .18 : .09 + rnd() * .10,
                tw: q > .88 ? .16 + rnd() * .30 : 0,
                phase: rnd() * Math.PI * 2,
                depth: .3 + rnd() * .70,
                cross: q > .975
            };
            if (star.tw) stars.push(star); else staticStars.push(star);
        }
    }

    function buildStaticBackdrop() {
        const g = bctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#040913');
        g.addColorStop(.28, '#071321');
        g.addColorStop(.52, '#0a1725');
        g.addColorStop(.74, '#06101b');
        g.addColorStop(1, '#02060c');
        bctx.fillStyle = g;
        bctx.fillRect(0, 0, w, h);

        const haze = [
            [.17, .20, .42, 'rgba(48,88,130,.06)'],
            [.74, .35, .34, 'rgba(72,76,116,.04)'],
            [.50, .82, .52, 'rgba(30,73,108,.04)']
        ];
        for (const q of haze) {
            const rg = bctx.createRadialGradient(q[0] * w, q[1] * h, 0, q[0] * w, q[1] * h, Math.min(w, h) * q[2]);
            rg.addColorStop(0, q[3]);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            bctx.fillStyle = rg;
            bctx.fillRect(0, 0, w, h);
        }

        bctx.save();
        bctx.translate(w * .03, h * .02);
        bctx.rotate(-0.25);
        const milk = bctx.createRadialGradient(w * .48, h * .52, 0, w * .48, h * .52, w * .67);
        milk.addColorStop(0, 'rgba(226,235,246,.058)');
        milk.addColorStop(.24, 'rgba(194,210,231,.042)');
        milk.addColorStop(.48, 'rgba(139,163,192,.026)');
        milk.addColorStop(.74, 'rgba(92,120,154,.012)');
        milk.addColorStop(1, 'rgba(0,0,0,0)');
        bctx.fillStyle = milk;
        bctx.fillRect(-w * .20, -h * .06, w * 1.40, h * 1.12);
        bctx.restore();

        seed = 919191;
        const dustCount = w < 768 ? 45 : 80;
        for (let i = 0; i < dustCount; i++) {
            const x = rnd() * w;
            const band = .79 - (x / w) * .59;
            const y = (band + (rnd() - .5) * (.035 + rnd() * .08)) * h;
            const s = .25 + rnd() * .40;
            bctx.fillStyle = 'rgba(224,233,245,' + (0.012 + rnd() * 0.016) + ')';
            bctx.fillRect(x | 0, y | 0, s, s);
        }

        for (let i = 0; i < staticStars.length; i++) {
            const s = staticStars[i];
            const x = s.x * w;
            const y = s.y * h;
            bctx.fillStyle = 'rgba(255,255,255,' + s.a + ')';
            const r = Math.max(.5, s.r);
            bctx.fillRect(Math.round(x - r * .5), Math.round(y - r * .5), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)));
        }
    }

    function drawTwinkleStar(s, t) {
        let x = s.x * w + cameraX * s.depth;
        let y = s.y * h + cameraY * s.depth;
        x = x < 0 ? x + w : (x >= w ? x - w : x);
        y = y < 0 ? y + h : (y >= h ? y - h : y);
        const pulse = .88 + .12 * Math.sin(t * s.tw + s.phase);
        const r = Math.max(.35, s.r * zoom * pulse);
        const a = clamp(s.a * pulse, .035, .92);
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.fillRect(Math.round(x - r * .5), Math.round(y - r * .5), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)));
    }

    function drawMeteor(t, slot) {
        const cycle = slot === 0 ? 9.2 : 12.4;
        const start = slot === 0 ? 1.0 : 4.7;
        const local = (t - start) % cycle;
        if (local <= 0 || local >= 1.25) return;
        const p = ease(local / 1.25);
        const fromRight = slot === 0;
        const x = (fromRight ? .84 : .17) * w + (fromRight ? -1 : 1) * p * w * .18;
        const y = (fromRight ? .16 : .22) * h + p * h * .13;
        const tx = x + (fromRight ? .06 : -.06) * w;
        const ty = y - .04 * h;
        ctx.globalAlpha = Math.sin((local / 1.25) * Math.PI) * .40;
        ctx.strokeStyle = 'rgba(245,248,252,.72)';
        ctx.lineWidth = .6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
        ctx.globalAlpha = 1;
    }

    function frame(now) {
        if (!started) return;
        if (lastFrame && now - lastFrame < 33) {
            raf = requestAnimationFrame(frame);
            return;
        }
        lastFrame = now;
        const t = (now - startTime) / 1000;
        const settle = 1 - Math.exp(-t / 7.5);
        cameraX = -w * .07 * settle + Math.sin(t * .10) * w * .007;
        cameraY = Math.sin(t * .06) * h * .008;
        zoom = 1 + .020 * settle;
        ctx.drawImage(backdrop, 0, 0);
        for (let i = 0; i < stars.length; i++) drawTwinkleStar(stars[i], t);
        drawMeteor(t, 0);
        drawMeteor(t, 1);
        raf = requestAnimationFrame(frame);
    }

    function begin() {
        if (started) return;
        started = true;
        startTime = performance.now();
        lastFrame = 0;
        if (typeof window.__stopInitialSpaceEnhancement === 'function') window.__stopInitialSpaceEnhancement();
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

    window.__stopCinematicLayerFix = function () {
        started = false;
        cancelAnimationFrame(raf);
        raf = 0;
    };

    button.addEventListener('click', begin);
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();