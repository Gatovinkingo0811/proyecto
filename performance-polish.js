/* Optimización de la cinemática: durante el intro solo corre la capa visual ligera. */
(function () {
    'use strict';

    const nativeSetTimeout = window.setTimeout;
    const nativeRaf = window.requestAnimationFrame.bind(window);

    let lightIntro = false;
    let resumeTimer = 0;

    function isHeavyStarfieldCallback(fn) {
        if (typeof fn !== 'function') return false;
        let source = '';
        try { source = Function.prototype.toString.call(fn); } catch (_) {}
        return source.indexOf('updateCinema(now)') !== -1 &&
               source.indexOf('ExperienceMusic.flush') !== -1;
    }

    // El starfield original es mucho más caro que la capa visual ligera.
    // Mientras dura la travesía, no se agenda su siguiente frame.
    window.requestAnimationFrame = function (fn) {
        if (lightIntro && isHeavyStarfieldCallback(fn)) return 0;
        return nativeRaf(fn);
    };

    // Mantener intacta la optimización de apertura del mensaje.
    window.setTimeout = function (fn, delay, ...args) {
        if (typeof fn === 'function' && delay === 400) {
            let source = '';
            try { source = Function.prototype.toString.call(fn); } catch (_) {}
            if (source.indexOf('openModal(star)') !== -1) delay = 35;
        }
        return nativeSetTimeout(fn, delay, ...args);
    };

    function startLightMode() {
        lightIntro = true;
        if (window.__stopInitialSpaceEnhancement) {
            window.__stopInitialSpaceEnhancement();
        }

        // Se libera automáticamente al terminar la travesía de 39.5 s.
        const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const duration = reduced ? 18000 : 40500;
        clearTimeout(resumeTimer);
        resumeTimer = nativeSetTimeout(function () {
            lightIntro = false;
            if (typeof window.__kickStarfield === 'function') {
                window.__kickStarfield();
            }
        }, duration);
    }

    const beginButton = document.getElementById('intro-begin');
    if (beginButton) beginButton.addEventListener('click', startLightMode, { capture: true });
})();
