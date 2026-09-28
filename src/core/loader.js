// Image tile / image loading through fetch(), so requests can carry headers
// (e.g. Authorization for a protected WMS) and go through the offline cache.
export function makeImageLoader(kit, options) {
    const headers = (options && options.headers) || null;
    const cacheKey = options && options.cacheKey;
    return function (imageWrapper, src) {
        const image = imageWrapper.getImage();
        const done = blob => {
            const url = URL.createObjectURL(blob);
            image.onload = image.onerror = () => URL.revokeObjectURL(url);
            image.src = url;
        };
        const fail = () => { image.src = ''; if (imageWrapper.setState) imageWrapper.setState(3); };
        const load = () => fetch(src, headers ? { headers } : undefined)
            .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); });

        const offline = kit.offline;
        if (cacheKey && offline && offline.enabled) {
            offline.getTile(cacheKey, src).then(cached => {
                if (cached) return done(cached);
                return load().then(blob => { done(blob); offline.putTile(cacheKey, src, blob); });
            }).catch(fail);
        } else {
            load().then(done).catch(fail);
        }
    };
}
