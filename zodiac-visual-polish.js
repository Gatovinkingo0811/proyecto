/* ============================================================================
 * Cielo final y estrellas zodiacales
 *
 * Segunda capa visual ligera: fondo nocturno realista + glifos de estrella sobre
 * las posiciones reales que celestial.js ya calcula. No altera coordenadas,
 * órbitas ni segmentos de las constelaciones: solo mejora su representación.
 * ========================================================================== */
(function () {
    'use strict';

    const sky = document.createElement('canvas');
    sky.id = 'final-sky-polish';
    document.body.appendChild(sky);

    const zodiacStars = document.createElement('canvas');
    zodiacStars.id = 'zodiac-star-polish';
    document.body.appendChild(zodiacStars);

    const ctx = sky.getContext('2d', { alpha: false });
    const zctx = zodiacStars.getContext('2d');
    if (!ctx || !zctx) return;

    const reduced = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    let w = 1;
    let h = 1;
    let dpr = 1;
    let stars = [];
    let raf = 0;
    let last = performance.now();
    let seed = 14062006;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    function resize() {
        w = window.innerWidth;
        h = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.4);
        sky.width = Math.floor(w * dpr);
        sky.height = Math.floor(h * dpr);
        zodiacStars.width = Math.floor(w * dpr);
        zodiacStars.height = Math.floor(h * dpr);
        sky.style.width = w + 'px';
        sky.style.height = h + 'px';
        zodiacStars.style.width = w + 'px';
        zodiacStars.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        zctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildStars();
    }

    function buildStars() {
        const count = reduced ? 160 : 360;
        stars = [];
        for (let i = 0; i < count; i++) {
            const roll = rnd();
            const bright = roll > 0.84;
            const medium = roll > 0.54;
            stars.push({
                x: rnd(),
                y: rnd(),
                r: bright ? 1.15 + rnd() * 1.45 : (medium ? .62 + rnd() * .62 : .30 + rnd() * .42),
                a: bright ? .48 + rnd() * .34 : (medium ? .20 + rnd() * .32 : .08 + rnd() * .26),
                twinkle: bright ? .24 + rnd() * .48 : (rnd() < .16 ? .18 + rnd() * .28 : 0),
                phase: rnd() * Math.PI * 2,
                depth: .2 + rnd() * 1.1,
                cross: bright && rnd() < .6
            });
        }
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function drawGlyph(g, x, y, r, alpha, cross) {
        if (r >= .95) {
            const glow = g.createRadialGradient(x, y, 0, x, y, r * 4.5);
            glow.addColorStop(0, 'rgba(225,236,255,' + (alpha * .18) + ')');
            glow.addColorStop(.18, 'rgba(205,224,255,' + (alpha * .065) + ')');
            glow.addColorStop(1, 'rgba(180,205,255,0)');
            g.fillStyle = glow;
            g.beginPath();
            g.arc(x, y, r * 4.5, 0, Math.PI * 2);
            g.fill();
        }

        if (cross) {
            const ray = r * 3.25;
            g.strokeStyle = 'rgba(242,247,255,' + (alpha * .42) + ')';
            g.lineWidth = Math.max(.45, Math.min(.9, r * .3));
            g.beginPath();
            g.moveTo(x - ray, y);
            g.lineTo(x + ray, y);
            g.moveTo(x, y - ray);
            g.lineTo(x, y + ray);
            g.stroke();
        }

        g.fillStyle = 'rgba(255,255,255,' + alpha + ')';
        g.beginPath();
        g.arc(x, y, Math.max(.45, r), 0, Math.PI * 2);
        g.fill();
    }

    function drawFinalSky(t) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#010208');
        grad.addColorStop(.5, '#030713');
        grad.addColorStop(1, '#000106');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Banda de polvo estelar muy tenue y ancha; no se convierte en una nube.
        const band = ctx.createLinearGradient(0, h * .12, w, h * .82);
        band.addColorStop(0, 'rgba(120,150,205,0)');
        band.addColorStop(.45, 'rgba(140,160,205,.020)');
        band.addColorStop(.55, 'rgba(175,190,225,.035)');
        band.addColorStop(1, 'rgba(120,150,205,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, w, h);

        const driftX = Math.sin(t * .045) * w * .004;
        const driftY = Math.cos(t * .034) * h * .003;
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const pulse = s.twinkle ? .82 + .18 * Math.sin(t * s.twinkle + s.phase) : 1;
            let x = s.x * w + driftX * s.depth;
            let y = s.y * h + driftY * s.depth;
            x = ((x % w) + w) % w;
            y = ((y % h) + h) % h;
            drawGlyph(ctx, x, y, s.r, clamp(s.a * pulse, .025, .92), s.cross);
        }
    }

    function drawZodiacStars() {
        zctx.clearRect(0, 0, w, h);
        const data = window.ZODIAC_DATA || [];
        const api = window.CelestialSky;
        if (!api || typeof api.getStarScreenPosition !== 'function') return;
        if (!document.body.classList.contains('constellation-complete')) return;

        for (let c = 0; c < data.length; c++) {
            const cz = data[c];
            if (!cz || !cz.id || !Array.isArray(cz.stars)) continue;

            for (let i = 0; i < cz.stars.length; i++) {
                const p = api.getStarScreenPosition(cz.id, i);
                if (!p) continue;
                const mag = Number(cz.stars[i].mag);
                const brightness = Number.isFinite(mag) ? clamp(1.45 - (mag + 1) * .13, .55, 1.35) : .9;
                const r = 1.25 + brightness * .75;
                const cross = r > 1.8 || (Number.isFinite(mag) && mag < 2.5);
                drawGlyph(zctx, p.x, p.y, r, .62 + brightness * .24, cross);
            }
        }
    }

    function animate(now) {
        const dt = Math.min(80, now - last);
        last = now;
        const active = document.body.classList.contains('constellation-complete');
        if (active) {
            drawFinalSky(now * .001);
            drawZodiacStars();
        } else {
            ctx.clearRect(0, 0, w, h);
            zctx.clearRect(0, 0, w, h);
        }
        // dt se conserva para que un tab oculto no produzca saltos de simulación.
        void dt;
        raf = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', function () {
        last = performance.now();
    });

    resize();
    raf = requestAnimationFrame(animate);
})();
