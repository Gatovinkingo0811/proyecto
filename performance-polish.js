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
        return source.indexOf('updateCinema(now)') !== -1 && source.indexOf('ExperienceMusic.flush') !== -1;
    }

    window.requestAnimationFrame = function (fn) {
        if (lightIntro && isHeavyStarfieldCallback(fn)) return 0;
        return nativeRaf(fn);
    };

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
