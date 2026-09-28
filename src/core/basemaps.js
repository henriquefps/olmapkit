import { makeImageLoader } from './loader.js';

const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';

// Built-in base maps. `offline: false` marks providers whose terms forbid bulk download.
export const BASEMAP_PRESETS = {
    osm: { title: 'OpenStreetMap', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attributions: OSM_ATTR, maxZoom: 19, offline: false },
    streets: { title: 'Streets (Esri)', url: ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS user community', maxZoom: 19 },
    light: { title: 'Light gray (Esri)', url: ESRI + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors', maxZoom: 16 },
    dark: { title: 'Dark gray (Esri)', url: ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri — Esri, HERE, Garmin, OpenStreetMap contributors', maxZoom: 16 },
    imagery: { title: 'Satellite (Esri)', url: ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri — Esri, Maxar, Earthstar Geographics, and the GIS User Community', maxZoom: 19 },
    topo: { title: 'Topographic (Esri)', url: ESRI + 'World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attributions: 'Tiles © Esri', maxZoom: 19 },
    terrain: { title: 'Terrain (OpenTopoMap)', url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png', attributions: OSM_ATTR + ', SRTM | © <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)', maxZoom: 17, offline: false },
    none: { title: 'None', type: 'none' }
};

export class Basemaps {
    constructor(kit, options) {
        this.kit = kit;
        this.defs = {};
        this.order = [];
        this.current = null;
        this.layer = null;
        const ids = options.basemaps || ['streets', 'imagery', 'topo', 'light', 'dark', 'osm'];
        ids.forEach(item => this.add(typeof item === 'string' ? Object.assign({ id: item }, BASEMAP_PRESETS[item]) : item));
        this.set(options.basemap || this.order[0] || 'streets');
    }

    add(def) {
        if (!def || !def.id) return;
        const preset = BASEMAP_PRESETS[def.id] || {};
        const d = Object.assign({}, preset, def);
        if (!this.defs[d.id]) this.order.push(d.id);
        this.defs[d.id] = d;
        this.kit.emit('basemapschange', this.list());
    }

    list() {
        return this.order.map(id => ({ id, title: this.defs[id].title || id, active: id === this.current }));
    }

    createSource(d) {
        const kit = this.kit;
        const type = d.type || 'xyz';
        if (type === 'none') return null;
        if (type === 'wms') {
            return new ol.source.TileWMS({
                url: d.url,
                params: Object.assign({ TILED: true }, d.params || {}),
                crossOrigin: 'anonymous',
                attributions: d.attributions,
                tileLoadFunction: makeImageLoader(kit, { headers: d.headers, cacheKey: 'basemap:' + d.id })
            });
        }
        if (type === 'wmts' && d.source) return d.source; // pre-built WMTS source (see layers.addWMTS)
        return new ol.source.XYZ({
            url: d.url,
            attributions: d.attributions,
            maxZoom: d.maxZoom || 19,
            crossOrigin: 'anonymous',
            tileLoadFunction: makeImageLoader(kit, { headers: d.headers, cacheKey: 'basemap:' + d.id })
        });
    }

    set(id) {
        const d = this.defs[id];
        if (!d) return false;
        const map = this.kit.olMap;
        if (this.layer) map.removeLayer(this.layer);
        const source = this.createSource(d);
        this.layer = source ? new ol.layer.Tile({ source, zIndex: -100, preload: 1 }) : null;
        if (this.layer) {
            this.layer.set('olmkBasemap', true);
            map.getLayers().insertAt(0, this.layer);
        }
        this.current = id;
        this.kit.emit('basemapchange', { id, title: d.title || id });
        return true;
    }

    get() {
        return this.current ? Object.assign({ id: this.current }, this.defs[this.current]) : null;
    }
}
