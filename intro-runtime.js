/* Runtime único de intro. No añade canvas ni motores visuales duplicados. */
(function () {
    'use strict';

    var beginButton = document.getElementById('intro-begin');
    var oldCanvas = document.getElementById('starfield');
    if (!beginButton || !oldCanvas) return;

    var started = false;
    var nativeRAF = window.requestAnimationFrame.bind(window);
    var nativeCancelRAF = window.cancelAnimationFrame.bind(window);
    var nativeSetTimeout = window.setTimeout.bind(window);
    var nativeClearTimeout = window.clearTimeout.bind(window);
    var cinemaRunning = false;

    // El canvas original se conserva porque script.js lo usa como reloj de la
    // cinemática. Durante la intro no debe rasterizar sus cientos de operaciones.
    var originalGetContext = HTMLCanvasElement.prototype.getContext;
    var originalContexts = new WeakSet();
    var drawingMethods = [
        'clearRect','fillRect','strokeRect','beginPath','closePath','moveTo','lineTo',
        'quadraticCurveTo','bezierCurveTo','arc','arcTo','ellipse','rect','fill','stroke',
        'clip','drawImage','putImageData','fillText','strokeText','setTransform','resetTransform',
        'transform','translate','rotate','scale','save','restore'
    ];

    function patchContext(ctx) {
        if (!ctx || originalContexts.has(ctx)) return ctx;
        originalContexts.add(ctx);
        drawingMethods.forEach(function (name) {
            if (typeof ctx[name] === 'function') ctx[name] = function () {};
        });
        // Los gradientes siguen siendo objetos reales para que fillStyle/strokeStyle
        // sigan siendo válidos; simplemente nunca llegan a rasterizarse porque fill/stroke
        // están anulados durante esta fase.
        return ctx;
    }

    HTMLCanvasElement.prototype.getContext = function (type, options) {
        var ctx = originalGetContext.call(this, type, options);
        if (this.id === 'starfield' && type === '2d') patchContext(ctx);
        return ctx;
    };

    function fnSource(fn) {
        try { return Function.prototype.toString.call(fn); } catch (_) { return ''; }
    }

    function isOriginalStarfieldLoop(fn) {
        var s = fnSource(fn);
        return s.indexOf('updateCinema(now)') !== -1 && s.indexOf('ExperienceMusic.flush') !== -1;
    }

    // El starfield original funciona como reloj de la partitura, no como renderer.
    // Se actualiza a ~30 Hz solo mientras la cinemática está activa.
    window.requestAnimationFrame = function (fn) {
        if (isOriginalStarfieldLoop(fn)) {
            if (!cinemaRunning) return 0;
            return nativeSetTimeout(function () { fn(performance.now()); }, 33);
        }
        return nativeRAF(fn);
    };

    window.cancelAnimationFrame = function (id) {
        if (!id) return;
        nativeClearTimeout(id);
        try { nativeCancelRAF(id); } catch (_) {}
    };

    function makeStars() {
        var layer = document.createElement('div');
        layer.id = 'intro-space-lite';
        layer.setAttribute('aria-hidden', 'true');
        var camera = document.createElement('div');
        camera.className = 'intro-space-camera';
        var milky = document.createElement('div');
        milky.className = 'intro-milkyway';
        var haze = document.createElement('div');
        haze.className = 'intro-haze';
        var stars = document.createElement('div');
        stars.className = 'intro-stars';

        var seed = 811211;
        function rnd() {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        }
        var count = window.innerWidth < 768 ? 82 : 125;
        for (var i = 0; i < count; i++) {
            var s = document.createElement('span');
            var q = rnd();
            var size = q > 0.94 ? 2.2 + rnd() * 1.3 : q > 0.68 ? 1.1 + rnd() * .8 : .55 + rnd() * .65;
            var alpha = q > 0.94 ? .68 + rnd() * .22 : q > 0.68 ? .28 + rnd() * .30 : .10 + rnd() * .18;
            s.className = 'intro-star' + (q > .90 && q < .98 ? ' twinkle' : '') + (q > .97 ? ' cross' : '');
            s.style.left = (rnd() * 100).toFixed(3) + '%';
            s.style.top = (rnd() * 100).toFixed(3) + '%';
            s.style.width = size.toFixed(2) + 'px';
            s.style.height = size.toFixed(2) + 'px';
            s.style.opacity = alpha.toFixed(3);
            if (s.className.indexOf('twinkle') !== -1) {
                s.style.setProperty('--twinkle', (2.8 + rnd() * 3.8).toFixed(2) + 's');
                s.style.setProperty('--delay', (-rnd() * 4).toFixed(2) + 's');
            }
            stars.appendChild(s);
        }

        var meteorA = document.createElement('div'); meteorA.className = 'intro-meteor meteor-a';
        var meteorB = document.createElement('div'); meteorB.className = 'intro-meteor meteor-b';
        var hole = document.createElement('div'); hole.className = 'intro-hole';
        var disk = document.createElement('div'); disk.className = 'intro-hole-disk';
        var ring = document.createElement('div'); ring.className = 'intro-hole-ring';
        var core = document.createElement('div'); core.className = 'intro-hole-core';
        hole.appendChild(disk); hole.appendChild(ring); hole.appendChild(core);

        camera.appendChild(milky);
        camera.appendChild(haze);
        camera.appendChild(stars);
        camera.appendChild(meteorA);
        camera.appendChild(meteorB);
        camera.appendChild(hole);
        layer.appendChild(camera);
        document.body.insertBefore(layer, document.getElementById('intro-overlay'));
        return layer;
    }

    function schedule(fn, ms) { return nativeSetTimeout(fn, ms); }

    function start() {
        if (started) return;
        started = true;
        cinemaRunning = true;
        oldCanvas.style.visibility = 'hidden';
        oldCanvas.style.pointerEvents = 'none';
        var nebula = document.getElementById('nebula');
        if (nebula) nebula.style.visibility = 'hidden';
        var lite = makeStars();
        nativeRAF(function () { lite.classList.add('show'); });

        schedule(function () {
            if (lite.parentNode) lite.parentNode.removeChild(lite);
            cinemaRunning = false;
            oldCanvas.style.visibility = 'hidden';
        }, 41000);
    }

    beginButton.addEventListener('click', start, { capture: true });
    beginButton.addEventListener('touchend', start, { capture: true, passive: false });

    document.addEventListener('visibilitychange', function () {
        if (document.hidden) cinemaRunning = false;
        else if (started && !document.body.classList.contains('constellation-complete')) cinemaRunning = true;
    });
})();
