// Magnifier shown above the finger while placing or dragging a point on touch screens.
import { el } from '../../core/ui.js';

export class Loupe {
    constructor(kit, options) {
        this.kit = kit;
        this.opts = Object.assign({ size: 120, zoom: 2, offset: 90 }, options || {});
        this.box = el('div', { class: 'olmk-loupe' });
        this.canvas = el('canvas');
        this.box.appendChild(this.canvas);
        kit.olMap.getViewport().appendChild(this.box);
        this._raf = 0;
    }

    // fingerPixel: where the finger is; targetPixel: the point to magnify (map pixels)
    show(fingerPixel, targetPixel) {
        this._finger = fingerPixel;
        this._target = targetPixel;
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this._draw();
        });
    }

    _draw() {
        const map = this.kit.olMap;
        const size = map.getSize();
        if (!size || !this._target) return;
        const s = this.opts.size;
        const dpr = window.devicePixelRatio || 1;
        const c = this.canvas;
        c.width = s * dpr;
        c.height = s * dpr;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#ddd';
        ctx.fillRect(0, 0, c.width, c.height);

        const region = s / this.opts.zoom; // CSS px of map shown in the loupe
        const vp = map.getViewport();
        vp.querySelectorAll('.ol-layer canvas, canvas.ol-layer').forEach(canvas => {
            if (!canvas.width || canvas === c) return;
            const ratio = canvas.width / size[0];
            const opacity = canvas.parentNode && canvas.parentNode.style.opacity;
            ctx.globalAlpha = opacity === '' || opacity == null ? 1 : Number(opacity);
            try {
                ctx.drawImage(canvas,
                    (this._target[0] - region / 2) * ratio, (this._target[1] - region / 2) * ratio, region * ratio, region * ratio,
                    0, 0, c.width, c.height);
            } catch (e) { /* tainted or WebGL canvas: skip */ }
        });
        ctx.globalAlpha = 1;

        // Place above the finger, or below it near the top edge
        let left = this._finger[0] - s / 2;
        let top = this._finger[1] - s - this.opts.offset;
        if (top < 4) top = this._finger[1] + this.opts.offset;
        left = Math.max(4, Math.min(size[0] - s - 4, left));
        this.box.style.left = left + 'px';
        this.box.style.top = top + 'px';
        this.box.style.display = 'block';
    }

    hide() {
        if (this._raf) cancelAnimationFrame(this._raf);
        this._raf = 0;
        this.box.style.display = 'none';
    }

    destroy() {
        this.hide();
        this.box.remove();
    }
}
