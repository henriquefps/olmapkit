/* OLMapKit showcase. Every button calls the public API; the event log shows what a host app
   (for example an OutSystems screen) would receive. */
(function () {
    'use strict';

    const D = window.DEMO_DATA;
    const qs = new URLSearchParams(location.search);
    let lang = qs.get('lang') || ((navigator.language || 'en').slice(0, 2) === 'pt' ? 'pt' : 'en');
    let kit = null;
    let current = null;
    let logCount = 0;

    const STR = {
        en: {
            tagline: 'Touch-first maps for OpenLayers. OutSystems-ready.',
            events: 'Events', clearLog: 'Clear',
            credits: 'Created by <b>Henrique Silva</b>, Solutions Specialist at <b>Axians Low Code</b>. Built on <a href="https://openlayers.org" target="_blank" rel="noopener">OpenLayers</a> and <a href="https://github.com/bjornharrtell/jsts" target="_blank" rel="noopener">JSTS</a>. Sample data is fictitious.',
            markers: 'Markers', layers: 'Layers', draw: 'Draw & edit', measure: 'Measure', search: 'Search & query', io: 'Import / export', mobile: 'Mobile', viz: 'Data viz', raster: 'Satellite',
            markersLead: 'Custom icons from your data. Tap a marker: the map zooms in and the app receives an event to load details. Close the card to go back to all points.',
            category: 'Category', all: 'All', cafe: 'Cafés', shop: 'Shops', museum: 'Museums', food: 'Restaurants',
            showAll: 'Show all points', clusterOn: 'Clustering', address: 'Address', rating: 'Rating', hours: 'Hours', closeCard: 'Close', zoomHere: 'Zoom here',
            tapMarker: 'Tap a marker to see its details.',
            layersLead: 'Mix WMS, WMTS, WFS and GeoJSON from any server. Open the layers panel to toggle, reorder, change opacity and see legends.',
            openPanel: 'Open layers panel', whatHere: '“What is here?” (GetFeatureInfo)', swipe: 'Compare with satellite', stopSwipe: 'Stop comparing',
            addWfs: 'Add WFS layer', layersNote: 'Sample services: GeoSolutions demo GeoServer (WMS/WFS) and Esri (WMTS).',
            drawLead: 'The polygon editor clips the drawing to the allowed area and subtracts blocked zones, live. One finger places points; two fingers move the map.',
            drawInside: 'Polygon inside the area', drawEdit: 'Edit existing polygon', drawFree: 'Free polygon (snapping)', drawLine: 'Line', drawPoint: 'Point', split: 'Split a field with a line', stopDraw: 'Stop', save: 'Save to layer', buffer: 'Buffer 20 m around saved',
            result: 'Result', status: 'Status', usefulArea: 'Useful area', perimeter: 'Perimeter', vertices: 'Vertices', length: 'Length',
            measureLead: 'Distance, area with perimeter, and bearing. Results stay on the map until you clear them.',
            distance: 'Distance', area: 'Area', azimuth: 'Bearing', clear: 'Clear', stop: 'Stop',
            searchLead: 'Search addresses with OpenStreetMap Nominatim (or your own geocoder), reverse-geocode a tap, and select features by area.',
            searchBelem: 'Search “Torre de Belém”', reverseOn: 'Tap map → address', selectBox: 'Select by rectangle', selectPoly: 'Select by polygon', selected: 'Selected',
            ioLead: 'Drop GeoJSON, KML/KMZ, GPX, WKT, CSV or a zipped shapefile on the map, or load a sample. Export any layer, and print the map to PNG or PDF.',
            loadKml: 'Load sample KML', loadGpx: 'Load sample GPX', loadCsv: 'Load sample CSV', exportGeojson: 'Export markers (GeoJSON)', exportKml: 'Export imported (KML)', exportCsv: 'Export markers (CSV)', printPng: 'Print PNG', printPdf: 'Print PDF',
            mobileLead: 'Blue dot with accuracy and heading, follow mode, GPS track recording, drawing with GPS points and offline base map tiles.',
            locate: 'Locate me', stopLocate: 'Stop locating', track: 'Record track', stopTrack: 'Stop track', simulate: 'Simulate a walk', drawGps: 'Draw with GPS points', saveOffline: 'Save this area offline', offlineStats: 'Cached tiles', clearCache: 'Clear cache', offlineOn: 'Use offline cache',
            vizLead: 'Heatmaps, choropleths, proportional symbols, categories, a time slider and route animation, all from plain data.',
            heatmap: 'Heatmap', choropleth: 'Choropleth', proportional: 'Proportional symbols', categories: 'Categories', timeSlider: 'Time slider', route: 'Animate route', resetViz: 'Reset',
            rasterLead: 'Cloud-optimised GeoTIFFs rendered on the GPU: Sentinel-2 true colour and NDVI (vegetation index) computed in the browser, and shaded relief from elevation tiles.',
            ndvi: 'Sentinel-2 NDVI', trueColor: 'Sentinel-2 true colour', swipeNdvi: 'Compare NDVI with satellite', hillshade: 'Shaded relief', sun: 'Sun azimuth',
            rasterNote: 'Imagery: Copernicus Sentinel-2 (AWS Open Data, 2020-07-01, Nile valley). Elevation: Terrain Tiles (AWS Open Data).',
            loading: 'Loading…'
        },
        pt: {
            tagline: 'Mapas pensados para o toque, sobre OpenLayers. Prontos para OutSystems.',
            events: 'Eventos', clearLog: 'Limpar',
            credits: 'Criado por <b>Henrique Silva</b>, Solutions Specialist na <b>Axians Low Code</b>. Construído sobre <a href="https://openlayers.org" target="_blank" rel="noopener">OpenLayers</a> e <a href="https://github.com/bjornharrtell/jsts" target="_blank" rel="noopener">JSTS</a>. Os dados de exemplo são fictícios.',
            markers: 'Marcadores', layers: 'Camadas', draw: 'Desenhar', measure: 'Medir', search: 'Pesquisa', io: 'Importar / exportar', mobile: 'Mobile', viz: 'Dados', raster: 'Satélite',
            markersLead: 'Ícones próprios a partir dos seus dados. Toque num marcador: o mapa aproxima e a app recebe um evento para carregar os detalhes. Feche o cartão para voltar a ver todos os pontos.',
            category: 'Categoria', all: 'Todos', cafe: 'Cafés', shop: 'Lojas', museum: 'Museus', food: 'Restaurantes',
            showAll: 'Mostrar todos', clusterOn: 'Agrupar', address: 'Morada', rating: 'Avaliação', hours: 'Horário', closeCard: 'Fechar', zoomHere: 'Aproximar',
            tapMarker: 'Toque num marcador para ver os detalhes.',
            layersLead: 'Combine WMS, WMTS, WFS e GeoJSON de qualquer servidor. Abra o painel de camadas para ligar, ordenar, mudar a opacidade e ver legendas.',
            openPanel: 'Abrir painel de camadas', whatHere: '“O que está aqui?” (GetFeatureInfo)', swipe: 'Comparar com satélite', stopSwipe: 'Parar comparação',
            addWfs: 'Adicionar camada WFS', layersNote: 'Serviços de exemplo: GeoServer de demonstração da GeoSolutions (WMS/WFS) e Esri (WMTS).',
            drawLead: 'O editor recorta o desenho pela área permitida e desconta as zonas bloqueadas, em tempo real. Um dedo coloca pontos; dois dedos movem o mapa.',
            drawInside: 'Polígono dentro da área', drawEdit: 'Editar polígono existente', drawFree: 'Polígono livre (snap)', drawLine: 'Linha', drawPoint: 'Ponto', split: 'Dividir um campo com uma linha', stopDraw: 'Parar', save: 'Guardar na camada', buffer: 'Buffer de 20 m à volta',
            result: 'Resultado', status: 'Estado', usefulArea: 'Área útil', perimeter: 'Perímetro', vertices: 'Vértices', length: 'Comprimento',
            measureLead: 'Distância, área com perímetro e rumo. Os resultados ficam no mapa até os limpar.',
            distance: 'Distância', area: 'Área', azimuth: 'Rumo', clear: 'Limpar', stop: 'Parar',
            searchLead: 'Pesquise moradas com o Nominatim do OpenStreetMap (ou o seu geocoder), obtenha a morada de um toque e selecione elementos por área.',
            searchBelem: 'Pesquisar “Torre de Belém”', reverseOn: 'Toque → morada', selectBox: 'Selecionar por retângulo', selectPoly: 'Selecionar por polígono', selected: 'Selecionados',
            ioLead: 'Largue GeoJSON, KML/KMZ, GPX, WKT, CSV ou um shapefile em zip no mapa, ou carregue um exemplo. Exporte qualquer camada e imprima o mapa em PNG ou PDF.',
            loadKml: 'Carregar KML de exemplo', loadGpx: 'Carregar GPX de exemplo', loadCsv: 'Carregar CSV de exemplo', exportGeojson: 'Exportar marcadores (GeoJSON)', exportKml: 'Exportar importados (KML)', exportCsv: 'Exportar marcadores (CSV)', printPng: 'Imprimir PNG', printPdf: 'Imprimir PDF',
            mobileLead: 'Ponto azul com precisão e rumo, modo seguir, gravação de percurso por GPS, desenho com pontos GPS e tiles do mapa base offline.',
            locate: 'Localizar-me', stopLocate: 'Parar localização', track: 'Gravar percurso', stopTrack: 'Parar percurso', simulate: 'Simular uma caminhada', drawGps: 'Desenhar com pontos GPS', saveOffline: 'Guardar esta área offline', offlineStats: 'Tiles em cache', clearCache: 'Limpar cache', offlineOn: 'Usar cache offline',
            vizLead: 'Mapas de calor, coropléticos, símbolos proporcionais, categorias, slider temporal e animação de rotas, a partir de dados simples.',
            heatmap: 'Mapa de calor', choropleth: 'Coroplético', proportional: 'Símbolos proporcionais', categories: 'Categorias', timeSlider: 'Slider temporal', route: 'Animar rota', resetViz: 'Repor',
            rasterLead: 'GeoTIFFs otimizados para a cloud, renderizados na GPU: Sentinel-2 em cor real e NDVI (índice de vegetação) calculado no browser, e relevo sombreado a partir de tiles de elevação.',
            ndvi: 'NDVI Sentinel-2', trueColor: 'Sentinel-2 cor real', swipeNdvi: 'Comparar NDVI com satélite', hillshade: 'Relevo sombreado', sun: 'Azimute do sol',
            rasterNote: 'Imagens: Copernicus Sentinel-2 (AWS Open Data, 2020-07-01, vale do Nilo). Elevação: Terrain Tiles (AWS Open Data).',
            loading: 'A carregar…'
        }
    };
    const t = k => (STR[lang] && STR[lang][k]) || STR.en[k] || k;

    const $ = id => document.getElementById(id);
    const h = (tag, attrs, children) => {
        const e = document.createElement(tag);
        Object.entries(attrs || {}).forEach(([k, v]) => {
            if (k === 'on') Object.entries(v).forEach(([ev, fn]) => e.addEventListener(ev, fn));
            else if (k === 'text') e.textContent = v;
            else if (k === 'html') e.innerHTML = v;
            else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
        });
        (children || []).forEach(c => c && e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
        return e;
    };
    const btn = (label, onClick, cls) => h('button', { type: 'button', class: cls || '', text: label, on: { click: onClick } });
    const group = (title, children) => h('div', { class: 'group' }, [title ? h('h3', { text: title }) : null, h('div', { class: 'actions' }, children)]);

    /* ---------------- event log ---------------- */
    const QUIET = { moveend: 1, trackupdate: 1, routeprogress: 1, offlineprogress: 1, compareswipe: 1 };
    function log(type, payload) {
        if (QUIET[type] && logCount > 0 && $('log').firstChild && $('log').firstChild.dataset.type === type) {
            $('log').firstChild.lastChild.textContent = ' ' + short(payload);
            return;
        }
        logCount++;
        $('log-count').textContent = String(logCount);
        const li = h('li', {}, [h('b', { text: type }), h('span', { text: ' ' + short(payload) })]);
        li.dataset.type = type;
        $('log').prepend(li);
        while ($('log').children.length > 80) $('log').lastChild.remove();
    }
    function short(p) {
        try {
            const s = JSON.stringify(p, (k, v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v));
            return s && s.length > 220 ? s.slice(0, 220) + '…' : s;
        } catch (e) { return ''; }
    }

    /* ---------------- map lifecycle ---------------- */
    function createKit(opts) {
        if (kit) kit.destroy();
        kit = OLMapKit.create('map', Object.assign({
            locale: lang,
            basemap: 'streets',
            controls: { search: true, measure: true, locate: true, print: true, import: true, select: true, fitAll: true },
            onEvent: log
        }, opts || {}));
        window.kit = kit;
        return kit;
    }

    function fmtArea(m2) { return kit.format.area(m2); }

    /* ---------------- scenarios ---------------- */
    const SCENARIOS = {};

    SCENARIOS.markers = function (panel) {
        createKit({ center: [-9.15, 38.72], zoom: 13, markers: { cluster: true, focusZoom: 17 } });
        kit.markers.set(D.POIS);
        kit.once('ready', () => kit.markers.fitAll({ duration: 0 }));

        const card = h('div', { class: 'card' }, [h('div', { class: 'note', text: t('tapMarker') })]);
        const showCard = m => {
            const c = D.CATEGORIES[m.data.category];
            card.innerHTML = '';
            card.appendChild(h('h4', {}, [h('span', { class: 'dot', style: 'background:' + c.color }), ' ' + m.title]));
            card.appendChild(h('dl', {}, [
                h('dt', { text: t('category') }), h('dd', { text: t(m.data.category) }),
                h('dt', { text: t('address') }), h('dd', { text: m.data.address }),
                h('dt', { text: t('rating') }), h('dd', { text: '★ ' + m.data.rating }),
                h('dt', { text: t('hours') }), h('dd', { text: m.data.hours })
            ]));
            card.appendChild(h('div', { class: 'actions' }, [
                btn(t('closeCard'), () => { kit.markers.clearSelection({ fit: true }); resetCard(); }, 'primary'),
                btn(t('zoomHere'), () => kit.markers.focus(m.id, { zoom: 18 }))
            ]));
        };
        const resetCard = () => { card.innerHTML = ''; card.appendChild(h('div', { class: 'note', text: t('tapMarker') })); };
        kit.on('markerclick', e => showCard(kit.markers.get(e.id)));

        const chips = h('div', { class: 'chips' });
        const cats = ['all', 'cafe', 'shop', 'museum', 'food'];
        const setCat = cat => {
            chips.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
            kit.markers.setFilter(cat === 'all' ? null : { property: 'category', value: cat });
            kit.markers.fitAll();
        };
        cats.forEach(cat => {
            const b = h('button', { type: 'button', 'aria-pressed': String(cat === 'all'), on: { click: () => setCat(cat) } }, [
                cat !== 'all' ? h('span', { class: 'dot', style: 'background:' + D.CATEGORIES[cat].color }) : null, t(cat)
            ]);
            b.dataset.cat = cat;
            chips.appendChild(b);
        });
        const cluster = btn(t('clusterOn'), () => { const on = !cluster.classList.contains('is-on'); cluster.classList.toggle('is-on', on); kit.markers.setClustering(on); });
        cluster.classList.add('is-on');

        panel.append(
            h('div', { class: 'group' }, [h('h3', { text: t('category') }), chips]),
            group('', [btn(t('showAll'), () => { kit.markers.clearSelection({ fit: true }); resetCard(); }), cluster]),
            card
        );
    };

    SCENARIOS.layers = function (panel) {
        createKit({ center: [-98, 39], zoom: 4, basemap: 'light', featureInfo: { enabled: false } });
        kit.layers.add({
            id: 'states', type: 'wms', title: 'US states (WMS)', url: 'https://gs-stable.geo-solutions.it/geoserver/wms',
            layers: 'topp:states', legend: true, opacity: 0.7, serverType: 'geoserver'
        });
        kit.layers.add({
            id: 'topo', type: 'wmts', title: 'World topo (WMTS)', visible: false, opacity: 0.8,
            url: 'https://server.arcgisonline.com/arcgis/rest/services/World_Topo_Map/MapServer/WMTS/1.0.0/WMTSCapabilities.xml',
            layer: 'World_Topo_Map', matrixSet: 'GoogleMapsCompatible', attributions: 'Tiles © Esri'
        });
        kit.layers.add({
            id: 'cities', type: 'geojson', title: 'Cities (GeoJSON)', popup: { title: '{name}' },
            style: { type: 'proportional', property: 'pop', min: 0, max: 8.5, minRadius: 5, maxRadius: 24, color: '#e53935', stroke: '#b71c1c', label: 'name', minZoomLabel: 4 },
            data: { type: 'FeatureCollection', features: [['New York', -74.0, 40.71, 8.3], ['Los Angeles', -118.24, 34.05, 3.9], ['Chicago', -87.63, 41.88, 2.7], ['Houston', -95.37, 29.76, 2.3], ['Phoenix', -112.07, 33.45, 1.6], ['Denver', -104.99, 39.74, 0.7], ['Seattle', -122.33, 47.61, 0.75], ['Miami', -80.19, 25.76, 0.44]]
                .map(c => ({ type: 'Feature', properties: { name: c[0], pop: c[3] }, geometry: { type: 'Point', coordinates: [c[1], c[2]] } })) }
        });
        const q = btn(t('whatHere'), () => { const on = !q.classList.contains('is-on'); q.classList.toggle('is-on', on); kit.query.enable(on); });
        const sw = btn(t('swipe'), () => {
            if (kit.compare.active) { kit.compare.stop(); sw.textContent = t('swipe'); }
            else { kit.compare.swipe({ basemap: 'imagery' }); sw.textContent = t('stopSwipe'); }
        });
        panel.append(
            group('', [btn(t('openPanel'), () => kit.layers.openPanel(), 'primary'), q, sw,
                btn(t('addWfs'), () => kit.layers.add({ id: 'wfs', type: 'wfs', title: 'US states (WFS)', url: 'https://gs-stable.geo-solutions.it/geoserver/wfs', typeName: 'topp:states', style: { stroke: '#6a1b9a', width: 2, fill: 'rgba(106,27,154,0.08)', label: 'STATE_ABBR' }, popup: { title: '{STATE_NAME}', fields: ['STATE_NAME', 'SUB_REGION', 'PERSONS', 'LAND_KM'] } }))]),
            h('p', { class: 'note', text: t('layersNote') })
        );
    };

    SCENARIOS.draw = function (panel) {
        createKit({ center: [-120.4995, 36.9005], zoom: 16, basemap: 'imagery' });
        const baseFc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Allowed area' }, geometry: { type: 'Polygon', coordinates: [D.BASE.concat([D.BASE[0]])] } }] };
        const blockedFc = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: 'Blocked' }, geometry: { type: 'Polygon', coordinates: [D.BLOCKED.concat([D.BLOCKED[0]])] } }] };
        kit.layers.add({ id: 'base', type: 'geojson', title: 'Allowed area', data: baseFc, style: { stroke: '#29b6f6', width: 2, fill: 'rgba(41,182,246,0.12)' }, clickable: false });
        kit.layers.add({ id: 'blocked', type: 'geojson', title: 'Blocked zone', data: blockedFc, style: { stroke: '#8d6e63', width: 2, fill: 'rgba(141,110,99,0.5)', label: 'name', labelColor: '#fff', labelHalo: '#5d4037' }, clickable: false });
        kit.layers.add({ id: 'fields', type: 'geojson', title: 'Neighbour fields', data: D.FIELDS, style: { stroke: '#ffca28', width: 2, fill: 'rgba(255,202,40,0.12)', label: 'name', labelColor: '#fff', labelHalo: '#000' }, popup: true });
        kit.layers.add({ id: 'saved', type: 'vector', title: 'Saved drawings', style: { stroke: '#64dd17', width: 3, fill: 'rgba(100,221,23,0.25)' } });

        const out = h('div', { class: 'card' }, [h('div', { class: 'note', text: '—' })]);
        const show = r => {
            if (!r) return;
            out.innerHTML = '';
            const ok = r.valid;
            const rows = [h('dt', { text: t('status') }), h('dd', { class: ok ? 'status-ok' : 'status-bad', text: r.status || (ok ? 'ok' : '—') })];
            if (r.tool === 'polygon') rows.push(h('dt', { text: t('usefulArea') }), h('dd', { text: ok ? fmtArea(r.area) : '—' }), h('dt', { text: t('perimeter') }), h('dd', { text: ok ? kit.format.length(r.perimeter) : '—' }), h('dt', { text: t('vertices') }), h('dd', { text: String(r.drawn.length) }));
            if (r.tool === 'line') rows.push(h('dt', { text: t('length') }), h('dd', { text: kit.format.length(r.length) }));
            out.append(h('h4', { text: t('result') + ' · ' + r.tool }), h('dl', {}, rows));
            if (r.geojson) out.append(h('pre', { text: JSON.stringify(r.geojson.geometry || r.geojson, null, 0) }));
        };
        kit.on('drawchange', show);
        kit.on('drawend', show);
        kit.on('split', e => { out.innerHTML = ''; out.append(h('h4', { text: 'split' }), h('div', { text: e.results.map(r => r.sourceId + ' → ' + r.parts.features.length).join(', ') || '—' })); });

        panel.append(
            group('', [
                btn(t('drawInside'), () => kit.draw.polygon({ within: 'base', exclude: 'blocked', snap: ['fields'], gps: true }), 'primary'),
                btn(t('drawEdit'), () => kit.draw.polygon({ within: 'base', exclude: 'blocked', initial: D.EXISTING })),
                btn(t('drawFree'), () => kit.draw.polygon({ snap: ['fields', 'base', 'blocked'] })),
                btn(t('drawLine'), () => kit.draw.line({ snap: ['fields', 'base'] })),
                btn(t('drawPoint'), () => kit.draw.point({ multiple: true })),
                btn(t('split'), () => kit.draw.split({ layer: 'fields' }))
            ]),
            group('', [
                btn(t('save'), () => kit.draw.stop({ targetLayer: 'saved' })),
                btn(t('buffer'), () => {
                    const fc = kit.layers.getFeatures('saved');
                    if (!fc || !fc.features.length) return;
                    const g = OLMapKit.geo.buffer(fc.features[fc.features.length - 1].geometry, 20);
                    kit.layers.addFeatures('buffers', { type: 'Feature', properties: {}, geometry: g }, { title: 'Buffer 20 m', style: { stroke: '#ff6d00', width: 2, lineDash: [6, 4], fill: 'rgba(255,109,0,0.08)' } });
                }),
                btn(t('stopDraw'), () => kit.draw.stop())
            ]),
            out
        );
        kit.once('ready', () => kit.draw.polygon({ within: 'base', exclude: 'blocked', snap: ['fields'], gps: true }));
    };

    SCENARIOS.measure = function (panel) {
        createKit({ center: [-9.14, 38.71], zoom: 14 });
        const list = h('div', { class: 'card' }, [h('div', { class: 'note', text: '—' })]);
        kit.on('measure', m => {
            if (list.querySelector('.note')) list.innerHTML = '';
            list.prepend(h('div', { text: t(m.type) + ': ' + m.formatted }));
        });
        panel.append(group('', [
            btn(t('distance'), () => kit.measure.start('distance'), 'primary'),
            btn(t('area'), () => kit.measure.start('area')),
            btn(t('azimuth'), () => kit.measure.start('azimuth')),
            btn(t('clear'), () => kit.measure.clear()),
            btn(t('stop'), () => kit.measure.stop())
        ]), list);
        kit.once('ready', () => kit.measure.start('distance'));
    };

    SCENARIOS.search = function (panel) {
        createKit({ center: [-9.17, 38.71], zoom: 13 });
        kit.markers.set(D.POIS);
        kit.layers.add({ id: 'zones', type: 'geojson', title: 'Zones', data: D.ZONES, style: { stroke: 'rgba(30,136,229,0.6)', width: 1, fill: 'rgba(30,136,229,0.04)' } });
        let reverse = false;
        const rev = btn(t('reverseOn'), () => { reverse = !reverse; rev.classList.toggle('is-on', reverse); });
        kit.on('click', e => {
            if (!reverse || kit.activeTool) return;
            kit.search.reverse([e.lon, e.lat]).then(r => kit.ui.toast(r.label || '—', 5000));
        });
        const out = h('div', { class: 'card' }, [h('div', { class: 'note', text: '—' })]);
        kit.on('selection', s => {
            out.innerHTML = '';
            out.append(h('h4', { text: t('selected') + ': ' + s.count }), h('div', { text: 'markers: ' + s.markers.join(', ') }), h('div', { text: 'zones: ' + (s.layers.zones || []).join(', ') }));
        });
        panel.append(group('', [
            btn(t('searchBelem'), () => kit.search.geocode('Torre de Belém, Lisboa').then(r => r[0] && kit.search.select(r[0])), 'primary'),
            rev,
            btn(t('selectBox'), () => kit.select.byBox()),
            btn(t('selectPoly'), () => kit.select.byPolygon())
        ]), out);
    };

    SCENARIOS.io = function (panel) {
        createKit({ center: [-9.15, 38.715], zoom: 14 });
        kit.markers.set(D.POIS);
        panel.append(
            group('', [
                btn(t('loadKml'), () => kit.io.importText(D.SAMPLE_KML, 'sample.kml', { layerId: 'imported', title: 'sample.kml', style: { stroke: '#d81b60', fill: 'rgba(216,27,96,0.15)', label: 'name' } })),
                btn(t('loadGpx'), () => kit.io.importText(D.SAMPLE_GPX, 'run.gpx', { layerId: 'imported', title: 'Imported', style: { stroke: '#d81b60', width: 4 } })),
                btn(t('loadCsv'), () => kit.io.importText(D.SAMPLE_CSV, 'places.csv', { layerId: 'csv', title: 'places.csv', style: { pointFill: '#00897b', radius: 8, label: 'name' } }))
            ]),
            group('', [
                btn(t('exportGeojson'), () => kit.io.download('markers', 'geojson', 'markers.geojson')),
                btn(t('exportCsv'), () => kit.io.download('markers', 'csv', 'markers.csv')),
                btn(t('exportKml'), () => kit.layers.has('imported') && kit.io.download('imported', 'kml', 'imported.kml'))
            ]),
            group('', [
                btn(t('printPng'), () => kit.io.print({ title: 'OLMapKit · Lisboa', format: 'png' }), 'primary'),
                btn(t('printPdf'), () => kit.io.print({ title: 'OLMapKit · Lisboa', format: 'pdf' }))
            ])
        );
    };

    SCENARIOS.mobile = function (panel) {
        createKit({ center: [-9.155, 38.716], zoom: 15, controls: { locate: true, offline: true, search: false } });
        let simTimer = null;
        const loc = btn(t('locate'), () => {
            if (kit.geolocation.active) { kit.geolocation.stop(); loc.textContent = t('locate'); }
            else { kit.geolocation.start({ follow: true }); loc.textContent = t('stopLocate'); }
        }, 'primary');
        const trk = btn(t('track'), () => {
            if (kit.geolocation.tracking) { const r = kit.geolocation.stopTrack(); trk.textContent = t('track'); clearInterval(simTimer); showTrack(r); }
            else { kit.geolocation.startTrack(); trk.textContent = t('stopTrack'); }
        });
        const out = h('div', { class: 'card' }, [h('div', { class: 'note', text: '—' })]);
        const showTrack = r => {
            out.innerHTML = '';
            if (!r) return;
            out.append(h('h4', { text: t('track') }), h('div', { text: r.points + ' pts · ' + kit.format.length(r.length) }));
            if (r.geojson) {
                kit.layers.addFeatures('tracks', r.geojson, { title: 'Tracks', style: { stroke: '#8e24aa', width: 4 } });
                out.append(h('div', { class: 'actions' }, [btn('GPX', () => kit.io.download('tracks', 'gpx', 'track.gpx'))]));
            }
        };
        kit.on('trackupdate', u => { out.innerHTML = ''; out.append(h('div', { text: u.points + ' pts · ' + kit.format.length(u.length) })); });
        const sim = btn(t('simulate'), () => {
            if (!kit.geolocation.tracking) { kit.geolocation.startTrack(); trk.textContent = t('stopTrack'); }
            let i = 0;
            clearInterval(simTimer);
            const path = D.ROUTE;
            simTimer = setInterval(() => {
                const a = path[Math.floor(i / 4)];
                const b = path[Math.min(path.length - 1, Math.floor(i / 4) + 1)];
                const f = (i % 4) / 4;
                if (!a) { clearInterval(simTimer); return; }
                kit.geolocation.addTrackPoint([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], 5);
                i++;
            }, 180);
            kit.fit([-9.22, 38.688, -9.13, 38.712]);
        });
        const stats = h('span', { class: 'note' });
        const refresh = () => kit.offline.stats().then(s => { stats.textContent = t('offlineStats') + ': ' + s.count; });
        kit.on('offlinedone', refresh);
        kit.on('offlinecleared', refresh);
        refresh();
        panel.append(
            group('', [loc, trk, sim, btn(t('drawGps'), () => kit.draw.polygon({ gps: true }))]),
            group('Offline', [btn(t('saveOffline'), () => kit.offline.prefetch({ maxZoom: Math.min(18, Math.round(kit.getView().zoom) + 1) }).catch(() => {})), btn(t('clearCache'), () => kit.offline.clear())]),
            stats, out
        );
    };

    SCENARIOS.viz = function (panel) {
        createKit({ center: [-9.16, 38.72], zoom: 12, basemap: 'dark' });
        const reset = () => {
            kit.viz.stopTime();
            kit.viz.stopRoutes();
            ['heat', 'events', 'zones', 'centroids'].forEach(id => kit.layers.remove(id));
        };
        const zones = () => { if (!kit.layers.has('zones')) kit.layers.add({ id: 'zones', type: 'geojson', title: 'Zones', data: D.ZONES, popup: { title: '{name}', fields: ['events', 'density'] }, style: { label: 'name', labelColor: '#fff', labelHalo: '#000', minZoomLabel: 13 } }); };
        const events = () => { if (!kit.layers.has('events')) kit.layers.add({ id: 'events', type: 'geojson', title: 'Events', data: D.EVENTS, style: { radius: 4, pointFill: '#ffca28' } }); };
        panel.append(
            group('', [
                btn(t('heatmap'), () => { reset(); kit.viz.heatmap({ id: 'heat', title: 'Events heatmap', data: D.EVENTS, weight: 'weight', radius: 14, blur: 22, intensity: 0.3 }); }, 'primary'),
                btn(t('choropleth'), () => { reset(); zones(); kit.viz.choropleth('zones', { property: 'events', classes: 5, palette: 'viridis' }); kit.layers.openPanel(); }),
                btn(t('proportional'), () => {
                    reset();
                    const pts = { type: 'FeatureCollection', features: D.ZONES.features.map(f => ({ type: 'Feature', properties: f.properties, geometry: { type: 'Point', coordinates: [f.properties.cx, f.properties.cy] } })) };
                    kit.layers.add({ id: 'centroids', type: 'geojson', title: 'Events per zone', data: pts, popup: { title: '{name}', fields: ['events'] } });
                    kit.viz.proportional('centroids', { property: 'events', color: '#ff7043', maxRadius: 30 });
                }),
                btn(t('categories'), () => { reset(); events(); kit.viz.categories('events', { property: 'kind' }); kit.layers.openPanel(); }),
                btn(t('timeSlider'), () => { reset(); events(); kit.viz.categories('events', { property: 'kind' }); kit.viz.timeSlider({ layers: ['events'], property: 'date', step: 86400000 * 3, window: 86400000 * 21 }); }),
                btn(t('route'), () => { reset(); kit.viz.animateRoute({ coordinates: D.ROUTE, duration: 12000, color: '#29b6f6' }); }),
                btn(t('resetViz'), reset)
            ])
        );
        kit.once('ready', () => kit.viz.heatmap({ id: 'heat', title: 'Events heatmap', data: D.EVENTS, weight: 'weight', radius: 14, blur: 22, intensity: 0.3 }));
    };

    SCENARIOS.raster = function (panel) {
        createKit({ center: [32.3, 26.1], zoom: 10, basemap: 'imagery' });
        const S2 = 'https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/36/Q/WD/2020/7/S2A_36QWD_20200701_0_L2A/';
        const status = h('p', { class: 'note' });
        const run = (label, p) => { status.textContent = t('loading'); return p.then(() => { status.textContent = label; }).catch(e => { status.textContent = String(e.message || e); }); };
        const clear = () => { kit.compare.stop(); ['ndvi', 'tci', 'hillshade'].forEach(id => kit.layers.remove(id)); };
        const ndvi = () => run(t('ndvi'), kit.raster.cog({ id: 'ndvi', title: 'NDVI (Sentinel-2)', mode: 'ndvi', sources: [S2 + 'B04.tif', S2 + 'B08.tif'], fitZoom: 11 }));
        const sun = h('input', { type: 'range', min: '0', max: '360', value: '315', 'aria-label': t('sun') });
        const sunOut = h('output', { text: '315°' });
        sun.addEventListener('input', () => { sunOut.textContent = sun.value + '°'; kit.raster.setVariables('hillshade', { sunAz: Number(sun.value) }); });
        panel.append(
            group('', [
                btn(t('ndvi'), () => { clear(); ndvi(); }, 'primary'),
                btn(t('trueColor'), () => { clear(); run(t('trueColor'), kit.raster.cog({ id: 'tci', title: 'True colour (Sentinel-2)', mode: 'rgb', url: S2 + 'TCI.tif', fitZoom: 11 })); }),
                btn(t('swipeNdvi'), () => { const go = () => kit.compare.swipe({ layer: 'ndvi' }); if (kit.layers.has('ndvi')) go(); else ndvi().then(go); }),
                btn(t('hillshade'), () => { clear(); kit.basemaps.set('topo'); kit.raster.hillshade({ id: 'hillshade', opacity: 0.6 }); kit.goTo({ center: [7.75, 46.02], zoom: 11 }); })
            ]),
            h('div', { class: 'group' }, [h('h3', { text: t('sun') }), h('div', { class: 'range-row' }, [sun, sunOut])]),
            status,
            h('p', { class: 'note', text: t('rasterNote') })
        );
        kit.once('ready', () => ndvi());
    };

    /* ---------------- shell ---------------- */
    const ORDER = ['markers', 'layers', 'draw', 'measure', 'search', 'io', 'mobile', 'viz', 'raster'];

    function renderStatic() {
        document.documentElement.lang = lang;
        document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
        document.querySelectorAll('[data-t-html]').forEach(e => { e.innerHTML = t(e.dataset.tHtml); });
        $('lang').value = lang;
        const nav = $('scenarios');
        nav.innerHTML = '';
        ORDER.forEach(id => nav.appendChild(h('button', { type: 'button', 'aria-pressed': String(id === current), 'data-id': id, text: t(id), on: { click: () => open(id) } })));
    }

    function open(id) {
        current = SCENARIOS[id] ? id : 'markers';
        const url = new URL(location.href);
        url.searchParams.set('s', current);
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
        document.querySelectorAll('#scenarios button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === current)));
        const panel = $('panel');
        panel.innerHTML = '';
        panel.append(h('h2', { text: t(current) }), h('p', { class: 'lead', text: t(current + 'Lead') }));
        SCENARIOS[current](panel);
    }

    $('lang').addEventListener('change', () => { lang = $('lang').value; renderStatic(); open(current); });
    $('log-clear').addEventListener('click', () => { $('log').innerHTML = ''; logCount = 0; $('log-count').textContent = '0'; });
    if (window.matchMedia('(min-width: 861px)').matches) $('log-box').open = true;

    current = qs.get('s') || 'markers';
    renderStatic();
    open(current);
})();
