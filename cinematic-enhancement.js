/*
 * Mejora visual AISLADA del cielo estelar inicial.
 * No crea agujero negro, no crea zodíaco, no cambia Acuario y no modifica
 * la línea temporal principal de script.js. Solo sustituye visualmente el
 * cielo durante el tramo inicial y devuelve el control al render existente.
 */
(function () {
  'use strict';

  const originalCanvas = document.getElementById('starfield');
  const startBtn = document.getElementById('intro-begin');
  if (!originalCanvas || !startBtn) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'initial-space-enhancer';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = [
    'position:fixed',
    'inset:0',
    'width:100%',
    'height:100%',
    'z-index:1',
    'pointer-events:none',
    'opacity:0',
    'display:none'
  ].join(';');
  originalCanvas.parentNode.insertBefore(canvas, originalCanvas.nextSibling);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let raf = 0;
  let running = false;
  let startTime = 0;
  let seed = 0;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function smooth(v) {
    v = clamp(v, 0, 1);
    return v * v * (3 - 2 * v);
  }

  function random(i) {
    const x = Math.sin((i + 1) * 127.17 + seed * 0.017) * 43758.5453;
    return x - Math.floor(x);
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
    const count = mobile ? 78 : 128;
    stars = [];

    for (let i = 0; i < count; i++) {
      const layer = i < count * 0.64 ? 0 : (i < count * 0.9 ? 1 : 2);
      const r = random(i + 10);

      stars.push({
        x: random(i + 100) * width,
        y: random(i + 200) * height,
        layer,
        size: layer === 0
          ? 0.35 + random(i + 300) * 0.45
          : layer === 1
            ? 0.55 + random(i + 400) * 0.75
            : 0.8 + random(i + 500) * 1.05,
        alpha: layer === 0
          ? 0.22 + random(i + 600) * 0.32
          : layer === 1
            ? 0.34 + random(i + 700) * 0.38
            : 0.5 + random(i + 800) * 0.4,
        twinkle: layer === 0 ? 0 : (random(i + 900) < 0.34 ? 0.45 + random(i + 1000) : 0),
        phase: random(i + 1100) * Math.PI * 2,
        drift: layer === 0 ? 0.001 : (layer === 1 ? 0.003 : 0.006),
        flare: layer === 2 && r > 0.57
      });
    }
  }

  function drawMicroStar(s, alpha) {
    if (alpha <= 0.01) return;

    const core = Math.max(0.3, s.size * 0.56);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(232,238,255,1)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, core, 0, Math.PI * 2);
    ctx.fill();

    // Solo algunas estrellas cercanas tienen una cruz de difracción muy fina.
    // Esto rompe el aspecto de "círculos iguales" sin llenar la pantalla.
    if (s.flare && s.size > 1) {
      const ray = s.size * 3.8;
      const shortRay = s.size * 1.35;

      const horizontal = ctx.createLinearGradient(s.x - ray, s.y, s.x + ray, s.y);
      horizontal.addColorStop(0, 'rgba(225,235,255,0)');
      horizontal.addColorStop(0.5, 'rgba(238,244,255,' + (alpha * 0.65) + ')');
      horizontal.addColorStop(1, 'rgba(225,235,255,0)');
      ctx.strokeStyle = horizontal;
      ctx.lineWidth = Math.max(0.45, s.size * 0.22);
      ctx.beginPath();
      ctx.moveTo(s.x - ray, s.y);
      ctx.lineTo(s.x + ray, s.y);
      ctx.stroke();

      const vertical = ctx.createLinearGradient(s.x, s.y - shortRay, s.x, s.y + shortRay);
      vertical.addColorStop(0, 'rgba(225,235,255,0)');
      vertical.addColorStop(0.5, 'rgba(238,244,255,' + (alpha * 0.45) + ')');
      vertical.addColorStop(1, 'rgba(225,235,255,0)');
      ctx.strokeStyle = vertical;
      ctx.lineWidth = Math.max(0.35, s.size * 0.17);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - shortRay);
      ctx.lineTo(s.x, s.y + shortRay);
      ctx.stroke();
    }
  }

  function release() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    ctx.clearRect(0, 0, width, height);
    canvas.style.opacity = '0';
    canvas.style.display = 'none';
    originalCanvas.style.visibility = '';
  }

  function draw(now) {
    if (!running) return;

    const elapsed = (now - startTime) / 1000;
    const music = window.ExperienceMusic;
    const musicTime = music && typeof music.isPlaying === 'function' && music.isPlaying() &&
      typeof music.now === 'function' ? music.now() : elapsed;

    // Esta capa vive únicamente en el espacio previo al warp.
    const revealAt = 2.4;
    const releaseAt = reducedMotion ? 9.0 : 16.0;

    if (musicTime >= releaseAt) {
      release();
      return;
    }

    const reveal = smooth((musicTime - revealAt) / 3.8);
    const fadeOut = musicTime > releaseAt - 1.6
      ? 1 - smooth((musicTime - (releaseAt - 1.6)) / 1.6)
      : 1;
    const overall = clamp(reveal * fadeOut, 0, 1);

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += s.drift;
      if (s.x > width + 4) s.x = -4;

      const twinkle = s.twinkle
        ? 1 + Math.sin(now * 0.00115 + s.phase) * 0.14
        : 1;

      drawMicroStar(s, clamp(s.alpha * twinkle * overall, 0, 1));
    }

    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  function begin() {
    if (running) return;

    running = true;
    startTime = performance.now();
    seed = Math.floor(Math.random() * 100000);
    resize();

    // El render original sigue funcionando por debajo durante el inicio, pero
    // queda visualmente oculto mientras esta versión está activa. Al liberar,
    // vuelve exactamente a su estado normal para el resto de la cinemática.
    originalCanvas.style.visibility = 'hidden';
    canvas.style.display = 'block';
    canvas.style.opacity = '1';

    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }

  startBtn.addEventListener('click', begin, { capture: false });
  window.addEventListener('resize', resize, { passive: true });
  resize();
})();
