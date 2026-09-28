// Coordinate helpers that do not depend on OpenLayers (used by geo ops and tests).
export const EARTH_RADIUS = 6378137;
const MAX_LAT = 85.05112878;

export function lonLatToMercator(c) {
    const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, c[1]));
    return [
        EARTH_RADIUS * c[0] * Math.PI / 180,
        EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
    ];
}

export function mercatorToLonLat(c) {
    return [
        c[0] / EARTH_RADIUS * 180 / Math.PI,
        (2 * Math.atan(Math.exp(c[1] / EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI
    ];
}

// Maps every coordinate of a GeoJSON geometry
export function mapCoords(geometry, fn) {
    const walk = c => (typeof c[0] === 'number' ? fn(c) : c.map(walk));
    if (geometry.type === 'GeometryCollection') {
        return { type: geometry.type, geometries: geometry.geometries.map(g => mapCoords(g, fn)) };
    }
    return { type: geometry.type, coordinates: walk(geometry.coordinates) };
}

// Geodesic distance in metres (haversine)
export function haversine(a, b) {
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371008.8 * Math.asin(Math.sqrt(h));
}

// Initial bearing from a to b, degrees clockwise from north (0-360)
export function bearing(a, b) {
    const toRad = d => d * Math.PI / 180;
    const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]));
    const x = Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
        Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
