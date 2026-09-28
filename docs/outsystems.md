# Using OLMapKit in OutSystems

OLMapKit is plain JavaScript with a JSON-in / events-out API, so it maps directly onto OutSystems blocks, client actions and events. This guide covers how to use it today in a Reactive or Mobile app, the plan for the Forge component, and how to migrate from the original `Init_Map` JavaScript node (kept in [`legacy/`](../legacy)).

## 1. Use it today

### Scripts

Add these as **Script** resources of a library module (download them, or use the jsDelivr URLs in a `RequireScript`). The order matters:

1. `ol.js` 10.6.0 and `ol.css`: <https://cdn.jsdelivr.net/npm/ol@10.6.0/dist/ol.js>, <https://cdn.jsdelivr.net/npm/ol@10.6.0/ol.css>
2. `jsts.min.js` 2.7.1 (drawing and geometry operations)
3. Optional: `proj4.js` (other projections, rasters), `geotiff.js` 2.1.3 (COG rasters), `shp.min.js` (zipped shapefiles), `jszip.min.js` (KMZ), `jspdf.umd.min.js` (PDF print)
4. `olmapkit.min.js` from [`dist/`](../dist) (or `https://cdn.jsdelivr.net/gh/henriquefps/openlayers-touch-polygon-editor@<tag>/dist/olmapkit.min.js`)

### A `Map` block

- **Widgets:** a Container with a fixed height (e.g. `height: 60vh`), `Name = MapContainer`.
- **Input parameters:** `OptionsJson` (Text), and whatever else you want to expose.
- **Events:** `OnEvent(EventName Text, PayloadJson Text)`, plus typed ones if you like (`OnMarkerClick(Id Text)`…).
- **OnReady** (JavaScript node, input `ContainerId = MapContainer.Id`, `OptionsJson`):

```js
var kit = OLMapKit.create($parameters.ContainerId, JSON.parse($parameters.OptionsJson || '{}'));
kit.on('*', function (type, payload) {
    $actions.OnEvent(type, JSON.stringify(payload));
});
window.OLMK = window.OLMK || {};
window.OLMK[$parameters.ContainerId] = kit;
```

- **OnDestroy** (JavaScript node):

```js
var kit = window.OLMK && window.OLMK[$parameters.ContainerId];
if (kit) { kit.destroy(); delete window.OLMK[$parameters.ContainerId]; }
```

- **OnParametersChanged:** call the matching client actions (e.g. set markers again) instead of recreating the map.

### Client actions

Each client action is a one-line JavaScript node. Pass the container id (or keep it in a block variable) and JSON.

```js
// Map_SetMarkers(MapId, MarkersJson)
window.OLMK[$parameters.MapId].markers.set(JSON.parse($parameters.MarkersJson));

// Map_ClearSelection(MapId) — close the detail panel and go back to all markers
window.OLMK[$parameters.MapId].markers.clearSelection({ fit: true });

// Map_AddLayer(MapId, LayerJson)
window.OLMK[$parameters.MapId].layers.add(JSON.parse($parameters.LayerJson));

// Map_StartPolygon(MapId, OptionsJson)
window.OLMK[$parameters.MapId].draw.polygon(JSON.parse($parameters.OptionsJson || '{}'));

// Map_GetDrawResult(MapId) -> ResultJson
$parameters.ResultJson = JSON.stringify(window.OLMK[$parameters.MapId].draw.getResult());
```

Build the JSON with `JSONSerialize` on OutSystems structures whose attribute names match the API (`id`, `lon`, `lat`, `title`, `icon`, `data`…). Marker structures with `MarkerId`, `Latitude` and `Longitude` are accepted as they are.

### Handling events

In the screen, handle `OnEvent` with a **Switch** on `EventName` and `JSONDeserialize` the payload into a structure:

| EventName | Payload (structure to create) |
|---|---|
| `markerclick` | `{ id, lon, lat, title, data }` |
| `featureclick` | `{ layerId, id, properties, lon, lat }` |
| `drawchange`, `drawend` | `{ status, valid, area, areaHa, perimeter, coordinates, geojson }` |
| `measure` | `{ type, value, formatted }` |
| `selection` | `{ layers, markers, count }` |
| `featureinfo` | `{ lon, lat, results }` |
| `position` | `{ lon, lat, accuracy, heading, speed }` |

The full list is in the [API reference](API.md).

### Typical flow: points of interest with a detail panel

1. `OnReady`: `Map_SetMarkers` with the records from an aggregate (icon URL per category).
2. `markerclick` → set `SelectedId`, fetch the details with a data action, open a sidebar or bottom sheet. The map has already zoomed in on the marker.
3. The sidebar's close button → `Map_ClearSelection`. The map zooms back out to show every marker.

## 2. Forge component (planned)

| Element | Contents |
|---|---|
| **Block `OLMap`** | Parameters: `Center`, `Zoom`, `Basemap`, `Locale`, `Controls` (structure), `Height`, `OptionsJson` (advanced). Events: `OnReady`, `OnMarkerClick`, `OnFeatureClick`, `OnDrawChange`, `OnDrawEnd`, `OnMeasure`, `OnSelection`, `OnPosition`, `OnEvent` (generic) |
| **Structures** | `Marker`, `LayerDefinition`, `StyleSpec`, `DrawOptions`, `DrawResult`, `Selection`, `Position` |
| **Client actions** | Markers: `SetMarkers`, `AddMarker`, `RemoveMarker`, `SelectMarker`, `ClearSelection`, `FitAll`, `SetMarkerFilter`. Layers: `AddLayer`, `RemoveLayer`, `SetLayerVisible`, `SetLayerOpacity`, `SetLayerData`, `SetLayerStyle`, `ZoomToLayer`, `OpenLayersPanel`. Drawing: `StartPolygon`, `StartLine`, `StartPoint`, `StartSplit`, `StopDrawing`, `GetDrawResult`. Tools: `StartMeasure`, `SelectByBox`, `Search`, `Print`, `ExportLayer`, `ImportText`. Mobile: `StartLocation`, `StartTrack`, `StopTrack`, `SaveOffline`. Viz: `Heatmap`, `Choropleth`, `TimeSlider`, `AnimateRoute`. Raster: `AddCog`, `AddHillshade`. View: `GoTo`, `Fit` |
| **Theme** | CSS variables (`--olmk-primary`…) mapped to the app theme |
| **Demo app** | The scenarios of [`demo/`](../demo) rebuilt as screens |

Each client action is a thin wrapper over one API call, so the component stays in step with the library. New library features can be used right away through `OptionsJson` and `OnEvent`.

## 3. Migrating from the legacy `Init_Map` node

The original block ([`legacy/init_map.js`](../legacy/init_map.js)) keeps working. To move a screen to OLMapKit:

| Legacy input / event | OLMapKit |
|---|---|
| `CenterLongitude`, `CenterLatitude`, `Zoom` | `center: [lon, lat]`, `zoom` |
| `ArcGIS_Url`, `ArcGIS_Attributions` | `basemaps: [{ id: 'custom', url, attributions }]`, `basemap: 'custom'` |
| `WMSUrl`, `Layer`, `Authorization` | `layers.add({ type: 'wms', url, layers, headers: { Authorization } })` |
| `MultiPolygons` (`{ polygons \| parcelas: [...] }`) | `layers.add({ type: 'geojson', data })`. Convert `Coordinates [{Lon, Lat}]` into a GeoJSON Polygon; `BorderColor`/`BackgroundColor` → `style` |
| `CanDrawInsideIt = true` / `false` | `draw.polygon({ within: 'allowedLayer', exclude: 'blockedLayer' })` |
| `EditablePolygonId` | `draw.polygon({ initial: thatPolygon })` |
| `Markers` | `markers.set(...)` (`MarkerId`, `Latitude`, `Longitude` accepted) |
| `EnableClickMarker` + `OnClickSetMarker` | `on('click', e => …)` + `markers.add` |
| `EnableGoToDetails` + `OnClickGoToDetail` | `on('markerclick')` / `on('featureclick')` |
| `OnDrawCoordinates(Json, AreaHa)` | `on('drawchange', r => …)`, see below |
| `window.clearDrawPolygon()` | `draw.clear()` |
| `ZoomMapOverlayMessage` | `ctrlScrollZoom: true`, `labels: { ctrlScroll: '…' }` |

Keeping the legacy `OnDrawCoordinates` contract:

```js
kit.on('drawchange', function (r) {
    var json = r.valid ? JSON.stringify(r.coordinates.map(function (c, i) {
        return { Order: i + 1, Longitude: c[0], Latitude: c[1] };
    })) : '';
    $actions.OnDrawCoordinates(json, r.valid ? r.areaHa : -1);
});
```

## 4. Notes for production

- **Content Security Policy:** allow the tile, WMS and geocoding hosts you use (`img-src`, `connect-src`), and jsDelivr if you load scripts from it.
- **Base map terms:** the Esri presets are fine for moderate use; check the terms for heavy commercial traffic. `tile.openstreetmap.org` is for light use only, and bulk offline download is blocked. For production at scale, use a provider with a plan (MapTiler, Stadia…) or host your own tiles (e.g. PMTiles).
- **Nominatim** allows about 1 request per second and no autocomplete. Pass `search.provider` for your own geocoder in production.
- **Mobile apps:** geolocation needs the location permission (plugin) in the native build. The offline cache uses IndexedDB, which works in the app WebView.
- **Inside scrolling screens:** use `ctrlScrollZoom: true` on desktop so the page scroll is not captured by the map.
