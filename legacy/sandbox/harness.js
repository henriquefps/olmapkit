/*
 * Demo harness for src/init_map.js.
 *
 * The component is written as the body of an OutSystems JavaScript node: it reads
 * `$parameters` and calls `$actions`. This harness loads the file as-is, runs it
 * with equivalent `$parameters` / `$actions`, and simulates a consumer screen
 * (useful area + Save / Clear buttons) with an event log.
 */
(function () {
    'use strict';

    // ---------------------------------------------------------------
    // Sample data (fictitious polygons over farmland)
    // ---------------------------------------------------------------
    const BASE_AREA = [
        [-120.5030, 36.9020], [-120.4980, 36.9028], [-120.4962, 36.8998],
        [-120.4990, 36.8975], [-120.5035, 36.8988]
    ];
    const BLOCKED_AREA = [
        [-120.4992, 36.9025], [-120.4981, 36.9026], [-120.4970, 36.9007], [-120.4987, 36.9004]
    ];
    const EXISTING_POLYGON = [
        [-120.5022, 36.9014], [-120.5000, 36.9017], [-120.4995, 36.8996], [-120.5020, 36.8992]
    ];

    function polygon(id, name, coords, opts) {
        return Object.assign({
            PolygonId: id,
            PolygonName: name,
            BorderColor: '#1e88e5',
            BackgroundColor: 'rgba(30,136,229,0.15)',
            CanDrawInsideIt: false,
            IsShowTooltip: false,
            TooltipTitle: '',
            TooltipIsShowDescription: false,
            TooltipDescription: '',
            TooltipDetailList: [],
            Coordinates: coords.map(c => ({ Lon: c[0], Lat: c[1] }))
        }, opts);
    }

    // Area where drawing is allowed
    const base = polygon('BASE', 'Base area', BASE_AREA, { CanDrawInsideIt: true });
    // Area that cannot be covered (subtracted from the useful area)
    const blocked = polygon('BLOCKED', 'Blocked', BLOCKED_AREA, {
        BorderColor: '#8d6e63', BackgroundColor: 'rgba(141,110,99,0.45)', CanDrawInsideIt: false
    });
    // An already saved polygon, sent as another CanDrawInsideIt = true polygon inside the base
    const existing = polygon('EXISTING', '', EXISTING_POLYGON, {
        BorderColor: '#f9a825', BackgroundColor: 'rgba(255,235,59,0.35)', CanDrawInsideIt: true
    });
    // A new polygon pre-filled with the whole base outline
    const prefilled = polygon('NEW', '', BASE_AREA, {
        BorderColor: '#f9a825', BackgroundColor: 'rgba(255,235,59,0.35)', CanDrawInsideIt: true
    });

    const SCENARIOS = {
        prefill: { label: 'New polygon pre-filled with the base area', polygons: [base, prefilled] },
        new: { label: 'New polygon (empty base area)', polygons: [base] },
        occupied: { label: 'New polygon (base area with a blocked zone)', polygons: [base, blocked] },
        edit: { label: 'Edit an existing polygon', polygons: [base, blocked, existing] }
    };

    // Component input flags
    const FLAGS = {
        EnableDrawPolygon: true,
        EnableDrawOnlyOnePolygon: true,
        EnableAlwaysShowPolygon: true,
        EnableNotFillPolygons: false,
        EnableOrderPolygonsByCentroid: false,
        EnableClickMarker: false,
        EnableGoToDetails: false,
        EnableMarkerOutPolygon: false
    };

    const TEXTS = {
        DrawOutOfPolygonAlertMessage: 'The drawing is outside the available area.',
        DrawTwoPolygonsAlertMessage: 'The drawing creates several separate areas. Adjust the points.',
        ZoomMapOverlayMessage: 'Use CTRL + scroll to zoom the map',
        HelpTag: 'Draw the polygon inside the base area.'
    };

    // English UI texts (the component defaults to Portuguese)
    const DRAW_LABELS = {
        locale: 'en-US',
        usefulArea: 'Useful area',
        hintDrawTouch: 'Tap the map to add points. Drag a point or a + to adjust. Use two fingers to move the map.',
        hintDrawMouse: 'Click to add points. Drag a point or a + to adjust. Double-click to finish.',
        hintEdit: 'Drag the points or the + to adjust. Tap a point to select and remove it.',
        undo: 'Undo',
        clear: 'Clear',
        finish: 'Finish',
        resume: 'Add points',
        removePoint: 'Remove point',
        redraw: 'Redraw',
        minPoints: 'At least 3 points are required.',
        selfIntersect: 'The polygon edges cross each other. Adjust the points.',
        noBase: 'Could not find the area to draw in.'
    };

    // ---------------------------------------------------------------
    // Mock authenticated WMS: returns a transparent PNG
    // ---------------------------------------------------------------
    const MOCK_WMS = 'https://mock-wms.local/geoserver/wms';
    const TRANSPARENT_PNG = Uint8Array.from(atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII='
    ), c => c.charCodeAt(0));
    const realFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (url.startsWith(MOCK_WMS)) {
            return Promise.resolve(new Response(new Blob([TRANSPARENT_PNG], { type: 'image/png' })));
        }
        return realFetch(input, init);
    };

    // ---------------------------------------------------------------
    // Consumer screen state
    // ---------------------------------------------------------------
    const screen = { coordinates: [], areaHa: 0 };

    const $ = id => document.getElementById(id);

    function log(msg, cls) {
        const li = document.createElement('li');
        li.textContent = new Date().toLocaleTimeString() + '  ' + msg;
        if (cls) li.className = cls;
        $('log').prepend(li);
    }

    function feedback(msg, ok) {
        const el = $('feedback');
        el.textContent = msg;
        el.className = 'feedback' + (ok ? ' ok' : '');
        el.hidden = false;
        clearTimeout(feedback.t);
        feedback.t = setTimeout(() => { el.hidden = true; }, 4000);
    }

    function renderArea() {
        $('area-ha').textContent = (Math.round(screen.areaHa * 10000) / 10000).toLocaleString('en-US');
    }

    // Equivalent of a "clear drawn polygon" client action
    function clearDrawnPolygon() {
        window.clearDrawPolygon();
    }

    const $actions = {
        OnClickSetMarker(lat, lon) {
            log('OnClickSetMarker(' + lat + ', ' + lon + ')', 'event');
        },
        OnClickGoToDetail(id, isParcel, isSubParcel, isCulture) {
            log('OnClickGoToDetail(' + [id, isParcel, isSubParcel, isCulture].join(', ') + ')', 'event');
        },
        PolygonOutsideValidArea(message) {
            log('PolygonOutsideValidArea("' + message + '")', 'event');
            feedback(message);
            clearDrawnPolygon();
        },
        OnDrawCoordinates(drawCoordinatesJson, areaHa) {
            log('OnDrawCoordinates(' + (drawCoordinatesJson ? drawCoordinatesJson.length + ' chars' : '""') + ', ' + areaHa + ')', 'event');
            if (areaHa === -1) {
                screen.coordinates = [];
                screen.areaHa = 0;
            } else {
                screen.coordinates = JSON.parse(drawCoordinatesJson || '[]');
                screen.areaHa = areaHa;
            }
            renderArea();
        }
    };

    function buildParameters() {
        const scenario = SCENARIOS[$('scenario').value];
        return Object.assign({}, FLAGS, TEXTS, {
            MapContainerId: 'map',
            TooltipContainerId: 'tooltip',
            GUID: 'demo',
            Zoom: 16,
            CenterLongitude: -120.50,
            CenterLatitude: 36.90,
            ClusterText: 'Items',
            Authorization: 'Basic ZGVtbzpkZW1v',
            WMSUrl: MOCK_WMS,
            Layer: 'demo:layer',
            ArcGIS_Url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ArcGIS_Attributions: 'Tiles © Esri',
            MultiPolygons: JSON.stringify({ polygons: scenario.polygons }),
            Markers: '[]',
            DrawLabels: JSON.stringify(DRAW_LABELS)
        });
    }

    async function loadCode(file) {
        const res = await realFetch(file + '?t=' + Date.now());
        return res.text();
    }

    // Same order as the host would run it: reset the previous map, then init
    async function initMap() {
        const [resetCode, initCode] = await Promise.all([
            loadCode('../reset_environment.js'), loadCode('../init_map.js')
        ]);

        new Function('$parameters', resetCode)({ MapDiv: 'map' });
        if (!$('tooltip')) {
            const t = document.createElement('div');
            t.id = 'tooltip'; t.className = 'tooltip';
            $('map').appendChild(t);
        }

        screen.coordinates = [];
        screen.areaHa = 0;
        renderArea();
        $('help-tag').textContent = TEXTS.HelpTag;

        log('Init_Map scenario=' + $('scenario').value);
        new Function('$parameters', '$actions', initCode)(buildParameters(), $actions);
    }

    function setupControls() {
        Object.entries(SCENARIOS).forEach(([k, v]) => $('scenario').add(new Option(v.label, k)));

        const qs = new URLSearchParams(location.search);
        if (qs.get('s') && SCENARIOS[qs.get('s')]) $('scenario').value = qs.get('s');

        Object.keys(FLAGS).forEach(name => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = FLAGS[name];
            cb.addEventListener('change', () => { FLAGS[name] = cb.checked; initMap(); });
            label.append(cb, name);
            $('flags').appendChild(label);
        });

        $('scenario').addEventListener('change', initMap);
        $('btn-reload').addEventListener('click', initMap);
        $('btn-clear-log').addEventListener('click', () => { $('log').innerHTML = ''; });

        $('btn-clear').addEventListener('click', () => {
            try {
                clearDrawnPolygon();
                log('clearDrawPolygon OK');
            } catch (e) {
                log('clearDrawPolygon failed: ' + e.message, 'error');
            }
            screen.coordinates = [];
            screen.areaHa = 0;
            renderArea();
        });

        $('btn-save').addEventListener('click', () => {
            const payload = {
                Locations: screen.coordinates.map((c, i) => ({ Order: i + 1, Latitude: c.Latitude, Longitude: c.Longitude })),
                AreaHa: screen.areaHa
            };
            log('Save → ' + JSON.stringify(payload), 'event');
            feedback(payload.Locations.length ? 'Saved: ' + payload.Locations.length + ' vertices, ' + payload.AreaHa.toFixed(4) + ' ha' : 'Nothing to save', !!payload.Locations.length);
        });

        window.addEventListener('error', e => log('Error: ' + e.message, 'error'));

        // iOS Safari ignores user-scalable=no: block page pinch-zoom outside the map
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(t =>
            document.addEventListener(t, e => { if (!e.target.closest || !e.target.closest('.ol-viewport')) e.preventDefault(); }, { passive: false }));
        document.addEventListener('touchmove', e => {
            if (e.touches.length > 1 && !(e.target.closest && e.target.closest('.ol-viewport'))) e.preventDefault();
        }, { passive: false });
    }

    setupControls();
    initMap();

    // Exposed for automated tests
    window.sandbox = { screen, initMap, SCENARIOS, FLAGS };
})();
