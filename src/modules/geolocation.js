// Device location: blue dot, accuracy circle, heading, follow mode and track recording.
//   geolocation.start({ follow })   geolocation.stop()   geolocation.getCurrentPosition()
//   geolocation.startTrack()        geolocation.stopTrack()  -> GeoJSON LineString
// Events: position, geolocationerror, trackupdate, trackend
export class Geolocation {
    constructor(kit, options) {
        this.kit = kit;
        this.opts = Object.assign({ highAccuracy: true, zoom: 17, trackMinDistance: 3, trackMaxAccuracy: 50 }, options || {});
        this.active = false;
        this.follow = false;
        this.last = null;
        this._waiters = [];

        this.geo = new ol.Geolocation({
            projection: kit.projection,
            trackingOptions: { enableHighAccuracy: this.opts.highAccuracy, maximumAge: 5000, timeout: 20000 }
        });

        this.accuracyFeature = new ol.Feature();
        this.positionFeature = new ol.Feature();
        this.trackFeature = new ol.Feature();
        this.source = new ol.source.Vector({ features: [this.trackFeature, this.accuracyFeature, this.positionFeature] });
        this.layer = new ol.layer.Vector({ source: this.source, zIndex: 80, style: f => this._style(f) });
        this.layer.set('olmkInternal', 'geolocation');
        kit.olMap.addLayer(this.layer);

        this.geo.on('change:position', () => this._onPosition());
        this.geo.on('change:accuracyGeometry', () => this.accuracyFeature.setGeometry(this.geo.getAccuracyGeometry()));
        this.geo.on('error', err => this._onError(err));

        // Panning by hand stops following
        this._onDrag = () => { if (this.follow) { this.follow = false; this.kit.emit('followchange', { follow: false }); } };
        kit.olMap.on('pointerdrag', this._onDrag);

        if (kit.options.controls.locate) {
            this._button = kit.ui.button({ id: 'locate', icon: 'locate', title: kit.t('locate'), order: 20, onClick: () => this._toggleFromButton() });
        }
    }

    _toggleFromButton() {
        if (this.active && this.follow) this.stop();
        else if (this.active) {
            this.follow = true;
            if (this.last) this._center();
        } else this.start({ follow: true });
    }

    _style(f) {
        if (f === this.accuracyFeature) {
            return new ol.style.Style({ fill: new ol.style.Fill({ color: 'rgba(30,136,229,0.12)' }), stroke: new ol.style.Stroke({ color: 'rgba(30,136,229,0.5)', width: 1 }) });
        }
        if (f === this.trackFeature) {
            return new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#8e24aa', width: 4 }) });
        }
        if (f === this.positionFeature) {
            const heading = this.geo.getHeading();
            const styles = [];
            if (heading != null && isFinite(heading)) {
                styles.push(new ol.style.Style({
                    image: new ol.style.RegularShape({
                        points: 3, radius: 10, displacement: [0, 14], rotation: heading, rotateWithView: true,
                        fill: new ol.style.Fill({ color: 'rgba(30,136,229,0.85)' })
                    })
                }));
            }
            styles.push(new ol.style.Style({
                image: new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color: '#1e88e5' }), stroke: new ol.style.Stroke({ color: '#fff', width: 3 }) })
            }));
            return styles;
        }
        return null;
    }

    start(opts) {
        const o = opts || {};
        this.follow = o.follow !== false;
        this._firstFix = true;
        if (!this.active) {
            this.active = true;
            this.geo.setTracking(true);
            this.kit.ui.toast(this.kit.t('locating'), 2000);
        }
        if (this._button) this._button.setActive(true);
        this.kit.emit('geolocationstart', { follow: this.follow });
    }

    stop() {
        this.active = false;
        this.follow = false;
        if (!this.tracking) this.geo.setTracking(false);
        this.accuracyFeature.setGeometry(null);
        this.positionFeature.setGeometry(null);
        if (this._button) this._button.setActive(false);
        this.kit.emit('geolocationstop', {});
    }

    _payload() {
        const g = this.geo;
        const p = g.getPosition();
        if (!p) return null;
        const ll = this.kit.toLonLat(p);
        const h = g.getHeading();
        return {
            lon: ll[0], lat: ll[1],
            accuracy: g.getAccuracy() || null,
            heading: h != null && isFinite(h) ? (h * 180 / Math.PI + 360) % 360 : null,
            speed: g.getSpeed() != null ? g.getSpeed() : null,
            altitude: g.getAltitude() != null ? g.getAltitude() : null,
            time: Date.now()
        };
    }

    _onPosition() {
        const p = this.geo.getPosition();
        const payload = this._payload();
        if (!payload) return;
        this.last = payload;
        if (this.active) this.positionFeature.setGeometry(new ol.geom.Point(p));
        if (this.active && (this.follow || this._firstFix)) this._center();
        this._firstFix = false;
        if (this.tracking) this._addTrackPoint(p, payload);
        this.kit.emit('position', payload);
        this._waiters.splice(0).forEach(w => w.resolve(payload));
        if (!this.active && !this.tracking) this.geo.setTracking(false);
    }

    _center() {
        const view = this.kit.olMap.getView();
        const p = this.geo.getPosition();
        if (!p) return;
        view.animate({ center: p, zoom: Math.max(view.getZoom(), this.opts.zoom), duration: 400 });
    }

    _onError(err) {
        const msg = err && err.message ? err.message : String(err);
        this.kit.ui.toast(this.kit.t('locationError'));
        this.kit.emit('geolocationerror', { message: msg, code: err && err.code });
        this._waiters.splice(0).forEach(w => w.reject(new Error(msg)));
        if (this._button) this._button.setActive(false);
        this.active = false;
    }

    // One position (reuses a recent fix, otherwise asks the device)
    getCurrentPosition(maxAgeMs) {
        const age = maxAgeMs != null ? maxAgeMs : 10000;
        if (this.last && Date.now() - this.last.time <= age) return Promise.resolve(this.last);
        return new Promise((resolve, reject) => {
            this._waiters.push({ resolve, reject });
            this.geo.setTracking(true);
            setTimeout(() => {
                const i = this._waiters.findIndex(w => w.resolve === resolve);
                if (i >= 0) { this._waiters.splice(i, 1); reject(new Error('timeout')); }
            }, 25000);
        });
    }

    /* ---------------- track recording ---------------- */

    startTrack() {
        this.tracking = true;
        this.trackCoords = [];
        this.trackTimes = [];
        this.trackFeature.setGeometry(null);
        this.geo.setTracking(true);
        this.kit.emit('trackstart', {});
    }

    _addTrackPoint(p, payload) {
        if (payload.accuracy != null && payload.accuracy > this.opts.trackMaxAccuracy) return;
        const last = this.trackCoords[this.trackCoords.length - 1];
        if (last) {
            const d = ol.sphere.getDistance(this.kit.toLonLat(last), [payload.lon, payload.lat]);
            if (d < this.opts.trackMinDistance) return;
        }
        this.trackCoords.push(p.slice());
        this.trackTimes.push(payload.time);
        if (this.trackCoords.length >= 2) this.trackFeature.setGeometry(new ol.geom.LineString(this.trackCoords));
        this.kit.emit('trackupdate', { points: this.trackCoords.length, length: this._trackLength() });
    }

    // Adds a point to the track manually (e.g. from an external GPS or for testing)
    addTrackPoint(lonLat, accuracy) {
        if (!this.tracking) return;
        this._addTrackPoint(this.kit.toMap(lonLat), { lon: lonLat[0], lat: lonLat[1], accuracy: accuracy || 5, time: Date.now() });
    }

    _trackLength() {
        const g = this.trackFeature.getGeometry();
        return g ? ol.sphere.getLength(g, { projection: this.kit.projection }) : 0;
    }

    stopTrack() {
        if (!this.tracking) return null;
        this.tracking = false;
        if (!this.active) this.geo.setTracking(false);
        const g = this.trackFeature.getGeometry();
        const result = {
            points: this.trackCoords.length,
            length: this._trackLength(),
            geojson: g ? { type: 'Feature', properties: { times: this.trackTimes }, geometry: this.kit.writeGeometry(g) } : null
        };
        this.kit.emit('trackend', result);
        return result;
    }

    clearTrack() {
        this.trackFeature.setGeometry(null);
        this.trackCoords = [];
    }

    destroy() {
        this.geo.setTracking(false);
        this.kit.olMap.un('pointerdrag', this._onDrag);
        this.kit.olMap.removeLayer(this.layer);
    }
}
