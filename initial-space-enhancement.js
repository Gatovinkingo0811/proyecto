/*
 * Intro cinematográfica basada en imágenes reales/ilustraciones de NASA.
 * No modifica la geometría, mensajes ni interacción de Acuario.
 *
 * La idea es simple: dejar de fabricar una galaxia con Canvas y usar material
 * visual ya terminado. Solo animamos cámara, escala y opacidad.
 */
(function () {
    'use strict';

    const baseCanvas = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!baseCanvas || !button) return;

    // Elimina cualquier capa vieja de las iteraciones anteriores.
    const old = document.getElementById('cinematic-polish-layer');
    if (old) old.remove();

    const GALAXY_SRC = 'https://science.nasa.gov/wp-content/uploads/2023/04/stsci-h-p1935b-f-3344x3055-1-jpg.webp';
    const BLACK_HOLE_SRC = 'https://science.nasa.gov/wp-content/uploads/2023/04/behemoth_blackhole-jpg.webp';

    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let startedAt = 0;
    let running = false;
    let raf = 0;

    const stage = document.createElement('div');
    stage.id = 'cinematic-image-stage';
    stage.setAttribute('aria-hidden', 'true');
    stage.style.cssText = [
        'position:fixed', 'inset:0', 'z-index:8', 'pointer-events:none',
        'overflow:hidden', 'display:none', 'background:#010207'
    ].join(';');

    const galaxy = document.createElement('div');
    const hole = document.createElement('div');
    [galaxy, hole].forEach((el) => {
        el.style.cssText = [
            'position:absolute', 'inset:-7%', 'background-repeat:no-repeat',
            'background-position:center center', 'background-size:cover',
            'will-change:transform,opacity', 'transform-origin:center center',
            'opacity:0'
        ].join(';');
        stage.appendChild(el);
    });

    galaxy.style.backgroundImage = `url("${GALAXY_SRC}")`;
    hole.style.backgroundImage = `url("${BLACK_HOLE_SRC}")`;
    document.body.appendChild(stage);

    // Pre-carga para que no aparezca un cuadro vacío cuando llegue el golpe.
    [GALAXY_SRC, BLACK_HOLE_SRC].forEach((src) => {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
    });

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function smooth(v) {
        v = clamp(v);
        return v * v * (3 - 2 * v);
    }

    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying() && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function show(el, opacity, scale, x = 0, y = 0) {
        el.style.opacity = String(opacity);
        el.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
    }

    function render(now) {
        if (!running) return;

        const raw = musicTime(now);
        const m = reduced ? 0.42 : 1;
        const t = raw / m;
        const galaxyStart = 2.43;
        const galaxyEnd = 24.5;
        const holeEnd = 31.9;

        galaxy.style.opacity = '0';
        hole.style.opacity = '0';

        if (t < galaxyStart) {
            stage.style.background = '#010207';
        } else if (t < galaxyEnd) {
            // Un fragmento de una galaxia enorme ocupa TODA la pantalla.
            // No mostramos la galaxia completa: la cámara ya está metida en ella.
            const enter = smooth((t - galaxyStart) / 1.7);
            const flight = smooth((t - galaxyStart) / (galaxyEnd - galaxyStart));
            const scale = 1.18 + flight * 0.72;
            const x = Math.sin(t * 0.13) * 15;
            const y = Math.cos(t * 0.10) * 11;
            stage.style.background = '#010207';
            show(galaxy, enter, scale, x, y);
        } else if (t < holeEnd) {
            // Salto limpio al agujero negro: una imagen diseñada para mostrar
            // el horizonte y las estrellas deformadas por la gravedad.
            const p = smooth((t - galaxyEnd) / (holeEnd - galaxyEnd));
            const fadeIn = smooth((t - galaxyEnd) / 0.8);
            const fadeOut = t > 31.15 ? 1 - smooth((t - 31.15) / 0.75) : 1;
            const alpha = fadeIn * fadeOut;
            const scale = 0.86 + p * 2.15;
            const x = Math.sin(t * 0.11) * (1 - p) * 10;
            const y = Math.cos(t * 0.09) * (1 - p) * 8;
            stage.style.background = '#000106';
            show(hole, alpha, scale, x, y);

            // La galaxia anterior desaparece suavemente al golpear el agujero.
            galaxy.style.opacity = String(1 - fadeIn);
        } else {
            stage.style.background = '#000000';
            stage.style.display = 'none';
            baseCanvas.style.visibility = '';
            if (nebula) nebula.style.visibility = '';
            running = false;
            cancelAnimationFrame(raf);
            return;
        }

        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        stage.style.display = 'block';
        raf = requestAnimationFrame(render);
    }

    function begin() {
        if (running) return;
        running = true;
        startedAt = performance.now();
        stage.style.display = 'block';
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(render);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', () => {
        // Las capas son CSS; no hace falta recalcular miles de partículas.
    }, { passive: true });
})();

/*
 * Fuentes visuales:
 * - Galaxia NGC 3147, NASA/ESA/Hubble.
 * - Behemoth Black Hole Illustration, NASA/ESA/STScI.
 */
