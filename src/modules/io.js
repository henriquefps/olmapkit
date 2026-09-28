import { el, downloadFile } from '../core/ui.js';
import { legendEntries } from '../core/style.js';

// Import / export / print.
//   io.importFile(file, { layerId, title, style })   io.importText(text, name, opts)
//   io.enableDragDrop(true)
//   io.export(source, format)  source: layer id | 'draw' | 'selection' | 'markers' | GeoJSON
//   io.download(source, format, filename)
//   io.print({ title, format: 'png' | 'pdf', filename, legend, download })
// Optional libraries: shpjs (global `shp`) for zipped shapefiles, JSZip for KMZ, jsPDF (global `jspdf`) for PDF.
export class IO {
    constructor(kit) {
        this.kit = kit;
        this._seq = 0;
        const c = kit.options.controls;
        if (c.import) {
            this._fileInput = el('input', { type: 'file', accept: '.geojson,.json,.kml,.kmz,.gpx,.zip,.wkt,.csv', multiple: 'multiple', hidden: 'hidden' });
            this._fileInput.addEventListener('change', () => {
                Array.from(this._fileInput.files || []).forEach(f => this.importFile(f));
                this._fileInput.value = '';
            });
            kit.el.appendChild(this._fileInput);
            kit.ui.button({ id: 'import', icon: 'upload', title: kit.t('importFile'), order: 40, onClick: () => this._fileInput.click() });
            this.enableDragDrop(true);
        }
        if (c.print) kit.ui.button({ id: 'print', icon: 'print', title: kit.t('print'), order: 45, onClick: () => this.print() });
    }

    /* ---------------- import ---------------- */

    importFile(file, opts) {
        const name = file.name || 'file';
        const ext = name.split('.').pop().toLowerCase();
        const kit = this.kit;
        let job;
        if (ext === 'zip') {
            if (typeof shp === 'undefined') job = Promise.reject(new Error('shpjs is not loaded'));
            else job = file.arrayBuffer().then(buf => shp(buf)).then(gj => ({ geojson: Array.isArray(gj) ? { type: 'FeatureCollection', features: gj.flatMap(x => x.features) } : gj }));
        } else if (ext === 'kmz') {
            if (typeof JSZip === 'undefined') job = Promise.reject(new Error('JSZip is not loaded'));
            else job = file.arrayBuffer().then(buf => JSZip.loadAsync(buf)).then(zip => {
                const kml = Object.keys(zip.files).find(n => /\.kml$/i.test(n));
                if (!kml) throw new Error('No KML inside KMZ');
                return zip.files[kml].async('string');
            }).then(text => ({ text, ext: 'kml' }));
        } else {
            job = file.text().then(text => ({ text, ext }));
        }
        return job.then(r => this._importParsed(r, name, opts)).catch(err => {
            kit.ui.toast(kit.t('importFailed'));
            kit.emit('importerror', { name, message: String(err && err.message || err) });
            throw err;
        });
    }

    importText(text, name, opts) {
        const ext = (name || 'data.geojson').split('.').pop().toLowerCase();
        return Promise.resolve(this._importParsed({ text, ext }, name, opts));
    }

    _readFeatures(r) {
        const kit = this.kit;
        const proj = { featureProjection: kit.projection };
        if (r.geojson) return new ol.format.GeoJSON().readFeatures(r.geojson, proj);
        const text = r.text;
        switch (r.ext) {
            case 'kml': return new ol.format.KML({ extractStyles: false }).readFeatures(text, proj);
            case 'gpx': return new ol.format.GPX().readFeatures(text, proj);
            case 'wkt': return text.split(/\n(?=\s*[A-Z])/).map(s => s.trim()).filter(Boolean)
                .map(s => new ol.format.WKT().readFeature(s, { dataProjection: 'EPSG:4326', featureProjection: kit.projection }));
            case 'csv': return this._readCsv(text);
            default: return new ol.format.GeoJSON().readFeatures(JSON.parse(text), proj);
        }
    }

    _readCsv(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return [];
        const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
        const split = line => {
            const out = [];
            let cur = '';
            let q = false;
            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') q = !q;
                else if (ch === sep && !q) { out.push(cur); cur = ''; }
                else cur += ch;
            }
            out.push(cur);
            return out.map(s => s.trim());
        };
        const head = split(lines[0]);
        const find = re => head.findIndex(h => re.test(h));
        const iLat = find(/^(lat|latitude|y)$/i);
        const iLon = find(/^(lon|lng|long|longitude|x)$/i);
        if (iLat < 0 || iLon < 0) throw new Error('CSV needs lat/lon columns');
        return lines.slice(1).map(line => {
            const v = split(line);
            const lon = Number(String(v[iLon]).replace(',', '.'));
            const lat = Number(String(v[iLat]).replace(',', '.'));
            if (!isFinite(lon) || !isFinite(lat)) return null;
            const props = {};
            head.forEach((h, i) => { if (i !== iLat && i !== iLon) props[h] = v[i]; });
            return new ol.Feature(Object.assign(props, { geometry: new ol.geom.Point(this.kit.toMap([lon, lat])) }));
        }).filter(Boolean);
    }

    _importParsed(r, name, opts) {
        const kit = this.kit;
        const o = opts || {};
        const features = this._readFeatures(r);
        const layerId = o.layerId || 'import-' + (++this._seq);
        if (!kit.layers.has(layerId)) {
            kit.layers.add(Object.assign({ id: layerId, type: 'vector', title: o.title || name, style: o.style, popup: o.popup !== false ? true : false }, o.layer || {}));
        }
        kit.layers.get(layerId).getSource().addFeatures(features);
        if (o.fit !== false) kit.layers.zoomTo(layerId);
        kit.ui.toast(kit.t('imported', { count: features.length }));
        const payload = { layerId, name, count: features.length };
        kit.emit('import', payload);
        return payload;
    }

    enableDragDrop(on) {
        const target = this.kit.el;
        if (on === false) {
            if (this._dd) { this._dd.forEach(([t, fn]) => target.removeEventListener(t, fn)); this._dd = null; }
            return;
        }
        if (this._dd) return;
        const overlay = el('div', { class: 'olmk-drop' }, '<span></span>');
        overlay.querySelector('span').textContent = this.kit.t('importDrop');
        target.appendChild(overlay);
        let depth = 0;
        const show = v => overlay.classList.toggle('is-visible', v);
        const hasFiles = e => e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;
        const handlers = [
            ['dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; show(true); }],
            ['dragover', e => { if (hasFiles(e)) e.preventDefault(); }],
            ['dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) show(false); }],
            ['drop', e => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                depth = 0;
                show(false);
                Array.from(e.dataTransfer.files).forEach(f => this.importFile(f).catch(() => {}));
            }]
        ];
        handlers.forEach(([t, fn]) => target.addEventListener(t, fn));
        this._dd = handlers;
        this._ddOverlay = overlay;
    }

    /* ---------------- export ---------------- */

    _featuresFor(source) {
        const kit = this.kit;
        if (source && typeof source === 'object') return kit.readFeatures(source);
        if (source === 'draw') {
            const r = kit.draw.getResult();
            return r && r.geojson ? kit.readFeatures(r.geojson) : [];
        }
        if (source === 'selection') {
            const r = kit.select.getSelection();
            return r ? kit.readFeatures(r.geojson) : [];
        }
        if (source === 'markers') {
            return kit.markers.list().map(m => {
                const f = new ol.Feature(Object.assign({ id: m.id, title: m.title || '', description: m.description || '' }, m.data || {}, { geometry: new ol.geom.Point(kit.toMap([m.lon, m.lat])) }));
                f.setId(m.id);
                return f;
            });
        }
        const layer = kit.layers.get(source);
        const s = layer && layer.getSource();
        return s && s.getFeatures ? s.getFeatures() : [];
    }

    export(source, format) {
        const kit = this.kit;
        const features = this._featuresFor(source);
        const opts = { featureProjection: kit.projection, dataProjection: 'EPSG:4326', decimals: 7 };
        switch ((format || 'geojson').toLowerCase()) {
            case 'kml': return new ol.format.KML().writeFeatures(features, opts);
            case 'gpx': return new ol.format.GPX().writeFeatures(features.filter(f => /Point|LineString/.test(f.getGeometry().getType())), opts);
            case 'wkt': return features.map(f => new ol.format.WKT().writeFeature(f, opts)).join('\n');
            case 'csv': {
                const pts = features.filter(f => f.getGeometry() && f.getGeometry().getType() === 'Point');
                const keys = [];
                pts.forEach(f => Object.keys(f.getProperties()).forEach(k => { if (k !== 'geometry' && keys.indexOf(k) < 0) keys.push(k); }));
                const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
                const rows = pts.map(f => {
                    const ll = kit.toLonLat(f.getGeometry().getCoordinates());
                    return [ll[1].toFixed(7), ll[0].toFixed(7)].concat(keys.map(k => esc(f.get(k)))).join(',');
                });
                return ['lat,lon'].concat(keys.map(esc)).join(',') + '\n' + rows.join('\n');
            }
            default: return JSON.stringify(new ol.format.GeoJSON().writeFeaturesObject(features, opts));
        }
    }

    download(source, format, filename) {
        const fmt = (format || 'geojson').toLowerCase();
        const mime = { geojson: 'application/geo+json', kml: 'application/vnd.google-earth.kml+xml', gpx: 'application/gpx+xml', wkt: 'text/plain', csv: 'text/csv' }[fmt] || 'text/plain';
        const name = filename || ((typeof source === 'string' ? source : 'export') + '.' + fmt);
        downloadFile(name, this.export(source, fmt), mime);
        this.kit.emit('export', { source: typeof source === 'string' ? source : 'geojson', format: fmt, filename: name });
    }

    /* ---------------- print ---------------- */

    // Composes the map canvases into one image (layers need CORS-enabled sources)
    snapshot(scale) {
        const map = this.kit.olMap;
        return new Promise((resolve, reject) => {
            map.once('rendercomplete', () => {
                try {
                    const size = map.getSize();
                    const pr = scale || window.devicePixelRatio || 1;
                    const out = document.createElement('canvas');
                    out.width = Math.round(size[0] * pr);
                    out.height = Math.round(size[1] * pr);
                    const ctx = out.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, out.width, out.height);
                    map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer').forEach(canvas => {
                        if (!canvas.width) return;
                        const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
                        ctx.globalAlpha = opacity === '' ? 1 : Number(opacity);
                        let m;
                        const tr = canvas.style.transform;
                        if (tr && /^matrix\(/.test(tr)) m = tr.match(/^matrix\(([^(]*)\)$/)[1].split(',').map(Number);
                        else m = [parseFloat(canvas.style.width || size[0]) / canvas.width, 0, 0, parseFloat(canvas.style.height || size[1]) / canvas.height, 0, 0];
                        ctx.setTransform(m[0] * pr, m[1] * pr, m[2] * pr, m[3] * pr, m[4] * pr, m[5] * pr);
                        ctx.drawImage(canvas, 0, 0);
                    });
                    ctx.globalAlpha = 1;
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    resolve(out);
                } catch (e) {
                    reject(e);
                }
            });
            map.renderSync();
        });
    }

    print(options) {
        const kit = this.kit;
        const o = Object.assign({ title: kit.t('printTitle'), format: 'png', legend: true, scale: true, north: true, download: true, filename: null }, options || {});
        const pr = 2;
        return this.snapshot(pr).then(mapCanvas => {
            const head = o.title ? 56 * pr : 0;
            const foot = 28 * pr;
            const page = document.createElement('canvas');
            page.width = mapCanvas.width;
            page.height = mapCanvas.height + head + foot;
            const ctx = page.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, page.width, page.height);
            ctx.drawImage(mapCanvas, 0, head);
            const font = s => (s * pr) + 'px system-ui, sans-serif';

            if (o.title) {
                ctx.fillStyle = '#1d2330';
                ctx.font = '700 ' + font(20);
                ctx.textBaseline = 'middle';
                ctx.fillText(o.title, 16 * pr, head / 2);
                ctx.font = font(12);
                ctx.fillStyle = '#5f6b7a';
                const date = new Date().toLocaleDateString(kit.options.locale || 'en');
                ctx.textAlign = 'right';
                ctx.fillText(date, page.width - 16 * pr, head / 2);
                ctx.textAlign = 'left';
            }
            if (o.north) this._drawNorth(ctx, page.width - 40 * pr, head + 40 * pr, 18 * pr, kit.olMap.getView().getRotation());
            if (o.scale) this._drawScale(ctx, 16 * pr, head + mapCanvas.height - 20 * pr, pr);
            if (o.legend) this._drawLegend(ctx, 16 * pr, head + 16 * pr, pr);

            // Attributions
            const attr = Array.from(kit.el.querySelectorAll('.ol-attribution li')).map(li => li.textContent.trim()).filter(Boolean).join(' · ');
            ctx.fillStyle = '#5f6b7a';
            ctx.font = font(10);
            ctx.textBaseline = 'middle';
            ctx.fillText(attr.slice(0, 200), 16 * pr, head + mapCanvas.height + foot / 2);

            const filename = o.filename || ((o.title || 'map').replace(/[^\w-]+/g, '_') + '.' + o.format);
            if (o.format === 'pdf' && typeof jspdf !== 'undefined') {
                const w = page.width / pr;
                const h = page.height / pr;
                const doc = new jspdf.jsPDF({ orientation: w > h ? 'landscape' : 'portrait', unit: 'px', format: [w, h], hotfixes: ['px_scaling'] });
                doc.addImage(page.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h);
                const blob = doc.output('blob');
                if (o.download) downloadFile(filename, blob);
                kit.emit('print', { format: 'pdf', filename, width: w, height: h });
                return blob;
            }
            return new Promise(resolve => page.toBlob(blob => {
                if (o.download) downloadFile(filename.replace(/\.pdf$/, '.png'), blob);
                kit.emit('print', { format: 'png', filename, width: page.width, height: page.height });
                resolve(blob);
            }, 'image/png'));
        }).catch(err => {
            kit.emit('printerror', { message: String(err && err.message || err) });
            kit.ui.toast('Print failed: ' + (err && err.message || err));
            throw err;
        });
    }

    _drawNorth(ctx, x, y, r, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c62828';
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.45, r * 0.2);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#1d2330';
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(-r * 0.45, r * 0.2);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.font = '700 ' + Math.round(r * 0.7) + 'px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('N', 0, r * 0.95);
        ctx.restore();
    }

    _drawScale(ctx, x, y, pr) {
        const kit = this.kit;
        const view = kit.olMap.getView();
        const center = view.getCenter();
        const mpp = ol.proj.getPointResolution(kit.projection, view.getResolution(), center, 'm');
        const target = 120 * mpp;
        const pow = Math.pow(10, Math.floor(Math.log10(target)));
        const nice = [1, 2, 5, 10].map(n => n * pow).filter(n => n <= target).pop() || pow;
        const px = nice / mpp * pr;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x - 6 * pr, y - 18 * pr, px + 12 * pr, 26 * pr);
        ctx.fillStyle = '#1d2330';
        ctx.fillRect(x, y, px, 4 * pr);
        ctx.font = (11 * pr) + 'px system-ui';
        ctx.textBaseline = 'bottom';
        ctx.fillText(kit.format.length(nice), x, y - 2 * pr);
    }

    _drawLegend(ctx, x, y, pr) {
        const kit = this.kit;
        const rows = [];
        kit.layers.list().filter(l => l.visible).forEach(l => {
            const def = kit.layers.getDef(l.id);
            if (def.listed === false) return;
            const entries = def.legendEntries || legendEntries(def.style);
            const color = def.style && (def.style.stroke || def.style.color);
            rows.push({ title: l.title, color: entries.length ? null : color || '#1e88e5' });
            entries.forEach(e => rows.push({ title: e.label, color: e.color, indent: true }));
        });
        if (!rows.length) return;
        const lh = 18 * pr;
        const w = 200 * pr;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(x, y, w, rows.length * lh + 12 * pr);
        ctx.font = (11 * pr) + 'px system-ui';
        ctx.textBaseline = 'middle';
        rows.forEach((r, i) => {
            const cy = y + 6 * pr + i * lh + lh / 2;
            let tx = x + 8 * pr + (r.indent ? 10 * pr : 0);
            if (r.color) {
                ctx.fillStyle = r.color;
                ctx.fillRect(tx, cy - 5 * pr, 12 * pr, 10 * pr);
                tx += 18 * pr;
            }
            ctx.fillStyle = '#1d2330';
            ctx.font = (r.indent ? '' : '600 ') + (11 * pr) + 'px system-ui';
            ctx.fillText(String(r.title).slice(0, 32), tx, cy);
        });
    }

    destroy() {
        this.enableDragDrop(false);
        if (this._ddOverlay) this._ddOverlay.remove();
        if (this._fileInput) this._fileInput.remove();
    }
}
