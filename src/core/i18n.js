// UI texts. Pick a locale with `locale` and override any key with `labels`.
const en = {
    // generic
    close: 'Close',
    layers: 'Layers',
    basemaps: 'Base map',
    overlays: 'Layers',
    opacity: 'Opacity',
    zoomTo: 'Zoom to layer',
    moveUp: 'Move up',
    moveDown: 'Move down',
    legend: 'Legend',
    noLayers: 'No layers yet.',
    fitAll: 'Show everything',
    ctrlScroll: 'Use Ctrl + scroll to zoom the map',
    // markers
    markers: 'Markers',
    // draw (polygon editor)
    usefulArea: 'Useful area',
    area: 'Area',
    length: 'Length',
    hintDrawTouch: 'Tap the map to add points. Drag a point or a + to adjust. Use two fingers to move the map.',
    hintDrawMouse: 'Click to add points. Drag a point or a + to adjust. Double-click to finish.',
    hintEdit: 'Drag the points or the + to adjust. Tap a point to select and remove it.',
    hintLine: 'Tap or click to add points. Double-tap or Finish to end the line.',
    hintPoint: 'Tap or click the map to place the point.',
    hintSplit: 'Draw a line across a polygon to split it.',
    undo: 'Undo',
    clear: 'Clear',
    finish: 'Finish',
    resume: 'Add points',
    removePoint: 'Remove point',
    redraw: 'Redraw',
    gpsPoint: 'Point here (GPS)',
    minPoints: 'At least 3 points are required.',
    selfIntersect: 'The polygon edges cross each other. Adjust the points.',
    multi: 'The drawing creates several separate areas. Adjust the points.',
    empty: 'The drawing is outside the available area.',
    noBase: 'Could not find the area to draw in.',
    tooSmall: 'The area is below the minimum allowed.',
    // measure
    measure: 'Measure',
    measureDistance: 'Distance',
    measureArea: 'Area',
    measureAzimuth: 'Bearing',
    measureClear: 'Clear',
    perimeter: 'Perimeter',
    hintMeasure: 'Tap or click to add points. Double-tap to finish.',
    // query
    search: 'Search',
    searchPlaceholder: 'Search an address or place',
    searchNoResults: 'No results.',
    searching: 'Searching…',
    featureInfo: 'Information',
    noInfo: 'Nothing found here.',
    selectBox: 'Select by rectangle',
    selectPolygon: 'Select by polygon',
    selected: 'Selected',
    // io
    importFile: 'Import file',
    importDrop: 'Drop GeoJSON, KML, GPX or a zipped shapefile on the map',
    imported: 'Imported {count} features',
    importFailed: 'Could not read the file.',
    exportData: 'Export',
    print: 'Print',
    printTitle: 'Map',
    // geolocation
    locate: 'My location',
    locating: 'Finding your location…',
    locationError: 'Location unavailable.',
    accuracy: 'Accuracy',
    trackStart: 'Record track',
    trackStop: 'Stop recording',
    // offline
    offline: 'Offline',
    offlineSaving: 'Saving map for offline use… {done}/{total}',
    offlineSaved: 'Map saved for offline use ({count} tiles).',
    offlineTooMany: 'Too many tiles ({count}). Zoom in or lower the max zoom.',
    offlineNotAllowed: 'This base map does not allow offline download.',
    // viz
    timePlay: 'Play',
    timePause: 'Pause',
    // compare
    compare: 'Compare'
};

const pt = {
    close: 'Fechar',
    layers: 'Camadas',
    basemaps: 'Mapa base',
    overlays: 'Camadas',
    opacity: 'Opacidade',
    zoomTo: 'Aproximar à camada',
    moveUp: 'Subir',
    moveDown: 'Descer',
    legend: 'Legenda',
    noLayers: 'Ainda não há camadas.',
    fitAll: 'Mostrar tudo',
    ctrlScroll: 'Use Ctrl + scroll para aplicar zoom no mapa',
    markers: 'Marcadores',
    usefulArea: 'Área útil',
    area: 'Área',
    length: 'Comprimento',
    hintDrawTouch: 'Toque no mapa para adicionar pontos. Arraste um ponto ou um + para ajustar. Use dois dedos para mover o mapa.',
    hintDrawMouse: 'Clique para adicionar pontos. Arraste um ponto ou um + para ajustar. Duplo clique para terminar.',
    hintEdit: 'Arraste os pontos ou os + para ajustar. Toque num ponto para o selecionar e remover.',
    hintLine: 'Toque ou clique para adicionar pontos. Duplo toque ou Terminar para acabar a linha.',
    hintPoint: 'Toque ou clique no mapa para colocar o ponto.',
    hintSplit: 'Desenhe uma linha a atravessar um polígono para o dividir.',
    undo: 'Desfazer',
    clear: 'Limpar',
    finish: 'Terminar',
    resume: 'Adicionar pontos',
    removePoint: 'Remover ponto',
    redraw: 'Redesenhar',
    gpsPoint: 'Ponto aqui (GPS)',
    minPoints: 'São necessários pelo menos 3 pontos.',
    selfIntersect: 'As linhas do polígono cruzam-se. Ajuste os pontos.',
    multi: 'O desenho gera várias áreas separadas. Ajuste os pontos.',
    empty: 'O desenho está fora da área disponível.',
    noBase: 'Não foi possível identificar a área onde desenhar.',
    tooSmall: 'A área é inferior ao mínimo permitido.',
    measure: 'Medir',
    measureDistance: 'Distância',
    measureArea: 'Área',
    measureAzimuth: 'Rumo',
    measureClear: 'Limpar',
    perimeter: 'Perímetro',
    hintMeasure: 'Toque ou clique para adicionar pontos. Duplo toque para terminar.',
    search: 'Pesquisar',
    searchPlaceholder: 'Pesquisar morada ou local',
    searchNoResults: 'Sem resultados.',
    searching: 'A pesquisar…',
    featureInfo: 'Informação',
    noInfo: 'Nada encontrado aqui.',
    selectBox: 'Selecionar por retângulo',
    selectPolygon: 'Selecionar por polígono',
    selected: 'Selecionados',
    importFile: 'Importar ficheiro',
    importDrop: 'Largue GeoJSON, KML, GPX ou um shapefile em zip no mapa',
    imported: '{count} elementos importados',
    importFailed: 'Não foi possível ler o ficheiro.',
    exportData: 'Exportar',
    print: 'Imprimir',
    printTitle: 'Mapa',
    locate: 'A minha localização',
    locating: 'A obter a localização…',
    locationError: 'Localização indisponível.',
    accuracy: 'Precisão',
    trackStart: 'Gravar percurso',
    trackStop: 'Parar gravação',
    offline: 'Offline',
    offlineSaving: 'A guardar o mapa para uso offline… {done}/{total}',
    offlineSaved: 'Mapa guardado para uso offline ({count} tiles).',
    offlineTooMany: 'Demasiados tiles ({count}). Aproxime o mapa ou baixe o zoom máximo.',
    offlineNotAllowed: 'Este mapa base não permite download offline.',
    timePlay: 'Reproduzir',
    timePause: 'Pausa',
    compare: 'Comparar'
};

const LOCALES = { en, pt, 'pt-PT': pt, 'pt-BR': pt };

export function createLabels(locale, overrides) {
    const lang = LOCALES[locale] || LOCALES[String(locale || '').split('-')[0]] || en;
    const labels = Object.assign({}, en, lang, overrides || {});
    const t = (key, vars) => {
        let s = labels[key] != null ? String(labels[key]) : key;
        if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(vars[k]); });
        return s;
    };
    return { labels, t };
}

// Number formatting in the map locale
export function createFormatter(locale, units) {
    const nf = (v, d) => v.toLocaleString(locale || 'en', { minimumFractionDigits: d, maximumFractionDigits: d });
    const imperial = units === 'imperial';
    return {
        number: nf,
        length(m) {
            if (imperial) {
                const ft = m * 3.28084;
                return ft < 5280 ? nf(ft, 0) + ' ft' : nf(ft / 5280, 2) + ' mi';
            }
            return m < 1000 ? nf(m, m < 10 ? 2 : 1) + ' m' : nf(m / 1000, 2) + ' km';
        },
        area(m2) {
            if (imperial) {
                const ac = m2 / 4046.8564224;
                return ac < 640 ? nf(ac, 2) + ' ac' : nf(ac / 640, 2) + ' mi²';
            }
            if (m2 < 10000) return nf(m2, 0) + ' m²';
            if (m2 < 1e8) return nf(m2 / 10000, 4) + ' ha';
            return nf(m2 / 1e6, 2) + ' km²';
        },
        hectares(m2) {
            return nf(m2 / 10000, 4) + ' ha';
        },
        angle(deg) {
            return nf(deg, 1) + '°';
        }
    };
}
