# OLMapKit API reference

All coordinates in the API are **`[lon, lat]`** (EPSG:4326), and all geometries are **GeoJSON** in lon/lat. Every module reports through events, so a host app (an OutSystems block, a React component, plain JS) only has to listen.

```js
const map = OLMapKit.create('map', { center: [-9.14, 38.71], zoom: 13 });
map.on('markerclick', e => console.log(e.id, e.data));
map.on('*', (type, payload) => console.log(type, payload)); // every event
```

- [Create and options](#create-and-options)
- [Core methods and events](#core-methods-and-events)
- [basemaps](#basemaps) · [markers](#markers) · [layers](#layers) · [compare](#compare)
- [draw](#draw) · [measure](#measure) · [query](#query) · [search](#search) · [select](#select)
- [io](#io) · [geolocation](#geolocation) · [offline](#offline) · [viz](#viz) · [raster](#raster)
- [OLMapKit.geo](#olmapkitgeo) · [Style spec](#style-spec) · [Filter spec](#filter-spec) · [Labels](#labels)

## Create and options

`OLMapKit.create(target, options)` returns a map kit. `target` is an element or its id.

| Option | Default | Description |
|---|---|---|
| `center`, `zoom`, `minZoom`, `maxZoom` | `[0, 20]`, `2`, `0`, `21` | Initial view |
| `basemap` | first of `basemaps` | Id of the base map to show |
| `basemaps` | `['streets', 'imagery', 'topo', 'light', 'dark', 'osm']` | Preset ids or custom definitions (see [basemaps](#basemaps)) |
| `locale` | `'en'` | `'en'` or `'pt'` (`pt-PT`, `pt-BR`): UI texts and number format |
| `labels` | — | Overrides for any UI text (see [Labels](#labels)) |
| `units` | `'metric'` | `'metric'` or `'imperial'` |
| `controls` | see below | Built-in buttons |
| `ctrlScrollZoom` | `false` | Wheel zoom only with Ctrl/⌘ (shows a hint), for maps embedded in scrolling pages |
| `doubleClickZoom` | `true` | Double-click zoom when no tool is active |
| `projection`, `proj4Defs` | `'EPSG:3857'` | View projection; `proj4Defs: { 'EPSG:3763': '+proj=…' }` registers extra ones (needs proj4) |
| `theme` | — | CSS variables without the prefix, e.g. `{ primary: '#0057b8' }` → `--olmk-primary` |
| `markers`, `draw`, `featureInfo`, `search`, `geolocation`, `offline` | — | Module options (see each module) |
| `markersData`, `layersData` | — | Initial markers and layer definitions |
| `onEvent` | — | `(type, payload) => {}` for every event (handy for OutSystems) |

`controls` (all booleans): `zoom` ✓, `fullscreen` ✓, `scale` ✓, `attribution` ✓, `layers` ✓, `fitAll`, `search`, `measure`, `locate`, `print`, `import`, `select`, `offline`.

## Core methods and events

| Method | Description |
|---|---|
| `on(type, fn)`, `once(type, fn)`, `off(type, fn)` | Events. `on` returns an unsubscribe function. `'*'` receives `(type, payload)` |
| `getView()` | `{ center, zoom, rotation, bbox }` |
| `goTo({ center, zoom, rotation, duration })` | Animated move |
| `fit(target, { padding, maxZoom, duration })` | `target`: `[minLon, minLat, maxLon, maxLat]` or any GeoJSON |
| `fitAll(opts)` | Fits markers and visible layers |
| `toMap(lonLat)`, `toLonLat(coord)` | Convert to/from the map projection |
| `readFeatures(geojson)`, `writeFeatures(features)`, `readGeometry(g)`, `writeGeometry(geom)` | GeoJSON ↔ OpenLayers |
| `activeTool`, `stopTool()` | The running interactive tool (`draw`, `measure`, `select`) |
| `ui.toast(msg, ms)`, `ui.popup(coord, html)`, `ui.panel({ title })` | Small UI helpers |
| `format.length(m)`, `format.area(m2)` | Locale-aware formatting |
| `olMap` | The underlying `ol.Map`, for anything not covered here |
| `destroy()` | Removes the map, listeners and UI |

Events: `ready` (view), `moveend` (view), `click` `{ lon, lat }`, `toolchange` `{ tool }`, `destroy`.

## basemaps

Presets: `streets`, `imagery`, `topo`, `light`, `dark` (Esri, no key), `osm` (OpenStreetMap), `terrain` (OpenTopoMap), `none`.

| Method | Description |
|---|---|
| `basemaps.set(id)` | Switches the base map |
| `basemaps.get()`, `basemaps.list()` | Current definition / `[{ id, title, active }]` |
| `basemaps.add({ id, title, type, url, attributions, maxZoom, headers, offline })` | `type`: `'xyz'` (default), `'wms'` (`url`, `params`) |

Events: `basemapchange` `{ id, title }`, `basemapschange`.

## markers

Marker object: `{ id, lon, lat, title, description, icon, iconScale, iconAnchor, color, label, data }`. `Latitude`/`Longitude`/`MarkerId` are accepted too. Without `icon`, a pin in `color` is drawn. Properties of `data` can be used by filters.

Options (`markers: {}`): `cluster` (true), `clusterDistance` (40), `focusZoom` (17), `autoFocus` (true: zoom in on click), `selectedScale` (1.35), `color`, `tooltip` (true), `popup` (false).

| Method | Description |
|---|---|
| `set(list)` | Replaces all markers (array or JSON string) |
| `add(marker)`, `update(id, patch)`, `remove(id)`, `clear()` | Edit markers |
| `get(id)`, `list()` | Read markers |
| `select(id, { focus })`, `clearSelection({ fit })` | Highlight; `fit: true` goes back to all markers |
| `focus(id, { zoom, duration })`, `fitAll(opts)` | Move the view |
| `setFilter(filter)`, `setVisible(bool)`, `setClustering(bool)` | Display |

Events: `markerclick` `{ id, lon, lat, title, data }`, `clusterclick` `{ ids, count }`, `markerselect`, `markerdeselect`, `markerschange`.

## layers

Definition fields for every type: `id`, `title`, `type`, `visible`, `opacity`, `zIndex`, `minZoom`, `maxZoom`, `attributions`, `headers` (sent with every request), `legend`, `listed` (false hides it from the panel), `clickable`, `popup`, `fitOnLoad`.

| `type` | Fields |
|---|---|
| `wms` | `url`, `layers`, `params`, `tiled` (true), `serverType`, `queryable` (true), `infoFormat`, `legend: true` (GetLegendGraphic) |
| `wmts` | `url` (capabilities), `layer`, `matrixSet`, `format` |
| `wfs` | `url`, `typeName`, `params`, `outputFormat` (loads by bounding box) |
| `geojson`, `kml`, `gpx` | `url` or `data`; `style`; `extractStyles` (KML) |
| `vector` | Empty layer to add features to |
| `xyz` | `url` with `{z}/{x}/{y}` |
| `vectortile` | `url` (MVT), `style` |
| `image` | `url`, `bbox` `[minLon, minLat, maxLon, maxLat]` |

`popup`: `true` (all properties), `'{name} – {kind}'` (template), or `{ title: '{name}', fields: ['a', 'b'] }`.

| Method | Description |
|---|---|
| `add(def)` → id, `remove(id)`, `has(id)`, `get(id)` (ol layer), `getDef(id)`, `list()` | Manage |
| `setVisible(id, v)`, `setOpacity(id, 0..1)`, `setZIndex(id, z)`, `move(id, 'up' \| 'down')` | State |
| `setStyle(id, spec)`, `setFilter(id, filter)` | [Style](#style-spec) / [filter](#filter-spec) |
| `getFeatures(id)` → FeatureCollection, `addFeatures(id, geojson, def?)`, `setData(id, geojson)`, `clearFeatures(id)`, `refresh(id)` | Data |
| `zoomTo(id)`, `getExtent(id)` | View |
| `openPanel()`, `closePanel()`, `togglePanel()` | Layers panel (base maps, visibility, opacity, order, legend) |

Events: `layeradd`, `layerremove`, `layerchange`, `layerload` `{ id, count }`, `layererror` `{ id, message }`, `featureclick` `{ layerId, id, properties, lon, lat }`.

## compare

`compare.swipe({ layer: 'id' })` or `compare.swipe({ basemap: 'imagery', position: 0.5 })` shows the layer only to the right of a draggable divider. `compare.setPosition(0..1)`, `compare.stop()`. Works with WebGL layers (rasters). Events: `comparestart`, `compareswipe` `{ position }`, `comparestop`.

## draw

One tool at a time; starting measure or select stops it.

### `draw.polygon(options)`: touch-first polygon editor

One finger places and drags points while the map stays still; two fingers pan and zoom. Vertices and the "+" on each edge are draggable at any time. On touch screens a loupe shows what is under the finger.

| Option | Description |
|---|---|
| `within` | Where drawing is allowed: GeoJSON, a layer id, a ring `[[lon, lat], …]` or an array of those. The result is clipped to it |
| `exclude` | Areas subtracted from the result (same forms) |
| `initial` | Polygon to edit (GeoJSON or ring). Opens in editing mode |
| `snap` | `true` (every vector layer) or `['layerId', …]`: snaps to vertices and edges |
| `minArea` | m²; smaller results get status `toosmall` |
| `gps` | Shows a "point here" button that adds the device position |
| `loupe`, `toolbar` | `true` by default |

Desktop: click adds, drag an empty area pans, double-click or `Enter` finishes, `Backspace` undoes, `Esc` clears.

### `draw.line(opts)`, `draw.point(opts)`, `draw.split({ layer })`

`line`/`point`: `snap`, `multiple`, `initial`. `split` cuts every polygon of `layer` crossed by the drawn line (the pieces keep the properties and get ids `<id>-1`, `<id>-2`, …).

| Method | Description |
|---|---|
| `getResult()` | Current result (below) |
| `stop({ targetLayer })` | Stops; with `targetLayer` a valid result is added to that layer |
| `finish()`, `undo()`, `clear()` | Toolbar actions |
| `addVertex([lon, lat])` | Adds a point (e.g. from an external GPS) |
| `setCoordinates(ring)` | Polygon: replaces the ring |

Polygon result (`drawchange`, `drawend`): `{ tool, status, valid, area (m²), areaHa (−1 when invalid), perimeter, coordinates: [[lon, lat]…] (closed ring), geojson (Feature, may contain holes), drawn (raw points), mode }`. `status`: `ok`, `incomplete`, `selfintersect`, `multi` (the drawing produces separate areas), `empty` (outside the allowed area), `nobase`, `toosmall`.

`drawchange` fires on every change from the 3rd point on (never while dragging), and only when the result changes. Line/point result: `{ tool, valid, count, length, coordinates, geojson }`.

Events: `drawstart`, `drawchange`, `drawend`, `drawstop` `{ tool, result }`, `drawgpspoint`, `split` `{ layerId, results: [{ sourceId, parts }] }`.

## measure

`measure.start('distance' | 'area' | 'azimuth')`, `measure.clear()`, `measure.stop()`. Results stay on the map until cleared. Event `measure` `{ type, value, formatted, perimeter?, distance?, geojson }`.

## query

GetFeatureInfo on visible, queryable WMS layers. Options (`featureInfo: {}`): `enabled`, `popup` (true), `featureCount` (10), `infoFormat` (`application/json`).

`query.enable(bool)`, `query.identify([lon, lat], { popup })` → Promise. Event `featureinfo` `{ lon, lat, results: [{ layerId, title, features: [{ id, properties }] }] }`.

## search

Options (`search: {}`): `provider` (`'nominatim'` default, `'photon'`, or `(query, { lang, limit }) => Promise<[{ label, lon, lat, bbox? }]>`), `limit`, `zoom`, `countryCodes` (`'pt,es'`), `autocomplete` (off for Nominatim, whose policy forbids it), `marker`, `email`.

`search.geocode(text)` → results, `search.select(result)`, `search.reverse([lon, lat])` → `{ label, address }`, `search.clear()`. Event `searchselect`.

## select

`select.byBox({ layers })`, `select.byPolygon({ layers })`, `select.byGeometry(geojson, { layers, markers })`, `select.getSelection()`, `select.clear()`, `select.stop()`. Without `layers`, every visible vector layer; markers are included unless `markers: false`. Event `selection` `{ layers: { layerId: [ids] }, markers: [ids], count, geojson }`.

## io

| Method | Description |
|---|---|
| `importFile(file, { layerId, title, style, popup, fit })` | GeoJSON, KML, KMZ (JSZip), GPX, WKT, CSV (lat/lon columns, `,` or `;`), zipped shapefile (shpjs) |
| `importText(text, name, opts)` | Same, from a string (the extension of `name` picks the format) |
| `enableDragDrop(bool)` | Drop files on the map (on by default with `controls.import`) |
| `export(source, format)` → string | `source`: layer id, `'draw'`, `'selection'`, `'markers'` or GeoJSON. `format`: `geojson`, `kml`, `gpx`, `wkt`, `csv` |
| `download(source, format, filename)` | Same, as a file |
| `print({ title, format: 'png' \| 'pdf', legend, scale, north, download, filename })` → Promise<Blob> | Title, date, north arrow, scale bar, legend and attributions. PDF needs jsPDF |
| `snapshot(scale)` → Promise<canvas> | Map image only |

Layers must allow CORS to be printed. Events: `import` `{ layerId, name, count }`, `importerror`, `export`, `print`, `printerror`.

## geolocation

Options (`geolocation: {}`): `highAccuracy` (true), `zoom` (17), `trackMinDistance` (3 m), `trackMaxAccuracy` (50 m).

| Method | Description |
|---|---|
| `start({ follow })`, `stop()` | Blue dot, accuracy circle and heading. Panning by hand stops following |
| `getCurrentPosition(maxAgeMs)` → Promise | One position |
| `startTrack()`, `stopTrack()` → `{ points, length, geojson }`, `clearTrack()` | Track recording (filters by accuracy and distance) |
| `addTrackPoint([lon, lat], accuracy)` | Feeds a track from another source |

Events: `position` `{ lon, lat, accuracy, heading, speed, altitude, time }`, `geolocationstart`, `geolocationstop`, `geolocationerror`, `followchange`, `trackstart`, `trackupdate`, `trackend`.

## offline

Tiles are stored in IndexedDB and served from there once cached. Options (`offline: {}`): `enabled`, `dbName`, `maxTiles` (3000), `concurrency` (6).

`offline.enable(bool)`, `offline.prefetch({ bbox, minZoom, maxZoom })` (current view and zoom ±2 by default), `offline.countTiles(opts)`, `offline.stats()` → `{ count }`, `offline.clear()`. Base maps whose terms forbid bulk download (`osm`, `terrain`, any definition with `offline: false`) are refused. Events: `offlineprogress` `{ done, total }`, `offlinedone`, `offlineerror` `{ reason }`, `offlinetoggle`, `offlinecleared`.

## viz

| Method | Description |
|---|---|
| `heatmap({ id, data \| layer, weight, radius, blur, intensity, gradient })` → id | `data`: GeoJSON, `[{ lon, lat, weight }]` or `[[lon, lat, weight]]` |
| `proportional(layerId, { property, min, max, minRadius, maxRadius, color })` | Circle area proportional to the value |
| `choropleth(layerId, { property, classes, method: 'quantile' \| 'equal', palette, breaks, colors })` → `{ spec, legend }` | Palettes: `greens`, `blues`, `reds`, `viridis`, `spectral` |
| `categories(layerId, { property, palette, values })` → `{ spec, legend }` | One colour per value |
| `timeSlider({ layers, markers, property, start, end, step, window, speed, loop, format })` → controller | Shows features up to the current time (or within `window` ms). Controller: `play()`, `pause()`, `set(time)` |
| `stopTime()` | Removes the slider and its filters |
| `animateRoute({ coordinates \| geojson \| layer, duration, loop, follow, color, icon, autoplay, fit })` → controller | `play()`, `pause()`, `seek(0..1)`, `stop()`, `length` |

Events: `timechange` `{ time, iso }`, `routeprogress` `{ progress, lon, lat, distance, length }`, `routeend`.

## raster

Needs `geotiff.js` (global `GeoTIFF`) and, for rasters that are not in Web Mercator, `proj4`. UTM zones are defined automatically; other codes are looked up on epsg.io.

| Method | Description |
|---|---|
| `cog({ id, title, url \| sources, mode, min, max, colors, band, nodata, style, fit, fitZoom })` → Promise<id> | Cloud-optimised GeoTIFF. `mode`: `'rgb'`, `'ndvi'` (`sources: [red, nir]`, e.g. Sentinel-2 B04 and B08), `'single'` (colour ramp between `min` and `max`) |
| `hillshade({ id, url, exaggeration, sunElevation, sunAzimuth, opacity })` → id | Shaded relief from Terrarium elevation tiles |
| `setVariables(id, { sunAz, sunEl, vert })` | Updates style variables live |

Event `rasterload` `{ id, projection }`.

## OLMapKit.geo

Geometry operations on GeoJSON in lon/lat. They need JSTS, except `area`, `length`, `distance`, `bearing` and `bbox`. Distances are in metres.

`area(g)` m² · `length(g)` / `perimeter(g)` m · `distance(a, b)` · `bearing(a, b)` degrees · `bbox(g)` · `centroid(g)` · `interiorPoint(g)` · `buffer(g, metres)` · `union(a, b)` (or `union([…])`) · `intersection(a, b)` · `difference(a, b)` · `intersects(a, b)` · `contains(a, b)` · `simplify(g, metres)` · `convexHull(g)` · `validate(g)` → `{ valid, reason, location }` · `split(polygon, line)` → `[Polygon]`.

## Style spec

```js
{ stroke: '#1e88e5', width: 2, fill: 'rgba(30,136,229,0.18)', lineDash: [4, 4],
  radius: 6, pointFill: '#1e88e5', icon: { src, scale, anchor },
  label: 'name' /* or '{name} ({kind})' */, labelColor, labelHalo, font, minZoomLabel }
```

Thematic styles add `type`:

- `{ type: 'categories', property, values: { a: '#f00', b: '#0f0' }, default }`
- `{ type: 'ranges', property, breaks: [10, 50], colors: ['#fee', '#f88', '#f00'] }`
- `{ type: 'proportional', property, min, max, minRadius, maxRadius, color }`

`fillOpacity` (0.45) and `themeStroke` tune how the theme colour is applied. Thematic styles produce a legend in the layers panel and in prints.

## Filter spec

`{ property, op, value }` or an array of them (AND). `op`: `=` (default), `!=`, `>`, `>=`, `<`, `<=`, `in` (array), `contains` (text), `between` (`[min, max]`). A function `feature => boolean` also works.

## Labels

The UI is in English and Portuguese. Override any text with `labels`, e.g. `{ finish: 'Done', usefulArea: 'Crop area' }`. The keys are in [`src/core/i18n.js`](../src/core/i18n.js).
