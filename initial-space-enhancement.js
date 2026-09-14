/*
 * Pulido cinematográfico AISLADO.
 * No toca script.js/celestial.js ni la lógica de las 14 estrellas.
 * 1) Plano inicial: mini galaxia espiral lejana + campo estelar mínimo.
 * 2) Black hole: solo añade detalle/actividad sobre el mismo render existente.
 * 3) Entrada: escala el canvas original para simular que la cámara cruza el horizonte.
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
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:4;pointer-events:none;display:none;';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0, height = 0, dpr = 1, raf = 0, running = false, startedAt = 0, seed = 1;
    let field = [], galaxyStars = [], hotSpots = [];

    function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
    function ease(v) { v = clamp(v); return v * v * (3 - 2 * v); }
    function lerp(a, b, t) { return a + (b - a) * clamp(t); }
    function rand(i) {
        const x = Math.sin((i + 1) * 91.731 + seed * 0.0137) * 43758.5453;
        return x - Math.floor(x);
    }
    function musicTime(now) {
        const m = window.ExperienceMusic;
        if (m && typeof m.isPlaying === 'function' && m.isPlaying() && typeof m.now === 'function') {
            const t = m.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
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
        buildScene();
    }

    function buildScene() {
        const mobile = width < 768;
        const fieldCount = mobile ? 52 : 78;
        const galCount = mobile ? 115 : 185;
        const hotCount = mobile ? 7 : 11;
        field = [];
        galaxyStars = [];
        hotSpots = [];

        for (let i = 0; i < fieldCount; i++) {
            field.push({
                x: rand(i + 10) * width,
                y: rand(i + 100) * height,
                size: 0.25 + rand(i + 200) * 0.65,
                alpha: 0.16 + rand(i + 300) * 0.38,
                phase: rand(i + 400) * Math.PI * 2,
                twinkle: rand(i + 500) < 0.18,
                drift: 0.02 + rand(i + 600) * 0.035
            });
        }

        // Una galaxia pequeña y lejana: polvo/estrellas siguiendo dos brazos
        // espirales, evitando el aspecto de un conjunto de círculos idénticos.
        for (let i = 0; i < galCount; i++) {
            const arm = i % 2;
            const u = rand(i + 700);
            const radius = 0.10 + Math.pow(u, 0.72) * 0.92;
            const theta = radius * 4.7 * Math.PI + arm * Math.PI + (rand(i + 800) - 0.5) * 0.55;
            galaxyStars.push({
                radius,
                theta,
                size: 0.28 + rand(i + 900) * 0.78,
                alpha: 0.10 + (1 - radius) * 0.35 + rand(i + 1000) * 0.20,
                warm: rand(i + 1100) > 0.68,
                phase: rand(i + 1200) * Math.PI * 2
            });
        }

        for (let i = 0; i < hotCount; i++) {
            hotSpots.push({
                angle: rand(i + 1300) * Math.PI * 2,
                radius: 1.00 + rand(i + 1400) * 0.80,
                size: 0.8 + rand(i + 1500) * 1.8,
                speed: 0.00055 + rand(i + 1600) * 0.00075,
                phase: rand(i + 1700) * Math.PI * 2
            });
        }
    }

    function drawPoint(x, y, size, alpha, warm) {
        if (alpha <= 0.01) return;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = warm ? 'rgba(255,221,184,1)' : 'rgba(224,235,255,1)';
        ctx.fillRect(x, y, Math.max(0.35, size), Math.max(0.35, size));
    }

    function drawField(now, intensity) {
        for (let i = 0; i < field.length; i++) {
            const s = field[i];
            s.x += s.drift * 0.008;
            if (s.x > width + 2) s.x = -2;
            const pulse = s.twinkle ? 1 + Math.sin(now * 0.001 + s.phase) * 0.12 : 1;
            drawPoint(s.x, s.y, s.size, s.alpha * pulse * intensity, false);
        }
    }

    function drawMiniGalaxy(now, visibility) {
        const mobile = width < 768;
        const cx = width * 0.70;
        const cy = height * 0.47;
        const R = Math.min(width, height) * (mobile ? 0.085 : 0.11);
        const rot = now * 0.000010;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.45);
        halo.addColorStop(0, 'rgba(255,232,208,' + (0.18 * visibility) + ')');
        halo.addColorStop(0.18, 'rgba(220,208,255,' + (0.07 * visibility) + ')');
        halo.addColorStop(0.52, 'rgba(110,130,210,' + (0.035 * visibility) + ')');
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
        ctx.fill();

        // Brazos continuos: se leen como estructura galáctica y no como puntos.
        for (let arm = 0; arm < 2; arm++) {
            for (let pass = 0; pass < 2; pass++) {
                ctx.beginPath();
                const hueWarm = pass === 0;
                for (let j = 0; j <= 90; j++) {
                    const u = j / 90;
                    const rr = R * (0.12 + u * 0.96);
                    const a = u * 5.0 * Math.PI + arm * Math.PI + rot;
                    const x = cx + Math.cos(a) * rr * 1.65;
                    const y = cy + Math.sin(a) * rr * 0.52;
                    if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = hueWarm
                    ? 'rgba(255,221,190,' + (0.12 * visibility) + ')'
                    : 'rgba(174,188,255,' + (0.10 * visibility) + ')';
                ctx.lineWidth = pass === 0 ? Math.max(1, R * 0.035) : Math.max(0.7, R * 0.018);
                ctx.stroke();
            }
        }

        for (let i = 0; i < galaxyStars.length; i++) {
            const s = galaxyStars[i];
            const a = s.theta + rot * (1.2 + s.radius * 1.4);
            const rr = R * s.radius;
            const x = cx + Math.cos(a) * rr * 1.60;
            const y = cy + Math.sin(a) * rr * 0.50;
            const tw = 1 + Math.sin(now * 0.0009 + s.phase) * 0.10;
            drawPoint(x, y, s.size, s.alpha * tw * visibility, s.warm);
        }

        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.34);
        core.addColorStop(0, 'rgba(255,248,232,' + (0.78 * visibility) + ')');
        core.addColorStop(0.24, 'rgba(255,220,174,' + (0.34 * visibility) + ')');
        core.addColorStop(1, 'rgba(255,180,120,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawBlackHoleLife(now, strength) {
        if (strength <= 0.01) return;
        const cx = width * 0.5;
        const cy = height * 0.44;
        const minD = Math.min(width, height);
        const r = minD * 0.16;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const glow = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r * 3.3);
        glow.addColorStop(0, 'rgba(255,214,164,' + (0.10 * strength) + ')');
        glow.addColorStop(0.25, 'rgba(255,172,109,' + (0.055 * strength) + ')');
        glow.addColorStop(0.58, 'rgba(148,125,235,' + (0.025 * strength) + ')');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 3.3, 0, Math.PI * 2);
        ctx.fill();

        // Capas asimétricas: cada una tiene velocidad/rotación distinta.
        for (let k = 0; k < 5; k++) {
            const q = k / 4;
            const rr = r * (1.02 + q * 0.82);
            const spin = now * (0.00016 + k * 0.000035);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(0.30 + spin);
            const g = ctx.createLinearGradient(-rr * 2.3, 0, rr * 2.3, 0);
            g.addColorStop(0, 'rgba(90,113,255,0)');
            g.addColorStop(0.16, 'rgba(122,150,255,' + (0.05 * strength) + ')');
            g.addColorStop(0.43, 'rgba(255,231,193,' + ((0.12 - q * 0.012) * strength) + ')');
            g.addColorStop(0.54, 'rgba(255,176,105,' + ((0.10 - q * 0.010) * strength) + ')');
            g.addColorStop(0.82, 'rgba(143,126,240,' + (0.04 * strength) + ')');
            g.addColorStop(1, 'rgba(70,86,190,0)');
            ctx.strokeStyle = g;
            ctx.lineWidth = Math.max(1.0, r * (0.026 - q * 0.003));
            ctx.beginPath();
            ctx.ellipse(0, 0, rr * 2.15, rr * (0.30 + 0.055 * q), 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (let i = 0; i < hotSpots.length; i++) {
            const s = hotSpots[i];
            const a = s.angle + now * s.speed;
            const rr = r * s.radius;
            const x = cx + Math.cos(a) * rr * 1.72;
            const y = cy + Math.sin(a) * rr * 0.34;
            const pulse = 1 + Math.sin(now * 0.002 + s.phase) * 0.22;
            const sz = s.size * pulse;
            ctx.globalAlpha = (0.16 + 0.10 * Math.sin(now * 0.001 + s.phase)) * strength;
            ctx.fillStyle = 'rgba(255,220,173,1)';
            ctx.beginPath();
            ctx.arc(x, y, sz, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.lineWidth = Math.max(0.45, r * 0.009);
        for (let i = 0; i < 18; i++) {
            const a = now * (0.00018 + (i % 4) * 0.000025) + i * 2.17;
            const r1 = r * (1.35 + (i % 5) * 0.18);
            const r2 = r1 + r * (0.24 + (i % 3) * 0.06);
            ctx.strokeStyle = 'rgba(255,209,159,' + (0.025 * strength) + ')';
            ctx.beginPath();
            ctx.arc(cx, cy, r2, a, a + 0.18 + (i % 5) * 0.025);
            ctx.stroke();
        }

        ctx.globalAlpha = (0.18 + Math.sin(now * 0.0017) * 0.055) * strength;
        ctx.strokeStyle = 'rgba(255,241,216,1)';
        ctx.lineWidth = Math.max(1, r * 0.018);
        ctx.beginPath();
        ctx.arc(cx, cy, r * (1.025 + Math.sin(now * 0.00075) * 0.006), 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    function reset() {
        original.style.transform = '';
        original.style.transformOrigin = '';
        original.style.visibility = '';
        if (nebula) nebula.style.visibility = '';
        ctx.clearRect(0, 0, width, height);
        canvas.style.display = 'none';
    }

    function draw(now) {
        if (!running) return;
        const t = musicTime(now);
        const initialEnd = reduced ? 9.0 : 16.15;
        const holeStart = reduced ? 20.6 : 24.5;
        const approachStart = reduced ? 23.7 : 28.3;
        const entryEnd = reduced ? 27.2 : 31.9;

        ctx.clearRect(0, 0, width, height);

        if (t < initialEnd) {
            original.style.visibility = 'hidden';
            if (nebula) nebula.style.visibility = 'hidden';
            canvas.style.display = 'block';
            const appear = ease((t - 2.35) / 3.8);
            const fade = t > initialEnd - 1.5 ? 1 - ease((t - (initialEnd - 1.5)) / 1.5) : 1;
            const v = clamp(appear * fade);
            ctx.fillStyle = 'rgba(0,1,5,' + (0.18 * v) + ')';
            ctx.fillRect(0, 0, width, height);
            drawField(now, v);
            drawMiniGalaxy(now, v);
        }

        if (t >= initialEnd && t < holeStart) {
            original.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            canvas.style.display = 'none';
        }

        if (t >= holeStart && t < entryEnd) {
            original.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            canvas.style.display = 'block';
            const life = ease((t - holeStart) / (approachStart - holeStart));
            drawBlackHoleLife(now, t < approachStart ? life : 1);

            if (t >= approachStart) {
                const p = ease((t - approachStart) / (entryEnd - approachStart));
                const zoom = lerp(1, 6.4, Math.pow(p, 1.35));
                original.style.transformOrigin = '50% 44%';
                original.style.transform = 'scale(' + zoom.toFixed(3) + ')';
                const q = ease((p - 0.58) / 0.42);
                if (q > 0) {
                    ctx.fillStyle = 'rgba(0,0,3,' + (0.16 + q * 0.84) + ')';
                    ctx.fillRect(0, 0, width, height);
                }
            }
        }

        if (t >= entryEnd) {
            reset();
            running = false;
            return;
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
        original.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        original.style.transformOrigin = '50% 44%';
        canvas.style.display = 'block';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();