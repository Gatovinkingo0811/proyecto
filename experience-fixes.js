/*
 * Correcciones de la experiencia:
 * - Evita una segunda capa cinematográfica/interactiva.
 * - Ralentiza SOLO el reloj visual de la cinemática sin cambiar la velocidad del audio.
 * - Mantiene las líneas ocultas hasta que existan estrellas descubiertas.
 * - El cielo nunca se convierte en una superficie de clic completa.
 */
(function () {
    'use strict';

    var SLOW_FACTOR = 0.80;
    var music = window.ExperienceMusic;

    if (music && typeof music.now === 'function' && !music.__visualSlowPatch) {
        var originalNow = music.now.bind(music);
        music.now = function () {
            var t = originalNow();
            if (!Number.isFinite(t)) return t;

            // Solo ralentizamos el reloj narrativo mientras dura la cinemática.
            // La música continúa a su velocidad normal.
            if (document.body.classList.contains('cinema-lock')) {
                return t * SLOW_FACTOR;
            }
            return t;
        };
        music.__visualSlowPatch = true;
    }

    function enforceInteractionBoundaries() {
        var cinematicCanvas = document.getElementById('cinematic-sky');
        if (cinematicCanvas) {
            cinematicCanvas.style.pointerEvents = 'none';
            cinematicCanvas.style.cursor = 'default';
        }

        var lines = document.querySelectorAll('#constellation-lines .const-line');
        lines.forEach(function (line) {
            if (!line.classList.contains('active')) {
                line.style.strokeOpacity = '0';
                line.style.pointerEvents = 'none';
            } else {
                line.style.strokeOpacity = '';
                line.style.pointerEvents = 'none';
            }
        });
    }

    function init() {
        enforceInteractionBoundaries();

        var linesRoot = document.getElementById('constellation-lines');
        if (linesRoot && window.MutationObserver) {
            var observer = new MutationObserver(enforceInteractionBoundaries);
            observer.observe(linesRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        }

        // Refuerzo: solo los nodos de estrellas pueden recibir puntero/touch.
        var starsContainer = document.getElementById('stars-container');
        if (starsContainer) {
            starsContainer.style.pointerEvents = 'none';
            var starObserver = new MutationObserver(function () {
                starsContainer.querySelectorAll('.star-node').forEach(function (node) {
                    node.style.pointerEvents = node.classList.contains('hidden') || node.classList.contains('revealed')
                        ? 'none'
                        : 'auto';
                });
            });
            starObserver.observe(starsContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
            starObserver.takeRecords();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
