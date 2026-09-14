/*
 * Intro cinematográfica: cielo nocturno -> cámara se desplaza -> Acuario aparece.
 *
 * La constelación que nace aquí ES la constelación interactiva.
 * Cuando termina de formarse, las mismas estrellas reciben los toques y delegan
 * en la lógica existente de script.js para abrir los 14 mensajes.
 * No se crea una segunda constelación visual.
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
        'z-index:200',
        'pointer-events:none',
        'display:none',
        'opacity:1',
        'cursor:pointer'
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

    const prefersReducedMotion = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    const TOTAL = 39.5;
    const CAMERA_MOVE_START = 15.0;
    const CONSTELLATION_START = 27.0;
    const CONSTELLATION_FULL = 36.8;

    // EXACTAMENTE las mismas 14 posiciones de Acuario existentes.
    const AQUARIUS = [
        { id: 1, x: 16, y: 54 },
        { id: 2, x: 34, y: 42 },
        { id: 3, x: 48, y: 26 },
        { id: 4, x: 58, y: 17 },
        { id: 5, x: 58, y: 31 },
        { id: 6, x: 65, y: 26 },
        { id: 7, x: 71, y: 29 },
        { id: 8, x: 52, y: 53 },
        { id: 9, x: 57, y: 63 },
        { id: 10, x: 72, y: 74 },
        { id: 11, x: 76, y: 48 },
        { id: 12, x: 70, y: 83 },
        { id: 13, x: 82, y: 89 },
        { id: 14, x: 87, y: 42 }
    ];

    const LINES = [
        [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7],
        [3, 8], [8, 9], [9, 10], [9, 11], [11, 14], [10, 12], [12, 13]
    ];

    // Estado visual de la capa que ocupa la pantalla.
    let discovered = new Set();
    let activeId = 1;
    let interactive = false;
    let startedAt = 0;
    let running = false;
    let raf = 0;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let currentTime = 0;

    const bgStars = [];
    let seed = 81211;

    function rnd() {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    }

    const starCount = prefersReducedMotion ? 120 : 235;
    for (let i = 0; i < starCount; i++) {
        const sizeRoll = rnd();
        const large = sizeRoll > 0.79;
        bgStars.push({
            x: rnd(),
            y: rnd(),
            radius: large ? 1.15 + rnd() * 1.65 : 0.42 + rnd() * 0.72,
            alpha: large ? 0.38 + rnd() * 0.46 : 0.16 + rnd() * 0.58,
            twinkle: 0.45 + rnd() * 1.7,
            phase: rnd() * Math.PI * 2,
            crisp: large,
            depth: 0.35 + rnd() * 0.8
        });
    }

    const shooting = [];
    function makeShootingStar(delay, x, y, angle, speed, length, alpha) {
        shooting.push({ delay, x, y, angle, speed, length, alpha });
    }

    makeShootingStar(6.4, 0.08, 0.22, 0.44, 0.96, 0.25, 0.95);
    makeShootingStar(12.8, 0.76, 0.18, 2.62, 0.88, 0.20, 0.72);
    makeShootingStar(19.2, 0.18, 0.61, 0.35, 0.80, 0.18, 0.82);
    makeShootingStar(23.7, 0.83, 0.55, 2.73, 0.92, 0.22, 0.76);
    makeShootingStar(29.6, 0.26, 0.25, 0.54, 0.72, 0.17, 0.70);

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function easeInOut(v) {
        v = clamp(v);
        return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
    }

    function easeOut(v) {
        v = clamp(v);
        return 1 - Math.pow(1 - v, 3);
    }

    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying() && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function getCamera(t) {
        const p = clamp((t - CAMERA_MOVE_START) / 21.0);
        const eased = easeInOut(p);
        return {
            x: Math.sin(eased * Math.PI * 0.5) * width * 0.085,
            y: Math.cos(eased * Math.PI * 0.5) * height * 0.022,
            zoom: 1 + eased * 0.018
        };
    }

    // Estilo único para TODAS las estrellas: núcleo duro, halo limpio y puntas.
    function drawCrispStar(x, y, radius, alpha, t, emphasis = 1) {
        const pulse = 0.88 + 0.12 * Math.sin(t * 1.65 + x * 0.009 + y * 0.007);
        const a = clamp(alpha * pulse, 0, 1);
        const r = Math.max(0.55, radius * (0.9 + emphasis * 0.14));

        if (r > 1.0 || emphasis > 1.25) {
            const glowR = r * (5.0 + emphasis * 1.8);
            const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
            glow.addColorStop(0, 'rgba(220,232,255,' + (a * 0.20) + ')');
            glow.addColorStop(0.16, 'rgba(210,225,255,' + (a * 0.09) + ')');
            glow.addColorStop(1, 'rgba(180,205,255,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, glowR, 0, Math.PI * 2);
            ctx.fill();
        }

        if (r > 1.25 || emphasis > 1.25) {
            const ray = r * (3.0 + emphasis * 1.35);
            const rayAlpha = a * 0.34;
            ctx.strokeStyle = 'rgba(235,242,255,' + rayAlpha + ')';
            ctx.lineWidth = Math.max(0.45, Math.min(1.1, r * 0.35));
            ctx.beginPath();
            ctx.moveTo(x - ray, y);
            ctx.lineTo(x + ray, y);
            ctx.moveTo(x, y - ray);
            ctx.lineTo(x, y + ray);
            ctx.stroke();
        }

        ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawBackground(t) {
        const g = ctx.createLinearGradient(0, 0, width, height);
        g.addColorStop(0, '#02040b');
        g.addColorStop(0.40, '#050915');
        g.addColorStop(0.72, '#030612');
        g.addColorStop(1, '#010208');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);

        const haze = ctx.createRadialGradient(
            width * 0.27, height * 0.30, 0,
            width * 0.27, height * 0.30, Math.min(width, height) * 0.78
        );
        haze.addColorStop(0, 'rgba(105,125,185,0.050)');
        haze.addColorStop(0.52, 'rgba(74,88,145,0.020)');
        haze.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = haze;
        ctx.fillRect(0, 0, width, height);

        const camera = getCamera(t);

        bgStars.forEach((s) => {
            let sx = s.x * width + camera.x * s.depth;
            let sy = s.y * height + camera.y * s.depth;
            sx = ((sx % width) + width) % width;
            sy = ((sy % height) + height) % height;

            const pulse = 0.74 + 0.26 * Math.sin(t * s.twinkle + s.phase);
            const alpha = clamp(s.alpha * pulse, 0.05, 0.98);
            drawCrispStar(sx, sy, s.radius, alpha, t, s.crisp ? 1.1 : 0.8);
        });

        shooting.forEach((s) => {
            const local = t - s.delay;
            if (local < 0 || local > 1.15) return;

            const p = local < 0.18
                ? easeOut(local / 0.18)
                : 1 - clamp((local - 0.18) / 0.97);

            const x = s.x * width + Math.cos(s.angle) * local * width * s.speed;
            const y = s.y * height + Math.sin(s.angle) * local * height * s.speed;
            const len = Math.min(width, height) * s.length * clamp(p + 0.2, 0.25, 1);
            const tx = x - Math.cos(s.angle) * len;
            const ty = y - Math.sin(s.angle) * len;

            const grad = ctx.createLinearGradient(tx, ty, x, y);
            grad.addColorStop(0, 'rgba(255,255,255,0)');
            grad.addColorStop(0.70, 'rgba(228,238,255,' + (s.alpha * p * 0.34) + ')');
            grad.addColorStop(1, 'rgba(255,255,255,' + (s.alpha * p) + ')');
            ctx.strokeStyle = grad;
            ctx.lineWidth = Math.max(0.9, Math.min(2.1, 1.05 + p * 0.9));
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(x, y);
            ctx.stroke();

            drawCrispStar(x, y, 1.25 + p * 0.9, s.alpha * p * 0.95, t, 1.35);
        });
    }

    function constellationPoint(star, t) {
        const camera = getCamera(t);
        return {
            x: star.x / 100 * width + camera.x,
            y: star.y / 100 * height + camera.y
        };
    }

    function drawConstellation(t) {
        if (t < CONSTELLATION_START) return;

        const progress = easeOut(
            (t - CONSTELLATION_START) / (CONSTELLATION_FULL - CONSTELLATION_START)
        );
        const revealT = progress * AQUARIUS.length;

        AQUARIUS.forEach((star, index) => {
            const local = clamp(revealT - index);
            if (local <= 0) return;

            const p = easeOut(local);
            const pos = constellationPoint(star, t);
            const done = discovered.has(star.id);
            const isActive = interactive && star.id === activeId;

            const emphasis = done ? 1.55 : (isActive ? 1.75 : 1.35);
            const alpha = done ? 1.0 : (isActive ? 0.94 : 0.68);
            const radius = done ? 2.15 : (isActive ? 2.30 : 1.85);

            drawCrispStar(
                pos.x,
                pos.y,
                radius,
                alpha * (0.30 + 0.70 * p),
                t,
                emphasis
            );

            if (p < 1) {
                const flash = Math.sin(p * Math.PI);
                const flashR = 7 + flash * 8;
                const flashGrad = ctx.createRadialGradient(
                    pos.x, pos.y, 0,
                    pos.x, pos.y, flashR
                );
                flashGrad.addColorStop(0, 'rgba(255,255,255,' + (flash * 0.34) + ')');
                flashGrad.addColorStop(0.28, 'rgba(215,230,255,' + (flash * 0.10) + ')');
                flashGrad.addColorStop(1, 'rgba(170,195,255,0)');
                ctx.fillStyle = flashGrad;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, flashR, 0, Math.PI * 2);
                ctx.fill();
            }

            if (isActive && p >= 1) {
                const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
                ctx.strokeStyle = 'rgba(224,235,255,' + (0.10 + pulse * 0.08) + ')';
                ctx.lineWidth = 0.85;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5.0 + pulse * 2.0, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        const lineProgress = clamp((progress - 0.45) / 0.55);
        LINES.forEach((line, index) => {
            const local = clamp(lineProgress * LINES.length - index);
            if (local <= 0) return;

            const p = easeOut(local);
            const a = AQUARIUS.find(s => s.id === line[0]);
            const b = AQUARIUS.find(s => s.id === line[1]);
            if (!a || !b) return;

            const pa = constellationPoint(a, t);
            const pb = constellationPoint(b, t);
            const ex = pa.x + (pb.x - pa.x) * p;
            const ey = pa.y + (pb.y - pa.y) * p;

            const connected = discovered.has(a.id) && discovered.has(b.id);
            ctx.strokeStyle = connected
                ? 'rgba(215,226,250,0.46)'
                : 'rgba(205,218,244,' + (0.13 + 0.34 * p) + ')';
            ctx.lineWidth = connected ? 1.0 : 0.9;
            ctx.beginPath();
            ctx.moveTo(pa.x, pa.y);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            if (p < 1) {
                drawCrispStar(ex, ey, 1.15, 0.72, t, 1.12);
            }
        });
    }

    function syncInteractionState() {
        // Leemos el estado de los nodos reales creados por script.js. Esto evita
        // duplicar su Set de descubrimientos y mantiene una sola fuente de verdad.
        const nodes = document.querySelectorAll('#stars-container .star-node');
        const nextDiscovered = new Set();
        let nextActive = activeId;

        nodes.forEach((node) => {
            const match = /star-node-(\d+)/.exec(node.id || '');
            if (!match) return;
            const id = Number(match[1]);
            if (node.classList.contains('discovered')) nextDiscovered.add(id);
            if (node.classList.contains('active')) nextActive = id;
        });

        if (nextDiscovered.size || nodes.length) discovered = nextDiscovered;
        if (Number.isFinite(nextActive)) activeId = nextActive;
    }

    function clickNearestStar(clientX, clientY) {
        if (!interactive) return;

        syncInteractionState();

        let nearest = null;
        let nearestDist = Infinity;

        AQUARIUS.forEach((star) => {
            const pos = constellationPoint(star, currentTime);
            const d = Math.hypot(clientX - pos.x, clientY - pos.y);
            if (d < nearestDist) {
                nearest = star;
                nearestDist = d;
            }
        });

        const hitRadius = Math.max(22, Math.min(34, Math.min(width, height) * 0.045));
        if (!nearest || nearestDist > hitRadius) return;

        // El nodo real mantiene intactos orden, bloqueo, modal, sonidos y final.
        const realNode = document.getElementById('star-node-' + nearest.id);
        if (realNode) realNode.click();
    }

    function finishInteractiveSky() {
        interactive = false;
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        canvas.style.display = 'none';
        baseCanvas.style.visibility = '';
        if (nebula) nebula.style.visibility = '';
        running = false;
        cancelAnimationFrame(raf);
    }

    function frame(now) {
        if (!running) return;

        if (document.body.classList.contains('constellation-complete')) {
            finishInteractiveSky();
            return;
        }

        currentTime = musicTime(now);
        const t = prefersReducedMotion ? currentTime / 0.42 : currentTime;

        drawBackground(t);
        drawConstellation(t);

        if (!interactive && t >= TOTAL) {
            interactive = true;
            canvas.style.pointerEvents = 'auto';
            canvas.style.cursor = 'pointer';
            syncInteractionState();
        }

        raf = requestAnimationFrame(frame);
    }

    function begin() {
        if (running) return;

        running = true;
        interactive = false;
        discovered = new Set();
        activeId = 1;
        startedAt = performance.now();
        currentTime = 0;

        canvas.style.display = 'block';
        canvas.style.opacity = '1';
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';

        // Los renderers antiguos quedan tapados durante toda la experiencia.
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';

        resize();
        drawBackground(0);
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
    }

    canvas.addEventListener('pointerup', function (e) {
        if (!interactive) return;
        e.preventDefault();
        e.stopPropagation();
        clickNearestStar(e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener('resize', resize, { passive: true });
    button.addEventListener('click', begin, { capture: false });
    resize();
})();