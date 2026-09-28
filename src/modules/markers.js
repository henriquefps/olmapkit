import { compileFilter } from '../core/style.js';
import { el, escapeHtml } from '../core/ui.js';

// Marker: { id, lon, lat, title, description, icon, iconScale, iconAnchor, color, label, data }
// (Latitude / Longitude keys are accepted too, as they come from OutSystems structures.)

const pinCache = {};
function pinIcon(color) {
    if (!pinCache[color]) {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">' +
            '<path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="' + color + '" stroke="#fff" stroke-width="2"/>' +
            '<circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>';
        pinCache[color] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }
    return pinCache[color];
}

function normalize(m) {
    const lon = m.lon != null ? m.lon : (m.Longitude != null ? m.Longitude : m.lng);
    const lat = m.lat != null ? m.lat : m.Latitude;
    return Object.assign({}, m, {
        id: m.id != null ? String(m.id) : String(m.MarkerId != null ? m.MarkerId : Math.random().toString(36).slice(2)),
        lon: Number(lon),
        lat: Number(lat)
    });
}

export class Markers {
    constructor(kit, options) {
        this.kit = kit;
        this.opts = Object.assign({
            cluster: true,
            clusterDistance: 40,
            focusZoom: 17,
            autoFocus: true,
            selectedScale: 1.35,
            color: '#e53935',
            tooltip: true,
            popup: false
        }, options);
        this._all = new Map();
        this._filter = null;
        this.selectedId = null;
        this._styleCache = {};

        this.source = new ol.source.Vector();
        this.clusterSource = new ol.source.Cluster({ distance: this.opts.clusterDistance, source: this.source });
        this.layer = new ol.layer.Vector({
            source: this.opts.cluster ? this.clusterSource : this.source,
            style: (f, r) => this._style(f, r),
            zIndex: 60,
            updateWhileAnimating: true
        });
        this.layer.set('olmkInternal', 'markers');
        kit.olMap.addLayer(this.layer);

        this._offClick = kit.addClickHandler(e => this._onClick(e), 10);
        this._setupTooltip();
    }

    /* ---------------- data ---------------- */

    set(list) {
        this._all.clear();
        this.selectedId = null;
        const items = typeof list === 'string' ? JSON.parse(list || '[]') : (list || []);
        items.forEach(m => {
            const n = normalize(m);
            if (isFinite(n.lon) && isFinite(n.lat)) this._all.set(n.id, n);
        });
        this._rebuild();
        this.kit.emit('markerschange', { count: this._all.size });
    }

    add(marker) {
        const n = normalize(marker);
        if (!isFinite(n.lon) || !isFinite(n.lat)) return null;
        this._all.set(n.id, n);
        this._rebuild();
        return n.id;
    }

    update(id, patch) {
        const m = this._all.get(String(id));
        if (!m) return false;
        this._all.set(m.id, normalize(Object.assign({}, m, patch, { id: m.id })));
        this._rebuild();
        return true;
    }

    remove(id) {
        const ok = this._all.delete(String(id));
        if (this.selectedId === String(id)) this.selectedId = null;
        this._rebuild();
        return ok;
    }

    clear() {
        this.set([]);
    }

    get(id) {
        return this._all.get(String(id)) || null;
    }

    list() {
        return Array.from(this._all.values());
    }

    // Hides markers that do not match (same filter syntax as layers.setFilter)
    setFilter(filter) {
        this._filter = filter ? compileFilter(typeof filter === 'function' ? filter : filter) : null;
        this._rebuild();
    }

    setVisible(visible) {
        this.layer.setVisible(!!visible);
    }

    setClustering(on) {
        this.opts.cluster = !!on;
        this.layer.setSource(on ? this.clusterSource : this.source);
    }

    _rebuild() {
        const features = [];
        this._all.forEach(m => {
            const f = new ol.Feature(Object.assign({}, m.data || {}, { geometry: new ol.geom.Point(this.kit.toMap([m.lon, m.lat])) }));
            f.setId(m.id);
            f.set('olmkMarker', m, true);
            if (this._filter && !this._filter(f)) return;
            features.push(f);
        });
        this.source.clear(true);
        this.source.addFeatures(features);
    }

    /* ---------------- style ---------------- */

    _style(feature) {
        const members = feature.get('features');
        if (members && members.length > 1) {
            const n = members.length;
            const key = 'c' + n;
            if (!this._styleCache[key]) {
                const radius = 14 + Math.min(14, Math.log2(n) * 3);
                this._styleCache[key] = new ol.style.Style({
                    image: new ol.style.Circle({
                        radius,
                        fill: new ol.style.Fill({ color: 'rgba(46,125,50,0.88)' }),
                        stroke: new ol.style.Stroke({ color: 'rgba(255,255,255,0.9)', width: 3 })
                    }),
                    text: new ol.style.Text({
                        text: String(n),
                        font: '700 13px system-ui, sans-serif',
                        fill: new ol.style.Fill({ color: '#fff' })
                    })
                });
            }
            return this._styleCache[key];
        }
        const f = members ? members[0] : feature;
        const m = f.get('olmkMarker');
        if (!m) return null;
        const selected = m.id === this.selectedId;
        const key = [m.icon || m.color || this.opts.color, m.iconScale || 1, selected, m.label || ''].join('|');
        if (!this._styleCache[key]) {
            const scale = (m.iconScale || 1) * (selected ? this.opts.selectedScale : 1);
            this._styleCache[key] = new ol.style.Style({
                image: new ol.style.Icon({
                    src: m.icon || pinIcon(m.color || this.opts.color),
                    anchor: m.iconAnchor || [0.5, 1],
                    scale,
                    crossOrigin: 'anonymous'
                }),
                text: m.label ? new ol.style.Text({
                    text: String(m.label),
                    offsetY: 14,
                    font: '600 12px system-ui, sans-serif',
                    fill: new ol.style.Fill({ color: '#1d2330' }),
                    stroke: new ol.style.Stroke({ color: '#fff', width: 3 })
                }) : undefined,
                zIndex: selected ? 1000 : 0
            });
        }
        return this._styleCache[key];
    }

    /* ---------------- interaction ---------------- */

    _hit(pixel) {
        return this.kit.olMap.forEachFeatureAtPixel(pixel, f => f, { layerFilter: l => l === this.layer, hitTolerance: 4 });
    }

    _onClick(e) {
        if (!this.layer.getVisible()) return false;
        const hit = this._hit(e.pixel);
        if (!hit) return false;
        const members = hit.get('features') || [hit];

        if (members.length > 1) {
            const view = this.kit.olMap.getView();
            const extent = ol.extent.boundingExtent(members.map(f => f.getGeometry().getCoordinates()));
            const ids = members.map(f => f.getId());
            const canZoom = view.getZoom() < view.getMaxZoom() - 0.5 && ol.extent.getWidth(extent) > 0.01;
            this.kit.emit('clusterclick', { ids, count: ids.length });
            if (canZoom) this.kit.olMap.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 450, maxZoom: view.getMaxZoom() });
            return true;
        }

        const m = members[0].get('olmkMarker');
        this.select(m.id, { focus: this.opts.autoFocus });
        this.kit.emit('markerclick', { id: m.id, lon: m.lon, lat: m.lat, title: m.title || '', data: m.data || {} });
        if (this.opts.popup) this._showPopup(m);
        return true;
    }

    _showPopup(m) {
        let html = '<h4>' + escapeHtml(m.title || m.id) + '</h4>';
        if (m.description) html += '<div>' + escapeHtml(m.description) + '</div>';
        this.kit.ui.popup(this.kit.toMap([m.lon, m.lat]), html, { onClose: () => this.clearSelection() });
    }

    select(id, opts) {
        const m = this.get(id);
        if (!m) return false;
        this.selectedId = m.id;
        this.layer.changed();
        if (opts && opts.focus) this.focus(m.id, opts);
        this.kit.emit('markerselect', { id: m.id });
        return true;
    }

    // Deselects. With { fit: true } the view goes back to all markers.
    clearSelection(opts) {
        const had = this.selectedId;
        this.selectedId = null;
        this.layer.changed();
        if (had) this.kit.emit('markerdeselect', { id: had });
        if (opts && opts.fit) this.fitAll(opts);
    }

    focus(id, opts) {
        const m = this.get(id);
        if (!m) return false;
        const o = opts || {};
        const view = this.kit.olMap.getView();
        const zoom = o.zoom != null ? o.zoom : Math.max(view.getZoom(), this.opts.focusZoom);
        view.animate({ center: this.kit.toMap([m.lon, m.lat]), zoom, duration: o.duration != null ? o.duration : 600 });
        return true;
    }

    getExtent() {
        if (!this.source.getFeatures().length) return null;
        return this.source.getExtent();
    }

    fitAll(opts) {
        const extent = this.getExtent();
        if (!extent) return false;
        const o = Object.assign({ padding: [60, 60, 60, 60], maxZoom: 16, duration: 600 }, opts || {});
        this.kit.olMap.getView().fit(extent, { padding: o.padding, maxZoom: o.maxZoom, duration: o.duration });
        return true;
    }

    _setupTooltip() {
        if (!this.opts.tooltip) return;
        const tip = el('div', { class: 'olmk-tooltip' });
        const overlay = new ol.Overlay({ element: tip, positioning: 'bottom-center', offset: [0, -40], stopEvent: false });
        this.kit.olMap.addOverlay(overlay);
        this._tooltip = overlay;
        this._onMove = e => {
            if (e.dragging || (e.originalEvent && e.originalEvent.pointerType !== 'mouse')) return;
            const hit = this.layer.getVisible() ? this._hit(e.pixel) : null;
            const members = hit && (hit.get('features') || [hit]);
            const m = members && members.length === 1 ? members[0].get('olmkMarker') : null;
            const vp = this.kit.olMap.getViewport();
            if (hit && !this.kit.activeTool) vp.style.cursor = 'pointer';
            else if (vp.style.cursor === 'pointer') vp.style.cursor = '';
            if (m && m.title) {
                tip.textContent = m.title;
                overlay.setPosition(members[0].getGeometry().getCoordinates());
            } else {
                overlay.setPosition(undefined);
            }
        };
        this.kit.olMap.on('pointermove', this._onMove);
    }

    destroy() {
        this._offClick();
        if (this._onMove) this.kit.olMap.un('pointermove', this._onMove);
        if (this._tooltip) this.kit.olMap.removeOverlay(this._tooltip);
        this.kit.olMap.removeLayer(this.layer);
    }
}
