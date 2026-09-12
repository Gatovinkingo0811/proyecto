/**
 * Constelación de Acuario para Charlotte
 * Experiencia interactiva astronómica y poética
 * Totalmente optimizada para móvil y escritorio
 */

(function () {
    'use strict';

    // 14 Estrellas principales de la constelación de Acuario
    // Coordenadas calibradas con respecto a la figura tradicional de Acuario
    const STARS = [
        {
            id: 1,
            name: "Albali",
            bayer: "ε Aqr",
            x: 16,
            y: 54,
            message: "Hay personas que llegan a tu vida y desde el primer momento sabes que hay algo diferente. No necesité mucho tiempo para darme cuenta de que tú eras una de esas personas. Desde que te conocí, algo cambió."
        },
        {
            id: 2,
            name: "Sadalsuud",
            bayer: "β Aqr",
            x: 34,
            y: 42,
            message: "Siempre hubo algo en tu sonrisa que me llamó la atención. No sé exactamente cómo explicarlo, pero tiene esa forma de hacer que todo se sienta un poco más tranquilo. Como si por un momento las cosas simplemente estuvieran bien."
        },
        {
            id: 3,
            name: "Sadalmelik",
            bayer: "α Aqr",
            x: 48,
            y: 26,
            message: "Tus ojos tienen algo especial. No hablo solamente de cómo se ven, sino de lo que cuentan. Siempre sentí que detrás de ellos había una historia que merecía ser escuchada, y me alegra mucho haber podido conocer partes de esa historia."
        },
        {
            id: 4,
            name: "Seat",
            bayer: "π Aqr",
            x: 58,
            y: 17,
            message: "Más allá de cualquier detalle físico, lo que más valoro de ti es la forma en que me tratas. Nunca tuve que adivinar si estaba bien ser yo mismo contigo. Me lo hiciste sentir desde el principio, y eso es algo que no olvido."
        },
        {
            id: 5,
            name: "Sadachbia",
            bayer: "γ Aqr",
            x: 58,
            y: 31,
            message: "Los momentos que más recuerdo no son los grandes ni los complicados. Son los sencillos. Como cuando jugábamos en el salón sin pensar en nada más. Esos momentos tenían la capacidad de hacer que todo lo demás dejara de importar por un rato."
        },
        {
            id: 6,
            name: "ζ Aqr",
            bayer: "ζ Aqr",
            x: 65,
            y: 26,
            message: "Me gusta que puedo hablar contigo y sentirme seguro. Esa confianza no es algo que le doy a cualquier persona, pero contigo siempre se sintió natural. No tuve que forzar nada, simplemente pasó."
        },
        {
            id: 7,
            name: "η Aqr",
            bayer: "η Aqr",
            x: 71,
            y: 29,
            message: "Aprendí a valorar muchísimo la forma en que me escuchas. Contigo pude abrirme y contar cosas que normalmente me cuesta expresar. No porque me las pidieras, sino porque me sentía lo suficientemente cómodo para hacerlo."
        },
        {
            id: 8,
            name: "Ancha",
            bayer: "θ Aqr",
            x: 52,
            y: 53,
            message: "Me importa genuinamente cómo estás. Y valoro mucho que tú también hayas confiado en mí para contarme cosas. Eso no es algo que tomo a la ligera. Cuando me compartes algo, lo guardo con cuidado."
        },
        {
            id: 9,
            name: "σ Aqr",
            bayer: "σ Aqr",
            x: 57,
            y: 63,
            message: "Conocerte me hizo entender que el cariño puede sentirse seguro. Que no todo tiene que ser complicado. Que una persona puede significar muchísimo simplemente por estar ahí de verdad, sin necesidad de grandes gestos."
        },
        {
            id: 10,
            name: "Skat",
            bayer: "δ Aqr",
            x: 72,
            y: 74,
            message: "Te admiro por quién eres. No por lo que haces o por lo que logras, sino por la persona que eres cuando nadie está prestando atención. Esa versión de ti es la que más me importa."
        },
        {
            id: 11,
            name: "Hydor",
            bayer: "λ Aqr",
            x: 76,
            y: 48,
            message: "Me alegra verte crecer y avanzar. Quiero que te vaya bien en tus estudios, en tus proyectos, en todo lo que te propongas. Y quiero que sepas que siempre voy a estar genuinamente contento cuando las cosas te salgan bien."
        },
        {
            id: 12,
            name: "τ² Aqr",
            bayer: "τ² Aqr",
            x: 70,
            y: 83,
            message: "Quiero que seas feliz. No de la forma en que la gente lo dice por compromiso, sino de verdad. Tu felicidad me importa independientemente de cualquier otra cosa. Simplemente porque te quiero bien."
        },
        {
            id: 13,
            name: "88 Aqr",
            bayer: "c² Aqr",
            x: 82,
            y: 89,
            message: "Tienes un lugar muy especial en mi vida. No porque yo lo haya decidido estratégicamente, sino porque así se fue construyendo con el tiempo, con cada conversación, con cada momento compartido."
        },
        {
            id: 14,
            name: "φ Aqr",
            bayer: "φ Aqr",
            x: 87,
            y: 42,
            message: "Mi cariño por ti es sincero. No quiero que sea una obligación, ni que sientas que tienes que hacer algo con él. Simplemente quiero que lo sepas, porque creo que las personas merecen saber cuándo alguien las quiere de verdad."
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

    // Las otras 11 constelaciones del zodíaco, dispuestas en anillo alrededor de
    // Acuario (que ocupa el centro) para que ninguna pase por encima de la principal.
    // Coordenadas en porcentaje (%) del viewport, compactas y bien separadas.
    const ZODIAC_CONSTELLATIONS = [
        // Aries — parte superior central: cuerno y rizo
        {
            id: 'aries',
            name: 'Aries',
            stars: [[44, 10], [50, 6], [56, 11], [51, 15], [45, 14]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
        },
        // Taurus — superior derecha: V de cuernos
        {
            id: 'taurus',
            name: 'Taurus',
            stars: [[75, 11], [80, 8], [85, 13], [81, 17], [77, 15]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
        },
        // Gemini — derecha: los gemelos
        {
            id: 'gemini',
            name: 'Gemini',
            stars: [[87, 28], [91, 33], [87, 39], [91, 44], [84, 35]],
            lines: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 2]]
        },
        // Cancer — derecha central: pequeña Y
        {
            id: 'cancer',
            name: 'Cancer',
            stars: [[90, 52], [95, 49], [91, 56], [86, 60]],
            lines: [[0, 1], [0, 2], [2, 3]]
        },
        // Leo — inferior derecha: hoz y cuerpo
        {
            id: 'leo',
            name: 'Leo',
            stars: [[90, 72], [86, 77], [91, 82], [84, 85], [79, 80], [83, 75]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]
        },
        // Virgo — inferior: paralelogramo inclinado (lejos del centro)
        {
            id: 'virgo',
            name: 'Virgo',
            stars: [[64, 92], [59, 87], [65, 82], [71, 87], [68, 95]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
        },
        // Libra — inferior central: la balanza
        {
            id: 'libra',
            name: 'Libra',
            stars: [[46, 94], [51, 89], [56, 94], [51, 98]],
            lines: [[0, 1], [1, 2], [1, 3]]
        },
        // Scorpius — inferior izquierda: cola de escorpión
        {
            id: 'scorpius',
            name: 'Scorpius',
            stars: [[30, 90], [24, 85], [18, 88], [13, 94], [19, 98], [26, 94]],
            lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]]
        },
        // Sagittarius — izquierda: arco de la tetera
        {
            id: 'sagittarius',
            name: 'Sagittarius',
            stars: [[10, 72], [6, 65], [12, 59], [18, 63], [16, 70]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [0, 2]]
        },
        // Capricornus — izquierda: V del pez-cabra
        {
            id: 'capricornus',
            name: 'Capricornus',
            stars: [[7, 50], [12, 45], [9, 39], [4, 41], [3, 47]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
        },
        // Pisces — superior izquierda: cadena con nudo
        {
            id: 'pisces',
            name: 'Pisces',
            stars: [[11, 28], [17, 24], [22, 28], [28, 24], [24, 19], [18, 19]],
            lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]]
        }
    ];

    const FINALE_PARAGRAPHS = [
        "Todas estas estrellas son solamente pequeñas partes de todo lo que pienso cuando pienso en ti.",
        "No sé si existe una forma perfecta de explicar lo mucho que significas para mí, pero quería intentar hacerlo de una manera que fuera solamente nuestra.",
        "Gracias por todos esos momentos, por escucharme, por confiar en mí y simplemente por ser tú.",
        "Me alegra muchísimo haberte conocido, Charlotte.",
        "Te quiero y te aprecio muchísimo."
    ];

    // Estado
    let discoveredStars = new Set();
    let currentActiveId = 1;
    let isModalOpen = false;
    let currentModalStarId = null;
    let audioCtx = null;
    let lastInteractionTime = 0;

    // Elementos del DOM
    const starsContainer = document.getElementById('stars-container');
    const svgLines = document.getElementById('constellation-lines');
    const zodiacBackground = document.getElementById('zodiac-background');
    const universeContainer = document.getElementById('universe-container');
    const hintElement = document.getElementById('hint');
    const introOverlay = document.getElementById('intro-overlay');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalMessage = document.getElementById('modal-message');
    const modalCloseBtn = document.getElementById('modal-close');
    const finaleOverlay = document.getElementById('finale-overlay');
    const finaleMessage = document.getElementById('finale-message');
    const finaleSign = document.querySelector('.finale-sign');

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

    // Desbloqueo de audio en el primer toque en móvil
    ['touchstart', 'pointerdown', 'click'].forEach(evtType => {
        document.addEventListener(evtType, function unlockAudio() {
            initAudio();
            document.removeEventListener(evtType, unlockAudio);
        }, { once: true, passive: true });
    });

    // --- CIELO ESTRELLADO (CANVAS) ---
    let meteorShowerActive = false;
    let showerIntensity = 0;

    function setupStarfield() {
        const canvas = document.getElementById('starfield');
        const ctx = canvas.getContext('2d');
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const backgroundStars = [];
        const isMobile = width < 768;
        const STAR_COUNT = isMobile ? Math.min(100, Math.floor((width * height) / 8000)) : 160;

        for (let i = 0; i < STAR_COUNT; i++) {
            backgroundStars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.2 + 0.3,
                baseAlpha: Math.random() * 0.55 + 0.2,
                twinkleSpeed: Math.random() * 0.03 + 0.01,
                phase: Math.random() * Math.PI * 2
            });
        }

        let shootingStars = [];
        let spawnTick = 0;
        let lastSpawnCheck = performance.now();

        function spawnShootingStar() {
            shootingStars.push({
                x: Math.random() * (width * 0.95),
                y: Math.random() * (height * 0.4),
                length: Math.random() * 60 + 40,
                speed: Math.random() * 4 + 6,
                dx: 1,
                dy: 0.6 + Math.random() * 0.3,
                alpha: 1,
                life: 0,
                maxLife: 40
            });
        }

        function addShootingStar() {
            if (meteorShowerActive) {
                const burst = showerIntensity >= 2 ? 3 : 1;
                for (let i = 0; i < burst && shootingStars.length < (showerIntensity >= 2 ? 26 : 10); i++) {
                    spawnShootingStar();
                }
            } else if (Math.random() < 0.35 && shootingStars.length < 2) {
                spawnShootingStar();
            }
        }

        function meteorLoop(now) {
            if (meteorShowerActive) {
                const elapsed = now - lastSpawnCheck;
                const interval = showerIntensity >= 2 ? 220 : 650;
                if (elapsed >= interval) {
                    addShootingStar();
                    lastSpawnCheck = now;
                }
                if (spawnTick > 0) {
                    window.clearInterval(spawnTick);
                    spawnTick = 0;
                }
            } else if (!spawnTick) {
                lastSpawnCheck = 0;
                spawnTick = window.setInterval(addShootingStar, 5500);
            }
        }

        function render() {
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < backgroundStars.length; i++) {
                const s = backgroundStars[i];
                s.phase += s.twinkleSpeed;
                const alpha = s.baseAlpha + Math.sin(s.phase) * 0.25;

                ctx.fillStyle = `rgba(224, 231, 255, ${Math.max(0.1, Math.min(1, alpha))})`;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                ctx.fill();
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
                grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                grad.addColorStop(1, 'rgba(167, 139, 250, 0)');

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

            meteorLoop(performance.now());
            requestAnimationFrame(render);
        }

        render();

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            renderConstellation();
            renderZodiacBackground();
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

        // 1. Trazar líneas
        CONSTELLATION_LINES.forEach(([idA, idB]) => {
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
            const p = coordsMap.get(star.id);
            const node = document.createElement('div');
            node.classList.add('star-node');
            node.id = `star-node-${star.id}`;
            node.style.left = `${p.x}px`;
            node.style.top = `${p.y}px`;

            const isDiscovered = discoveredStars.has(star.id);
            const isActive = star.id === currentActiveId;

            if (isDiscovered) {
                node.classList.add('discovered');
            } else if (isActive) {
                node.classList.add('active');
            } else {
                node.classList.add('dormant');
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

        if (!document.querySelector('.constellation-name')) {
            const mark = document.createElement('div');
            mark.className = 'constellation-name';
            mark.textContent = 'Aquarius · El Aguador';
            document.body.appendChild(mark);
        }
    }

    function updateLines() {
        CONSTELLATION_LINES.forEach(([idA, idB]) => {
            const line = document.getElementById(`line-${idA}-${idB}`);
            if (line && discoveredStars.has(idA) && discoveredStars.has(idB)) {
                line.classList.add('active');
            }
        });
    }

    // --- FONDO DEL ZODÍACO (resto de constelaciones, no interactivas) ---
    function renderZodiacBackground() {
        if (!zodiacBackground) return;
        zodiacBackground.innerHTML = '';

        const w = window.innerWidth;
        const h = window.innerHeight;

        ZODIAC_CONSTELLATIONS.forEach((cz, idx) => {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'zodiac-group');

            // Grupo interno animado: cada constelación gira y se mece con su propio ritmo
            const glider = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            glider.setAttribute('class', 'zodiac-glide');

            const orbitDur = 8 + (idx * 5) % 10;
            const amp = 2.8 + (idx % 4) * 0.8;
            const bob = 3 + (idx % 3) * 2;

            glider.style.setProperty('--orbit-dur', orbitDur + 's');
            glider.style.setProperty('--rot-a', (-amp).toFixed(2) + 'deg');
            glider.style.setProperty('--rot-b', amp.toFixed(2) + 'deg');
            glider.style.setProperty('--bob', bob + 'px');
            glider.style.setProperty('--glide-delay', (-(idx * 1.9)).toFixed(2) + 's');

            const pts = cz.stars.map(([px, py]) => ({ x: (px / 100) * w, y: (py / 100) * h }));

            cz.lines.forEach(([ia, ib], li) => {
                const a = pts[ia];
                const b = pts[ib];
                if (!a || !b) return;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', a.x);
                line.setAttribute('y1', a.y);
                line.setAttribute('x2', b.x);
                line.setAttribute('y2', b.y);
                line.setAttribute('class', 'zodiac-line');
                line.style.setProperty('--flow-delay', ((li * 0.37) % 2).toFixed(2) + 's');
                glider.appendChild(line);
            });

            pts.forEach((p, pi) => {
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', p.x);
                dot.setAttribute('cy', p.y);
                dot.setAttribute('r', 2.2);
                dot.setAttribute('class', 'zodiac-dot');
                dot.style.setProperty('--pulse-dur', (2.8 + (pi % 3) * 0.9).toFixed(2) + 's');
                dot.style.setProperty('--pulse-delay', ((pi * 0.63) % 3).toFixed(2) + 's');
                glider.appendChild(dot);
            });

            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            const center = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
            center.x /= pts.length;
            center.y /= pts.length;
            const labelY = center.y / h > 0.55 ? center.y - 12 : center.y + 10;
            label.setAttribute('x', center.x);
            label.setAttribute('y', labelY);
            label.setAttribute('class', 'zodiac-name');
            label.style.setProperty('--glow-delay', (-(idx * 2.3) % 5).toFixed(2) + 's');
            label.textContent = cz.name;
            glider.appendChild(label);

            group.appendChild(glider);
            zodiacBackground.appendChild(group);
        });
    }

    // Interacción al presionar una estrella
    function onStarClick(star) {
        const now = Date.now();
        if (now - lastInteractionTime < 280) return;
        lastInteractionTime = now;

        initAudio();

        const isDiscovered = discoveredStars.has(star.id);
        const isActive = star.id === currentActiveId;

        if (!isDiscovered && !isActive) {
            triggerHaptic('light');
            playLockedTone();
            hintElement.textContent = "Sigue el camino... toca la estrella que brilla";
            setTimeout(() => {
                hintElement.textContent = "toca la estrella que brilla";
            }, 2500);
            return;
        }

        triggerHaptic('light');
        playStarTone(star.id);

        currentModalStarId = star.id;
        openModal(star);
    }

    function openModal(star) {
        isModalOpen = true;
        modalMessage.textContent = star.message;
        modalMessage.classList.remove('revealed');

        modalOverlay.classList.add('open');

        setTimeout(() => {
            modalMessage.classList.add('revealed');
        }, 160);
    }

    function closeModal() {
        if (!isModalOpen) return;
        isModalOpen = false;
        modalOverlay.classList.remove('open');

        triggerHaptic('medium');

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
        const count = discoveredStars.size;
        const total = STARS.length;

        if (count === total) {
            hintElement.textContent = "La constelación de Acuario está completa ✨";
        } else if (count > 0) {
            hintElement.textContent = "toca la siguiente estrella que brilla";
        }
    }

    // Pantalla de cierre y mensaje final
    function showFinale() {
        document.body.classList.add('constellation-complete');
        triggerHaptic('success');
        playFinaleMelody();

        // El cielo se aleja: zoom out de Acuario y revelación del zodíaco completo
        universeContainer.classList.add('zoom-out');
        zodiacBackground.classList.add('visible');
        renderZodiacBackground();
        meteorShowerActive = true;
        showerIntensity = 2;

        finaleMessage.innerHTML = '';
        FINALE_PARAGRAPHS.forEach((text, i) => {
            const p = document.createElement('p');
            p.textContent = text;
            finaleMessage.appendChild(p);

            setTimeout(() => {
                p.classList.add('show-paragraph');
            }, 600 + i * 800);
        });

        setTimeout(() => {
            finaleSign.classList.add('show-sign');
        }, 600 + FINALE_PARAGRAPHS.length * 800);

        let actions = document.querySelector('.finale-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'finale-actions';
            actions.innerHTML = `
                <button class="btn-view-constellation" type="button">
                    Ver constelación completa
                </button>
            `;
            document.getElementById('finale-content').appendChild(actions);

            const btn = actions.querySelector('.btn-view-constellation');
            const closeFinaleView = (e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerHaptic('light');

                // El cielo completo queda frente a Charlotte: todas las constelaciones
                // en el mismo plano, con Acuario destacando por encima de todas
                universeContainer.classList.add('radiant');
                showerIntensity = 1;
                finaleOverlay.classList.remove('show');
            };

            btn.addEventListener('click', closeFinaleView);
            btn.addEventListener('touchend', closeFinaleView, { passive: false });
        }

        setTimeout(() => {
            actions.classList.add('show-actions');
        }, 800 + FINALE_PARAGRAPHS.length * 800);

        finaleOverlay.classList.add('show');
    }



    // Eventos de usuario
    const dismissIntro = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        initAudio();
        triggerHaptic('light');
        playIntroSparkle();
        introOverlay.classList.add('fade-out');
        setTimeout(() => {
            introOverlay.style.display = 'none';
        }, 1200);
    };

    introOverlay.addEventListener('click', dismissIntro);
    introOverlay.addEventListener('touchend', dismissIntro, { passive: false });

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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isModalOpen) {
            closeModal();
        }
    });

    // Botón para alternar la silueta mística en modo contemplación
    const toggleSilhouetteBtn = document.getElementById('btn-toggle-silhouette');
    if (toggleSilhouetteBtn) {
        const onToggleSilhouette = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            triggerHaptic('light');
            playStarTone(10);
            const isHidden = document.body.classList.toggle('silhouette-hidden');
            toggleSilhouetteBtn.querySelector('span').textContent = isHidden ? '✦ Ver silueta' : '✦ Ocultar silueta';
        };
        toggleSilhouetteBtn.addEventListener('click', onToggleSilhouette);
        toggleSilhouetteBtn.addEventListener('touchend', onToggleSilhouette, { passive: false });
    }

    // Iniciar aplicación
    function startApp() {
        setupStarfield();
        renderConstellation();
        renderZodiacBackground();
        updateProgress();
    }

    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

})();
