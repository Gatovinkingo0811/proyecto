/**
 * Explorador interactivo del Zodíaco
 * ------------------------------------------------------------
 * Constelaciones reales (RA/Dec J2000, Hipparcos | Stellarium)
 * Renderizado SVG genérico: UNA constelación = UN <g>. Las
 * transformaciones (mover / rotar / zoom) se aplican SIEMPRE al
 * grupo completo, nunca a las coordenadas de cada estrella.
 * Conversión RA/Dec -> SVG: una única vez al cargar.
 */
(function () {
    'use strict';

    var VIEW = 720;          // lado del viewBox (unidades SVG)
    var BOX = 460;           // caja nativa que ocupa cada figura
    var ZOOM_MIN = 0.5;
    var ZOOM_MAX = 6;
    var SVG_NS = 'http://www.w3.org/2000/svg';

    var data = window.ZODIAC_DATA;
    if (!data || !data.length) {
        console.error('[constellation-viewer] falta zodiac-data.js');
        return;
    }

    var viewer, svg, group, switcher, caption, title;
    var currentId = null;
    var projCache = {};
    var state = { x: VIEW / 2, y: VIEW / 2, rot: 0, scale: 1 };
    var pointers = new Map();          // pointerId -> {x,y}
    var dragStart = null;              // un puntero: arrastrar
    var pinchBase = null;              // dos punteros: zoom + rotación

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    function normalizeRA(ra) {
        var r = ra % 360;
        return r < 0 ? r + 360 : r;
    }

    /* Proyección RA/Dec -> SVG (una sola vez), figura centrada en (0,0).
       RA aumenta hacia la izquierda (atlas celeste clásico); Dec, al norte arriba. */
    function projectConstellation(cz) {
        var n = cz.stars.length;
        var ras = new Array(n);
        var decs = new Array(n);
        var i;

        for (i = 0; i < n; i++) {
            ras[i] = normalizeRA(cz.stars[i].ra);
            decs[i] = cz.stars[i].dec;
        }

        // Desenvolver RA sin cortar la constelación: saltar por la mayor brecha circular
        var order = new Array(n);
        for (i = 0; i < n; i++) order[i] = i;
        order.sort(function (a, b) { return ras[a] - ras[b]; });

        var maxGap = -1;
        var gAt = 0;
        for (i = 0; i < n; i++) {
            var gap = (i === n - 1)
                ? ras[order[0]] + 360 - ras[order[n - 1]]
                : ras[order[i + 1]] - ras[order[i]];
            if (gap > maxGap) { maxGap = gap; gAt = i; }
        }
        var start = ras[order[(gAt + 1) % n]];
        var shift = (gAt === n - 1) ? 0 : start;

        var raU = new Array(n);
        for (i = 0; i < n; i++) {
            var r = ras[i] - shift;
            if (r < 0) r += 360;
            raU[i] = r;
        }

        var minRa = Infinity, maxRa = -Infinity;
        var minDec = Infinity, maxDec = -Infinity;
        for (i = 0; i < n; i++) {
            if (raU[i] < minRa) minRa = raU[i];
            if (raU[i] > maxRa) maxRa = raU[i];
            if (decs[i] < minDec) minDec = decs[i];
            if (decs[i] > maxDec) maxDec = decs[i];
        }

        var spanRa = (maxRa - minRa) || 1;
        var spanDec = (maxDec - minDec) || 1;
        var scale = (BOX / Math.max(spanRa, spanDec)) * 0.92;

        var xs = new Array(n);
        var ys = new Array(n);
        for (i = 0; i < n; i++) {
            xs[i] = (maxRa - raU[i]) * scale;
            ys[i] = (maxDec - decs[i]) * scale;
        }

        var minX = Infinity, maxX = -Infinity;
        var minY = Infinity, maxY = -Infinity;
        for (i = 0; i < n; i++) {
            if (xs[i] < minX) minX = xs[i];
            if (xs[i] > maxX) maxX = xs[i];
            if (ys[i] < minY) minY = ys[i];
            if (ys[i] > maxY) maxY = ys[i];
        }
        var offX = (minX + maxX) / 2;
        var offY = (minY + maxY) / 2;

        return {
            stars: cz.stars.map(function (s, i) {
                return { hip: s.hip, mag: s.mag, x: xs[i] - offX, y: ys[i] - offY };
            }),
            segments: cz.segments
        };
    }

    function getProjection(id) {
        if (projCache[id]) return projCache[id];
        var cz = null;
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === id) { cz = data[i]; break; }
        }
        if (!cz) return null;
        projCache[id] = projectConstellation(cz);
        return projCache[id];
    }

    function starRadius(mag) { return clamp(4.3 - mag * 0.34, 1.5, 4.3); }
    function starOpacity(mag) { return clamp(0.98 - (mag - 2) * 0.09, 0.5, 0.98); }

    function applyTransform() {
        if (!group) return;
        group.setAttribute('transform',
            'translate(' + state.x + ' ' + state.y + ') ' +
            'rotate(' + state.rot + ') ' +
            'scale(' + state.scale + ')');
    }

    function loadConstellation(id) {
        var proj = getProjection(id);
        if (!proj) return;

        if (group) group.remove();
        group = document.createElementNS(SVG_NS, 'g');
        group.setAttribute('class', 'cz-figure');
        group.setAttribute('data-constellation', id);

        // Líneas: un caminito por segmento (preserva los tramos separados de Stellarium)
        proj.segments.forEach(function (seg) {
            var d = '';
            for (var k = 0; k < seg.length; k++) {
                var s = proj.stars[seg[k]];
                d += (k === 0 ? 'M' : 'L') + s.x.toFixed(2) + ' ' + s.y.toFixed(2) + ' ';
            }
            var path = document.createElementNS(SVG_NS, 'path');
            path.setAttribute('d', d.trim());
            path.setAttribute('class', 'cz-line');
            group.appendChild(path);
        });

        // Estrellas: resplandor sutil + punto; el tamaño/brillo depende solo de la magnitud
        proj.stars.forEach(function (s) {
            var glow = document.createElementNS(SVG_NS, 'circle');
            glow.setAttribute('class', 'cz-star-glow');
            glow.setAttribute('cx', s.x.toFixed(2));
            glow.setAttribute('cy', s.y.toFixed(2));
            glow.setAttribute('r', (starRadius(s.mag) * 2.6).toFixed(2));
            glow.setAttribute('opacity', starOpacity(s.mag));
            group.appendChild(glow);

            var dot = document.createElementNS(SVG_NS, 'circle');
            dot.setAttribute('class', 'cz-star');
            dot.setAttribute('cx', s.x.toFixed(2));
            dot.setAttribute('cy', s.y.toFixed(2));
            dot.setAttribute('r', starRadius(s.mag).toFixed(2));
            dot.setAttribute('data-hip', s.hip);
            dot.setAttribute('data-mag', s.mag);
            group.appendChild(dot);
        });

        svg.appendChild(group);
        state.x = VIEW / 2;
        state.y = VIEW / 2;
        state.rot = 0;
        state.scale = 1;
        applyTransform();
        currentId = id;
        updateUi();
    }

    function updateUi() {
        var cz = null;
        for (var i = 0; i < data.length; i++) {
            if (data[i].id === currentId) { cz = data[i]; break; }
        }
        if (!cz) return;
        if (title) title.textContent = cz.symbol + '  ' + cz.name;
        if (caption) caption.textContent = 'arrastra · pellizca · rota';
        if (svg) svg.setAttribute('aria-label', 'Constelación de ' + cz.name);
        if (!switcher) return;
        var btns = switcher.querySelectorAll('.cz-sel');
        for (var j = 0; j < btns.length; j++) {
            btns[j].classList.toggle('active', btns[j].dataset.const === currentId);
        }
    }

    function buildSwitcher() {
        if (!switcher) return;
        switcher.innerHTML = '';
        data.forEach(function (cz) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cz-sel';
            btn.dataset.const = cz.id;
            btn.title = cz.nameEn + ' (\u2713 datos reales)';
            var sym = document.createElement('span');
            sym.className = 'cz-sel-symbol';
            sym.textContent = cz.symbol;
            var nm = document.createElement('span');
            nm.textContent = cz.name;
            btn.appendChild(sym);
            btn.appendChild(nm);
            btn.addEventListener('click', function () { loadConstellation(cz.id); });
            switcher.appendChild(btn);
        });
    }

    /* ---------- Interacción: Pointer Events (ratón + táctil) ---------- */

    function svgScaleFactor() {
        return (svg && svg.clientWidth) ? VIEW / svg.clientWidth : 1;
    }

    function onPointerDown(e) {
        if (!svg) return;
        e.preventDefault();
        svg.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
            dragStart = { x: e.clientX, y: e.clientY, sx: state.x, sy: state.y };
            pinchBase = null;
        } else if (pointers.size === 2) {
            dragStart = null;
            var ids = Array.from(pointers.keys());
            pinchBase = pinchFrom(ids[0], ids[1]);
        }
    }

    function pinchFrom(idA, idB) {
        var a = pointers.get(idA);
        var b = pointers.get(idB);
        if (!a || !b) return null;
        return {
            d: Math.hypot(a.x - b.x, a.y - b.y),
            a: Math.atan2(b.y - a.y, b.x - a.x),
            scale: state.scale,
            rot: state.rot
        };
    }

    function onPointerMove(e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 1) {
            if (!dragStart) {
                dragStart = { x: e.clientX, y: e.clientY, sx: state.x, sy: state.y };
                return;
            }
            var k = svgScaleFactor();
            state.x = dragStart.sx + (e.clientX - dragStart.x) * k;
            state.y = dragStart.sy + (e.clientY - dragStart.y) * k;
        } else if (pointers.size === 2) {
            if (!pinchBase) return;
            var ids = Array.from(pointers.keys());
            var base = pinchFrom(ids[0], ids[1]);
            if (!base || !base.d) return;
            state.scale = clamp(pinchBase.scale * (base.d / pinchBase.d), ZOOM_MIN, ZOOM_MAX);
            state.rot = pinchBase.rot + ((base.a - pinchBase.a) * 180 / Math.PI);
        }
        applyTransform();
    }

    function onPointerUp(e) {
        pointers.delete(e.pointerId);
        if (pointers.size === 0) {
            dragStart = null;
            pinchBase = null;
        } else if (pointers.size === 1) {
            dragStart = null;
            pinchBase = null;
            var remaining = pointers.keys().next().value;
            var p = pointers.get(remaining);
            if (p) dragStart = { x: p.x, y: p.y, sx: state.x, sy: state.y };
        } else if (pointers.size === 2) {
            var ids = Array.from(pointers.keys());
            pinchBase = pinchFrom(ids[0], ids[1]);
        }
    }

    function resetTool(what) {
        if (!group) return;
        if (what === 'pos') { state.x = VIEW / 2; state.y = VIEW / 2; }
        if (what === 'rot') { state.rot = 0; }
        if (what === 'zoom') { state.scale = 1; }
        applyTransform();
    }

    function openViewer() {
        if (!viewer) return;
        viewer.classList.add('open');
        viewer.removeAttribute('hidden');
        if (!currentId) loadConstellation(data[0].id);
    }

    function closeViewer() {
        if (!viewer) return;
        viewer.classList.remove('open');
        viewer.setAttribute('hidden', '');
        pointers.clear();
        dragStart = null;
        pinchBase = null;
    }

    /* ---------- Auditoría (checklist de validación) ---------- */
    function audit() {
        return data.map(function (cz) {
            var n = cz.stars.length;
            var starsOk = n > 0 && cz.stars.every(function (s) {
                return s.hip > 0 && s.mag !== null && isFinite(s.ra) && isFinite(s.dec);
            });
            var linesOk = cz.segments.length > 0 && cz.segments.every(function (seg) {
                return seg.length >= 2 && seg.every(function (i) { return i >= 0 && i < n; });
            });
            return {
                id: cz.id,
                name: cz.name,
                stars: n,
                segments: cz.segments.length,
                starsOk: starsOk,
                linesOk: linesOk
            };
        });
    }

    function init() {
        viewer = document.getElementById('zodiac-viewer');
        svg = document.getElementById('cz-svg');
        switcher = document.getElementById('cz-switcher');
        title = document.getElementById('cz-title');
        caption = document.getElementById('cz-caption');

        var openBtn = document.getElementById('open-zodiac');
        var closeBtn = document.getElementById('cz-close');

        if (openBtn) openBtn.addEventListener('click', openViewer);
        if (closeBtn) closeBtn.addEventListener('click', closeViewer);

        if (svg) {
            svg.addEventListener('pointerdown', onPointerDown);
            svg.addEventListener('pointermove', onPointerMove);
            svg.addEventListener('pointerup', onPointerUp);
            svg.addEventListener('pointercancel', onPointerUp);
        }

        if (viewer) {
            viewer.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') closeViewer();
            });
        }

        var toolBtns = document.querySelectorAll('.tool-btn[data-reset]');
        for (var i = 0; i < toolBtns.length; i++) {
            toolBtns[i].addEventListener('click', function () {
                resetTool(this.getAttribute('data-reset'));
            });
        }

        buildSwitcher();
        loadConstellation(data[0].id);

        // Checklist de validación en consola
        var report = audit();
        var allOk = report.every(function (r) { return r.starsOk && r.linesOk; });
        console.log('[constellation-viewer] auditoría zodiaco:', allOk ? 'OK' : 'REVISAR', report);

        window.ConstellationViewer = {
            open: openViewer,
            close: closeViewer,
            show: loadConstellation,
            audit: audit,
            reset: resetTool
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();