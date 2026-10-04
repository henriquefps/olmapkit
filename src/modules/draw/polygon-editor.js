// Touch-first polygon editor (ported from the original OutSystems block).
//
// One finger places / drags points while the map stays still; two fingers pan and zoom.
// Vertices and edge midpoints ("+") are draggable at any time. The useful area is the drawing
// clipped to `within` minus `exclude`, recomputed live with JSTS.
import { Loupe } from './loupe.js';

export class PolygonEditor {
    constructor(kit, options, owner) {
        this.kit = kit;
        this.owner = owner;
        const o = this.opts = Object.assign({
            within: null,       // GeoJSON / layer id / array of those: where drawing is allowed
            exclude: null,      // GeoJSON / layer id / array: areas subtracted from the result
            initial: null,      // GeoJSON polygon or [[lon, lat], ...] to edit
            snap: false,        // true (within/exclude + all vector layers) or [layerIds]
            snapTolerance: null,
            minArea: 0,         // m²
            loupe: true,
            gps: false,         // shows a "point here" button (uses the geolocation module)
            toolbar: true,
            simplify: 0.05      // metres, removes near-collinear points created by clipping
        }, options || {});

        const map = this.map = kit.olMap;
        this.jstsParser = new jsts.io.OL3Parser();
        this.jstsParser.inject(ol.geom.Point, ol.geom.LineString, ol.geom.LinearRing, ol.geom.Polygon,
            ol.geom.MultiPoint, ol.geom.MultiLineString, ol.geom.MultiPolygon);

        this.freeArea = this._buildFreeArea();
        this.snapGeoms = this._buildSnapGeoms();

        const state = this.state = {
            mode: 'drawing', ring: [], cursor: null, placing: null,
            dragIndex: -1, dragOrigin: null, dragMoved: false, inserted: false,
            cancelled: false, selected: -1, touch: false, result: null,
            lastEmitted: '|-1', suppressClick: false, pointer: null
        };

        const initial = this._initialRing(o.initial);
        if (initial.length) {
            state.ring = initial;
            state.mode = initial.length >= 3 ? 'editing' : 'drawing';
        }

        this._buildLayer();
        if (o.toolbar) this._buildToolbar();
        this._buildInteractions();
        if (o.loupe) this.loupe = new Loupe(kit);

        this.update();
        state.lastEmitted = this._resultKey(this.computeUseful(state.ring));
    }

    /* ---------------- geometry inputs ---------------- */

    _geomsFrom(input) {
        const kit = this.kit;
        const out = [];
        const push = g => { if (g) out.push(g); };
        const list = input == null ? [] : (Array.isArray(input) && !(input.length && typeof input[0] === 'number') && !(input.length && Array.isArray(input[0]) && typeof input[0][0] === 'number') ? input : [input]);
        list.forEach(item => {
            if (item == null) return;
            if (typeof item === 'string' && kit.layers.has(item)) {
                const s = kit.layers.get(item).getSource();
                if (s && s.getFeatures) s.getFeatures().forEach(f => push(f.getGeometry()));
            } else if (Array.isArray(item)) {
                // ring of [lon, lat]
                push(new ol.geom.Polygon([this._closeRing(item.map(c => kit.toMap(c)))]));
            } else {
                kit.readFeatures(item).forEach(f => push(f.getGeometry()));
            }
        });
        return out.filter(g => /Polygon/.test(g.getType()));
    }

    _toJsts(olGeom) {
        const g = olGeom.clone();
        closePolygonRings(g);
        return makeTopologySafe(this.jstsParser.read(g));
    }

    _buildFreeArea() {
        const o = this.opts;
        this.hasBase = o.within != null;
        let free = null;
        if (this.hasBase) {
            this._geomsFrom(o.within).forEach(g => {
                const j = this._toJsts(g);
                free = free ? makeTopologySafe(free.union(j)) : j;
            });
            if (!free) return null;
        }
        const blocked = this._geomsFrom(o.exclude);
        if (!blocked.length) return free;
        if (!free) {
            // No base: keep the excluded areas to subtract from the drawing
            this.excluded = blocked.map(g => this._toJsts(g));
            return null;
        }
        blocked.forEach(g => { free = makeTopologySafe(free.difference(this._toJsts(g))); });
        return free && !free.isEmpty() ? free : null;
    }

    _buildSnapGeoms() {
        const o = this.opts;
        if (!o.snap) return [];
        const geoms = this._geomsFrom(o.within).concat(this._geomsFrom(o.exclude));
        const ids = o.snap === true ? this.kit.layers.vectorLayerIds() : [].concat(o.snap);
        this.snapSources = ids.map(id => this.kit.layers.get(id)).filter(Boolean).map(l => l.getSource()).filter(s => s && s.getFeaturesInExtent);
        return geoms;
    }

    _initialRing(initial) {
        if (!initial) return [];
        let ring = null;
        if (Array.isArray(initial) && initial.length && Array.isArray(initial[0]) && typeof initial[0][0] === 'number') {
            ring = initial.map(c => this.kit.toMap(c));
        } else {
            const g = this.kit.readGeometry(initial);
            if (g && g.getType() === 'Polygon') ring = g.getCoordinates()[0];
            else if (g && g.getType() === 'MultiPolygon') ring = g.getCoordinates()[0][0];
        }
        if (!ring) return [];
        ring = ring.map(c => c.slice());
        const f = ring[0];
        const l = ring[ring.length - 1];
        if (ring.length > 1 && f[0] === l[0] && f[1] === l[1]) ring.pop();
        return ring;
    }

    _closeRing(ring) {
        const r = ring.map(c => c.slice());
        if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0].slice());
        return r;
    }

    /* ---------------- useful area ---------------- */

    computeUseful(ring) {
        if (ring.length < 3) return { status: 'incomplete' };
        if (this.hasBase && !this.freeArea) return { status: 'nobase' };

        const userGeom = this.jstsParser.read(new ol.geom.Polygon([ring.concat([ring[0]])]));
        if (!userGeom.isValid()) return { status: 'selfintersect' };

        let clipped = makeTopologySafe(userGeom);
        if (this.freeArea) clipped = makeTopologySafe(clipped.intersection(this.freeArea));
        if (this.excluded) this.excluded.forEach(x => { clipped = makeTopologySafe(clipped.difference(x)); });
        if (!clipped || clipped.isEmpty()) return { status: 'empty' };

        const pieces = [];
        for (let i = 0; i < clipped.getNumGeometries(); i++) {
            const g = clipped.getGeometryN(i);
            if (g.getGeometryType() === 'Polygon') pieces.push(g);
        }
        if (!pieces.length) return { status: 'empty' };

        pieces.sort((a, b) => b.getArea() - a.getArea());
        const minArea = Math.max(0.5, pieces[0].getArea() * 0.005);
        const significant = pieces.filter(g => g.getArea() >= minArea);
        if (significant.length > 1) return { status: 'multi', geom: this.jstsParser.write(clipped) };

        let main = significant[0];
        if (this.opts.simplify > 0) {
            const simplified = jsts.simplify.TopologyPreservingSimplifier.simplify(main, this.opts.simplify);
            if (simplified && !simplified.isEmpty() && simplified.getGeometryType() === 'Polygon') main = simplified;
        }
        const olGeom = this.jstsParser.write(main);
        closePolygonRings(olGeom);
        const area = ol.sphere.getArea(olGeom, { projection: this.kit.projection });
        if (this.opts.minArea && area < this.opts.minArea) return { status: 'toosmall', geom: olGeom, area };
        return { status: 'ok', geom: olGeom, area };
    }

    _resultKey(r) {
        return r && r.status === 'ok' ? r.area + '|' + r.geom.getCoordinates()[0].join(';') : '|-1';
    }

    // Public result in lon/lat
    getResult() {
        const kit = this.kit;
        const r = this.computeUseful(this.state.ring);
        const ok = r.status === 'ok';
        const out = {
            tool: 'polygon',
            status: r.status,
            valid: ok,
            area: ok ? r.area : 0,
            areaHa: ok ? r.area / 10000 : -1,
            perimeter: ok ? ol.sphere.getLength(new ol.geom.LineString(r.geom.getCoordinates()[0]), { projection: kit.projection }) : 0,
            coordinates: ok ? r.geom.getCoordinates()[0].map(c => kit.toLonLat(c).map(v => Math.round(v * 1e7) / 1e7)) : [],
            geojson: ok ? { type: 'Feature', properties: { area: r.area }, geometry: kit.writeGeometry(r.geom) } : null,
            drawn: this.state.ring.map(c => kit.toLonLat(c)),
            mode: this.state.mode
        };
        return out;
    }

    emitResult() {
        const r = this.computeUseful(this.state.ring);
        const key = this._resultKey(r);
        if (key === this.state.lastEmitted) return;
        this.state.lastEmitted = key;
        this.kit.emit('drawchange', this.getResult());
    }

    /* ---------------- rendering ---------------- */

    _sizes() {
        return this.state.touch
            ? { vertex: 11, midpoint: 9, hit: 26, finishLast: 14, midMinPx: 60, snap: 18 }
            : { vertex: 6, midpoint: 5, hit: 10, finishLast: 6, midMinPx: 30, snap: 10 };
    }

    _midpoints(resolution) {
        const ring = this.state.ring;
        const out = [];
        if (ring.length < 2) return out;
        const count = this.state.mode === 'editing' && ring.length >= 3 ? ring.length : ring.length - 1;
        const minLen = this._sizes().midMinPx * resolution;
        for (let i = 0; i < count; i++) {
            const a = ring[i];
            const b = ring[(i + 1) % ring.length];
            if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= minLen) out.push({ index: i, coord: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
        }
        return out;
    }

    _buildLayer() {
        const f = this.features = {
            useful: new ol.Feature(), shape: new ol.Feature(), vertex: new ol.Feature(),
            midpoint: new ol.Feature(), placing: new ol.Feature(), snap: new ol.Feature()
        };
        this.source = new ol.source.Vector({ features: [f.useful, f.shape, f.midpoint, f.vertex, f.placing, f.snap] });
        this.layer = new ol.layer.Vector({
            source: this.source,
            style: (feature, resolution) => this._style(feature, resolution),
            updateWhileAnimating: true,
            updateWhileInteracting: true,
            zIndex: 1000
        });
        this.layer.set('olmkInternal', 'draw');
        this.map.addLayer(this.layer);
    }

    _style(feature, resolution) {
        const s = this._sizes();
        const f = this.features;
        const state = this.state;
        const fmt = this.kit.format;

        if (feature === f.useful) {
            const r = state.result;
            if (!r || !r.geom) return null;
            const ok = r.status === 'ok';
            return new ol.style.Style({
                stroke: new ol.style.Stroke({ color: ok ? 'rgba(100,255,0,1)' : 'rgba(229,57,53,1)', width: 2 }),
                fill: new ol.style.Fill({ color: ok ? 'rgba(100,255,0,0.35)' : 'rgba(229,57,53,0.35)' }),
                text: ok ? new ol.style.Text({
                    text: fmt.area(r.area),
                    font: 'bold 13px system-ui, sans-serif',
                    fill: new ol.style.Fill({ color: '#fff' }),
                    backgroundFill: new ol.style.Fill({ color: 'rgba(0,0,0,0.6)' }),
                    padding: [2, 6, 2, 6],
                    offsetY: -22,
                    overflow: true
                }) : undefined
            });
        }
        if (feature === f.shape) {
            if (!feature.getGeometry()) return null;
            return new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#ffffff', width: 2, lineDash: [6, 6] }) });
        }
        if (feature === f.midpoint) {
            const mids = this._midpoints(resolution);
            if (!mids.length) return null;
            return new ol.style.Style({
                geometry: new ol.geom.MultiPoint(mids.map(m => m.coord)),
                image: new ol.style.Circle({
                    radius: s.midpoint,
                    fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.75)' }),
                    stroke: new ol.style.Stroke({ color: 'rgba(46,125,50,0.9)', width: 2 })
                }),
                text: new ol.style.Text({ text: '+', font: 'bold ' + (s.midpoint * 2) + 'px sans-serif', fill: new ol.style.Fill({ color: '#2e7d32' }), offsetY: 1 })
            });
        }
        if (feature === f.vertex) {
            const ring = state.ring;
            if (!ring.length) return null;
            const styles = [new ol.style.Style({
                geometry: new ol.geom.MultiPoint(ring),
                image: new ol.style.Circle({ radius: s.vertex, fill: new ol.style.Fill({ color: '#ffffff' }), stroke: new ol.style.Stroke({ color: '#2e7d32', width: 3 }) })
            })];
            if (state.mode === 'drawing' && ring.length >= 3) {
                styles.push(new ol.style.Style({
                    geometry: new ol.geom.Point(ring[0]),
                    image: new ol.style.Circle({ radius: s.vertex + 3, fill: new ol.style.Fill({ color: '#2e7d32' }), stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }) })
                }));
            }
            if (state.selected >= 0 && ring[state.selected]) {
                styles.push(new ol.style.Style({
                    geometry: new ol.geom.Point(ring[state.selected]),
                    image: new ol.style.Circle({ radius: s.vertex + 3, fill: new ol.style.Fill({ color: '#c62828' }), stroke: new ol.style.Stroke({ color: '#ffffff', width: 3 }) })
                }));
            }
            return styles;
        }
        if (feature === f.placing) {
            if (!feature.getGeometry()) return null;
            return new ol.style.Style({
                image: new ol.style.Circle({ radius: s.vertex + 8, fill: new ol.style.Fill({ color: 'rgba(46,125,50,0.25)' }), stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 }) })
            });
        }
        if (feature === f.snap) {
            if (!feature.getGeometry()) return null;
            return new ol.style.Style({
                image: new ol.style.RegularShape({ points: 4, radius: s.vertex + 5, angle: Math.PI / 4, stroke: new ol.style.Stroke({ color: '#ff9800', width: 3 }) })
            });
        }
        return null;
    }

    _buildToolbar() {
        const kit = this.kit;
        const t = kit.t;
        const buttons = [
            { id: 'undo', label: t('undo'), onClick: () => this.actions.undo() },
            { id: 'clear', label: t('clear'), onClick: () => this.actions.clear() },
            { id: 'gps', label: t('gpsPoint'), onClick: () => this.addVertexHere() },
            { id: 'finish', label: t('finish'), kind: 'primary', onClick: () => this.finish() },
            { id: 'remove', label: t('removePoint'), kind: 'danger', onClick: () => this.actions.remove() },
            { id: 'resume', label: t('resume'), kind: 'primary', onClick: () => this.actions.resume() },
            { id: 'redraw', label: t('redraw'), onClick: () => this.actions.redraw() }
        ];
        this.ui = kit.ui.toolbar(buttons);
    }

    _flash(msg) {
        this._transient = msg;
        clearTimeout(this._transientTimer);
        this._transientTimer = setTimeout(() => { this._transient = ''; this._renderHud(); }, 3000);
        this._renderHud();
    }

    _statusMessage(r) {
        if (!r) return '';
        const t = this.kit.t;
        switch (r.status) {
            case 'selfintersect': return t('selfIntersect');
            case 'multi': return t('multi');
            case 'empty': return t('empty');
            case 'nobase': return t('noBase');
            case 'toosmall': return t('tooSmall');
            default: return '';
        }
    }

    _renderHud() {
        if (!this.ui) return;
        const ui = this.ui;
        const t = this.kit.t;
        const state = this.state;
        const r = state.result;
        const title = this.hasBase || this.excluded ? t('usefulArea') : t('area');
        ui.pill.innerHTML = title + ': <b>' + (r && r.status === 'ok' ? this.kit.format.area(r.area) : '—') + '</b>';
        const msg = this._transient || this._statusMessage(r);
        ui.msg.textContent = msg;
        ui.msg.classList.toggle('is-error', !this._transient && !!msg && state.ring.length >= 3);

        const drawing = state.mode === 'drawing';
        ui.hint.textContent = drawing ? (state.touch ? t('hintDrawTouch') : t('hintDrawMouse')) : t('hintEdit');
        const b = ui.btn;
        b.undo.hidden = !drawing;
        b.clear.hidden = !drawing;
        b.finish.hidden = !drawing;
        b.gps.hidden = !drawing || !this.opts.gps;
        b.undo.disabled = state.ring.length === 0;
        b.clear.disabled = state.ring.length === 0;
        b.finish.disabled = state.ring.length < 3;
        b.remove.hidden = state.selected < 0;
        b.remove.disabled = !drawing && state.ring.length <= 3;
        b.resume.hidden = drawing;
        b.redraw.hidden = drawing;
    }

    _tip() {
        if (this.state.mode !== 'drawing') return null;
        return this.state.placing || this.state.cursor;
    }

    update() {
        const state = this.state;
        const f = this.features;
        const t = this._tip();
        const ring = state.ring;
        const preview = t ? ring.concat([t]) : ring;
        state.result = this.computeUseful(preview);

        if (state.mode === 'drawing') {
            f.shape.setGeometry(preview.length >= 2 ? new ol.geom.LineString(preview.length >= 3 ? preview.concat([preview[0]]) : preview) : null);
        } else {
            f.shape.setGeometry(ring.length >= 3 ? new ol.geom.Polygon([ring.concat([ring[0]])]) : null);
        }
        f.useful.setGeometry(state.result.geom || null);
        f.vertex.setGeometry(ring.length ? new ol.geom.MultiPoint(ring) : null);
        f.midpoint.setGeometry(ring.length >= 2 ? new ol.geom.MultiPoint(ring) : null);
        f.placing.setGeometry(state.placing ? new ol.geom.Point(state.placing) : null);
        f.snap.setGeometry(this._snapped ? new ol.geom.Point(this._snapped) : null);
        this.source.changed();
        this._renderHud();
    }

    /* ---------------- snapping ---------------- */

    _snap(coord, excludeIndex) {
        this._snapped = null;
        if (!this.opts.snap) return coord;
        const res = this.map.getView().getResolution();
        const tolPx = this.opts.snapTolerance || this._sizes().snap;
        const tol = tolPx * res;
        const box = [coord[0] - tol, coord[1] - tol, coord[0] + tol, coord[1] + tol];
        const geoms = this.snapGeoms.filter(g => ol.extent.intersects(g.getExtent(), box));
        (this.snapSources || []).forEach(s => s.getFeaturesInExtent(box).forEach(f => f.getGeometry() && geoms.push(f.getGeometry())));

        let best = null;
        let bestD = tol;
        geoms.forEach(g => {
            const flat = g.getFlatCoordinates();
            const stride = g.getStride();
            for (let i = 0; i < flat.length; i += stride) {
                const d = Math.hypot(flat[i] - coord[0], flat[i + 1] - coord[1]);
                if (d < bestD) { bestD = d; best = [flat[i], flat[i + 1]]; }
            }
        });
        // Own vertices (other than the one being moved)
        this.state.ring.forEach((v, i) => {
            if (i === excludeIndex) return;
            const d = Math.hypot(v[0] - coord[0], v[1] - coord[1]);
            if (d < bestD * 0.9) { bestD = d; best = v.slice(); }
        });
        if (!best) {
            let edgeD = tol * 0.8;
            geoms.forEach(g => {
                const p = g.getClosestPoint(coord);
                const d = Math.hypot(p[0] - coord[0], p[1] - coord[1]);
                if (d < edgeD) { edgeD = d; best = [p[0], p[1]]; }
            });
        }
        this._snapped = best;
        return best || coord;
    }

    /* ---------------- actions ---------------- */

    _pixelDist(a, b) {
        const pa = this.map.getPixelFromCoordinate(a);
        const pb = this.map.getPixelFromCoordinate(b);
        return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
    }

    _hitVertex(coord) {
        const tol = this._sizes().hit;
        let best = -1;
        let bestD = Infinity;
        this.state.ring.forEach((v, i) => {
            const d = this._pixelDist(v, coord);
            if (d <= tol && d < bestD) { best = i; bestD = d; }
        });
        return best;
    }

    _hitMidpoint(coord) {
        const tol = this._sizes().hit;
        const res = this.map.getView().getResolution();
        let best = null;
        let bestD = Infinity;
        this._midpoints(res).forEach(m => {
            const d = this._pixelDist(m.coord, coord);
            if (d <= tol && d < bestD) { best = m; bestD = d; }
        });
        return best;
    }

    _addDrawingPoint(coord) {
        const ring = this.state.ring;
        const s = this._sizes();
        if (ring.length >= 3 && (this._pixelDist(ring[0], coord) <= s.hit || this._pixelDist(ring[ring.length - 1], coord) <= s.finishLast)) {
            this.finish();
            return;
        }
        if (ring.length > 0 && this._pixelDist(ring[ring.length - 1], coord) <= s.finishLast) return;
        ring.push(coord.slice());
        this._snapped = null;
        this.update();
        this.emitResult();
    }

    finish() {
        const state = this.state;
        if (state.ring.length < 3) {
            this._flash(this.kit.t('minPoints'));
            return false;
        }
        state.mode = 'editing';
        state.cursor = null;
        state.placing = null;
        state.selected = -1;
        this.update();
        this.emitResult();
        this.kit.emit('drawend', this.getResult());
        return true;
    }

    get actions() {
        const state = this.state;
        return {
            undo: () => { state.ring.pop(); state.selected = -1; this.update(); this.emitResult(); },
            clear: () => { state.ring = []; state.selected = -1; this.update(); this.emitResult(); },
            resume: () => { state.mode = 'drawing'; state.selected = -1; this.update(); },
            remove: () => {
                if (state.selected < 0 || (state.mode === 'editing' && state.ring.length <= 3)) return;
                state.ring.splice(state.selected, 1);
                state.selected = -1;
                this.update();
                this.emitResult();
            },
            redraw: () => { state.ring = []; state.mode = 'drawing'; state.selected = -1; this.update(); this.emitResult(); }
        };
    }

    // Clears without emitting (host-driven reset)
    reset() {
        const state = this.state;
        state.ring = [];
        state.mode = 'drawing';
        state.selected = -1;
        state.lastEmitted = '|-1';
        this.update();
    }

    setRing(coords) {
        this.state.ring = this._initialRing(coords);
        this.state.mode = this.state.ring.length >= 3 ? 'editing' : 'drawing';
        this.state.selected = -1;
        this.update();
        this.emitResult();
    }

    addVertex(lonLat) {
        if (this.state.mode !== 'drawing') this.state.mode = 'drawing';
        this._addDrawingPoint(this.kit.toMap(lonLat));
    }

    addVertexHere() {
        const geo = this.kit.geolocation;
        this.kit.ui.toast(this.kit.t('locating'), 1500);
        geo.getCurrentPosition().then(p => {
            this.addVertex([p.lon, p.lat]);
            this.kit.emit('drawgpspoint', p);
        }).catch(() => this.kit.ui.toast(this.kit.t('locationError')));
    }

    /* ---------------- interaction ---------------- */

    _buildInteractions() {
        const kit = this.kit;
        const map = this.map;
        const state = this.state;
        const self = this;
        const isMouse = e => !e.originalEvent || e.originalEvent.pointerType === 'mouse';
        const setPointerType = e => {
            const touch = !isMouse(e);
            if (touch !== state.touch) { state.touch = touch; self.update(); }
        };

        const editor = this.editor = new ol.interaction.Pointer({
            handleDownEvent(e) {
                setPointerType(e);
                if (editor.targetPointers.length > 1) return false;
                state.cancelled = false;
                state.suppressClick = false;
                state.pointer = e.pixel;

                const v = self._hitVertex(e.coordinate);
                if (v >= 0) {
                    state.dragIndex = v;
                    state.dragOrigin = state.ring[v].slice();
                    state.dragMoved = false;
                    state.inserted = false;
                    state.cursor = null;
                    state.suppressClick = true;
                    return true;
                }
                const m = self._hitMidpoint(e.coordinate);
                if (m) {
                    state.ring.splice(m.index + 1, 0, m.coord.slice());
                    state.dragIndex = m.index + 1;
                    state.dragOrigin = null;
                    state.dragMoved = false;
                    state.inserted = true;
                    state.selected = -1;
                    state.cursor = null;
                    state.suppressClick = true;
                    self.update();
                    return true;
                }
                if (state.mode === 'drawing' && !isMouse(e)) {
                    state.placing = self._snap(e.coordinate.slice());
                    self.update();
                    self._showLoupe(e);
                    return true;
                }
                return false;
            },
            handleDragEvent(e) {
                if (state.cancelled) return;
                if (editor.targetPointers.length > 1) { self._cancelGesture(); return; }
                state.pointer = e.pixel;
                if (state.placing) {
                    state.placing = self._snap(e.coordinate.slice());
                    self.update();
                    self._showLoupe(e);
                } else if (state.dragIndex >= 0) {
                    state.ring[state.dragIndex] = self._snap(e.coordinate.slice(), state.dragIndex);
                    state.dragMoved = true;
                    self.update();
                    if (!isMouse(e)) self._showLoupe(e);
                }
            },
            handleUpEvent() {
                self._hideLoupe();
                if (state.cancelled) { state.cancelled = false; return false; }
                if (state.placing) {
                    const p = state.placing;
                    state.placing = null;
                    self._snapped = null;
                    self._addDrawingPoint(p);
                    self.update();
                } else if (state.dragIndex >= 0) {
                    const i = state.dragIndex;
                    state.dragIndex = -1;
                    self._snapped = null;
                    if (!state.dragMoved && !state.inserted) {
                        const n = state.ring.length;
                        if (state.mode === 'drawing' && n >= 3 && (i === 0 || i === n - 1)) {
                            self.finish();
                            return false;
                        }
                        state.selected = state.selected === i ? -1 : i;
                        self.update();
                    } else {
                        state.selected = -1;
                        self.update();
                        self.emitResult();
                    }
                }
                return false;
            },
            handleMoveEvent(e) {
                if (!isMouse(e)) return;
                setPointerType(e);
                if (state.mode === 'drawing') {
                    state.cursor = self._snap(e.coordinate.slice());
                    self.update();
                }
                const over = self._hitVertex(e.coordinate) >= 0 || !!self._hitMidpoint(e.coordinate);
                map.getViewport().style.cursor = over ? 'grab' : (state.mode === 'drawing' ? 'crosshair' : '');
            },
            // Two-finger pan/pinch keep working; one-finger pan is blocked by the pan guard.
            stopDown() { return false; }
        });

        this._offPanGuard = kit.addPanGuard(() => !((state.placing !== null || state.dragIndex >= 0) && editor.targetPointers.length < 2));

        this.guard = new ol.interaction.Interaction({
            handleEvent(e) {
                if (e.type === 'click' && state.suppressClick) { state.suppressClick = false; return false; }
                if (e.type === 'click' && state.mode === 'drawing' && isMouse(e)) { self._addDrawingPoint(state.cursor || e.coordinate); return false; }
                if (e.type === 'dblclick') return false;
                return true;
            }
        });

        map.addInteraction(editor);
        map.addInteraction(this.guard);

        this._onLeave = () => { if (state.cursor) { state.cursor = null; self.update(); } map.getViewport().style.cursor = ''; };
        map.getViewport().addEventListener('mouseleave', this._onLeave);

        this._onKey = e => {
            const t = e.target;
            if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
            if (state.mode === 'drawing') {
                if (e.key === 'Enter') { self.finish(); e.preventDefault(); }
                else if ((e.key === 'Backspace' || e.key === 'Delete') && state.ring.length) { self.actions.undo(); e.preventDefault(); }
                else if (e.key === 'Escape') self.actions.clear();
            } else if ((e.key === 'Backspace' || e.key === 'Delete') && state.selected >= 0) { self.actions.remove(); e.preventDefault(); }
            else if (e.key === 'Escape') { state.selected = -1; self.update(); }
        };
        window.addEventListener('keydown', this._onKey);
    }

    _cancelGesture() {
        const state = this.state;
        state.cancelled = true;
        this._hideLoupe();
        if (state.placing) state.placing = null;
        else if (state.dragIndex >= 0) {
            if (state.inserted) state.ring.splice(state.dragIndex, 1);
            else if (state.dragOrigin) state.ring[state.dragIndex] = state.dragOrigin;
            state.dragIndex = -1;
        }
        this._snapped = null;
        this.update();
    }

    _showLoupe(e) {
        if (!this.loupe || !this.state.touch) return;
        const coord = this.state.placing || (this.state.dragIndex >= 0 ? this.state.ring[this.state.dragIndex] : null);
        this.loupe.show(e.pixel, coord ? this.map.getPixelFromCoordinate(coord) : e.pixel);
    }

    _hideLoupe() {
        if (this.loupe) this.loupe.hide();
    }

    destroy() {
        const map = this.map;
        map.removeInteraction(this.editor);
        map.removeInteraction(this.guard);
        map.removeLayer(this.layer);
        map.getViewport().removeEventListener('mouseleave', this._onLeave);
        map.getViewport().style.cursor = '';
        window.removeEventListener('keydown', this._onKey);
        this._offPanGuard();
        clearTimeout(this._transientTimer);
        if (this.ui) this.ui.destroy();
        if (this.loupe) this.loupe.destroy();
    }
}

export function closePolygonRings(olGeom) {
    if (!olGeom) return;
    const close = ring => {
        if (ring.length < 3) return;
        const f = ring[0];
        const l = ring[ring.length - 1];
        if (f[0] !== l[0] || f[1] !== l[1]) ring.push(f.slice());
    };
    const type = olGeom.getType();
    if (type === 'Polygon') {
        const rings = olGeom.getCoordinates();
        rings.forEach(close);
        olGeom.setCoordinates(rings);
    } else if (type === 'MultiPolygon') {
        const polys = olGeom.getCoordinates();
        polys.forEach(p => p.forEach(close));
        olGeom.setCoordinates(polys);
    }
}

export function makeTopologySafe(g) {
    if (!g || g.isEmpty()) return g;
    try {
        const reducer = new jsts.precision.GeometryPrecisionReducer(new jsts.geom.PrecisionModel(1e6));
        return reducer.reduce(g).buffer(0);
    } catch (e) {
        return g.buffer(0);
    }
}
