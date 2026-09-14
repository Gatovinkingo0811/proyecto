/*
 * Intro visual — reemplazo directo basado en implementaciones open source.
 *
 * Galaxy: threejs-galaxy-shader 1.0.2 (MIT).
 * Black hole: @junhoyeo/blackhole 1.0.2 (Apache-2.0).
 *
 * Un único canvas y una única escena activa a la vez. No hay imágenes,
 * partículas DOM, overlays acumulativos ni Canvas 2D procedural.
 */

(async function () {
    'use strict';

    const baseCanvas = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!baseCanvas || !button) return;

    const oldImageStage = document.getElementById('cinematic-image-stage');
    if (oldImageStage) oldImageStage.remove();
    const oldPolish = document.getElementById('cinematic-polish-layer');
    if (oldPolish) oldPolish.remove();
    const oldWebgl = document.getElementById('cinematic-webgl');
    if (oldWebgl) oldWebgl.remove();

    let THREE;
    let GalaxyGeometry;
    let GalaxyShader;
    let BlackholeRenderer;

    try {
        THREE = await import('https://esm.sh/three@0.145.0');
        ({ GalaxyGeometry, GalaxyShader } = await import(
            'https://esm.sh/threejs-galaxy-shader@1.0.2?deps=three@0.145.0'
        ));
        ({ BlackholeRenderer } = await import(
            'https://esm.sh/@junhoyeo/blackhole@1.0.2?deps=three@0.145.0'
        ));
    } catch (error) {
        console.error('[intro] No se pudieron cargar los renderers open source:', error);
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-webgl';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
        'position:fixed',
        'inset:0',
        'width:100%',
        'height:100%',
        'z-index:8',
        'pointer-events:none',
        'display:none',
        'background:#000'
    ].join(';');
    document.body.appendChild(canvas);

    const reduced = !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );

    let galaxyRenderer = null;
    let galaxyScene = null;
    let galaxyCamera = null;
    let galaxyPoints = null;
    let galaxyMaterial = null;
    let galaxyGeometry = null;
    let blackhole = null;
    let galaxyRAF = 0;
    let blackholeActive = false;
    let startedAt = 0;
    let running = false;
    let switchedToHole = false;

    const T = {
        firstSound: 2.43,
        holeStart: 24.5,
        holeEnd: 31.9
    };

    function clamp(v, a = 0, b = 1) {
        return Math.max(a, Math.min(b, v));
    }

    function smooth(v) {
        v = clamp(v);
        return v * v * (3 - 2 * v);
    }

    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (
            M &&
            typeof M.isPlaying === 'function' &&
            M.isPlaying() &&
            typeof M.now === 'function'
        ) {
            const t = M.now();
            if (Number.isFinite(t) && t >= 0) return t;
        }
        return (now - startedAt) / 1000;
    }

    function internalResolution() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const mobile = w < 768;
        const scale = mobile ? 0.50 : 0.60;
        const maxPixels = mobile ? 420000 : 700000;
        let rw = Math.max(480, Math.floor(w * scale));
        let rh = Math.max(270, Math.floor(h * scale));
        const pixels = rw * rh;
        if (pixels > maxPixels) {
            const f = Math.sqrt(maxPixels / pixels);
            rw = Math.floor(rw * f);
            rh = Math.floor(rh * f);
        }
        return { rw, rh };
    }

    function resizeGalaxy() {
        if (!galaxyRenderer || !galaxyCamera) return;
        const { rw, rh } = internalResolution();
        galaxyRenderer.setPixelRatio(1);
        galaxyRenderer.setSize(rw, rh, false);
        galaxyCamera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
        galaxyCamera.updateProjectionMatrix();
        if (galaxyMaterial && galaxyMaterial.uniforms) {
            const resolution = galaxyMaterial.uniforms.u_resolution;
            if (resolution && resolution.value && resolution.value.set) {
                resolution.value.set(rw, rh);
            }
        }
    }

    function createGalaxy() {
        galaxyScene = new THREE.Scene();
        galaxyScene.background = new THREE.Color(0x01020a);

        galaxyCamera = new THREE.PerspectiveCamera(
            62,
            window.innerWidth / Math.max(1, window.innerHeight),
            0.1,
            1000
        );

        // Cámara metida dentro del disco: vemos un fragmento, no la galaxia completa.
        galaxyCamera.position.set(0.0, 0.15, 1.48);
        galaxyCamera.lookAt(0, 0, 0);

        galaxyRenderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            alpha: false,
            powerPreference: 'high-performance'
        });

        galaxyRenderer.outputEncoding = THREE.sRGBEncoding;

        const config = {
            spiralCount: 4,
            turnsPerSpiral: 1.35,
            totalStars: reduced ? 6500 : 10500,
            pointSize: reduced ? 1.55 : 1.9,
            blackHoleRadius: 0.075,
            colorMode: 2,
            color: new THREE.Color(0x8fa8ff),
            colorIntensity: 1.18
        };

        galaxyGeometry = new GalaxyGeometry(config.totalStars);
        galaxyMaterial = new GalaxyShader({
            resolution: new THREE.Vector2(1, 1),
            color: config.color,
            pointSize: config.pointSize,
            totalStars: config.totalStars,
            time: 0,
            blackHoleRadius: config.blackHoleRadius,
            blackHolePosition: new THREE.Vector3(0, 0, 0),
            spiralCount: config.spiralCount,
            turnsPerSpiral: config.turnsPerSpiral,
            colorMode: config.colorMode,
            colorIntensity: config.colorIntensity,
            fadeNear: 0.15,
            fadeFar: 18.0
        });

        galaxyPoints = new THREE.Points(galaxyGeometry, galaxyMaterial);
        galaxyScene.add(galaxyPoints);

        resizeGalaxy();
    }

    function disposeGalaxy() {
        cancelAnimationFrame(galaxyRAF);
        galaxyRAF = 0;

        if (galaxyPoints) {
            galaxyPoints.geometry && galaxyPoints.geometry.dispose();
            galaxyPoints.material && galaxyPoints.material.dispose();
            galaxyPoints = null;
        }
        if (galaxyRenderer) {
            galaxyRenderer.dispose();
            galaxyRenderer = null;
        }
        galaxyScene = null;
        galaxyCamera = null;
        galaxyGeometry = null;
        galaxyMaterial = null;
    }

    function animateGalaxy(now) {
        if (!running || blackholeActive || !galaxyRenderer || !galaxyScene || !galaxyCamera) return;

        const raw = musicTime(now);
        const m = reduced ? 0.42 : 1;
        const t = raw / m;

        if (galaxyMaterial && galaxyMaterial.uniforms && galaxyMaterial.uniforms.u_time) {
            galaxyMaterial.uniforms.u_time.value = raw * 0.16;
        }

        // Vuelo lento dentro del brazo: cambios mínimos de cámara, sin deformar la figura.
        const drift = Math.min(1, Math.max(0, (t - T.firstSound) / (T.holeStart - T.firstSound)));
        galaxyCamera.position.x = Math.sin(t * 0.075) * 0.18 * drift;
        galaxyCamera.position.y = 0.15 + Math.cos(t * 0.06) * 0.10 * drift;
        galaxyCamera.position.z = 1.48 - smooth(drift) * 0.30;
        galaxyCamera.lookAt(0, 0, 0);

        galaxyRenderer.render(galaxyScene, galaxyCamera);
        galaxyRAF = requestAnimationFrame(animateGalaxy);
    }

    function createBlackhole() {
        blackholeActive = true;
        disposeGalaxy();

        // La librería de agujero negro usa el MISMO canvas.
        blackhole = new BlackholeRenderer({
            canvas,
            quality: 'low',
            cameraDistance: 11,
            fieldOfView: 82,
            enableOrbit: true,
            orbitSpeed: 0.07,
            showAccretionDisk: true,
            useDiskTexture: false,
            enableLorentzTransform: true,
            enableDopplerShift: true,
            enableBeaming: true,
            bloomStrength: 0.42,
            bloomRadius: 0.25,
            bloomThreshold: 0.75,
            resolutionScale: reduced ? 0.45 : 0.55
        });

        if (blackhole && typeof blackhole.start === 'function') {
            blackhole.start();
        }
    }

    function disposeBlackhole() {
        if (!blackhole) return;
        try {
            if (typeof blackhole.stop === 'function') blackhole.stop();
            if (typeof blackhole.dispose === 'function') blackhole.dispose();
        } catch (error) {
            console.warn('[intro] Limpieza black hole:', error);
        }
        blackhole = null;
        blackholeActive = false;
    }

    function endIntro() {
        running = false;
        cancelAnimationFrame(galaxyRAF);
        disposeBlackhole();
        canvas.style.display = 'none';
        baseCanvas.style.visibility = '';
        if (nebula) nebula.style.visibility = '';
    }

    function frame(now) {
        if (!running) return;

        const raw = musicTime(now);
        const m = reduced ? 0.42 : 1;
        const t = raw / m;

        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        canvas.style.display = 'block';

        if (t < T.holeStart) {
            if (!galaxyRenderer) {
                createGalaxy();
            }
            if (!switchedToHole) {
                galaxyRAF = requestAnimationFrame(animateGalaxy);
            }
        } else if (t < T.holeEnd) {
            if (!switchedToHole) {
                switchedToHole = true;
                createBlackhole();
            }
        } else {
            endIntro();
            return;
        }

        // Solo conserva el reloj principal; el renderer activo hace su propio frame.
        requestAnimationFrame(frame);
    }

    function begin() {
        if (running) return;
        running = true;
        switchedToHole = false;
        startedAt = performance.now();
        canvas.style.display = 'block';
        baseCanvas.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        createGalaxy();
        galaxyRAF = requestAnimationFrame(animateGalaxy);
        requestAnimationFrame(frame);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resizeGalaxy, { passive: true });
})();
