import { el, svg, escapeHtml } from '../core/ui.js';

// Address / place search.
// Providers: 'nominatim' (default, search on submit only, as its usage policy requires),
// 'photon' (autocomplete allowed) or a function (query, { lang, limit }) => Promise<[{ label, lon, lat, bbox? }]>.
// Event: searchselect { label, lon, lat, bbox }
export class Search {
    constructor(kit, options) {
        this.kit = kit;
        this.opts = Object.assign({
            provider: 'nominatim',
            limit: 6,
            zoom: 17,
            countryCodes: null,     // e.g. 'pt,es'
            autocomplete: null,     // default: true for photon / custom, false for nominatim
            marker: true,
            email: null             // optional contact for Nominatim
        }, options || {});
        if (this.opts.autocomplete == null) this.opts.autocomplete = this.opts.provider !== 'nominatim';
        this._pinSource = new ol.source.Vector();
        this._pinLayer = new ol.layer.Vector({
            source: this._pinSource,
            zIndex: 70,
            style: new ol.style.Style({
                image: new ol.style.Circle({ radius: 9, fill: new ol.style.Fill({ color: '#1e88e5' }), stroke: new ol.style.Stroke({ color: '#fff', width: 3 }) })
            })
        });
        this._pinLayer.set('olmkInternal', 'search');
        kit.olMap.addLayer(this._pinLayer);
        if (kit.options.controls.search) this.mount();
    }

    mount() {
        if (this.box) return;
        const kit = this.kit;
        const box = this.box = el('div', { class: 'olmk-search' });
        box.innerHTML = '<form role="search"><input type="search" enterkeyhint="search" autocomplete="off"><button type="submit">' + svg('search') + '</button></form><ul role="listbox"></ul>';
        const input = this.input = box.querySelector('input');
        input.placeholder = kit.t('searchPlaceholder');
        input.setAttribute('aria-label', kit.t('search'));
        box.querySelector('button').setAttribute('aria-label', kit.t('search'));
        this.list = box.querySelector('ul');
        box.querySelector('form').addEventListener('submit', e => { e.preventDefault(); this._run(input.value); });
        let timer = null;
        input.addEventListener('input', () => {
            if (!input.value.trim()) { this.list.innerHTML = ''; return; }
            if (!this.opts.autocomplete) return;
            clearTimeout(timer);
            timer = setTimeout(() => this._run(input.value), 400);
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Escape') { this.list.innerHTML = ''; input.blur(); }
        });
        kit.olMap.getOverlayContainerStopEvent().appendChild(box);
    }

    _run(q) {
        const query = (q || '').trim();
        if (query.length < 3) return;
        const list = this.list;
        list.innerHTML = '<li class="is-info">' + escapeHtml(this.kit.t('searching')) + '</li>';
        const seq = this._seq = (this._seq || 0) + 1;
        this.geocode(query).then(results => {
            if (seq !== this._seq) return;
            list.innerHTML = '';
            if (!results.length) {
                list.innerHTML = '<li class="is-info">' + escapeHtml(this.kit.t('searchNoResults')) + '</li>';
                return;
            }
            results.forEach(r => {
                const li = el('li', { role: 'option', text: r.label });
                li.addEventListener('click', () => { this.select(r); list.innerHTML = ''; this.input.value = r.label; });
                list.appendChild(li);
            });
        }).catch(() => { if (seq === this._seq) list.innerHTML = '<li class="is-info">' + escapeHtml(this.kit.t('searchNoResults')) + '</li>'; });
    }

    geocode(query) {
        const o = this.opts;
        const lang = this.kit.options.locale || 'en';
        if (typeof o.provider === 'function') return Promise.resolve(o.provider(query, { lang, limit: o.limit }));
        if (o.provider === 'photon') {
            const p = new URLSearchParams({ q: query, limit: String(o.limit) });
            if (['en', 'de', 'fr', 'it'].indexOf(lang.slice(0, 2)) >= 0) p.set('lang', lang.slice(0, 2));
            const c = this.kit.getView().center;
            p.set('lon', String(c[0]));
            p.set('lat', String(c[1]));
            return fetch('https://photon.komoot.io/api/?' + p).then(r => r.json()).then(json => (json.features || []).map(f => {
                const pr = f.properties || {};
                const label = [pr.name, pr.street && (pr.street + (pr.housenumber ? ' ' + pr.housenumber : '')), pr.city, pr.country].filter(Boolean).join(', ');
                const e = pr.extent;
                return { label, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], bbox: e ? [e[0], e[3], e[2], e[1]] : null };
            }));
        }
        const p = new URLSearchParams({ q: query, format: 'jsonv2', limit: String(o.limit), 'accept-language': lang });
        if (o.countryCodes) p.set('countrycodes', o.countryCodes);
        if (o.email) p.set('email', o.email);
        return fetch('https://nominatim.openstreetmap.org/search?' + p).then(r => r.json()).then(list => list.map(r => ({
            label: r.display_name,
            lon: Number(r.lon),
            lat: Number(r.lat),
            bbox: r.boundingbox ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])] : null
        })));
    }

    reverse(lonLat) {
        const p = new URLSearchParams({ lat: String(lonLat[1]), lon: String(lonLat[0]), format: 'jsonv2', 'accept-language': this.kit.options.locale || 'en' });
        return fetch('https://nominatim.openstreetmap.org/reverse?' + p).then(r => r.json()).then(r => ({ label: r.display_name || '', address: r.address || {} }));
    }

    select(result) {
        const kit = this.kit;
        if (result.bbox && result.bbox[0] !== result.bbox[2]) kit.fit(result.bbox, { maxZoom: this.opts.zoom });
        else kit.goTo({ center: [result.lon, result.lat], zoom: this.opts.zoom });
        this._pinSource.clear();
        if (this.opts.marker) this._pinSource.addFeature(new ol.Feature(new ol.geom.Point(kit.toMap([result.lon, result.lat]))));
        kit.emit('searchselect', result);
    }

    clear() {
        this._pinSource.clear();
        if (this.input) this.input.value = '';
        if (this.list) this.list.innerHTML = '';
    }

    destroy() {
        this.kit.olMap.removeLayer(this._pinLayer);
        if (this.box) this.box.remove();
    }
}
