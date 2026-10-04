import { escapeHtml } from '../core/ui.js';

// "What is here?" on WMS layers (GetFeatureInfo).
//   query.enable(true)            clicks on the map query every visible, queryable WMS layer
//   query.identify([lon, lat])    programmatic, returns a Promise
// Event: featureinfo { lon, lat, results: [{ layerId, title, features: [{ id, properties }] }] }
export class Query {
    constructor(kit, options) {
        this.kit = kit;
        this.opts = Object.assign({ enabled: false, popup: true, featureCount: 10, infoFormat: 'application/json' }, options || {});
        this.enabled = !!this.opts.enabled;
        this._offClick = kit.addClickHandler(e => this._onClick(e), 30);
    }

    enable(on) {
        this.enabled = on !== false;
        this.kit.emit('featureinfotoggle', { enabled: this.enabled });
    }

    _onClick(e) {
        if (!this.enabled) return false;
        if (!this.kit.layers.queryableWms().length) return false;
        this.identify(this.kit.toLonLat(e.coordinate), { popup: this.opts.popup });
        return true;
    }

    identify(lonLat, options) {
        const kit = this.kit;
        const o = Object.assign({ popup: false }, options || {});
        const coord = kit.toMap(lonLat);
        const view = kit.olMap.getView();
        const res = view.getResolution();
        const layers = kit.layers.queryableWms();

        const jobs = layers.map(({ id, def, layer }) => {
            const source = layer.getSource();
            const url = source.getFeatureInfoUrl(coord, res, kit.projection, {
                INFO_FORMAT: def.infoFormat || this.opts.infoFormat,
                FEATURE_COUNT: this.opts.featureCount
            });
            if (!url) return Promise.resolve(null);
            return fetch(url, def.headers ? { headers: def.headers } : undefined)
                .then(r => (r.ok ? r.text() : ''))
                .then(text => {
                    let features = [];
                    try {
                        const json = JSON.parse(text);
                        features = (json.features || []).map(f => ({ id: f.id != null ? f.id : null, properties: f.properties || {} }));
                    } catch (err) {
                        if (text && text.trim()) features = [{ id: null, properties: { info: text.slice(0, 2000) } }];
                    }
                    return { layerId: id, title: def.title, features };
                })
                .catch(() => ({ layerId: id, title: def.title, features: [], error: true }));
        });

        return Promise.all(jobs).then(list => {
            const results = list.filter(r => r && r.features.length);
            const payload = { lon: lonLat[0], lat: lonLat[1], results };
            kit.emit('featureinfo', payload);
            if (o.popup) kit.ui.popup(coord, this.renderHtml(results));
            return payload;
        });
    }

    renderHtml(results) {
        if (!results.length) return '<div>' + escapeHtml(this.kit.t('noInfo')) + '</div>';
        return results.map(r => r.features.map(f => {
            const keys = Object.keys(f.properties).filter(k => f.properties[k] == null || typeof f.properties[k] !== 'object');
            return '<h4>' + escapeHtml(r.title) + '</h4><table>' +
                keys.map(k => '<tr><td>' + escapeHtml(k) + '</td><td>' + escapeHtml(f.properties[k]) + '</td></tr>').join('') + '</table>';
        }).join('')).join('');
    }

    destroy() {
        this._offClick();
    }
}
