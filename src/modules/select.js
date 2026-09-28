import * as geo from '../geo/ops.js';

// Spatial selection of features (vector layers) and markers.
//   select.byBox({ layers })   select.byPolygon({ layers })   select.byGeometry(geojson, { layers })   select.clear()
// Event: selection { layers: { layerId: [ids] }, markers: [ids], count, geojson }
export class Select {
    constructor(kit) {
        this.kit = kit;
        this.mode = null;
        this.highlight = new ol.source.Vector();
        this.hlLayer = new ol.layer.Vector({
            source: this.highlight,
            zIndex: 900,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#ffeb3b', width: 4 }),
                fill: new ol.style.Fill({ color: 'rgba(255,235,59,0.25)' }),
                image: new ol.style.Circle({ radius: 10, stroke: new ol.style.Stroke({ color: '#ffeb3b', width: 4 }) })
            })
        });
        this.hlLayer.set('olmkInternal', 'selection');
        kit.olMap.addLayer(this.hlLayer);
        this.result = null;
        if (kit.options.controls.select) {
            this._button = kit.ui.button({ id: 'select', icon: 'select', title: kit.t('selectBox'), order: 35, onClick: () => (this.mode ? this.stop() : this.byBox()) });
        }
    }

    _begin(mode, opts) {
        const kit = this.kit;
        this.stop();
        this.mode = mode;
        this.opts = opts || {};
        kit.activateTool('select', { stop: () => this.stop(), blocksClicks: true });
        if (this._button) this._button.setActive(true);
        this.ui = kit.ui.toolbar([
            { id: 'box', label: kit.t('selectBox'), kind: mode === 'box' ? 'primary' : '', onClick: () => this.byBox(this.opts) },
            { id: 'polygon', label: kit.t('selectPolygon'), kind: mode === 'polygon' ? 'primary' : '', onClick: () => this.byPolygon(this.opts) },
            { id: 'clear', label: kit.t('clear'), onClick: () => this.clear() },
            { id: 'close', label: kit.t('close'), onClick: () => this.stop() }
        ]);
        this._renderCount();
    }

    byBox(opts) {
        this._begin('box', opts);
        const i = this.interaction = new ol.interaction.DragBox({ condition: ol.events.condition.always, className: 'olmk-dragbox' });
        i.on('boxend', () => {
            const g = i.getGeometry();
            this.byGeometry(this.kit.writeGeometry(g), this.opts);
        });
        this.kit.olMap.addInteraction(i);
        this._offPan = this.kit.addPanGuard(() => false);
        return this;
    }

    byPolygon(opts) {
        this._begin('polygon', opts);
        const i = this.interaction = new ol.interaction.Draw({ type: 'Polygon', stopClick: true });
        i.on('drawend', e => {
            const g = this.kit.writeGeometry(e.feature.getGeometry());
            setTimeout(() => this.byGeometry(g, this.opts), 0);
        });
        this.kit.olMap.addInteraction(i);
        return this;
    }

    // Selects everything intersecting a GeoJSON geometry (lon/lat)
    byGeometry(geometry, opts) {
        const kit = this.kit;
        const o = opts || {};
        const target = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
        const extent = kit.readGeometry(target).getExtent();
        const ids = o.layers ? [].concat(o.layers) : kit.layers.vectorLayerIds().filter(id => kit.layers.get(id).getVisible());
        const byLayer = {};
        const selected = [];
        ids.forEach(id => {
            const layer = kit.layers.get(id);
            const source = layer && layer.getSource();
            if (!source || !source.getFeaturesInExtent) return;
            source.getFeaturesInExtent(extent).forEach(f => {
                const g = f.getGeometry();
                if (!g) return;
                if (!geo.intersects(target, kit.writeGeometry(g))) return;
                (byLayer[id] || (byLayer[id] = [])).push(f.getId() != null ? f.getId() : ol.util.getUid(f));
                selected.push(f);
            });
        });
        const markers = o.markers === false ? [] : kit.markers.list().filter(m => geo.intersects(target, { type: 'Point', coordinates: [m.lon, m.lat] })).map(m => m.id);

        this.highlight.clear();
        selected.forEach(f => this.highlight.addFeature(new ol.Feature(f.getGeometry().clone())));
        markers.forEach(id => {
            const m = kit.markers.get(id);
            this.highlight.addFeature(new ol.Feature(new ol.geom.Point(kit.toMap([m.lon, m.lat]))));
        });

        this.result = {
            layers: byLayer,
            markers,
            count: selected.length + markers.length,
            geojson: kit.writeFeatures(selected)
        };
        kit.emit('selection', this.result);
        this._renderCount();
        return this.result;
    }

    _renderCount() {
        if (!this.ui) return;
        const n = this.result ? this.result.count : 0;
        this.ui.pill.innerHTML = this.kit.t('selected') + ': <b>' + n + '</b>';
        this.ui.hint.textContent = this.mode === 'box' ? this.kit.t('selectBox') : this.kit.t('selectPolygon');
    }

    getSelection() {
        return this.result;
    }

    clear() {
        this.highlight.clear();
        this.result = null;
        this._renderCount();
        this.kit.emit('selection', { layers: {}, markers: [], count: 0, geojson: { type: 'FeatureCollection', features: [] } });
    }

    stop() {
        if (!this.mode) return;
        if (this.interaction) this.kit.olMap.removeInteraction(this.interaction);
        this.interaction = null;
        if (this._offPan) { this._offPan(); this._offPan = null; }
        if (this.ui) { this.ui.destroy(); this.ui = null; }
        this.mode = null;
        if (this._button) this._button.setActive(false);
        this.kit.releaseTool('select');
    }

    destroy() {
        this.stop();
        this.kit.olMap.removeLayer(this.hlLayer);
    }
}
