/* Capa visual de respaldo para la intro. No depende de la música ni modifica la lógica de las 14 estrellas. */
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

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 1, h = 1, dpr = 1, started = false, startTime = 0, raf = 0;
    let seed = 271828;
    const stars = [];
    const dust = [];

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function ease(v) { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); }

    function resize() {
        w = innerWidth;
        h = innerHeight;
        dpr = Math.min(devicePixelRatio || 1, 1.35);
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function build() {
        stars.length = 0;
        dust.length = 0;
        seed = 271828;
        const count = w < 768 ? 230 : 420;
        for (let i = 0; i < count; i++) {
            const q = rnd();
            stars.push({
                x: rnd(), y: rnd(),
                r: q > .94 ? 1.0 + rnd() * 1.7 : q > .63 ? .48 + rnd() * .65 : .16 + rnd() * .34,
                a: q > .94 ? .58 + rnd() * .26 : q > .63 ? .20 + rnd() * .25 : .07 + rnd() * .15,
                tw: q > .82 ? .55 + rnd() * 1.0 : q > .54 ? .18 + rnd() * .52 : 0,
                phase: rnd() * Math.PI * 2,
                depth: .2 + rnd() * 1.1,
                cross: q > .955
            });
        }
        const dustCount = w < 768 ? 500 : 1100;
        for (let i = 0; i < dustCount; i++) {
            const x = rnd();
            const center = .18 + x * .56;
            dust.push({
                x: x + (rnd() - .5) * .04,
                y: center + (rnd() - .5) * (.04 + rnd() * .10),
                r: .15 + rnd() * .48,
                a: .008 + rnd() * .028,
                drift: (rnd() - .5) * .00025,
                phase: rnd() * 6.283
            });
        }
    }

    function drawStar(x, y, r, a, phase, tw, cross, t) {
        const pulse = tw ? 1 + .16 * Math.sin(t * tw + phase) : 1;
        const rr = Math.max(.35, r * pulse);
        if (cross && rr > 1.15) {
            const ray = rr * 3.5;
            ctx.strokeStyle = 'rgba(246,248,252,' + (a * .28) + ')';
            ctx.lineWidth = .5;
            ctx.beginPath();
            ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath();
        const points = rr > 1.25 ? 4 : 5;
        for (let i = 0; i < points * 2; i++) {
            const rad = i % 2 === 0 ? rr : rr * .26;
            const ang = -Math.PI / 2 + i * Math.PI / points;
            const px = x + Math.cos(ang) * rad;
            const py = y + Math.sin(ang) * rad;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }

    function frame(now) {
        if (!started) return;
        const t = (now - startTime) / 1000;

        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#050a12');
        g.addColorStop(.24, '#091321');
        g.addColorStop(.48, '#101b2a');
        g.addColorStop(.72, '#081420');
        g.addColorStop(1, '#03070d');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        /* Vía Láctea: varias capas difusas para evitar el aspecto de bloque azul. */
        ctx.save();
        ctx.translate(w * .02, h * .03);
        ctx.rotate(-0.28 + Math.sin(t * .035) * .008);
        const milk = ctx.createRadialGradient(w * .48, h * .54, 0, w * .48, h * .54, w * .68);
        milk.addColorStop(0, 'rgba(226,235,246,.070)');
        milk.addColorStop(.20, 'rgba(196,210,229,.050)');
        milk.addColorStop(.42, 'rgba(144,166,195,.034)');
        milk.addColorStop(.68, 'rgba(95,122,155,.018)');
        milk.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = milk;
        ctx.fillRect(-w * .20, -h * .06, w * 1.40, h * 1.12);
        ctx.restore();

        const haze = [
            [.18, .22, .45, 'rgba(43,80,120,.060)'],
            [.72, .42, .35, 'rgba(72,72,116,.040)'],
            [.48, .84, .50, 'rgba(28,67,104,.045)']
        ];
        for (const q of haze) {
            const rg = ctx.createRadialGradient(q[0] * w, q[1] * h, 0, q[0] * w, q[1] * h, Math.min(w,h) * q[2]);
            rg.addColorStop(0, q[3]);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = rg;
            ctx.fillRect(0, 0, w, h);
        }

        const driftX = Math.sin(t * .07) * w * .006;
        const driftY = Math.cos(t * .053) * h * .004;
        for (const d of dust) {
            const x = ((d.x * w + driftX * .15 + t * d.drift * w) % w + w) % w;
            const y = ((d.y * h + driftY * .10) % h + h) % h;
            const a = d.a * (.75 + .25 * Math.sin(t * .25 + d.phase));
            ctx.fillStyle = 'rgba(227,235,245,' + a + ')';
            ctx.fillRect(x, y, d.r, d.r);
        }

        const cameraX = -w * .075 * (1 - Math.exp(-t / 7.5)) + Math.sin(t * .11) * w * .009;
        const cameraY = Math.sin(t * .065) * h * .010;
        const zoom = 1 + .024 * (1 - Math.exp(-t / 9));
        for (const s of stars) {
            const x = ((s.x * w + cameraX * s.depth) % w + w) % w;
            const y = ((s.y * h + cameraY * s.depth) % h + h) % h;
            drawStar(x, y, s.r * zoom, clamp(s.a * (s.tw || .001 ? (.86 + .14 * Math.sin(t * s.tw + s.phase)) : 1), .02, .96), s.phase, s.tw, s.cross, t);
        }

        /* Dos meteoros suaves que vuelven a aparecer periódicamente. */
        for (let i = 0; i < 2; i++) {
            const cycle = 6.5 + i * 4.2;
            const local = (t - (1.1 + i * 2.0)) % cycle;
            if (local > 0 && local < 1.7) {
                const p = ease(local / 1.7);
                const x = (i ? .82 : .18) * w + (i ? -1 : 1) * p * w * .24;
                const y = (i ? .18 : .24) * h + p * h * .16;
                const tx = x + (i ? .08 : -.08) * w;
                const ty = y - .05 * h;
                ctx.save();
                ctx.globalAlpha = Math.sin(local / 1.7 * Math.PI) * .62;
                const mg = ctx.createLinearGradient(tx, ty, x, y);
                mg.addColorStop(0, 'rgba(255,255,255,0)');
                mg.addColorStop(.72, 'rgba(239,244,250,.44)');
                mg.addColorStop(1, 'rgba(255,255,255,.92)');
                ctx.strokeStyle = mg;
                ctx.lineWidth = .65;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
                ctx.restore();
            }
        }

        raf = requestAnimationFrame(frame);
    }

    function begin() {
        if (started) return;
        started = true;
        startTime = performance.now();
        resize();
        build();
        canvas.style.display = 'block';
        canvas.style.opacity = '1';
        /* El canvas anterior queda debajo; esta capa es la que manda visualmente. */
        const old = document.getElementById('cinematic-sky');
        if (old) old.style.visibility = 'hidden';
        const base = document.getElementById('starfield');
        if (base) base.style.visibility = 'hidden';
        const nebula = document.getElementById('nebula');
        if (nebula) nebula.style.visibility = 'hidden';
        /* Primer frame sin esperar al siguiente ciclo de RAF. */
        frame(startTime);
    }

    button.addEventListener('click', begin, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();
