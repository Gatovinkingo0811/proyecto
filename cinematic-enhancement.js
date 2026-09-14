/* Enhanced cinematic bridge: preserves the existing experience and only adds
   a higher-fidelity black hole + zodiac reveal between the existing intro and
   Acuario interaction. No changes to constellation geometry or star messages. */
(function () {
  'use strict';

  const startBtn = document.getElementById('intro-begin');
  if (!startBtn) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'cinematic-enhanced-layer';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:10;pointer-events:none;opacity:0;transition:opacity 900ms cubic-bezier(.22,1,.36,1);';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let w = 0, h = 0, dpr = 1;
  let running = false;
  let t0 = 0;
  let raf = 0;
  let seed = 0;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const particles = [];
  const dust = [];

  function resize() {
    w = window.innerWidth;
    h = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
  }

  function rand(i) {
    const x = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildParticles() {
    particles.length = 0;
    dust.length = 0;
    const count = w < 700 ? 95 : 150;
    for (let i = 0; i < count; i++) {
      particles.push({
        a: rand(i) * Math.PI * 2,
        r: 0.08 + rand(i + 100) * 1.15,
        z: 0.12 + rand(i + 200) * 0.88,
        size: 0.35 + rand(i + 300) * 1.5,
        tw: rand(i + 400) * Math.PI * 2
      });
    }
    for (let i = 0; i < (w < 700 ? 16 : 26); i++) {
      dust.push({ x: rand(i + 700) * w, y: rand(i + 800) * h, a: 0.025 + rand(i + 900) * 0.055, r: 0.5 + rand(i + 1000) * 1.2 });
    }
  }

  function smooth(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function starField(now, intensity, warp) {
    const cx = w * 0.5, cy = h * 0.47;
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const angle = p.a + now * (0.00002 + p.z * 0.000025);
      const radius = p.r * Math.max(w, h) * (0.28 + p.z * 0.55);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius * 0.72;
      const depth = 0.35 + p.z * 0.65;
      const alpha = intensity * (0.18 + p.z * 0.68) * (0.72 + Math.sin(now * 0.001 + p.tw) * 0.18);
      if (warp > 0.02) {
        const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy) || 1;
        const streak = warp * (8 + len * 0.105) * depth;
        ctx.strokeStyle = 'rgba(226,235,255,' + clamp01(alpha) + ')';
        ctx.lineWidth = p.size * (0.55 + warp * 1.2);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx / len * streak, y + dy / len * streak);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(235,240,255,' + clamp01(alpha) + ')';
        ctx.beginPath();
        ctx.arc(x, y, p.size * (0.65 + depth), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBlackHole(now, p) {
    const cx = w * 0.5, cy = h * 0.46;
    const minD = Math.min(w, h);
    const R = minD * (0.105 + p * 0.18);
    const rot = now * 0.00022;

    const glow = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 5.8);
    glow.addColorStop(0, 'rgba(255,240,215,' + (0.18 * p) + ')');
    glow.addColorStop(0.2, 'rgba(255,190,120,' + (0.10 * p) + ')');
    glow.addColorStop(0.52, 'rgba(145,125,235,' + (0.045 * p) + ')');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 5.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.20 + Math.sin(now * 0.00013) * 0.012);
    ctx.globalCompositeOperation = 'screen';
    for (let k = 0; k < 7; k++) {
      const q = k / 6;
      const rr = R * (1.0 + q * 0.72);
      const alpha = (0.06 + 0.13 * (1 - q)) * p;
      const grad = ctx.createLinearGradient(-rr * 2.7, 0, rr * 2.7, 0);
      grad.addColorStop(0, 'rgba(92,118,255,0)');
      grad.addColorStop(0.18, 'rgba(116,145,255,' + (alpha * 0.5) + ')');
      grad.addColorStop(0.47, 'rgba(255,220,175,' + alpha + ')');
      grad.addColorStop(0.56, 'rgba(255,176,108,' + (alpha * 0.8) + ')');
      grad.addColorStop(0.82, 'rgba(115,105,235,' + (alpha * 0.5) + ')');
      grad.addColorStop(1, 'rgba(70,85,190,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1.2, R * (0.025 + 0.012 * (1 - q)));
      ctx.beginPath();
      ctx.ellipse(0, 0, rr * 2.15, rr * (0.42 + q * 0.08), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.globalCompositeOperation = 'screen';
    const ringGrad = ctx.createLinearGradient(-R * 1.5, -R, R * 1.5, R);
    ringGrad.addColorStop(0, 'rgba(110,130,255,' + (0.22 * p) + ')');
    ringGrad.addColorStop(0.28, 'rgba(255,246,224,' + (0.92 * p) + ')');
    ringGrad.addColorStop(0.52, 'rgba(255,190,120,' + (0.78 * p) + ')');
    ringGrad.addColorStop(0.74, 'rgba(180,150,255,' + (0.4 * p) + ')');
    ringGrad.addColorStop(1, 'rgba(80,100,230,' + (0.12 * p) + ')');
    ctx.strokeStyle = ringGrad;
    ctx.shadowColor = 'rgba(255,211,157,' + (0.8 * p) + ')';
    ctx.shadowBlur = R * 0.32;
    ctx.lineWidth = Math.max(1.2, R * 0.045);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.05, R * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const core = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R * 1.03);
    core.addColorStop(0, '#000');
    core.addColorStop(0.72, '#010106');
    core.addColorStop(0.94, 'rgba(1,1,6,.98)');
    core.addColorStop(1, 'rgba(1,1,6,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.04, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 18; i++) {
      const a = rot * (1.7 + i * 0.03) + i * 2.399;
      const rr = R * (1.2 + (i % 5) * 0.17);
      const x = cx + Math.cos(a) * rr * 1.75;
      const y = cy + Math.sin(a) * rr * 0.38;
      const a2 = (0.08 + 0.06 * Math.sin(i * 2.7 + now * 0.001)) * p;
      ctx.fillStyle = 'rgba(255,220,180,' + Math.max(0.015, a2) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + (i % 3) * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function revealZodiac(progress) {
    const celestial = document.getElementById('celestial-map');
    const universe = document.getElementById('universe-container');
    if (!celestial || !universe) return;
    if (progress < 0.72) universe.style.opacity = '0';
    else {
      const q = smooth((progress - 0.72) / 0.28);
      universe.style.opacity = String(q);
      universe.style.transform = 'scale(' + (0.72 + q * 0.28) + ')';
    }
    celestial.style.opacity = String(smooth(Math.min(1, progress / 0.34)));
  }

  function render(now) {
    if (!running) return;
    const elapsed = (now - t0) / 1000;
    const blackStart = reduced ? 15.0 : 23.6;
    const blackEnd = reduced ? 20.2 : 31.8;
    const zodiacStart = blackEnd - 0.5;
    const focusEnd = reduced ? 28.0 : 43.5;

    ctx.clearRect(0, 0, w, h);

    if (elapsed < blackStart) {
      canvas.style.opacity = '0';
    } else if (elapsed < blackEnd) {
      canvas.style.opacity = '1';
      const p = clamp01((elapsed - blackStart) / (blackEnd - blackStart));
      const approach = smooth(p);
      ctx.fillStyle = 'rgba(1,2,8,' + (0.12 + 0.26 * approach) + ')';
      ctx.fillRect(0, 0, w, h);
      starField(now, 0.34 * (1 - approach), 0.25 + approach * 0.8);
      drawBlackHole(now, approach);
      if (p > 0.72) {
        const q = smooth((p - 0.72) / 0.28);
        ctx.fillStyle = 'rgba(0,0,3,' + (q * q * 0.88) + ')';
        ctx.fillRect(0, 0, w, h);
      }
    } else if (elapsed < focusEnd) {
      canvas.style.opacity = '0';
      const p = clamp01((elapsed - zodiacStart) / (focusEnd - zodiacStart));
      revealZodiac(p);
      if (p < 0.76) document.body.classList.add('enhanced-cinema-lock');
      else document.body.classList.remove('enhanced-cinema-lock');
    } else {
      canvas.style.opacity = '0';
      revealZodiac(1);
      document.body.classList.remove('enhanced-cinema-lock');
      running = false;
      return;
    }

    raf = requestAnimationFrame(render);
  }

  function start() {
    if (running) return;
    running = true;
    seed = Math.floor(Math.random() * 100000);
    t0 = performance.now();
    resize();
    document.body.classList.add('enhanced-cinema');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(render);
  }

  startBtn.addEventListener('click', start, { capture: false });
  window.addEventListener('resize', resize, { passive: true });
  resize();
})();
