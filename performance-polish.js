/* Optimización real de la cinemática: cancela el render pesado ya programado y deja una sola capa animada. */
(function () {
    'use strict';

    const nativeSetTimeout = window.setTimeout;
    const nativeRaf = window.requestAnimationFrame.bind(window);
    const nativeCancelRaf = window.cancelAnimationFrame.bind(window);

    let lightIntro = false;
    let resumeTimer = 0;
    const pending = new Map();

    function sourceOf(fn) {
        if (typeof fn !== 'function') return '';
        try { return Function.prototype.toString.call(fn); } catch (_) { return ''; }
    }

    // Es el renderizador original de la cinemática. No tocamos su lógica ni sus
    // 14 estrellas: simplemente evitamos que consuma el hilo mientras usamos
    // la capa ligera de la intro.
    function isHeavyStarfieldCallback(fn) {
        const source = sourceOf(fn);
        return source.indexOf('updateCinema') !== -1 &&
               source.indexOf('ExperienceMusic.flush') !== -1;
    }

    // Registrar los RAF desde el principio permite cancelar también el frame que
    // script.js dejó en cola antes de que el usuario pulsara «Comenzar».
    window.requestAnimationFrame = function (fn) {
        if (lightIntro && isHeavyStarfieldCallback(fn)) return 0;
        const id = nativeRaf(function (now) {
            pending.delete(id);
            fn(now);
        });
        pending.set(id, fn);
        return id;
    };

    window.cancelAnimationFrame = function (id) {
        pending.delete(id);
        return nativeCancelRaf(id);
    };

    function cancelHeavyFrames() {
        for (const [id, fn] of pending) {
            if (!isHeavyStarfieldCallback(fn)) continue;
            nativeCancelRaf(id);
            pending.delete(id);
        }
    }

    window.setTimeout = function (fn, delay, ...args) {
        if (typeof fn === 'function' && delay === 400) {
            const source = sourceOf(fn);
            if (source.indexOf('openModal(star)') !== -1) delay = 35;
        }
        return nativeSetTimeout(fn, delay, ...args);
    };

    function startLightMode() {
        lightIntro = true;
        cancelHeavyFrames();

        if (typeof window.__stopInitialSpaceEnhancement === 'function') {
            window.__stopInitialSpaceEnhancement();
        }

        const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const duration = reduced ? 18000 : 40500;
        clearTimeout(resumeTimer);
        resumeTimer = nativeSetTimeout(function () {
            lightIntro = false;
            if (typeof window.__stopCinematicLayerFix === 'function') {
                window.__stopCinematicLayerFix();
            }
            const layer = document.getElementById('cinematic-layer-fix');
            if (layer) layer.style.display = 'none';
            if (typeof window.__kickStarfield === 'function') {
                window.__kickStarfield();
            }
        }, duration);
    }

    const beginButton = document.getElementById('intro-begin');
    if (beginButton) beginButton.addEventListener('click', startLightMode, { capture: true });
})();
