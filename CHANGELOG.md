# Changelog

## 0.1.0 (2026-09-28)

First release of OLMapKit, the modular successor of the touch polygon editor.

- Core: map creation, events, English and Portuguese UI, themes, tool coordination, GeoJSON helpers.
- Markers with custom icons, clustering, selection, focus and "show everything".
- Layers: WMS, WMTS, WFS, GeoJSON, KML, GPX, XYZ, vector tiles, images; layers panel; styles, filters and popups; swipe comparison.
- Drawing: the touch polygon editor (now with snapping, a loupe, GPS points and minimum area), lines, points and polygon splitting.
- `OLMapKit.geo` geometry operations.
- Measuring, GetFeatureInfo, address search and reverse geocoding, spatial selection.
- Import (GeoJSON, KML/KMZ, GPX, WKT, CSV, shapefile), export and print to PNG/PDF.
- Geolocation, track recording and offline base map tiles.
- Heatmaps, choropleths, proportional symbols, categories, time slider, route animation.
- COG rasters (true colour, NDVI, single band) and shaded relief.
- The original OutSystems `Init_Map` node moved, unchanged, to `legacy/`.
