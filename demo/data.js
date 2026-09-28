// Fictitious sample data for the demo (deterministic).
(function () {
    'use strict';

    function rng(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    /* ---------- Points of interest (Lisbon, fictitious businesses) ---------- */
    const CATEGORIES = {
        cafe: { color: '#8d6e63', icon: 'M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.9 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z' },
        shop: { color: '#1e88e5', icon: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z' },
        museum: { color: '#8e24aa', icon: 'M4 10v7h3v-7H4zm6 0v7h3v-7h-3zM2 22h19v-3H2v3zm14-12v7h3v-7h-3zm-4.5-9L2 6v2h19V6l-9.5-5z' },
        food: { color: '#e53935', icon: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z' }
    };

    function iconFor(category, selected) {
        const c = CATEGORIES[category];
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">' +
            '<path d="M20 49 L12 36 A18 18 0 1 1 28 36 Z" fill="' + c.color + '" stroke="#fff" stroke-width="2.5"/>' +
            '<g transform="translate(9 8.5) scale(0.92)" fill="#fff"><path d="' + c.icon + '"/></g></svg>';
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    const POI_RAW = [
        ['p1', 'Café Miradouro', 'cafe', -9.1332, 38.7127, 'Rua da Graça 12', 4.6, '08:00–19:00'],
        ['p2', 'Livraria do Chiado', 'shop', -9.1418, 38.7106, 'Rua Garrett 40', 4.8, '10:00–20:00'],
        ['p3', 'Museu do Azulejo (demo)', 'museum', -9.1136, 38.7253, 'Rua da Madre de Deus 4', 4.7, '10:00–18:00'],
        ['p4', 'Tasca da Ribeira', 'food', -9.1452, 38.7073, 'Av. 24 de Julho 50', 4.3, '12:00–23:00'],
        ['p5', 'Padaria Estrela', 'cafe', -9.1602, 38.7142, 'Calçada da Estrela 81', 4.5, '07:00–20:00'],
        ['p6', 'Mercado Criativo', 'shop', -9.1466, 38.7071, 'Rua de São Paulo 7', 4.2, '09:00–21:00'],
        ['p7', 'Galeria Tejo', 'museum', -9.1936, 38.6961, 'Av. Brasília 3', 4.4, '10:00–19:00'],
        ['p8', 'Pastelaria Belém Norte', 'cafe', -9.2031, 38.6975, 'Rua de Belém 90', 4.9, '08:00–23:00'],
        ['p9', 'Cantina do Bairro', 'food', -9.1435, 38.7134, 'Rua da Rosa 115', 4.1, '12:00–15:00'],
        ['p10', 'Loja das Conservas', 'shop', -9.1375, 38.7086, 'Rua do Arsenal 130', 4.6, '10:00–20:00'],
        ['p11', 'Marisqueira Avenida', 'food', -9.1452, 38.7233, 'Av. da Liberdade 180', 4.4, '12:00–00:00'],
        ['p12', 'Café Jardim', 'cafe', -9.1536, 38.7282, 'Jardim do Príncipe Real', 4.3, '09:00–19:00'],
        ['p13', 'Museu da Cidade (demo)', 'museum', -9.1520, 38.7560, 'Campo Grande 245', 4.2, '10:00–18:00'],
        ['p14', 'Bistrô Alfama', 'food', -9.1299, 38.7115, 'Largo do Chafariz 3', 4.7, '18:00–23:30'],
        ['p15', 'Discos & Vinil', 'shop', -9.1391, 38.7141, 'Rua do Norte 22', 4.5, '11:00–20:00'],
        ['p16', 'Café Oriente', 'cafe', -9.0960, 38.7680, 'Passeio das Tágides', 4.0, '08:00–22:00']
    ];

    const POIS = POI_RAW.map((p, i) => ({
        id: p[0], title: p[1], lon: p[3], lat: p[4],
        icon: iconFor(p[2]), iconScale: 0.9,
        data: { category: p[2], address: p[5], rating: p[6], hours: p[7], opened: '2026-0' + (1 + (i % 9)) + '-15' }
    }));

    /* ---------- Drawing scenario (fictitious fields, California) ---------- */
    const BASE = [[-120.5030, 36.9020], [-120.4980, 36.9028], [-120.4962, 36.8998], [-120.4990, 36.8975], [-120.5035, 36.8988]];
    const BLOCKED = [[-120.4992, 36.9025], [-120.4981, 36.9026], [-120.4970, 36.9007], [-120.4987, 36.9004]];
    const EXISTING = [[-120.5022, 36.9014], [-120.5000, 36.9017], [-120.4995, 36.8996], [-120.5020, 36.8992]];
    const ring = c => c.concat([c[0]]);
    const poly = (coords, props) => ({ type: 'Feature', properties: props || {}, geometry: { type: 'Polygon', coordinates: [ring(coords)] } });

    const FIELDS = {
        type: 'FeatureCollection',
        features: [
            poly([[-120.5100, 36.9040], [-120.5045, 36.9040], [-120.5045, 36.8990], [-120.5100, 36.8990]], { name: 'Field A', crop: 'Almonds' }),
            poly([[-120.5100, 36.8985], [-120.5040, 36.8985], [-120.5040, 36.8940], [-120.5100, 36.8940]], { name: 'Field B', crop: 'Tomatoes' }),
            poly([[-120.4955, 36.9040], [-120.4890, 36.9040], [-120.4890, 36.8985], [-120.4955, 36.8985]], { name: 'Field C', crop: 'Pistachios' })
        ]
    };
    FIELDS.features.forEach((f, i) => { f.id = 'field-' + (i + 1); });

    /* ---------- Data viz (Lisbon) ---------- */
    const r = rng(42);
    const HOTSPOTS = [[-9.140, 38.711, 1], [-9.150, 38.725, 0.7], [-9.200, 38.697, 0.5], [-9.100, 38.765, 0.4]];
    const EVENTS = { type: 'FeatureCollection', features: [] };
    for (let i = 0; i < 400; i++) {
        const h = HOTSPOTS[Math.floor(r() * HOTSPOTS.length)];
        const ang = r() * Math.PI * 2;
        const dist = Math.sqrt(r()) * 0.012 * (1.4 - h[2] * 0.4);
        const day = Math.floor(r() * 180);
        const date = new Date(Date.UTC(2026, 0, 1) + day * 86400000).toISOString().slice(0, 10);
        EVENTS.features.push({
            type: 'Feature', id: 'e' + i,
            properties: { date, weight: Math.round(1 + r() * 9), kind: ['delivery', 'visit', 'incident'][Math.floor(r() * 3)] },
            geometry: { type: 'Point', coordinates: [h[0] + Math.cos(ang) * dist, h[1] + Math.sin(ang) * dist * 0.8] }
        });
    }

    const ZONES = { type: 'FeatureCollection', features: [] };
    const x0 = -9.22, y0 = 38.69, dx = 0.02, dy = 0.016;
    for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 5; j++) {
            const x = x0 + i * dx;
            const y = y0 + j * dy;
            const cx = x + dx / 2;
            const cy = y + dy / 2;
            const count = EVENTS.features.filter(f => {
                const c = f.geometry.coordinates;
                return c[0] >= x && c[0] < x + dx && c[1] >= y && c[1] < y + dy;
            }).length;
            ZONES.features.push({
                type: 'Feature', id: 'z' + i + j,
                properties: { name: 'Zone ' + String.fromCharCode(65 + i) + (j + 1), events: count, density: Math.round(count / 1.2 * 10) / 10, cx, cy },
                geometry: { type: 'Polygon', coordinates: [[[x, y], [x + dx, y], [x + dx, y + dy], [x, y + dy], [x, y]]] }
            });
        }
    }

    const ROUTE = [[-9.1365, 38.7075], [-9.1420, 38.7068], [-9.1470, 38.7060], [-9.1560, 38.7045], [-9.1650, 38.7035], [-9.1760, 38.7005], [-9.1860, 38.6975], [-9.1960, 38.6955], [-9.2050, 38.6935], [-9.2160, 38.6915]];

    /* ---------- Import samples ---------- */
    const SAMPLE_KML = '<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Sample</name>' +
        '<Placemark><name>Riverside walk area</name><Polygon><outerBoundaryIs><LinearRing><coordinates>-9.170,38.699 -9.160,38.701 -9.158,38.697 -9.169,38.695 -9.170,38.699</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>' +
        '<Placemark><name>Viewpoint</name><Point><coordinates>-9.1447,38.7139</coordinates></Point></Placemark></Document></kml>';
    const SAMPLE_GPX = '<?xml version="1.0"?><gpx version="1.1" creator="demo" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>Morning run</name><trkseg>' +
        [[-9.1600, 38.7135], [-9.1560, 38.7150], [-9.1520, 38.7170], [-9.1490, 38.7200], [-9.1470, 38.7235], [-9.1452, 38.7265], [-9.1480, 38.7290], [-9.1530, 38.7282]]
            .map(c => '<trkpt lat="' + c[1] + '" lon="' + c[0] + '"></trkpt>').join('') + '</trkseg></trk></gpx>';
    const SAMPLE_CSV = 'name,lat,lon,visitors\nPraça do Comércio,38.7076,-9.1365,1200\nMiradouro da Graça,38.7163,-9.1310,640\nJardim da Estrela,38.7137,-9.1597,420\nParque Eduardo VII,38.7289,-9.1541,380';

    window.DEMO_DATA = { POIS, CATEGORIES, iconFor, BASE, BLOCKED, EXISTING, FIELDS, EVENTS, ZONES, ROUTE, SAMPLE_KML, SAMPLE_GPX, SAMPLE_CSV };
})();
