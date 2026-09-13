/**
 * Constelación de Acuario para Charlotte
 * Experiencia interactiva astronómica y poética
 * Totalmente optimizada para móvil y escritorio
 */

(function () {
    'use strict';

    // 14 Estrellas principales de la constelación de Acuario
    // Coordenadas calibradas con respecto a la figura tradicional de Acuario
    // Cada estrella guarda un pequeño concepto (title) y una frase breve (message).
    // La progresión emocional avanza desde la curiosidad inicial hasta el aprecio profundo.
    const STARS = [
        {
            id: 1,
            name: "Albali",
            bayer: "ε Aqr",
            x: 16,
            y: 54,
            title: "El comienzo",
            message: "Hay personas que se sienten especiales desde el primer momento. Tú fuiste una de ellas para mí."
        },
        {
            id: 2,
            name: "Sadalsuud",
            bayer: "β Aqr",
            x: 34,
            y: 42,
            title: "Tu sonrisa",
            message: "Hay algo en tu sonrisa que lo hace todo más tranquilo, como si el mundo se tomara un respiro."
        },
        {
            id: 3,
            name: "Sadalmelik",
            bayer: "α Aqr",
            x: 48,
            y: 26,
            title: "Tu manera de mirar",
            message: "Siempre sentí que detrás de tus ojos hay una historia bonita, y me gusta conocerla poco a poco."
        },
        {
            id: 4,
            name: "Seat",
            bayer: "π Aqr",
            x: 58,
            y: 17,
            title: "Ser yo mismo",
            message: "Contigo nunca tuve que adivinar si estaba bien ser yo mismo. Lo sentí natural desde el principio."
        },
        {
            id: 5,
            name: "Sadachbia",
            bayer: "γ Aqr",
            x: 58,
            y: 31,
            title: "Los momentos simples",
            message: "Los recuerdos que más guardo son los días sencillos, sin planes grandes, donde solo éramos nosotros."
        },
        {
            id: 6,
            name: "ζ Aqr",
            bayer: "ζ Aqr",
            x: 65,
            y: 26,
            title: "La confianza",
            message: "Contigo la confianza es fácil. Nunca tuve que pensarla dos veces."
        },
        {
            id: 7,
            name: "η Aqr",
            bayer: "η Aqr",
            x: 71,
            y: 29,
            title: "Cómo me escuchas",
            message: "Me encanta cómo me escuchas. Contigo pude decir cosas que normalmente me cuestan."
        },
        {
            id: 8,
            name: "Ancha",
            bayer: "θ Aqr",
            x: 52,
            y: 53,
            title: "Lo que compartimos",
            message: "Cuando me cuentas algo, lo guardo con cuidado. Me importa de verdad cómo estás."
        },
        {
            id: 9,
            name: "σ Aqr",
            bayer: "σ Aqr",
            x: 57,
            y: 63,
            title: "Un cariño seguro",
            message: "Contigo aprendí que el cariño puede sentirse ligero y seguro, sin necesidad de grandes gestos."
        },
        {
            id: 10,
            name: "Skat",
            bayer: "δ Aqr",
            x: 72,
            y: 74,
            title: "Por quién eres",
            message: "Admiro a la persona que eres cuando nadie te está mirando. Esa eres tú de verdad."
        },
        {
            id: 11,
            name: "Hydor",
            bayer: "λ Aqr",
            x: 76,
            y: 48,
            title: "Verte crecer",
            message: "Me alegra de verdad verte crecer y perseguir lo tuyo. Cada logro tuyo también es mío para celebrar."
        },
        {
            id: 12,
            name: "τ² Aqr",
            bayer: "τ² Aqr",
            x: 70,
            y: 83,
            title: "Tu felicidad",
            message: "Quiero que seas feliz de verdad, no por compromiso. Tu bien me importa, sin condiciones."
        },
        {
            id: 13,
            name: "88 Aqr",
            bayer: "c² Aqr",
            x: 82,
            y: 89,
            title: "Tu lugar",
            message: "Tienes un lugar en mi vida que se construyó solo, con cada conversación y cada momento."
        },
        {
            id: 14,
            name: "φ Aqr",
            bayer: "φ Aqr",
            x: 87,
            y: 42,
            title: "Lo que siento",
            message: "Mi cariño por ti es sincero y no pide nada a cambio. Solo quería que lo supieras."
        }
    ];

    // Conexiones de la figura de Acuario
    const CONSTELLATION_LINES = [
        [1, 2],
        [2, 3],
        [3, 4],
        [3, 5],
        [5, 6],
        [6, 7],
        [3, 8],
        [8, 9],
        [9, 10],
        [9, 11],
        [11, 14],
        [10, 12],
        [12, 13]
    ];

    // El cielo estelar real (todas las constelaciones con RA/Dec) se dibuja en
    // el <canvas id="celestial-map"> mediante celestial.js. En el final, el zoom
    // out revela ese cielo: 11 constelaciones del zodíaco orbitan en el halo y
    // la principal (Acuario) permanece fija en el centro. Al cierre, una de las
    // 14 estrellas de Acuario (la nº14, φ Aqr) parte: cruza el cielo con estela,
    // aterriza sobre un punto real de Géminis y se integra en su órbita. Acuario
    // se queda con 13 estrellas vivas; la especial no vuelve jamás.

    // Los textos del final se escenifican en showFinale() por fases,
    // intercalados con el zoom out, el viaje de la estrella y la firma.

    // Estado
    let discoveredStars = new Set();
    let currentActiveId = 1;
    let isModalOpen = false;
    let currentModalStarId = null;
    let audioCtx = null;
    let lastInteractionTime = 0;
    let finaleStarted = false;

    // Estados separados de la experiencia (NO deben mezclarse):
    //  - audioUnlocked: el AudioContext se desbloqueó (1er gesto); NO significa
    //    que la cinemática terminó.
    //  - cinematicStarted: la travesía visual comenzó (arranca con el audio).
    //  - cinematicFinished: el cine completó SU secuencia completa (negro →
    //    sonido → espacio → agujero negro → entrada → vacío → renacimiento de
    //    Acuario). Solo aquí se abre la interacción.
    //  - interactionReady: las 14 estrellas son visibles y tocables.
    let audioUnlocked = false;
    let cinematicStarted = false;
    let cinematicFinished = false;
    let interactionReady = false;
    // La estrella nº14 ya partió hacia Géminis: Acuario pasa de 14 a 13 nodos.
    let specialDeparted = false;

    // Cierre interactivo del final: el usuario decide cuándo continuar.
    let finaleContinueReady = false;
    let anomalyStarted = false;

    // --- INTRO CINEMATOGRÁFICA (negro → agujero negro → universo nuevo) ---
    // Las estrellas nacen una a una en su fase de "nacimiento" y no son
    // tocables hasta el fin natural del cine (interactionReady).
    let introTimers = [];

    function stopIntroTimers() {
        introTimers.forEach(clearTimeout);
        introTimers = [];
    }

    // --- INTRO CINEMATOGRÁFICA Sincronizada a la partitura real ---
    // La música es el reloj maestro. TIMELINE guarda los segundos del tema
    // (0 = inicio del MP3, duración 244.008 s = 4:04.01) donde ocurren los
    // grandes eventos visuales, tomados del análisis musical real:
    //   00:00.00 silencio · 00:02.43 primer sonido · 00:16 capa armónica ·
    //   00:41.15 fin de intro · 01:50.44 buildup con el agujero negro ·
    //   02:17.24 entrada/al clímax 1 · 02:27.19 vacío · 02:40.47 nacen las
    //   14 estrellas de Acuario (sin salto: geometría real preservada).
    // Con prefers-reduced-motion la secuencia se COMPRIME proporcionalmente
    // (rmScale) pero SIEMPRE se ejecuta completa: nunca un salto a los puntos.
    // updateCinema() avanza con ExperienceMusic.now() y un reloj local de
    // respaldo, jamás con un temporizador de 44 s.
    const TIMELINE = {
        firstSound: 2.43,       // primer sonido: nacen partículas muy sutiles
        harmony: 16.00,         // capa armónica: el espacio aparece
        introPeak: 41.15,       // fin de la intro / techo inicial
        build: 110.44,          // comienza el gran buildup: aquí nace el agujero
        grow: 118.10,           // el agujero negro crece y dobla la luz
        approach: 120.90,       // acercamiento intensificado al horizonte
        entryPrep: 134.55,      // preparar la entrada (onset 02:14.55)
        entry: 137.24,          // CLÍMAX 1: la cámara entra (convergencia)
        void: 147.19,           // breakdown: vacío profundo (energía cae ~91%)
        reentry: 159.23,        // comienza la reentrada
        birthStart: 160.47,     // gran onset: Acuario nace progresivamente
        birthEnd: 169.17,       // el universo nuevo está completo
        interactionOpen: 171.5  // fin del cine: se tocan las 14 estrellas
    };

    // Comprime la travesía si el usuario pide explícitamente menos movimiento
    // (0.42× ≈ 72 s). La secuencia NUNCA se salta: solo se acelera.
    function rmScale() {
        return prefersReducedMotion ? 0.42 : 1;
    }
    // Orden suave de nacimiento de Acuario (del borde del ánfora hacia el 14).
    const BIRTH_REVEAL_ORDER = [1, 8, 2, 3, 12, 4, 5, 6, 9, 11, 10, 7, 13, 14];

    const cinema = {
        active: false,
        t0: 0,
        phase: 'hold',
        birthSent: false,
        conf: {
            black: 0,
            hole: false,
            ex: 0,
            ey: 0,
            holeR: 0,
            lens: 0,
            disc: 0,
            ring: 0,
            scale: 1,
            layers: { far: 0, mid: 0, near: 0 }
        }
    };

    function cinemaEase(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    const cinemaLockedPhases = ['hold', 'dawn', 'approach', 'blackhole', 'entrance', 'void'];

    // Reacciones de la escena al cambiar de fase (una vez por transición).
    function onCinemaPhase(phase) {
        const nebulaEl = document.getElementById('nebula');
        const backdrop = document.getElementById('intro-backdrop');
        const M = window.ExperienceMusic;

        // Durante la travesía, Acuario permanece latente (ni líneas ni estrellas
        // anticipan la figura); en el nacimiento y tras él, se muestra.
        if (cinemaLockedPhases.indexOf(phase) !== -1) {
            document.body.classList.add('cinema-lock');
        } else {
            document.body.classList.remove('cinema-lock');
        }

        // El velo negro se retira cuando suena el primer sonido (02.43) y el
        // telón se vuelve transparente cuando entra la capa armónica (16.00):
        // el cielo del canvas queda a la vista durante el resto de la travesía.
        if (phase === 'dawn') {
            if (backdrop) backdrop.classList.add('dim');
            console.debug('[CINEMA] -> dawn (telón backdrop.dim)');
        } else if (phase === 'approach' || phase === 'blackhole') {
            if (introOverlay) introOverlay.classList.add('cinema-clear');
            console.debug('[CINEMA] -> ' + phase + ' (telón introOverlay.cinema-clear) hole=' + cinema.conf.hole);
        }

        if (phase === 'dawn' || phase === 'approach' || phase === 'blackhole' || phase === 'void' || phase === 'birth' || phase === 'done') {
            console.debug('[CINEMA] onCinemaPhase=' + phase + ' t=' + t.toFixed(2) + ' cinema.active=' + cinema.active);
        }

        if (phase === 'hold' || phase === 'void' || phase === 'dawn') {
            if (nebulaEl) nebulaEl.style.opacity = phase === 'void' ? '0' : '0';
            if (phase === 'void' && M) M.duck(true, 1.4); // la música cae al vacío
        } else if (phase === 'entrance') {
            if (nebulaEl) nebulaEl.style.opacity = '0.08';
        } else if (phase === 'birth' || phase === 'done') {
            if (nebulaEl) nebulaEl.style.opacity = '0.55';
            if (M) M.duck(false, 2.4); // el universo nuevo nace: la música vuelve
        } else {
            if (nebulaEl) nebulaEl.style.opacity = '0.18';
        }

        if (phase === 'birth' && !cinema.birthSent) {
            cinema.birthSent = true;
            scheduleBirthReveal();
        }
    }

    // El universo nuevo: las estrellas de Acuario aparecen una a una (misma
    // geometría real, sin nodos nuevos). Primero se apagan todas para partir de
    // cielo vacío y luego se encienden en orden suave DENTRO de la ventana
    // musical [birthStart, birthEnd] (02:40.47 → 02:49.17). Con
    // prefers-reduced-motion el revelado se comprime igual que el cine.
    function scheduleBirthReveal() {
        Array.prototype.forEach.call(
            document.querySelectorAll('#stars-container .star-node'),
            function (n) {
                n.classList.add('hidden');
                n.classList.remove('revealed');
            }
        );
        const m = rmScale();
        const stepMs = 620 * m;
        const startMs = 400 * m;
        BIRTH_REVEAL_ORDER.forEach((id, i) => {
            introTimers.push(setTimeout(() => {
                const node = document.getElementById('star-node-' + id);
                if (!node) return;
                node.classList.remove('hidden');
                node.classList.add('revealed');
            }, startMs + i * stepMs));
        });
    }

    // Tiempo narrativo del cine. Prioridad total al reloj REAL de la música
    // (ExperienceMusic.now(), segundos desde el inicio del tema). Si el audio
    // no está sonando (sin archivo, autoplay bloqueado o cargando), se usa un
    // reloj local monótono equivalente que arranca con el cine (mismo toque).
    // La interacción con las estrellas NO está ligada a este reloj: solo abre
    // cuando TIMELINE.interactionOpen se alcanza → finishCinematic().
    function cinematicSeconds() {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying()) {
            const audioT = (typeof M.now === 'function') ? M.now() : -1;
            if (audioT >= 0) return audioT;
        }
        return (performance.now() - cinema.t0) / 1000;
    }

    // Mientras la partitura suena, el reloj maestro de la música puede estar
    // disparando hitos (crescendo, fade final). El starfield en modo estático
    // debe permanecer encendido para drenar esos eventos (flush() vive en el
    // bucle); se apaga en cuanto el tema deja de sonar.
    function musicStillRelevant() {
        const M = window.ExperienceMusic;
        return !!(M && typeof M.isPlaying === 'function' && M.isPlaying());
    }

    // Avanza las fases del cine con el tiempo REAL de la música (0 = inicio del
    // tema; 244.008 s = 4:04.01). Rellena cinema.conf con la configuración del
    // frame para el render del canvas: negro silencioso → primeras partículas →
    // espacio profundo → agujero negro creciendo (lente) → entrada al horizonte
    // (convergencia) → vacío → renacimiento de Acuario. Todo DENTRO del único
    // ciclo del starfield. Sin temporizadores de 44 s: el reloj es la partitura.
    function updateCinema() {
        if (cinematicFinished) {
            if (cinema.active) cinema.active = false;
            return;
        }
        if (!cinema.active) return;

        const t = cinematicSeconds();
        const m = rmScale();
        const T = TIMELINE;
        // Puntos de la partitura (escalados si el usuario pide poco movimiento).
        const firstSound = T.firstSound * m;
        const harmony = T.harmony * m;
        const introPeak = T.introPeak * m;
        const build = T.build * m;
        const grow = T.grow * m;
        const approachAt = T.approach * m;
        const entryPrep = T.entryPrep * m;
        const entry = T.entry * m;
        const voidAt = T.void * m;
        const reentry = T.reentry * m;
        const birthStart = T.birthStart * m;
        const birthEnd = T.birthEnd * m;
        const interactionOpen = T.interactionOpen * m;

        const conf = cinema.conf;
        const w = window.innerWidth;
        const h = window.innerHeight;
        conf.ex = w * 0.5;
        conf.ey = h * 0.44;
        const baseR = Math.max(48, Math.min(w, h) * 0.16);

        let phase = 'hold';
        let black = 0;
        let hole = false;
        let lens = 0;
        let disc = 0;
        let ring = 0;
        let scale = 1;
        let lf = 0;
        let lm = 0;
        let ln = 0;

        const lerp = (a, b, p) => a + (b - a) * Math.max(0, Math.min(1, p));
        const seg = (start, end) => (t - start) / (end - start);

        if (t < firstSound) {
            // 00:00.00–00:02.43 · Silencio inicial: pantalla prácticamente negra.
            phase = 'hold';
            lf = 0.02;
            lm = 0.01;
            ln = 0.005;
        } else if (t < harmony) {
            // 00:02.43–00:16.00 · Primer sonido: nacen estrellas/partículas
            // extremadamente sutiles y el espacio empieza a aparecer.
            phase = 'dawn';
            lf = lerp(0.02, 0.22, seg(firstSound, harmony));
            lm = lerp(0.01, 0.08, seg(firstSound, harmony));
            ln = lerp(0.005, 0.03, seg(firstSound, harmony));
        } else if (t < introPeak) {
            // 00:16.00–00:41.15 · Capa armónica: aumentar profundidad y cantidad.
            phase = 'approach';
            lf = lerp(0.22, 0.5, seg(harmony, introPeak));
            lm = lerp(0.08, 0.3, seg(harmony, introPeak));
            ln = lerp(0.03, 0.15, seg(harmony, introPeak));
            scale = 1 - 0.02 * seg(harmony, introPeak);
        } else if (t < build) {
            // 00:41.15–01:50.44 · Desarrollo: acercamiento progresivo al espacio
            // profundo. Aún NO se muestra la constelación completa.
            phase = 'approach';
            lf = lerp(0.5, 0.68, seg(introPeak, build));
            lm = lerp(0.3, 0.5, seg(introPeak, build));
            ln = lerp(0.15, 0.3, seg(introPeak, build));
            scale = 1 - 0.1 * seg(introPeak, build);
        } else if (t < grow) {
            // 01:50.44–01:58.10 · Comienza el gran buildup: nace el agujero negro
            // y crece progresivamente.
            phase = 'blackhole';
            const p1 = seg(build, grow);
            hole = true;
            lens = lerp(0, 0.55, p1);
            ring = lerp(0, 0.55, p1);
            disc = lerp(0, 0.45, p1);
            lf = 0.62;
            lm = 0.5 * p1;
            ln = 0.26 * p1;
        } else if (t < approachAt) {
            // 01:58.10–02:00.90 · El agujero crece y empieza a doblar la luz.
            phase = 'blackhole';
            const p2 = seg(grow, approachAt);
            hole = true;
            lens = lerp(0.55, 0.95, p2);
            ring = lerp(0.55, 0.95, p2);
            disc = lerp(0.45, 0.8, p2);
            lf = 0.62;
            lm = lerp(0.5, 0.7, p2);
            ln = lerp(0.26, 0.46, p2);
        } else if (t < entryPrep) {
            // 02:00.90–02:14.55 · Acercamiento intensificado: caída hacia el disco.
            phase = 'approach';
            const p3 = seg(approachAt, entryPrep);
            hole = true;
            lens = 1;
            ring = 1;
            disc = 1;
            scale = 1 - 0.28 * cinemaEase(p3);
            lf = 0.62;
            lm = 0.6;
            ln = 0.4;
        } else if (t < entry) {
            // 02:14.55–02:17.24 · Onset fuerte: preparar la entrada al horizonte.
            phase = 'approach';
            const p4 = seg(entryPrep, entry);
            hole = true;
            lens = 1;
            ring = 1;
            disc = 1;
            scale = 1 - 0.36 * cinemaEase(p4);
            lf = 0.6;
            lm = 0.55;
            ln = 0.35;
        } else if (t < voidAt) {
            // 02:17.24–02:27.19 · CLÍMAX 1: LA CÁMARA ENTRA. Convergencia,
            // distorsión, movimiento hacia el centro y pérdida del espacio
            // anterior (escala → 0.06, fundido a negro).
            phase = 'entrance';
            const p5 = seg(entry, voidAt);
            hole = true;
            lens = 1;
            ring = 1;
            disc = 1;
            scale = 1 - 0.94 * cinemaEase(p5);
            black = p5;
            lf = 0.6;
            lm = 0.5;
            ln = 0.3;
        } else if (t < reentry) {
            // 02:27.19–02:39.23 · BREAKDOWN/vacío de transición: casi negro,
            // muy pocas partículas, sensación de vacío. Sin Acuario todavía.
            phase = 'void';
            black = 1;
            lf = 0.02;
            lm = 0.01;
            ln = 0;
        } else if (t < birthStart) {
            // 02:39.23–02:40.47 · Comienza la reentrada: el vacío empieza a ceder.
            phase = 'void';
            const p6 = seg(reentry, birthStart);
            black = lerp(1, 0.88, p6);
            lf = lerp(0.02, 0.12, p6);
            lm = lerp(0.01, 0.05, p6);
            ln = 0;
        } else if (t < birthEnd) {
            // 02:40.47–02:49.17 · NACIMIENTO: el nuevo universo emerge y Acuario
            // aparece estrella a estrella (revelado real, sin un salto).
            phase = 'birth';
            const p7 = seg(birthStart, birthEnd);
            black = lerp(0.88, 0, p7);
            lf = lerp(0.12, 1, Math.min(1, p7 * 1.1));
            lm = lerp(0.05, 1, Math.max(0, (p7 - 0.2) / 0.8));
            ln = Math.max(0, (p7 - 0.42) / 0.58);
        } else {
            // 02:49.17+ · Cielo pleno; el cine se cierra en interactionOpen.
            phase = 'done';
            black = 0;
            lf = 1;
            lm = 1;
            ln = 1;
        }

        conf.black = black;
        conf.hole = hole;
        conf.lens = lens;
        conf.disc = disc;
        conf.ring = ring;
        conf.scale = scale;
        conf.holeR = baseR * (0.16 + ring * 0.84);
        conf.layers.far = lf;
        conf.layers.mid = lm;
        conf.layers.near = ln;

        if (cinema.phase !== phase) {
            cinema.phase = phase;
            onCinemaPhase(phase);
        }

        // Fin natural del cine: el universo nuevo ya nació. Es el ÚNICO punto en
        // el que se habilita la interacción con las 14 estrellas (finishCinematic
        // es idempotente). Un segundo gesto NUNCA salta la travesía.
        if (t >= interactionOpen) {
            finishCinematic();
        }
    }

    // Dibujo del agujero negro (disco + anillo de fotones + núcleo oscuro) sobre
    // el canvas del starfield. Simple y barato: un par de elipses rotando.
    function drawBlackHole(ctx, conf, now) {
        const ex = conf.ex;
        const ey = conf.ey;
        const r = conf.holeR;
        const disc = conf.disc;
        const ring = conf.ring;

        if (ring > 0.03) {
            // Resplandor tenue que rodea el horizonte (la lente se lee primero).
            const glow = ctx.createRadialGradient(ex, ey, r, ex, ey, r * 6);
            glow.addColorStop(0, 'rgba(255, 214, 170, ' + (0.10 * disc) + ')');
            glow.addColorStop(0.55, 'rgba(176, 150, 255, ' + (0.05 * disc) + ')');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 6, 0, Math.PI * 2);
            ctx.fill();

            // Disco de acreción (dos anillos desviados, rotando lentamente).
            ctx.save();
            ctx.translate(ex, ey);
            ctx.globalAlpha = Math.min(1, ring * 0.9);
            ctx.strokeStyle = 'rgba(230, 205, 178, 1)';
            ctx.lineWidth = Math.max(1.2, r * 0.075);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * (1.9 + 0.03 * Math.sin(now * 0.001)), r * 0.9, 0.35, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = Math.min(1, ring * 0.65);
            ctx.strokeStyle = 'rgba(196, 176, 255, 1)';
            ctx.lineWidth = Math.max(1, r * 0.05);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * (1.42 + 0.03 * Math.cos(now * 0.0009)), r * 0.68, 0.35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Núcleo: oscuro y sólido (las estrellas que caen tras él desaparecen).
        if (r > 0) {
            const core = ctx.createRadialGradient(ex, ey, r * 0.2, ex, ey, r * 1.5);
            core.addColorStop(0, '#000000');
            core.addColorStop(0.72, '#010208');
            core.addColorStop(1, 'rgba(1, 2, 8, 0)');
            ctx.fillStyle = core;
            ctx.beginPath();
            ctx.arc(ex, ey, r * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Elementos del DOM
    const starsContainer = document.getElementById('stars-container');
    const svgLines = document.getElementById('constellation-lines');
    const celestialMap = document.getElementById('celestial-map');
    const universeContainer = document.getElementById('universe-container');
    const hintElement = document.getElementById('hint');
    const introOverlay = document.getElementById('intro-overlay');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalStarName = document.getElementById('modal-star-name');
    const modalStarCount = document.getElementById('modal-star-count');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close');
    const finaleOverlay = document.getElementById('finale-overlay');
    const finaleContent = document.getElementById('finale-content');
    const finaleMessage = document.getElementById('finale-message');
    const finaleSign = document.querySelector('.finale-sign');
    const finaleContinue = document.getElementById('finale-continue');

    // --- RESPUESTA HÁPTICA PARA MÓVIL ---
    function triggerHaptic(type = 'light') {
        if ('vibrate' in navigator) {
            try {
                if (type === 'light') {
                    navigator.vibrate(12);
                } else if (type === 'medium') {
                    navigator.vibrate(28);
                } else if (type === 'success') {
                    navigator.vibrate([25, 60, 35, 70, 45]);
                }
            } catch (e) {
                // Silencioso en navegadores sin permiso
            }
        }
    }

    // --- ESCALA MUSICAL PENTATÓNICA CELESTIAL (14 notas únicas para las 14 estrellas) ---
    // Cada estrella tiene su propia nota musical, ascendiendo progresivamente como una caja de música mágica
    const STAR_NOTES = [
        { freq: 293.66, name: "D4" },  // 1. Albali (nota cálida e inicial)
        { freq: 329.63, name: "E4" },  // 2. Sadalsuud
        { freq: 369.99, name: "F#4" }, // 3. Sadalmelik
        { freq: 440.00, name: "A4" },  // 4. Seat
        { freq: 493.88, name: "B4" },  // 5. Sadachbia
        { freq: 587.33, name: "D5" },  // 6. ζ Aqr
        { freq: 659.25, name: "E5" },  // 7. η Aqr
        { freq: 739.99, name: "F#5" }, // 8. Ancha
        { freq: 880.00, name: "A5" },  // 9. σ Aqr
        { freq: 987.77, name: "B5" },  // 10. Skat
        { freq: 1174.66, name: "D6" }, // 11. Hydor
        { freq: 1318.51, name: "E6" }, // 12. τ² Aqr
        { freq: 1479.98, name: "F#6" },// 13. 88 Aqr
        { freq: 1760.00, name: "A6" }  // 14. φ Aqr (nota más alta y brillante)
    ];

    // --- SINTETIZADOR DE AUDIO CÓSMICO (Web Audio API) ---
    function initAudio() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                audioCtx = new AudioContextClass();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        // Contexto compartido con la música (music.js) para no crear duplicados.
        window.__sharedAudioCtx = window.__sharedAudioCtx || audioCtx;
        // La banda sonora arranca aquí. Esto es SOLO el desbloqueo de audio: no
        // termina la cinemática ni abre la interacción (estados separados).
        if (window.ExperienceMusic) {
            window.ExperienceMusic.unlock();
        }
        audioUnlocked = true;
    }

    // Tono celestial propio y único para cada estrella
    function playStarTone(starId) {
        if (!audioCtx) return;
        try {
            const index = Math.max(0, Math.min(STAR_NOTES.length - 1, starId - 1));
            const baseFreq = STAR_NOTES[index].freq;
            const now = audioCtx.currentTime;

            // 1. Tono principal cálido
            const oscMain = audioCtx.createOscillator();
            const gainMain = audioCtx.createGain();
            oscMain.type = 'sine';
            oscMain.frequency.setValueAtTime(baseFreq, now);

            gainMain.gain.setValueAtTime(0, now);
            gainMain.gain.linearRampToValueAtTime(0.18, now + 0.025);
            gainMain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

            oscMain.connect(gainMain);
            gainMain.connect(audioCtx.destination);
            oscMain.start(now);
            oscMain.stop(now + 1.7);

            // 2. Armónico cristalino (octava superior con brillo sutil)
            const oscHarm = audioCtx.createOscillator();
            const gainHarm = audioCtx.createGain();
            oscHarm.type = 'sine';
            oscHarm.frequency.setValueAtTime(baseFreq * 2, now);

            gainHarm.gain.setValueAtTime(0, now);
            gainHarm.gain.linearRampToValueAtTime(0.07, now + 0.02);
            gainHarm.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

            oscHarm.connect(gainHarm);
            gainHarm.connect(audioCtx.destination);
            oscHarm.start(now);
            oscHarm.stop(now + 1.0);

            // 3. Golpe de campana de cristal (brillo agudo de percusión suave)
            const oscBell = audioCtx.createOscillator();
            const gainBell = audioCtx.createGain();
            oscBell.type = 'triangle';
            oscBell.frequency.setValueAtTime(baseFreq * 3.5, now);

            gainBell.gain.setValueAtTime(0, now);
            gainBell.gain.linearRampToValueAtTime(0.035, now + 0.008);
            gainBell.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

            oscBell.connect(gainBell);
            gainBell.connect(audioCtx.destination);
            oscBell.start(now);
            oscBell.stop(now + 0.4);

        } catch (e) {
            // Silencioso en caso de bloqueo de audio
        }
    }

    // Destello de 2 notas armónicas al cerrar el modal y conectar la estrella
    function playConnectSparkle(starId) {
        if (!audioCtx) return;
        try {
            const index = Math.max(0, Math.min(STAR_NOTES.length - 1, starId - 1));
            const freq1 = STAR_NOTES[index].freq * 1.5; // Quinta
            const freq2 = STAR_NOTES[index].freq * 2.0; // Octava
            const now = audioCtx.currentTime;

            [{ f: freq1, delay: 0 }, { f: freq2, delay: 0.12 }].forEach(note => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(note.f, now + note.delay);

                gain.gain.setValueAtTime(0, now + note.delay);
                gain.gain.linearRampToValueAtTime(0.09, now + note.delay + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + 0.9);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + note.delay);
                osc.stop(now + note.delay + 1.0);
            });
        } catch (e) {}
    }

    // Sonido misterioso y bajo si toca una estrella bloqueada
    function playLockedTone() {
        if (!audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(146.83, now); // D3

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.6);
        } catch (e) {}
    }

    // Arpegio ascendente al comenzar
    function playIntroSparkle() {
        if (!audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            [440.00, 587.33, 739.99].forEach((f, idx) => { // A4 -> D5 -> F#5
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + idx * 0.14);

                gain.gain.setValueAtTime(0, now + idx * 0.14);
                gain.gain.linearRampToValueAtTime(0.1, now + idx * 0.14 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 1.2);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.14);
                osc.stop(now + idx * 0.14 + 1.3);
            });
        } catch (e) {}
    }

    // Melodía celestial y acorde sostenido para el final
    function playFinaleMelody() {
        if (!audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            const arpeggio = [293.66, 369.99, 440.00, 587.33, 739.99, 880.00, 1174.66];
            arpeggio.forEach((freq, i) => {
                const time = now + i * 0.18;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, time);

                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(0.11, time + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(time);
                osc.stop(time + 1.7);
            });

            // Acorde final radiante y envolvente
            const chordTime = now + arpeggio.length * 0.18;
            [587.33, 739.99, 880.00, 1174.66, 1479.98].forEach(freq => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, chordTime);

                gain.gain.setValueAtTime(0, chordTime);
                gain.gain.linearRampToValueAtTime(0.07, chordTime + 0.08);
                gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 3.4);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(chordTime);
                osc.stop(chordTime + 3.6);
            });
        } catch (e) {}
    }

    // Pequeño destello sonoro al aparecer la estrella misteriosa del final
    function playMysteryNote() {
        if (!audioCtx) return;
        try {
            const now = audioCtx.currentTime;
            [523.25, 659.25, 783.99].forEach((f, idx) => { // C5 -> E5 -> G5
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + idx * 0.16);

                gain.gain.setValueAtTime(0, now + idx * 0.16);
                gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.16 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.16 + 1.1);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.16);
                osc.stop(now + idx * 0.16 + 1.2);
            });
        } catch (e) {}
    }

    // --- CIELO ESTRELLADO (CANVAS) ---
    let meteorShowerActive = false;
    let showerIntensity = 0;

    // Usuario prefiere menos movimiento: el cielo queda estático y sin lluvias.
    const prefersReducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Aparición progresiva del cielo al iniciar (0 → 1 en ~6s).
    let skyReveal = prefersReducedMotion ? 1 : 0;
    let skyRevealStart = 0;

    // Sprite de halo pequeño prenderizado (rápido y sin gradientes por frame).
    function makeHaloSprite() {
        const c = document.createElement('canvas');
        c.width = 96;
        c.height = 96;
        const g = c.getContext('2d');
        const grad = g.createRadialGradient(48, 48, 0, 48, 48, 48);
        grad.addColorStop(0, 'rgba(210, 225, 255, 0.45)');
        grad.addColorStop(0.35, 'rgba(185, 200, 255, 0.14)');
        grad.addColorStop(1, 'rgba(185, 200, 255, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 96, 96);
        return c;
    }

    function setupStarfield() {
        const canvas = document.getElementById('starfield');
        const ctx = canvas.getContext('2d');
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const isMobile = width < 768;
        const halo = makeHaloSprite();

        // Capas de profundidad: lejanas (deriva casi nula, casi quietas), medias
        // (deriva ligera) y cercanas (ligera deriva, halos y brillos). Tamaño,
        // opacidad, parpadeo y halos dependen de la capa (no del azar global):
        // el cielo gana variedad y profundidad sin competir con las
        // constelaciones.
        const LAYERS = [
            { drift: 0.006, key: 'far' },
            { drift: 0.028, key: 'mid' },
            { drift: 0.075, key: 'near' }
        ];

        function layerFor(slot) {
            if (slot < 45) return LAYERS[0];   // lejana: más numerosa
            if (slot < 85) return LAYERS[1];   // media
            return LAYERS[2];                   // cercana: pocas, con personalidad
        }

        // Densidad adaptativa al área y al dispositivo (PC ~110-180, móvil ~60-120).
        function buildStars() {
            const stars = [];
            let count = Math.floor((width * height) / 9500);
            count = isMobile
                ? Math.min(120, Math.max(60, count))
                : Math.min(180, Math.max(110, count));

            for (let i = 0; i < count; i++) {
                const layer = layerFor(i % 100);
                const far = layer.key === 'far';
                const mid = layer.key === 'mid';
                const near = layer.key === 'near';

                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    layer,
                    radius: far
                        ? Math.random() * 0.4 + 0.18
                        : (mid ? Math.random() * 0.5 + 0.5 : Math.random() * 0.7 + 0.9),
                    baseAlpha: far
                        ? Math.random() * 0.14 + 0.06
                        : (mid ? Math.random() * 0.26 + 0.15 : Math.random() * 0.3 + 0.28),
                    // El parpadeo nunca es general: ligero en la capa media, apenas
                    // en la cercana, y nada en la lejana ("no todas parpadean").
                    twinkle: far
                        ? 0
                        : (mid
                            ? (Math.random() < 0.5 ? Math.random() * 0.022 + 0.005 : 0)
                            : (Math.random() < 0.3 ? Math.random() * 0.018 + 0.004 : 0)),
                    amplitude: Math.random() * 0.16 + 0.05,
                    phase: Math.random() * Math.PI * 2,
                    halo: near
                        ? Math.random() < 0.35
                        : (mid ? Math.random() < 0.06 : 0)
                });
            }
            return stars;
        }

        let backgroundStars = buildStars();
        let shootingStars = [];
        let lastMeteorSpawn = 0;
        let lastOccasionalMeteor = performance.now() + 4000;
        let lastTime = performance.now();
        let rafId = null;

        // Polvo estelar: motas muy tenues y pocas, con deriva lentísima. Aportan
        // profundidad sin que se note el efecto artificial al desactivarse.
        let dustParticles = [];
        function buildDust() {
            dustParticles = [];
            const count = isMobile ? 10 : 18;
            for (let i = 0; i < count; i++) {
                dustParticles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.22,
                    vy: (Math.random() - 0.5) * 0.12,
                    r: Math.random() * 0.6 + 0.35,
                    a: Math.random() * 0.06 + 0.03,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
        buildDust();

        function spawnShootingStar() {
            shootingStars.push({
                x: Math.random() * (width * 0.95),
                y: Math.random() * (height * 0.4),
                length: Math.random() * 60 + 40,
                speed: Math.random() * 4 + 6,
                dx: 1,
                dy: 0.6 + Math.random() * 0.3,
                life: 0,
                maxLife: 40
            });
        }

        // Meteoros: raros fuera del final y discretos durante él. Nunca una
        // lluvia constante (la estrella especial SIEMPRE es lo más importante
        // del cielo, por encima de cualquier meteoro).
        function manageMeteors(now) {
            if (prefersReducedMotion) return;
            // Durante la travesía cinematográfica no caen meteoros: el agujero
            // negro y el nacimiento de Acuario son lo único que importa.
            if (cinema.active) return;
            if (meteorShowerActive) {
                const cadence = showerIntensity >= 2 ? 1000 : 1700;
                if (now - lastMeteorSpawn >= cadence && shootingStars.length < 8) {
                    const burst = showerIntensity >= 2 ? 2 : 1;
                    for (let i = 0; i < burst; i++) spawnShootingStar();
                    lastMeteorSpawn = now;
                    lastOccasionalMeteor = now;
                }
            } else if (shootingStars.length < 1 &&
                       now - lastOccasionalMeteor > 6000 + Math.random() * 5000) {
                spawnShootingStar();
                lastOccasionalMeteor = now;
            }
        }

        function render(now) {
            if (now > lastTime + 200) lastTime = now; // salto de pestaña: evitar dt gigante

            const dt = Math.min(64, now - lastTime);
            lastTime = now;

            // Cine espacial: avanza fases y deja conf para este frame.
            updateCinema(now);
            const c = cinema.active ? cinema.conf : null;

            // Reloj maestro de la música: dispara los puntos de sincronización
            // pendientes (una llamada por frame, sin loops adicionales).
            if (window.ExperienceMusic) {
                window.ExperienceMusic.flush();
            }

            if (skyReveal < 1) {
                skyReveal = Math.min(1, (now - skyRevealStart) / 6000);
            }

            ctx.clearRect(0, 0, width, height);

            // Estrellas decorativas por capas: brillo independiente, deriva mínima
            // y (durante la intro cinematográfica) posiciones afectadas por la
            // lente del agujero negro y por la revelación progresiva por capa.
            for (let i = 0; i < backgroundStars.length; i++) {
                const s = backgroundStars[i];
                if (s.twinkle) s.phase += s.twinkle * dt * 0.05;
                const pulse = s.twinkle ? Math.sin(s.phase) * s.amplitude : 0;
                const revealMul = c ? (c.layers[s.layer.key] || 0) : skyReveal;
                const alpha = Math.max(0, Math.min(1, (s.baseAlpha + pulse) * revealMul));

                s.x += s.layer.drift * dt * 0.002;
                if (s.x > width + 2) s.x -= width + 4;
                if (s.x < -2) s.x += width + 4;

                let px = s.x;
                let py = s.y;
                let swallowed = false;

                if (c) {
                    if (c.scale < 1) {
                        px = c.ex + (px - c.ex) * c.scale;
                        py = c.ey + (py - c.ey) * c.scale;
                    }
                    if (c.lens > 0) {
                        const dx = px - c.ex;
                        const dy = py - c.ey;
                        const d2 = dx * dx + dy * dy;
                        const influence = c.holeR * 4;
                        if (d2 < influence * influence && d2 > 0.0001) {
                            const dist = Math.sqrt(d2);
                            if (dist < c.holeR * 1.15) {
                                swallowed = true; // cae tras el horizonte
                            } else {
                                // Anillo de Einstein: desplazamiento tangencial.
                                const g = c.lens * Math.pow(Math.min(1, (c.holeR * 2.2) / dist), 1.6);
                                const tx = -dy / dist;
                                const ty = dx / dist;
                                px += tx * c.holeR * 0.9 * g;
                                py += ty * c.holeR * 0.9 * g;
                                // Tirón suave hacia el disco.
                                const pullIn = c.lens * Math.max(0, 1 - dist / (c.holeR * 4)) * 24;
                                px -= (dx / dist) * pullIn;
                                py -= (dy / dist) * pullIn;
                            }
                        }
                    }
                }

                if (swallowed || alpha <= 0) continue;

                if (s.halo) {
                    ctx.globalAlpha = alpha * 0.6;
                    ctx.drawImage(halo, px - 20, py - 20, 40, 40);
                }
                ctx.globalAlpha = alpha;
                ctx.fillStyle = 'rgba(222, 230, 255, 1)';
                ctx.beginPath();
                ctx.arc(px, py, s.radius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // Agujero negro: disco de acreción y horizonte sobre el cielo.
            if (c && c.hole) {
                drawBlackHole(ctx, c, now);
            }

            // Polvo estelar: motas muy tenues con deriva lentísima (profundidad
            // atmosférica sin que se note el efecto). Se omite con movimiento
            // reducido.
            if (!prefersReducedMotion) {
                const dustMul = c ? Math.max(c.layers.far, Math.max(c.layers.mid, c.layers.near)) : 1;
                for (let i = 0; i < dustParticles.length; i++) {
                    const d = dustParticles[i];
                    d.x += d.vx;
                    d.y += d.vy;
                    if (d.x < -2) d.x = width + 2;
                    if (d.x > width + 2) d.x = -2;
                    if (d.y < -2) d.y = height + 2;
                    if (d.y > height + 2) d.y = -2;
                    ctx.globalAlpha = d.a * (0.7 + 0.3 * Math.sin((now + d.phase) * 0.001)) * dustMul;
                    ctx.fillStyle = 'rgba(200, 216, 255, 1)';
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const ss = shootingStars[i];
                ss.x += ss.speed * ss.dx;
                ss.y += ss.speed * ss.dy;
                ss.life++;

                const progress = ss.life / ss.maxLife;
                const alpha = meteorShowerActive
                    ? Math.sin(progress * Math.PI) * 0.9
                    : Math.sin(progress * Math.PI) * 0.8;

                const grad = ctx.createLinearGradient(
                    ss.x,
                    ss.y,
                    ss.x - ss.dx * ss.length,
                    ss.y - ss.dy * ss.length
                );
                grad.addColorStop(0, `rgba(226, 234, 255, ${alpha})`);
                grad.addColorStop(1, 'rgba(150, 175, 235, 0)');

                ctx.strokeStyle = grad;
                ctx.lineWidth = meteorShowerActive ? 1.8 : 1.5;
                ctx.beginPath();
                ctx.moveTo(ss.x, ss.y);
                ctx.lineTo(ss.x - ss.dx * ss.length, ss.y - ss.dy * ss.length);
                ctx.stroke();

                if (ss.life >= ss.maxLife) {
                    shootingStars.splice(i, 1);
                }
            }

            // Meteoros ocasionales (fuera del final) o un poco más presentes (final),
            // siempre discretos y por debajo de la estrella especial.
            manageMeteors(now);

            // Entrada al agujero negro / vacío: funde todo a negro puro.
            if (c && c.black > 0) {
                ctx.globalAlpha = Math.min(1, c.black);
                ctx.fillStyle = 'rgba(1, 2, 8, 1)';
                ctx.fillRect(0, 0, width, height);
                ctx.globalAlpha = 1;
            }

            if (!document.hidden) {
                // En modo estático (prefers-reduced-motion) el cielo se congela
                // cuando no hay nada que dibujar EN MOVIMIENTO; el bucle solo se
                // mantiene ENCENDIDO mientras corre la cinemática o suena la
                // música (porque el reloj maestro flush() vive dentro de este
                // frame y debe seguir disparando los hitos de la partitura,
                // incluido el crescendo y el fade del final). Al callar el tema,
                // el frame se detiene y el universo queda como pintura quieta.
                if (prefersReducedMotion && !cinema.active && !musicStillRelevant()) {
                    console.debug('[CINEMA-GATE] bucle detenido (RM) — cinema.active=' + cinema.active + ' musicStillRelevant=' + musicStillRelevant());
                    rafId = null;
                    return;
                }
                rafId = requestAnimationFrame(render);
            }
        }

        function startRender() {
            if (rafId) return;
            lastTime = performance.now();
            rafId = requestAnimationFrame(render);
        }

        // Puerta de arranque compartida: startCinematic() la invoca para que el
        // bucle del starfield se encienda también en modo estático (donde el
        // render() por sí mismo se detiene al no haber cine activo).
        window.__kickStarfield = function () {
            if (prefersReducedMotion) skyReveal = 1;
            startRender();
        };

        // Con prefers-reduced-motion se pinta un cielo estático una sola vez (el
        // bucle queda a la espera de una cinemática; al terminar se detiene).
        if (prefersReducedMotion) {
            skyReveal = 1;
            skyRevealStart = 0;
            render(performance.now());
        }
        startRender();

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            } else {
                startRender();
            }
        });

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            backgroundStars = buildStars();
            buildDust();
            renderConstellation();
            if (window.CelestialSky) CelestialSky.resize();
            if (!rafId) startRender();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 150);
        });
    }

    // --- CÁLCULO DE COORDENADAS CON PROPORCIÓN CONSTELAR Y RESPONSIVE ---
    // Mantiene la forma auténtica de Acuario tanto en pantallas verticales de móvil como en escritorio
    function getStarPixelCoords(star, width, height) {
        const isMobile = width < 768;
        
        // Márgenes de seguridad para dejar espacio a la interfaz
        const topMargin = isMobile ? Math.max(68, height * 0.11) : Math.max(80, height * 0.12);
        const bottomMargin = isMobile ? Math.max(76, height * 0.13) : Math.max(80, height * 0.12);
        const sideMargin = isMobile ? Math.max(16, width * 0.05) : Math.max(40, width * 0.08);

        const availW = Math.max(180, width - sideMargin * 2);
        const availH = Math.max(180, height - topMargin - bottomMargin);

        // Relación de aspecto natural de Acuario
        const naturalRatio = 1.0;
        let boxW, boxH;

        if (availW / availH > naturalRatio) {
            boxH = availH;
            boxW = boxH * naturalRatio;
        } else {
            boxW = availW;
            boxH = boxW / naturalRatio;
        }

        const offsetX = (width - boxW) / 2;
        const offsetY = topMargin + (availH - boxH) / 2;

        // Normalizar en base al rango de estrellas de Acuario (14..89 en X, 15..91 en Y)
        const normX = (star.x - 14) / (89 - 14);
        const normY = (star.y - 15) / (91 - 15);

        return {
            x: offsetX + normX * boxW,
            y: offsetY + normY * boxH
        };
    }

    // --- RENDERIZADO DE LA CONSTELACIÓN ---
    function renderConstellation() {
        starsContainer.innerHTML = '';
        svgLines.innerHTML = '';

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Mapeo de coordenadas calculadas para cada estrella
        const coordsMap = new Map();
        STARS.forEach(star => {
            coordsMap.set(star.id, getStarPixelCoords(star, w, h));
        });

        // Estrella que partió: si ya viajó a Géminis, Acuario queda con 13
        // (sus líneas y su nodo no vuelven a dibujarse en ningún re-render).
        const departedIds = specialDeparted ? new Set([14]) : null;

        // 1. Trazar líneas
        CONSTELLATION_LINES.forEach(([idA, idB]) => {
            if (departedIds && (departedIds.has(idA) || departedIds.has(idB))) return;
            const pA = coordsMap.get(idA);
            const pB = coordsMap.get(idB);
            if (!pA || !pB) return;

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', pA.x);
            line.setAttribute('y1', pA.y);
            line.setAttribute('x2', pB.x);
            line.setAttribute('y2', pB.y);
            line.classList.add('const-line');
            line.id = `line-${idA}-${idB}`;

            if (discoveredStars.has(idA) && discoveredStars.has(idB)) {
                line.classList.add('active');
            }

            svgLines.appendChild(line);
        });

        // 2. Colocar estrellas interactivas
        STARS.forEach(star => {
            if (departedIds && departedIds.has(star.id)) return;
            const p = coordsMap.get(star.id);
            const node = document.createElement('div');
            node.classList.add('star-node');
            node.id = `star-node-${star.id}`;
            node.style.left = `${p.x}px`;
            node.style.top = `${p.y}px`;

            const isDiscovered = discoveredStars.has(star.id);
            const isActive = star.id === currentActiveId;

            // Antes de la interacción las estrellas no se insinúan (nacen
            // progresivamente en el cine y solo se tocan cuando interactionReady).
            // Al interactuar, solo la estrella activa brilla esperando su turno.
            if (isDiscovered) {
                node.classList.add('discovered');
            } else if (isActive) {
                node.classList.add('active');
            } else {
                node.classList.add('dormant', 'hidden');
            }

            node.innerHTML = `
                <div class="star-point" aria-hidden="true"></div>
            `;

            // Manejador unificado (soporta click y tap sin delay)
            const handleInteract = (e) => {
                e.preventDefault();
                e.stopPropagation();
                onStarClick(star);
            };

            node.addEventListener('click', handleInteract);
            node.addEventListener('touchend', handleInteract, { passive: false });

            starsContainer.appendChild(node);
        });
    }

    function updateLines() {
        CONSTELLATION_LINES.forEach(([idA, idB]) => {
            const line = document.getElementById(`line-${idA}-${idB}`);
            if (line && discoveredStars.has(idA) && discoveredStars.has(idB)) {
                line.classList.add('active');
            }
        });
    }

    // Interacción al presionar una estrella
    function onStarClick(star) {
        const now = Date.now();
        // Las estrellas SOLO se tocan cuando el cine terminó naturalmente
        // (interactionReady se activa en finishCinematic).
        if (!interactionReady) return;
        if (now - lastInteractionTime < 420) return;
        if (finaleStarted) return;
        lastInteractionTime = now;

        initAudio();

        const isDiscovered = discoveredStars.has(star.id);
        const isActive = star.id === currentActiveId;

        if (!isDiscovered && !isActive) {
            triggerHaptic('light');
            playLockedTone();
            hintElement.textContent = "sigue el camino...";
            setTimeout(() => {
                hintElement.textContent = defaultHint();
            }, 2500);
            return;
        }

        triggerHaptic('light');
        playStarTone(star.id);

        // Reacción visual: destello + anillo de luz expandiéndose sobre la estrella
        const node = document.getElementById(`star-node-${star.id}`);
        if (node) {
            node.classList.remove('touched');
            void node.offsetWidth; // reinicia la animación
            node.classList.add('touched');
            setTimeout(() => node.classList.remove('touched'), 800);
        }

        // La línea que conecta esta estrella con las ya descubiertas se enciende al instante
        CONSTELLATION_LINES.forEach(([idA, idB]) => {
            const connectsDiscovered = (idA === star.id && discoveredStars.has(idB)) ||
                                       (idB === star.id && discoveredStars.has(idA));
            if (connectsDiscovered) {
                const line = document.getElementById(`line-${idA}-${idB}`);
                if (line) line.classList.add('active');
            }
        });

        currentModalStarId = star.id;
        setTimeout(() => openModal(star), 400);
    }

    function defaultHint() {
        return "";
    }

    function openModal(star) {
        isModalOpen = true;
        modalStarName.textContent = star.title;
        modalStarCount.textContent = `${star.id} · 14`;
        modalMessage.textContent = star.message;
        modalMessage.classList.remove('revealed');

        modalOverlay.classList.add('open');

        // La música baja un poco para dar paso al tono de la estrella.
        if (window.ExperienceMusic) {
            window.ExperienceMusic.duck(true, 1.2);
        }

        setTimeout(() => {
            modalMessage.classList.add('revealed');
        }, 160);
    }

    function closeModal() {
        if (!isModalOpen) return;
        isModalOpen = false;
        modalOverlay.classList.remove('open');

        triggerHaptic('medium');

        // El mensaje se cierra: la música vuelve a su nivel normal.
        if (window.ExperienceMusic) {
            window.ExperienceMusic.duck(false, 1.4);
        }

        if (currentModalStarId !== null) {
            const justUnlocked = !discoveredStars.has(currentModalStarId);
            discoveredStars.add(currentModalStarId);

            if (currentModalStarId === currentActiveId) {
                currentActiveId++;
            }

            renderConstellation();
            updateLines();
            updateProgress();

            if (justUnlocked) {
                playConnectSparkle(currentModalStarId);
            }

            if (discoveredStars.size === STARS.length) {
                setTimeout(showFinale, 1000);
            }
        }
    }

    function updateProgress() {
        // Sin textos explicativos: la figura encendida y el resplandor cuentan
        // que Acuario está completa. No se muestra ninguna frase de "completa".
        const count = discoveredStars.size;
        if (count > 0) {
            hintElement.textContent = defaultHint();
        }
    }

    // Ayuda para añadir párrafos al final con su progresión de aparición
    function addFinaleParagraph(text, delay) {
        setTimeout(() => {
            if (!finaleMessage) return;
            const p = document.createElement('p');
            p.textContent = text;
            finaleMessage.appendChild(p);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => p.classList.add('show-paragraph'));
            });
        }, delay);
    }

    // La estrella especial: nace en un punto real de Acuario (la nº14, φ Aqr) en
    // su posición exacta dentro de la constelación. Primero destaca (brillo,
    // color especial y halo) y solo después se separa. El canvas la dibuja
    // cruzando el cielo con estela (2 vueltas reales y visibles) mientras el
    // universo sigue orbitando; persigue el punto real 16 de Géminis y aterriza
    // integrada. Acuario pasa a 13 estrellas vivas (el nodo 14 y sus líneas se
    // retiran al despegar: se re-renderiza sin la estrella) y la especial no
    // vuelve. La anomalía comienza con un boost suave de la banda sonora.
    function launchSpecialStar() {
        if (!window.CelestialSky || specialDeparted) return;

        // Origen en pantalla (px CSS): ya incluye el zoom final del contenedor.
        const node = document.getElementById('star-node-14');
        if (!node) {
            specialDeparted = true;
            return;
        }
        const rect = node.getBoundingClientRect();
        const fromX = rect.left + rect.width / 2;
        const fromY = rect.top + rect.height / 2;

        specialDeparted = true;

        // Fase 1: la estrella destaca en SU sitio dentro de Acuario (cambio de
        // color + halo) durante un instante, sin moverse.
        triggerHaptic('light');
        node.classList.add('special-chosen');

        // La anomalía comienza: subida suave y progresiva de la banda sonora
        // (una sola rampa sobre el mismo nodo, nunca play() por frame).
        if (window.ExperienceMusic) {
            window.ExperienceMusic.boost(true, 3.2);
        }

        // Fase 2: su punto se desvanece, Acuario se re-dibuja con 13 y el canvas
        // inicia el vuelo EXACTAMENTE desde esa posición, sin ningún salto.
        setTimeout(() => {
            if (!window.CelestialSky) {
                specialDeparted = false;
                node.classList.remove('special-chosen', 'departed');
                return;
            }
            node.classList.add('departed');
            // Acuario se queda visiblemente con 13: se retira el nodo 14 y sus
            // líneas del dibujo interactivo. El canvas continúa el viaje desde
            // la misma posición (no hay copia: la estrella ES el objeto viajero).
            renderConstellation();

            CelestialSky.departStar({
                fromX,
                fromY,
                destId: 'Gem',
                destIndex: 16,
                onArrive(point) {
                    if (!point) return;
                    triggerHaptic('medium');
                    playMysteryNote();
                }
            });
        }, 1600);
    }

// Pantalla de cierre: una pequeña historia final escenificada.
    // 1) Al conectarse las 14 estrellas, Acuario (la constelación principal)
    //    irradia de inmediato, con un resplandor suave.
    // 2) El cielo se aleja y el zodíaco se revela; el texto flota sobre él.
    // 3) El mensaje final se escenifica y la firma cierra la experiencia.
    // 4) Cuando todo el texto está visible, aparece "Toca para continuar".
    //    NO hay temporizador de lectura: el usuario decide cuándo continuar.
    // 5) Al tocar, la estrella nº14 de Acuario destaca, se separa y cruza el
    //    cielo con estela mientras las constelaciones siguen orbitando, hasta
    //    perseguir y alcanzar la estrella 16 real de Géminis e integrarse.
    //    Acuario se queda con 13; la especial orbita con su nueva constelación.
    function showFinale() {
        finaleStarted = true;
        document.body.classList.add('constellation-complete');
        triggerHaptic('success');
        playFinaleMelody();

        // Las 14 estrellas conectadas: la banda sonora "respira" un momento
        // (baja un instante para que se escuche la melodía final y vuelve sola).
        if (window.ExperienceMusic) {
            window.ExperienceMusic.breathe(7);
        }

        // El resplandor de la constelación principal se aplica de una vez, en el
        // momento en que termina de conectarse la 14ª estrella (no se activa
        // después).
        universeContainer.classList.add('radiant');

        // Pequeña pausa con Acuario completa brillando antes del zoom
        setTimeout(() => {
            universeContainer.classList.add('zoom-out');
            meteorShowerActive = true;
            showerIntensity = 2;
            finaleOverlay.classList.add('show');
        }, 1600);

        // El final: entre las constelaciones hay una que es suya (no se dice cuál,
        // se ve al iluminarse cuando aparece la estrella de ella).
        const texts = [
            "Entre todas las constelaciones del cielo, hay una que siempre fue mía.",
            "Sus estrellas ya estaban contadas.",
            "Pero entonces llegaste tú."
        ];
        const textsStart = 3800;
        const textGap = 3000;
        texts.forEach((text, i) => {
            addFinaleParagraph(text, textsStart + i * textGap);
        });

        // El resto de frases flota en la misma pausa de lectura.
        const lastMainTime = textsStart + texts.length * textGap;
        addFinaleParagraph("Es la única que no sigue las reglas del mapa.", lastMainTime + 2200);
        addFinaleParagraph("Tú apareciste poco a poco en mi vida.", lastMainTime + 4800);
        addFinaleParagraph("Y llegaste para quedarte para siempre.", lastMainTime + 6400);
        addFinaleParagraph("Esa estrella lleva tu nombre.", lastMainTime + 8000);
        addFinaleParagraph("La puse yo, y la puse para ti.", lastMainTime + 9800);

        // La firma cierra la experiencia
        const signTime = lastMainTime + 12800;
        setTimeout(() => {
            finaleSign.classList.add('show-sign');
        }, signTime);

        // Sin temporizador de lectura: cuando el texto y la firma terminaron su
        // entrada, se muestra "Toca para continuar" y ES EL USUARIO quien decide.
        // El universo no se detiene en ningún momento (la órbita ya viaja sola).
        setTimeout(showFinaleContinue, signTime + 1400);
    }

    // El mensaje terminó de aparecer: se muestra la indicación suave y toda la
    // zona del final queda interactiva. Sin relojes: esperamos el toque.
    function showFinaleContinue() {
        if (anomalyStarted) return;
        finaleContinueReady = true;
        if (finaleContinue) finaleContinue.classList.add('show');
        finaleOverlay.classList.add('continue-ready');
    }

    // El usuario continúa: la indicación se retira, el telón de texto se despeja
    // (dejando a la vista el cielo que sigue orbitando) y la estrella especial
    // inicia su viaje. Guardas para evitar la doble activación.
    function continueToAnomaly() {
        if (!finaleContinueReady || anomalyStarted) return;
        if (!finaleStarted) return;
        anomalyStarted = true;
        finaleContinueReady = false;

        if (finaleContinue) finaleContinue.classList.remove('show');
        finaleOverlay.classList.remove('continue-ready');

        // El texto se retira rápido para que el destello de la estrella se vea
        // limpio contra el cielo vivo; el escenario completa su fade de fondo.
        if (finaleContent) finaleContent.classList.add('gone');
        finaleOverlay.classList.remove('show');

        launchSpecialStar();
    }



    // Eventos de usuario
    // --- INTRO CINEMATOGRÁFICA (sincronizada a la partitura real) ---
    // La experiencia espera en negro (standby) hasta el PRIMER toque. Ese primer
    // click/tap es la ÚNICA acción de inicio: desbloquea el AudioContext, inicia
    // la música en fade-in y arranca la travesía visual DESDE el segundo 0 del
    // tema. El cine se reproduce completo y NO se puede saltar: ninguna fase se
    // cancela por desbloquear el audio. Las estrellas NO se tocan hasta el final
    // natural de la secuencia (TIMELINE.interactionOpen → finishCinematic()).
    // Estados separados: audioUnlocked / cinematicStarted / cinematicFinished /
    // interactionReady.

    // Comienza la travesía visual. Siempre se ejecuta (con o sin reduced-motion:
    // con la preferencia activa la secuencia se comprime pero nunca se salta).
    function startCinematic() {
        stopIntroTimers();
        cinematicStarted = true;
        cinema.active = true;
        cinema.t0 = performance.now();
        cinema.phase = 'hold';
        cinema.birthSent = false;
        console.debug('[CINEMA] startCinematic t0=' + cinema.t0 + ' rm=' + prefersReducedMotion);
        document.body.classList.add('cinema-lock');
        // En modo estático el bucle del starfield se enciende para dibujar la
        // travesía y se detiene solo cuando termina.
        if (window.__kickStarfield) window.__kickStarfield();
    }

    // Fin natural del cine: el universo nuevo nació y Acuario está visible. Este
    // es el ÚNICO punto en el que se habilita la interacción con las estrellas
    // (idempotente: un segundo toque jamás salta la travesía).
    function finishCinematic() {
        if (cinematicFinished) return;
        cinematicFinished = true;
        cinema.active = false;
        stopIntroTimers();
        interactionReady = true;
        document.body.classList.remove('cinema-lock');

        triggerHaptic('light');
        playIntroSparkle();

        introOverlay.classList.add('fade-out');
        setTimeout(() => {
            introOverlay.style.display = 'none';
        }, 1200);

        renderConstellation();
        setInteractionHint();
    }

    function setInteractionHint() {
        hintElement.textContent = "Toca una estrella";
    }

    // Subidas de intensidad del final ancladas a la partitura real. Se registran
    // una sola vez; ExperienceMusic.flush() las dispara desde el reloj maestro:
    //   03:28.66 pico pre-drop      → la música crece un escalón
    //   03:52.74 aproximación final → la música se eleva más
    //   03:54.02 pico máximo        → pleno brillo
    //   03:55.38 CLÍMAX FINAL       → crescendo emocional y fade final
    // Si el usuario aún está leyendo el mensaje, estos escalones acompañan la
    // canción real (coherente con su energía); si la anomalía ya viaja, preparan
    // la llegada. Nunca se vuelve a llamar a play() aquí.
    function scheduleMusicFinale() {
        const M = window.ExperienceMusic;
        if (!M || typeof M.onTime !== 'function') return;
        M.onTime(208.59, function () { M.setLevel(0.72); });
        M.onTime(232.74, function () { M.setLevel(0.86); });
        M.onTime(234.02, function () { M.setLevel(1.0); });
        M.onTime(235.38, function () { M.climaxThenFade(2, 9); });
    }

    // ÚNICA acción de inicio. El primer click/tap:
    //   1) desbloquea el AudioContext,
    //   2) inicia la música (fade-in),
    //   3) comienza la experiencia desde el principio.
    // No hay más listeners que escuchen ese mismo gesto. El guard
    // experienceStarted impide que un doble evento (touchend + click) o un
    // segundo toque provoquen una segunda transición.
    let experienceStarted = false;
    const beginExperience = (e) => {
        if (experienceStarted) return;
        experienceStarted = true;
        if (e) e.preventDefault();
        console.debug('[CINEMA] beginExperience audioUnlocked=' + audioUnlocked + ' cinematicStarted=' + cinematicStarted + ' cinematicFinished=' + cinematicFinished + ' interactionReady=' + interactionReady);
        initAudio();
        console.debug('[CINEMA] tras initAudio audioUnlocked=' + audioUnlocked);
        startCinematic();
    };

    introOverlay.addEventListener('click', beginExperience);
    introOverlay.addEventListener('touchend', beginExperience, { passive: false });

    modalCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
    });
    modalCloseBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        closeModal();
    }, { passive: false });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });

    // Continuación del final: UN SOLO flujo. El primer toque válido (click o
    // touchend, con o sin la indicación bajo el dedo) pasa por la misma guarda
    // continueToAnomaly(): despeja el mensaje y lanza launchSpecialStar().
    // El touch previene el click sintético (no hay doble disparo) y, por si
    // ambos eventos llegaran a ocurrir, la guarda es idempotente.
    finaleOverlay.addEventListener('click', continueToAnomaly);
    finaleOverlay.addEventListener('touchend', (e) => {
        e.preventDefault();
        continueToAnomaly();
    }, { passive: false });
    if (finaleContinue) {
        finaleContinue.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                continueToAnomaly();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeModal();
        }
    });

    // Iniciar aplicación
    function startApp() {
        setupStarfield();
        renderConstellation();
        if (window.CelestialSky && celestialMap) CelestialSky.init(celestialMap);
        // Subidas de intensidad del final ancladas a los segundos reales de la
        // partitura (una sola vez; el reloj maestro las dispara con flush()).
        scheduleMusicFinale();
        // La experiencia espera en negro (standby) hasta el PRIMER toque. Ese
        // primer click/tap es la ÚNICA acción de inicio: desbloquea el audio,
        // arranca la música y comienza la travesía visual desde el segundo 0
        // del tema (beginExperience → startCinematic). El cine se reproduce
        // completo (music-paced) y las estrellas solo se activan en su final
        // natural (TIMELINE.interactionOpen → finishCinematic()).
    }

    // Atajo temporal para probar el final sin completar las 14 estrellas
    const goFinalBtn = document.getElementById('go-final');
    if (goFinalBtn) {
        goFinalBtn.addEventListener('click', () => {
            stopIntroTimers();
            introOverlay.style.display = 'none';
            isModalOpen = false;
            modalOverlay.classList.remove('open');
            // Salió del cine aunque la intro no haya terminado: se marca como
            // terminada y se abre el cielo normal (sin re-saltos).
            cinema.active = false;
            cinematicFinished = true;
            interactionReady = true;
            document.body.classList.remove('cinema-lock');
            initAudio();
            showFinale();
        });
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

})();
