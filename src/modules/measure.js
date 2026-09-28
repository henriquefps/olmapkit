import { el } from '../core/ui.js';
import { bearing } from '../core/proj.js';

// Measuring tool: distance, area (with perimeter) and bearing.
//   measure.start('distance' | 'area' | 'azimuth')   measure.clear()   measure.stop()
// Event: measure { type, value, formatted, perimeter?, geojson }
export class Measure {
    constructor(kit) {
        this.kit = kit;
        this.type = null;
        this.source = new ol.source.Vector();
        this.layer = new ol.layer.Vector({
            source: this.source,
            zIndex: 1001,
            style: new ol.style.Style({
                stroke: new ol.style.Stroke({ color: '#ff6f00', width: 3, lineDash: [8, 6] }),
                fill: new ol.style.Fill({ color: 'rgba(255,111,0,0.15)' }),
                image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#ff6f00' }) })
            })
        });
        this.layer.set('olmkInternal', 'measure');
        this.overlays = [];
        if (kit.options.controls.measure) {
            this._button = kit.ui.button({ id: 'measure', icon: 'ruler', title: kit.t('measure'), order: 30, onClick: () => (this.type ? this.stop() : this.start('distance')) });
        }
    }

    start(type) {
        const kit = this.kit;
        const map = kit.olMap;
        const t = type || 'distance';
        if (this.type) this._removeDraw();
        if (!this.type) {
            kit.activateTool('measure', { stop: () => this.stop(), blocksClicks: true });
            map.addLayer(this.layer);
            this._buildToolbar();
        }
        this.type = t;
        if (this._button) this._button.setActive(true);
        Object.keys(this.ui.btn).forEach(k => this.ui.btn[k].classList.toggle('is-primary', k === t));

        const style = new ol.style.Style({
            stroke: new ol.style.Stroke({ color: '#ff6f00', width: 3, lineDash: [8, 6] }),
            fill: new ol.style.Fill({ color: 'rgba(255,111,0,0.15)' }),
            image: new ol.style.Circle({ radius: 6, stroke: new ol.style.Stroke({ color: '#ff6f00', width: 2 }), fill: new ol.style.Fill({ color: 'rgba(255,255,255,0.8)' }) })
        });
        this.drawI = new ol.interaction.Draw({
            source: this.source,
            type: t === 'area' ? 'Polygon' : 'LineString',
            maxPoints: t === 'azimuth' ? 2 : undefined,
            style,
            stopClick: true
        });
        map.addInteraction(this.drawI);

        let tip = null;
        let listener = null;
        this.drawI.on('drawstart', e => {
            tip = this._tooltip();
            listener = e.feature.getGeometry().on('change', ev => {
                const r = this._compute(ev.target);
                tip.el.textContent = r.formatted;
                tip.overlay.setPosition(this._anchor(ev.target));
            });
        });
        this.drawI.on('drawend', e => {
            ol.Observable.unByKey(listener);
            const r = this._compute(e.feature.getGeometry());
            if (tip) {
                tip.el.textContent = r.formatted;
                tip.overlay.setPosition(this._anchor(e.feature.getGeometry()));
                tip.overlay.setOffset([0, -8]);
            }
            e.feature.set('measure', r.value);
            kit.emit('measure', Object.assign({ geojson: kit.writeGeometry(e.feature.getGeometry()) }, r));
            if (this.ui) this.ui.pill.innerHTML = '<b>' + r.formatted + '</b>';
        });
    }

    _buildToolbar() {
        const t = this.kit.t;
        this.ui = this.kit.ui.toolbar([
            { id: 'distance', label: t('measureDistance'), onClick: () => this.start('distance') },
            { id: 'area', label: t('measureArea'), onClick: () => this.start('area') },
            { id: 'azimuth', label: t('measureAzimuth'), onClick: () => this.start('azimuth') },
            { id: 'clear', label: t('measureClear'), onClick: () => this.clear() },
            { id: 'close', label: t('close'), onClick: () => this.stop() }
        ]);
        this.ui.hint.textContent = t('hintMeasure');
    }

    _tooltip() {
        const e = el('div', { class: 'olmk-measure-tip' });
        const overlay = new ol.Overlay({ element: e, offset: [0, -16], positioning: 'bottom-center', stopEvent: false });
        this.kit.olMap.addOverlay(overlay);
        this.overlays.push(overlay);
        return { el: e, overlay };
    }

    _anchor(geom) {
        if (geom.getType() === 'Polygon') return geom.getInteriorPoint().getCoordinates();
        return geom.getLastCoordinate();
    }

    _compute(geom) {
        const kit = this.kit;
        const fmt = kit.format;
        const proj = kit.projection;
        if (geom.getType() === 'Polygon') {
            const area = ol.sphere.getArea(geom, { projection: proj });
            const perimeter = ol.sphere.getLength(new ol.geom.LineString(geom.getCoordinates()[0]), { projection: proj });
            return { type: 'area', value: area, perimeter, formatted: fmt.area(area) + ' · ' + kit.t('perimeter') + ' ' + fmt.length(perimeter) };
        }
        const len = ol.sphere.getLength(geom, { projection: proj });
        if (this.type === 'azimuth') {
            const c = geom.getCoordinates();
            const deg = c.length >= 2 ? bearing(kit.toLonLat(c[0]), kit.toLonLat(c[c.length - 1])) : 0;
            return { type: 'azimuth', value: deg, distance: len, formatted: fmt.angle(deg) + ' · ' + fmt.length(len) };
        }
        return { type: 'distance', value: len, formatted: fmt.length(len) };
    }

    clear() {
        this.source.clear();
        this.overlays.forEach(o => this.kit.olMap.removeOverlay(o));
        this.overlays = [];
        if (this.drawI) this.drawI.abortDrawing();
        if (this.ui) this.ui.pill.textContent = '';
    }

    _removeDraw() {
        if (this.drawI) {
            this.drawI.abortDrawing();
            this.kit.olMap.removeInteraction(this.drawI);
            this.drawI = null;
        }
    }

    stop() {
        if (!this.type) return;
        this._removeDraw();
        this.clear();
        this.kit.olMap.removeLayer(this.layer);
        if (this.ui) { this.ui.destroy(); this.ui = null; }
        this.type = null;
        if (this._button) this._button.setActive(false);
        this.kit.releaseTool('measure');
    }

    destroy() {
        this.stop();
    }
}
