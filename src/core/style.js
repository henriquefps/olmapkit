// Declarative style spec -> OpenLayers style function.
//
// Base spec: { stroke, width, fill, lineDash, radius, pointFill, icon: {src, scale, anchor},
//              label: 'prop' | '{template}', labelColor, labelHalo, font, minZoomLabel }
// Thematic:  { type: 'categories', property, values: { value: color }, default }
//            { type: 'ranges', property, breaks: [b1, b2, ...], colors: [c0, c1, ...] }
//            { type: 'proportional', property, min, max, minRadius, maxRadius, color }
// A color given by the theme is used for the fill (with `fillOpacity`) and the stroke.

export const DEFAULT_STYLE = {
    stroke: '#1e88e5',
    width: 2,
    fill: 'rgba(30,136,229,0.18)',
    radius: 6,
    pointFill: '#1e88e5',
    labelColor: '#1d2330',
    labelHalo: '#ffffff',
    font: '600 12px system-ui, sans-serif'
};

export function withAlpha(color, alpha) {
    const c = ol.color.asArray(color).slice();
    c[3] = alpha;
    return 'rgba(' + c.join(',') + ')';
}

export function formatTemplate(tpl, props) {
    if (!tpl) return '';
    if (tpl.indexOf('{') < 0) return props[tpl] != null ? String(props[tpl]) : '';
    return tpl.replace(/\{([^}]+)\}/g, (m, k) => (props[k] != null ? String(props[k]) : ''));
}

function themeColor(spec, props) {
    if (!spec.type || !spec.property) return null;
    const v = props[spec.property];
    if (spec.type === 'categories') {
        const values = spec.values || {};
        return values[v] != null ? values[v] : (spec.default || null);
    }
    if (spec.type === 'ranges') {
        const n = Number(v);
        if (!isFinite(n)) return spec.default || null;
        const breaks = spec.breaks || [];
        let i = 0;
        while (i < breaks.length && n >= breaks[i]) i++;
        const colors = spec.colors || [];
        return colors[Math.min(i, colors.length - 1)] || spec.default || null;
    }
    return null;
}

function proportionalRadius(spec, props) {
    const v = Number(props[spec.property]);
    if (!isFinite(v)) return spec.minRadius || 4;
    const min = spec.min != null ? spec.min : 0;
    const max = spec.max != null ? spec.max : 1;
    const t = max > min ? Math.max(0, Math.min(1, (v - min) / (max - min))) : 0;
    const r0 = spec.minRadius || 4;
    const r1 = spec.maxRadius || 30;
    // Area-proportional: radius grows with the square root of the value
    return r0 + (r1 - r0) * Math.sqrt(t);
}

export function makeStyleFunction(input, options) {
    const spec = Object.assign({}, DEFAULT_STYLE, input || {});
    const opts = options || {};
    const cache = {};

    return function (feature, resolution) {
        if (opts.filter && !opts.filter(feature)) return null;
        const props = feature.getProperties();
        const color = themeColor(spec, props);
        const fillOpacity = spec.fillOpacity != null ? spec.fillOpacity : 0.45;
        const stroke = color ? (spec.themeStroke || color) : spec.stroke;
        const fill = color ? withAlpha(color, fillOpacity) : spec.fill;
        const pointFill = color || spec.pointFill;
        const radius = spec.type === 'proportional' ? proportionalRadius(spec, props) : spec.radius;
        const label = spec.label && (!spec.minZoomLabel || opts.zoomForResolution && opts.zoomForResolution(resolution) >= spec.minZoomLabel)
            ? formatTemplate(spec.label, props) : '';

        const key = [stroke, fill, pointFill, Math.round(radius * 10), label].join('|');
        if (cache[key]) return cache[key];

        const strokeStyle = new ol.style.Stroke({ color: stroke, width: spec.width, lineDash: spec.lineDash });
        let image;
        if (spec.icon && spec.icon.src) {
            image = new ol.style.Icon({
                src: spec.icon.src,
                scale: spec.icon.scale || 1,
                anchor: spec.icon.anchor || [0.5, 1],
                crossOrigin: 'anonymous'
            });
        } else {
            image = new ol.style.Circle({
                radius: radius,
                fill: new ol.style.Fill({ color: spec.type === 'proportional' ? withAlpha(spec.color || pointFill, 0.6) : pointFill }),
                stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.5 })
            });
        }
        const style = new ol.style.Style({
            stroke: strokeStyle,
            fill: new ol.style.Fill({ color: fill }),
            image: image,
            text: label ? new ol.style.Text({
                text: label,
                font: spec.font,
                fill: new ol.style.Fill({ color: spec.labelColor }),
                stroke: new ol.style.Stroke({ color: spec.labelHalo, width: 3 }),
                overflow: true,
                offsetY: spec.icon ? -28 : 0
            }) : undefined,
            zIndex: spec.zIndex
        });
        const keys = Object.keys(cache);
        if (keys.length > 500) delete cache[keys[0]];
        cache[key] = style;
        return style;
    };
}

// Legend entries for a thematic spec: [{ label, color }]
export function legendEntries(spec) {
    if (!spec || !spec.type) return [];
    if (spec.type === 'categories') {
        return Object.keys(spec.values || {}).map(k => ({ label: k, color: spec.values[k] }));
    }
    if (spec.type === 'ranges') {
        const b = spec.breaks || [];
        const fmt = v => (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100);
        return (spec.colors || []).map((c, i) => ({
            color: c,
            label: i === 0 ? '< ' + fmt(b[0]) : (i >= b.length ? '≥ ' + fmt(b[b.length - 1]) : fmt(b[i - 1]) + ' – ' + fmt(b[i]))
        }));
    }
    return [];
}

// Simple filters: { property, op: '=', '!=', '>', '>=', '<', '<=', 'in', 'contains', 'between', value } or an array (AND)
export function compileFilter(filter) {
    if (!filter) return null;
    if (typeof filter === 'function') return filter;
    const list = Array.isArray(filter) ? filter : [filter];
    const tests = list.map(f => {
        const op = f.op || '=';
        const val = f.value;
        return feature => {
            const v = feature.get(f.property);
            switch (op) {
                case '=': case '==': return v == val; // eslint-disable-line eqeqeq
                case '!=': return v != val; // eslint-disable-line eqeqeq
                case '>': return Number(v) > Number(val);
                case '>=': return Number(v) >= Number(val);
                case '<': return Number(v) < Number(val);
                case '<=': return Number(v) <= Number(val);
                case 'in': return Array.isArray(val) && val.indexOf(v) >= 0;
                case 'contains': return String(v == null ? '' : v).toLowerCase().indexOf(String(val).toLowerCase()) >= 0;
                case 'between': return Number(v) >= Number(val[0]) && Number(v) <= Number(val[1]);
                default: return true;
            }
        };
    });
    return feature => tests.every(t => t(feature));
}

// Class breaks for choropleths
export function computeBreaks(values, classes, method) {
    const nums = values.map(Number).filter(v => isFinite(v)).sort((a, b) => a - b);
    const n = Math.max(2, classes || 5);
    if (!nums.length) return [];
    const breaks = [];
    if (method === 'equal') {
        const min = nums[0];
        const max = nums[nums.length - 1];
        for (let i = 1; i < n; i++) breaks.push(min + (max - min) * i / n);
    } else {
        for (let i = 1; i < n; i++) breaks.push(nums[Math.min(nums.length - 1, Math.floor(nums.length * i / n))]);
    }
    return breaks.filter((b, i) => i === 0 || b !== breaks[i - 1]);
}

export const PALETTES = {
    greens: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    blues: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
    reds: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    viridis: ['#440154', '#3b528b', '#21918c', '#5ec962', '#fde725'],
    spectral: ['#d7191c', '#fdae61', '#ffffbf', '#a6d96a', '#1a9641'],
    categorical: ['#1e88e5', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#6d4c41', '#fdd835']
};

export function paletteFor(name, count) {
    const p = PALETTES[name] || PALETTES.blues;
    if (count === p.length) return p.slice();
    const out = [];
    for (let i = 0; i < count; i++) out.push(p[Math.round(i * (p.length - 1) / Math.max(1, count - 1))]);
    return out;
}
