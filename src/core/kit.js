import { Emitter } from './emitter.js';
import { injectCss } from './css.js';
import { createLabels, createFormatter } from './i18n.js';
import { UI } from './ui.js';
import { Basemaps } from './basemaps.js';
import { Markers } from '../modules/markers.js';
import { Layers } from '../modules/layers.js';
import { Compare } from '../modules/compare.js';
import { Draw } from '../modules/draw/index.js';
import { Measure } from '../modules/measure.js';
import { Query } from '../modules/query.js';
import { Search } from '../modules/search.js';
import { Select } from '../modules/select.js';
import { IO } from '../modules/io.js';
import { Geolocation } from '../modules/geolocation.js';
import { Offline } from '../modules/offline.js';
import { Viz } from '../modules/viz.js';
import { Raster } from '../modules/raster.js';

const DEFAULT_CONTROLS = {
    zoom: true,
    fullscreen: true,
    scale: true,
    attribution: true,
    layers: true,
    fitAll: false,
    search: false,
    measure: false,
    locate: false,
    print: false,
    import: false,
    select: false,
    offline: false
};

let instances = 0;

export class MapKit extends Emitter {
    constructor(target, options) {
        super();
        if (typeof ol === 'undefined' || !ol.Map) throw new Error('[OLMapKit] OpenLayers (ol) must be loaded first.');

        const opts = this.options = Object.assign({
            center: [0, 20],
            zoom: 2,
            minZoom: 0,
            maxZoom: 21,
            locale: 'en',
            units: 'metric',
            labels: null,
            ctrlScrollZoom: false,
            doubleClickZoom: true,
            projection: 'EPSG:3857',
            proj4Defs: null,
            theme: null
        }, options || {});
        opts.controls = Object.assign({}, DEFAULT_CONTROLS, opts.controls || {});

        this.id = 'olmk' + (++instances);
        this.el = typeof target === 'string' ? document.getElementById(target) : target;
        if (!this.el) throw new Error('[OLMapKit] map container not found: ' + target);

        injectCss();
        this.el.classList.add('olmk');
        // Positioned container for the overlays, without overriding the host layout
        if (getComputedStyle(this.el).position === 'static') this.el.style.position = 'relative';
        if (opts.theme) Object.keys(opts.theme).forEach(k => this.el.style.setProperty('--olmk-' + k, opts.theme[k]));

        const i18n = createLabels(opts.locale, opts.labels);
        this.labels = i18n.labels;
        this.t = i18n.t;
        this.format = createFormatter(opts.locale, opts.units);

        this._registerProjections(opts);
        this.projection = ol.proj.get(opts.projection);
        this.geojson = new ol.format.GeoJSON({ dataProjection: 'EPSG:4326', featureProjection: this.projection });

        this._panGuards = [];
        this._clickHandlers = [];
        this._tool = null;
        this._cleanups = [];

        this.olMap = new ol.Map({
            target: this.el,
            layers: [],
            controls: this._buildControls(opts),
            interactions: this._buildInteractions(opts),
            view: new ol.View({
                projection: this.projection,
                center: this.toMap(opts.center),
                zoom: opts.zoom,
                minZoom: opts.minZoom,
                maxZoom: opts.maxZoom,
                constrainResolution: false
            })
        });

        this.ui = new UI(this);
        this.basemaps = new Basemaps(this, opts);
        this.offline = new Offline(this, opts.offline || {});
        this.markers = new Markers(this, opts.markers || {});
        this.layers = new Layers(this, opts);
        this.compare = new Compare(this);
        this.draw = new Draw(this, opts.draw || {});
        this.measure = new Measure(this);
        this.query = new Query(this, opts.featureInfo || {});
        this.search = new Search(this, opts.search || {});
        this.select = new Select(this);
        this.io = new IO(this);
        this.geolocation = new Geolocation(this, opts.geolocation || {});
        this.viz = new Viz(this);
        this.raster = new Raster(this);

        this._wireEvents(opts);
        if (typeof opts.onEvent === 'function') this.on('*', opts.onEvent);
        if (opts.markersData) this.markers.set(opts.markersData);
        (opts.layersData || []).forEach(l => this.layers.add(l));

        setTimeout(() => this.emit('ready', this.getView()), 0);
    }

    /* ---------------- setup ---------------- */

    _registerProjections(opts) {
        if (!opts.proj4Defs) return;
        if (typeof proj4 === 'undefined') {
            console.warn('[OLMapKit] proj4Defs given but proj4 is not loaded.');
            return;
        }
        Object.keys(opts.proj4Defs).forEach(code => proj4.defs(code, opts.proj4Defs[code]));
        ol.proj.proj4.register(proj4);
    }

    _buildControls(opts) {
        const c = opts.controls;
        const list = [];
        if (c.zoom) list.push(new ol.control.Zoom());
        if (c.attribution) list.push(new ol.control.Attribution({ collapsible: true, collapsed: true }));
        if (c.scale) list.push(new ol.control.ScaleLine({ units: opts.units === 'imperial' ? 'imperial' : 'metric' }));
        return list;
    }

    _buildInteractions(opts) {
        const cond = ol.events.condition;
        const kit = this;
        const list = [
            new ol.interaction.DragRotate(),
            new ol.interaction.DragPan({
                condition: function (e) {
                    return cond.noModifierKeys(e) && cond.primaryAction(e) && kit._panAllowed(e);
                }
            }),
            new ol.interaction.PinchRotate(),
            new ol.interaction.PinchZoom(),
            new ol.interaction.KeyboardPan(),
            new ol.interaction.KeyboardZoom(),
            new ol.interaction.MouseWheelZoom({
                condition: e => !opts.ctrlScrollZoom || e.originalEvent.ctrlKey || e.originalEvent.metaKey
            }),
            new ol.interaction.DragZoom()
        ];
        if (opts.doubleClickZoom) list.push(new ol.interaction.DoubleClickZoom());
        // Processed first (added last): blocks double-click zoom while a tool is active
        list.push(new ol.interaction.Interaction({
            handleEvent: e => !(e.type === 'dblclick' && kit._tool && kit._tool.blocksDblClick !== false)
        }));
        return list;
    }

    _wireEvents(opts) {
        const map = this.olMap;
        map.on('singleclick', e => this._dispatchClick(e));
        map.on('moveend', () => this.emit('moveend', this.getView()));

        if (opts.controls.fullscreen) {
            this.ui.button({
                id: 'fullscreen', icon: 'fullscreen', title: 'Fullscreen', order: 90,
                onClick: () => {
                    const doc = document;
                    if (doc.fullscreenElement) doc.exitFullscreen();
                    else if (this.el.requestFullscreen) this.el.requestFullscreen();
                    else this.el.classList.toggle('olmk-pseudo-fullscreen');
                }
            });
        }
        if (opts.controls.fitAll) {
            this.ui.button({ id: 'fitall', icon: 'fit', title: this.t('fitAll'), order: 15, onClick: () => this.fitAll() });
        }

        if (opts.ctrlScrollZoom) {
            const msg = document.createElement('div');
            msg.className = 'olmk-overlay-msg';
            msg.textContent = this.t('ctrlScroll');
            this.el.appendChild(msg);
            let timer = null;
            const onWheel = e => {
                if (e.ctrlKey || e.metaKey) return;
                msg.classList.add('is-visible');
                clearTimeout(timer);
                timer = setTimeout(() => msg.classList.remove('is-visible'), 1500);
            };
            map.getViewport().addEventListener('wheel', onWheel, { passive: true });
        }
    }

    _panAllowed(e) {
        for (let i = 0; i < this._panGuards.length; i++) {
            if (!this._panGuards[i](e)) return false;
        }
        return true;
    }

    // A pan guard returns false to block one-finger pan (e.g. while dragging a vertex)
    addPanGuard(fn) {
        this._panGuards.push(fn);
        return () => { const i = this._panGuards.indexOf(fn); if (i >= 0) this._panGuards.splice(i, 1); };
    }

    // Click handlers: fn(evt) returns true when it consumed the click. Lower priority runs first.
    addClickHandler(fn, priority) {
        const h = { fn, priority: priority == null ? 50 : priority };
        this._clickHandlers.push(h);
        this._clickHandlers.sort((a, b) => a.priority - b.priority);
        return () => { const i = this._clickHandlers.indexOf(h); if (i >= 0) this._clickHandlers.splice(i, 1); };
    }

    _dispatchClick(e) {
        const ll = this.toLonLat(e.coordinate);
        this.emit('click', { lon: ll[0], lat: ll[1] });
        if (this._tool && this._tool.blocksClicks !== false) return;
        for (let i = 0; i < this._clickHandlers.length; i++) {
            if (this._clickHandlers[i].fn(e)) return;
        }
    }

    /* ---------------- tools ---------------- */

    // Only one interactive tool at a time (draw, measure, select…). `tool.stop()` must release it.
    activateTool(name, tool) {
        if (this._tool && this._tool.name !== name) {
            const prev = this._tool;
            this._tool = null;
            prev.stop();
        }
        this._tool = Object.assign({ name }, tool);
        this.ui.closePopup();
        this.emit('toolchange', { tool: name });
    }

    releaseTool(name) {
        if (this._tool && this._tool.name === name) {
            this._tool = null;
            this.emit('toolchange', { tool: null });
        }
    }

    get activeTool() {
        return this._tool ? this._tool.name : null;
    }

    stopTool() {
        if (this._tool) this._tool.stop();
    }

    /* ---------------- coordinates ---------------- */

    toMap(lonLat) {
        return ol.proj.fromLonLat([Number(lonLat[0]), Number(lonLat[1])], this.projection);
    }

    toLonLat(coord) {
        return ol.proj.toLonLat(coord, this.projection);
    }

    // [minLon, minLat, maxLon, maxLat] <-> map extent
    extentToMap(bbox) {
        return ol.proj.transformExtent(bbox, 'EPSG:4326', this.projection);
    }

    extentToLonLat(extent) {
        return ol.proj.transformExtent(extent, this.projection, 'EPSG:4326');
    }

    readFeatures(geojson) {
        if (!geojson) return [];
        const obj = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        if (obj.type && obj.type !== 'FeatureCollection' && obj.type !== 'Feature') {
            return [new ol.Feature(this.geojson.readGeometry(obj))];
        }
        return this.geojson.readFeatures(obj);
    }

    readGeometry(geometry) {
        if (!geometry) return null;
        const obj = typeof geometry === 'string' ? JSON.parse(geometry) : geometry;
        if (obj.type === 'Feature') return this.geojson.readGeometry(obj.geometry);
        if (obj.type === 'FeatureCollection') return obj.features.length ? this.geojson.readGeometry(obj.features[0].geometry) : null;
        return this.geojson.readGeometry(obj);
    }

    writeFeatures(features) {
        return this.geojson.writeFeaturesObject(features, { decimals: 7 });
    }

    writeGeometry(geom) {
        return this.geojson.writeGeometryObject(geom, { decimals: 7 });
    }

    /* ---------------- view ---------------- */

    getView() {
        const view = this.olMap.getView();
        const size = this.olMap.getSize();
        const center = this.toLonLat(view.getCenter());
        const extent = size ? this.extentToLonLat(view.calculateExtent(size)) : null;
        return { center, zoom: view.getZoom(), rotation: view.getRotation(), bbox: extent };
    }

    goTo(opts) {
        const view = this.olMap.getView();
        const o = opts || {};
        const anim = { duration: o.duration != null ? o.duration : 500 };
        if (o.center) anim.center = this.toMap(o.center);
        if (o.zoom != null) anim.zoom = o.zoom;
        if (o.rotation != null) anim.rotation = o.rotation;
        view.animate(anim);
    }

    // Fits a lon/lat bbox, a GeoJSON object or an OpenLayers extent (map projection)
    fit(target, opts) {
        const o = Object.assign({ padding: [48, 48, 48, 48], maxZoom: 17, duration: 500 }, opts || {});
        let extent = null;
        if (Array.isArray(target) && target.length === 4) {
            extent = o.mapExtent ? target : this.extentToMap(target);
        } else if (target) {
            const feats = this.readFeatures(target);
            extent = ol.extent.createEmpty();
            feats.forEach(f => f.getGeometry() && ol.extent.extend(extent, f.getGeometry().getExtent()));
        }
        if (!extent || ol.extent.isEmpty(extent)) return false;
        this.olMap.getView().fit(extent, { padding: o.padding, maxZoom: o.maxZoom, duration: o.duration });
        return true;
    }

    // Fits everything: markers and visible overlay layers
    fitAll(opts) {
        const extent = ol.extent.createEmpty();
        const m = this.markers.getExtent();
        if (m) ol.extent.extend(extent, m);
        this.layers.list().filter(l => l.visible).forEach(l => {
            const e = this.layers.getExtent(l.id);
            if (e) ol.extent.extend(extent, e);
        });
        if (ol.extent.isEmpty(extent)) return false;
        return this.fit(extent, Object.assign({ mapExtent: true }, opts || {}));
    }

    /* ---------------- lifecycle ---------------- */

    onDestroy(fn) {
        this._cleanups.push(fn);
    }

    destroy() {
        this.emit('destroy', {});
        this._cleanups.splice(0).forEach(fn => { try { fn(); } catch (e) { console.warn(e); } });
        ['raster', 'viz', 'geolocation', 'io', 'select', 'search', 'query', 'measure', 'draw', 'compare', 'layers', 'markers', 'offline']
            .forEach(k => { try { this[k] && this[k].destroy && this[k].destroy(); } catch (e) { console.warn(e); } });
        this.ui.destroy();
        this.olMap.setTarget(null);
        this._handlers = {};
        this.el.classList.remove('olmk', 'olmk-narrow');
    }
}
