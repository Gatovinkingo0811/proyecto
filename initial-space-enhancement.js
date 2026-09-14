/*
 * Capa AISLADA para el espacio inicial.
 * NO crea agujero negro, NO crea zodíaco y NO modifica la cinemática principal.
 * Durante el arranque oculta visualmente el starfield original y lo sustituye
 * por estrellas pequeñas y variadas; al llegar al vuelo devuelve el control.
 */
(function () {
    'use strict';

    const original = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!original || !button) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'initial-space-enhancement';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:absolute',
        'inset:0',
        'width:100%',
        'height:100%',
        'z-index:2',
        'pointer-events:none',
        'display:none'
    ].join(';');
    original.parentNode.insertBefore(canvas, original.nextSibling);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let raf = 0;
    let running = false;
    let startedAt = 0;
    let seed = 1;

    function rand(i) {
        const x = Math.sin((i + 1) * 91.731 + seed * 0.0137) * 43758.5453;
        return x - Math.floor(x);
    }

    function clamp(v, a, b) {
        return Math.max(a, Math.min(b, v));
    }

    function ease(v) {
        v = clamp(v, 0, 1);
        return v * v * (3 - 2 * v);
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildStars();
    }

    function buildStars() {
        const mobile = width < 768;
        const count = mobile ? 105 : 165;
        stars = [];

        for (let i = 0; i < count; i++) {
            const depth = i < count * 0.70 ? 0 : (i < count * 0.94 ? 1 : 2);
            const r = rand(i + 10);
            stars.push({
                x: rand(i + 100) * width,
                y: rand(i + 200) * height,
                depth,
                size: depth === 0
                    ? 0.45 + rand(i + 300) * 0.55
                    : depth === 1
                        ? 0.65 + rand(i + 400) * 0.85
                        : 0.9 + rand(i + 500) * 1.25,
                alpha: depth === 0
                    ? 0.18 + rand(i + 600) * 0.30
                    : depth === 1
                        ? 0.30 + rand(i + 700) * 0.38
                        : 0.52 + rand(i + 800) * 0.40,
                phase: rand(i + 900) * Math.PI * 2,
                twinkle: depth > 0 && rand(i + 1000) < (depth === 2 ? 0.36 : 0.22),
                drift: depth === 0 ? 0.0012 : (depth === 1 ? 0.0032 : 0.006),
                flare: depth === 2 && r > 0.62
            });
        }
    }

    function drawStar(s, alpha) {
        if (alpha <= 0.005) return;

        const x = s.x;
        const y = s.y;
        const r = s.size;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(242,246,255,1)';

        // Punto estelar de 4 puntas, no círculo. Las estrellas lejanas son
        // casi puntos; las cercanas ganan una punta muy fina tipo difracción.
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.22, y - r * 0.22);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x + r * 0.22, y + r * 0.22);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r * 0.22, y + r * 0.22);
        ctx.lineTo(x - r, y);
        ctx.lineTo(x - r * 0.22, y - r * 0.22);
        ctx.closePath();
        ctx.fill();

        if (s.flare && r > 1.0) {
            const long = r * 5.8;
            const short = r * 2.3;
            ctx.strokeStyle = 'rgba(232,239,255,' + (alpha * 0.34) + ')';
            ctx.lineWidth = Math.max(0.35, r * 0.12);

            const h = ctx.createLinearGradient(x - long, y, x + long, y);
            h.addColorStop(0, 'rgba(235,241,255,0)');
            h.addColorStop(0.5, 'rgba(245,248,255,' + (alpha * 0.5) + ')');
            h.addColorStop(1, 'rgba(235,241,255,0)');
            ctx.strokeStyle = h;
            ctx.beginPath();
            ctx.moveTo(x - long, y);
            ctx.lineTo(x + long, y);
            ctx.stroke();

            const v = ctx.createLinearGradient(x, y - short, x, y + short);
            v.addColorStop(0, 'rgba(235,241,255,0)');
            v.addColorStop(0.5, 'rgba(245,248,255,' + (alpha * 0.3) + ')');
            v.addColorStop(1, 'rgba(235,241,255,0)');
            ctx.strokeStyle = v;
            ctx.beginPath();
            ctx.moveTo(x, y - short);
            ctx.lineTo(x, y + short);
            ctx.stroke();
        }
    }

    function release() {
        running = false;
        cancelAnimationFrame(raf);
        raf = 0;
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
        original.style.visibility = '';
        if (nebula) nebula.style.visibility = '';
    }

    function currentTime(now) {
        const music = window.ExperienceMusic;
        if (music && typeof music.isPlaying === 'function' && music.isPlaying() &&
            typeof music.now === 'function') {
            const t = music.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function draw(now) {
        if (!running) return;

        const t = currentTime(now);
        const releaseAt = reduced ? 9.0 : 16.15;

        if (t >= releaseAt) {
            release();
            return;
        }

        const appear = ease((t - 2.25) / 3.7);
        const fade = t > releaseAt - 1.35
            ? 1 - ease((t - (releaseAt - 1.35)) / 1.35)
            : 1;
        const visibility = clamp(appear * fade, 0, 1);

        ctx.clearRect(0, 0, width, height);

        // Fondo negro profundo y una textura mínima de polvo. Nada de manchas
        // grandes ni círculos de colores.
        ctx.fillStyle = 'rgba(1,2,8,' + (0.10 * visibility) + ')';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.x += s.drift;
            if (s.x > width + 3) s.x = -3;

            const pulse = s.twinkle
                ? 1 + Math.sin(now * 0.0011 + s.phase) * 0.13
                : 1;
            const depthMul = s.depth === 0 ? 0.8 : (s.depth === 1 ? 0.95 : 1.0);
            drawStar(s, clamp(s.alpha * pulse * depthMul * visibility, 0, 1));
        }

        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(draw);
    }

    function begin() {
        if (running) return;
        running = true;
        startedAt = performance.now();
        seed = Math.floor(Math.random() * 100000);
        resize();

        // El cielo original queda visualmente fuera SOLO durante esta fase.
        original.style.visibility = 'hidden';
        canvas.style.display = 'block';
        if (nebula) nebula.style.visibility = 'hidden';

        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();
