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
    var fadingOut = false; // tras el crescendo final el tema no se re-sube
    var sessionRef = typeof performance !== 'undefined' ? performance.now() : 0;
    var syncList = [];     // puntos de sincronización: segundo -> callback

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
            if (fadingOut) return;
            ducked = !!on;
            if (started && gain) rampGain(currentTarget(), rampSeconds || 1.4);
        },

        // Pequeño empuje durante el viaje de la estrella especial.
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

        // Reloj maestro de la narrativa (segundos, base 0 = inicio del tema):
        // usa el tiempo real del audio cuando la música suena y, si el tema no
        // está disponible, avanza con un reloj monótono equivalente para que la
        // experiencia siga funcionando igual. Devuelve -1 solo mientras el
        // audio aún no ha empezado.
        now: function () {
            if (available) {
                return (started && el) ? el.currentTime : -1;
            }
            return (performance.now() - sessionRef) / 1000;
        },

        // Programa una llamada única que se dispara cuando el reloj maestro
        // alcanza "seconds". Es el gancho para atar transiciones a los
        // timestamps exactos del tema una vez analizado el MP3.
        onTime: function (seconds, callback) {
            if (typeof seconds !== 'number' || typeof callback !== 'function') return;
            syncList.push({ seconds: seconds, callback: callback, fired: false });
        },

        // Evalúa los puntos de sincronización pendientes. Se llama una vez por
        // frame desde el mismo requestAnimationFrame del cielo (sin loops).
        flush: function () {
            var t = now();
            if (t < 0) return;
            for (var i = syncList.length - 1; i >= 0; i--) {
                var s = syncList[i];
                if (s.fired || t < s.seconds) continue;
                s.fired = true;
                syncList.splice(i, 1);
                try { s.callback(); } catch (e) {}
            }
        },

        // Hitos narrativos. sec = null los mantiene conducidos por los eventos
        // reales de la experiencia (como hoy). Cuando analicemos el MP3 se ponen
        // aquí los segundos exactos del tema y las transiciones se atan a ellos.
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

        // Duración objetivo del tema (4:04 = 244 s). Dato de referencia para el
        // ajuste futuro: por sí solo no altera ningún ritmo.
        targetDuration: 244,

        // "Respiro": baja un instante para que se escuche el momento (p. ej. la
        // melodía final) y vuelve por sí sola, suave.
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

        // Crescendo emocional en la llegada a Géminis y, justo después, el fade
        // final: sube un momento y se retira despacio al cierre de la
        // experiencia. Marca fadingOut para que nada la re-suba después.
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