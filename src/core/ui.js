// Shared UI building blocks: corner buttons, side panel / bottom sheet, toast, popup, tool bar.
export const ICONS = {
    layers: 'M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z',
    locate: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    ruler: 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z',
    print: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z',
    upload: 'M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    fullscreen: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
    fit: 'M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6z',
    up: 'M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z',
    down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z',
    zoomTo: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z',
    area: 'M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 4h-4v2h6v-6h-2v4z',
    compass: 'M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
    offline: 'M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z',
    select: 'M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z'
};

export function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.info) + '"/></svg>';
}

export function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => {
        if (k === 'class') e.className = attrs[k];
        else if (k === 'text') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
}

export function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export class UI {
    constructor(kit) {
        this.kit = kit;
        this.root = kit.olMap.getOverlayContainerStopEvent();
        this.corners = {};
        this.panelEl = null;
        this._toastTimer = null;
        this._order = [];

        // Narrow layout (bottom sheet) when the map is small
        const update = () => {
            const w = kit.el.clientWidth;
            kit.el.classList.toggle('olmk-narrow', w > 0 && w < 600);
        };
        update();
        if (window.ResizeObserver) {
            this._ro = new ResizeObserver(update);
            this._ro.observe(kit.el);
        }
    }

    corner(pos) {
        if (!this.corners[pos]) {
            const c = el('div', { class: 'olmk-corner olmk-' + pos });
            this.root.appendChild(c);
            this.corners[pos] = c;
        }
        return this.corners[pos];
    }

    // Adds a round button to a corner. `order` keeps a stable order between modules.
    button(opts) {
        const b = el('button', { type: 'button', class: 'olmk-btn', title: opts.title || '', 'aria-label': opts.title || '' }, svg(opts.icon));
        if (opts.id) b.dataset.olmk = opts.id;
        b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); opts.onClick && opts.onClick(e); });
        const corner = this.corner(opts.position || 'tr');
        const order = opts.order != null ? opts.order : 50;
        b.dataset.order = order;
        const after = Array.prototype.find.call(corner.children, c => Number(c.dataset.order || 50) > order);
        corner.insertBefore(b, after || null);
        return {
            el: b,
            setActive: on => b.classList.toggle('is-active', !!on),
            remove: () => b.remove()
        };
    }

    // One side panel at a time (bottom sheet on narrow maps)
    panel(opts) {
        this.closePanel();
        const p = el('div', { class: 'olmk-panel', role: 'dialog' });
        const head = el('div', { class: 'olmk-panel-head' });
        head.appendChild(el('span', { text: opts.title || '' }));
        const close = el('button', { type: 'button', title: this.kit.t('close'), 'aria-label': this.kit.t('close') }, svg('close'));
        close.addEventListener('click', () => this.closePanel());
        head.appendChild(close);
        const body = el('div', { class: 'olmk-panel-body' });
        p.appendChild(head);
        p.appendChild(body);
        this.root.appendChild(p);
        this.panelEl = p;
        this._panelOnClose = opts.onClose;
        this.panelId = opts.id || null;
        return { el: p, body: body, close: () => this.closePanel() };
    }

    closePanel() {
        if (!this.panelEl) return;
        this.panelEl.remove();
        this.panelEl = null;
        const cb = this._panelOnClose;
        this._panelOnClose = null;
        this.panelId = null;
        if (cb) cb();
    }

    toast(msg, ms) {
        if (!this._toast) {
            this._toast = el('div', { class: 'olmk-toast' });
            this.root.appendChild(this._toast);
        }
        const t = this._toast;
        t.textContent = msg;
        t.style.opacity = '1';
        t.hidden = false;
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => { t.style.opacity = '0'; setTimeout(() => { t.hidden = true; }, 200); }, ms || 3000);
    }

    // Popup anchored to a map coordinate (map projection)
    popup(coordinate, html, opts) {
        this.closePopup();
        const box = el('div', { class: 'olmk-popup' });
        const close = el('button', { type: 'button', class: 'olmk-popup-close', 'aria-label': this.kit.t('close') }, '×');
        close.addEventListener('click', () => this.closePopup());
        box.appendChild(close);
        const body = el('div', { class: 'olmk-popup-body' }, html);
        box.appendChild(body);
        const overlay = new ol.Overlay({
            element: box,
            position: coordinate,
            positioning: 'bottom-center',
            stopEvent: true,
            autoPan: { animation: { duration: 250 }, margin: 60 }
        });
        this.kit.olMap.addOverlay(overlay);
        this._popup = overlay;
        this._popupOnClose = opts && opts.onClose;
        return { overlay, body, close: () => this.closePopup() };
    }

    closePopup() {
        if (!this._popup) return;
        this.kit.olMap.removeOverlay(this._popup);
        this._popup = null;
        const cb = this._popupOnClose;
        this._popupOnClose = null;
        if (cb) cb();
    }

    // HUD (top pill + message) and bottom bar (hint + buttons) for interactive tools
    toolbar(buttons) {
        const target = this.kit.el;
        const hud = el('div', { class: 'olmk-hud' }, '<div class="olmk-pill"></div><div class="olmk-msg"></div>');
        const bar = el('div', { class: 'olmk-bar' }, '<div class="olmk-hint"></div><div class="olmk-buttons"></div>');
        const wrap = bar.querySelector('.olmk-buttons');
        const btn = {};
        (buttons || []).forEach(b => {
            const e = el('button', { type: 'button', 'data-a': b.id, class: b.kind ? 'is-' + b.kind : '' });
            e.textContent = b.label;
            e.addEventListener('click', ev => { ev.preventDefault(); ev.stopPropagation(); b.onClick(); });
            wrap.appendChild(e);
            btn[b.id] = e;
        });
        this.kit.olMap.getOverlayContainerStopEvent().appendChild(bar);
        target.querySelector('.ol-viewport').appendChild(hud);
        return {
            hud, bar, btn,
            pill: hud.querySelector('.olmk-pill'),
            msg: hud.querySelector('.olmk-msg'),
            hint: bar.querySelector('.olmk-hint'),
            destroy() { hud.remove(); bar.remove(); }
        };
    }

    destroy() {
        if (this._ro) this._ro.disconnect();
        this.closePanel();
        this.closePopup();
        Object.keys(this.corners).forEach(k => this.corners[k].remove());
    }
}

// Triggers a browser download of text or a Blob
export function downloadFile(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}
