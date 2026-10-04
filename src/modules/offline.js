// Offline tile cache in IndexedDB.
//   offline.enable(true)                         cached tiles are used and new ones are stored
//   offline.prefetch({ bbox, minZoom, maxZoom })  downloads the current base map for an area
//   offline.clear()  offline.stats()
// Providers marked `offline: false` (e.g. tile.openstreetmap.org) refuse bulk download.
// Events: offlineprogress { done, total }, offlinedone { count }, offlineerror
export class Offline {
    constructor(kit, options) {
        this.kit = kit;
        this.opts = Object.assign({ enabled: false, dbName: 'olmk-tiles', maxTiles: 3000, concurrency: 6 }, options || {});
        this.enabled = !!this.opts.enabled;
        this._dbp = null;
        this._mem = new Map(); // fallback when IndexedDB is unavailable
        if (kit.options.controls.offline) {
            this._button = kit.ui.button({ id: 'offline', icon: 'offline', title: kit.t('offline'), order: 42, onClick: () => this.prefetch().catch(() => {}) });
        }
    }

    enable(on) {
        this.enabled = on !== false;
        const bm = this.kit.basemaps;
        if (bm && bm.current) bm.set(bm.current); // reload tiles through the cache
        this.kit.emit('offlinetoggle', { enabled: this.enabled });
    }

    _db() {
        if (this._dbp) return this._dbp;
        this._dbp = new Promise((resolve) => {
            try {
                const req = indexedDB.open(this.opts.dbName, 1);
                req.onupgradeneeded = () => req.result.createObjectStore('tiles');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (e) {
                resolve(null);
            }
        });
        return this._dbp;
    }

    getTile(cacheKey, url) {
        const k = cacheKey + '|' + url;
        return this._db().then(db => {
            if (!db) return this._mem.get(k) || null;
            return new Promise(resolve => {
                const req = db.transaction('tiles', 'readonly').objectStore('tiles').get(k);
                req.onsuccess = () => resolve(req.result ? req.result.blob : null);
                req.onerror = () => resolve(null);
            });
        });
    }

    putTile(cacheKey, url, blob) {
        const k = cacheKey + '|' + url;
        return this._db().then(db => {
            if (!db) { this._mem.set(k, blob); return; }
            return new Promise(resolve => {
                const tx = db.transaction('tiles', 'readwrite');
                tx.objectStore('tiles').put({ blob, t: Date.now() }, k);
                tx.oncomplete = tx.onerror = () => resolve();
            });
        });
    }

    stats() {
        return this._db().then(db => {
            if (!db) return { count: this._mem.size };
            return new Promise(resolve => {
                const req = db.transaction('tiles', 'readonly').objectStore('tiles').count();
                req.onsuccess = () => resolve({ count: req.result });
                req.onerror = () => resolve({ count: 0 });
            });
        });
    }

    clear() {
        this._mem.clear();
        return this._db().then(db => {
            if (!db) return;
            return new Promise(resolve => {
                const tx = db.transaction('tiles', 'readwrite');
                tx.objectStore('tiles').clear();
                tx.oncomplete = tx.onerror = () => resolve();
            });
        }).then(() => this.kit.emit('offlinecleared', {}));
    }

    // Lists tile URLs of the current base map for a bbox and zoom range
    _tileUrls(bbox, minZoom, maxZoom) {
        const kit = this.kit;
        const layer = kit.basemaps.layer;
        const source = layer && layer.getSource();
        if (!source || !source.getTileUrlFunction) return [];
        const grid = source.getTileGridForProjection(kit.projection);
        const fn = source.getTileUrlFunction();
        const extent = kit.extentToMap(bbox);
        const urls = [];
        for (let z = minZoom; z <= maxZoom; z++) {
            grid.forEachTileCoord(extent, z, coord => {
                const u = fn(coord, 1, kit.projection);
                if (u) urls.push(u);
            });
            if (urls.length > this.opts.maxTiles) break;
        }
        return urls;
    }

    countTiles(opts) {
        const o = this._prefetchOpts(opts);
        return this._tileUrls(o.bbox, o.minZoom, o.maxZoom).length;
    }

    _prefetchOpts(opts) {
        const v = this.kit.getView();
        const z = Math.round(v.zoom);
        return Object.assign({ bbox: v.bbox, minZoom: Math.max(0, z - 2), maxZoom: Math.min(z + 2, 19) }, opts || {});
    }

    prefetch(opts) {
        const kit = this.kit;
        const def = kit.basemaps.get();
        if (!def || def.offline === false || def.type === 'none') {
            kit.ui.toast(kit.t('offlineNotAllowed'));
            kit.emit('offlineerror', { reason: 'notallowed', basemap: def && def.id });
            return Promise.reject(new Error('notallowed'));
        }
        const o = this._prefetchOpts(opts);
        const urls = this._tileUrls(o.bbox, o.minZoom, o.maxZoom);
        if (urls.length > this.opts.maxTiles) {
            kit.ui.toast(kit.t('offlineTooMany', { count: urls.length }));
            kit.emit('offlineerror', { reason: 'toomany', count: urls.length });
            return Promise.reject(new Error('toomany'));
        }
        const key = 'basemap:' + def.id;
        this.enabled = true;
        let done = 0;
        let i = 0;
        const total = urls.length;
        const next = () => {
            if (i >= total) return Promise.resolve();
            const url = urls[i++];
            return this.getTile(key, url)
                .then(hit => hit || fetch(url).then(r => { if (!r.ok) throw new Error(); return r.blob(); }).then(b => this.putTile(key, url, b)))
                .catch(() => {})
                .then(() => {
                    done++;
                    if (done % 10 === 0 || done === total) {
                        kit.emit('offlineprogress', { done, total });
                        kit.ui.toast(kit.t('offlineSaving', { done, total }), 1500);
                    }
                    return next();
                });
        };
        const workers = [];
        for (let w = 0; w < Math.min(this.opts.concurrency, total); w++) workers.push(next());
        return Promise.all(workers).then(() => {
            kit.ui.toast(kit.t('offlineSaved', { count: total }));
            kit.emit('offlinedone', { count: total, basemap: def.id, minZoom: o.minZoom, maxZoom: o.maxZoom });
            return { count: total };
        });
    }

    destroy() {}
}
