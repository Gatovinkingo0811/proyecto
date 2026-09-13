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
   - Volúmenes independientes: la música tiene su propia ganancia; los tonos de
     las estrellas y la melodía final (Web Audio) conviven sin tocarse.
   - Fades suaves (fade-in/out), ducking durante los mensajes y un pequeño
     boost durante el viaje de la estrella especial: todo con rampas de ganancia
     sobre el MISMO nodo, nunca llamadas a play() por frame.
   - Si el archivo no existe o falla la carga, las operaciones se vuelven no-op
     silenciosas: la experiencia visual y los sonidos siguen funcionando igual,
     sin un solo error en consola.

   Sincronización narrativa: no se asumen tiempos exactos del tema (la duración
   real se conoce en tiempo de ejecución). ExperienceMusic.getTime() expone en
   segundos la posición real del audio para poder atar momentos visuales a la
   partitura más adelante, sin depender del frame rate. */
(function () {
    if (window.ExperienceMusic) return;

    var SRC = 'assets/music/Interstellar Main Theme - Hans Zimmer - Aura Music.mp3';
    var BASE_VOLUME = 0.6;
    var DUCK_FACTOR = 0.30;
    var BOOST_FACTOR = 1.18;
    var FADE_ACTIVATE_MS = 2.5;

    var ctx = null;        // AudioContext compartido con los efectos
    var el = null;         // elemento <audio> (no se añade al DOM)
    var source = null;     // MediaElementSource (una sola conexión)
    var gain = null;       // ganancia exclusiva de la música
    var available = false; // el archivo se puede reproducir
    var started = false;   // ya se intentó reproducir al menos una vez
    var baseTarget = BASE_VOLUME;
    var ducked = false;
    var boosted = false;
    var initTried = false;

    function log(msg) {
        if (window.console && console.debug) console.debug('[música] ' + msg);
    }

    function getDefaultCtx() {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        return new AC();
    }

    // Prepara el grafo una única vez, de forma perezosa (tras el primer gesto).
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
        // Si el usuario ya había desbloqueado antes de que el archivo cargara,
        // arranca en cuanto está disponible (sin segundo gesto).
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
        // Se llama desde el desbloqueo de audio de la experiencia (idempotente).
        unlock: function () {
            ensure();
            if (!el) return;
            if (started) {
                if (el.paused) play();
                return;
            }
            started = true;
            if (ctx && ctx.state === 'suspended') {
                try { ctx.resume(); } catch (e) {}
            }
            play();
            rampGain(currentTarget(), FADE_ACTIVATE_MS);
        },

        // Posición real del audio en segundos (-1 si la música no está sonando);
        // útil para sincronizar momentos narrativos con la partitura.
        getTime: function () {
            if (!available || !started || !el || el.paused) return -1;
            return el.currentTime;
        },

        // Duración total del tema (0 si no se conoce / no hay archivo).
        getDuration: function () {
            if (!el || !available) return 0;
            var d = el.duration;
            return isFinite(d) && d > 0 ? d : 0;
        },

        isPlaying: function () {
            return !!(started && el && el.paused === false);
        },

        // Apaga el volumen para dar paso a los sonidos de las estrellas.
        duck: function (on, rampSeconds) {
            ducked = !!on;
            if (started && gain) rampGain(currentTarget(), rampSeconds || 1.4);
        },

        // Pequeño empuje durante el viaje de la estrella especial.
        boost: function (on, rampSeconds) {
            boosted = !!on;
            if (started && gain) rampGain(currentTarget(), rampSeconds || 2.4);
        },

        setLevel: function (v) {
            baseTarget = Math.max(0, Math.min(1.2, Number(v) || BASE_VOLUME));
            if (started && gain) rampGain(currentTarget(), 1);
        },

        fadeIn: function (rampSeconds) {
            if (!started || !el) return;
            if (el.paused) play();
            rampGain(currentTarget(), rampSeconds || FADE_ACTIVATE_MS);
        },

        fadeOut: function (rampSeconds) {
            if (started && gain) rampGain(0.0001, rampSeconds || 6);
        }
    };

    window.ExperienceMusic = experienceMusic;
})();