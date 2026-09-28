// Geometry operations on GeoJSON geometries in lon/lat (EPSG:4326), powered by JSTS.
// Planar operations run in Web Mercator; distances given in metres are corrected for latitude.
import { lonLatToMercator, mercatorToLonLat, mapCoords, haversine, bearing as bearingDeg } from '../core/proj.js';

const R = 6378137;

function J() {
    const j = typeof jsts !== 'undefined' ? jsts : (globalThis && globalThis.jsts);
    if (!j) throw new Error('[OLMapKit] JSTS must be loaded for geometry operations.');
    return j;
}

function asGeometry(g) {
    if (!g) return null;
    const o = typeof g === 'string' ? JSON.parse(g) : g;
    if (o.type === 'Feature') return o.geometry;
    if (o.type === 'FeatureCollection') {
        const geoms = o.features.map(f => f.geometry).filter(Boolean);
        return geoms.length === 1 ? geoms[0] : { type: 'GeometryCollection', geometries: geoms };
    }
    return o;
}

function toJsts(g) {
    const geom = mapCoords(asGeometry(g), lonLatToMercator);
    return new (J().io.GeoJSONReader)().read(geom);
}

function fromJsts(jg) {
    if (!jg || jg.isEmpty()) return null;
    const geom = new (J().io.GeoJSONWriter)().write(jg);
    return mapCoords(geom, c => mercatorToLonLat(c).map(v => Math.round(v * 1e8) / 1e8));
}

function clean(jg) {
    try {
        const reducer = new (J().precision.GeometryPrecisionReducer)(new (J().geom.PrecisionModel)(1000)); // 1 mm
        return reducer.reduce(jg).buffer(0);
    } catch (e) {
        return jg.buffer(0);
    }
}

function scaleAt(g) {
    // Mercator scale factor at the geometry's centre latitude
    const b = bbox(g);
    const lat = (b[1] + b[3]) / 2;
    return 1 / Math.cos(lat * Math.PI / 180);
}

/* ---------------- measurements ---------------- */

function ringArea(ring) {
    // Spherical excess formula (same as ol/sphere getArea)
    let area = 0;
    const len = ring.length;
    if (len < 3) return 0;
    let x1 = ring[len - 1][0];
    let y1 = ring[len - 1][1];
    for (let i = 0; i < len; i++) {
        const x2 = ring[i][0];
        const y2 = ring[i][1];
        area += (x2 - x1) * Math.PI / 180 * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
        x1 = x2;
        y1 = y2;
    }
    return Math.abs(area * R * R / 2);
}

export function area(g) {
    const geom = asGeometry(g);
    if (!geom) return 0;
    const poly = rings => rings.reduce((s, r, i) => s + (i === 0 ? ringArea(r) : -ringArea(r)), 0);
    switch (geom.type) {
        case 'Polygon': return poly(geom.coordinates);
        case 'MultiPolygon': return geom.coordinates.reduce((s, p) => s + poly(p), 0);
        case 'GeometryCollection': return geom.geometries.reduce((s, x) => s + area(x), 0);
        default: return 0;
    }
}

function lineLength(coords) {
    let s = 0;
    for (let i = 1; i < coords.length; i++) s += haversine(coords[i - 1], coords[i]);
    return s;
}

export function length(g) {
    const geom = asGeometry(g);
    if (!geom) return 0;
    switch (geom.type) {
        case 'LineString': return lineLength(geom.coordinates);
        case 'MultiLineString': return geom.coordinates.reduce((s, l) => s + lineLength(l), 0);
        case 'Polygon': return lineLength(geom.coordinates[0]);
        case 'MultiPolygon': return geom.coordinates.reduce((s, p) => s + lineLength(p[0]), 0);
        case 'GeometryCollection': return geom.geometries.reduce((s, x) => s + length(x), 0);
        default: return 0;
    }
}

export const perimeter = length;

export function distance(a, b) {
    return haversine(a, b);
}

export function bearing(a, b) {
    return bearingDeg(a, b);
}

export function bbox(g) {
    const geom = asGeometry(g);
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    mapCoords(geom, c => {
        if (c[0] < b[0]) b[0] = c[0];
        if (c[1] < b[1]) b[1] = c[1];
        if (c[0] > b[2]) b[2] = c[0];
        if (c[1] > b[3]) b[3] = c[1];
        return c;
    });
    return b;
}

export function centroid(g) {
    const c = toJsts(g).getCentroid().getCoordinate();
    return mercatorToLonLat([c.x, c.y]);
}

// A point guaranteed to lie inside the geometry (good for labels)
export function interiorPoint(g) {
    const c = toJsts(g).getInteriorPoint().getCoordinate();
    return mercatorToLonLat([c.x, c.y]);
}

/* ---------------- operations ---------------- */

export function buffer(g, metres, segments) {
    const k = scaleAt(g);
    return fromJsts(toJsts(g).buffer(metres * k, segments || 8));
}

export function union(a, b) {
    if (Array.isArray(a)) return a.reduce((acc, x) => (acc ? union(acc, x) : asGeometry(x)), null);
    return fromJsts(clean(clean(toJsts(a)).union(clean(toJsts(b)))));
}

export function intersection(a, b) {
    return fromJsts(clean(clean(toJsts(a)).intersection(clean(toJsts(b)))));
}

export function difference(a, b) {
    return fromJsts(clean(clean(toJsts(a)).difference(clean(toJsts(b)))));
}

export function intersects(a, b) {
    return toJsts(a).intersects(toJsts(b));
}

export function contains(a, b) {
    return toJsts(a).contains(toJsts(b));
}

export function simplify(g, toleranceMetres) {
    const k = scaleAt(g);
    return fromJsts(J().simplify.TopologyPreservingSimplifier.simplify(toJsts(g), (toleranceMetres || 1) * k));
}

export function convexHull(g) {
    return fromJsts(toJsts(g).convexHull());
}

// Validation with a reason and the location of the problem
export function validate(g) {
    const jg = toJsts(g);
    const op = new (J().operation.valid.IsValidOp)(jg);
    if (op.isValid()) return { valid: true, reason: null, location: null };
    const err = op.getValidationError();
    const c = err.getCoordinate();
    return {
        valid: false,
        reason: err.getMessage(),
        location: c ? mercatorToLonLat([c.x, c.y]) : null
    };
}

// Splits a polygon (or multipolygon) with a line. Returns an array of Polygon geometries.
export function split(polygon, line) {
    const j = J();
    const poly = clean(toJsts(polygon));
    const cutter = toJsts(line);
    if (!poly.intersects(cutter)) return [asGeometry(polygon)];

    const noded = poly.getBoundary().union(cutter);
    const polygonizer = new j.operation.polygonize.Polygonizer();
    polygonizer.add(noded);
    const pieces = polygonizer.getPolygons().toArray ? polygonizer.getPolygons().toArray() : Array.from(polygonizer.getPolygons());
    const out = [];
    pieces.forEach(p => {
        if (poly.contains(p.getInteriorPoint())) {
            // Keep holes of the original polygon
            const piece = clean(p.intersection(poly));
            for (let i = 0; i < piece.getNumGeometries(); i++) {
                const g = piece.getGeometryN(i);
                if (g.getGeometryType() === 'Polygon' && g.getArea() > 1e-6) out.push(fromJsts(g));
            }
        }
    });
    return out.length ? out : [asGeometry(polygon)];
}

export { asGeometry };
