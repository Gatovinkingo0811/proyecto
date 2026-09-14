/*
 * Intro visual — reemplazo directo con implementaciones open source.
 * Galaxy: threejs-galaxy-shader 1.0.2 (MIT)
 * Black hole: @junhoyeo/blackhole 1.0.2 (Apache-2.0)
 * Un solo canvas WebGL. Sin imágenes, sin Canvas 2D y sin capas acumulativas.
 */
(async function () {
    'use strict';

    const base = document.getElementById('starfield');
    const button = document.getElementById('intro-begin');
    const nebula = document.getElementById('nebula');
    if (!base || !button) return;

    [
        'cinematic-image-stage',
        'cinematic-polish-layer',
        'cinematic-webgl'
    ].forEach(id => document.getElementById(id)?.remove());

    const canvas = document.createElement('canvas');
    canvas.id = 'cinematic-webgl';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;display:none;background:#000;';
    document.body.appendChild(canvas);

    let THREE, GalaxyGeometry, GalaxyShader, BlackholeRenderer;
    try {
        THREE = await import('https://esm.sh/three@0.183.0');
        ({ GalaxyGeometry, GalaxyShader } = await import(
            'https://esm.sh/threejs-galaxy-shader@1.0.2?deps=three@0.183.0'
        ));
        ({ BlackholeRenderer } = await import(
            'https://esm.sh/@junhoyeo/blackhole@1.0.2?deps=three@0.183.0'
        ));
    } catch (err) {
        console.error('[intro] No se pudieron cargar los renderers:', err);
        canvas.remove();
        return;
    }

    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let galaxyRenderer = null;
    let galaxyScene = null;
    let galaxyCamera = null;
    let galaxyPoints = null;
    let galaxyMaterial = null;
    let galaxyGeometry = null;
    let blackhole = null;
    let raf = 0;
    let startedAt = 0;
    let running = false;
    let holeStarted = false;

    const T = { firstSound: 2.43, holeStart: 24.5, holeEnd: 31.9 };

    function smooth(t) {
        t = Math.max(0, Math.min(1, t));
        return t * t * (3 - 2 * t);
    }

    function musicTime(now) {
        const M = window.ExperienceMusic;
        if (M && typeof M.isPlaying === 'function' && M.isPlaying() && typeof M.now === 'function') {
            const t = M.now();
            if (Number.isFinite(t)) return t;
        }
        return (now - startedAt) / 1000;
    }

    function resize() {
        if (!galaxyRenderer || !galaxyCamera) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        const mobile = w < 768;
        const maxPixels = mobile ? 300000 : 520000;
        let rw = Math.max(420, Math.floor(w * (mobile ? 0.46 : 0.52)));
        let rh = Math.max(240, Math.floor(h * (mobile ? 0.46 : 0.52)));
        const pixels = rw * rh;
        if (pixels > maxPixels) {
            const f = Math.sqrt(maxPixels / pixels);
            rw = Math.floor(rw * f);
            rh = Math.floor(rh * f);
        }
        galaxyRenderer.setPixelRatio(1);
        galaxyRenderer.setSize(rw, rh, false);
        galaxyCamera.aspect = w / Math.max(1, h);
        galaxyCamera.updateProjectionMatrix();
        const u = galaxyMaterial?.uniforms?.u_resolution;
        if (u?.value?.set) u.value.set(rw, rh);
    }

    function createGalaxy() {
        galaxyScene = new THREE.Scene();
        galaxyScene.background = new THREE.Color(0x01020a);
        galaxyCamera = new THREE.PerspectiveCamera(58, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 100);
        // Vista cercana para ver solo un sector grande de la galaxia.
        galaxyCamera.position.set(0.0, 0.12, 1.95);
        galaxyCamera.lookAt(0, 0, 0);
        galaxyRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
        if ('outputColorSpace' in galaxyRenderer && THREE.SRGBColorSpace) galaxyRenderer.outputColorSpace = THREE.SRGBColorSpace;
        else galaxyRenderer.outputEncoding = THREE.sRGBEncoding;

        const totalStars = reduced ? 3800 : 5600;
        galaxyGeometry = new GalaxyGeometry(totalStars);
        galaxyMaterial = new GalaxyShader({
            resolution: new THREE.Vector2(1, 1),
            color: new THREE.Color(0x9bb3ff),
            pointSize: reduced ? 1.45 : 1.75,
            totalStars,
            time: 0,
            blackHoleRadius: 0.08,
            blackHolePosition: new THREE.Vector3(0, 0, 0),
            spiralCount: 4,
            turnsPerSpiral: 1.25,
            colorMode: 2,
            colorIntensity: 1.15,
            fadeNear: 0.12,
            fadeFar: 20.0
        });
        galaxyPoints = new THREE.Points(galaxyGeometry, galaxyMaterial);
        galaxyScene.add(galaxyPoints);
        resize();
    }

    function destroyGalaxy() {
        if (galaxyPoints) { galaxyPoints.geometry?.dispose(); galaxyPoints.material?.dispose(); galaxyPoints = null; }
        galaxyRenderer?.dispose();
        galaxyRenderer = null;
        galaxyScene = null;
        galaxyCamera = null;
        galaxyMaterial = null;
        galaxyGeometry = null;
    }

    function startBlackhole() {
        destroyGalaxy();
        holeStarted = true;
        blackhole = new BlackholeRenderer({
            canvas,
            quality: 'low',
            cameraDistance: 10,
            fieldOfView: 88,
            enableOrbit: true,
            orbitSpeed: 0.08,
            showAccretionDisk: true,
            useDiskTexture: false,
            enableLorentzTransform: true,
            enableDopplerShift: true,
            enableBeaming: true,
            bloomStrength: 0.40,
            bloomRadius: 0.24,
            bloomThreshold: 0.72,
            resolutionScale: reduced ? 0.40 : 0.48
        });
        blackhole.start?.();
    }

    function destroyBlackhole() {
        try { blackhole?.stop?.(); blackhole?.dispose?.(); } catch (_) {}
        blackhole = null;
    }

    function end() {
        running = false;
        cancelAnimationFrame(raf);
        destroyGalaxy();
        destroyBlackhole();
        canvas.style.display = 'none';
        base.style.visibility = '';
        if (nebula) nebula.style.visibility = '';
    }

    function tick(now) {
        if (!running) return;
        const raw = musicTime(now);
        const t = raw / (reduced ? 0.42 : 1);
        base.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        canvas.style.display = 'block';

        if (t < T.holeStart) {
            if (!galaxyRenderer) createGalaxy();
            if (galaxyRenderer && galaxyMaterial) {
                const uTime = galaxyMaterial.uniforms?.u_time;
                if (uTime) uTime.value = raw * 0.12;
                const p = smooth((t - T.firstSound) / (T.holeStart - T.firstSound));
                galaxyCamera.position.z = 1.95 - 0.45 * p;
                galaxyCamera.position.x = Math.sin(t * 0.06) * 0.12 * p;
                galaxyCamera.position.y = 0.12 + Math.cos(t * 0.05) * 0.07 * p;
                galaxyCamera.lookAt(0, 0, 0);
                galaxyRenderer.render(galaxyScene, galaxyCamera);
            }
        } else if (t < T.holeEnd) {
            if (!holeStarted) startBlackhole();
        } else {
            end();
            return;
        }
        raf = requestAnimationFrame(tick);
    }

    function begin() {
        if (running) return;
        running = true;
        holeStarted = false;
        startedAt = performance.now();
        createGalaxy();
        base.style.visibility = 'hidden';
        if (nebula) nebula.style.visibility = 'hidden';
        canvas.style.display = 'block';
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(tick);
    }

    button.addEventListener('click', begin, { capture: false });
    window.addEventListener('resize', resize, { passive: true });
})();
