// Minimal event emitter. `on('*', fn)` receives every event as fn(type, payload).
export class Emitter {
    constructor() {
        this._handlers = {};
    }

    on(type, fn) {
        (this._handlers[type] || (this._handlers[type] = [])).push(fn);
        return () => this.off(type, fn);
    }

    once(type, fn) {
        const off = this.on(type, payload => { off(); fn(payload); });
        return off;
    }

    off(type, fn) {
        const list = this._handlers[type];
        if (!list) return;
        const i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
    }

    emit(type, payload) {
        const call = (fn, args) => {
            try { fn.apply(null, args); } catch (e) { console.error('[OLMapKit] handler for "' + type + '" failed', e); }
        };
        (this._handlers[type] || []).slice().forEach(fn => call(fn, [payload]));
        (this._handlers['*'] || []).slice().forEach(fn => call(fn, [type, payload]));
    }
}
