// Raster layers rendered with WebGL.
//   raster.cog({ id, url | sources, mode: 'rgb' | 'ndvi' | 'single', min, max, colors, fit })  -> Promise<id>
//   raster.hillshade({ id, url, exaggeration, sunElevation, sunAzimuth, opacity })             -> id
//   raster.setVariables(id, { ... })
// NDVI takes two single-band sources [red, nir] (e.g. Sentinel-2 B04 and B08).

const NDVI_COLORS = [
    -0.2, [191, 191, 191],
    0, [255, 255, 224],
    0.2, [145, 191, 82],
    0.4, [79, 138, 46],
    0.6, [15, 84, 10],
    0.8, [0, 50, 0]
];

function utmDef(code) {
    const m = /^EPSG:(32[67])(\d\d)$/.exec(code);
    if (!m) return null;
    return '+proj=utm +zone=' + Number(m[2]) + (m[1] === '327' ? ' +south' : '') + ' +datum=WGS84 +units=m +no_defs';
}

// Makes sure the raster projection can be transformed to the map projection
function ensureProjection(code) {
    if (!code || code === 'EPSG:3857' || code === 'EPSG:4326') return Promise.resolve();
    if (typeof proj4 === 'undefined') return Promise.reject(new Error('proj4 is required to reproject ' + code));
    if (!proj4.defs(code)) {
        const def = utmDef(code);
        if (!def) return ol.proj.proj4.fromEPSGCode(code).then(() => undefined);
        proj4.defs(code, def);
    }
    ol.proj.proj4.register(proj4);
    return Promise.resolve();
}

export class Raster {
    constructor(kit) {
        this.kit = kit;
    }

    cog(opts) {
        const kit = this.kit;
        const o = Object.assign({ mode: 'rgb', title: 'Raster', opacity: 1, fit: true }, opts || {});
        if (typeof GeoTIFF === 'undefined') {
            const err = new Error('geotiff.js (global GeoTIFF) must be loaded to use COG layers');
            kit.emit('layererror', { id: o.id || 'cog', message: err.message });
            return Promise.reject(err);
        }
        const sources = o.sources || [{ url: o.url }];
        const srcDefs = sources.map(s => (typeof s === 'string' ? { url: s } : s)).map(s => (o.nodata === null ? s : Object.assign({ nodata: o.nodata != null ? o.nodata : 0 }, s)));
        const normalize = o.mode === 'rgb';
        let source;
        try {
            source = new ol.source.GeoTIFF({ sources: srcDefs, normalize, convertToRGB: o.convertToRGB, interpolate: true });
        } catch (e) {
            kit.emit('layererror', { id: o.id || 'cog', message: String(e.message || e) });
            return Promise.reject(e);
        }

        return source.getView().then(view => {
            const code = view.projection && (view.projection.getCode ? view.projection.getCode() : view.projection);
            return ensureProjection(code).then(() => view);
        }).then(view => {
            const layer = new ol.layer.WebGLTile({ source, style: this._style(o, srcDefs.length) });
            const def = { id: o.id, title: o.title, type: 'cog', opacity: o.opacity, legend: false };
            const code = view.projection && (view.projection.getCode ? view.projection.getCode() : view.projection);
            if (view.extent) {
                const ext = ol.proj.transformExtent(view.extent, code, kit.projection);
                def.bbox = kit.extentToLonLat(ext);
                if (o.mode === 'ndvi') def.legendEntries = [{ label: '< 0 (water, bare)', color: 'rgb(255,255,224)' }, { label: '0.2', color: 'rgb(145,191,82)' }, { label: '0.4', color: 'rgb(79,138,46)' }, { label: '> 0.6 (dense vegetation)', color: 'rgb(15,84,10)' }];
            }
            const id = kit.layers.register(def, layer);
            if (o.fit && def.bbox) kit.fit(def.bbox, { maxZoom: o.fitZoom || 13 });
            kit.emit('rasterload', { id, projection: code });
            return id;
        }).catch(err => {
            kit.emit('layererror', { id: o.id || 'cog', message: String(err && err.message || err) });
            throw err;
        });
    }

    // With nodata, the GeoTIFF source appends an alpha band after the data bands:
    // pixels where it is 0 are drawn transparent.
    _style(o, bandCount) {
        if (o.style) return o.style;
        const withAlpha = color => (o.nodata === null ? color : ['case', ['==', ['band', bandCount + 1], 0], [0, 0, 0, 0], color]);
        if (o.mode === 'ndvi') {
            const red = ['band', 1];
            const nir = ['band', 2];
            const ndvi = ['/', ['-', nir, red], ['+', nir, red]];
            return { color: withAlpha(['interpolate', ['linear'], ndvi].concat(o.colors || NDVI_COLORS)) };
        }
        if (o.mode === 'single') {
            const min = o.min != null ? o.min : 0;
            const max = o.max != null ? o.max : 1;
            const b = ['band', o.band || 1];
            const colors = o.colors || [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
            const stops = [];
            colors.forEach((c, i) => { stops.push(min + (max - min) * i / (colors.length - 1), c); });
            return { color: withAlpha(['interpolate', ['linear'], b].concat(stops)) };
        }
        return undefined; // rgb: default rendering of bands 1-3 (+ alpha)
    }

    hillshade(opts) {
        const kit = this.kit;
        const o = Object.assign({
            id: 'hillshade', title: 'Hillshade',
            url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
            attributions: 'Elevation: Mapzen Terrain Tiles (AWS Open Data)',
            exaggeration: 1.5, sunElevation: 45, sunAzimuth: 315, opacity: 0.55, maxZoom: 15
        }, opts || {});

        // Terrarium encoding: (R * 256 + G + B / 256) - 32768, bands normalised to 0..1
        const elevation = (dx, dy) => ['-', ['+', ['*', 255 * 256, ['band', 1, dx, dy]], ['*', 255, ['band', 2, dx, dy]], ['*', 255 / 256, ['band', 3, dx, dy]]], 32768];
        const dp = ['*', 2, ['resolution']];
        const z0x = ['*', ['var', 'vert'], elevation(-1, 0)];
        const z1x = ['*', ['var', 'vert'], elevation(1, 0)];
        const dzdx = ['/', ['-', z1x, z0x], dp];
        const z0y = ['*', ['var', 'vert'], elevation(0, -1)];
        const z1y = ['*', ['var', 'vert'], elevation(0, 1)];
        const dzdy = ['/', ['-', z1y, z0y], dp];
        const slope = ['atan', ['sqrt', ['+', ['^', dzdx, 2], ['^', dzdy, 2]]]];
        const aspect = ['clamp', ['atan', ['-', 0, dzdx], dzdy], -Math.PI, Math.PI];
        const sunEl = ['*', Math.PI / 180, ['var', 'sunEl']];
        const sunAz = ['*', Math.PI / 180, ['var', 'sunAz']];
        const incidence = ['+', ['*', ['sin', sunEl], ['cos', slope]], ['*', ['cos', sunEl], ['sin', slope], ['cos', ['-', sunAz, aspect]]]];
        const scaled = ['*', 255, incidence];

        const layer = new ol.layer.WebGLTile({
            source: new ol.source.XYZ({ url: o.url, maxZoom: o.maxZoom, crossOrigin: 'anonymous', interpolate: false, attributions: o.attributions }),
            style: {
                variables: { vert: o.exaggeration, sunEl: o.sunElevation, sunAz: o.sunAzimuth },
                color: ['color', scaled, scaled, scaled]
            }
        });
        return kit.layers.register({ id: o.id, title: o.title, type: 'hillshade', opacity: o.opacity, legend: false }, layer);
    }

    setVariables(id, vars) {
        const layer = this.kit.layers.get(id);
        if (!layer || !layer.updateStyleVariables) return false;
        layer.updateStyleVariables(vars);
        return true;
    }

    destroy() {}
}
