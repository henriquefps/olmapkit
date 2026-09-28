// Line, point and split tools built on ol.interaction.Draw / Modify / Snap.
import * as geo from '../../geo/ops.js';

const STYLE = () => [
    new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#ffffff', width: 5 }),
        fill: new ol.style.Fill({ color: 'rgba(46,125,50,0.25)' }),
        image: new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color: '#2e7d32' }), stroke: new ol.style.Stroke({ color: '#fff', width: 3 }) })
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#2e7d32', width: 3 }) })
];

export class SketchTool {
    constructor(kit, mode, options) {
        this.kit = kit;
        this.mode = mode; // 'line' | 'point' | 'split'
        const o = this.opts = Object.assign({ snap: true, multiple: false, toolbar: true }, options || {});
        const map = kit.olMap;

        this.source = new ol.source.Vector();
        if (o.initial && mode !== 'split') this.source.addFeatures(kit.readFeatures(o.initial));
        this.layer = new ol.layer.Vector({ source: this.source, style: STYLE(), zIndex: 1000 });
        this.layer.set('olmkInternal', 'sketch');
        map.addLayer(this.layer);

        const type = mode === 'point' ? 'Point' : 'LineString';
        this.drawI = new ol.interaction.Draw({ source: this.source, type, style: STYLE(), stopClick: true });
        this.modifyI = mode === 'split' ? null : new ol.interaction.Modify({ source: this.source });
        map.addInteraction(this.drawI);
        if (this.modifyI) map.addInteraction(this.modifyI);

        this.snaps = [];
        if (o.snap) {
            const ids = o.snap === true ? kit.layers.vectorLayerIds() : [].concat(o.snap);
            ids.map(id => kit.layers.get(id)).filter(Boolean).forEach(l => {
                const s = new ol.interaction.Snap({ source: l.getSource(), pixelTolerance: 14 });
                map.addInteraction(s);
                this.snaps.push(s);
            });
            const own = new ol.interaction.Snap({ source: this.source, pixelTolerance: 14 });
            map.addInteraction(own);
            this.snaps.push(own);
        }

        if (o.toolbar) {
            const t = kit.t;
            this.ui = kit.ui.toolbar([
                { id: 'undo', label: t('undo'), onClick: () => this.undo() },
                { id: 'clear', label: t('clear'), onClick: () => this.clear() },
                { id: 'finish', label: t('finish'), kind: 'primary', onClick: () => this.finish() }
            ]);
            this.ui.hint.textContent = mode === 'point' ? t('hintPoint') : (mode === 'split' ? t('hintSplit') : t('hintLine'));
            if (mode === 'point') { this.ui.btn.undo.hidden = true; this.ui.btn.finish.hidden = true; }
        }

        this._sketch = null;
        this.drawI.on('drawstart', e => {
            this._sketch = e.feature;
            if (!o.multiple && mode !== 'split') this.source.getFeatures().forEach(f => f !== e.feature && this.source.removeFeature(f));
            this._sketchListener = e.feature.getGeometry().on('change', () => this._renderHud(e.feature.getGeometry()));
        });
        this.drawI.on('drawend', e => {
            this._sketch = null;
            if (this._sketchListener) ol.Observable.unByKey(this._sketchListener);
            if (mode === 'split') {
                setTimeout(() => { this._doSplit(e.feature); this.source.clear(); }, 0);
                return;
            }
            if (!o.multiple) this.source.getFeatures().forEach(f => f !== e.feature && this.source.removeFeature(f));
            setTimeout(() => { this._emit('drawend'); this._emit('drawchange'); }, 0);
        });
        if (this.modifyI) this.modifyI.on('modifyend', () => this._emit('drawchange'));
        this._renderHud(null);
    }

    _renderHud(geom) {
        if (!this.ui) return;
        const kit = this.kit;
        let g = geom;
        if (!g) {
            const f = this.source.getFeatures()[0];
            g = f && f.getGeometry();
        }
        if (g && g.getType() === 'LineString') {
            this.ui.pill.innerHTML = kit.t('length') + ': <b>' + kit.format.length(ol.sphere.getLength(g, { projection: kit.projection })) + '</b>';
        } else if (g && g.getType() === 'Point') {
            const ll = kit.toLonLat(g.getCoordinates());
            this.ui.pill.innerHTML = '<b>' + ll[1].toFixed(6) + ', ' + ll[0].toFixed(6) + '</b>';
        } else {
            this.ui.pill.textContent = '';
        }
    }

    getResult() {
        const kit = this.kit;
        const feats = this.source.getFeatures();
        const fc = kit.writeFeatures(feats);
        const first = feats[0] && feats[0].getGeometry();
        return {
            tool: this.mode,
            valid: feats.length > 0,
            count: feats.length,
            length: first && first.getType() === 'LineString' ? ol.sphere.getLength(first, { projection: kit.projection }) : 0,
            coordinates: first ? (first.getType() === 'Point' ? kit.toLonLat(first.getCoordinates()) : first.getCoordinates().map(c => kit.toLonLat(c))) : [],
            geojson: fc
        };
    }

    _emit(type) {
        this._renderHud(null);
        this.kit.emit(type, this.getResult());
    }

    _doSplit(lineFeature) {
        const kit = this.kit;
        const line = kit.writeGeometry(lineFeature.getGeometry());
        const layerId = this.opts.layer;
        const results = [];
        if (layerId && kit.layers.has(layerId)) {
            const source = kit.layers.get(layerId).getSource();
            const lineGeom = lineFeature.getGeometry();
            source.getFeaturesInExtent(lineGeom.getExtent()).forEach(f => {
                const g = f.getGeometry();
                if (!g || !/Polygon/.test(g.getType())) return;
                const poly = kit.writeGeometry(g);
                if (!geo.intersects(poly, line)) return;
                const parts = geo.split(poly, line);
                if (parts.length < 2) return;
                const props = Object.assign({}, f.getProperties());
                delete props.geometry;
                const id = f.getId();
                source.removeFeature(f);
                const newFeatures = parts.map((p, i) => {
                    const nf = new ol.Feature(Object.assign({}, props, { geometry: kit.readGeometry(p) }));
                    nf.setId((id != null ? id : 'f') + '-' + (i + 1));
                    return nf;
                });
                source.addFeatures(newFeatures);
                results.push({ sourceId: id != null ? id : null, parts: kit.writeFeatures(newFeatures) });
            });
        } else if (this.opts.geometry) {
            const parts = geo.split(this.opts.geometry, line);
            results.push({ sourceId: null, parts: { type: 'FeatureCollection', features: parts.map(p => ({ type: 'Feature', properties: {}, geometry: p })) } });
        }
        kit.emit('split', { layerId: layerId || null, results, count: results.length });
        if (!results.length) kit.ui.toast(kit.t('hintSplit'));
    }

    undo() {
        if (this._sketch) this.drawI.removeLastPoint();
        else if (this.source.getFeatures().length) {
            const f = this.source.getFeatures();
            this.source.removeFeature(f[f.length - 1]);
            this._emit('drawchange');
        }
    }

    clear() {
        this.drawI.abortDrawing();
        this.source.clear();
        this._emit('drawchange');
    }

    finish() {
        if (this._sketch) this.drawI.finishDrawing();
    }

    addVertex(lonLat) {
        const c = this.kit.toMap(lonLat);
        if (this.mode === 'point') {
            if (!this.opts.multiple) this.source.clear();
            this.source.addFeature(new ol.Feature(new ol.geom.Point(c)));
            this._emit('drawend');
            this._emit('drawchange');
        } else {
            this.drawI.appendCoordinates([c]);
        }
    }

    destroy() {
        const map = this.kit.olMap;
        map.removeInteraction(this.drawI);
        if (this.modifyI) map.removeInteraction(this.modifyI);
        this.snaps.forEach(s => map.removeInteraction(s));
        map.removeLayer(this.layer);
        if (this.ui) this.ui.destroy();
    }
}
