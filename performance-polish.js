/* Ajustes puntuales de rendimiento/interacción. No cambia la lógica de estrellas. */
(function () {
    'use strict';

    // script.js espera 400 ms antes de abrir el mensaje. Esa espera se siente
    // como lag al tocar una estrella; la reducimos sin tocar su flujo interno.
    const nativeSetTimeout = window.setTimeout;
    window.setTimeout = function (fn, delay, ...args) {
        if (typeof fn === 'function' && delay === 400) {
            let source = '';
            try { source = Function.prototype.toString.call(fn); } catch (_) {}
            if (source.indexOf('openModal(star)') !== -1) {
                delay = 35;
            }
        }
        return nativeSetTimeout(fn, delay, ...args);
    };
})();
