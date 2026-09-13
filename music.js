/* Música principal (banda sonora de la experiencia)
   ==================================================
   Módulo INDEPENDIENTE del sintetizador de efectos (script.js), separado y
   autocontenido:

   - Comparte el AudioContext de la experiencia (window.__sharedAudioCtx) para
     NO crear duplicados. Solo crea contexto propio si por alguna razón no
     existe ninguno.
   - El audio arranca SIEMPRE después de una interacción del usuario (políticas
     de autoplay de los navegadores): experienceMusic.unlock() se llama en el
     primer gesto, desde el mismo desbloqueo de audio de los efectos.
   - Volúmenes independientes: la música tiene su propia ganancia; los tonos
     de las estrellas y la melodía final (Web Audio) conviven sin tocarse.
   - Fades suaves (fade-in/out), ducking durante los mensajes y un pequeño
     boost durante el viaje de la estrella especial: todo con rampas de ganancia
     sobre el MISMO nodo, nunca llamadas a play() por frame.
   - Si el archivo no existe o falla la carga, las operaciones se vuelven no-op
     silenciosas: la experiencia visual y los sonidos siguen funcionando igual,
     sin un solo error en consola.

   Sincronización narrativa: la experiencia usa el tiempo real del audio como
   reloj maestro (ExperienceMusic.now()/getTime(), en segundos, base 0 = inicio
   del tema). No se asumen tiempos exactos del tema todavía: la tabla
   ExperienceMusic.syncTimeline deja cada hito en null (conduciéndose por los
   eventos reales de la experiencia) y ExperienceMusic.onTime() permite atar
   transiciones visuales a segundos concretos de la partitura en cuanto
   analicemos el MP3, sin depender de contar frames. */
(function () {
    if (window.ExperienceMusic) return;

    var SRC = 'assets/music/Interstellar Main Theme - Hans Zimmer - Aura Music.mp3';
    var BASE_VOLUME = 0.6;
    var DUCK_FACTOR = 0.30;
    var BOOST_FACTOR = 1.18;
    var FADE_ACTIVATE_MS = 2.5;

    var ctx = null;
    var el = null;
    var source = null;
    var gain = null;
    var available = false;
    var started = false;
    var baseTarget = BASE_VOLUME;
    var ducked = false;
    var boosted = false;
    var initTried = false;
    var fadingOut = false;
    // BUG FIX: sessionRef anclaba el reloj de respaldo (usado por now() antes de
    // que el audio esté "available") al momento de CARGA de la página, no al
    // del clic real en "Comenzar". Si el usuario tardaba en pulsar, ese reloj
    // ya iba adelantado; en cuanto el audio terminaba de cargar y now() pasaba
    // a usar el.currentTime (que sí arranca en 0 real), el tiempo "saltaba
    // hacia atrás" de golpe, haciendo que la cinemática se rebobinara de una
    // fase ya avanzada (azul) a una fase temprana (negro/hold). Ahora se ancla
    // en unlock(), en el mismo instante que cinema.t0 en script.js.
    var sessionRef = typeof performance !== 'undefined' ? performance.now() : 0;
    var syncList = [];

    function log(msg) {
        if (window.console && console.debug) console.debug('[música] ' + msg);
    }

    function getDefaultCtx() {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        return new AC();
    }

    function ensure() {
        if (initTried) return;
        initTried = true;

        ctx = window.__sharedAudioCtx || getDefaultCtx();
        if (!ctx) {
            available = false;
            return;
        }
        if (ctx.state === 'suspended') {
            try { ctx.resume(); } catch (e) {}
        }

        if (typeof window.Audio !== 'function') {
            available = false;
            return;
        }

        el = new Audio();
        el.loop = false;
        el.preload = 'auto';
        el.src = SRC;

        el.addEventListener('canplay', handleReady, { once: true });
        el.addEventListener('loadeddata', handleReady, { once: true });
        el.addEventListener('error', handleFail, { once: true });

        try {
            source = ctx.createMediaElementSource(el);
        } catch (e) {
            source = null;
            available = false;
            return;
        }

        gain = ctx.createGain();
        gain.gain.value = 0.0001;
        source.connect(gain);
        gain.connect(ctx.destination);
    }

    function handleReady() {
        available = true;
        log('tema listo (' + niceDuration(el.duration) + ')');
        if (started && el && el.paused) play();
    }

    function handleFail() {
        available = false;
        log('archivo de música no disponible: se continúa sin banda sonora.');
    }

    function niceDuration(seconds) {
        if (!isFinite(seconds) || seconds <= 0) return 'duración desconocida';
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function rampGain(target, rampSeconds) {
        if (!gain || !ctx) return;
        var t = ctx.currentTime;
        var cur = gain.gain.value;
        if (!isFinite(cur)) return;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(Math.max(0.0001, cur), t);
        gain.gain.linearRampToValueAtTime(
            Math.max(0.0001, target),
            t + Math.max(0.01, rampSeconds)
        );
    }

    function currentTarget() {
        var v = baseTarget;
        if (ducked) v *= DUCK_FACTOR;
        if (boosted) v *= BOOST_FACTOR;
        return Math.min(1.2, v);
    }

    function play() {
        if (!el) return;
        try {
            var p = el.play();
            if (p && p.catch) p.catch(function () {});
        } catch (e) {}
    }

    var experienceMusic = {
        unlock: function () {
            ensure();
            if (!el) return;
            if (started) {
                if (el.paused) play();
                return;
            }
            started = true;
            // Re-ancla el reloj de respaldo AQUÍ, en el gesto real de inicio,
            // para que coincida con cinema.t0 (script.js) y no con la carga
            // de la página. Evita el salto hacia atrás cuando available pasa
            // a true y now() cambia de fuente de tiempo.
            sessionRef = performance.now();
            if (ctx && ctx.state === 'suspended') {
                try { ctx.resume(); } catch (e) {}
            }
            play();
            rampGain(currentTarget(), FADE_ACTIVATE_MS);
        },

        getTime: function () {
            if (!available || !started || !el || el.paused) return -1;
            return el.currentTime;
        },

        getDuration: function () {
            if (!el || !available) return 0;
            var d = el.duration;
            return isFinite(d) && d > 0 ? d : 0;
        },

        isPlaying: function () {
            return !!(started && el && el.paused === false);
        },

        duck: function (on, rampSeconds) {
            if (fadingOut) return;
            ducked = !!on;
            if (started && gain) rampGain(currentTarget(), rampSeconds || 1.4);
        },

        boost: function (on, rampSeconds) {
            if (fadingOut) return;
            boosted = !!on;
            if (started && gain) rampGain(currentTarget(), rampSeconds || 2.4);
        },

        setLevel: function (v) {
            if (fadingOut) return;
            baseTarget = Math.max(0, Math.min(1.2, Number(v) || BASE_VOLUME));
            if (started && gain) rampGain(currentTarget(), 1);
        },

        fadeIn: function (rampSeconds) {
            if (fadingOut) return;
            if (!started || !el) return;
            if (el.paused) play();
            rampGain(currentTarget(), rampSeconds || FADE_ACTIVATE_MS);
        },

        fadeOut: function (rampSeconds) {
            if (started && gain) rampGain(0.0001, rampSeconds || 6);
        },

        now: function () {
            if (available) {
                return (started && el) ? el.currentTime : -1;
            }
            return (performance.now() - sessionRef) / 1000;
        },

        onTime: function (seconds, callback) {
            if (typeof seconds !== 'number' || typeof callback !== 'function') return;
            syncList.push({ seconds: seconds, callback: callback, fired: false });
        },

        flush: function () {
            // BUG FIX: este método es propiedad del objeto; no existe una
            // función global/local llamada `now`. La referencia correcta es
            // `experienceMusic.now()`. Antes esto lanzaba ReferenceError en el
            // primer frame de render y mataba requestAnimationFrame, dejando
            // la pantalla negra justo cuando el telón se volvía transparente.
            var t = experienceMusic.now();
            if (t < 0) return;
            for (var i = syncList.length - 1; i >= 0; i--) {
                var s = syncList[i];
                if (s.fired || t < s.seconds) continue;
                s.fired = true;
                syncList.splice(i, 1);
                try { s.callback(); } catch (e) {}
            }
        },

        syncTimeline: {
            intro_hold_ends: null,
            intro_far_stars_appear: null,
            intro_blackhole_grows: null,
            intro_entrance: null,
            intro_birth: null,
            after_14_stars_breathe: null,
            journey_swell: null,
            arrival_climax: null
        },

        targetDuration: 244,

        breathe: function (dipSeconds) {
            if (!started || !gain || !ctx) return;
            var t = ctx.currentTime;
            var target = currentTarget();
            gain.gain.cancelScheduledValues(t);
            gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
            gain.gain.linearRampToValueAtTime(target * 0.55, t + 1.2);
            gain.gain.linearRampToValueAtTime(
                target,
                t + 1.2 + Math.max(1, dipSeconds || 6)
            );
        },

        climaxThenFade: function (riseSeconds, fadeSeconds) {
            if (!started || !gain || !ctx) return;
            fadingOut = true;
            var t = ctx.currentTime;
            var base = currentTarget();
            var rise = Math.max(1, riseSeconds || 2);
            var fade = Math.max(2, fadeSeconds || 8);
            gain.gain.cancelScheduledValues(t);
            gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), t);
            gain.gain.linearRampToValueAtTime(Math.min(1.4, base * 1.35), t + rise);
            gain.gain.linearRampToValueAtTime(0.0001, t + rise + fade);
        }
    };

    window.ExperienceMusic = experienceMusic;
})();
