import { makeStyleFunction, compileFilter, legendEntries, formatTemplate } from '../core/style.js';
import { makeImageLoader } from '../core/loader.js';
import { el, svg, escapeHtml } from '../core/ui.js';

// Layer definition (all types): { id, type, title, visible, opacity, zIndex, minZoom, maxZoom,
//   style, filter, popup, legend, queryable, fitOnLoad, headers }
// Types: wms, wmts, wfs, geojson, kml, gpx, xyz, vectortile, image, vector
// (heatmap / cog / hillshade are added by the viz and raster modules through `register`).

const VECTOR_TYPES = ['geojson', 'kml', 'gpx', 'wfs', 'vector'];

export class Layers {
    constructor(kit, options) {
        this.kit = kit;
        this.defs = new Map();
        this.olLayers = new Map();
        this._seq = 0;
        this._offClick = kit.addClickHandler(e => this._onClick(e), 20);
        if (options.controls && options.controls.layers) {
            this._button = kit.ui.button({ id: 'layers', icon: 'layers', title: kit.t('layers'), order: 10, onClick: () => this.togglePanel() });
        }
        kit.on('basemapchange', () => this._renderPanel());
    }

    /* ---------------- add / remove ---------------- */

    add(input) {
        const def = Object.assign({ visible: true, opacity: 1, queryable: true }, input);
        def.id = def.id != null ? String(def.id) : 'layer' + (++this._seq);
        def.title = def.title || def.id;
        if (this.defs.has(def.id)) this.remove(def.id);

        const layer = this._create(def);
        if (!layer) {
            console.warn('[OLMapKit] unknown layer type', def.type);
            return null;
        }
        return this.register(def, layer);
    }

    // Registers an already-built OpenLayers layer (used by other modules)
    register(def, layer) {
        def.id = def.id != null ? String(def.id) : 'layer' + (++this._seq);
        def.title = def.title || def.id;
        const count = this.defs.size;
        layer.set('olmkLayerId', def.id);
        layer.setVisible(def.visible !== false);
        layer.setOpacity(def.opacity != null ? def.opacity : 1);
        layer.setZIndex(def.zIndex != null ? def.zIndex : 10 + count);
        if (def.minZoom != null) layer.setMinZoom(def.minZoom);
        if (def.maxZoom != null) layer.setMaxZoom(def.maxZoom);
        this.defs.set(def.id, def);
        this.olLayers.set(def.id, layer);
        this.kit.olMap.addLayer(layer);
        this._watchSource(def, layer);
        this.kit.emit('layeradd', this._info(def.id));
        this._renderPanel();
        return def.id;
    }

    remove(id) {
        const layer = this.olLayers.get(String(id));
        if (!layer) return false;
        this.kit.olMap.removeLayer(layer);
        this.olLayers.delete(String(id));
        this.defs.delete(String(id));
        this.kit.emit('layerremove', { id: String(id) });
        this._renderPanel();
        return true;
    }

    get(id) {
        return this.olLayers.get(String(id)) || null;
    }

    getDef(id) {
        return this.defs.get(String(id)) || null;
    }

    has(id) {
        return this.olLayers.has(String(id));
    }

    _info(id) {
        const d = this.defs.get(id);
        const l = this.olLayers.get(id);
        return { id, title: d.title, type: d.type, visible: l.getVisible(), opacity: l.getOpacity(), zIndex: l.getZIndex() };
    }

    list() {
        return Array.from(this.defs.keys()).map(id => this._info(id)).sort((a, b) => b.zIndex - a.zIndex);
    }

    /* ---------------- factories ---------------- */

    _create(def) {
        const kit = this.kit;
        switch (def.type) {
            case 'wms': return this._createWms(def);
            case 'wmts': return this._createWmts(def);
            case 'xyz':
                return new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: def.url, attributions: def.attributions, maxZoom: def.sourceMaxZoom || 19, crossOrigin: 'anonymous',
                        tileLoadFunction: makeImageLoader(kit, { headers: def.headers, cacheKey: def.offline ? 'layer:' + def.id : null })
                    })
                });
            case 'image':
                return new ol.layer.Image({
                    source: new ol.source.ImageStatic({
                        url: def.url, imageExtent: kit.extentToMap(def.bbox), crossOrigin: 'anonymous', attributions: def.attributions
                    })
                });
            case 'vectortile':
                return new ol.layer.VectorTile({
                    declutter: true,
                    source: new ol.source.VectorTile({ url: def.url, format: new ol.format.MVT(), attributions: def.attributions, maxZoom: def.sourceMaxZoom || 14 }),
                    style: this._styleFor(def)
                });
            case 'geojson':
            case 'kml':
            case 'gpx':
            case 'vector':
            case 'wfs':
                return new ol.layer.Vector({
                    source: this._createVectorSource(def),
                    style: def.type === 'kml' && def.extractStyles !== false && !def.style ? undefined : this._styleFor(def),
                    declutter: !!def.declutter
                });
            default:
                return null;
        }
    }

    _styleFor(def) {
        const view = this.kit.olMap.getView();
        return makeStyleFunction(def.style, {
            filter: compileFilter(def.filter),
            zoomForResolution: r => view.getZoomForResolution(r)
        });
    }

    _format(def) {
        if (def.type === 'kml') return new ol.format.KML({ extractStyles: def.extractStyles !== false && !def.style, showPointNames: false });
        if (def.type === 'gpx') return new ol.format.GPX();
        return new ol.format.GeoJSON();
    }

    _createVectorSource(def) {
        const kit = this.kit;
        const format = this._format(def);
        const readOpts = { featureProjection: kit.projection };

        if (def.type === 'wfs') {
            const source = new ol.source.Vector({
                format: new ol.format.GeoJSON(),
                strategy: ol.loadingstrategy.bbox,
                attributions: def.attributions
            });
            const code = kit.projection.getCode();
            source.setLoader((extent, resolution, projection, success, failure) => {
                const params = new URLSearchParams(Object.assign({
                    service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: def.typeName || def.layers,
                    outputFormat: def.outputFormat || 'application/json', srsName: code,
                    bbox: extent.join(',') + ',' + code
                }, def.params || {}));
                const url = def.url + (def.url.indexOf('?') >= 0 ? '&' : '?') + params.toString();
                fetch(url, def.headers ? { headers: def.headers } : undefined)
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                    .then(json => {
                        const feats = source.getFormat().readFeatures(json, { featureProjection: projection, dataProjection: code });
                        source.addFeatures(feats);
                        success(feats);
                    })
                    .catch(err => { source.removeLoadedExtent(extent); failure(); this.kit.emit('layererror', { id: def.id, message: String(err) }); });
            });
            return source;
        }

        const source = new ol.source.Vector({ format, attributions: def.attributions });
        if (def.data) {
            const data = typeof def.data === 'string' && def.type === 'geojson' ? JSON.parse(def.data) : def.data;
            source.addFeatures(format.readFeatures(data, readOpts));
        } else if (def.url) {
            source.setLoader((extent, resolution, projection, success, failure) => {
                fetch(def.url, def.headers ? { headers: def.headers } : undefined)
                    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
                    .then(text => {
                        const feats = format.readFeatures(text, { featureProjection: projection });
                        source.addFeatures(feats);
                        success(feats);
                    })
                    .catch(err => { failure(); this.kit.emit('layererror', { id: def.id, message: String(err) }); });
            });
        }
        return source;
    }

    _createWms(def) {
        const params = Object.assign({ LAYERS: def.layers, TRANSPARENT: true, FORMAT: 'image/png' }, def.params || {});
        if (def.tiled === false) {
            return new ol.layer.Image({
                source: new ol.source.ImageWMS({
                    url: def.url, params, ratio: 1, crossOrigin: 'anonymous', serverType: def.serverType, attributions: def.attributions,
                    imageLoadFunction: makeImageLoader(this.kit, { headers: def.headers })
                })
            });
        }
        params.TILED = true;
        return new ol.layer.Tile({
            source: new ol.source.TileWMS({
                url: def.url, params, crossOrigin: 'anonymous', serverType: def.serverType, attributions: def.attributions,
                tileLoadFunction: makeImageLoader(this.kit, { headers: def.headers, cacheKey: def.offline ? 'layer:' + def.id : null })
            })
        });
    }

    _createWmts(def) {
        const layer = new ol.layer.Tile({});
        const capsUrl = def.capabilitiesUrl || def.url;
        fetch(capsUrl, def.headers ? { headers: def.headers } : undefined)
            .then(r => r.text())
            .then(text => {
                const caps = new ol.format.WMTSCapabilities().read(text);
                const options = ol.source.WMTS.optionsFromCapabilities(caps, {
                    layer: def.layer || def.layers,
                    matrixSet: def.matrixSet || this.kit.projection.getCode(),
                    format: def.format
                });
                if (!options) throw new Error('Layer not found in capabilities');
                options.crossOrigin = 'anonymous';
                options.attributions = def.attributions;
                options.tileLoadFunction = makeImageLoader(this.kit, { headers: def.headers });
                layer.setSource(new ol.source.WMTS(options));
                this.kit.emit('layerload', { id: def.id });
            })
            .catch(err => this.kit.emit('layererror', { id: def.id, message: String(err) }));
        return layer;
    }

    _watchSource(def, layer) {
        const source = layer.getSource && layer.getSource();
        if (!source || !source.on) return;
        let fitted = false;
        if (source instanceof ol.source.Vector) {
            const onLoad = () => {
                this.kit.emit('layerload', { id: def.id, count: source.getFeatures().length });
                if (def.fitOnLoad && !fitted && source.getFeatures().length) { fitted = true; this.zoomTo(def.id); }
                this._renderPanel();
            };
            source.on('featuresloadend', onLoad);
            source.on('featuresloaderror', () => this.kit.emit('layererror', { id: def.id, message: 'load error' }));
            if (def.data) setTimeout(onLoad, 0);
        } else {
            let last = 0;
            source.on('tileloaderror', () => {
                const now = Date.now();
                if (now - last > 5000) { last = now; this.kit.emit('layererror', { id: def.id, message: 'tile load error' }); }
            });
        }
    }

    /* ---------------- state ---------------- */

    setVisible(id, visible) {
        const l = this.get(id);
        if (!l) return false;
        l.setVisible(!!visible);
        this.kit.emit('layerchange', this._info(String(id)));
        this._renderPanel();
        return true;
    }

    setOpacity(id, opacity) {
        const l = this.get(id);
        if (!l) return false;
        l.setOpacity(Math.max(0, Math.min(1, Number(opacity))));
        this.kit.emit('layerchange', this._info(String(id)));
        return true;
    }

    setZIndex(id, z) {
        const l = this.get(id);
        if (!l) return false;
        l.setZIndex(z);
        this._renderPanel();
        return true;
    }

    // Moves a layer one step up (towards the top) or down in the drawing order
    move(id, direction) {
        const sorted = this.list(); // top first
        const i = sorted.findIndex(l => l.id === String(id));
        const j = direction === 'up' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= sorted.length) return false;
        const a = this.get(sorted[i].id);
        const b = this.get(sorted[j].id);
        const za = a.getZIndex();
        a.setZIndex(b.getZIndex());
        b.setZIndex(za === b.getZIndex() ? za + (direction === 'up' ? 1 : -1) : za);
        this.kit.emit('layerchange', this._info(String(id)));
        this._renderPanel();
        return true;
    }

    setStyle(id, spec) {
        const def = this.getDef(id);
        const layer = this.get(id);
        if (!def || !layer || !layer.setStyle) return false;
        def.style = spec;
        layer.setStyle(this._styleFor(def));
        this._renderPanel();
        return true;
    }

    setFilter(id, filter) {
        const def = this.getDef(id);
        const layer = this.get(id);
        if (!def || !layer || !layer.setStyle) return false;
        def.filter = filter;
        layer.setStyle(this._styleFor(def));
        return true;
    }

    getExtent(id) {
        const l = this.get(id);
        const d = this.getDef(id);
        if (!l) return null;
        if (d && d.bbox) return this.kit.extentToMap(d.bbox);
        const s = l.getSource && l.getSource();
        if (s && s.getExtent && s instanceof ol.source.Vector) {
            const e = s.getExtent();
            return ol.extent.isEmpty(e) ? null : e;
        }
        if (s && s.getTileGrid && s.getTileGrid() && s instanceof ol.source.GeoTIFF) return null;
        return null;
    }

    zoomTo(id, opts) {
        const e = this.getExtent(id);
        if (!e) return false;
        return this.kit.fit(e, Object.assign({ mapExtent: true }, opts || {}));
    }

    _vectorSource(id) {
        const l = this.get(id);
        const s = l && l.getSource && l.getSource();
        return s && s instanceof ol.source.Vector ? s : null;
    }

    getFeatures(id) {
        const s = this._vectorSource(id);
        return s ? this.kit.writeFeatures(s.getFeatures()) : null;
    }

    // Adds GeoJSON features to a vector layer (creates an empty 'vector' layer if needed)
    addFeatures(id, geojson, def) {
        if (!this.has(id)) this.add(Object.assign({ id, type: 'vector' }, def || {}));
        const s = this._vectorSource(id);
        if (!s) return 0;
        const feats = this.kit.readFeatures(geojson);
        s.addFeatures(feats);
        this.kit.emit('layerload', { id: String(id), count: s.getFeatures().length });
        this._renderPanel();
        return feats.length;
    }

    setData(id, geojson) {
        const s = this._vectorSource(id);
        if (!s) return false;
        s.clear(true);
        s.addFeatures(this.kit.readFeatures(geojson));
        this.kit.emit('layerload', { id: String(id), count: s.getFeatures().length });
        return true;
    }

    clearFeatures(id) {
        const s = this._vectorSource(id);
        if (s) s.clear();
        return !!s;
    }

    refresh(id) {
        const l = this.get(id);
        if (!l) return false;
        const s = l.getSource();
        if (s && s.refresh) s.refresh();
        return true;
    }

    // WMS layers that answer GetFeatureInfo
    queryableWms() {
        return this.list().filter(l => {
            const d = this.getDef(l.id);
            return d.type === 'wms' && d.queryable !== false && l.visible;
        }).map(l => ({ id: l.id, def: this.getDef(l.id), layer: this.get(l.id) }));
    }

    vectorLayerIds() {
        return Array.from(this.defs.keys()).filter(id => this._vectorSource(id));
    }

    /* ---------------- feature click / popup ---------------- */

    _onClick(e) {
        const map = this.kit.olMap;
        let found = null;
        map.forEachFeatureAtPixel(e.pixel, (f, layer) => {
            const id = layer && layer.get('olmkLayerId');
            const def = id && this.defs.get(id);
            if (!def || def.clickable === false) return false;
            found = { f, def };
            return true;
        }, { hitTolerance: 5 });
        if (!found) return false;

        const props = Object.assign({}, found.f.getProperties());
        delete props.geometry;
        const ll = this.kit.toLonLat(e.coordinate);
        this.kit.emit('featureclick', { layerId: found.def.id, id: found.f.getId() != null ? found.f.getId() : null, properties: props, lon: ll[0], lat: ll[1] });
        if (found.def.popup) this.kit.ui.popup(e.coordinate, this.popupHtml(found.def, props));
        return true;
    }

    popupHtml(def, props) {
        const p = def.popup;
        if (typeof p === 'string') return formatTemplate(p.indexOf('{') >= 0 ? p : '{' + p + '}', Object.keys(props).reduce((o, k) => { o[k] = escapeHtml(props[k]); return o; }, {}));
        const fields = (p && p.fields) || Object.keys(props).filter(k => props[k] == null || typeof props[k] !== 'object');
        const title = p && p.title ? formatTemplate(p.title, props) : def.title;
        return '<h4>' + escapeHtml(title) + '</h4><table>' +
            fields.map(k => '<tr><td>' + escapeHtml(k) + '</td><td>' + escapeHtml(props[k]) + '</td></tr>').join('') + '</table>';
    }

    /* ---------------- panel ---------------- */

    togglePanel() {
        if (this.kit.ui.panelId === 'layers') this.kit.ui.closePanel();
        else this.openPanel();
    }

    openPanel() {
        this._panel = this.kit.ui.panel({
            id: 'layers', title: this.kit.t('layers'),
            onClose: () => { this._panel = null; if (this._button) this._button.setActive(false); }
        });
        if (this._button) this._button.setActive(true);
        this._renderPanel();
    }

    closePanel() {
        if (this._panel) this.kit.ui.closePanel();
    }

    _renderPanel() {
        if (!this._panel) return;
        const kit = this.kit;
        const body = this._panel.body;
        body.innerHTML = '';

        const bms = kit.basemaps.list();
        if (bms.length > 1) {
            body.appendChild(el('div', { class: 'olmk-section', text: kit.t('basemaps') }));
            bms.forEach(b => {
                const row = el('div', { class: 'olmk-row' });
                const label = el('label');
                const input = el('input', { type: 'radio', name: kit.id + '-basemap', value: b.id });
                input.checked = b.active;
                input.addEventListener('change', () => kit.basemaps.set(b.id));
                label.appendChild(input);
                label.appendChild(el('span', { text: b.title }));
                row.appendChild(label);
                body.appendChild(row);
            });
        }

        body.appendChild(el('div', { class: 'olmk-section', text: kit.t('overlays') }));
        const layers = this.list().filter(l => this.defs.get(l.id).listed !== false);
        if (!layers.length) body.appendChild(el('div', { class: 'olmk-row', text: kit.t('noLayers') }));
        layers.forEach((l, idx) => {
            const def = this.defs.get(l.id);
            const box = el('div', { class: 'olmk-layer' });
            const row = el('div', { class: 'olmk-row' });
            const label = el('label');
            const cb = el('input', { type: 'checkbox' });
            cb.checked = l.visible;
            cb.addEventListener('change', () => this.setVisible(l.id, cb.checked));
            label.appendChild(cb);
            label.appendChild(el('span', { text: l.title }));
            row.appendChild(label);
            const zoomBtn = el('button', { type: 'button', class: 'olmk-icon-btn', title: kit.t('zoomTo') }, svg('zoomTo'));
            zoomBtn.addEventListener('click', () => this.zoomTo(l.id));
            if (this.getExtent(l.id)) row.appendChild(zoomBtn);
            box.appendChild(row);

            const tools = el('div', { class: 'olmk-layer-tools' });
            const range = el('input', { type: 'range', min: '0', max: '1', step: '0.05', 'aria-label': kit.t('opacity') });
            range.value = String(l.opacity);
            range.addEventListener('input', () => this.setOpacity(l.id, range.value));
            tools.appendChild(range);
            const up = el('button', { type: 'button', class: 'olmk-icon-btn', title: kit.t('moveUp') }, svg('up'));
            up.disabled = idx === 0;
            up.addEventListener('click', () => this.move(l.id, 'up'));
            const down = el('button', { type: 'button', class: 'olmk-icon-btn', title: kit.t('moveDown') }, svg('down'));
            down.disabled = idx === layers.length - 1;
            down.addEventListener('click', () => this.move(l.id, 'down'));
            tools.appendChild(up);
            tools.appendChild(down);
            box.appendChild(tools);

            const legend = this._legendElement(def);
            if (legend) box.appendChild(legend);
            body.appendChild(box);
        });
    }

    _legendElement(def) {
        if (def.legend === false) return null;
        const entries = def.legendEntries || legendEntries(def.style);
        if (entries.length) {
            const wrap = el('div', { class: 'olmk-legend' });
            entries.forEach(e => {
                const item = el('div', { class: 'olmk-legend-item' });
                const sw = el('span', { class: 'olmk-swatch' });
                sw.style.background = e.color;
                item.appendChild(sw);
                item.appendChild(el('span', { text: e.label }));
                wrap.appendChild(item);
            });
            return wrap;
        }
        let url = typeof def.legend === 'string' ? def.legend : null;
        if (!url && def.type === 'wms' && def.legend) {
            const params = new URLSearchParams({ SERVICE: 'WMS', VERSION: '1.3.0', REQUEST: 'GetLegendGraphic', FORMAT: 'image/png', LAYER: String(def.layers).split(',')[0] });
            url = def.url + (def.url.indexOf('?') >= 0 ? '&' : '?') + params.toString();
        }
        if (!url) return null;
        const wrap = el('div', { class: 'olmk-legend' });
        const img = el('img', { alt: this.kit.t('legend') });
        if (def.headers) {
            fetch(url, { headers: def.headers }).then(r => r.blob()).then(b => { img.src = URL.createObjectURL(b); }).catch(() => wrap.remove());
        } else {
            img.src = url;
            img.onerror = () => wrap.remove();
        }
        wrap.appendChild(img);
        return wrap;
    }

    destroy() {
        this._offClick();
        Array.from(this.olLayers.keys()).forEach(id => this.remove(id));
    }
}

export { VECTOR_TYPES };
