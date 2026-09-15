/*
 * Intro cinematográfica — cielo nocturno vivo -> movimiento de mirada -> Acuario.
 *
 * La idea es sencilla y orgánica: un cielo profundo que nunca se queda muerto,
 * estrellas con magnitudes distintas, algunas que respiran/titilan y fugaces
 * limpias. La cámara cambia de mirada y encuentra Acuario; las mismas 14 estrellas
 * continúan en la experiencia interactiva.
 *
 * NO hay galaxia artificial, círculos atravesando la pantalla ni agujero negro.
 * NO se dibujan las conexiones durante la intro: script.js las activa solo al
 * descubrir las estrellas.
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
        'opacity:1',
        'will-change:opacity'
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

    const reduced = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    // La historia visual termina antes; después queda un cielo respirando
    // suavemente hasta que script.js libera oficialmente la interacción.
    const ACTUAL_END = 32.0;
    const RELEASE_TIME = 39.5;
    const LOOK_START = 6.8;
    const LOOK_END = 16.8;
    const CONSTELLATION_START = 15.8;
    const CONSTELLATION_END = 26.8;
    const FADE_START = 38.4;

    const AQUARIUS = [
        { id: 1, x: 16, y: 54 }, { id: 2, x: 34, y: 42 },
        { id: 3, x: 48, y: 26 }, { id: 4, x: 58, y: 17 },
        { id: 5, x: 58, y: 31 }, { id: 6, x: 65, y: 26 },
        { id: 7, x: 71, y: 29 }, { id: 8, x: 52, y: 53 },
        { id: 9, x: 57, y: 63 }, { id: 10, x: 72, y: 74 },
        { id: 11, x: 76, y: 48 }, { id: 12, x: 70, y: 83 },
        { id: 13, x: 82, y: 89 }, { id: 14, x: 87, y: 42 }
    ];

    // Muchas estrellas, pero con jerarquía visual: pequeñas lejanas + medianas
    // + un grupo corto de estrellas protagonistas.
    const bgStars = [];
    let seed = 81211;
    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const starCount = reduced ? 145 : 270;
    for (let i = 0; i < starCount; i++) {
        const roll = rnd();
        const bright = roll > 0.84;
        const medium = !bright && roll > 0.55;
        bgStars.push({
            x: rnd(),
            y: rnd(),
            r: bright ? 1.15 + rnd() * 1.35 : (medium ? 0.66 + rnd() * 0.62 : 0.28 + rnd() * 0.46),
            a: bright ? 0.44 + rnd() * 0.34 : (medium ? 0.22 + rnd() * 0.30 : 0.08 + rnd() * 0.22),
            twinkle: bright ? 0.32 + rnd() * 0.55 : (medium && rnd() < 0.55 ? 0.18 + rnd() * 0.40 : 0),
            phase: rnd() * Math.PI * 2,
            depth: 0.20 + rnd() * 1.15,
            cross: bright && rnd() < 0.48,
            drift: (rnd() - 0.5) * 0.9
        });
    }

    // Fugaces pocas, nítidas y con aceleración/desaceleración propia. La cabeza
    // es brillante y la cola se pierde suavemente; no parecen rayas pegadas.
    const shooting = [
        { at: 4.6,  x: 0.84, y: 0.16, angle: 2.56, speed: 0.28, length: 0.105, alpha: 0.82 },
        { at: 10.9, x: 0.08, y: 0.28, angle: 0.46, speed: 0.25, length: 0.095, alpha: 0.70 },
        { at: 17.4, x: 0.80, y: 0.53, angle: 2.70, speed: 0.23, length: 0.090, alpha: 0.74 },
        { at: 24.1, x: 0.20, y: 0.15, angle: 0.58, speed: 0.21, length: 0.083, alpha: 0.62 },
        { at: 29.0, x: 0.74, y: 0.73, angle: 3.80, speed: 0.19, length: 0.078, alpha: 0.58 }
    ];

    let width = 1;
    let height = 1;
    let dpr = 1;
    let startedAt = 0;
    let running = false;
    let raf = 0;

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, reduced ? 1 : 1.4);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function smooth(v) {
        v = clamp(v);
        return v * v * (3 - 2 * v);
    }

    function smoother(v) {
        v = clamp(v);
        return v * v * v * (v * (v * 6 - 15) + 10);
    }

    function cinematicTime(now) {
        const M = window.ExperienceMusic;
        const raw = M && typeof M.now === 'function' ? M.now() : (now - startedAt) / 1000;
        if (!Number.isFinite(raw) || raw < 0) return (now - startedAt) / 1000;
        // Acorta la parte narrativa aproximadamente un 18%, pero deja el cielo
        // respirando hasta que el sistema principal termine de liberar interacción.
        return Math.min(ACTUAL_END, raw * 1.18);
    }

    function camera(t) {
        const p = smooth((t - LOOK_START) / (LOOK_END - LOOK_START));
        // Paneo lateral pequeño + una oscilación vertical casi imperceptible.
        const x = -width * 0.085 * p;
        const y = height * 0.012 * Math.sin(p * Math.PI * 0.95);
        const zoom = 1 + 0.035 * p;
        return { x, y, zoom };
    }

    function drawStar(x, y, radius, alpha, twinkle, phase, cross, t, emphasis = 1) {
        const pulse = twinkle ? (0.82 + 0.18 * Math.sin(t * twinkle + phase)) : 1;
        const a = clamp(alpha * pulse, 0.02, 1);
        const r = Math.max(0.42, radius * emphasis);

        if (r > 1.0) {
            const glowR = r * 4.2;
            const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            glow.addColorStop(0, 'rgba(230,238,255,' + (a * 0.16) + ')');
            glow.addColorStop(0.22, 'rgba(205,222,255,' + (a * 0.06) + ')');
            glow.addColorStop(1, 'rgba(180,205,255,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        if (cross && r > 1.15) {
            const ray = r * (2.45 + 0.8 * emphasis);
            ctx.strokeStyle = 'rgba(245,248,255,' + (a * 0.30) + ')';
            ctx.lineWidth = Math.max(0.42, Math.min(0.8, r * 0.28));
            ctx.beginPath();
            ctx.moveTo(x - ray, y); ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray); ctx.lineTo(x, y + ray);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawSky(t) {
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#01030a');
        g.addColorStop(0.38, '#040a16');
        g.addColorStop(0.72, '#020610');
        g.addColorStop(1, '#010207');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        // Una banda ancha muy tenue sugiere profundidad de polvo estelar sin crear
        // una “mancha” o un objeto geométrico sobre el cielo.
        const band = ctx.createLinearGradient(0, height * 0.05, width, height * 0.95);
        band.addColorStop(0, 'rgba(105,130,175,0)');
        band.addColorStop(0.45, 'rgba(135,158,205,0.018)');
        band.addColorStop(0.57, 'rgba(185,198,225,0.025)');
        band.addColorStop(1, 'rgba(105,130,175,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, 0, width, height);

        const cam = camera(t);
        const floatX = Math.sin(t * 0.08) * width * 0.003;
        const floatY = Math.cos(t * 0.065) * height * 0.0025;

        for (let i = 0; i < bgStars.length; i++) {
            const s = bgStars[i];
            let x = s.x * width + cam.x * s.depth + floatX * s.depth + s.drift * t * 0.10;
            let y = s.y * height + cam.y * s.depth + floatY * s.depth;
            x = ((x % width) + width) % width;
            y = ((y % height) + height) % height;
            drawStar(x, y, s.r, s.a, s.twinkle, s.phase, s.cross, t, 1);
        }

        for (let i = 0; i < shooting.length; i++) {
            const s = shooting[i];
            const local = t - s.at;
            if (local < 0 || local > 2.7) continue;

            // Entrada y salida suaves, con una zona central estable que da una
            // sensación de objeto físico moviéndose, no de “barra” animada.
            const p = local < 0.34
                ? smoother(local / 0.34)
                : 1 - smoother((local - 0.34) / 2.36);

            const travel = local * local * (0.78 + 0.22 * smooth(local / 2.7));
            const x = s.x * width + Math.cos(s.angle) * travel * width * s.speed;
            const y = s.y * height + Math.sin(s.angle) * travel * height * s.speed;
            const len = Math.min(width, height) * s.length * (0.25 + 0.75 * p);
            const tx = x - Math.cos(s.angle) * len;
            const ty = y - Math.sin(s.angle) * len;

            const grad = ctx.createLinearGradient(tx, ty, x, y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.72, 'rgba(224,236,255,' + (s.alpha * p * 0.24) + ')');
            grad.addColorStop(1, 'rgba(255,255,255,' + (s.alpha * p) + ')');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.82 + p * 0.48;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();

            drawStar(x, y, 1.0 + p * 0.75, s.alpha * p * 0.84, 0, 0, true, t, 1.08);
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
            const pulsePhase = i * 0.71;

            // Acuario es más brillante y nítida que el fondo, pero conserva el
            // lenguaje de una estrella real del cielo.
            drawStar(
                x,
                y,
                1.8 + e * 1.15,
                0.30 + e * 0.68,
                0.42,
                pulsePhase,
                true,
                t,
                1.12 + e * 0.18
            );

            if (e < 1) {
                const flash = Math.sin(e * Math.PI);
                const r = 6 + flash * 9;
                const fx = ctx.createRadialGradient(x, y, 0, x, y, r);
                fx.addColorStop(0, 'rgba(255,255,255,' + (flash * 0.28) + ')');
                fx.addColorStop(0.26, 'rgba(216,230,255,' + (flash * 0.08) + ')');
                fx.addColorStop(1, 'rgba(170,195,255,0)');
                ctx.fillStyle = fx;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function render(now) {
        if (!running) return;
        const raw = window.ExperienceMusic && typeof window.ExperienceMusic.now === 'function'
            ? window.ExperienceMusic.now()
            : (now - startedAt) / 1000;

        const t = cinematicTime(now);
        drawSky(t);
        drawAquarius(t);

        // Cuando termina la parte narrativa, no congelamos el cielo: reducimos la
        // velocidad de la deriva y mantenemos un “aire” mínimo hasta el cierre.
        if (Number.isFinite(raw) && raw > ACTUAL_END / 1.18) {
            const fadeP = clamp((raw - (ACTUAL_END / 1.18)) / 8.0);
            canvas.style.opacity = String(1 - fadeP * 0.05);
        }

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
        resize();
        drawSky(0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }

    window.addEventListener('resize', resize, { passive: true });
    button.addEventListener('click', begin, { capture: false });
    resize();
})();
