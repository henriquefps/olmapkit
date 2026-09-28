import { PolygonEditor } from './polygon-editor.js';
import { SketchTool } from './sketch.js';

// Drawing tools. Only one runs at a time; starting another tool (measure, select…) stops it.
//   draw.polygon({ within, exclude, initial, snap, minArea, gps })
//   draw.line({ initial, snap, multiple }) / draw.point({ multiple })
//   draw.split({ layer: 'parcels' })
// Events: drawchange, drawend, drawstop, split
export class Draw {
    constructor(kit, defaults) {
        this.kit = kit;
        this.defaults = defaults || {};
        this.current = null;
        this.tool = null;
        this.opts = null;
    }

    _start(name, factory, opts) {
        this.stop();
        this.opts = opts || {};
        this.current = factory();
        this.tool = name;
        this.kit.activateTool('draw', { stop: () => this.stop(), blocksClicks: true });
        this.kit.emit('drawstart', { tool: name });
        return this;
    }

    polygon(opts) {
        const o = Object.assign({}, this.defaults, opts || {});
        return this._start('polygon', () => new PolygonEditor(this.kit, o, this), o);
    }

    line(opts) {
        return this._start('line', () => new SketchTool(this.kit, 'line', opts), opts);
    }

    point(opts) {
        return this._start('point', () => new SketchTool(this.kit, 'point', opts), opts);
    }

    split(opts) {
        return this._start('split', () => new SketchTool(this.kit, 'split', opts), opts);
    }

    get active() {
        return !!this.current;
    }

    getResult() {
        return this.current ? this.current.getResult() : null;
    }

    // Stops the tool. With { keep: true } (or `targetLayer` in the tool options) a valid result
    // is added to that layer before the drawing is removed.
    stop(options) {
        if (!this.current) return null;
        const result = this.current.getResult();
        const target = (options && options.targetLayer) || (this.opts && this.opts.targetLayer);
        if (target && result && result.valid && result.geojson) {
            this.kit.layers.addFeatures(target, result.geojson, { title: target });
        }
        const cur = this.current;
        this.current = null;
        const tool = this.tool;
        this.tool = null;
        cur.destroy();
        this.kit.releaseTool('draw');
        this.kit.emit('drawstop', { tool, result });
        return result;
    }

    clear() {
        if (!this.current) return;
        if (this.current.reset) this.current.reset();
        else this.current.clear();
    }

    undo() {
        if (!this.current) return;
        if (this.current.actions) this.current.actions.undo();
        else this.current.undo();
    }

    finish() {
        if (this.current) this.current.finish();
    }

    addVertex(lonLat) {
        if (this.current) this.current.addVertex(lonLat);
    }

    // Polygon only: replaces the ring being edited
    setCoordinates(coords) {
        if (this.current && this.current.setRing) this.current.setRing(coords);
    }

    // For tests and debugging
    debugState() {
        if (!this.current || !this.current.state) return null;
        const s = this.current.state;
        return { mode: s.mode, ring: s.ring.map(c => this.kit.toLonLat(c)), selected: s.selected, touch: s.touch };
    }

    destroy() {
        this.stop();
    }
}
