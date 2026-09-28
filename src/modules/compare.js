import { el } from '../core/ui.js';

// Swipe comparison: a layer (or a second base map) is shown only on the right of a draggable divider.
//   compare.swipe({ layer: 'layerId' })            overlay layer vs. what is below it
//   compare.swipe({ basemap: 'imagery' })           another base map vs. the current one
export class Compare {
    constructor(kit) {
        this.kit = kit;
        this.active = null;
    }

    swipe(opts) {
        this.stop();
        const kit = this.kit;
        const map = kit.olMap;
        const o = Object.assign({ position: 0.5 }, opts || {});
        let layer = null;
        let temp = null;

        if (o.basemap) {
            const def = kit.basemaps.defs[o.basemap];
            if (!def) return false;
            const source = kit.basemaps.createSource(def);
            if (!source) return false;
            temp = new ol.layer.Tile({ source, zIndex: -99 });
            map.addLayer(temp);
            layer = temp;
        } else if (o.layer) {
            layer = kit.layers.get(o.layer);
            if (!layer) return false;
            layer.setVisible(true);
        } else {
            return false;
        }

        const state = { position: Math.max(0, Math.min(1, o.position)) };

        const pre = e => {
            const ctx = e.context;
            const size = map.getSize();
            const x = size[0] * state.position;
            if (typeof ctx.save === 'function') {
                const tl = ol.render.getRenderPixel(e, [x, 0]);
                const tr = ol.render.getRenderPixel(e, [size[0], 0]);
                const bl = ol.render.getRenderPixel(e, [x, size[1]]);
                const br = ol.render.getRenderPixel(e, [size[0], size[1]]);
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(tl[0], tl[1]);
                ctx.lineTo(bl[0], bl[1]);
                ctx.lineTo(br[0], br[1]);
                ctx.lineTo(tr[0], tr[1]);
                ctx.closePath();
                ctx.clip();
            } else {
                const gl = ctx;
                gl.enable(gl.SCISSOR_TEST);
                const bottomLeft = ol.render.getRenderPixel(e, [0, size[1]]);
                const topRight = ol.render.getRenderPixel(e, [size[0], 0]);
                const total = topRight[0] - bottomLeft[0];
                const left = Math.round(total * state.position);
                gl.scissor(bottomLeft[0] + left, bottomLeft[1], Math.max(0, Math.round(total - left)), topRight[1] - bottomLeft[1]);
            }
        };
        const post = e => {
            const ctx = e.context;
            if (typeof ctx.restore === 'function') ctx.restore();
            else ctx.disable(ctx.SCISSOR_TEST);
        };
        layer.on('prerender', pre);
        layer.on('postrender', post);

        // Divider with a draggable handle
        const divider = el('div', { class: 'olmk-swipe' });
        const handle = el('div', { class: 'olmk-swipe-handle', role: 'slider', 'aria-label': kit.t('compare'), tabindex: '0' }, '⇆');
        divider.appendChild(handle);
        map.getOverlayContainerStopEvent().appendChild(divider);
        const place = () => { divider.style.left = (state.position * 100) + '%'; };
        place();

        const setPos = clientX => {
            const rect = map.getViewport().getBoundingClientRect();
            state.position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            place();
            map.render();
            kit.emit('compareswipe', { position: state.position });
        };
        const onMove = ev => { ev.preventDefault(); setPos(ev.clientX); };
        const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
        handle.addEventListener('pointerdown', ev => {
            ev.preventDefault();
            ev.stopPropagation();
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
        });
        handle.addEventListener('keydown', ev => {
            if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
                state.position = Math.max(0, Math.min(1, state.position + (ev.key === 'ArrowLeft' ? -0.05 : 0.05)));
                place();
                map.render();
            }
        });

        this.active = { layer, temp, pre, post, divider, state };
        map.render();
        kit.emit('comparestart', { layer: o.layer || null, basemap: o.basemap || null });
        return true;
    }

    setPosition(p) {
        if (!this.active) return;
        this.active.state.position = Math.max(0, Math.min(1, p));
        this.active.divider.style.left = (this.active.state.position * 100) + '%';
        this.kit.olMap.render();
    }

    stop() {
        const a = this.active;
        if (!a) return;
        a.layer.un('prerender', a.pre);
        a.layer.un('postrender', a.post);
        if (a.temp) this.kit.olMap.removeLayer(a.temp);
        a.divider.remove();
        this.active = null;
        this.kit.olMap.render();
        this.kit.emit('comparestop', {});
    }

    destroy() {
        this.stop();
    }
}
