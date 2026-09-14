/*
 * Capa cinematográfica independiente para la intro.
 * NO toca la geometría, mensajes ni interacción de Acuario.
 *
 * Enfoque visual:
 *   1) El usuario no ve una "mini galaxia" flotando en una esquina.
 *      Ve un FRAGMENTO amplio de una galaxia, como si la cámara estuviera
 *      dentro de uno de sus brazos.
 *   2) Las estrellas son puntos circulares suaves, no cuadrados.
 *   3) El agujero negro no usa anillos elípticos cerrados. El disco es una
 *      corriente irregular de plasma, con nubes, filamentos, lente gravitatoria
 *      y un horizonte negro perfectamente redondo.
 *   4) La entrada al agujero negro se construye estirando el entorno hacia él.
 *
 * Rendimiento: canvas independiente, cantidades moderadas y sin raymarching.
 */
(function () {
    'use strict';

    const baseCanvas = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!baseCanvas || !button) return;

    let layer = document.getElementById('cinematic-polish-layer');
    if (!layer) {
        layer = document.createElement('canvas');
        layer.id = 'cinematic-polish-layer';
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;display:none;';
        document.body.appendChild(layer);
    }

    const ctx = layer.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = false;
    let startAt = 0;
    let seed = 9173;

    let stars = [];
    let dust = [];
    let plasma = [];

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function smooth(v) {
        v = clamp(v);
        return v * v * (3 - 2 * v);
    }

    function rnd(i, s = 7) {
        const n = Math.sin((i + 1) * 127.17 + s * 37.91 + seed * 0.17) * 43758.5453;
        return n - Math.floor(n);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying() && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startAt) / 1000;
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 1.35);
        layer.width = Math.round(width * dpr);
        layer.height = Math.round(height * dpr);
        layer.style.width = width + 'px';
        layer.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildScene();
    }

    function buildScene() {
        const mobile = width < 768;
        const starCount = mobile ? 105 : 180;
        const dustCount = mobile ? 150 : 270;
        const plasmaCount = mobile ? 70 : 115;

        stars = [];
        dust = [];
        plasma = [];

        for (let i = 0; i < starCount; i++) {
            stars.push({
                x: rnd(i + 10, 11),
                y: rnd(i + 100, 13),
                r: 0.35 + Math.pow(rnd(i + 200, 17), 2.1) * 1.45,
                a: 0.10 + rnd(i + 300, 19) * 0.42,
                phase: rnd(i + 400, 23) * Math.PI * 2,
                warm: rnd(i + 500, 29) > 0.84
            });
        }

        for (let i = 0; i < dustCount; i++) {
            // t recorre un brazo de galaxia amplio que cruza la pantalla.
            const t = rnd(i + 600, 31);
            const spread = (rnd(i + 700, 37) - 0.5) * (0.10 + t * 0.22);
            const wave = Math.sin(t * Math.PI * 2.25) * 0.045;
            const x = t;
            const y = clamp(0.72 - t * 0.62 + wave + spread, -0.08, 1.08);
            dust.push({
                t,
                x,
                y,
                size: 0.35 + Math.pow(rnd(i + 800, 41), 2.8) * 1.55,
                a: 0.035 + Math.pow(1 - Math.abs(t - 0.55), 1.7) * 0.13 + rnd(i + 900, 43) * 0.07,
                warm: rnd(i + 1000, 47) > 0.86,
                phase: rnd(i + 1100, 53) * Math.PI * 2
            });
        }

        for (let i = 0; i < plasmaCount; i++) {
            plasma.push({
                theta: rnd(i + 1200, 59) * Math.PI * 2,
                radius: 1.04 + Math.pow(rnd(i + 1300, 61), 0.65) * 1.35,
                speed: 0.00025 + rnd(i + 1400, 67) * 0.00072,
                size: 0.45 + rnd(i + 1500, 71) * 1.65,
                alpha: 0.14 + rnd(i + 1600, 73) * 0.46,
                phase: rnd(i + 1700, 79) * Math.PI * 2,
                bias: rnd(i + 1800, 83)
            });
        }
    }

    function drawStar(x, y, r, alpha, warm = false) {
        if (alpha <= 0.004) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = warm ? '#ffe9d5' : '#eaf1ff';
        ctx.shadowColor = warm ? 'rgba(255,186,124,0.38)' : 'rgba(177,207,255,0.30)';
        ctx.shadowBlur = r > 1 ? r * 4.5 : r * 2.5;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.35, r), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawDeepSpace(now, alpha, phase = 0) {
        if (alpha <= 0) return;

        // Base natural, sin manchas ovaladas gigantes.
        ctx.fillStyle = 'rgba(1,3,10,' + (0.94 * alpha) + ')';
        ctx.fillRect(0, 0, width, height);

        // Nube difusa de fondo: manchas amplias, asimétricas y muy transparentes.
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const nebulaBands = [
            { x: 0.18, y: 0.18, r: 0.30, c: '95,118,180', a: 0.045 },
            { x: 0.82, y: 0.73, r: 0.34, c: '69,78,145', a: 0.038 },
            { x: 0.46, y: 0.50, r: 0.27, c: '130,101,150', a: 0.028 }
        ];
        nebulaBands.forEach((b, i) => {
            const cx = width * b.x + Math.sin(now * 0.00005 + i) * width * 0.015;
            const cy = height * b.y + Math.cos(now * 0.00007 + i * 2) * height * 0.012;
            const rr = Math.min(width, height) * b.r;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
            g.addColorStop(0, 'rgba(' + b.c + ',' + (b.a * alpha) + ')');
            g.addColorStop(0.55, 'rgba(' + b.c + ',' + (b.a * 0.42 * alpha) + ')');
            g.addColorStop(1, 'rgba(' + b.c + ',0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(cx, cy, rr, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // Estrellas puntuales repartidas por profundidad.
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const tw = 1 + Math.sin(now * 0.0010 + s.phase) * 0.11;
            const driftX = phase * (s.x - 0.5) * width * 0.02;
            const driftY = phase * (s.y - 0.5) * height * 0.02;
            drawStar(s.x * width + driftX, s.y * height + driftY, s.r, s.a * tw * alpha, s.warm);
        }

        // Fragmento de brazo galáctico: ocupa gran parte del encuadre.
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.lineCap = 'round';
        for (let pass = 0; pass < 4; pass++) {
            ctx.beginPath();
            const offset = (pass - 1.5) * height * 0.025;
            const x0 = -width * 0.12;
            const y0 = height * (0.83 + pass * 0.004) + offset;
            const x1 = width * 0.36;
            const y1 = height * (0.61 + pass * 0.006) + offset;
            const x2 = width * 0.78;
            const y2 = height * (0.40 + pass * 0.008) + offset;
            const x3 = width * 1.10;
            const y3 = height * (0.26 + pass * 0.008) + offset;
            ctx.moveTo(x0, y0);
            ctx.bezierCurveTo(x1 * 0.55, y0 - height * 0.06, x1 * 0.72, y1 + height * 0.03, x1, y1);
            ctx.bezierCurveTo(x1 + width * 0.20, y1 - height * 0.08, x2 - width * 0.14, y2 + height * 0.04, x2, y2);
            ctx.bezierCurveTo(x2 + width * 0.14, y2 - height * 0.07, x3 - width * 0.12, y3 + height * 0.03, x3, y3);
            ctx.strokeStyle = pass % 2 === 0
                ? 'rgba(203,214,255,' + (0.040 * alpha) + ')'
                : 'rgba(255,210,176,' + (0.026 * alpha) + ')';
            ctx.lineWidth = Math.max(2, Math.min(width, height) * (0.010 + pass * 0.003));
            ctx.shadowColor = pass % 2 === 0 ? 'rgba(142,170,255,0.16)' : 'rgba(255,170,110,0.11)';
            ctx.shadowBlur = Math.min(width, height) * 0.035;
            ctx.stroke();
        }

        for (let i = 0; i < dust.length; i++) {
            const d = dust[i];
            const wobble = Math.sin(now * 0.00055 + d.phase) * 0.008;
            const x = (d.x + phase * 0.025) * width;
            const y = clamp(d.y + wobble, -0.08, 1.08) * height;
            drawStar(x, y, d.size, d.a * alpha, d.warm);
        }
        ctx.restore();
    }

    function curvedPoint(cx, cy, radius, theta, flatten, wobble, side) {
        // No es una elipse dibujada como forma cerrada: cada punto nace de una
        // trayectoria distinta y recibe ruido para que el plasma se sienta orgánico.
        const rr = radius * (1 + Math.sin(theta * 4.7 + side * 1.8) * wobble + Math.sin(theta * 11.0 + 0.7) * wobble * 0.42);
        const bend = Math.sin(theta * 1.8 + side) * radius * 0.045;
        return {
            x: cx + Math.cos(theta) * rr + bend,
            y: cy + Math.sin(theta) * rr * flatten
        };
    }

    function strokeFragment(cx, cy, radius, theta0, theta1, flatten, widthPx, alpha, warmBias, now, lane) {
        if (alpha <= 0.002) return;
        const steps = 22;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const q = i / steps;
            const theta = lerp(theta0, theta1, q);
            const wobble = 0.015 + 0.018 * Math.sin(now * 0.0008 + lane);
            const pt = curvedPoint(cx, cy, radius, theta, flatten, wobble, lane);
            if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
        }

        const hot = Math.max(0, Math.min(1, Math.sin((theta0 + theta1) * 0.85 + lane) * 0.5 + 0.5));
        const warm = clamp(warmBias * 0.65 + hot * 0.35);
        ctx.lineCap = 'round';
        ctx.lineWidth = widthPx;
        ctx.strokeStyle = warm > 0.55
            ? 'rgba(255,195,132,' + alpha + ')'
            : 'rgba(187,201,255,' + alpha + ')';
        ctx.shadowColor = warm > 0.55
            ? 'rgba(255,133,62,' + (alpha * 0.55) + ')'
            : 'rgba(125,155,255,' + (alpha * 0.38) + ')';
        ctx.shadowBlur = widthPx * 2.8;
        ctx.stroke();
    }

    function drawBlackHole(now, progress) {
        const mobile = width < 768;
        const cx = width * 0.50;
        const cy = height * 0.455;
        const base = Math.min(width, height);
        const r = base * (0.105 + smooth(progress) * 0.052);
        const p = smooth(progress);

        // Mantener el espacio visible detrás: NO aparece un "óvalo de fondo".
        drawDeepSpace(now, 0.92, p);

        // Campo gravitacional suave alrededor del horizonte.
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const g = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 4.7);
        g.addColorStop(0, 'rgba(255,211,164,' + (0.14 + p * 0.11) + ')');
        g.addColorStop(0.18, 'rgba(255,148,83,' + (0.052 + p * 0.035) + ')');
        g.addColorStop(0.44, 'rgba(120,137,225,' + (0.026 + p * 0.018) + ')');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 4.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Disco: una corriente irregular en varias zonas, NO un anillo cerrado.
        // Las trayectorias dejan huecos deliberados y cambian de curvatura.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const lanes = mobile ? 30 : 44;
        for (let i = 0; i < lanes; i++) {
            const q = rnd(i + 1900, 89);
            const radius = r * (1.06 + q * 1.75);
            const lane = i * 0.73 + q * 1.9;
            const side = i % 3;
            const flatten = 0.18 + q * 0.25;
            const start = side === 0
                ? -2.82 + rnd(i + 2000, 97) * 0.95
                : side === 1
                    ? 0.28 + rnd(i + 2100, 101) * 1.25
                    : 1.92 + rnd(i + 2200, 103) * 0.82;
            const span = 0.16 + rnd(i + 2300, 107) * 0.42;
            const alpha = (0.045 + (1 - q) * 0.13) * (0.82 + p * 0.42);
            const widthPx = Math.max(0.75, base * (0.0018 + (1 - q) * 0.0046));
            strokeFragment(cx, cy, radius, start + now * 0.000055, start + span + now * 0.000055, flatten, widthPx, alpha, q, now, lane);
        }
        ctx.restore();

        // Plasma caliente que circula y pulsa individualmente.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < plasma.length; i++) {
            const h = plasma[i];
            const theta = h.theta + now * h.speed;
            const rr = r * h.radius * (1 - p * 0.10);
            const flatten = 0.19 + (1 - h.bias) * 0.20;
            const pt = curvedPoint(cx, cy, rr, theta, flatten, 0.012, i * 0.37);
            const pulse = 1 + Math.sin(now * 0.0020 + h.phase) * 0.25;
            const size = h.size * pulse * (0.9 + p * 0.35);
            const warm = h.bias > 0.35;

            ctx.globalAlpha = h.alpha * (0.58 + p * 0.48);
            ctx.fillStyle = warm ? '#ffd5a1' : '#dbe5ff';
            ctx.shadowColor = warm ? 'rgba(255,126,53,0.75)' : 'rgba(125,160,255,0.62)';
            ctx.shadowBlur = size * 5.0;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(0.45, size * 0.58), 0, Math.PI * 2);
            ctx.fill();

            // Estela corta: cada partícula deixa um rastro propio, não una línea fija.
            ctx.globalAlpha *= 0.38;
            ctx.lineWidth = Math.max(0.35, size * 0.42);
            ctx.beginPath();
            const back = curvedPoint(cx, cy, rr * 0.995, theta - 0.085, flatten, 0.012, i * 0.37);
            ctx.moveTo(back.x, back.y);
            ctx.lineTo(pt.x, pt.y);
            ctx.strokeStyle = warm ? '#ffbd7a' : '#b8c9ff';
            ctx.stroke();
        }
        ctx.restore();

        // Lente gravitatoria: pequeñas corrientes luminosas que rodean el horizonte.
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const arcCount = mobile ? 16 : 24;
        for (let i = 0; i < arcCount; i++) {
            const ang = (i / arcCount) * Math.PI * 2 + now * 0.00008;
            const spread = 0.26 + rnd(i + 2400, 109) * 0.42;
            const rr = r * (1.65 + rnd(i + 2500, 113) * 0.95);
            const a0 = ang - spread * 0.5;
            const a1 = ang + spread * 0.5;
            const alpha = (0.018 + rnd(i + 2600, 127) * 0.035) * (0.75 + p * 0.65);
            strokeFragment(cx, cy, rr, a0, a1, 0.38, Math.max(0.45, base * 0.0012), alpha, i % 2, now, i + 12);
        }
        ctx.restore();

        // Horizonte de sucesos: círculo negro limpio. El disco NO está cerrado.
        ctx.save();
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.04);
        core.addColorStop(0, '#000000');
        core.addColorStop(0.76, '#000000');
        core.addColorStop(0.93, 'rgba(0,0,0,0.98)');
        core.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
        ctx.fill();

        // Brillo extremadamente fino e incompleto del photon ring: no forma aro de planeta.
        ctx.globalAlpha = 0.18 + p * 0.12;
        ctx.strokeStyle = '#fff0d2';
        ctx.lineWidth = Math.max(0.65, base * 0.00125);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.055, -2.86, 0.94);
        ctx.stroke();
        ctx.restore();

        // Entrada: el espacio se estira radialmente hacia el centro, no corta a negro.
        if (p > 0.18) {
            const q = smooth((p - 0.18) / 0.82);
            ctx.save();
            ctx.globalCompositeOperation = 'screen';
            const streaks = mobile ? 20 : 34;
            for (let i = 0; i < streaks; i++) {
                const a = rnd(i + 2700, 131) * Math.PI * 2;
                const startR = r * (2.2 + rnd(i + 2800, 137) * 3.4);
                const endR = r * (1.02 + rnd(i + 2900, 139) * 0.9);
                const x1 = cx + Math.cos(a) * startR;
                const y1 = cy + Math.sin(a) * startR;
                const x2 = cx + Math.cos(a) * endR;
                const y2 = cy + Math.sin(a) * endR;
                ctx.globalAlpha = 0.025 + rnd(i + 3000, 149) * 0.045 * q;
                ctx.lineWidth = 0.4 + rnd(i + 3100, 151) * 0.8;
                ctx.strokeStyle = '#dce5ff';
                ctx.beginPath();
                ctx.moveTo(lerp(x1, x2, q * 0.2), lerp(y1, y2, q * 0.2));
                ctx.lineTo(lerp(x1, x2, q * 0.92), lerp(y1, y2, q * 0.92));
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    function draw(now) {
        if (!running) return;

        const t = musicTime(now);
        const galaxyEnd = reduced ? 9.2 : 16.15;
        const holeStart = reduced ? 20.6 : 24.5;
        const approachStart = reduced ? 23.7 : 28.3;
        const entryEnd = reduced ? 27.2 : 31.9;

        ctx.clearRect(0, 0, width, height);

        if (t < galaxyEnd) {
            baseCanvas.style.visibility = 'hidden';
            if (nebula) nebula.style.visibility = 'hidden';
            layer.style.display = 'block';

            const appear = smooth((t - (reduced ? 1.0 : 2.43)) / 1.8);
            const fade = t > galaxyEnd - 1.25 ? 1 - smooth((t - (galaxyEnd - 1.25)) / 1.25) : 1;
            const a = clamp(appear * fade);
            drawDeepSpace(now, a, 0.0);
        }

        if (t >= galaxyEnd && t < holeStart) {
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            layer.style.display = 'none';
        }

        if (t >= holeStart && t < entryEnd) {
            baseCanvas.style.visibility = 'hidden';
            if (nebula) nebula.style.visibility = 'hidden';
            layer.style.display = 'block';

            const p = t < approachStart
                ? smooth((t - holeStart) / Math.max(0.1, approachStart - holeStart))
                : smooth((t - approachStart) / Math.max(0.1, entryEnd - approachStart));

            drawBlackHole(now, p);
        }

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        if (t >= entryEnd) {
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            ctx.clearRect(0, 0, width, height);
            layer.style.display = 'none';
            running = false;
            cancelAnimationFrame(raf);
            return;
        }

        raf = requestAnimationFrame(draw);
    }

    function begin() {
        if (running) return;
        running = true;
        startAt = performance.now();
        seed = Math.floor(Math.random() * 1000000);
        resize();
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        layer.style.display = 'block';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resize, { passive: true });
    resize();
})();