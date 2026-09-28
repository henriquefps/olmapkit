import { computeBreaks, paletteFor, compileFilter, legendEntries } from '../core/style.js';
import { el, svg } from '../core/ui.js';

// Data visualisation helpers.
//   viz.heatmap({ id, data | layer, weight, radius, blur })
//   viz.proportional(layerId, { property, minRadius, maxRadius, color })
//   viz.choropleth(layerId, { property, classes, method: 'quantile' | 'equal', palette })
//   viz.categories(layerId, { property, palette, values })
//   viz.timeSlider({ layers, markers, property, start, end, step, window, speed })
//   viz.animateRoute({ coordinates | geojson | layer, duration, loop, follow })
export class Viz {
    constructor(kit) {
        this.kit = kit;
        this._time = null;
        this._routes = [];
    }

    _features(layerId) {
        const l = this.kit.layers.get(layerId);
        const s = l && l.getSource && l.getSource();
        return s && s.getFeatures ? s.getFeatures() : [];
    }

    heatmap(opts) {
        const kit = this.kit;
        const o = Object.assign({ id: 'heatmap', title: 'Heatmap', radius: 16, blur: 22, weight: null, intensity: 1, opacity: 0.85 }, opts || {});
        let source;
        if (o.layer) {
            source = new ol.source.Vector({ features: this._features(o.layer).map(f => f.clone()) });
        } else if (Array.isArray(o.data)) {
            source = new ol.source.Vector({
                features: o.data.map(p => {
                    const lon = p.lon != null ? p.lon : p[0];
                    const lat = p.lat != null ? p.lat : p[1];
                    return new ol.Feature({ geometry: new ol.geom.Point(kit.toMap([lon, lat])), weight: p.weight != null ? p.weight : (p[2] != null ? p[2] : 1) });
                })
            });
        } else {
            source = new ol.source.Vector({ features: kit.readFeatures(o.data) });
        }
        let max = 1;
        const wp = o.weight || 'weight';
        source.getFeatures().forEach(f => { const w = Number(f.get(wp)); if (isFinite(w) && w > max) max = w; });
        const layer = new ol.layer.Heatmap({
            source,
            radius: o.radius,
            blur: o.blur,
            gradient: o.gradient,
            weight: f => { const w = Number(f.get(wp)); return Math.max(0, Math.min(1, (isFinite(w) ? w / max : 1) * o.intensity)); }
        });
        return kit.layers.register({ id: o.id, title: o.title, type: 'heatmap', opacity: o.opacity, legend: false }, layer);
    }

    // Keeps label settings of the current style when a thematic style replaces it
    _keep(layerId, spec, label) {
        const def = this.kit.layers.getDef(layerId);
        const cur = (def && def.style) || {};
        ['label', 'labelColor', 'labelHalo', 'font', 'minZoomLabel'].forEach(k => {
            if (spec[k] == null && cur[k] != null) spec[k] = cur[k];
        });
        if (label != null) spec.label = label;
        return spec;
    }

    _range(layerId, property) {
        const vals = this._features(layerId).map(f => Number(f.get(property))).filter(v => isFinite(v));
        return { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), values: vals };
    }

    proportional(layerId, opts) {
        const o = Object.assign({ minRadius: 4, maxRadius: 28, color: '#e53935' }, opts || {});
        const r = this._range(layerId, o.property);
        const spec = this._keep(layerId, { type: 'proportional', property: o.property, min: o.min != null ? o.min : r.min, max: o.max != null ? o.max : r.max, minRadius: o.minRadius, maxRadius: o.maxRadius, color: o.color, stroke: o.color }, o.label);
        this.kit.layers.setStyle(layerId, spec);
        return spec;
    }

    choropleth(layerId, opts) {
        const o = Object.assign({ classes: 5, method: 'quantile', palette: 'greens', fillOpacity: 0.72 }, opts || {});
        const r = this._range(layerId, o.property);
        const breaks = o.breaks || computeBreaks(r.values, o.classes, o.method);
        const colors = o.colors || paletteFor(o.palette, breaks.length + 1);
        const spec = this._keep(layerId, { type: 'ranges', property: o.property, breaks, colors, fillOpacity: o.fillOpacity, themeStroke: o.stroke || '#ffffff', width: 1 }, o.label);
        this.kit.layers.setStyle(layerId, spec);
        return { spec, legend: legendEntries(spec) };
    }

    categories(layerId, opts) {
        const o = Object.assign({ palette: 'categorical', fillOpacity: 0.6 }, opts || {});
        let values = o.values;
        if (!values) {
            const unique = [];
            this._features(layerId).forEach(f => { const v = f.get(o.property); if (v != null && unique.indexOf(v) < 0) unique.push(v); });
            const colors = paletteFor(o.palette, Math.max(unique.length, 2));
            values = {};
            unique.forEach((v, i) => { values[v] = colors[i % colors.length]; });
        }
        const spec = this._keep(layerId, { type: 'categories', property: o.property, values, default: o.default || '#9e9e9e', fillOpacity: o.fillOpacity }, o.label);
        this.kit.layers.setStyle(layerId, spec);
        return { spec, legend: legendEntries(spec) };
    }

    /* ---------------- time slider ---------------- */

    timeSlider(opts) {
        this.stopTime();
        const kit = this.kit;
        const o = Object.assign({ property: 'time', layers: [], markers: false, step: 86400000, window: null, speed: 600, loop: true }, opts || {});
        const toMs = v => (v instanceof Date ? v.getTime() : (typeof v === 'number' ? v : Date.parse(v)));
        const layerIds = [].concat(o.layers || []);

        // Range from data when not given
        let start = o.start != null ? toMs(o.start) : Infinity;
        let end = o.end != null ? toMs(o.end) : -Infinity;
        if (o.start == null || o.end == null) {
            const scan = v => { const t = toMs(v); if (isFinite(t)) { if (o.start == null && t < start) start = t; if (o.end == null && t > end) end = t; } };
            layerIds.forEach(id => this._features(id).forEach(f => scan(f.get(o.property))));
            if (o.markers) kit.markers.list().forEach(m => scan(m.data && m.data[o.property]));
        }
        if (!isFinite(start) || !isFinite(end)) return null;

        const steps = Math.max(1, Math.round((end - start) / o.step));
        const box = el('div', { class: 'olmk-time' });
        const btn = el('button', { type: 'button', 'aria-label': kit.t('timePlay') }, svg('play'));
        const range = el('input', { type: 'range', min: '0', max: String(steps), step: '1', 'aria-label': 'time' });
        const out = el('output');
        box.appendChild(btn);
        box.appendChild(range);
        box.appendChild(out);
        kit.olMap.getOverlayContainerStopEvent().appendChild(box);

        const fmt = o.format || (t => new Date(t).toLocaleDateString(kit.options.locale || 'en', { year: 'numeric', month: 'short', day: 'numeric' }));
        const state = { current: end, timer: null };
        const visible = v => {
            const t = toMs(v);
            if (!isFinite(t)) return false;
            if (t > state.current) return false;
            return o.window == null || t > state.current - o.window;
        };
        const apply = () => {
            out.textContent = fmt(state.current);
            layerIds.forEach(id => {
                const def = kit.layers.getDef(id);
                const base = compileFilter(def && def.baseFilter);
                kit.layers.setFilter(id, f => visible(f.get(o.property)) && (!base || base(f)));
            });
            if (o.markers) kit.markers.setFilter(f => visible(f.get(o.property)));
            kit.emit('timechange', { time: state.current, iso: new Date(state.current).toISOString() });
        };
        const set = i => {
            range.value = String(i);
            state.current = Math.min(end, start + i * o.step);
            apply();
        };
        const pause = () => {
            clearInterval(state.timer);
            state.timer = null;
            btn.innerHTML = svg('play');
            btn.setAttribute('aria-label', kit.t('timePlay'));
        };
        const play = () => {
            if (state.timer) return;
            if (Number(range.value) >= steps) set(0);
            btn.innerHTML = svg('pause');
            btn.setAttribute('aria-label', kit.t('timePause'));
            state.timer = setInterval(() => {
                const i = Number(range.value) + 1;
                if (i > steps) { if (o.loop) set(0); else pause(); return; }
                set(i);
            }, o.speed);
        };
        btn.addEventListener('click', () => (state.timer ? pause() : play()));
        range.addEventListener('input', () => { pause(); set(Number(range.value)); });
        set(steps);

        this._time = {
            box, play, pause, set: t => set(Math.round((toMs(t) - start) / o.step)),
            destroy: () => {
                pause();
                box.remove();
                layerIds.forEach(id => kit.layers.setFilter(id, kit.layers.getDef(id) && kit.layers.getDef(id).baseFilter || null));
                if (o.markers) kit.markers.setFilter(null);
            }
        };
        return this._time;
    }

    stopTime() {
        if (this._time) { this._time.destroy(); this._time = null; }
    }

    /* ---------------- route animation ---------------- */

    animateRoute(opts) {
        const kit = this.kit;
        const o = Object.assign({ duration: 10000, loop: false, follow: false, color: '#1e88e5', autoplay: true }, opts || {});
        let geom = null;
        if (o.coordinates) geom = new ol.geom.LineString(o.coordinates.map(c => kit.toMap(c)));
        else if (o.geojson) geom = kit.readGeometry(o.geojson);
        else if (o.layer) {
            const f = this._features(o.layer).find(x => /LineString/.test(x.getGeometry().getType()));
            geom = f && f.getGeometry().clone();
        }
        if (geom && geom.getType() === 'MultiLineString') geom = new ol.geom.LineString([].concat.apply([], geom.getCoordinates()));
        if (!geom || geom.getType() !== 'LineString') return null;

        const traveled = new ol.Feature();
        const mover = new ol.Feature(new ol.geom.Point(geom.getFirstCoordinate()));
        const source = new ol.source.Vector({ features: [new ol.Feature(geom), traveled, mover] });
        const layer = new ol.layer.Vector({
            source, zIndex: 850,
            style: f => {
                if (f === mover) {
                    return new ol.style.Style({
                        image: o.icon ? new ol.style.Icon({ src: o.icon, scale: o.iconScale || 1 }) : new ol.style.Circle({ radius: 9, fill: new ol.style.Fill({ color: o.color }), stroke: new ol.style.Stroke({ color: '#fff', width: 3 }) })
                    });
                }
                if (f === traveled) return new ol.style.Style({ stroke: new ol.style.Stroke({ color: o.color, width: 5 }) });
                return new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgba(30,136,229,0.35)', width: 5, lineDash: [2, 8] }) });
            }
        });
        layer.set('olmkInternal', 'route');
        kit.olMap.addLayer(layer);

        const total = ol.sphere.getLength(geom, { projection: kit.projection });
        const state = { progress: 0, playing: false, last: 0, raf: 0, lastEmit: 0 };
        const coordsUpTo = fraction => {
            const out = [geom.getFirstCoordinate()];
            let acc = 0;
            const c = geom.getCoordinates();
            const target = fraction * geom.getLength();
            for (let i = 1; i < c.length; i++) {
                const seg = Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
                if (acc + seg >= target) { out.push(geom.getCoordinateAt(fraction)); return out; }
                acc += seg;
                out.push(c[i]);
            }
            return out;
        };
        const render = () => {
            const p = geom.getCoordinateAt(state.progress);
            mover.getGeometry().setCoordinates(p);
            traveled.setGeometry(new ol.geom.LineString(coordsUpTo(state.progress)));
            if (o.follow) kit.olMap.getView().setCenter(p);
            const now = Date.now();
            if (now - state.lastEmit > 250 || state.progress >= 1) {
                state.lastEmit = now;
                const ll = kit.toLonLat(p);
                kit.emit('routeprogress', { progress: state.progress, lon: ll[0], lat: ll[1], distance: total * state.progress, length: total });
            }
        };
        const frame = t => {
            if (!state.playing) return;
            const dt = state.last ? t - state.last : 0;
            state.last = t;
            state.progress = Math.min(1, state.progress + dt / o.duration);
            render();
            if (state.progress >= 1) {
                if (o.loop) state.progress = 0;
                else { state.playing = false; kit.emit('routeend', { length: total }); return; }
            }
            state.raf = requestAnimationFrame(frame);
        };
        const ctrl = {
            length: total,
            play() { if (state.playing) return; if (state.progress >= 1) state.progress = 0; state.playing = true; state.last = 0; state.raf = requestAnimationFrame(frame); },
            pause() { state.playing = false; cancelAnimationFrame(state.raf); },
            seek(fraction) { state.progress = Math.max(0, Math.min(1, fraction)); render(); },
            stop: () => {
                ctrl.pause();
                kit.olMap.removeLayer(layer);
                this._routes = this._routes.filter(r => r !== ctrl);
            },
            get progress() { return state.progress; }
        };
        this._routes.push(ctrl);
        render();
        if (o.fit !== false) kit.fit(geom.getExtent(), { mapExtent: true, maxZoom: 16 });
        if (o.autoplay) ctrl.play();
        return ctrl;
    }

    stopRoutes() {
        this._routes.slice().forEach(r => r.stop());
    }

    destroy() {
        this.stopTime();
        this.stopRoutes();
    }
}
