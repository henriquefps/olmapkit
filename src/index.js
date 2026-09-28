// OLMapKit: a touch-first map component on top of OpenLayers.
// Global build: window.OLMapKit (dist/olmapkit.js). Requires `ol` (and `jsts` for drawing and geometry ops).
import { MapKit } from './core/kit.js';
import { BASEMAP_PRESETS } from './core/basemaps.js';
import { PALETTES, computeBreaks } from './core/style.js';
import * as geo from './geo/ops.js';

/* global __VERSION__ */
export const version = __VERSION__;

export function create(target, options) {
    return new MapKit(target, options);
}

export { MapKit, geo, BASEMAP_PRESETS as basemaps, PALETTES as palettes, computeBreaks };
