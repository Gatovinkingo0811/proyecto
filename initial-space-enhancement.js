/*
 * Mejora visual AISLADA de dos momentos concretos:
 * 1) el espacio inicial, antes del vuelo;
 * 2) la entrada FINAL al mismo agujero negro que ya dibuja script.js.
 *
 * NO crea un segundo agujero negro, NO crea otro zodíaco y NO toca la lógica
 * de las 14 estrellas. Solo aporta una capa visual temporal y sincronizada
 * con el reloj de ExperienceMusic.
 */
(function () {
    'use strict';

    const original = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!original || !button) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-polish-layer';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100%',
        'height:100%',
        'z-index:4',
        'pointer-events:none',
        'display:none'
    ].join(';');
    document.body.appendChild(canvas);

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

    function lerp(a, b, t) {
        return a + (b - a) * clamp(t, 0, 1);
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
        const count = mobile ? 82 : 132;
        stars = [];

        for (let i = 0; i < count; i++) {
            const depth = i < count * 0.72 ? 0 : (i < count * 0.94 ? 1 : 2);
            const r = rand(i + 10);
            stars.push({
                x: rand(i + 100) * width,
                y: rand(i + 200) * height,
                depth,
                size: depth === 0
                    ? 0.35 + rand(i + 300) * 0.42
                    : depth === 1
                        ? 0.48 + rand(i + 400) * 0.62
                        : 0.72 + rand(i + 500) * 0.92,
                alpha: depth === 0
                    ? 0.16 + rand(i + 600) * 0.26
                    : depth === 1
                        ? 0.26 + rand(i + 700) * 0.32
                        : 0.46 + rand(i + 800) * 0.38,
                phase: rand(i + 900) * Math.PI * 2,
                twinkle: depth > 0 && rand(i + 1000) < (depth === 2 ? 0.26 : 0.16),
                driftX: depth === 0 ? 0.0007 : (depth === 1 ? 0.0015 : 0.0028),
                driftY: depth === 0 ? 0.00015 : (depth === 1 ? 0.00035 : 0.0007),
                flare: depth === 2 && r > 0.73
            });
        }
    }

    function drawStar(s, alpha) {
        if (alpha <= 0.005) return;

        const x = s.x;
        const y = s.y;
        const r = s.size;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(244,247,255,1)';

        // La mayoría son puntos casi microscópicos. Las estrellas visibles
        // tienen una forma de 4 puntas para evitar el aspecto de "bolitas".
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.lineTo(x + r * 0.16, y - r * 0.16);
        ctx.lineTo(x + r, y);
        ctx.lineTo(x + r * 0.16, y + r * 0.16);
        ctx.lineTo(x, y + r);
        ctx.lineTo(x - r * 0.16, y + r * 0.16);
        ctx.lineTo(x - r, y);
        ctx.lineTo(x - r * 0.16, y - r * 0.16);
        ctx.closePath();
        ctx.fill();

        if (s.flare && r > 0.95) {
            const long = r * 5.2;
            const short = r * 1.85;
            const glow = alpha * 0.27;

            const h = ctx.createLinearGradient(x - long, y, x + long, y);
            h.addColorStop(0, 'rgba(235,241,255,0)');
            h.addColorStop(0.5, 'rgba(245,249,255,' + glow + ')');
            h.addColorStop(1, 'rgba(235,241,255,0)');
            ctx.strokeStyle = h;
            ctx.lineWidth = Math.max(0.3, r * 0.10);
            ctx.beginPath();
            ctx.moveTo(x - long, y);
            ctx.lineTo(x + long, y);
            ctx.stroke();

            const v = ctx.createLinearGradient(x, y - short, x, y + short);
            v.addColorStop(0, 'rgba(235,241,255,0)');
            v.addColorStop(0.5, 'rgba(245,249,255,' + (glow * 0.75) + ')');
            v.addColorStop(1, 'rgba(235,241,255,0)');
            ctx.strokeStyle = v;
            ctx.beginPath();
            ctx.moveTo(x, y - short);
            ctx.lineTo(x, y + short);
            ctx.stroke();
        }
    }

    function musicTime(now) {
        const music = window.ExperienceMusic;
        if (music && typeof music.isPlaying === 'function' && music.isPlaying() &&
            typeof music.now === 'function') {
            const t = music.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function drawEntry(now, t) {
        // El black hole REAL de script.js ya está debajo de esta capa. Aquí solo
        // hacemos que su horizonte se acerque hasta llenar la pantalla.
        const start = reduced ? 24.0 : 28.3;
        const end = reduced ? 27.2 : 31.9;
        if (t < start || t >= end) return false;

        const p = ease((t - start) / (end - start));
        const cx = width * 0.5;
        const cy = height * 0.44;
        const minD = Math.min(width, height);
        const diag = Math.hypot(width, height);

        // Empieza exactamente sobre el horizonte existente y lo expande con
        // fuerza progresiva: esto vende la sensación de que la cámara cruza el
        // borde en vez de hacer un simple fundido a negro.
        const baseHole = minD * 0.16;
        const radius = lerp(baseHole * 0.82, diag * 0.92, Math.pow(p, 1.55));

        // Oscurecimiento exterior suave para que el universo se comprima hacia
        // el agujero durante la caída final.
        const vignette = ctx.createRadialGradient(cx, cy, radius * 0.38, cx, cy, radius * 1.22);
        vignette.addColorStop(0, 'rgba(0,0,0,0.98)');
        vignette.addColorStop(0.72, 'rgba(0,0,0,0.92)');
        vignette.addColorStop(0.93, 'rgba(0,0,0,0.30)');
        vignette.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = vignette;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
        ctx.fill();

        // Un borde extremadamente fino: al principio deja ver el anillo real;
        // al final se convierte en el último borde del horizonte antes del negro.
        if (p < 0.72) {
            const rim = lerp(1.0, 0.2, p / 0.72);
            ctx.globalAlpha = rim * 0.42;
            ctx.strokeStyle = 'rgba(255,225,186,1)';
            ctx.lineWidth = Math.max(1, minD * 0.0025);
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        // Últimos instantes: la "pantalla" queda completamente dentro del
        // horizonte y el negro termina de ocupar todo el campo visual.
        if (p > 0.72) {
            const q = ease((p - 0.72) / 0.28);
            ctx.fillStyle = 'rgba(0,0,3,' + (0.35 + q * 0.65) + ')';
            ctx.fillRect(0, 0, width, height);
        }

        return true;
    }

    function draw(now) {
        if (!running) return;

        const t = musicTime(now);
        const initialEnd = reduced ? 9.0 : 16.15;
        const entryStart = reduced ? 24.0 : 28.3;
        const entryEnd = reduced ? 27.2 : 31.9;

        ctx.clearRect(0, 0, width, height);
        let active = false;

        // FASE 1: espacio inicial. Se apagan por completo el starfield y la
        // nebulosa originales para evitar duplicados/"círculos".
        if (t < initialEnd) {
            active = true;
            original.style.visibility = 'hidden';
            if (nebula) nebula.style.visibility = 'hidden';

            const appear = ease((t - 2.35) / 4.5);
            const fade = t > initialEnd - 1.5
                ? 1 - ease((t - (initialEnd - 1.5)) / 1.5)
                : 1;
            const visibility = clamp(appear * fade, 0, 1);

            ctx.fillStyle = 'rgba(0,1,5,' + (0.18 * visibility) + ')';
            ctx.fillRect(0, 0, width, height);

            for (let i = 0; i < stars.length; i++) {
                const s = stars[i];
                s.x += s.driftX;
                s.y += Math.sin(now * 0.00015 + s.phase) * s.driftY;
                if (s.x > width + 4) s.x = -4;
                if (s.y > height + 3) s.y = -3;
                if (s.y < -3) s.y = height + 3;

                const pulse = s.twinkle
                    ? 1 + Math.sin(now * 0.001 + s.phase) * 0.12
                    : 1;
                const depthMul = s.depth === 0 ? 0.78 : (s.depth === 1 ? 0.92 : 1);
                drawStar(s, clamp(s.alpha * pulse * depthMul * visibility, 0, 1));
            }
        }

        // Entre ambas escenas la capa es totalmente transparente: script.js
        // recupera el control visual sin que nada se monte encima.
        if (t >= initialEnd && t < entryStart) {
            original.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
        }

        // FASE 2: entrada al MISMO black hole de script.js. No se redibuja el
        // agujero: solo se expande una máscara negra sobre su horizonte para
        // vender la aproximación de cámara y el cruce.
        if (t >= entryStart && t < entryEnd) {
            active = true;
            original.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            drawEntry(now, t);
        }

        // Después del horizonte no queda ninguna capa adicional. La siguiente
        // fase es el vacío/birth de script.js, que conserva las 14 estrellas.
        if (t >= entryEnd) {
            release();
            return;
        }

        ctx.globalAlpha = 1;
        if (active || t < entryEnd) {
            canvas.style.display = 'block';
        }
        raf = requestAnimationFrame(draw);
    }

    function begin() {
        if (running) return;
        running = true;
        startedAt = performance.now();
        seed = Math.floor(Math.random() * 100000);
        resize();
        original.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        canvas.style.display = 'block';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
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

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();
