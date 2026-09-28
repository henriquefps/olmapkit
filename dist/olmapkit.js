/*! OLMapKit 0.1.0 | MIT | Henrique Silva, Axians Low Code | https://github.com/henriquefps/olmapkit */
var OLMapKit = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    MapKit: () => MapKit,
    basemaps: () => BASEMAP_PRESETS,
    computeBreaks: () => computeBreaks,
    create: () => create,
    geo: () => ops_exports,
    palettes: () => PALETTES,
    version: () => version
  });

  // src/core/emitter.js
  var Emitter = class {
    constructor() {
      this._handlers = {};
    }
    on(type, fn) {
      (this._handlers[type] || (this._handlers[type] = [])).push(fn);
      return () => this.off(type, fn);
    }
    once(type, fn) {
      const off = this.on(type, (payload) => {
        off();
        fn(payload);
      });
      return off;
    }
    off(type, fn) {
      const list = this._handlers[type];
      if (!list) return;
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    }
    emit(type, payload) {
      const call = (fn, args) => {
        try {
          fn.apply(null, args);
        } catch (e) {
          console.error('[OLMapKit] handler for "' + type + '" failed', e);
        }
      };
      (this._handlers[type] || []).slice().forEach((fn) => call(fn, [payload]));
      (this._handlers["*"] || []).slice().forEach((fn) => call(fn, [type, payload]));
    }
  };

  // src/core/css.js
  var CSS = `
.olmk{--olmk-primary:#2e7d32;--olmk-primary-contrast:#fff;--olmk-danger:#c62828;--olmk-bg:#fff;--olmk-fg:#1d2330;--olmk-muted:#5f6b7a;--olmk-border:#dde2e8;--olmk-radius:10px;--olmk-shadow:0 1px 4px rgba(0,0,0,.3);--olmk-font:system-ui,-apple-system,"Segoe UI",Roboto,"Open Sans",sans-serif;font-family:var(--olmk-font);-webkit-tap-highlight-color:transparent}
.olmk .ol-viewport{touch-action:none}
.olmk-corner{position:absolute;z-index:6;display:flex;flex-direction:column;gap:8px;pointer-events:none}
.olmk-corner>*{pointer-events:auto}
.olmk-tr{top:8px;right:8px;align-items:flex-end}
.olmk-tl{top:8px;left:8px;align-items:flex-start}
.olmk-bl{bottom:28px;left:8px;align-items:flex-start}
.olmk-br{bottom:28px;right:8px;align-items:flex-end}
.olmk-btn{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border:0;border-radius:var(--olmk-radius);background:var(--olmk-bg);color:var(--olmk-fg);box-shadow:var(--olmk-shadow);cursor:pointer;padding:0;touch-action:manipulation}
.olmk-btn svg{width:22px;height:22px;fill:currentColor}
.olmk-btn:hover{background:#f2f4f7}
.olmk-btn.is-active{background:var(--olmk-primary);color:var(--olmk-primary-contrast)}
.olmk-btn:disabled{opacity:.45;cursor:default}
.olmk .ol-zoom{top:8px;left:8px}
.olmk .ol-zoom button,.olmk .ol-full-screen button{width:40px;height:40px;border-radius:var(--olmk-radius);background:var(--olmk-bg);color:var(--olmk-fg);font-size:22px;box-shadow:var(--olmk-shadow);margin:0 0 8px}
.olmk .ol-zoom,.olmk .ol-full-screen{background:none;padding:0}
.olmk .ol-zoom .ol-zoom-in{border-radius:var(--olmk-radius)}
.olmk .ol-scale-line{bottom:8px;left:8px;background:rgba(29,35,48,.6)}
.olmk .ol-attribution{bottom:0;right:0;border-radius:6px 0 0 0}
.olmk-hud{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:5;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;max-width:calc(100% - 112px)}
.olmk-narrow .olmk-hud{top:56px}
.olmk-pill{background:rgba(0,0,0,.74);color:#fff;border-radius:16px;padding:6px 14px;font-size:14px;white-space:nowrap}
.olmk-pill:empty{display:none}
.olmk-pill b{font-weight:700}
.olmk-msg{background:#fff3cd;color:#664d03;border:1px solid #ffe69c;border-radius:8px;padding:6px 10px;font-size:13px;text-align:center}
.olmk-msg.is-error{background:#f8d7da;color:#842029;border-color:#f1aeb5}
.olmk-msg:empty{display:none}
.olmk-bar{position:absolute;left:8px;right:8px;bottom:28px;z-index:5;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}
.olmk-narrow .olmk-bar{right:56px}
.olmk-hint{background:rgba(255,255,255,.94);color:var(--olmk-fg);border-radius:8px;padding:6px 10px;font-size:12px;text-align:center;max-width:520px;box-shadow:var(--olmk-shadow)}
.olmk-hint:empty{display:none}
.olmk-buttons{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;pointer-events:auto}
.olmk-buttons button{min-height:44px;min-width:44px;padding:0 16px;border-radius:22px;border:0;font:600 14px var(--olmk-font);background:var(--olmk-bg);color:var(--olmk-fg);box-shadow:var(--olmk-shadow);cursor:pointer;touch-action:manipulation}
.olmk-buttons button.is-primary{background:var(--olmk-primary);color:var(--olmk-primary-contrast)}
.olmk-buttons button.is-danger{background:var(--olmk-danger);color:#fff}
.olmk-buttons button:disabled{opacity:.45;cursor:default}
.olmk-buttons button[hidden]{display:none}
.olmk-panel{position:absolute;pointer-events:auto;z-index:8;top:8px;right:56px;bottom:28px;width:320px;max-width:calc(100% - 72px);display:flex;flex-direction:column;background:var(--olmk-bg);color:var(--olmk-fg);border-radius:var(--olmk-radius);box-shadow:0 4px 20px rgba(0,0,0,.25);overflow:hidden;font-size:14px}
.olmk-narrow .olmk-panel{top:auto;left:0;right:0;bottom:0;width:auto;max-width:none;max-height:62%;border-radius:16px 16px 0 0}
.olmk-panel-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px 10px 16px;border-bottom:1px solid var(--olmk-border);font-weight:700}
.olmk-panel-head button{border:0;background:none;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--olmk-fg)}
.olmk-panel-head button svg{width:20px;height:20px;fill:currentColor}
.olmk-panel-body{overflow:auto;padding:8px 16px 16px}
.olmk-section{margin:10px 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--olmk-muted)}
.olmk-row{display:flex;align-items:center;gap:8px;padding:6px 0}
.olmk-row label{display:flex;align-items:center;gap:8px;flex:1;min-width:0;cursor:pointer}
.olmk-row label span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.olmk-row input[type=radio],.olmk-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--olmk-primary)}
.olmk-layer{border-bottom:1px solid var(--olmk-border);padding:4px 0 8px}
.olmk-layer:last-child{border-bottom:0}
.olmk-layer-tools{display:flex;align-items:center;gap:4px;padding-left:26px}
.olmk-layer-tools input[type=range]{flex:1;accent-color:var(--olmk-primary)}
.olmk-icon-btn{border:0;background:none;width:32px;height:32px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--olmk-muted)}
.olmk-icon-btn:hover{background:#f2f4f7;color:var(--olmk-fg)}
.olmk-icon-btn svg{width:18px;height:18px;fill:currentColor}
.olmk-legend{padding:4px 0 0 26px}
.olmk-legend img{max-width:100%}
.olmk-legend-item{display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 0}
.olmk-swatch{width:14px;height:14px;border-radius:3px;border:1px solid rgba(0,0,0,.2);flex:none}
.olmk-popup{position:relative;min-width:180px;max-width:280px;background:var(--olmk-bg);color:var(--olmk-fg);border-radius:var(--olmk-radius);box-shadow:0 4px 16px rgba(0,0,0,.3);padding:10px 12px;font-size:13px;transform:translateY(-12px)}
.olmk-popup:after{content:"";position:absolute;left:50%;bottom:-8px;margin-left:-8px;border:8px solid transparent;border-bottom:0;border-top-color:var(--olmk-bg)}
.olmk-popup-close{position:absolute;top:2px;right:2px;border:0;background:none;width:28px;height:28px;cursor:pointer;font-size:18px;color:var(--olmk-muted)}
.olmk-popup h4{margin:0 22px 4px 0;font-size:14px}
.olmk-popup table{border-collapse:collapse;width:100%}
.olmk-popup td{padding:2px 4px;border-top:1px solid var(--olmk-border);vertical-align:top;word-break:break-word}
.olmk-popup td:first-child{color:var(--olmk-muted);white-space:nowrap}
.olmk-popup-body{max-height:220px;overflow:auto}
.olmk-tooltip{background:rgba(29,35,48,.9);color:#fff;border-radius:6px;padding:4px 8px;font-size:12px;white-space:nowrap;pointer-events:none;transform:translateY(-8px)}
.olmk-measure-tip{background:rgba(0,0,0,.74);color:#fff;border-radius:6px;padding:3px 8px;font-size:12px;white-space:nowrap;pointer-events:none}
.olmk-toast{position:absolute;left:50%;bottom:72px;transform:translateX(-50%);z-index:9;background:rgba(29,35,48,.92);color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;max-width:calc(100% - 32px);text-align:center;pointer-events:none;transition:opacity .2s}
.olmk-search{position:absolute;pointer-events:auto;z-index:7;top:8px;left:56px;width:340px;max-width:calc(100% - 120px)}
.olmk-search form{display:flex;background:var(--olmk-bg);border-radius:var(--olmk-radius);box-shadow:var(--olmk-shadow);overflow:hidden}
.olmk-search input{flex:1;min-width:0;border:0;padding:0 12px;height:40px;font:14px var(--olmk-font);outline:none;background:transparent;color:var(--olmk-fg)}
.olmk-search button{border:0;background:none;width:40px;height:40px;cursor:pointer;color:var(--olmk-muted);display:flex;align-items:center;justify-content:center}
.olmk-search button svg{width:20px;height:20px;fill:currentColor}
.olmk-search ul{list-style:none;margin:6px 0 0;padding:4px 0;background:var(--olmk-bg);border-radius:var(--olmk-radius);box-shadow:var(--olmk-shadow);max-height:260px;overflow:auto}
.olmk-search ul:empty{display:none}
.olmk-search li{padding:8px 12px;font-size:13px;cursor:pointer;line-height:1.3}
.olmk-search li:hover,.olmk-search li.is-active{background:#f2f4f7}
.olmk-search li.is-info{color:var(--olmk-muted);cursor:default}
.olmk-swipe{position:absolute;z-index:4;top:0;bottom:0;width:0;pointer-events:none}
.olmk-swipe:before{content:"";position:absolute;top:0;bottom:0;left:-1px;width:2px;background:#fff;box-shadow:0 0 4px rgba(0,0,0,.5)}
.olmk-swipe-handle{position:absolute;top:50%;left:-20px;width:40px;height:40px;margin-top:-20px;border-radius:50%;background:var(--olmk-bg);box-shadow:var(--olmk-shadow);pointer-events:auto;cursor:ew-resize;display:flex;align-items:center;justify-content:center;touch-action:none;font-weight:700;color:var(--olmk-fg);user-select:none}
.olmk-time{position:absolute;pointer-events:auto;z-index:5;left:50%;transform:translateX(-50%);bottom:28px;width:420px;max-width:calc(100% - 16px);display:flex;align-items:center;gap:10px;background:var(--olmk-bg);border-radius:var(--olmk-radius);box-shadow:var(--olmk-shadow);padding:6px 12px}
.olmk-time button{border:0;background:var(--olmk-primary);color:var(--olmk-primary-contrast);width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}
.olmk-time button svg{width:20px;height:20px;fill:currentColor}
.olmk-time input{flex:1;accent-color:var(--olmk-primary)}
.olmk-time output{font-size:13px;font-weight:600;min-width:84px;text-align:right}
.olmk-drop{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;background:rgba(46,125,50,.18);border:3px dashed var(--olmk-primary);color:var(--olmk-fg);font-weight:700;pointer-events:none}
.olmk-drop.is-visible{display:flex}
.olmk-drop span{background:var(--olmk-bg);padding:10px 16px;border-radius:var(--olmk-radius);box-shadow:var(--olmk-shadow)}
.olmk-overlay-msg{position:absolute;inset:0;z-index:9;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);color:#fff;font-size:16px;text-align:center;padding:20px;pointer-events:none}
.olmk-overlay-msg.is-visible{display:flex}
.olmk-loupe{position:absolute;z-index:9;width:120px;height:120px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45);overflow:hidden;pointer-events:none;display:none;background:#ccc}
.olmk-loupe canvas{width:100%;height:100%;display:block}
.olmk-loupe:after{content:"";position:absolute;left:50%;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border:2px solid #2e7d32;border-radius:50%;box-shadow:0 0 0 1px #fff}
.olmk-dragbox{border:2px solid var(--olmk-primary);background:rgba(46,125,50,.15)}
`;
  function injectCss() {
    if (document.getElementById("olmk-style")) return;
    const style = document.createElement("style");
    style.id = "olmk-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // src/core/i18n.js
  var en = {
    // generic
    close: "Close",
    layers: "Layers",
    basemaps: "Base map",
    overlays: "Layers",
    opacity: "Opacity",
    zoomTo: "Zoom to layer",
    moveUp: "Move up",
    moveDown: "Move down",
    legend: "Legend",
    noLayers: "No layers yet.",
    fitAll: "Show everything",
    ctrlScroll: "Use Ctrl + scroll to zoom the map",
    // markers
    markers: "Markers",
    // draw (polygon editor)
    usefulArea: "Useful area",
    area: "Area",
    length: "Length",
    hintDrawTouch: "Tap the map to add points. Drag a point or a + to adjust. Use two fingers to move the map.",
    hintDrawMouse: "Click to add points. Drag a point or a + to adjust. Double-click to finish.",
    hintEdit: "Drag the points or the + to adjust. Tap a point to select and remove it.",
    hintLine: "Tap or click to add points. Double-tap or Finish to end the line.",
    hintPoint: "Tap or click the map to place the point.",
    hintSplit: "Draw a line across a polygon to split it.",
    undo: "Undo",
    clear: "Clear",
    finish: "Finish",
    resume: "Add points",
    removePoint: "Remove point",
    redraw: "Redraw",
    gpsPoint: "Point here (GPS)",
    minPoints: "At least 3 points are required.",
    selfIntersect: "The polygon edges cross each other. Adjust the points.",
    multi: "The drawing creates several separate areas. Adjust the points.",
    empty: "The drawing is outside the available area.",
    noBase: "Could not find the area to draw in.",
    tooSmall: "The area is below the minimum allowed.",
    // measure
    measure: "Measure",
    measureDistance: "Distance",
    measureArea: "Area",
    measureAzimuth: "Bearing",
    measureClear: "Clear",
    perimeter: "Perimeter",
    hintMeasure: "Tap or click to add points. Double-tap to finish.",
    // query
    search: "Search",
    searchPlaceholder: "Search an address or place",
    searchNoResults: "No results.",
    searching: "Searching\u2026",
    featureInfo: "Information",
    noInfo: "Nothing found here.",
    selectBox: "Select by rectangle",
    selectPolygon: "Select by polygon",
    selected: "Selected",
    // io
    importFile: "Import file",
    importDrop: "Drop GeoJSON, KML, GPX or a zipped shapefile on the map",
    imported: "Imported {count} features",
    importFailed: "Could not read the file.",
    exportData: "Export",
    print: "Print",
    printTitle: "Map",
    // geolocation
    locate: "My location",
    locating: "Finding your location\u2026",
    locationError: "Location unavailable.",
    accuracy: "Accuracy",
    trackStart: "Record track",
    trackStop: "Stop recording",
    // offline
    offline: "Offline",
    offlineSaving: "Saving map for offline use\u2026 {done}/{total}",
    offlineSaved: "Map saved for offline use ({count} tiles).",
    offlineTooMany: "Too many tiles ({count}). Zoom in or lower the max zoom.",
    offlineNotAllowed: "This base map does not allow offline download.",
    // viz
    timePlay: "Play",
    timePause: "Pause",
    // compare
    compare: "Compare"
  };
  var pt = {
    close: "Fechar",
    layers: "Camadas",
    basemaps: "Mapa base",
    overlays: "Camadas",
    opacity: "Opacidade",
    zoomTo: "Aproximar \xE0 camada",
    moveUp: "Subir",
    moveDown: "Descer",
    legend: "Legenda",
    noLayers: "Ainda n\xE3o h\xE1 camadas.",
    fitAll: "Mostrar tudo",
    ctrlScroll: "Use Ctrl + scroll para aplicar zoom no mapa",
    markers: "Marcadores",
    usefulArea: "\xC1rea \xFAtil",
    area: "\xC1rea",
    length: "Comprimento",
    hintDrawTouch: "Toque no mapa para adicionar pontos. Arraste um ponto ou um + para ajustar. Use dois dedos para mover o mapa.",
    hintDrawMouse: "Clique para adicionar pontos. Arraste um ponto ou um + para ajustar. Duplo clique para terminar.",
    hintEdit: "Arraste os pontos ou os + para ajustar. Toque num ponto para o selecionar e remover.",
    hintLine: "Toque ou clique para adicionar pontos. Duplo toque ou Terminar para acabar a linha.",
    hintPoint: "Toque ou clique no mapa para colocar o ponto.",
    hintSplit: "Desenhe uma linha a atravessar um pol\xEDgono para o dividir.",
    undo: "Desfazer",
    clear: "Limpar",
    finish: "Terminar",
    resume: "Adicionar pontos",
    removePoint: "Remover ponto",
    redraw: "Redesenhar",
    gpsPoint: "Ponto aqui (GPS)",
    minPoints: "S\xE3o necess\xE1rios pelo menos 3 pontos.",
    selfIntersect: "As linhas do pol\xEDgono cruzam-se. Ajuste os pontos.",
    multi: "O desenho gera v\xE1rias \xE1reas separadas. Ajuste os pontos.",
    empty: "O desenho est\xE1 fora da \xE1rea dispon\xEDvel.",
    noBase: "N\xE3o foi poss\xEDvel identificar a \xE1rea onde desenhar.",
    tooSmall: "A \xE1rea \xE9 inferior ao m\xEDnimo permitido.",
    measure: "Medir",
    measureDistance: "Dist\xE2ncia",
    measureArea: "\xC1rea",
    measureAzimuth: "Rumo",
    measureClear: "Limpar",
    perimeter: "Per\xEDmetro",
    hintMeasure: "Toque ou clique para adicionar pontos. Duplo toque para terminar.",
    search: "Pesquisar",
    searchPlaceholder: "Pesquisar morada ou local",
    searchNoResults: "Sem resultados.",
    searching: "A pesquisar\u2026",
    featureInfo: "Informa\xE7\xE3o",
    noInfo: "Nada encontrado aqui.",
    selectBox: "Selecionar por ret\xE2ngulo",
    selectPolygon: "Selecionar por pol\xEDgono",
    selected: "Selecionados",
    importFile: "Importar ficheiro",
    importDrop: "Largue GeoJSON, KML, GPX ou um shapefile em zip no mapa",
    imported: "{count} elementos importados",
    importFailed: "N\xE3o foi poss\xEDvel ler o ficheiro.",
    exportData: "Exportar",
    print: "Imprimir",
    printTitle: "Mapa",
    locate: "A minha localiza\xE7\xE3o",
    locating: "A obter a localiza\xE7\xE3o\u2026",
    locationError: "Localiza\xE7\xE3o indispon\xEDvel.",
    accuracy: "Precis\xE3o",
    trackStart: "Gravar percurso",
    trackStop: "Parar grava\xE7\xE3o",
    offline: "Offline",
    offlineSaving: "A guardar o mapa para uso offline\u2026 {done}/{total}",
    offlineSaved: "Mapa guardado para uso offline ({count} tiles).",
    offlineTooMany: "Demasiados tiles ({count}). Aproxime o mapa ou baixe o zoom m\xE1ximo.",
    offlineNotAllowed: "Este mapa base n\xE3o permite download offline.",
    timePlay: "Reproduzir",
    timePause: "Pausa",
    compare: "Comparar"
  };
  var LOCALES = { en, pt, "pt-PT": pt, "pt-BR": pt };
  function createLabels(locale, overrides) {
    const lang = LOCALES[locale] || LOCALES[String(locale || "").split("-")[0]] || en;
    const labels = Object.assign({}, en, lang, overrides || {});
    const t = (key, vars) => {
      let s = labels[key] != null ? String(labels[key]) : key;
      if (vars) Object.keys(vars).forEach((k) => {
        s = s.split("{" + k + "}").join(vars[k]);
      });
      return s;
    };
    return { labels, t };
  }
  function createFormatter(locale, units) {
    const nf = (v, d) => v.toLocaleString(locale || "en", { minimumFractionDigits: d, maximumFractionDigits: d });
    const imperial = units === "imperial";
    return {
      number: nf,
      length(m) {
        if (imperial) {
          const ft = m * 3.28084;
          return ft < 5280 ? nf(ft, 0) + " ft" : nf(ft / 5280, 2) + " mi";
        }
        return m < 1e3 ? nf(m, m < 10 ? 2 : 1) + " m" : nf(m / 1e3, 2) + " km";
      },
      area(m2) {
        if (imperial) {
          const ac = m2 / 4046.8564224;
          return ac < 640 ? nf(ac, 2) + " ac" : nf(ac / 640, 2) + " mi\xB2";
        }
        if (m2 < 1e4) return nf(m2, 0) + " m\xB2";
        if (m2 < 1e8) return nf(m2 / 1e4, 4) + " ha";
        return nf(m2 / 1e6, 2) + " km\xB2";
      },
      hectares(m2) {
        return nf(m2 / 1e4, 4) + " ha";
      },
      angle(deg) {
        return nf(deg, 1) + "\xB0";
      }
    };
  }

  // src/core/ui.js
  var ICONS = {
    layers: "M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z",
    locate: "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z",
    search: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",
    ruler: "M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 10H3V8h2v4h2V8h2v4h2V8h2v4h2V8h2v4h2V8h2v8z",
    print: "M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z",
    upload: "M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z",
    download: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    play: "M8 5v14l11-7z",
    pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
    info: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    fullscreen: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
    fit: "M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6z",
    up: "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z",
    down: "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z",
    zoomTo: "M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z",
    area: "M3 3h6v2H5v4H3V3zm12 0h6v6h-2V5h-4V3zM3 15h2v4h4v2H3v-6zm16 4h-4v2h6v-6h-2v4z",
    compass: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
    offline: "M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z",
    select: "M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2z"
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONS[name] || ICONS.info) + '"/></svg>';
  }
  function el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach((k) => {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    if (html != null) e.innerHTML = html;
    return e;
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  var UI = class {
    constructor(kit) {
      this.kit = kit;
      this.root = kit.olMap.getOverlayContainerStopEvent();
      this.corners = {};
      this.panelEl = null;
      this._toastTimer = null;
      this._order = [];
      const update = () => {
        const w = kit.el.clientWidth;
        kit.el.classList.toggle("olmk-narrow", w > 0 && w < 600);
      };
      update();
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(update);
        this._ro.observe(kit.el);
      }
    }
    corner(pos) {
      if (!this.corners[pos]) {
        const c = el("div", { class: "olmk-corner olmk-" + pos });
        this.root.appendChild(c);
        this.corners[pos] = c;
      }
      return this.corners[pos];
    }
    // Adds a round button to a corner. `order` keeps a stable order between modules.
    button(opts) {
      const b = el("button", { type: "button", class: "olmk-btn", title: opts.title || "", "aria-label": opts.title || "" }, svg(opts.icon));
      if (opts.id) b.dataset.olmk = opts.id;
      b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        opts.onClick && opts.onClick(e);
      });
      const corner = this.corner(opts.position || "tr");
      const order = opts.order != null ? opts.order : 50;
      b.dataset.order = order;
      const after = Array.prototype.find.call(corner.children, (c) => Number(c.dataset.order || 50) > order);
      corner.insertBefore(b, after || null);
      return {
        el: b,
        setActive: (on) => b.classList.toggle("is-active", !!on),
        remove: () => b.remove()
      };
    }
    // One side panel at a time (bottom sheet on narrow maps)
    panel(opts) {
      this.closePanel();
      const p = el("div", { class: "olmk-panel", role: "dialog" });
      const head = el("div", { class: "olmk-panel-head" });
      head.appendChild(el("span", { text: opts.title || "" }));
      const close = el("button", { type: "button", title: this.kit.t("close"), "aria-label": this.kit.t("close") }, svg("close"));
      close.addEventListener("click", () => this.closePanel());
      head.appendChild(close);
      const body = el("div", { class: "olmk-panel-body" });
      p.appendChild(head);
      p.appendChild(body);
      this.root.appendChild(p);
      this.panelEl = p;
      this._panelOnClose = opts.onClose;
      this.panelId = opts.id || null;
      return { el: p, body, close: () => this.closePanel() };
    }
    closePanel() {
      if (!this.panelEl) return;
      this.panelEl.remove();
      this.panelEl = null;
      const cb = this._panelOnClose;
      this._panelOnClose = null;
      this.panelId = null;
      if (cb) cb();
    }
    toast(msg, ms) {
      if (!this._toast) {
        this._toast = el("div", { class: "olmk-toast" });
        this.root.appendChild(this._toast);
      }
      const t = this._toast;
      t.textContent = msg;
      t.style.opacity = "1";
      t.hidden = false;
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        t.style.opacity = "0";
        setTimeout(() => {
          t.hidden = true;
        }, 200);
      }, ms || 3e3);
    }
    // Popup anchored to a map coordinate (map projection)
    popup(coordinate, html, opts) {
      this.closePopup();
      const box = el("div", { class: "olmk-popup" });
      const close = el("button", { type: "button", class: "olmk-popup-close", "aria-label": this.kit.t("close") }, "\xD7");
      close.addEventListener("click", () => this.closePopup());
      box.appendChild(close);
      const body = el("div", { class: "olmk-popup-body" }, html);
      box.appendChild(body);
      const overlay = new ol.Overlay({
        element: box,
        position: coordinate,
        positioning: "bottom-center",
        stopEvent: true,
        autoPan: { animation: { duration: 250 }, margin: 60 }
      });
      this.kit.olMap.addOverlay(overlay);
      this._popup = overlay;
      this._popupOnClose = opts && opts.onClose;
      return { overlay, body, close: () => this.closePopup() };
    }
    closePopup() {
      if (!this._popup) return;
      this.kit.olMap.removeOverlay(this._popup);
      this._popup = null;
      const cb = this._popupOnClose;
      this._popupOnClose = null;
      if (cb) cb();
    }
    // HUD (top pill + message) and bottom bar (hint + buttons) for interactive tools
    toolbar(buttons) {
      const target = this.kit.el;
      const hud = el("div", { class: "olmk-hud" }, '<div class="olmk-pill"></div><div class="olmk-msg"></div>');
      const bar = el("div", { class: "olmk-bar" }, '<div class="olmk-hint"></div><div class="olmk-buttons"></div>');
      const wrap = bar.querySelector(".olmk-buttons");
      const btn = {};
      (buttons || []).forEach((b) => {
        const e = el("button", { type: "button", "data-a": b.id, class: b.kind ? "is-" + b.kind : "" });
        e.textContent = b.label;
        e.addEventListener("click", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          b.onClick();
        });
        wrap.appendChild(e);
        btn[b.id] = e;
      });
      this.kit.olMap.getOverlayContainerStopEvent().appendChild(bar);
      target.querySelector(".ol-viewport").appendChild(hud);
      return {
        hud,
        bar,
        btn,
        pill: hud.querySelector(".olmk-pill"),
        msg: hud.querySelector(".olmk-msg"),
        hint: bar.querySelector(".olmk-hint"),
        destroy() {
          hud.remove();
          bar.remove();
        }
      };
    }
    destroy() {
      if (this._ro) this._ro.disconnect();
      this.closePanel();
      this.closePopup();
      Object.keys(this.corners).forEach((k) => this.corners[k].remove());
    }
  };
  function downloadFile(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1e3);
  }

  // src/core/loader.js
  function makeImageLoader(kit, options) {
    const headers = options && options.headers || null;
    const cacheKey = options && options.cacheKey;
    return function(imageWrapper, src) {
      const image = imageWrapper.getImage();
      const done = (blob) => {
        const url = URL.createObjectURL(blob);
        image.onload = image.onerror = () => URL.revokeObjectURL(url);
        image.src = url;
      };
      const fail = () => {
        image.src = "";
        if (imageWrapper.setState) imageWrapper.setState(3);
      };
      const load = () => fetch(src, headers ? { headers } : void 0).then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.blob();
      });
      const offline = kit.offline;
      if (cacheKey && offline && offline.enabled) {
        offline.getTile(cacheKey, src).then((cached) => {
          if (cached) return done(cached);
          return load().then((blob) => {
            done(blob);
            offline.putTile(cacheKey, src, blob);
          });
        }).catch(fail);
      } else {
        load().then(done).catch(fail);
      }
    };
  }

  // src/core/basemaps.js
  var OSM_ATTR = '\xA9 <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
  var ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/";
  var BASEMAP_PRESETS = {
    osm: { title: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attributions: OSM_ATTR, maxZoom: 19, offline: false },
    streets: { title: "Streets (Esri)", url: ESRI + "World_Street_Map/MapServer/tile/{z}/{y}/{x}", attributions: "Tiles \xA9 Esri \u2014 Esri, HERE, Garmin, OpenStreetMap contributors, and the GIS user community", maxZoom: 19 },
    light: { title: "Light gray (Esri)", url: ESRI + "Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "Tiles \xA9 Esri \u2014 Esri, HERE, Garmin, OpenStreetMap contributors", maxZoom: 16 },
    dark: { title: "Dark gray (Esri)", url: ESRI + "Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", attributions: "Tiles \xA9 Esri \u2014 Esri, HERE, Garmin, OpenStreetMap contributors", maxZoom: 16 },
    imagery: { title: "Satellite (Esri)", url: ESRI + "World_Imagery/MapServer/tile/{z}/{y}/{x}", attributions: "Tiles \xA9 Esri \u2014 Esri, Maxar, Earthstar Geographics, and the GIS User Community", maxZoom: 19 },
    topo: { title: "Topographic (Esri)", url: ESRI + "World_Topo_Map/MapServer/tile/{z}/{y}/{x}", attributions: "Tiles \xA9 Esri", maxZoom: 19 },
    terrain: { title: "Terrain (OpenTopoMap)", url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png", attributions: OSM_ATTR + ', SRTM | \xA9 <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA)', maxZoom: 17, offline: false },
    none: { title: "None", type: "none" }
  };
  var Basemaps = class {
    constructor(kit, options) {
      this.kit = kit;
      this.defs = {};
      this.order = [];
      this.current = null;
      this.layer = null;
      const ids = options.basemaps || ["streets", "imagery", "topo", "light", "dark", "osm"];
      ids.forEach((item) => this.add(typeof item === "string" ? Object.assign({ id: item }, BASEMAP_PRESETS[item]) : item));
      this.set(options.basemap || this.order[0] || "streets");
    }
    add(def) {
      if (!def || !def.id) return;
      const preset = BASEMAP_PRESETS[def.id] || {};
      const d = Object.assign({}, preset, def);
      if (!this.defs[d.id]) this.order.push(d.id);
      this.defs[d.id] = d;
      this.kit.emit("basemapschange", this.list());
    }
    list() {
      return this.order.map((id) => ({ id, title: this.defs[id].title || id, active: id === this.current }));
    }
    createSource(d) {
      const kit = this.kit;
      const type = d.type || "xyz";
      if (type === "none") return null;
      if (type === "wms") {
        return new ol.source.TileWMS({
          url: d.url,
          params: Object.assign({ TILED: true }, d.params || {}),
          crossOrigin: "anonymous",
          attributions: d.attributions,
          tileLoadFunction: makeImageLoader(kit, { headers: d.headers, cacheKey: "basemap:" + d.id })
        });
      }
      if (type === "wmts" && d.source) return d.source;
      return new ol.source.XYZ({
        url: d.url,
        attributions: d.attributions,
        maxZoom: d.maxZoom || 19,
        crossOrigin: "anonymous",
        tileLoadFunction: makeImageLoader(kit, { headers: d.headers, cacheKey: "basemap:" + d.id })
      });
    }
    set(id) {
      const d = this.defs[id];
      if (!d) return false;
      const map = this.kit.olMap;
      if (this.layer) map.removeLayer(this.layer);
      const source = this.createSource(d);
      this.layer = source ? new ol.layer.Tile({ source, zIndex: -100, preload: 1 }) : null;
      if (this.layer) {
        this.layer.set("olmkBasemap", true);
        map.getLayers().insertAt(0, this.layer);
      }
      this.current = id;
      this.kit.emit("basemapchange", { id, title: d.title || id });
      return true;
    }
    get() {
      return this.current ? Object.assign({ id: this.current }, this.defs[this.current]) : null;
    }
  };

  // src/core/style.js
  var DEFAULT_STYLE = {
    stroke: "#1e88e5",
    width: 2,
    fill: "rgba(30,136,229,0.18)",
    radius: 6,
    pointFill: "#1e88e5",
    labelColor: "#1d2330",
    labelHalo: "#ffffff",
    font: "600 12px system-ui, sans-serif"
  };
  function withAlpha(color, alpha) {
    const c = ol.color.asArray(color).slice();
    c[3] = alpha;
    return "rgba(" + c.join(",") + ")";
  }
  function formatTemplate(tpl, props) {
    if (!tpl) return "";
    if (tpl.indexOf("{") < 0) return props[tpl] != null ? String(props[tpl]) : "";
    return tpl.replace(/\{([^}]+)\}/g, (m, k) => props[k] != null ? String(props[k]) : "");
  }
  function themeColor(spec, props) {
    if (!spec.type || !spec.property) return null;
    const v = props[spec.property];
    if (spec.type === "categories") {
      const values = spec.values || {};
      return values[v] != null ? values[v] : spec.default || null;
    }
    if (spec.type === "ranges") {
      const n = Number(v);
      if (!isFinite(n)) return spec.default || null;
      const breaks = spec.breaks || [];
      let i = 0;
      while (i < breaks.length && n >= breaks[i]) i++;
      const colors = spec.colors || [];
      return colors[Math.min(i, colors.length - 1)] || spec.default || null;
    }
    return null;
  }
  function proportionalRadius(spec, props) {
    const v = Number(props[spec.property]);
    if (!isFinite(v)) return spec.minRadius || 4;
    const min = spec.min != null ? spec.min : 0;
    const max = spec.max != null ? spec.max : 1;
    const t = max > min ? Math.max(0, Math.min(1, (v - min) / (max - min))) : 0;
    const r0 = spec.minRadius || 4;
    const r1 = spec.maxRadius || 30;
    return r0 + (r1 - r0) * Math.sqrt(t);
  }
  function makeStyleFunction(input, options) {
    const spec = Object.assign({}, DEFAULT_STYLE, input || {});
    const opts = options || {};
    const cache = {};
    return function(feature, resolution) {
      if (opts.filter && !opts.filter(feature)) return null;
      const props = feature.getProperties();
      const color = themeColor(spec, props);
      const fillOpacity = spec.fillOpacity != null ? spec.fillOpacity : 0.45;
      const stroke = color ? spec.themeStroke || color : spec.stroke;
      const fill = color ? withAlpha(color, fillOpacity) : spec.fill;
      const pointFill = color || spec.pointFill;
      const radius = spec.type === "proportional" ? proportionalRadius(spec, props) : spec.radius;
      const label = spec.label && (!spec.minZoomLabel || opts.zoomForResolution && opts.zoomForResolution(resolution) >= spec.minZoomLabel) ? formatTemplate(spec.label, props) : "";
      const key = [stroke, fill, pointFill, Math.round(radius * 10), label].join("|");
      if (cache[key]) return cache[key];
      const strokeStyle = new ol.style.Stroke({ color: stroke, width: spec.width, lineDash: spec.lineDash });
      let image;
      if (spec.icon && spec.icon.src) {
        image = new ol.style.Icon({
          src: spec.icon.src,
          scale: spec.icon.scale || 1,
          anchor: spec.icon.anchor || [0.5, 1],
          crossOrigin: "anonymous"
        });
      } else {
        image = new ol.style.Circle({
          radius,
          fill: new ol.style.Fill({ color: spec.type === "proportional" ? withAlpha(spec.color || pointFill, 0.6) : pointFill }),
          stroke: new ol.style.Stroke({ color: "#ffffff", width: 1.5 })
        });
      }
      const style = new ol.style.Style({
        stroke: strokeStyle,
        fill: new ol.style.Fill({ color: fill }),
        image,
        text: label ? new ol.style.Text({
          text: label,
          font: spec.font,
          fill: new ol.style.Fill({ color: spec.labelColor }),
          stroke: new ol.style.Stroke({ color: spec.labelHalo, width: 3 }),
          overflow: true,
          offsetY: spec.icon ? -28 : 0
        }) : void 0,
        zIndex: spec.zIndex
      });
      const keys = Object.keys(cache);
      if (keys.length > 500) delete cache[keys[0]];
      cache[key] = style;
      return style;
    };
  }
  function legendEntries(spec) {
    if (!spec || !spec.type) return [];
    if (spec.type === "categories") {
      return Object.keys(spec.values || {}).map((k) => ({ label: k, color: spec.values[k] }));
    }
    if (spec.type === "ranges") {
      const b = spec.breaks || [];
      const fmt = (v) => Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100;
      return (spec.colors || []).map((c, i) => ({
        color: c,
        label: i === 0 ? "< " + fmt(b[0]) : i >= b.length ? "\u2265 " + fmt(b[b.length - 1]) : fmt(b[i - 1]) + " \u2013 " + fmt(b[i])
      }));
    }
    return [];
  }
  function compileFilter(filter) {
    if (!filter) return null;
    if (typeof filter === "function") return filter;
    const list = Array.isArray(filter) ? filter : [filter];
    const tests = list.map((f) => {
      const op = f.op || "=";
      const val = f.value;
      return (feature) => {
        const v = feature.get(f.property);
        switch (op) {
          case "=":
          case "==":
            return v == val;
          // eslint-disable-line eqeqeq
          case "!=":
            return v != val;
          // eslint-disable-line eqeqeq
          case ">":
            return Number(v) > Number(val);
          case ">=":
            return Number(v) >= Number(val);
          case "<":
            return Number(v) < Number(val);
          case "<=":
            return Number(v) <= Number(val);
          case "in":
            return Array.isArray(val) && val.indexOf(v) >= 0;
          case "contains":
            return String(v == null ? "" : v).toLowerCase().indexOf(String(val).toLowerCase()) >= 0;
          case "between":
            return Number(v) >= Number(val[0]) && Number(v) <= Number(val[1]);
          default:
            return true;
        }
      };
    });
    return (feature) => tests.every((t) => t(feature));
  }
  function computeBreaks(values, classes, method) {
    const nums = values.map(Number).filter((v) => isFinite(v)).sort((a, b) => a - b);
    const n = Math.max(2, classes || 5);
    if (!nums.length) return [];
    const breaks = [];
    if (method === "equal") {
      const min = nums[0];
      const max = nums[nums.length - 1];
      for (let i = 1; i < n; i++) breaks.push(min + (max - min) * i / n);
    } else {
      for (let i = 1; i < n; i++) breaks.push(nums[Math.min(nums.length - 1, Math.floor(nums.length * i / n))]);
    }
    return breaks.filter((b, i) => i === 0 || b !== breaks[i - 1]);
  }
  var PALETTES = {
    greens: ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"],
    blues: ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"],
    reds: ["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"],
    viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
    spectral: ["#d7191c", "#fdae61", "#ffffbf", "#a6d96a", "#1a9641"],
    categorical: ["#1e88e5", "#e53935", "#43a047", "#fb8c00", "#8e24aa", "#00acc1", "#6d4c41", "#fdd835"]
  };
  function paletteFor(name, count) {
    const p = PALETTES[name] || PALETTES.blues;
    if (count === p.length) return p.slice();
    const out = [];
    for (let i = 0; i < count; i++) out.push(p[Math.round(i * (p.length - 1) / Math.max(1, count - 1))]);
    return out;
  }

  // src/modules/markers.js
  var pinCache = {};
  function pinIcon(color) {
    if (!pinCache[color]) {
      const svg2 = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1z" fill="' + color + '" stroke="#fff" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#fff"/></svg>';
      pinCache[color] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg2);
    }
    return pinCache[color];
  }
  function normalize(m) {
    const lon = m.lon != null ? m.lon : m.Longitude != null ? m.Longitude : m.lng;
    const lat = m.lat != null ? m.lat : m.Latitude;
    return Object.assign({}, m, {
      id: m.id != null ? String(m.id) : String(m.MarkerId != null ? m.MarkerId : Math.random().toString(36).slice(2)),
      lon: Number(lon),
      lat: Number(lat)
    });
  }
  var Markers = class {
    constructor(kit, options) {
      this.kit = kit;
      this.opts = Object.assign({
        cluster: true,
        clusterDistance: 40,
        focusZoom: 17,
        autoFocus: true,
        selectedScale: 1.35,
        color: "#e53935",
        tooltip: true,
        popup: false
      }, options);
      this._all = /* @__PURE__ */ new Map();
      this._filter = null;
      this.selectedId = null;
      this._styleCache = {};
      this.source = new ol.source.Vector();
      this.clusterSource = new ol.source.Cluster({ distance: this.opts.clusterDistance, source: this.source });
      this.layer = new ol.layer.Vector({
        source: this.opts.cluster ? this.clusterSource : this.source,
        style: (f, r) => this._style(f, r),
        zIndex: 60,
        updateWhileAnimating: true
      });
      this.layer.set("olmkInternal", "markers");
      kit.olMap.addLayer(this.layer);
      this._offClick = kit.addClickHandler((e) => this._onClick(e), 10);
      this._setupTooltip();
    }
    /* ---------------- data ---------------- */
    set(list) {
      this._all.clear();
      this.selectedId = null;
      const items = typeof list === "string" ? JSON.parse(list || "[]") : list || [];
      items.forEach((m) => {
        const n = normalize(m);
        if (isFinite(n.lon) && isFinite(n.lat)) this._all.set(n.id, n);
      });
      this._rebuild();
      this.kit.emit("markerschange", { count: this._all.size });
    }
    add(marker) {
      const n = normalize(marker);
      if (!isFinite(n.lon) || !isFinite(n.lat)) return null;
      this._all.set(n.id, n);
      this._rebuild();
      return n.id;
    }
    update(id, patch) {
      const m = this._all.get(String(id));
      if (!m) return false;
      this._all.set(m.id, normalize(Object.assign({}, m, patch, { id: m.id })));
      this._rebuild();
      return true;
    }
    remove(id) {
      const ok = this._all.delete(String(id));
      if (this.selectedId === String(id)) this.selectedId = null;
      this._rebuild();
      return ok;
    }
    clear() {
      this.set([]);
    }
    get(id) {
      return this._all.get(String(id)) || null;
    }
    list() {
      return Array.from(this._all.values());
    }
    // Hides markers that do not match (same filter syntax as layers.setFilter)
    setFilter(filter) {
      this._filter = filter ? compileFilter(typeof filter === "function" ? filter : filter) : null;
      this._rebuild();
    }
    setVisible(visible) {
      this.layer.setVisible(!!visible);
    }
    setClustering(on) {
      this.opts.cluster = !!on;
      this.layer.setSource(on ? this.clusterSource : this.source);
    }
    _rebuild() {
      const features = [];
      this._all.forEach((m) => {
        const f = new ol.Feature(Object.assign({}, m.data || {}, { geometry: new ol.geom.Point(this.kit.toMap([m.lon, m.lat])) }));
        f.setId(m.id);
        f.set("olmkMarker", m, true);
        if (this._filter && !this._filter(f)) return;
        features.push(f);
      });
      this.source.clear(true);
      this.source.addFeatures(features);
    }
    /* ---------------- style ---------------- */
    _style(feature) {
      const members = feature.get("features");
      if (members && members.length > 1) {
        const n = members.length;
        const key2 = "c" + n;
        if (!this._styleCache[key2]) {
          const radius = 14 + Math.min(14, Math.log2(n) * 3);
          this._styleCache[key2] = new ol.style.Style({
            image: new ol.style.Circle({
              radius,
              fill: new ol.style.Fill({ color: "rgba(46,125,50,0.88)" }),
              stroke: new ol.style.Stroke({ color: "rgba(255,255,255,0.9)", width: 3 })
            }),
            text: new ol.style.Text({
              text: String(n),
              font: "700 13px system-ui, sans-serif",
              fill: new ol.style.Fill({ color: "#fff" })
            })
          });
        }
        return this._styleCache[key2];
      }
      const f = members ? members[0] : feature;
      const m = f.get("olmkMarker");
      if (!m) return null;
      const selected = m.id === this.selectedId;
      const key = [m.icon || m.color || this.opts.color, m.iconScale || 1, selected, m.label || ""].join("|");
      if (!this._styleCache[key]) {
        const scale = (m.iconScale || 1) * (selected ? this.opts.selectedScale : 1);
        this._styleCache[key] = new ol.style.Style({
          image: new ol.style.Icon({
            src: m.icon || pinIcon(m.color || this.opts.color),
            anchor: m.iconAnchor || [0.5, 1],
            scale,
            crossOrigin: "anonymous"
          }),
          text: m.label ? new ol.style.Text({
            text: String(m.label),
            offsetY: 14,
            font: "600 12px system-ui, sans-serif",
            fill: new ol.style.Fill({ color: "#1d2330" }),
            stroke: new ol.style.Stroke({ color: "#fff", width: 3 })
          }) : void 0,
          zIndex: selected ? 1e3 : 0
        });
      }
      return this._styleCache[key];
    }
    /* ---------------- interaction ---------------- */
    _hit(pixel) {
      return this.kit.olMap.forEachFeatureAtPixel(pixel, (f) => f, { layerFilter: (l) => l === this.layer, hitTolerance: 4 });
    }
    _onClick(e) {
      if (!this.layer.getVisible()) return false;
      const hit = this._hit(e.pixel);
      if (!hit) return false;
      const members = hit.get("features") || [hit];
      if (members.length > 1) {
        const view = this.kit.olMap.getView();
        const extent = ol.extent.boundingExtent(members.map((f) => f.getGeometry().getCoordinates()));
        const ids = members.map((f) => f.getId());
        const canZoom = view.getZoom() < view.getMaxZoom() - 0.5 && ol.extent.getWidth(extent) > 0.01;
        this.kit.emit("clusterclick", { ids, count: ids.length });
        if (canZoom) this.kit.olMap.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 450, maxZoom: view.getMaxZoom() });
        return true;
      }
      const m = members[0].get("olmkMarker");
      this.select(m.id, { focus: this.opts.autoFocus });
      this.kit.emit("markerclick", { id: m.id, lon: m.lon, lat: m.lat, title: m.title || "", data: m.data || {} });
      if (this.opts.popup) this._showPopup(m);
      return true;
    }
    _showPopup(m) {
      let html = "<h4>" + escapeHtml(m.title || m.id) + "</h4>";
      if (m.description) html += "<div>" + escapeHtml(m.description) + "</div>";
      this.kit.ui.popup(this.kit.toMap([m.lon, m.lat]), html, { onClose: () => this.clearSelection() });
    }
    select(id, opts) {
      const m = this.get(id);
      if (!m) return false;
      this.selectedId = m.id;
      this.layer.changed();
      if (opts && opts.focus) this.focus(m.id, opts);
      this.kit.emit("markerselect", { id: m.id });
      return true;
    }
    // Deselects. With { fit: true } the view goes back to all markers.
    clearSelection(opts) {
      const had = this.selectedId;
      this.selectedId = null;
      this.layer.changed();
      if (had) this.kit.emit("markerdeselect", { id: had });
      if (opts && opts.fit) this.fitAll(opts);
    }
    focus(id, opts) {
      const m = this.get(id);
      if (!m) return false;
      const o = opts || {};
      const view = this.kit.olMap.getView();
      const zoom = o.zoom != null ? o.zoom : Math.max(view.getZoom(), this.opts.focusZoom);
      view.animate({ center: this.kit.toMap([m.lon, m.lat]), zoom, duration: o.duration != null ? o.duration : 600 });
      return true;
    }
    getExtent() {
      if (!this.source.getFeatures().length) return null;
      return this.source.getExtent();
    }
    fitAll(opts) {
      const extent = this.getExtent();
      if (!extent) return false;
      const o = Object.assign({ padding: [60, 60, 60, 60], maxZoom: 16, duration: 600 }, opts || {});
      this.kit.olMap.getView().fit(extent, { padding: o.padding, maxZoom: o.maxZoom, duration: o.duration });
      return true;
    }
    _setupTooltip() {
      if (!this.opts.tooltip) return;
      const tip = el("div", { class: "olmk-tooltip" });
      const overlay = new ol.Overlay({ element: tip, positioning: "bottom-center", offset: [0, -40], stopEvent: false });
      this.kit.olMap.addOverlay(overlay);
      this._tooltip = overlay;
      this._onMove = (e) => {
        if (e.dragging || e.originalEvent && e.originalEvent.pointerType !== "mouse") return;
        const hit = this.layer.getVisible() ? this._hit(e.pixel) : null;
        const members = hit && (hit.get("features") || [hit]);
        const m = members && members.length === 1 ? members[0].get("olmkMarker") : null;
        const vp = this.kit.olMap.getViewport();
        if (hit && !this.kit.activeTool) vp.style.cursor = "pointer";
        else if (vp.style.cursor === "pointer") vp.style.cursor = "";
        if (m && m.title) {
          tip.textContent = m.title;
          overlay.setPosition(members[0].getGeometry().getCoordinates());
        } else {
          overlay.setPosition(void 0);
        }
      };
      this.kit.olMap.on("pointermove", this._onMove);
    }
    destroy() {
      this._offClick();
      if (this._onMove) this.kit.olMap.un("pointermove", this._onMove);
      if (this._tooltip) this.kit.olMap.removeOverlay(this._tooltip);
      this.kit.olMap.removeLayer(this.layer);
    }
  };

  // src/modules/layers.js
  var Layers = class {
    constructor(kit, options) {
      this.kit = kit;
      this.defs = /* @__PURE__ */ new Map();
      this.olLayers = /* @__PURE__ */ new Map();
      this._seq = 0;
      this._offClick = kit.addClickHandler((e) => this._onClick(e), 20);
      if (options.controls && options.controls.layers) {
        this._button = kit.ui.button({ id: "layers", icon: "layers", title: kit.t("layers"), order: 10, onClick: () => this.togglePanel() });
      }
      kit.on("basemapchange", () => this._renderPanel());
    }
    /* ---------------- add / remove ---------------- */
    add(input) {
      const def = Object.assign({ visible: true, opacity: 1, queryable: true }, input);
      def.id = def.id != null ? String(def.id) : "layer" + ++this._seq;
      def.title = def.title || def.id;
      if (this.defs.has(def.id)) this.remove(def.id);
      const layer = this._create(def);
      if (!layer) {
        console.warn("[OLMapKit] unknown layer type", def.type);
        return null;
      }
      return this.register(def, layer);
    }
    // Registers an already-built OpenLayers layer (used by other modules)
    register(def, layer) {
      def.id = def.id != null ? String(def.id) : "layer" + ++this._seq;
      def.title = def.title || def.id;
      const count = this.defs.size;
      layer.set("olmkLayerId", def.id);
      layer.setVisible(def.visible !== false);
      layer.setOpacity(def.opacity != null ? def.opacity : 1);
      layer.setZIndex(def.zIndex != null ? def.zIndex : 10 + count);
      if (def.minZoom != null) layer.setMinZoom(def.minZoom);
      if (def.maxZoom != null) layer.setMaxZoom(def.maxZoom);
      this.defs.set(def.id, def);
      this.olLayers.set(def.id, layer);
      this.kit.olMap.addLayer(layer);
      this._watchSource(def, layer);
      this.kit.emit("layeradd", this._info(def.id));
      this._renderPanel();
      return def.id;
    }
    remove(id) {
      const layer = this.olLayers.get(String(id));
      if (!layer) return false;
      this.kit.olMap.removeLayer(layer);
      this.olLayers.delete(String(id));
      this.defs.delete(String(id));
      this.kit.emit("layerremove", { id: String(id) });
      this._renderPanel();
      return true;
    }
    get(id) {
      return this.olLayers.get(String(id)) || null;
    }
    getDef(id) {
      return this.defs.get(String(id)) || null;
    }
    has(id) {
      return this.olLayers.has(String(id));
    }
    _info(id) {
      const d = this.defs.get(id);
      const l = this.olLayers.get(id);
      return { id, title: d.title, type: d.type, visible: l.getVisible(), opacity: l.getOpacity(), zIndex: l.getZIndex() };
    }
    list() {
      return Array.from(this.defs.keys()).map((id) => this._info(id)).sort((a, b) => b.zIndex - a.zIndex);
    }
    /* ---------------- factories ---------------- */
    _create(def) {
      const kit = this.kit;
      switch (def.type) {
        case "wms":
          return this._createWms(def);
        case "wmts":
          return this._createWmts(def);
        case "xyz":
          return new ol.layer.Tile({
            source: new ol.source.XYZ({
              url: def.url,
              attributions: def.attributions,
              maxZoom: def.sourceMaxZoom || 19,
              crossOrigin: "anonymous",
              tileLoadFunction: makeImageLoader(kit, { headers: def.headers, cacheKey: def.offline ? "layer:" + def.id : null })
            })
          });
        case "image":
          return new ol.layer.Image({
            source: new ol.source.ImageStatic({
              url: def.url,
              imageExtent: kit.extentToMap(def.bbox),
              crossOrigin: "anonymous",
              attributions: def.attributions
            })
          });
        case "vectortile":
          return new ol.layer.VectorTile({
            declutter: true,
            source: new ol.source.VectorTile({ url: def.url, format: new ol.format.MVT(), attributions: def.attributions, maxZoom: def.sourceMaxZoom || 14 }),
            style: this._styleFor(def)
          });
        case "geojson":
        case "kml":
        case "gpx":
        case "vector":
        case "wfs":
          return new ol.layer.Vector({
            source: this._createVectorSource(def),
            style: def.type === "kml" && def.extractStyles !== false && !def.style ? void 0 : this._styleFor(def),
            declutter: !!def.declutter
          });
        default:
          return null;
      }
    }
    _styleFor(def) {
      const view = this.kit.olMap.getView();
      return makeStyleFunction(def.style, {
        filter: compileFilter(def.filter),
        zoomForResolution: (r) => view.getZoomForResolution(r)
      });
    }
    _format(def) {
      if (def.type === "kml") return new ol.format.KML({ extractStyles: def.extractStyles !== false && !def.style, showPointNames: false });
      if (def.type === "gpx") return new ol.format.GPX();
      return new ol.format.GeoJSON();
    }
    _createVectorSource(def) {
      const kit = this.kit;
      const format = this._format(def);
      const readOpts = { featureProjection: kit.projection };
      if (def.type === "wfs") {
        const source2 = new ol.source.Vector({
          format: new ol.format.GeoJSON(),
          strategy: ol.loadingstrategy.bbox,
          attributions: def.attributions
        });
        const code = kit.projection.getCode();
        source2.setLoader((extent, resolution, projection, success, failure) => {
          const params = new URLSearchParams(Object.assign({
            service: "WFS",
            version: "2.0.0",
            request: "GetFeature",
            typeNames: def.typeName || def.layers,
            outputFormat: def.outputFormat || "application/json",
            srsName: code,
            bbox: extent.join(",") + "," + code
          }, def.params || {}));
          const url = def.url + (def.url.indexOf("?") >= 0 ? "&" : "?") + params.toString();
          fetch(url, def.headers ? { headers: def.headers } : void 0).then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.json();
          }).then((json) => {
            const feats = source2.getFormat().readFeatures(json, { featureProjection: projection, dataProjection: code });
            source2.addFeatures(feats);
            success(feats);
          }).catch((err) => {
            source2.removeLoadedExtent(extent);
            failure();
            this.kit.emit("layererror", { id: def.id, message: String(err) });
          });
        });
        return source2;
      }
      const source = new ol.source.Vector({ format, attributions: def.attributions });
      if (def.data) {
        const data = typeof def.data === "string" && def.type === "geojson" ? JSON.parse(def.data) : def.data;
        source.addFeatures(format.readFeatures(data, readOpts));
      } else if (def.url) {
        source.setLoader((extent, resolution, projection, success, failure) => {
          fetch(def.url, def.headers ? { headers: def.headers } : void 0).then((r) => {
            if (!r.ok) throw new Error("HTTP " + r.status);
            return r.text();
          }).then((text) => {
            const feats = format.readFeatures(text, { featureProjection: projection });
            source.addFeatures(feats);
            success(feats);
          }).catch((err) => {
            failure();
            this.kit.emit("layererror", { id: def.id, message: String(err) });
          });
        });
      }
      return source;
    }
    _createWms(def) {
      const params = Object.assign({ LAYERS: def.layers, TRANSPARENT: true, FORMAT: "image/png" }, def.params || {});
      if (def.tiled === false) {
        return new ol.layer.Image({
          source: new ol.source.ImageWMS({
            url: def.url,
            params,
            ratio: 1,
            crossOrigin: "anonymous",
            serverType: def.serverType,
            attributions: def.attributions,
            imageLoadFunction: makeImageLoader(this.kit, { headers: def.headers })
          })
        });
      }
      params.TILED = true;
      return new ol.layer.Tile({
        source: new ol.source.TileWMS({
          url: def.url,
          params,
          crossOrigin: "anonymous",
          serverType: def.serverType,
          attributions: def.attributions,
          tileLoadFunction: makeImageLoader(this.kit, { headers: def.headers, cacheKey: def.offline ? "layer:" + def.id : null })
        })
      });
    }
    _createWmts(def) {
      const layer = new ol.layer.Tile({});
      const capsUrl = def.capabilitiesUrl || def.url;
      fetch(capsUrl, def.headers ? { headers: def.headers } : void 0).then((r) => r.text()).then((text) => {
        const caps = new ol.format.WMTSCapabilities().read(text);
        const options = ol.source.WMTS.optionsFromCapabilities(caps, {
          layer: def.layer || def.layers,
          matrixSet: def.matrixSet || this.kit.projection.getCode(),
          format: def.format
        });
        if (!options) throw new Error("Layer not found in capabilities");
        options.crossOrigin = "anonymous";
        options.attributions = def.attributions;
        options.tileLoadFunction = makeImageLoader(this.kit, { headers: def.headers });
        layer.setSource(new ol.source.WMTS(options));
        this.kit.emit("layerload", { id: def.id });
      }).catch((err) => this.kit.emit("layererror", { id: def.id, message: String(err) }));
      return layer;
    }
    _watchSource(def, layer) {
      const source = layer.getSource && layer.getSource();
      if (!source || !source.on) return;
      let fitted = false;
      if (source instanceof ol.source.Vector) {
        const onLoad = () => {
          this.kit.emit("layerload", { id: def.id, count: source.getFeatures().length });
          if (def.fitOnLoad && !fitted && source.getFeatures().length) {
            fitted = true;
            this.zoomTo(def.id);
          }
          this._renderPanel();
        };
        source.on("featuresloadend", onLoad);
        source.on("featuresloaderror", () => this.kit.emit("layererror", { id: def.id, message: "load error" }));
        if (def.data) setTimeout(onLoad, 0);
      } else {
        let last = 0;
        source.on("tileloaderror", () => {
          const now = Date.now();
          if (now - last > 5e3) {
            last = now;
            this.kit.emit("layererror", { id: def.id, message: "tile load error" });
          }
        });
      }
    }
    /* ---------------- state ---------------- */
    setVisible(id, visible) {
      const l = this.get(id);
      if (!l) return false;
      l.setVisible(!!visible);
      this.kit.emit("layerchange", this._info(String(id)));
      this._renderPanel();
      return true;
    }
    setOpacity(id, opacity) {
      const l = this.get(id);
      if (!l) return false;
      l.setOpacity(Math.max(0, Math.min(1, Number(opacity))));
      this.kit.emit("layerchange", this._info(String(id)));
      return true;
    }
    setZIndex(id, z) {
      const l = this.get(id);
      if (!l) return false;
      l.setZIndex(z);
      this._renderPanel();
      return true;
    }
    // Moves a layer one step up (towards the top) or down in the drawing order
    move(id, direction) {
      const sorted = this.list();
      const i = sorted.findIndex((l) => l.id === String(id));
      const j = direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= sorted.length) return false;
      const a = this.get(sorted[i].id);
      const b = this.get(sorted[j].id);
      const za = a.getZIndex();
      a.setZIndex(b.getZIndex());
      b.setZIndex(za === b.getZIndex() ? za + (direction === "up" ? 1 : -1) : za);
      this.kit.emit("layerchange", this._info(String(id)));
      this._renderPanel();
      return true;
    }
    setStyle(id, spec) {
      const def = this.getDef(id);
      const layer = this.get(id);
      if (!def || !layer || !layer.setStyle) return false;
      def.style = spec;
      layer.setStyle(this._styleFor(def));
      this._renderPanel();
      return true;
    }
    setFilter(id, filter) {
      const def = this.getDef(id);
      const layer = this.get(id);
      if (!def || !layer || !layer.setStyle) return false;
      def.filter = filter;
      layer.setStyle(this._styleFor(def));
      return true;
    }
    getExtent(id) {
      const l = this.get(id);
      const d = this.getDef(id);
      if (!l) return null;
      if (d && d.bbox) return this.kit.extentToMap(d.bbox);
      const s = l.getSource && l.getSource();
      if (s && s.getExtent && s instanceof ol.source.Vector) {
        const e = s.getExtent();
        return ol.extent.isEmpty(e) ? null : e;
      }
      if (s && s.getTileGrid && s.getTileGrid() && s instanceof ol.source.GeoTIFF) return null;
      return null;
    }
    zoomTo(id, opts) {
      const e = this.getExtent(id);
      if (!e) return false;
      return this.kit.fit(e, Object.assign({ mapExtent: true }, opts || {}));
    }
    _vectorSource(id) {
      const l = this.get(id);
      const s = l && l.getSource && l.getSource();
      return s && s instanceof ol.source.Vector ? s : null;
    }
    getFeatures(id) {
      const s = this._vectorSource(id);
      return s ? this.kit.writeFeatures(s.getFeatures()) : null;
    }
    // Adds GeoJSON features to a vector layer (creates an empty 'vector' layer if needed)
    addFeatures(id, geojson, def) {
      if (!this.has(id)) this.add(Object.assign({ id, type: "vector" }, def || {}));
      const s = this._vectorSource(id);
      if (!s) return 0;
      const feats = this.kit.readFeatures(geojson);
      s.addFeatures(feats);
      this.kit.emit("layerload", { id: String(id), count: s.getFeatures().length });
      this._renderPanel();
      return feats.length;
    }
    setData(id, geojson) {
      const s = this._vectorSource(id);
      if (!s) return false;
      s.clear(true);
      s.addFeatures(this.kit.readFeatures(geojson));
      this.kit.emit("layerload", { id: String(id), count: s.getFeatures().length });
      return true;
    }
    clearFeatures(id) {
      const s = this._vectorSource(id);
      if (s) s.clear();
      return !!s;
    }
    refresh(id) {
      const l = this.get(id);
      if (!l) return false;
      const s = l.getSource();
      if (s && s.refresh) s.refresh();
      return true;
    }
    // WMS layers that answer GetFeatureInfo
    queryableWms() {
      return this.list().filter((l) => {
        const d = this.getDef(l.id);
        return d.type === "wms" && d.queryable !== false && l.visible;
      }).map((l) => ({ id: l.id, def: this.getDef(l.id), layer: this.get(l.id) }));
    }
    vectorLayerIds() {
      return Array.from(this.defs.keys()).filter((id) => this._vectorSource(id));
    }
    /* ---------------- feature click / popup ---------------- */
    _onClick(e) {
      const map = this.kit.olMap;
      let found = null;
      map.forEachFeatureAtPixel(e.pixel, (f, layer) => {
        const id = layer && layer.get("olmkLayerId");
        const def = id && this.defs.get(id);
        if (!def || def.clickable === false) return false;
        found = { f, def };
        return true;
      }, { hitTolerance: 5 });
      if (!found) return false;
      const props = Object.assign({}, found.f.getProperties());
      delete props.geometry;
      const ll = this.kit.toLonLat(e.coordinate);
      this.kit.emit("featureclick", { layerId: found.def.id, id: found.f.getId() != null ? found.f.getId() : null, properties: props, lon: ll[0], lat: ll[1] });
      if (found.def.popup) this.kit.ui.popup(e.coordinate, this.popupHtml(found.def, props));
      return true;
    }
    popupHtml(def, props) {
      const p = def.popup;
      if (typeof p === "string") return formatTemplate(p.indexOf("{") >= 0 ? p : "{" + p + "}", Object.keys(props).reduce((o, k) => {
        o[k] = escapeHtml(props[k]);
        return o;
      }, {}));
      const fields = p && p.fields || Object.keys(props).filter((k) => props[k] == null || typeof props[k] !== "object");
      const title = p && p.title ? formatTemplate(p.title, props) : def.title;
      return "<h4>" + escapeHtml(title) + "</h4><table>" + fields.map((k) => "<tr><td>" + escapeHtml(k) + "</td><td>" + escapeHtml(props[k]) + "</td></tr>").join("") + "</table>";
    }
    /* ---------------- panel ---------------- */
    togglePanel() {
      if (this.kit.ui.panelId === "layers") this.kit.ui.closePanel();
      else this.openPanel();
    }
    openPanel() {
      this._panel = this.kit.ui.panel({
        id: "layers",
        title: this.kit.t("layers"),
        onClose: () => {
          this._panel = null;
          if (this._button) this._button.setActive(false);
        }
      });
      if (this._button) this._button.setActive(true);
      this._renderPanel();
    }
    closePanel() {
      if (this._panel) this.kit.ui.closePanel();
    }
    _renderPanel() {
      if (!this._panel) return;
      const kit = this.kit;
      const body = this._panel.body;
      body.innerHTML = "";
      const bms = kit.basemaps.list();
      if (bms.length > 1) {
        body.appendChild(el("div", { class: "olmk-section", text: kit.t("basemaps") }));
        bms.forEach((b) => {
          const row = el("div", { class: "olmk-row" });
          const label = el("label");
          const input = el("input", { type: "radio", name: kit.id + "-basemap", value: b.id });
          input.checked = b.active;
          input.addEventListener("change", () => kit.basemaps.set(b.id));
          label.appendChild(input);
          label.appendChild(el("span", { text: b.title }));
          row.appendChild(label);
          body.appendChild(row);
        });
      }
      body.appendChild(el("div", { class: "olmk-section", text: kit.t("overlays") }));
      const layers = this.list().filter((l) => this.defs.get(l.id).listed !== false);
      if (!layers.length) body.appendChild(el("div", { class: "olmk-row", text: kit.t("noLayers") }));
      layers.forEach((l, idx) => {
        const def = this.defs.get(l.id);
        const box = el("div", { class: "olmk-layer" });
        const row = el("div", { class: "olmk-row" });
        const label = el("label");
        const cb = el("input", { type: "checkbox" });
        cb.checked = l.visible;
        cb.addEventListener("change", () => this.setVisible(l.id, cb.checked));
        label.appendChild(cb);
        label.appendChild(el("span", { text: l.title }));
        row.appendChild(label);
        const zoomBtn = el("button", { type: "button", class: "olmk-icon-btn", title: kit.t("zoomTo") }, svg("zoomTo"));
        zoomBtn.addEventListener("click", () => this.zoomTo(l.id));
        if (this.getExtent(l.id)) row.appendChild(zoomBtn);
        box.appendChild(row);
        const tools = el("div", { class: "olmk-layer-tools" });
        const range = el("input", { type: "range", min: "0", max: "1", step: "0.05", "aria-label": kit.t("opacity") });
        range.value = String(l.opacity);
        range.addEventListener("input", () => this.setOpacity(l.id, range.value));
        tools.appendChild(range);
        const up = el("button", { type: "button", class: "olmk-icon-btn", title: kit.t("moveUp") }, svg("up"));
        up.disabled = idx === 0;
        up.addEventListener("click", () => this.move(l.id, "up"));
        const down = el("button", { type: "button", class: "olmk-icon-btn", title: kit.t("moveDown") }, svg("down"));
        down.disabled = idx === layers.length - 1;
        down.addEventListener("click", () => this.move(l.id, "down"));
        tools.appendChild(up);
        tools.appendChild(down);
        box.appendChild(tools);
        const legend = this._legendElement(def);
        if (legend) box.appendChild(legend);
        body.appendChild(box);
      });
    }
    _legendElement(def) {
      if (def.legend === false) return null;
      const entries = def.legendEntries || legendEntries(def.style);
      if (entries.length) {
        const wrap2 = el("div", { class: "olmk-legend" });
        entries.forEach((e) => {
          const item = el("div", { class: "olmk-legend-item" });
          const sw = el("span", { class: "olmk-swatch" });
          sw.style.background = e.color;
          item.appendChild(sw);
          item.appendChild(el("span", { text: e.label }));
          wrap2.appendChild(item);
        });
        return wrap2;
      }
      let url = typeof def.legend === "string" ? def.legend : null;
      if (!url && def.type === "wms" && def.legend) {
        const params = new URLSearchParams({ SERVICE: "WMS", VERSION: "1.3.0", REQUEST: "GetLegendGraphic", FORMAT: "image/png", LAYER: String(def.layers).split(",")[0] });
        url = def.url + (def.url.indexOf("?") >= 0 ? "&" : "?") + params.toString();
      }
      if (!url) return null;
      const wrap = el("div", { class: "olmk-legend" });
      const img = el("img", { alt: this.kit.t("legend") });
      if (def.headers) {
        fetch(url, { headers: def.headers }).then((r) => r.blob()).then((b) => {
          img.src = URL.createObjectURL(b);
        }).catch(() => wrap.remove());
      } else {
        img.src = url;
        img.onerror = () => wrap.remove();
      }
      wrap.appendChild(img);
      return wrap;
    }
    destroy() {
      this._offClick();
      Array.from(this.olLayers.keys()).forEach((id) => this.remove(id));
    }
  };

  // src/modules/compare.js
  var Compare = class {
    constructor(kit) {
      this.kit = kit;
      this.active = null;
    }
    swipe(opts) {
      this.stop();
      const kit = this.kit;
      const map = kit.olMap;
      const o = Object.assign({ position: 0.5 }, opts || {});
      let layer = null;
      let temp = null;
      if (o.basemap) {
        const def = kit.basemaps.defs[o.basemap];
        if (!def) return false;
        const source = kit.basemaps.createSource(def);
        if (!source) return false;
        temp = new ol.layer.Tile({ source, zIndex: -99 });
        map.addLayer(temp);
        layer = temp;
      } else if (o.layer) {
        layer = kit.layers.get(o.layer);
        if (!layer) return false;
        layer.setVisible(true);
      } else {
        return false;
      }
      const state = { position: Math.max(0, Math.min(1, o.position)) };
      const pre = (e) => {
        const ctx = e.context;
        const size = map.getSize();
        const x = size[0] * state.position;
        if (typeof ctx.save === "function") {
          const tl = ol.render.getRenderPixel(e, [x, 0]);
          const tr = ol.render.getRenderPixel(e, [size[0], 0]);
          const bl = ol.render.getRenderPixel(e, [x, size[1]]);
          const br = ol.render.getRenderPixel(e, [size[0], size[1]]);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(tl[0], tl[1]);
          ctx.lineTo(bl[0], bl[1]);
          ctx.lineTo(br[0], br[1]);
          ctx.lineTo(tr[0], tr[1]);
          ctx.closePath();
          ctx.clip();
        } else {
          const gl = ctx;
          gl.enable(gl.SCISSOR_TEST);
          const bottomLeft = ol.render.getRenderPixel(e, [0, size[1]]);
          const topRight = ol.render.getRenderPixel(e, [size[0], 0]);
          const total = topRight[0] - bottomLeft[0];
          const left = Math.round(total * state.position);
          gl.scissor(bottomLeft[0] + left, bottomLeft[1], Math.max(0, Math.round(total - left)), topRight[1] - bottomLeft[1]);
        }
      };
      const post = (e) => {
        const ctx = e.context;
        if (typeof ctx.restore === "function") ctx.restore();
        else ctx.disable(ctx.SCISSOR_TEST);
      };
      layer.on("prerender", pre);
      layer.on("postrender", post);
      const divider = el("div", { class: "olmk-swipe" });
      const handle = el("div", { class: "olmk-swipe-handle", role: "slider", "aria-label": kit.t("compare"), tabindex: "0" }, "\u21C6");
      divider.appendChild(handle);
      map.getOverlayContainerStopEvent().appendChild(divider);
      const place = () => {
        divider.style.left = state.position * 100 + "%";
      };
      place();
      const setPos = (clientX) => {
        const rect = map.getViewport().getBoundingClientRect();
        state.position = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        place();
        map.render();
        kit.emit("compareswipe", { position: state.position });
      };
      const onMove = (ev) => {
        ev.preventDefault();
        setPos(ev.clientX);
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      handle.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
      handle.addEventListener("keydown", (ev) => {
        if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
          state.position = Math.max(0, Math.min(1, state.position + (ev.key === "ArrowLeft" ? -0.05 : 0.05)));
          place();
          map.render();
        }
      });
      this.active = { layer, temp, pre, post, divider, state };
      map.render();
      kit.emit("comparestart", { layer: o.layer || null, basemap: o.basemap || null });
      return true;
    }
    setPosition(p) {
      if (!this.active) return;
      this.active.state.position = Math.max(0, Math.min(1, p));
      this.active.divider.style.left = this.active.state.position * 100 + "%";
      this.kit.olMap.render();
    }
    stop() {
      const a = this.active;
      if (!a) return;
      a.layer.un("prerender", a.pre);
      a.layer.un("postrender", a.post);
      if (a.temp) this.kit.olMap.removeLayer(a.temp);
      a.divider.remove();
      this.active = null;
      this.kit.olMap.render();
      this.kit.emit("comparestop", {});
    }
    destroy() {
      this.stop();
    }
  };

  // src/modules/draw/loupe.js
  var Loupe = class {
    constructor(kit, options) {
      this.kit = kit;
      this.opts = Object.assign({ size: 120, zoom: 2, offset: 90 }, options || {});
      this.box = el("div", { class: "olmk-loupe" });
      this.canvas = el("canvas");
      this.box.appendChild(this.canvas);
      kit.olMap.getViewport().appendChild(this.box);
      this._raf = 0;
    }
    // fingerPixel: where the finger is; targetPixel: the point to magnify (map pixels)
    show(fingerPixel, targetPixel) {
      this._finger = fingerPixel;
      this._target = targetPixel;
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = 0;
        this._draw();
      });
    }
    _draw() {
      const map = this.kit.olMap;
      const size = map.getSize();
      if (!size || !this._target) return;
      const s = this.opts.size;
      const dpr = window.devicePixelRatio || 1;
      const c = this.canvas;
      c.width = s * dpr;
      c.height = s * dpr;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ddd";
      ctx.fillRect(0, 0, c.width, c.height);
      const region = s / this.opts.zoom;
      const vp = map.getViewport();
      vp.querySelectorAll(".ol-layer canvas, canvas.ol-layer").forEach((canvas) => {
        if (!canvas.width || canvas === c) return;
        const ratio = canvas.width / size[0];
        const opacity = canvas.parentNode && canvas.parentNode.style.opacity;
        ctx.globalAlpha = opacity === "" || opacity == null ? 1 : Number(opacity);
        try {
          ctx.drawImage(
            canvas,
            (this._target[0] - region / 2) * ratio,
            (this._target[1] - region / 2) * ratio,
            region * ratio,
            region * ratio,
            0,
            0,
            c.width,
            c.height
          );
        } catch (e) {
        }
      });
      ctx.globalAlpha = 1;
      let left = this._finger[0] - s / 2;
      let top = this._finger[1] - s - this.opts.offset;
      if (top < 4) top = this._finger[1] + this.opts.offset;
      left = Math.max(4, Math.min(size[0] - s - 4, left));
      this.box.style.left = left + "px";
      this.box.style.top = top + "px";
      this.box.style.display = "block";
    }
    hide() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this._raf = 0;
      this.box.style.display = "none";
    }
    destroy() {
      this.hide();
      this.box.remove();
    }
  };

  // src/modules/draw/polygon-editor.js
  var PolygonEditor = class {
    constructor(kit, options, owner) {
      this.kit = kit;
      this.owner = owner;
      const o = this.opts = Object.assign({
        within: null,
        // GeoJSON / layer id / array of those: where drawing is allowed
        exclude: null,
        // GeoJSON / layer id / array: areas subtracted from the result
        initial: null,
        // GeoJSON polygon or [[lon, lat], ...] to edit
        snap: false,
        // true (within/exclude + all vector layers) or [layerIds]
        snapTolerance: null,
        minArea: 0,
        // m²
        loupe: true,
        gps: false,
        // shows a "point here" button (uses the geolocation module)
        toolbar: true,
        simplify: 0.05
        // metres, removes near-collinear points created by clipping
      }, options || {});
      const map = this.map = kit.olMap;
      this.jstsParser = new jsts.io.OL3Parser();
      this.jstsParser.inject(
        ol.geom.Point,
        ol.geom.LineString,
        ol.geom.LinearRing,
        ol.geom.Polygon,
        ol.geom.MultiPoint,
        ol.geom.MultiLineString,
        ol.geom.MultiPolygon
      );
      this.freeArea = this._buildFreeArea();
      this.snapGeoms = this._buildSnapGeoms();
      const state = this.state = {
        mode: "drawing",
        ring: [],
        cursor: null,
        placing: null,
        dragIndex: -1,
        dragOrigin: null,
        dragMoved: false,
        inserted: false,
        cancelled: false,
        selected: -1,
        touch: false,
        result: null,
        lastEmitted: "|-1",
        suppressClick: false,
        pointer: null
      };
      const initial = this._initialRing(o.initial);
      if (initial.length) {
        state.ring = initial;
        state.mode = initial.length >= 3 ? "editing" : "drawing";
      }
      this._buildLayer();
      if (o.toolbar) this._buildToolbar();
      this._buildInteractions();
      if (o.loupe) this.loupe = new Loupe(kit);
      this.update();
      state.lastEmitted = this._resultKey(this.computeUseful(state.ring));
    }
    /* ---------------- geometry inputs ---------------- */
    _geomsFrom(input) {
      const kit = this.kit;
      const out = [];
      const push = (g) => {
        if (g) out.push(g);
      };
      const list = input == null ? [] : Array.isArray(input) && !(input.length && typeof input[0] === "number") && !(input.length && Array.isArray(input[0]) && typeof input[0][0] === "number") ? input : [input];
      list.forEach((item) => {
        if (item == null) return;
        if (typeof item === "string" && kit.layers.has(item)) {
          const s = kit.layers.get(item).getSource();
          if (s && s.getFeatures) s.getFeatures().forEach((f) => push(f.getGeometry()));
        } else if (Array.isArray(item)) {
          push(new ol.geom.Polygon([this._closeRing(item.map((c) => kit.toMap(c)))]));
        } else {
          kit.readFeatures(item).forEach((f) => push(f.getGeometry()));
        }
      });
      return out.filter((g) => /Polygon/.test(g.getType()));
    }
    _toJsts(olGeom) {
      const g = olGeom.clone();
      closePolygonRings(g);
      return makeTopologySafe(this.jstsParser.read(g));
    }
    _buildFreeArea() {
      const o = this.opts;
      this.hasBase = o.within != null;
      let free = null;
      if (this.hasBase) {
        this._geomsFrom(o.within).forEach((g) => {
          const j = this._toJsts(g);
          free = free ? makeTopologySafe(free.union(j)) : j;
        });
        if (!free) return null;
      }
      const blocked = this._geomsFrom(o.exclude);
      if (!blocked.length) return free;
      if (!free) {
        this.excluded = blocked.map((g) => this._toJsts(g));
        return null;
      }
      blocked.forEach((g) => {
        free = makeTopologySafe(free.difference(this._toJsts(g)));
      });
      return free && !free.isEmpty() ? free : null;
    }
    _buildSnapGeoms() {
      const o = this.opts;
      if (!o.snap) return [];
      const geoms = this._geomsFrom(o.within).concat(this._geomsFrom(o.exclude));
      const ids = o.snap === true ? this.kit.layers.vectorLayerIds() : [].concat(o.snap);
      this.snapSources = ids.map((id) => this.kit.layers.get(id)).filter(Boolean).map((l) => l.getSource()).filter((s) => s && s.getFeaturesInExtent);
      return geoms;
    }
    _initialRing(initial) {
      if (!initial) return [];
      let ring = null;
      if (Array.isArray(initial) && initial.length && Array.isArray(initial[0]) && typeof initial[0][0] === "number") {
        ring = initial.map((c) => this.kit.toMap(c));
      } else {
        const g = this.kit.readGeometry(initial);
        if (g && g.getType() === "Polygon") ring = g.getCoordinates()[0];
        else if (g && g.getType() === "MultiPolygon") ring = g.getCoordinates()[0][0];
      }
      if (!ring) return [];
      ring = ring.map((c) => c.slice());
      const f = ring[0];
      const l = ring[ring.length - 1];
      if (ring.length > 1 && f[0] === l[0] && f[1] === l[1]) ring.pop();
      return ring;
    }
    _closeRing(ring) {
      const r = ring.map((c) => c.slice());
      if (r.length && (r[0][0] !== r[r.length - 1][0] || r[0][1] !== r[r.length - 1][1])) r.push(r[0].slice());
      return r;
    }
    /* ---------------- useful area ---------------- */
    computeUseful(ring) {
      if (ring.length < 3) return { status: "incomplete" };
      if (this.hasBase && !this.freeArea) return { status: "nobase" };
      const userGeom = this.jstsParser.read(new ol.geom.Polygon([ring.concat([ring[0]])]));
      if (!userGeom.isValid()) return { status: "selfintersect" };
      let clipped = makeTopologySafe(userGeom);
      if (this.freeArea) clipped = makeTopologySafe(clipped.intersection(this.freeArea));
      if (this.excluded) this.excluded.forEach((x) => {
        clipped = makeTopologySafe(clipped.difference(x));
      });
      if (!clipped || clipped.isEmpty()) return { status: "empty" };
      const pieces = [];
      for (let i = 0; i < clipped.getNumGeometries(); i++) {
        const g = clipped.getGeometryN(i);
        if (g.getGeometryType() === "Polygon") pieces.push(g);
      }
      if (!pieces.length) return { status: "empty" };
      pieces.sort((a, b) => b.getArea() - a.getArea());
      const minArea = Math.max(0.5, pieces[0].getArea() * 5e-3);
      const significant = pieces.filter((g) => g.getArea() >= minArea);
      if (significant.length > 1) return { status: "multi", geom: this.jstsParser.write(clipped) };
      let main = significant[0];
      if (this.opts.simplify > 0) {
        const simplified = jsts.simplify.TopologyPreservingSimplifier.simplify(main, this.opts.simplify);
        if (simplified && !simplified.isEmpty() && simplified.getGeometryType() === "Polygon") main = simplified;
      }
      const olGeom = this.jstsParser.write(main);
      closePolygonRings(olGeom);
      const area2 = ol.sphere.getArea(olGeom, { projection: this.kit.projection });
      if (this.opts.minArea && area2 < this.opts.minArea) return { status: "toosmall", geom: olGeom, area: area2 };
      return { status: "ok", geom: olGeom, area: area2 };
    }
    _resultKey(r) {
      return r && r.status === "ok" ? r.area + "|" + r.geom.getCoordinates()[0].join(";") : "|-1";
    }
    // Public result in lon/lat
    getResult() {
      const kit = this.kit;
      const r = this.computeUseful(this.state.ring);
      const ok = r.status === "ok";
      const out = {
        tool: "polygon",
        status: r.status,
        valid: ok,
        area: ok ? r.area : 0,
        areaHa: ok ? r.area / 1e4 : -1,
        perimeter: ok ? ol.sphere.getLength(new ol.geom.LineString(r.geom.getCoordinates()[0]), { projection: kit.projection }) : 0,
        coordinates: ok ? r.geom.getCoordinates()[0].map((c) => kit.toLonLat(c).map((v) => Math.round(v * 1e7) / 1e7)) : [],
        geojson: ok ? { type: "Feature", properties: { area: r.area }, geometry: kit.writeGeometry(r.geom) } : null,
        drawn: this.state.ring.map((c) => kit.toLonLat(c)),
        mode: this.state.mode
      };
      return out;
    }
    emitResult() {
      const r = this.computeUseful(this.state.ring);
      const key = this._resultKey(r);
      if (key === this.state.lastEmitted) return;
      this.state.lastEmitted = key;
      this.kit.emit("drawchange", this.getResult());
    }
    /* ---------------- rendering ---------------- */
    _sizes() {
      return this.state.touch ? { vertex: 11, midpoint: 9, hit: 26, finishLast: 14, midMinPx: 60, snap: 18 } : { vertex: 6, midpoint: 5, hit: 10, finishLast: 6, midMinPx: 30, snap: 10 };
    }
    _midpoints(resolution) {
      const ring = this.state.ring;
      const out = [];
      if (ring.length < 2) return out;
      const count = this.state.mode === "editing" && ring.length >= 3 ? ring.length : ring.length - 1;
      const minLen = this._sizes().midMinPx * resolution;
      for (let i = 0; i < count; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= minLen) out.push({ index: i, coord: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] });
      }
      return out;
    }
    _buildLayer() {
      const f = this.features = {
        useful: new ol.Feature(),
        shape: new ol.Feature(),
        vertex: new ol.Feature(),
        midpoint: new ol.Feature(),
        placing: new ol.Feature(),
        snap: new ol.Feature()
      };
      this.source = new ol.source.Vector({ features: [f.useful, f.shape, f.midpoint, f.vertex, f.placing, f.snap] });
      this.layer = new ol.layer.Vector({
        source: this.source,
        style: (feature, resolution) => this._style(feature, resolution),
        updateWhileAnimating: true,
        updateWhileInteracting: true,
        zIndex: 1e3
      });
      this.layer.set("olmkInternal", "draw");
      this.map.addLayer(this.layer);
    }
    _style(feature, resolution) {
      const s = this._sizes();
      const f = this.features;
      const state = this.state;
      const fmt = this.kit.format;
      if (feature === f.useful) {
        const r = state.result;
        if (!r || !r.geom) return null;
        const ok = r.status === "ok";
        return new ol.style.Style({
          stroke: new ol.style.Stroke({ color: ok ? "rgba(100,255,0,1)" : "rgba(229,57,53,1)", width: 2 }),
          fill: new ol.style.Fill({ color: ok ? "rgba(100,255,0,0.35)" : "rgba(229,57,53,0.35)" }),
          text: ok ? new ol.style.Text({
            text: fmt.area(r.area),
            font: "bold 13px system-ui, sans-serif",
            fill: new ol.style.Fill({ color: "#fff" }),
            backgroundFill: new ol.style.Fill({ color: "rgba(0,0,0,0.6)" }),
            padding: [2, 6, 2, 6],
            offsetY: -22,
            overflow: true
          }) : void 0
        });
      }
      if (feature === f.shape) {
        if (!feature.getGeometry()) return null;
        return new ol.style.Style({ stroke: new ol.style.Stroke({ color: "#ffffff", width: 2, lineDash: [6, 6] }) });
      }
      if (feature === f.midpoint) {
        const mids = this._midpoints(resolution);
        if (!mids.length) return null;
        return new ol.style.Style({
          geometry: new ol.geom.MultiPoint(mids.map((m) => m.coord)),
          image: new ol.style.Circle({
            radius: s.midpoint,
            fill: new ol.style.Fill({ color: "rgba(255,255,255,0.75)" }),
            stroke: new ol.style.Stroke({ color: "rgba(46,125,50,0.9)", width: 2 })
          }),
          text: new ol.style.Text({ text: "+", font: "bold " + s.midpoint * 2 + "px sans-serif", fill: new ol.style.Fill({ color: "#2e7d32" }), offsetY: 1 })
        });
      }
      if (feature === f.vertex) {
        const ring = state.ring;
        if (!ring.length) return null;
        const styles = [new ol.style.Style({
          geometry: new ol.geom.MultiPoint(ring),
          image: new ol.style.Circle({ radius: s.vertex, fill: new ol.style.Fill({ color: "#ffffff" }), stroke: new ol.style.Stroke({ color: "#2e7d32", width: 3 }) })
        })];
        if (state.mode === "drawing" && ring.length >= 3) {
          styles.push(new ol.style.Style({
            geometry: new ol.geom.Point(ring[0]),
            image: new ol.style.Circle({ radius: s.vertex + 3, fill: new ol.style.Fill({ color: "#2e7d32" }), stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }) })
          }));
        }
        if (state.selected >= 0 && ring[state.selected]) {
          styles.push(new ol.style.Style({
            geometry: new ol.geom.Point(ring[state.selected]),
            image: new ol.style.Circle({ radius: s.vertex + 3, fill: new ol.style.Fill({ color: "#c62828" }), stroke: new ol.style.Stroke({ color: "#ffffff", width: 3 }) })
          }));
        }
        return styles;
      }
      if (feature === f.placing) {
        if (!feature.getGeometry()) return null;
        return new ol.style.Style({
          image: new ol.style.Circle({ radius: s.vertex + 8, fill: new ol.style.Fill({ color: "rgba(46,125,50,0.25)" }), stroke: new ol.style.Stroke({ color: "#ffffff", width: 2 }) })
        });
      }
      if (feature === f.snap) {
        if (!feature.getGeometry()) return null;
        return new ol.style.Style({
          image: new ol.style.RegularShape({ points: 4, radius: s.vertex + 5, angle: Math.PI / 4, stroke: new ol.style.Stroke({ color: "#ff9800", width: 3 }) })
        });
      }
      return null;
    }
    _buildToolbar() {
      const kit = this.kit;
      const t = kit.t;
      const buttons = [
        { id: "undo", label: t("undo"), onClick: () => this.actions.undo() },
        { id: "clear", label: t("clear"), onClick: () => this.actions.clear() },
        { id: "gps", label: t("gpsPoint"), onClick: () => this.addVertexHere() },
        { id: "finish", label: t("finish"), kind: "primary", onClick: () => this.finish() },
        { id: "remove", label: t("removePoint"), kind: "danger", onClick: () => this.actions.remove() },
        { id: "resume", label: t("resume"), kind: "primary", onClick: () => this.actions.resume() },
        { id: "redraw", label: t("redraw"), onClick: () => this.actions.redraw() }
      ];
      this.ui = kit.ui.toolbar(buttons);
    }
    _flash(msg) {
      this._transient = msg;
      clearTimeout(this._transientTimer);
      this._transientTimer = setTimeout(() => {
        this._transient = "";
        this._renderHud();
      }, 3e3);
      this._renderHud();
    }
    _statusMessage(r) {
      if (!r) return "";
      const t = this.kit.t;
      switch (r.status) {
        case "selfintersect":
          return t("selfIntersect");
        case "multi":
          return t("multi");
        case "empty":
          return t("empty");
        case "nobase":
          return t("noBase");
        case "toosmall":
          return t("tooSmall");
        default:
          return "";
      }
    }
    _renderHud() {
      if (!this.ui) return;
      const ui = this.ui;
      const t = this.kit.t;
      const state = this.state;
      const r = state.result;
      const title = this.hasBase || this.excluded ? t("usefulArea") : t("area");
      ui.pill.innerHTML = title + ": <b>" + (r && r.status === "ok" ? this.kit.format.area(r.area) : "\u2014") + "</b>";
      const msg = this._transient || this._statusMessage(r);
      ui.msg.textContent = msg;
      ui.msg.classList.toggle("is-error", !this._transient && !!msg && state.ring.length >= 3);
      const drawing = state.mode === "drawing";
      ui.hint.textContent = drawing ? state.touch ? t("hintDrawTouch") : t("hintDrawMouse") : t("hintEdit");
      const b = ui.btn;
      b.undo.hidden = !drawing;
      b.clear.hidden = !drawing;
      b.finish.hidden = !drawing;
      b.gps.hidden = !drawing || !this.opts.gps;
      b.undo.disabled = state.ring.length === 0;
      b.clear.disabled = state.ring.length === 0;
      b.finish.disabled = state.ring.length < 3;
      b.remove.hidden = state.selected < 0;
      b.remove.disabled = !drawing && state.ring.length <= 3;
      b.resume.hidden = drawing;
      b.redraw.hidden = drawing;
    }
    _tip() {
      if (this.state.mode !== "drawing") return null;
      return this.state.placing || this.state.cursor;
    }
    update() {
      const state = this.state;
      const f = this.features;
      const t = this._tip();
      const ring = state.ring;
      const preview = t ? ring.concat([t]) : ring;
      state.result = this.computeUseful(preview);
      if (state.mode === "drawing") {
        f.shape.setGeometry(preview.length >= 2 ? new ol.geom.LineString(preview.length >= 3 ? preview.concat([preview[0]]) : preview) : null);
      } else {
        f.shape.setGeometry(ring.length >= 3 ? new ol.geom.Polygon([ring.concat([ring[0]])]) : null);
      }
      f.useful.setGeometry(state.result.geom || null);
      f.vertex.setGeometry(ring.length ? new ol.geom.MultiPoint(ring) : null);
      f.midpoint.setGeometry(ring.length >= 2 ? new ol.geom.MultiPoint(ring) : null);
      f.placing.setGeometry(state.placing ? new ol.geom.Point(state.placing) : null);
      f.snap.setGeometry(this._snapped ? new ol.geom.Point(this._snapped) : null);
      this.source.changed();
      this._renderHud();
    }
    /* ---------------- snapping ---------------- */
    _snap(coord, excludeIndex) {
      this._snapped = null;
      if (!this.opts.snap) return coord;
      const res = this.map.getView().getResolution();
      const tolPx = this.opts.snapTolerance || this._sizes().snap;
      const tol = tolPx * res;
      const box = [coord[0] - tol, coord[1] - tol, coord[0] + tol, coord[1] + tol];
      const geoms = this.snapGeoms.filter((g) => ol.extent.intersects(g.getExtent(), box));
      (this.snapSources || []).forEach((s) => s.getFeaturesInExtent(box).forEach((f) => f.getGeometry() && geoms.push(f.getGeometry())));
      let best = null;
      let bestD = tol;
      geoms.forEach((g) => {
        const flat = g.getFlatCoordinates();
        const stride = g.getStride();
        for (let i = 0; i < flat.length; i += stride) {
          const d = Math.hypot(flat[i] - coord[0], flat[i + 1] - coord[1]);
          if (d < bestD) {
            bestD = d;
            best = [flat[i], flat[i + 1]];
          }
        }
      });
      this.state.ring.forEach((v, i) => {
        if (i === excludeIndex) return;
        const d = Math.hypot(v[0] - coord[0], v[1] - coord[1]);
        if (d < bestD * 0.9) {
          bestD = d;
          best = v.slice();
        }
      });
      if (!best) {
        let edgeD = tol * 0.8;
        geoms.forEach((g) => {
          const p = g.getClosestPoint(coord);
          const d = Math.hypot(p[0] - coord[0], p[1] - coord[1]);
          if (d < edgeD) {
            edgeD = d;
            best = [p[0], p[1]];
          }
        });
      }
      this._snapped = best;
      return best || coord;
    }
    /* ---------------- actions ---------------- */
    _pixelDist(a, b) {
      const pa = this.map.getPixelFromCoordinate(a);
      const pb = this.map.getPixelFromCoordinate(b);
      return Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
    }
    _hitVertex(coord) {
      const tol = this._sizes().hit;
      let best = -1;
      let bestD = Infinity;
      this.state.ring.forEach((v, i) => {
        const d = this._pixelDist(v, coord);
        if (d <= tol && d < bestD) {
          best = i;
          bestD = d;
        }
      });
      return best;
    }
    _hitMidpoint(coord) {
      const tol = this._sizes().hit;
      const res = this.map.getView().getResolution();
      let best = null;
      let bestD = Infinity;
      this._midpoints(res).forEach((m) => {
        const d = this._pixelDist(m.coord, coord);
        if (d <= tol && d < bestD) {
          best = m;
          bestD = d;
        }
      });
      return best;
    }
    _addDrawingPoint(coord) {
      const ring = this.state.ring;
      const s = this._sizes();
      if (ring.length >= 3 && (this._pixelDist(ring[0], coord) <= s.hit || this._pixelDist(ring[ring.length - 1], coord) <= s.finishLast)) {
        this.finish();
        return;
      }
      if (ring.length > 0 && this._pixelDist(ring[ring.length - 1], coord) <= s.finishLast) return;
      ring.push(coord.slice());
      this._snapped = null;
      this.update();
      this.emitResult();
    }
    finish() {
      const state = this.state;
      if (state.ring.length < 3) {
        this._flash(this.kit.t("minPoints"));
        return false;
      }
      state.mode = "editing";
      state.cursor = null;
      state.placing = null;
      state.selected = -1;
      this.update();
      this.emitResult();
      this.kit.emit("drawend", this.getResult());
      return true;
    }
    get actions() {
      const state = this.state;
      return {
        undo: () => {
          state.ring.pop();
          state.selected = -1;
          this.update();
          this.emitResult();
        },
        clear: () => {
          state.ring = [];
          state.selected = -1;
          this.update();
          this.emitResult();
        },
        resume: () => {
          state.mode = "drawing";
          state.selected = -1;
          this.update();
        },
        remove: () => {
          if (state.selected < 0 || state.mode === "editing" && state.ring.length <= 3) return;
          state.ring.splice(state.selected, 1);
          state.selected = -1;
          this.update();
          this.emitResult();
        },
        redraw: () => {
          state.ring = [];
          state.mode = "drawing";
          state.selected = -1;
          this.update();
          this.emitResult();
        }
      };
    }
    // Clears without emitting (host-driven reset)
    reset() {
      const state = this.state;
      state.ring = [];
      state.mode = "drawing";
      state.selected = -1;
      state.lastEmitted = "|-1";
      this.update();
    }
    setRing(coords) {
      this.state.ring = this._initialRing(coords);
      this.state.mode = this.state.ring.length >= 3 ? "editing" : "drawing";
      this.state.selected = -1;
      this.update();
      this.emitResult();
    }
    addVertex(lonLat) {
      if (this.state.mode !== "drawing") this.state.mode = "drawing";
      this._addDrawingPoint(this.kit.toMap(lonLat));
    }
    addVertexHere() {
      const geo = this.kit.geolocation;
      this.kit.ui.toast(this.kit.t("locating"), 1500);
      geo.getCurrentPosition().then((p) => {
        this.addVertex([p.lon, p.lat]);
        this.kit.emit("drawgpspoint", p);
      }).catch(() => this.kit.ui.toast(this.kit.t("locationError")));
    }
    /* ---------------- interaction ---------------- */
    _buildInteractions() {
      const kit = this.kit;
      const map = this.map;
      const state = this.state;
      const self = this;
      const isMouse = (e) => !e.originalEvent || e.originalEvent.pointerType === "mouse";
      const setPointerType = (e) => {
        const touch = !isMouse(e);
        if (touch !== state.touch) {
          state.touch = touch;
          self.update();
        }
      };
      const editor = this.editor = new ol.interaction.Pointer({
        handleDownEvent(e) {
          setPointerType(e);
          if (editor.targetPointers.length > 1) return false;
          state.cancelled = false;
          state.suppressClick = false;
          state.pointer = e.pixel;
          const v = self._hitVertex(e.coordinate);
          if (v >= 0) {
            state.dragIndex = v;
            state.dragOrigin = state.ring[v].slice();
            state.dragMoved = false;
            state.inserted = false;
            state.cursor = null;
            state.suppressClick = true;
            return true;
          }
          const m = self._hitMidpoint(e.coordinate);
          if (m) {
            state.ring.splice(m.index + 1, 0, m.coord.slice());
            state.dragIndex = m.index + 1;
            state.dragOrigin = null;
            state.dragMoved = false;
            state.inserted = true;
            state.selected = -1;
            state.cursor = null;
            state.suppressClick = true;
            self.update();
            return true;
          }
          if (state.mode === "drawing" && !isMouse(e)) {
            state.placing = self._snap(e.coordinate.slice());
            self.update();
            self._showLoupe(e);
            return true;
          }
          return false;
        },
        handleDragEvent(e) {
          if (state.cancelled) return;
          if (editor.targetPointers.length > 1) {
            self._cancelGesture();
            return;
          }
          state.pointer = e.pixel;
          if (state.placing) {
            state.placing = self._snap(e.coordinate.slice());
            self.update();
            self._showLoupe(e);
          } else if (state.dragIndex >= 0) {
            state.ring[state.dragIndex] = self._snap(e.coordinate.slice(), state.dragIndex);
            state.dragMoved = true;
            self.update();
            if (!isMouse(e)) self._showLoupe(e);
          }
        },
        handleUpEvent() {
          self._hideLoupe();
          if (state.cancelled) {
            state.cancelled = false;
            return false;
          }
          if (state.placing) {
            const p = state.placing;
            state.placing = null;
            self._snapped = null;
            self._addDrawingPoint(p);
            self.update();
          } else if (state.dragIndex >= 0) {
            const i = state.dragIndex;
            state.dragIndex = -1;
            self._snapped = null;
            if (!state.dragMoved && !state.inserted) {
              const n = state.ring.length;
              if (state.mode === "drawing" && n >= 3 && (i === 0 || i === n - 1)) {
                self.finish();
                return false;
              }
              state.selected = state.selected === i ? -1 : i;
              self.update();
            } else {
              state.selected = -1;
              self.update();
              self.emitResult();
            }
          }
          return false;
        },
        handleMoveEvent(e) {
          if (!isMouse(e)) return;
          setPointerType(e);
          if (state.mode === "drawing") {
            state.cursor = self._snap(e.coordinate.slice());
            self.update();
          }
          const over = self._hitVertex(e.coordinate) >= 0 || !!self._hitMidpoint(e.coordinate);
          map.getViewport().style.cursor = over ? "grab" : state.mode === "drawing" ? "crosshair" : "";
        },
        // Two-finger pan/pinch keep working; one-finger pan is blocked by the pan guard.
        stopDown() {
          return false;
        }
      });
      this._offPanGuard = kit.addPanGuard(() => !((state.placing !== null || state.dragIndex >= 0) && editor.targetPointers.length < 2));
      this.guard = new ol.interaction.Interaction({
        handleEvent(e) {
          if (e.type === "click" && state.suppressClick) {
            state.suppressClick = false;
            return false;
          }
          if (e.type === "click" && state.mode === "drawing" && isMouse(e)) {
            self._addDrawingPoint(state.cursor || e.coordinate);
            return false;
          }
          if (e.type === "dblclick") return false;
          return true;
        }
      });
      map.addInteraction(editor);
      map.addInteraction(this.guard);
      this._onLeave = () => {
        if (state.cursor) {
          state.cursor = null;
          self.update();
        }
        map.getViewport().style.cursor = "";
      };
      map.getViewport().addEventListener("mouseleave", this._onLeave);
      this._onKey = (e) => {
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (state.mode === "drawing") {
          if (e.key === "Enter") {
            self.finish();
            e.preventDefault();
          } else if ((e.key === "Backspace" || e.key === "Delete") && state.ring.length) {
            self.actions.undo();
            e.preventDefault();
          } else if (e.key === "Escape") self.actions.clear();
        } else if ((e.key === "Backspace" || e.key === "Delete") && state.selected >= 0) {
          self.actions.remove();
          e.preventDefault();
        } else if (e.key === "Escape") {
          state.selected = -1;
          self.update();
        }
      };
      window.addEventListener("keydown", this._onKey);
    }
    _cancelGesture() {
      const state = this.state;
      state.cancelled = true;
      this._hideLoupe();
      if (state.placing) state.placing = null;
      else if (state.dragIndex >= 0) {
        if (state.inserted) state.ring.splice(state.dragIndex, 1);
        else if (state.dragOrigin) state.ring[state.dragIndex] = state.dragOrigin;
        state.dragIndex = -1;
      }
      this._snapped = null;
      this.update();
    }
    _showLoupe(e) {
      if (!this.loupe || !this.state.touch) return;
      const coord = this.state.placing || (this.state.dragIndex >= 0 ? this.state.ring[this.state.dragIndex] : null);
      this.loupe.show(e.pixel, coord ? this.map.getPixelFromCoordinate(coord) : e.pixel);
    }
    _hideLoupe() {
      if (this.loupe) this.loupe.hide();
    }
    destroy() {
      const map = this.map;
      map.removeInteraction(this.editor);
      map.removeInteraction(this.guard);
      map.removeLayer(this.layer);
      map.getViewport().removeEventListener("mouseleave", this._onLeave);
      map.getViewport().style.cursor = "";
      window.removeEventListener("keydown", this._onKey);
      this._offPanGuard();
      clearTimeout(this._transientTimer);
      if (this.ui) this.ui.destroy();
      if (this.loupe) this.loupe.destroy();
    }
  };
  function closePolygonRings(olGeom) {
    if (!olGeom) return;
    const close = (ring) => {
      if (ring.length < 3) return;
      const f = ring[0];
      const l = ring[ring.length - 1];
      if (f[0] !== l[0] || f[1] !== l[1]) ring.push(f.slice());
    };
    const type = olGeom.getType();
    if (type === "Polygon") {
      const rings = olGeom.getCoordinates();
      rings.forEach(close);
      olGeom.setCoordinates(rings);
    } else if (type === "MultiPolygon") {
      const polys = olGeom.getCoordinates();
      polys.forEach((p) => p.forEach(close));
      olGeom.setCoordinates(polys);
    }
  }
  function makeTopologySafe(g) {
    if (!g || g.isEmpty()) return g;
    try {
      const reducer = new jsts.precision.GeometryPrecisionReducer(new jsts.geom.PrecisionModel(1e6));
      return reducer.reduce(g).buffer(0);
    } catch (e) {
      return g.buffer(0);
    }
  }

  // src/geo/ops.js
  var ops_exports = {};
  __export(ops_exports, {
    area: () => area,
    asGeometry: () => asGeometry,
    bbox: () => bbox,
    bearing: () => bearing2,
    buffer: () => buffer,
    centroid: () => centroid,
    contains: () => contains,
    convexHull: () => convexHull,
    difference: () => difference,
    distance: () => distance,
    interiorPoint: () => interiorPoint,
    intersection: () => intersection,
    intersects: () => intersects,
    length: () => length,
    perimeter: () => perimeter,
    simplify: () => simplify,
    split: () => split,
    union: () => union,
    validate: () => validate
  });

  // src/core/proj.js
  var EARTH_RADIUS = 6378137;
  var MAX_LAT = 85.05112878;
  function lonLatToMercator(c) {
    const lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, c[1]));
    return [
      EARTH_RADIUS * c[0] * Math.PI / 180,
      EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))
    ];
  }
  function mercatorToLonLat(c) {
    return [
      c[0] / EARTH_RADIUS * 180 / Math.PI,
      (2 * Math.atan(Math.exp(c[1] / EARTH_RADIUS)) - Math.PI / 2) * 180 / Math.PI
    ];
  }
  function mapCoords(geometry, fn) {
    const walk = (c) => typeof c[0] === "number" ? fn(c) : c.map(walk);
    if (geometry.type === "GeometryCollection") {
      return { type: geometry.type, geometries: geometry.geometries.map((g) => mapCoords(g, fn)) };
    }
    return { type: geometry.type, coordinates: walk(geometry.coordinates) };
  }
  function haversine(a, b) {
    const toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * 63710088e-1 * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    const toRad = (d) => d * Math.PI / 180;
    const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]));
    const x = Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) - Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  // src/geo/ops.js
  var R = 6378137;
  function J() {
    const j = typeof jsts !== "undefined" ? jsts : globalThis && globalThis.jsts;
    if (!j) throw new Error("[OLMapKit] JSTS must be loaded for geometry operations.");
    return j;
  }
  function asGeometry(g) {
    if (!g) return null;
    const o = typeof g === "string" ? JSON.parse(g) : g;
    if (o.type === "Feature") return o.geometry;
    if (o.type === "FeatureCollection") {
      const geoms = o.features.map((f) => f.geometry).filter(Boolean);
      return geoms.length === 1 ? geoms[0] : { type: "GeometryCollection", geometries: geoms };
    }
    return o;
  }
  function toJsts(g) {
    const geom = mapCoords(asGeometry(g), lonLatToMercator);
    return new (J()).io.GeoJSONReader().read(geom);
  }
  function fromJsts(jg) {
    if (!jg || jg.isEmpty()) return null;
    const geom = new (J()).io.GeoJSONWriter().write(jg);
    return mapCoords(geom, (c) => mercatorToLonLat(c).map((v) => Math.round(v * 1e8) / 1e8));
  }
  function clean(jg) {
    try {
      const reducer = new (J()).precision.GeometryPrecisionReducer(new (J()).geom.PrecisionModel(1e3));
      return reducer.reduce(jg).buffer(0);
    } catch (e) {
      return jg.buffer(0);
    }
  }
  function scaleAt(g) {
    const b = bbox(g);
    const lat = (b[1] + b[3]) / 2;
    return 1 / Math.cos(lat * Math.PI / 180);
  }
  function ringArea(ring) {
    let area2 = 0;
    const len = ring.length;
    if (len < 3) return 0;
    let x1 = ring[len - 1][0];
    let y1 = ring[len - 1][1];
    for (let i = 0; i < len; i++) {
      const x2 = ring[i][0];
      const y2 = ring[i][1];
      area2 += (x2 - x1) * Math.PI / 180 * (2 + Math.sin(y1 * Math.PI / 180) + Math.sin(y2 * Math.PI / 180));
      x1 = x2;
      y1 = y2;
    }
    return Math.abs(area2 * R * R / 2);
  }
  function area(g) {
    const geom = asGeometry(g);
    if (!geom) return 0;
    const poly = (rings) => rings.reduce((s, r, i) => s + (i === 0 ? ringArea(r) : -ringArea(r)), 0);
    switch (geom.type) {
      case "Polygon":
        return poly(geom.coordinates);
      case "MultiPolygon":
        return geom.coordinates.reduce((s, p) => s + poly(p), 0);
      case "GeometryCollection":
        return geom.geometries.reduce((s, x) => s + area(x), 0);
      default:
        return 0;
    }
  }
  function lineLength(coords) {
    let s = 0;
    for (let i = 1; i < coords.length; i++) s += haversine(coords[i - 1], coords[i]);
    return s;
  }
  function length(g) {
    const geom = asGeometry(g);
    if (!geom) return 0;
    switch (geom.type) {
      case "LineString":
        return lineLength(geom.coordinates);
      case "MultiLineString":
        return geom.coordinates.reduce((s, l) => s + lineLength(l), 0);
      case "Polygon":
        return lineLength(geom.coordinates[0]);
      case "MultiPolygon":
        return geom.coordinates.reduce((s, p) => s + lineLength(p[0]), 0);
      case "GeometryCollection":
        return geom.geometries.reduce((s, x) => s + length(x), 0);
      default:
        return 0;
    }
  }
  var perimeter = length;
  function distance(a, b) {
    return haversine(a, b);
  }
  function bearing2(a, b) {
    return bearing(a, b);
  }
  function bbox(g) {
    const geom = asGeometry(g);
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    mapCoords(geom, (c) => {
      if (c[0] < b[0]) b[0] = c[0];
      if (c[1] < b[1]) b[1] = c[1];
      if (c[0] > b[2]) b[2] = c[0];
      if (c[1] > b[3]) b[3] = c[1];
      return c;
    });
    return b;
  }
  function centroid(g) {
    const c = toJsts(g).getCentroid().getCoordinate();
    return mercatorToLonLat([c.x, c.y]);
  }
  function interiorPoint(g) {
    const c = toJsts(g).getInteriorPoint().getCoordinate();
    return mercatorToLonLat([c.x, c.y]);
  }
  function buffer(g, metres, segments) {
    const k = scaleAt(g);
    return fromJsts(toJsts(g).buffer(metres * k, segments || 8));
  }
  function union(a, b) {
    if (Array.isArray(a)) return a.reduce((acc, x) => acc ? union(acc, x) : asGeometry(x), null);
    return fromJsts(clean(clean(toJsts(a)).union(clean(toJsts(b)))));
  }
  function intersection(a, b) {
    return fromJsts(clean(clean(toJsts(a)).intersection(clean(toJsts(b)))));
  }
  function difference(a, b) {
    return fromJsts(clean(clean(toJsts(a)).difference(clean(toJsts(b)))));
  }
  function intersects(a, b) {
    return toJsts(a).intersects(toJsts(b));
  }
  function contains(a, b) {
    return toJsts(a).contains(toJsts(b));
  }
  function simplify(g, toleranceMetres) {
    const k = scaleAt(g);
    return fromJsts(J().simplify.TopologyPreservingSimplifier.simplify(toJsts(g), (toleranceMetres || 1) * k));
  }
  function convexHull(g) {
    return fromJsts(toJsts(g).convexHull());
  }
  function validate(g) {
    const jg = toJsts(g);
    const op = new (J()).operation.valid.IsValidOp(jg);
    if (op.isValid()) return { valid: true, reason: null, location: null };
    const err = op.getValidationError();
    const c = err.getCoordinate();
    return {
      valid: false,
      reason: err.getMessage(),
      location: c ? mercatorToLonLat([c.x, c.y]) : null
    };
  }
  function split(polygon, line) {
    const j = J();
    const poly = clean(toJsts(polygon));
    const cutter = toJsts(line);
    if (!poly.intersects(cutter)) return [asGeometry(polygon)];
    const noded = poly.getBoundary().union(cutter);
    const polygonizer = new j.operation.polygonize.Polygonizer();
    polygonizer.add(noded);
    const pieces = polygonizer.getPolygons().toArray ? polygonizer.getPolygons().toArray() : Array.from(polygonizer.getPolygons());
    const out = [];
    pieces.forEach((p) => {
      if (poly.contains(p.getInteriorPoint())) {
        const piece = clean(p.intersection(poly));
        for (let i = 0; i < piece.getNumGeometries(); i++) {
          const g = piece.getGeometryN(i);
          if (g.getGeometryType() === "Polygon" && g.getArea() > 1e-6) out.push(fromJsts(g));
        }
      }
    });
    return out.length ? out : [asGeometry(polygon)];
  }

  // src/modules/draw/sketch.js
  var STYLE = () => [
    new ol.style.Style({
      stroke: new ol.style.Stroke({ color: "#ffffff", width: 5 }),
      fill: new ol.style.Fill({ color: "rgba(46,125,50,0.25)" }),
      image: new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color: "#2e7d32" }), stroke: new ol.style.Stroke({ color: "#fff", width: 3 }) })
    }),
    new ol.style.Style({ stroke: new ol.style.Stroke({ color: "#2e7d32", width: 3 }) })
  ];
  var SketchTool = class {
    constructor(kit, mode, options) {
      this.kit = kit;
      this.mode = mode;
      const o = this.opts = Object.assign({ snap: true, multiple: false, toolbar: true }, options || {});
      const map = kit.olMap;
      this.source = new ol.source.Vector();
      if (o.initial && mode !== "split") this.source.addFeatures(kit.readFeatures(o.initial));
      this.layer = new ol.layer.Vector({ source: this.source, style: STYLE(), zIndex: 1e3 });
      this.layer.set("olmkInternal", "sketch");
      map.addLayer(this.layer);
      const type = mode === "point" ? "Point" : "LineString";
      this.drawI = new ol.interaction.Draw({ source: this.source, type, style: STYLE(), stopClick: true });
      this.modifyI = mode === "split" ? null : new ol.interaction.Modify({ source: this.source });
      map.addInteraction(this.drawI);
      if (this.modifyI) map.addInteraction(this.modifyI);
      this.snaps = [];
      if (o.snap) {
        const ids = o.snap === true ? kit.layers.vectorLayerIds() : [].concat(o.snap);
        ids.map((id) => kit.layers.get(id)).filter(Boolean).forEach((l) => {
          const s = new ol.interaction.Snap({ source: l.getSource(), pixelTolerance: 14 });
          map.addInteraction(s);
          this.snaps.push(s);
        });
        const own = new ol.interaction.Snap({ source: this.source, pixelTolerance: 14 });
        map.addInteraction(own);
        this.snaps.push(own);
      }
      if (o.toolbar) {
        const t = kit.t;
        this.ui = kit.ui.toolbar([
          { id: "undo", label: t("undo"), onClick: () => this.undo() },
          { id: "clear", label: t("clear"), onClick: () => this.clear() },
          { id: "finish", label: t("finish"), kind: "primary", onClick: () => this.finish() }
        ]);
        this.ui.hint.textContent = mode === "point" ? t("hintPoint") : mode === "split" ? t("hintSplit") : t("hintLine");
        if (mode === "point") {
          this.ui.btn.undo.hidden = true;
          this.ui.btn.finish.hidden = true;
        }
      }
      this._sketch = null;
      this.drawI.on("drawstart", (e) => {
        this._sketch = e.feature;
        if (!o.multiple && mode !== "split") this.source.getFeatures().forEach((f) => f !== e.feature && this.source.removeFeature(f));
        this._sketchListener = e.feature.getGeometry().on("change", () => this._renderHud(e.feature.getGeometry()));
      });
      this.drawI.on("drawend", (e) => {
        this._sketch = null;
        if (this._sketchListener) ol.Observable.unByKey(this._sketchListener);
        if (mode === "split") {
          setTimeout(() => {
            this._doSplit(e.feature);
            this.source.clear();
          }, 0);
          return;
        }
        if (!o.multiple) this.source.getFeatures().forEach((f) => f !== e.feature && this.source.removeFeature(f));
        setTimeout(() => {
          this._emit("drawend");
          this._emit("drawchange");
        }, 0);
      });
      if (this.modifyI) this.modifyI.on("modifyend", () => this._emit("drawchange"));
      this._renderHud(null);
    }
    _renderHud(geom) {
      if (!this.ui) return;
      const kit = this.kit;
      let g = geom;
      if (!g) {
        const f = this.source.getFeatures()[0];
        g = f && f.getGeometry();
      }
      if (g && g.getType() === "LineString") {
        this.ui.pill.innerHTML = kit.t("length") + ": <b>" + kit.format.length(ol.sphere.getLength(g, { projection: kit.projection })) + "</b>";
      } else if (g && g.getType() === "Point") {
        const ll = kit.toLonLat(g.getCoordinates());
        this.ui.pill.innerHTML = "<b>" + ll[1].toFixed(6) + ", " + ll[0].toFixed(6) + "</b>";
      } else {
        this.ui.pill.textContent = "";
      }
    }
    getResult() {
      const kit = this.kit;
      const feats = this.source.getFeatures();
      const fc = kit.writeFeatures(feats);
      const first = feats[0] && feats[0].getGeometry();
      return {
        tool: this.mode,
        valid: feats.length > 0,
        count: feats.length,
        length: first && first.getType() === "LineString" ? ol.sphere.getLength(first, { projection: kit.projection }) : 0,
        coordinates: first ? first.getType() === "Point" ? kit.toLonLat(first.getCoordinates()) : first.getCoordinates().map((c) => kit.toLonLat(c)) : [],
        geojson: fc
      };
    }
    _emit(type) {
      this._renderHud(null);
      this.kit.emit(type, this.getResult());
    }
    _doSplit(lineFeature) {
      const kit = this.kit;
      const line = kit.writeGeometry(lineFeature.getGeometry());
      const layerId = this.opts.layer;
      const results = [];
      if (layerId && kit.layers.has(layerId)) {
        const source = kit.layers.get(layerId).getSource();
        const lineGeom = lineFeature.getGeometry();
        source.getFeaturesInExtent(lineGeom.getExtent()).forEach((f) => {
          const g = f.getGeometry();
          if (!g || !/Polygon/.test(g.getType())) return;
          const poly = kit.writeGeometry(g);
          if (!intersects(poly, line)) return;
          const parts = split(poly, line);
          if (parts.length < 2) return;
          const props = Object.assign({}, f.getProperties());
          delete props.geometry;
          const id = f.getId();
          source.removeFeature(f);
          const newFeatures = parts.map((p, i) => {
            const nf = new ol.Feature(Object.assign({}, props, { geometry: kit.readGeometry(p) }));
            nf.setId((id != null ? id : "f") + "-" + (i + 1));
            return nf;
          });
          source.addFeatures(newFeatures);
          results.push({ sourceId: id != null ? id : null, parts: kit.writeFeatures(newFeatures) });
        });
      } else if (this.opts.geometry) {
        const parts = split(this.opts.geometry, line);
        results.push({ sourceId: null, parts: { type: "FeatureCollection", features: parts.map((p) => ({ type: "Feature", properties: {}, geometry: p })) } });
      }
      kit.emit("split", { layerId: layerId || null, results, count: results.length });
      if (!results.length) kit.ui.toast(kit.t("hintSplit"));
    }
    undo() {
      if (this._sketch) this.drawI.removeLastPoint();
      else if (this.source.getFeatures().length) {
        const f = this.source.getFeatures();
        this.source.removeFeature(f[f.length - 1]);
        this._emit("drawchange");
      }
    }
    clear() {
      this.drawI.abortDrawing();
      this.source.clear();
      this._emit("drawchange");
    }
    finish() {
      if (this._sketch) this.drawI.finishDrawing();
    }
    addVertex(lonLat) {
      const c = this.kit.toMap(lonLat);
      if (this.mode === "point") {
        if (!this.opts.multiple) this.source.clear();
        this.source.addFeature(new ol.Feature(new ol.geom.Point(c)));
        this._emit("drawend");
        this._emit("drawchange");
      } else {
        this.drawI.appendCoordinates([c]);
      }
    }
    destroy() {
      const map = this.kit.olMap;
      map.removeInteraction(this.drawI);
      if (this.modifyI) map.removeInteraction(this.modifyI);
      this.snaps.forEach((s) => map.removeInteraction(s));
      map.removeLayer(this.layer);
      if (this.ui) this.ui.destroy();
    }
  };

  // src/modules/draw/index.js
  var Draw = class {
    constructor(kit, defaults) {
      this.kit = kit;
      this.defaults = defaults || {};
      this.current = null;
      this.tool = null;
      this.opts = null;
    }
    _start(name, factory, opts) {
      this.stop();
      this.opts = opts || {};
      this.current = factory();
      this.tool = name;
      this.kit.activateTool("draw", { stop: () => this.stop(), blocksClicks: true });
      this.kit.emit("drawstart", { tool: name });
      return this;
    }
    polygon(opts) {
      const o = Object.assign({}, this.defaults, opts || {});
      return this._start("polygon", () => new PolygonEditor(this.kit, o, this), o);
    }
    line(opts) {
      return this._start("line", () => new SketchTool(this.kit, "line", opts), opts);
    }
    point(opts) {
      return this._start("point", () => new SketchTool(this.kit, "point", opts), opts);
    }
    split(opts) {
      return this._start("split", () => new SketchTool(this.kit, "split", opts), opts);
    }
    get active() {
      return !!this.current;
    }
    getResult() {
      return this.current ? this.current.getResult() : null;
    }
    // Stops the tool. With { keep: true } (or `targetLayer` in the tool options) a valid result
    // is added to that layer before the drawing is removed.
    stop(options) {
      if (!this.current) return null;
      const result = this.current.getResult();
      const target = options && options.targetLayer || this.opts && this.opts.targetLayer;
      if (target && result && result.valid && result.geojson) {
        this.kit.layers.addFeatures(target, result.geojson, { title: target });
      }
      const cur = this.current;
      this.current = null;
      const tool = this.tool;
      this.tool = null;
      cur.destroy();
      this.kit.releaseTool("draw");
      this.kit.emit("drawstop", { tool, result });
      return result;
    }
    clear() {
      if (!this.current) return;
      if (this.current.reset) this.current.reset();
      else this.current.clear();
    }
    undo() {
      if (!this.current) return;
      if (this.current.actions) this.current.actions.undo();
      else this.current.undo();
    }
    finish() {
      if (this.current) this.current.finish();
    }
    addVertex(lonLat) {
      if (this.current) this.current.addVertex(lonLat);
    }
    // Polygon only: replaces the ring being edited
    setCoordinates(coords) {
      if (this.current && this.current.setRing) this.current.setRing(coords);
    }
    // For tests and debugging
    debugState() {
      if (!this.current || !this.current.state) return null;
      const s = this.current.state;
      return { mode: s.mode, ring: s.ring.map((c) => this.kit.toLonLat(c)), selected: s.selected, touch: s.touch };
    }
    destroy() {
      this.stop();
    }
  };

  // src/modules/measure.js
  var Measure = class {
    constructor(kit) {
      this.kit = kit;
      this.type = null;
      this.source = new ol.source.Vector();
      this.layer = new ol.layer.Vector({
        source: this.source,
        zIndex: 1001,
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "#ff6f00", width: 3, lineDash: [8, 6] }),
          fill: new ol.style.Fill({ color: "rgba(255,111,0,0.15)" }),
          image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: "#ff6f00" }) })
        })
      });
      this.layer.set("olmkInternal", "measure");
      this.overlays = [];
      if (kit.options.controls.measure) {
        this._button = kit.ui.button({ id: "measure", icon: "ruler", title: kit.t("measure"), order: 30, onClick: () => this.type ? this.stop() : this.start("distance") });
      }
    }
    start(type) {
      const kit = this.kit;
      const map = kit.olMap;
      const t = type || "distance";
      if (this.type) this._removeDraw();
      if (!this.type) {
        kit.activateTool("measure", { stop: () => this.stop(), blocksClicks: true });
        map.addLayer(this.layer);
        this._buildToolbar();
      }
      this.type = t;
      if (this._button) this._button.setActive(true);
      Object.keys(this.ui.btn).forEach((k) => this.ui.btn[k].classList.toggle("is-primary", k === t));
      const style = new ol.style.Style({
        stroke: new ol.style.Stroke({ color: "#ff6f00", width: 3, lineDash: [8, 6] }),
        fill: new ol.style.Fill({ color: "rgba(255,111,0,0.15)" }),
        image: new ol.style.Circle({ radius: 6, stroke: new ol.style.Stroke({ color: "#ff6f00", width: 2 }), fill: new ol.style.Fill({ color: "rgba(255,255,255,0.8)" }) })
      });
      this.drawI = new ol.interaction.Draw({
        source: this.source,
        type: t === "area" ? "Polygon" : "LineString",
        maxPoints: t === "azimuth" ? 2 : void 0,
        style,
        stopClick: true
      });
      map.addInteraction(this.drawI);
      let tip = null;
      let listener = null;
      this.drawI.on("drawstart", (e) => {
        tip = this._tooltip();
        listener = e.feature.getGeometry().on("change", (ev) => {
          const r = this._compute(ev.target);
          tip.el.textContent = r.formatted;
          tip.overlay.setPosition(this._anchor(ev.target));
        });
      });
      this.drawI.on("drawend", (e) => {
        ol.Observable.unByKey(listener);
        const r = this._compute(e.feature.getGeometry());
        if (tip) {
          tip.el.textContent = r.formatted;
          tip.overlay.setPosition(this._anchor(e.feature.getGeometry()));
          tip.overlay.setOffset([0, -8]);
        }
        e.feature.set("measure", r.value);
        kit.emit("measure", Object.assign({ geojson: kit.writeGeometry(e.feature.getGeometry()) }, r));
        if (this.ui) this.ui.pill.innerHTML = "<b>" + r.formatted + "</b>";
      });
    }
    _buildToolbar() {
      const t = this.kit.t;
      this.ui = this.kit.ui.toolbar([
        { id: "distance", label: t("measureDistance"), onClick: () => this.start("distance") },
        { id: "area", label: t("measureArea"), onClick: () => this.start("area") },
        { id: "azimuth", label: t("measureAzimuth"), onClick: () => this.start("azimuth") },
        { id: "clear", label: t("measureClear"), onClick: () => this.clear() },
        { id: "close", label: t("close"), onClick: () => this.stop() }
      ]);
      this.ui.hint.textContent = t("hintMeasure");
    }
    _tooltip() {
      const e = el("div", { class: "olmk-measure-tip" });
      const overlay = new ol.Overlay({ element: e, offset: [0, -16], positioning: "bottom-center", stopEvent: false });
      this.kit.olMap.addOverlay(overlay);
      this.overlays.push(overlay);
      return { el: e, overlay };
    }
    _anchor(geom) {
      if (geom.getType() === "Polygon") return geom.getInteriorPoint().getCoordinates();
      return geom.getLastCoordinate();
    }
    _compute(geom) {
      const kit = this.kit;
      const fmt = kit.format;
      const proj = kit.projection;
      if (geom.getType() === "Polygon") {
        const area2 = ol.sphere.getArea(geom, { projection: proj });
        const perimeter2 = ol.sphere.getLength(new ol.geom.LineString(geom.getCoordinates()[0]), { projection: proj });
        return { type: "area", value: area2, perimeter: perimeter2, formatted: fmt.area(area2) + " \xB7 " + kit.t("perimeter") + " " + fmt.length(perimeter2) };
      }
      const len = ol.sphere.getLength(geom, { projection: proj });
      if (this.type === "azimuth") {
        const c = geom.getCoordinates();
        const deg = c.length >= 2 ? bearing(kit.toLonLat(c[0]), kit.toLonLat(c[c.length - 1])) : 0;
        return { type: "azimuth", value: deg, distance: len, formatted: fmt.angle(deg) + " \xB7 " + fmt.length(len) };
      }
      return { type: "distance", value: len, formatted: fmt.length(len) };
    }
    clear() {
      this.source.clear();
      this.overlays.forEach((o) => this.kit.olMap.removeOverlay(o));
      this.overlays = [];
      if (this.drawI) this.drawI.abortDrawing();
      if (this.ui) this.ui.pill.textContent = "";
    }
    _removeDraw() {
      if (this.drawI) {
        this.drawI.abortDrawing();
        this.kit.olMap.removeInteraction(this.drawI);
        this.drawI = null;
      }
    }
    stop() {
      if (!this.type) return;
      this._removeDraw();
      this.clear();
      this.kit.olMap.removeLayer(this.layer);
      if (this.ui) {
        this.ui.destroy();
        this.ui = null;
      }
      this.type = null;
      if (this._button) this._button.setActive(false);
      this.kit.releaseTool("measure");
    }
    destroy() {
      this.stop();
    }
  };

  // src/modules/query.js
  var Query = class {
    constructor(kit, options) {
      this.kit = kit;
      this.opts = Object.assign({ enabled: false, popup: true, featureCount: 10, infoFormat: "application/json" }, options || {});
      this.enabled = !!this.opts.enabled;
      this._offClick = kit.addClickHandler((e) => this._onClick(e), 30);
    }
    enable(on) {
      this.enabled = on !== false;
      this.kit.emit("featureinfotoggle", { enabled: this.enabled });
    }
    _onClick(e) {
      if (!this.enabled) return false;
      if (!this.kit.layers.queryableWms().length) return false;
      this.identify(this.kit.toLonLat(e.coordinate), { popup: this.opts.popup });
      return true;
    }
    identify(lonLat, options) {
      const kit = this.kit;
      const o = Object.assign({ popup: false }, options || {});
      const coord = kit.toMap(lonLat);
      const view = kit.olMap.getView();
      const res = view.getResolution();
      const layers = kit.layers.queryableWms();
      const jobs = layers.map(({ id, def, layer }) => {
        const source = layer.getSource();
        const url = source.getFeatureInfoUrl(coord, res, kit.projection, {
          INFO_FORMAT: def.infoFormat || this.opts.infoFormat,
          FEATURE_COUNT: this.opts.featureCount
        });
        if (!url) return Promise.resolve(null);
        return fetch(url, def.headers ? { headers: def.headers } : void 0).then((r) => r.ok ? r.text() : "").then((text) => {
          let features = [];
          try {
            const json = JSON.parse(text);
            features = (json.features || []).map((f) => ({ id: f.id != null ? f.id : null, properties: f.properties || {} }));
          } catch (err) {
            if (text && text.trim()) features = [{ id: null, properties: { info: text.slice(0, 2e3) } }];
          }
          return { layerId: id, title: def.title, features };
        }).catch(() => ({ layerId: id, title: def.title, features: [], error: true }));
      });
      return Promise.all(jobs).then((list) => {
        const results = list.filter((r) => r && r.features.length);
        const payload = { lon: lonLat[0], lat: lonLat[1], results };
        kit.emit("featureinfo", payload);
        if (o.popup) kit.ui.popup(coord, this.renderHtml(results));
        return payload;
      });
    }
    renderHtml(results) {
      if (!results.length) return "<div>" + escapeHtml(this.kit.t("noInfo")) + "</div>";
      return results.map((r) => r.features.map((f) => {
        const keys = Object.keys(f.properties).filter((k) => f.properties[k] == null || typeof f.properties[k] !== "object");
        return "<h4>" + escapeHtml(r.title) + "</h4><table>" + keys.map((k) => "<tr><td>" + escapeHtml(k) + "</td><td>" + escapeHtml(f.properties[k]) + "</td></tr>").join("") + "</table>";
      }).join("")).join("");
    }
    destroy() {
      this._offClick();
    }
  };

  // src/modules/search.js
  var Search = class {
    constructor(kit, options) {
      this.kit = kit;
      this.opts = Object.assign({
        provider: "nominatim",
        limit: 6,
        zoom: 17,
        countryCodes: null,
        // e.g. 'pt,es'
        autocomplete: null,
        // default: true for photon / custom, false for nominatim
        marker: true,
        email: null
        // optional contact for Nominatim
      }, options || {});
      if (this.opts.autocomplete == null) this.opts.autocomplete = this.opts.provider !== "nominatim";
      this._pinSource = new ol.source.Vector();
      this._pinLayer = new ol.layer.Vector({
        source: this._pinSource,
        zIndex: 70,
        style: new ol.style.Style({
          image: new ol.style.Circle({ radius: 9, fill: new ol.style.Fill({ color: "#1e88e5" }), stroke: new ol.style.Stroke({ color: "#fff", width: 3 }) })
        })
      });
      this._pinLayer.set("olmkInternal", "search");
      kit.olMap.addLayer(this._pinLayer);
      if (kit.options.controls.search) this.mount();
    }
    mount() {
      if (this.box) return;
      const kit = this.kit;
      const box = this.box = el("div", { class: "olmk-search" });
      box.innerHTML = '<form role="search"><input type="search" enterkeyhint="search" autocomplete="off"><button type="submit">' + svg("search") + '</button></form><ul role="listbox"></ul>';
      const input = this.input = box.querySelector("input");
      input.placeholder = kit.t("searchPlaceholder");
      input.setAttribute("aria-label", kit.t("search"));
      box.querySelector("button").setAttribute("aria-label", kit.t("search"));
      this.list = box.querySelector("ul");
      box.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        this._run(input.value);
      });
      let timer = null;
      input.addEventListener("input", () => {
        if (!input.value.trim()) {
          this.list.innerHTML = "";
          return;
        }
        if (!this.opts.autocomplete) return;
        clearTimeout(timer);
        timer = setTimeout(() => this._run(input.value), 400);
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          this.list.innerHTML = "";
          input.blur();
        }
      });
      kit.olMap.getOverlayContainerStopEvent().appendChild(box);
    }
    _run(q) {
      const query = (q || "").trim();
      if (query.length < 3) return;
      const list = this.list;
      list.innerHTML = '<li class="is-info">' + escapeHtml(this.kit.t("searching")) + "</li>";
      const seq = this._seq = (this._seq || 0) + 1;
      this.geocode(query).then((results) => {
        if (seq !== this._seq) return;
        list.innerHTML = "";
        if (!results.length) {
          list.innerHTML = '<li class="is-info">' + escapeHtml(this.kit.t("searchNoResults")) + "</li>";
          return;
        }
        results.forEach((r) => {
          const li = el("li", { role: "option", text: r.label });
          li.addEventListener("click", () => {
            this.select(r);
            list.innerHTML = "";
            this.input.value = r.label;
          });
          list.appendChild(li);
        });
      }).catch(() => {
        if (seq === this._seq) list.innerHTML = '<li class="is-info">' + escapeHtml(this.kit.t("searchNoResults")) + "</li>";
      });
    }
    geocode(query) {
      const o = this.opts;
      const lang = this.kit.options.locale || "en";
      if (typeof o.provider === "function") return Promise.resolve(o.provider(query, { lang, limit: o.limit }));
      if (o.provider === "photon") {
        const p2 = new URLSearchParams({ q: query, limit: String(o.limit) });
        if (["en", "de", "fr", "it"].indexOf(lang.slice(0, 2)) >= 0) p2.set("lang", lang.slice(0, 2));
        const c = this.kit.getView().center;
        p2.set("lon", String(c[0]));
        p2.set("lat", String(c[1]));
        return fetch("https://photon.komoot.io/api/?" + p2).then((r) => r.json()).then((json) => (json.features || []).map((f) => {
          const pr = f.properties || {};
          const label = [pr.name, pr.street && pr.street + (pr.housenumber ? " " + pr.housenumber : ""), pr.city, pr.country].filter(Boolean).join(", ");
          const e = pr.extent;
          return { label, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], bbox: e ? [e[0], e[3], e[2], e[1]] : null };
        }));
      }
      const p = new URLSearchParams({ q: query, format: "jsonv2", limit: String(o.limit), "accept-language": lang });
      if (o.countryCodes) p.set("countrycodes", o.countryCodes);
      if (o.email) p.set("email", o.email);
      return fetch("https://nominatim.openstreetmap.org/search?" + p).then((r) => r.json()).then((list) => list.map((r) => ({
        label: r.display_name,
        lon: Number(r.lon),
        lat: Number(r.lat),
        bbox: r.boundingbox ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])] : null
      })));
    }
    reverse(lonLat) {
      const p = new URLSearchParams({ lat: String(lonLat[1]), lon: String(lonLat[0]), format: "jsonv2", "accept-language": this.kit.options.locale || "en" });
      return fetch("https://nominatim.openstreetmap.org/reverse?" + p).then((r) => r.json()).then((r) => ({ label: r.display_name || "", address: r.address || {} }));
    }
    select(result) {
      const kit = this.kit;
      if (result.bbox && result.bbox[0] !== result.bbox[2]) kit.fit(result.bbox, { maxZoom: this.opts.zoom });
      else kit.goTo({ center: [result.lon, result.lat], zoom: this.opts.zoom });
      this._pinSource.clear();
      if (this.opts.marker) this._pinSource.addFeature(new ol.Feature(new ol.geom.Point(kit.toMap([result.lon, result.lat]))));
      kit.emit("searchselect", result);
    }
    clear() {
      this._pinSource.clear();
      if (this.input) this.input.value = "";
      if (this.list) this.list.innerHTML = "";
    }
    destroy() {
      this.kit.olMap.removeLayer(this._pinLayer);
      if (this.box) this.box.remove();
    }
  };

  // src/modules/select.js
  var Select = class {
    constructor(kit) {
      this.kit = kit;
      this.mode = null;
      this.highlight = new ol.source.Vector();
      this.hlLayer = new ol.layer.Vector({
        source: this.highlight,
        zIndex: 900,
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({ color: "#ffeb3b", width: 4 }),
          fill: new ol.style.Fill({ color: "rgba(255,235,59,0.25)" }),
          image: new ol.style.Circle({ radius: 10, stroke: new ol.style.Stroke({ color: "#ffeb3b", width: 4 }) })
        })
      });
      this.hlLayer.set("olmkInternal", "selection");
      kit.olMap.addLayer(this.hlLayer);
      this.result = null;
      if (kit.options.controls.select) {
        this._button = kit.ui.button({ id: "select", icon: "select", title: kit.t("selectBox"), order: 35, onClick: () => this.mode ? this.stop() : this.byBox() });
      }
    }
    _begin(mode, opts) {
      const kit = this.kit;
      this.stop();
      this.mode = mode;
      this.opts = opts || {};
      kit.activateTool("select", { stop: () => this.stop(), blocksClicks: true });
      if (this._button) this._button.setActive(true);
      this.ui = kit.ui.toolbar([
        { id: "box", label: kit.t("selectBox"), kind: mode === "box" ? "primary" : "", onClick: () => this.byBox(this.opts) },
        { id: "polygon", label: kit.t("selectPolygon"), kind: mode === "polygon" ? "primary" : "", onClick: () => this.byPolygon(this.opts) },
        { id: "clear", label: kit.t("clear"), onClick: () => this.clear() },
        { id: "close", label: kit.t("close"), onClick: () => this.stop() }
      ]);
      this._renderCount();
    }
    byBox(opts) {
      this._begin("box", opts);
      const i = this.interaction = new ol.interaction.DragBox({ condition: ol.events.condition.always, className: "olmk-dragbox" });
      i.on("boxend", () => {
        const g = i.getGeometry();
        this.byGeometry(this.kit.writeGeometry(g), this.opts);
      });
      this.kit.olMap.addInteraction(i);
      this._offPan = this.kit.addPanGuard(() => false);
      return this;
    }
    byPolygon(opts) {
      this._begin("polygon", opts);
      const i = this.interaction = new ol.interaction.Draw({ type: "Polygon", stopClick: true });
      i.on("drawend", (e) => {
        const g = this.kit.writeGeometry(e.feature.getGeometry());
        setTimeout(() => this.byGeometry(g, this.opts), 0);
      });
      this.kit.olMap.addInteraction(i);
      return this;
    }
    // Selects everything intersecting a GeoJSON geometry (lon/lat)
    byGeometry(geometry, opts) {
      const kit = this.kit;
      const o = opts || {};
      const target = typeof geometry === "string" ? JSON.parse(geometry) : geometry;
      const extent = kit.readGeometry(target).getExtent();
      const ids = o.layers ? [].concat(o.layers) : kit.layers.vectorLayerIds().filter((id) => kit.layers.get(id).getVisible());
      const byLayer = {};
      const selected = [];
      ids.forEach((id) => {
        const layer = kit.layers.get(id);
        const source = layer && layer.getSource();
        if (!source || !source.getFeaturesInExtent) return;
        source.getFeaturesInExtent(extent).forEach((f) => {
          const g = f.getGeometry();
          if (!g) return;
          if (!intersects(target, kit.writeGeometry(g))) return;
          (byLayer[id] || (byLayer[id] = [])).push(f.getId() != null ? f.getId() : ol.util.getUid(f));
          selected.push(f);
        });
      });
      const markers = o.markers === false ? [] : kit.markers.list().filter((m) => intersects(target, { type: "Point", coordinates: [m.lon, m.lat] })).map((m) => m.id);
      this.highlight.clear();
      selected.forEach((f) => this.highlight.addFeature(new ol.Feature(f.getGeometry().clone())));
      markers.forEach((id) => {
        const m = kit.markers.get(id);
        this.highlight.addFeature(new ol.Feature(new ol.geom.Point(kit.toMap([m.lon, m.lat]))));
      });
      this.result = {
        layers: byLayer,
        markers,
        count: selected.length + markers.length,
        geojson: kit.writeFeatures(selected)
      };
      kit.emit("selection", this.result);
      this._renderCount();
      return this.result;
    }
    _renderCount() {
      if (!this.ui) return;
      const n = this.result ? this.result.count : 0;
      this.ui.pill.innerHTML = this.kit.t("selected") + ": <b>" + n + "</b>";
      this.ui.hint.textContent = this.mode === "box" ? this.kit.t("selectBox") : this.kit.t("selectPolygon");
    }
    getSelection() {
      return this.result;
    }
    clear() {
      this.highlight.clear();
      this.result = null;
      this._renderCount();
      this.kit.emit("selection", { layers: {}, markers: [], count: 0, geojson: { type: "FeatureCollection", features: [] } });
    }
    stop() {
      if (!this.mode) return;
      if (this.interaction) this.kit.olMap.removeInteraction(this.interaction);
      this.interaction = null;
      if (this._offPan) {
        this._offPan();
        this._offPan = null;
      }
      if (this.ui) {
        this.ui.destroy();
        this.ui = null;
      }
      this.mode = null;
      if (this._button) this._button.setActive(false);
      this.kit.releaseTool("select");
    }
    destroy() {
      this.stop();
      this.kit.olMap.removeLayer(this.hlLayer);
    }
  };

  // src/modules/io.js
  var IO = class {
    constructor(kit) {
      this.kit = kit;
      this._seq = 0;
      const c = kit.options.controls;
      if (c.import) {
        this._fileInput = el("input", { type: "file", accept: ".geojson,.json,.kml,.kmz,.gpx,.zip,.wkt,.csv", multiple: "multiple", hidden: "hidden" });
        this._fileInput.addEventListener("change", () => {
          Array.from(this._fileInput.files || []).forEach((f) => this.importFile(f));
          this._fileInput.value = "";
        });
        kit.el.appendChild(this._fileInput);
        kit.ui.button({ id: "import", icon: "upload", title: kit.t("importFile"), order: 40, onClick: () => this._fileInput.click() });
        this.enableDragDrop(true);
      }
      if (c.print) kit.ui.button({ id: "print", icon: "print", title: kit.t("print"), order: 45, onClick: () => this.print() });
    }
    /* ---------------- import ---------------- */
    importFile(file, opts) {
      const name = file.name || "file";
      const ext = name.split(".").pop().toLowerCase();
      const kit = this.kit;
      let job;
      if (ext === "zip") {
        if (typeof shp === "undefined") job = Promise.reject(new Error("shpjs is not loaded"));
        else job = file.arrayBuffer().then((buf) => shp(buf)).then((gj) => ({ geojson: Array.isArray(gj) ? { type: "FeatureCollection", features: gj.flatMap((x) => x.features) } : gj }));
      } else if (ext === "kmz") {
        if (typeof JSZip === "undefined") job = Promise.reject(new Error("JSZip is not loaded"));
        else job = file.arrayBuffer().then((buf) => JSZip.loadAsync(buf)).then((zip) => {
          const kml = Object.keys(zip.files).find((n) => /\.kml$/i.test(n));
          if (!kml) throw new Error("No KML inside KMZ");
          return zip.files[kml].async("string");
        }).then((text) => ({ text, ext: "kml" }));
      } else {
        job = file.text().then((text) => ({ text, ext }));
      }
      return job.then((r) => this._importParsed(r, name, opts)).catch((err) => {
        kit.ui.toast(kit.t("importFailed"));
        kit.emit("importerror", { name, message: String(err && err.message || err) });
        throw err;
      });
    }
    importText(text, name, opts) {
      const ext = (name || "data.geojson").split(".").pop().toLowerCase();
      return Promise.resolve(this._importParsed({ text, ext }, name, opts));
    }
    _readFeatures(r) {
      const kit = this.kit;
      const proj = { featureProjection: kit.projection };
      if (r.geojson) return new ol.format.GeoJSON().readFeatures(r.geojson, proj);
      const text = r.text;
      switch (r.ext) {
        case "kml":
          return new ol.format.KML({ extractStyles: false }).readFeatures(text, proj);
        case "gpx":
          return new ol.format.GPX().readFeatures(text, proj);
        case "wkt":
          return text.split(/\n(?=\s*[A-Z])/).map((s) => s.trim()).filter(Boolean).map((s) => new ol.format.WKT().readFeature(s, { dataProjection: "EPSG:4326", featureProjection: kit.projection }));
        case "csv":
          return this._readCsv(text);
        default:
          return new ol.format.GeoJSON().readFeatures(JSON.parse(text), proj);
      }
    }
    _readCsv(text) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) return [];
      const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
      const split2 = (line) => {
        const out = [];
        let cur = "";
        let q = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') q = !q;
          else if (ch === sep && !q) {
            out.push(cur);
            cur = "";
          } else cur += ch;
        }
        out.push(cur);
        return out.map((s) => s.trim());
      };
      const head = split2(lines[0]);
      const find = (re) => head.findIndex((h) => re.test(h));
      const iLat = find(/^(lat|latitude|y)$/i);
      const iLon = find(/^(lon|lng|long|longitude|x)$/i);
      if (iLat < 0 || iLon < 0) throw new Error("CSV needs lat/lon columns");
      return lines.slice(1).map((line) => {
        const v = split2(line);
        const lon = Number(String(v[iLon]).replace(",", "."));
        const lat = Number(String(v[iLat]).replace(",", "."));
        if (!isFinite(lon) || !isFinite(lat)) return null;
        const props = {};
        head.forEach((h, i) => {
          if (i !== iLat && i !== iLon) props[h] = v[i];
        });
        return new ol.Feature(Object.assign(props, { geometry: new ol.geom.Point(this.kit.toMap([lon, lat])) }));
      }).filter(Boolean);
    }
    _importParsed(r, name, opts) {
      const kit = this.kit;
      const o = opts || {};
      const features = this._readFeatures(r);
      const layerId = o.layerId || "import-" + ++this._seq;
      if (!kit.layers.has(layerId)) {
        kit.layers.add(Object.assign({ id: layerId, type: "vector", title: o.title || name, style: o.style, popup: o.popup !== false ? true : false }, o.layer || {}));
      }
      kit.layers.get(layerId).getSource().addFeatures(features);
      if (o.fit !== false) kit.layers.zoomTo(layerId);
      kit.ui.toast(kit.t("imported", { count: features.length }));
      const payload = { layerId, name, count: features.length };
      kit.emit("import", payload);
      return payload;
    }
    enableDragDrop(on) {
      const target = this.kit.el;
      if (on === false) {
        if (this._dd) {
          this._dd.forEach(([t, fn]) => target.removeEventListener(t, fn));
          this._dd = null;
        }
        return;
      }
      if (this._dd) return;
      const overlay = el("div", { class: "olmk-drop" }, "<span></span>");
      overlay.querySelector("span").textContent = this.kit.t("importDrop");
      target.appendChild(overlay);
      let depth = 0;
      const show = (v) => overlay.classList.toggle("is-visible", v);
      const hasFiles = (e) => e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0;
      const handlers = [
        ["dragenter", (e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          depth++;
          show(true);
        }],
        ["dragover", (e) => {
          if (hasFiles(e)) e.preventDefault();
        }],
        ["dragleave", () => {
          depth = Math.max(0, depth - 1);
          if (!depth) show(false);
        }],
        ["drop", (e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          depth = 0;
          show(false);
          Array.from(e.dataTransfer.files).forEach((f) => this.importFile(f).catch(() => {
          }));
        }]
      ];
      handlers.forEach(([t, fn]) => target.addEventListener(t, fn));
      this._dd = handlers;
      this._ddOverlay = overlay;
    }
    /* ---------------- export ---------------- */
    _featuresFor(source) {
      const kit = this.kit;
      if (source && typeof source === "object") return kit.readFeatures(source);
      if (source === "draw") {
        const r = kit.draw.getResult();
        return r && r.geojson ? kit.readFeatures(r.geojson) : [];
      }
      if (source === "selection") {
        const r = kit.select.getSelection();
        return r ? kit.readFeatures(r.geojson) : [];
      }
      if (source === "markers") {
        return kit.markers.list().map((m) => {
          const f = new ol.Feature(Object.assign({ id: m.id, title: m.title || "", description: m.description || "" }, m.data || {}, { geometry: new ol.geom.Point(kit.toMap([m.lon, m.lat])) }));
          f.setId(m.id);
          return f;
        });
      }
      const layer = kit.layers.get(source);
      const s = layer && layer.getSource();
      return s && s.getFeatures ? s.getFeatures() : [];
    }
    export(source, format) {
      const kit = this.kit;
      const features = this._featuresFor(source);
      const opts = { featureProjection: kit.projection, dataProjection: "EPSG:4326", decimals: 7 };
      switch ((format || "geojson").toLowerCase()) {
        case "kml":
          return new ol.format.KML().writeFeatures(features, opts);
        case "gpx":
          return new ol.format.GPX().writeFeatures(features.filter((f) => /Point|LineString/.test(f.getGeometry().getType())), opts);
        case "wkt":
          return features.map((f) => new ol.format.WKT().writeFeature(f, opts)).join("\n");
        case "csv": {
          const pts = features.filter((f) => f.getGeometry() && f.getGeometry().getType() === "Point");
          const keys = [];
          pts.forEach((f) => Object.keys(f.getProperties()).forEach((k) => {
            if (k !== "geometry" && keys.indexOf(k) < 0) keys.push(k);
          }));
          const esc = (v) => {
            const s = v == null ? "" : String(v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          };
          const rows = pts.map((f) => {
            const ll = kit.toLonLat(f.getGeometry().getCoordinates());
            return [ll[1].toFixed(7), ll[0].toFixed(7)].concat(keys.map((k) => esc(f.get(k)))).join(",");
          });
          return ["lat,lon"].concat(keys.map(esc)).join(",") + "\n" + rows.join("\n");
        }
        default:
          return JSON.stringify(new ol.format.GeoJSON().writeFeaturesObject(features, opts));
      }
    }
    download(source, format, filename) {
      const fmt = (format || "geojson").toLowerCase();
      const mime = { geojson: "application/geo+json", kml: "application/vnd.google-earth.kml+xml", gpx: "application/gpx+xml", wkt: "text/plain", csv: "text/csv" }[fmt] || "text/plain";
      const name = filename || (typeof source === "string" ? source : "export") + "." + fmt;
      downloadFile(name, this.export(source, fmt), mime);
      this.kit.emit("export", { source: typeof source === "string" ? source : "geojson", format: fmt, filename: name });
    }
    /* ---------------- print ---------------- */
    // Composes the map canvases into one image (layers need CORS-enabled sources)
    snapshot(scale) {
      const map = this.kit.olMap;
      return new Promise((resolve, reject) => {
        map.once("rendercomplete", () => {
          try {
            const size = map.getSize();
            const pr = scale || window.devicePixelRatio || 1;
            const out = document.createElement("canvas");
            out.width = Math.round(size[0] * pr);
            out.height = Math.round(size[1] * pr);
            const ctx = out.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, out.width, out.height);
            map.getViewport().querySelectorAll(".ol-layer canvas, canvas.ol-layer").forEach((canvas) => {
              if (!canvas.width) return;
              const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
              ctx.globalAlpha = opacity === "" ? 1 : Number(opacity);
              let m;
              const tr = canvas.style.transform;
              if (tr && /^matrix\(/.test(tr)) m = tr.match(/^matrix\(([^(]*)\)$/)[1].split(",").map(Number);
              else m = [parseFloat(canvas.style.width || size[0]) / canvas.width, 0, 0, parseFloat(canvas.style.height || size[1]) / canvas.height, 0, 0];
              ctx.setTransform(m[0] * pr, m[1] * pr, m[2] * pr, m[3] * pr, m[4] * pr, m[5] * pr);
              ctx.drawImage(canvas, 0, 0);
            });
            ctx.globalAlpha = 1;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            resolve(out);
          } catch (e) {
            reject(e);
          }
        });
        map.renderSync();
      });
    }
    print(options) {
      const kit = this.kit;
      const o = Object.assign({ title: kit.t("printTitle"), format: "png", legend: true, scale: true, north: true, download: true, filename: null }, options || {});
      const pr = 2;
      return this.snapshot(pr).then((mapCanvas) => {
        const head = o.title ? 56 * pr : 0;
        const foot = 28 * pr;
        const page = document.createElement("canvas");
        page.width = mapCanvas.width;
        page.height = mapCanvas.height + head + foot;
        const ctx = page.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, page.width, page.height);
        ctx.drawImage(mapCanvas, 0, head);
        const font = (s) => s * pr + "px system-ui, sans-serif";
        if (o.title) {
          ctx.fillStyle = "#1d2330";
          ctx.font = "700 " + font(20);
          ctx.textBaseline = "middle";
          ctx.fillText(o.title, 16 * pr, head / 2);
          ctx.font = font(12);
          ctx.fillStyle = "#5f6b7a";
          const date = (/* @__PURE__ */ new Date()).toLocaleDateString(kit.options.locale || "en");
          ctx.textAlign = "right";
          ctx.fillText(date, page.width - 16 * pr, head / 2);
          ctx.textAlign = "left";
        }
        if (o.north) this._drawNorth(ctx, page.width - 40 * pr, head + 40 * pr, 18 * pr, kit.olMap.getView().getRotation());
        if (o.scale) this._drawScale(ctx, 16 * pr, head + mapCanvas.height - 20 * pr, pr);
        if (o.legend) this._drawLegend(ctx, 16 * pr, head + 16 * pr, pr);
        const attr = Array.from(kit.el.querySelectorAll(".ol-attribution li")).map((li) => li.textContent.trim()).filter(Boolean).join(" \xB7 ");
        ctx.fillStyle = "#5f6b7a";
        ctx.font = font(10);
        ctx.textBaseline = "middle";
        ctx.fillText(attr.slice(0, 200), 16 * pr, head + mapCanvas.height + foot / 2);
        const filename = o.filename || (o.title || "map").replace(/[^\w-]+/g, "_") + "." + o.format;
        if (o.format === "pdf" && typeof jspdf !== "undefined") {
          const w = page.width / pr;
          const h = page.height / pr;
          const doc = new jspdf.jsPDF({ orientation: w > h ? "landscape" : "portrait", unit: "px", format: [w, h], hotfixes: ["px_scaling"] });
          doc.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, w, h);
          const blob = doc.output("blob");
          if (o.download) downloadFile(filename, blob);
          kit.emit("print", { format: "pdf", filename, width: w, height: h });
          return blob;
        }
        return new Promise((resolve) => page.toBlob((blob) => {
          if (o.download) downloadFile(filename.replace(/\.pdf$/, ".png"), blob);
          kit.emit("print", { format: "png", filename, width: page.width, height: page.height });
          resolve(blob);
        }, "image/png"));
      }).catch((err) => {
        kit.emit("printerror", { message: String(err && err.message || err) });
        kit.ui.toast("Print failed: " + (err && err.message || err));
        throw err;
      });
    }
    _drawNorth(ctx, x, y, r, rotation) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c62828";
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.45, r * 0.2);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#1d2330";
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(-r * 0.45, r * 0.2);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.font = "700 " + Math.round(r * 0.7) + "px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("N", 0, r * 0.95);
      ctx.restore();
    }
    _drawScale(ctx, x, y, pr) {
      const kit = this.kit;
      const view = kit.olMap.getView();
      const center = view.getCenter();
      const mpp = ol.proj.getPointResolution(kit.projection, view.getResolution(), center, "m");
      const target = 120 * mpp;
      const pow = Math.pow(10, Math.floor(Math.log10(target)));
      const nice = [1, 2, 5, 10].map((n) => n * pow).filter((n) => n <= target).pop() || pow;
      const px = nice / mpp * pr;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillRect(x - 6 * pr, y - 18 * pr, px + 12 * pr, 26 * pr);
      ctx.fillStyle = "#1d2330";
      ctx.fillRect(x, y, px, 4 * pr);
      ctx.font = 11 * pr + "px system-ui";
      ctx.textBaseline = "bottom";
      ctx.fillText(kit.format.length(nice), x, y - 2 * pr);
    }
    _drawLegend(ctx, x, y, pr) {
      const kit = this.kit;
      const rows = [];
      kit.layers.list().filter((l) => l.visible).forEach((l) => {
        const def = kit.layers.getDef(l.id);
        if (def.listed === false) return;
        const entries = def.legendEntries || legendEntries(def.style);
        const color = def.style && (def.style.stroke || def.style.color);
        rows.push({ title: l.title, color: entries.length ? null : color || "#1e88e5" });
        entries.forEach((e) => rows.push({ title: e.label, color: e.color, indent: true }));
      });
      if (!rows.length) return;
      const lh = 18 * pr;
      const w = 200 * pr;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(x, y, w, rows.length * lh + 12 * pr);
      ctx.font = 11 * pr + "px system-ui";
      ctx.textBaseline = "middle";
      rows.forEach((r, i) => {
        const cy = y + 6 * pr + i * lh + lh / 2;
        let tx = x + 8 * pr + (r.indent ? 10 * pr : 0);
        if (r.color) {
          ctx.fillStyle = r.color;
          ctx.fillRect(tx, cy - 5 * pr, 12 * pr, 10 * pr);
          tx += 18 * pr;
        }
        ctx.fillStyle = "#1d2330";
        ctx.font = (r.indent ? "" : "600 ") + 11 * pr + "px system-ui";
        ctx.fillText(String(r.title).slice(0, 32), tx, cy);
      });
    }
    destroy() {
      this.enableDragDrop(false);
      if (this._ddOverlay) this._ddOverlay.remove();
      if (this._fileInput) this._fileInput.remove();
    }
  };

  // src/modules/geolocation.js
  var Geolocation = class {
    constructor(kit, options) {
      this.kit = kit;
      this.opts = Object.assign({ highAccuracy: true, zoom: 17, trackMinDistance: 3, trackMaxAccuracy: 50 }, options || {});
      this.active = false;
      this.follow = false;
      this.last = null;
      this._waiters = [];
      this.geo = new ol.Geolocation({
        projection: kit.projection,
        trackingOptions: { enableHighAccuracy: this.opts.highAccuracy, maximumAge: 5e3, timeout: 2e4 }
      });
      this.accuracyFeature = new ol.Feature();
      this.positionFeature = new ol.Feature();
      this.trackFeature = new ol.Feature();
      this.source = new ol.source.Vector({ features: [this.trackFeature, this.accuracyFeature, this.positionFeature] });
      this.layer = new ol.layer.Vector({ source: this.source, zIndex: 80, style: (f) => this._style(f) });
      this.layer.set("olmkInternal", "geolocation");
      kit.olMap.addLayer(this.layer);
      this.geo.on("change:position", () => this._onPosition());
      this.geo.on("change:accuracyGeometry", () => this.accuracyFeature.setGeometry(this.geo.getAccuracyGeometry()));
      this.geo.on("error", (err) => this._onError(err));
      this._onDrag = () => {
        if (this.follow) {
          this.follow = false;
          this.kit.emit("followchange", { follow: false });
        }
      };
      kit.olMap.on("pointerdrag", this._onDrag);
      if (kit.options.controls.locate) {
        this._button = kit.ui.button({ id: "locate", icon: "locate", title: kit.t("locate"), order: 20, onClick: () => this._toggleFromButton() });
      }
    }
    _toggleFromButton() {
      if (this.active && this.follow) this.stop();
      else if (this.active) {
        this.follow = true;
        if (this.last) this._center();
      } else this.start({ follow: true });
    }
    _style(f) {
      if (f === this.accuracyFeature) {
        return new ol.style.Style({ fill: new ol.style.Fill({ color: "rgba(30,136,229,0.12)" }), stroke: new ol.style.Stroke({ color: "rgba(30,136,229,0.5)", width: 1 }) });
      }
      if (f === this.trackFeature) {
        return new ol.style.Style({ stroke: new ol.style.Stroke({ color: "#8e24aa", width: 4 }) });
      }
      if (f === this.positionFeature) {
        const heading = this.geo.getHeading();
        const styles = [];
        if (heading != null && isFinite(heading)) {
          styles.push(new ol.style.Style({
            image: new ol.style.RegularShape({
              points: 3,
              radius: 10,
              displacement: [0, 14],
              rotation: heading,
              rotateWithView: true,
              fill: new ol.style.Fill({ color: "rgba(30,136,229,0.85)" })
            })
          }));
        }
        styles.push(new ol.style.Style({
          image: new ol.style.Circle({ radius: 8, fill: new ol.style.Fill({ color: "#1e88e5" }), stroke: new ol.style.Stroke({ color: "#fff", width: 3 }) })
        }));
        return styles;
      }
      return null;
    }
    start(opts) {
      const o = opts || {};
      this.follow = o.follow !== false;
      this._firstFix = true;
      if (!this.active) {
        this.active = true;
        this.geo.setTracking(true);
        this.kit.ui.toast(this.kit.t("locating"), 2e3);
      }
      if (this._button) this._button.setActive(true);
      this.kit.emit("geolocationstart", { follow: this.follow });
    }
    stop() {
      this.active = false;
      this.follow = false;
      if (!this.tracking) this.geo.setTracking(false);
      this.accuracyFeature.setGeometry(null);
      this.positionFeature.setGeometry(null);
      if (this._button) this._button.setActive(false);
      this.kit.emit("geolocationstop", {});
    }
    _payload() {
      const g = this.geo;
      const p = g.getPosition();
      if (!p) return null;
      const ll = this.kit.toLonLat(p);
      const h = g.getHeading();
      return {
        lon: ll[0],
        lat: ll[1],
        accuracy: g.getAccuracy() || null,
        heading: h != null && isFinite(h) ? (h * 180 / Math.PI + 360) % 360 : null,
        speed: g.getSpeed() != null ? g.getSpeed() : null,
        altitude: g.getAltitude() != null ? g.getAltitude() : null,
        time: Date.now()
      };
    }
    _onPosition() {
      const p = this.geo.getPosition();
      const payload = this._payload();
      if (!payload) return;
      this.last = payload;
      if (this.active) this.positionFeature.setGeometry(new ol.geom.Point(p));
      if (this.active && (this.follow || this._firstFix)) this._center();
      this._firstFix = false;
      if (this.tracking) this._addTrackPoint(p, payload);
      this.kit.emit("position", payload);
      this._waiters.splice(0).forEach((w) => w.resolve(payload));
      if (!this.active && !this.tracking) this.geo.setTracking(false);
    }
    _center() {
      const view = this.kit.olMap.getView();
      const p = this.geo.getPosition();
      if (!p) return;
      view.animate({ center: p, zoom: Math.max(view.getZoom(), this.opts.zoom), duration: 400 });
    }
    _onError(err) {
      const msg = err && err.message ? err.message : String(err);
      this.kit.ui.toast(this.kit.t("locationError"));
      this.kit.emit("geolocationerror", { message: msg, code: err && err.code });
      this._waiters.splice(0).forEach((w) => w.reject(new Error(msg)));
      if (this._button) this._button.setActive(false);
      this.active = false;
    }
    // One position (reuses a recent fix, otherwise asks the device)
    getCurrentPosition(maxAgeMs) {
      const age = maxAgeMs != null ? maxAgeMs : 1e4;
      if (this.last && Date.now() - this.last.time <= age) return Promise.resolve(this.last);
      return new Promise((resolve, reject) => {
        this._waiters.push({ resolve, reject });
        this.geo.setTracking(true);
        setTimeout(() => {
          const i = this._waiters.findIndex((w) => w.resolve === resolve);
          if (i >= 0) {
            this._waiters.splice(i, 1);
            reject(new Error("timeout"));
          }
        }, 25e3);
      });
    }
    /* ---------------- track recording ---------------- */
    startTrack() {
      this.tracking = true;
      this.trackCoords = [];
      this.trackTimes = [];
      this.trackFeature.setGeometry(null);
      this.geo.setTracking(true);
      this.kit.emit("trackstart", {});
    }
    _addTrackPoint(p, payload) {
      if (payload.accuracy != null && payload.accuracy > this.opts.trackMaxAccuracy) return;
      const last = this.trackCoords[this.trackCoords.length - 1];
      if (last) {
        const d = ol.sphere.getDistance(this.kit.toLonLat(last), [payload.lon, payload.lat]);
        if (d < this.opts.trackMinDistance) return;
      }
      this.trackCoords.push(p.slice());
      this.trackTimes.push(payload.time);
      if (this.trackCoords.length >= 2) this.trackFeature.setGeometry(new ol.geom.LineString(this.trackCoords));
      this.kit.emit("trackupdate", { points: this.trackCoords.length, length: this._trackLength() });
    }
    // Adds a point to the track manually (e.g. from an external GPS or for testing)
    addTrackPoint(lonLat, accuracy) {
      if (!this.tracking) return;
      this._addTrackPoint(this.kit.toMap(lonLat), { lon: lonLat[0], lat: lonLat[1], accuracy: accuracy || 5, time: Date.now() });
    }
    _trackLength() {
      const g = this.trackFeature.getGeometry();
      return g ? ol.sphere.getLength(g, { projection: this.kit.projection }) : 0;
    }
    stopTrack() {
      if (!this.tracking) return null;
      this.tracking = false;
      if (!this.active) this.geo.setTracking(false);
      const g = this.trackFeature.getGeometry();
      const result = {
        points: this.trackCoords.length,
        length: this._trackLength(),
        geojson: g ? { type: "Feature", properties: { times: this.trackTimes }, geometry: this.kit.writeGeometry(g) } : null
      };
      this.kit.emit("trackend", result);
      return result;
    }
    clearTrack() {
      this.trackFeature.setGeometry(null);
      this.trackCoords = [];
    }
    destroy() {
      this.geo.setTracking(false);
      this.kit.olMap.un("pointerdrag", this._onDrag);
      this.kit.olMap.removeLayer(this.layer);
    }
  };

  // src/modules/offline.js
  var Offline = class {
    constructor(kit, options) {
      this.kit = kit;
      this.opts = Object.assign({ enabled: false, dbName: "olmk-tiles", maxTiles: 3e3, concurrency: 6 }, options || {});
      this.enabled = !!this.opts.enabled;
      this._dbp = null;
      this._mem = /* @__PURE__ */ new Map();
      if (kit.options.controls.offline) {
        this._button = kit.ui.button({ id: "offline", icon: "offline", title: kit.t("offline"), order: 42, onClick: () => this.prefetch().catch(() => {
        }) });
      }
    }
    enable(on) {
      this.enabled = on !== false;
      const bm = this.kit.basemaps;
      if (bm && bm.current) bm.set(bm.current);
      this.kit.emit("offlinetoggle", { enabled: this.enabled });
    }
    _db() {
      if (this._dbp) return this._dbp;
      this._dbp = new Promise((resolve) => {
        try {
          const req = indexedDB.open(this.opts.dbName, 1);
          req.onupgradeneeded = () => req.result.createObjectStore("tiles");
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
      return this._dbp;
    }
    getTile(cacheKey, url) {
      const k = cacheKey + "|" + url;
      return this._db().then((db) => {
        if (!db) return this._mem.get(k) || null;
        return new Promise((resolve) => {
          const req = db.transaction("tiles", "readonly").objectStore("tiles").get(k);
          req.onsuccess = () => resolve(req.result ? req.result.blob : null);
          req.onerror = () => resolve(null);
        });
      });
    }
    putTile(cacheKey, url, blob) {
      const k = cacheKey + "|" + url;
      return this._db().then((db) => {
        if (!db) {
          this._mem.set(k, blob);
          return;
        }
        return new Promise((resolve) => {
          const tx = db.transaction("tiles", "readwrite");
          tx.objectStore("tiles").put({ blob, t: Date.now() }, k);
          tx.oncomplete = tx.onerror = () => resolve();
        });
      });
    }
    stats() {
      return this._db().then((db) => {
        if (!db) return { count: this._mem.size };
        return new Promise((resolve) => {
          const req = db.transaction("tiles", "readonly").objectStore("tiles").count();
          req.onsuccess = () => resolve({ count: req.result });
          req.onerror = () => resolve({ count: 0 });
        });
      });
    }
    clear() {
      this._mem.clear();
      return this._db().then((db) => {
        if (!db) return;
        return new Promise((resolve) => {
          const tx = db.transaction("tiles", "readwrite");
          tx.objectStore("tiles").clear();
          tx.oncomplete = tx.onerror = () => resolve();
        });
      }).then(() => this.kit.emit("offlinecleared", {}));
    }
    // Lists tile URLs of the current base map for a bbox and zoom range
    _tileUrls(bbox2, minZoom, maxZoom) {
      const kit = this.kit;
      const layer = kit.basemaps.layer;
      const source = layer && layer.getSource();
      if (!source || !source.getTileUrlFunction) return [];
      const grid = source.getTileGridForProjection(kit.projection);
      const fn = source.getTileUrlFunction();
      const extent = kit.extentToMap(bbox2);
      const urls = [];
      for (let z = minZoom; z <= maxZoom; z++) {
        grid.forEachTileCoord(extent, z, (coord) => {
          const u = fn(coord, 1, kit.projection);
          if (u) urls.push(u);
        });
        if (urls.length > this.opts.maxTiles) break;
      }
      return urls;
    }
    countTiles(opts) {
      const o = this._prefetchOpts(opts);
      return this._tileUrls(o.bbox, o.minZoom, o.maxZoom).length;
    }
    _prefetchOpts(opts) {
      const v = this.kit.getView();
      const z = Math.round(v.zoom);
      return Object.assign({ bbox: v.bbox, minZoom: Math.max(0, z - 2), maxZoom: Math.min(z + 2, 19) }, opts || {});
    }
    prefetch(opts) {
      const kit = this.kit;
      const def = kit.basemaps.get();
      if (!def || def.offline === false || def.type === "none") {
        kit.ui.toast(kit.t("offlineNotAllowed"));
        kit.emit("offlineerror", { reason: "notallowed", basemap: def && def.id });
        return Promise.reject(new Error("notallowed"));
      }
      const o = this._prefetchOpts(opts);
      const urls = this._tileUrls(o.bbox, o.minZoom, o.maxZoom);
      if (urls.length > this.opts.maxTiles) {
        kit.ui.toast(kit.t("offlineTooMany", { count: urls.length }));
        kit.emit("offlineerror", { reason: "toomany", count: urls.length });
        return Promise.reject(new Error("toomany"));
      }
      const key = "basemap:" + def.id;
      this.enabled = true;
      let done = 0;
      let i = 0;
      const total = urls.length;
      const next = () => {
        if (i >= total) return Promise.resolve();
        const url = urls[i++];
        return this.getTile(key, url).then((hit) => hit || fetch(url).then((r) => {
          if (!r.ok) throw new Error();
          return r.blob();
        }).then((b) => this.putTile(key, url, b))).catch(() => {
        }).then(() => {
          done++;
          if (done % 10 === 0 || done === total) {
            kit.emit("offlineprogress", { done, total });
            kit.ui.toast(kit.t("offlineSaving", { done, total }), 1500);
          }
          return next();
        });
      };
      const workers = [];
      for (let w = 0; w < Math.min(this.opts.concurrency, total); w++) workers.push(next());
      return Promise.all(workers).then(() => {
        kit.ui.toast(kit.t("offlineSaved", { count: total }));
        kit.emit("offlinedone", { count: total, basemap: def.id, minZoom: o.minZoom, maxZoom: o.maxZoom });
        return { count: total };
      });
    }
    destroy() {
    }
  };

  // src/modules/viz.js
  var Viz = class {
    constructor(kit) {
      this.kit = kit;
      this._time = null;
      this._routes = [];
    }
    _features(layerId) {
      const l = this.kit.layers.get(layerId);
      const s = l && l.getSource && l.getSource();
      return s && s.getFeatures ? s.getFeatures() : [];
    }
    heatmap(opts) {
      const kit = this.kit;
      const o = Object.assign({ id: "heatmap", title: "Heatmap", radius: 16, blur: 22, weight: null, intensity: 1, opacity: 0.85 }, opts || {});
      let source;
      if (o.layer) {
        source = new ol.source.Vector({ features: this._features(o.layer).map((f) => f.clone()) });
      } else if (Array.isArray(o.data)) {
        source = new ol.source.Vector({
          features: o.data.map((p) => {
            const lon = p.lon != null ? p.lon : p[0];
            const lat = p.lat != null ? p.lat : p[1];
            return new ol.Feature({ geometry: new ol.geom.Point(kit.toMap([lon, lat])), weight: p.weight != null ? p.weight : p[2] != null ? p[2] : 1 });
          })
        });
      } else {
        source = new ol.source.Vector({ features: kit.readFeatures(o.data) });
      }
      let max = 1;
      const wp = o.weight || "weight";
      source.getFeatures().forEach((f) => {
        const w = Number(f.get(wp));
        if (isFinite(w) && w > max) max = w;
      });
      const layer = new ol.layer.Heatmap({
        source,
        radius: o.radius,
        blur: o.blur,
        gradient: o.gradient,
        weight: (f) => {
          const w = Number(f.get(wp));
          return Math.max(0, Math.min(1, (isFinite(w) ? w / max : 1) * o.intensity));
        }
      });
      return kit.layers.register({ id: o.id, title: o.title, type: "heatmap", opacity: o.opacity, legend: false }, layer);
    }
    // Keeps label settings of the current style when a thematic style replaces it
    _keep(layerId, spec, label) {
      const def = this.kit.layers.getDef(layerId);
      const cur = def && def.style || {};
      ["label", "labelColor", "labelHalo", "font", "minZoomLabel"].forEach((k) => {
        if (spec[k] == null && cur[k] != null) spec[k] = cur[k];
      });
      if (label != null) spec.label = label;
      return spec;
    }
    _range(layerId, property) {
      const vals = this._features(layerId).map((f) => Number(f.get(property))).filter((v) => isFinite(v));
      return { min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), values: vals };
    }
    proportional(layerId, opts) {
      const o = Object.assign({ minRadius: 4, maxRadius: 28, color: "#e53935" }, opts || {});
      const r = this._range(layerId, o.property);
      const spec = this._keep(layerId, { type: "proportional", property: o.property, min: o.min != null ? o.min : r.min, max: o.max != null ? o.max : r.max, minRadius: o.minRadius, maxRadius: o.maxRadius, color: o.color, stroke: o.color }, o.label);
      this.kit.layers.setStyle(layerId, spec);
      return spec;
    }
    choropleth(layerId, opts) {
      const o = Object.assign({ classes: 5, method: "quantile", palette: "greens", fillOpacity: 0.72 }, opts || {});
      const r = this._range(layerId, o.property);
      const breaks = o.breaks || computeBreaks(r.values, o.classes, o.method);
      const colors = o.colors || paletteFor(o.palette, breaks.length + 1);
      const spec = this._keep(layerId, { type: "ranges", property: o.property, breaks, colors, fillOpacity: o.fillOpacity, themeStroke: o.stroke || "#ffffff", width: 1 }, o.label);
      this.kit.layers.setStyle(layerId, spec);
      return { spec, legend: legendEntries(spec) };
    }
    categories(layerId, opts) {
      const o = Object.assign({ palette: "categorical", fillOpacity: 0.6 }, opts || {});
      let values = o.values;
      if (!values) {
        const unique = [];
        this._features(layerId).forEach((f) => {
          const v = f.get(o.property);
          if (v != null && unique.indexOf(v) < 0) unique.push(v);
        });
        const colors = paletteFor(o.palette, Math.max(unique.length, 2));
        values = {};
        unique.forEach((v, i) => {
          values[v] = colors[i % colors.length];
        });
      }
      const spec = this._keep(layerId, { type: "categories", property: o.property, values, default: o.default || "#9e9e9e", fillOpacity: o.fillOpacity }, o.label);
      this.kit.layers.setStyle(layerId, spec);
      return { spec, legend: legendEntries(spec) };
    }
    /* ---------------- time slider ---------------- */
    timeSlider(opts) {
      this.stopTime();
      const kit = this.kit;
      const o = Object.assign({ property: "time", layers: [], markers: false, step: 864e5, window: null, speed: 600, loop: true }, opts || {});
      const toMs = (v) => v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
      const layerIds = [].concat(o.layers || []);
      let start = o.start != null ? toMs(o.start) : Infinity;
      let end = o.end != null ? toMs(o.end) : -Infinity;
      if (o.start == null || o.end == null) {
        const scan = (v) => {
          const t = toMs(v);
          if (isFinite(t)) {
            if (o.start == null && t < start) start = t;
            if (o.end == null && t > end) end = t;
          }
        };
        layerIds.forEach((id) => this._features(id).forEach((f) => scan(f.get(o.property))));
        if (o.markers) kit.markers.list().forEach((m) => scan(m.data && m.data[o.property]));
      }
      if (!isFinite(start) || !isFinite(end)) return null;
      const steps = Math.max(1, Math.round((end - start) / o.step));
      const box = el("div", { class: "olmk-time" });
      const btn = el("button", { type: "button", "aria-label": kit.t("timePlay") }, svg("play"));
      const range = el("input", { type: "range", min: "0", max: String(steps), step: "1", "aria-label": "time" });
      const out = el("output");
      box.appendChild(btn);
      box.appendChild(range);
      box.appendChild(out);
      kit.olMap.getOverlayContainerStopEvent().appendChild(box);
      const fmt = o.format || ((t) => new Date(t).toLocaleDateString(kit.options.locale || "en", { year: "numeric", month: "short", day: "numeric" }));
      const state = { current: end, timer: null };
      const visible = (v) => {
        const t = toMs(v);
        if (!isFinite(t)) return false;
        if (t > state.current) return false;
        return o.window == null || t > state.current - o.window;
      };
      const apply = () => {
        out.textContent = fmt(state.current);
        layerIds.forEach((id) => {
          const def = kit.layers.getDef(id);
          const base = compileFilter(def && def.baseFilter);
          kit.layers.setFilter(id, (f) => visible(f.get(o.property)) && (!base || base(f)));
        });
        if (o.markers) kit.markers.setFilter((f) => visible(f.get(o.property)));
        kit.emit("timechange", { time: state.current, iso: new Date(state.current).toISOString() });
      };
      const set = (i) => {
        range.value = String(i);
        state.current = Math.min(end, start + i * o.step);
        apply();
      };
      const pause = () => {
        clearInterval(state.timer);
        state.timer = null;
        btn.innerHTML = svg("play");
        btn.setAttribute("aria-label", kit.t("timePlay"));
      };
      const play = () => {
        if (state.timer) return;
        if (Number(range.value) >= steps) set(0);
        btn.innerHTML = svg("pause");
        btn.setAttribute("aria-label", kit.t("timePause"));
        state.timer = setInterval(() => {
          const i = Number(range.value) + 1;
          if (i > steps) {
            if (o.loop) set(0);
            else pause();
            return;
          }
          set(i);
        }, o.speed);
      };
      btn.addEventListener("click", () => state.timer ? pause() : play());
      range.addEventListener("input", () => {
        pause();
        set(Number(range.value));
      });
      set(steps);
      this._time = {
        box,
        play,
        pause,
        set: (t) => set(Math.round((toMs(t) - start) / o.step)),
        destroy: () => {
          pause();
          box.remove();
          layerIds.forEach((id) => kit.layers.setFilter(id, kit.layers.getDef(id) && kit.layers.getDef(id).baseFilter || null));
          if (o.markers) kit.markers.setFilter(null);
        }
      };
      return this._time;
    }
    stopTime() {
      if (this._time) {
        this._time.destroy();
        this._time = null;
      }
    }
    /* ---------------- route animation ---------------- */
    animateRoute(opts) {
      const kit = this.kit;
      const o = Object.assign({ duration: 1e4, loop: false, follow: false, color: "#1e88e5", autoplay: true }, opts || {});
      let geom = null;
      if (o.coordinates) geom = new ol.geom.LineString(o.coordinates.map((c) => kit.toMap(c)));
      else if (o.geojson) geom = kit.readGeometry(o.geojson);
      else if (o.layer) {
        const f = this._features(o.layer).find((x) => /LineString/.test(x.getGeometry().getType()));
        geom = f && f.getGeometry().clone();
      }
      if (geom && geom.getType() === "MultiLineString") geom = new ol.geom.LineString([].concat.apply([], geom.getCoordinates()));
      if (!geom || geom.getType() !== "LineString") return null;
      const traveled = new ol.Feature();
      const mover = new ol.Feature(new ol.geom.Point(geom.getFirstCoordinate()));
      const source = new ol.source.Vector({ features: [new ol.Feature(geom), traveled, mover] });
      const layer = new ol.layer.Vector({
        source,
        zIndex: 850,
        style: (f) => {
          if (f === mover) {
            return new ol.style.Style({
              image: o.icon ? new ol.style.Icon({ src: o.icon, scale: o.iconScale || 1 }) : new ol.style.Circle({ radius: 9, fill: new ol.style.Fill({ color: o.color }), stroke: new ol.style.Stroke({ color: "#fff", width: 3 }) })
            });
          }
          if (f === traveled) return new ol.style.Style({ stroke: new ol.style.Stroke({ color: o.color, width: 5 }) });
          return new ol.style.Style({ stroke: new ol.style.Stroke({ color: "rgba(30,136,229,0.35)", width: 5, lineDash: [2, 8] }) });
        }
      });
      layer.set("olmkInternal", "route");
      kit.olMap.addLayer(layer);
      const total = ol.sphere.getLength(geom, { projection: kit.projection });
      const state = { progress: 0, playing: false, last: 0, raf: 0, lastEmit: 0 };
      const coordsUpTo = (fraction) => {
        const out = [geom.getFirstCoordinate()];
        let acc = 0;
        const c = geom.getCoordinates();
        const target = fraction * geom.getLength();
        for (let i = 1; i < c.length; i++) {
          const seg = Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]);
          if (acc + seg >= target) {
            out.push(geom.getCoordinateAt(fraction));
            return out;
          }
          acc += seg;
          out.push(c[i]);
        }
        return out;
      };
      const render = () => {
        const p = geom.getCoordinateAt(state.progress);
        mover.getGeometry().setCoordinates(p);
        traveled.setGeometry(new ol.geom.LineString(coordsUpTo(state.progress)));
        if (o.follow) kit.olMap.getView().setCenter(p);
        const now = Date.now();
        if (now - state.lastEmit > 250 || state.progress >= 1) {
          state.lastEmit = now;
          const ll = kit.toLonLat(p);
          kit.emit("routeprogress", { progress: state.progress, lon: ll[0], lat: ll[1], distance: total * state.progress, length: total });
        }
      };
      const frame = (t) => {
        if (!state.playing) return;
        const dt = state.last ? t - state.last : 0;
        state.last = t;
        state.progress = Math.min(1, state.progress + dt / o.duration);
        render();
        if (state.progress >= 1) {
          if (o.loop) state.progress = 0;
          else {
            state.playing = false;
            kit.emit("routeend", { length: total });
            return;
          }
        }
        state.raf = requestAnimationFrame(frame);
      };
      const ctrl = {
        length: total,
        play() {
          if (state.playing) return;
          if (state.progress >= 1) state.progress = 0;
          state.playing = true;
          state.last = 0;
          state.raf = requestAnimationFrame(frame);
        },
        pause() {
          state.playing = false;
          cancelAnimationFrame(state.raf);
        },
        seek(fraction) {
          state.progress = Math.max(0, Math.min(1, fraction));
          render();
        },
        stop: () => {
          ctrl.pause();
          kit.olMap.removeLayer(layer);
          this._routes = this._routes.filter((r) => r !== ctrl);
        },
        get progress() {
          return state.progress;
        }
      };
      this._routes.push(ctrl);
      render();
      if (o.fit !== false) kit.fit(geom.getExtent(), { mapExtent: true, maxZoom: 16 });
      if (o.autoplay) ctrl.play();
      return ctrl;
    }
    stopRoutes() {
      this._routes.slice().forEach((r) => r.stop());
    }
    destroy() {
      this.stopTime();
      this.stopRoutes();
    }
  };

  // src/modules/raster.js
  var NDVI_COLORS = [
    -0.2,
    [191, 191, 191],
    0,
    [255, 255, 224],
    0.2,
    [145, 191, 82],
    0.4,
    [79, 138, 46],
    0.6,
    [15, 84, 10],
    0.8,
    [0, 50, 0]
  ];
  function utmDef(code) {
    const m = /^EPSG:(32[67])(\d\d)$/.exec(code);
    if (!m) return null;
    return "+proj=utm +zone=" + Number(m[2]) + (m[1] === "327" ? " +south" : "") + " +datum=WGS84 +units=m +no_defs";
  }
  function ensureProjection(code) {
    if (!code || code === "EPSG:3857" || code === "EPSG:4326") return Promise.resolve();
    if (typeof proj4 === "undefined") return Promise.reject(new Error("proj4 is required to reproject " + code));
    if (!proj4.defs(code)) {
      const def = utmDef(code);
      if (!def) return ol.proj.proj4.fromEPSGCode(code).then(() => void 0);
      proj4.defs(code, def);
    }
    ol.proj.proj4.register(proj4);
    return Promise.resolve();
  }
  var Raster = class {
    constructor(kit) {
      this.kit = kit;
    }
    cog(opts) {
      const kit = this.kit;
      const o = Object.assign({ mode: "rgb", title: "Raster", opacity: 1, fit: true }, opts || {});
      if (typeof GeoTIFF === "undefined") {
        const err = new Error("geotiff.js (global GeoTIFF) must be loaded to use COG layers");
        kit.emit("layererror", { id: o.id || "cog", message: err.message });
        return Promise.reject(err);
      }
      const sources = o.sources || [{ url: o.url }];
      const srcDefs = sources.map((s) => typeof s === "string" ? { url: s } : s).map((s) => o.nodata === null ? s : Object.assign({ nodata: o.nodata != null ? o.nodata : 0 }, s));
      const normalize2 = o.mode === "rgb";
      let source;
      try {
        source = new ol.source.GeoTIFF({ sources: srcDefs, normalize: normalize2, convertToRGB: o.convertToRGB, interpolate: true });
      } catch (e) {
        kit.emit("layererror", { id: o.id || "cog", message: String(e.message || e) });
        return Promise.reject(e);
      }
      return source.getView().then((view) => {
        const code = view.projection && (view.projection.getCode ? view.projection.getCode() : view.projection);
        return ensureProjection(code).then(() => view);
      }).then((view) => {
        const layer = new ol.layer.WebGLTile({ source, style: this._style(o, srcDefs.length) });
        const def = { id: o.id, title: o.title, type: "cog", opacity: o.opacity, legend: false };
        const code = view.projection && (view.projection.getCode ? view.projection.getCode() : view.projection);
        if (view.extent) {
          const ext = ol.proj.transformExtent(view.extent, code, kit.projection);
          def.bbox = kit.extentToLonLat(ext);
          if (o.mode === "ndvi") def.legendEntries = [{ label: "< 0 (water, bare)", color: "rgb(255,255,224)" }, { label: "0.2", color: "rgb(145,191,82)" }, { label: "0.4", color: "rgb(79,138,46)" }, { label: "> 0.6 (dense vegetation)", color: "rgb(15,84,10)" }];
        }
        const id = kit.layers.register(def, layer);
        if (o.fit && def.bbox) kit.fit(def.bbox, { maxZoom: o.fitZoom || 13 });
        kit.emit("rasterload", { id, projection: code });
        return id;
      }).catch((err) => {
        kit.emit("layererror", { id: o.id || "cog", message: String(err && err.message || err) });
        throw err;
      });
    }
    // With nodata, the GeoTIFF source appends an alpha band after the data bands:
    // pixels where it is 0 are drawn transparent.
    _style(o, bandCount) {
      if (o.style) return o.style;
      const withAlpha2 = (color) => o.nodata === null ? color : ["case", ["==", ["band", bandCount + 1], 0], [0, 0, 0, 0], color];
      if (o.mode === "ndvi") {
        const red = ["band", 1];
        const nir = ["band", 2];
        const ndvi = ["/", ["-", nir, red], ["+", nir, red]];
        return { color: withAlpha2(["interpolate", ["linear"], ndvi].concat(o.colors || NDVI_COLORS)) };
      }
      if (o.mode === "single") {
        const min = o.min != null ? o.min : 0;
        const max = o.max != null ? o.max : 1;
        const b = ["band", o.band || 1];
        const colors = o.colors || [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];
        const stops = [];
        colors.forEach((c, i) => {
          stops.push(min + (max - min) * i / (colors.length - 1), c);
        });
        return { color: withAlpha2(["interpolate", ["linear"], b].concat(stops)) };
      }
      return void 0;
    }
    hillshade(opts) {
      const kit = this.kit;
      const o = Object.assign({
        id: "hillshade",
        title: "Hillshade",
        url: "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        attributions: "Elevation: Mapzen Terrain Tiles (AWS Open Data)",
        exaggeration: 1.5,
        sunElevation: 45,
        sunAzimuth: 315,
        opacity: 0.55,
        maxZoom: 15
      }, opts || {});
      const elevation = (dx, dy) => ["-", ["+", ["*", 255 * 256, ["band", 1, dx, dy]], ["*", 255, ["band", 2, dx, dy]], ["*", 255 / 256, ["band", 3, dx, dy]]], 32768];
      const dp = ["*", 2, ["resolution"]];
      const z0x = ["*", ["var", "vert"], elevation(-1, 0)];
      const z1x = ["*", ["var", "vert"], elevation(1, 0)];
      const dzdx = ["/", ["-", z1x, z0x], dp];
      const z0y = ["*", ["var", "vert"], elevation(0, -1)];
      const z1y = ["*", ["var", "vert"], elevation(0, 1)];
      const dzdy = ["/", ["-", z1y, z0y], dp];
      const slope = ["atan", ["sqrt", ["+", ["^", dzdx, 2], ["^", dzdy, 2]]]];
      const aspect = ["clamp", ["atan", ["-", 0, dzdx], dzdy], -Math.PI, Math.PI];
      const sunEl = ["*", Math.PI / 180, ["var", "sunEl"]];
      const sunAz = ["*", Math.PI / 180, ["var", "sunAz"]];
      const incidence = ["+", ["*", ["sin", sunEl], ["cos", slope]], ["*", ["cos", sunEl], ["sin", slope], ["cos", ["-", sunAz, aspect]]]];
      const scaled = ["*", 255, incidence];
      const layer = new ol.layer.WebGLTile({
        source: new ol.source.XYZ({ url: o.url, maxZoom: o.maxZoom, crossOrigin: "anonymous", interpolate: false, attributions: o.attributions }),
        style: {
          variables: { vert: o.exaggeration, sunEl: o.sunElevation, sunAz: o.sunAzimuth },
          color: ["color", scaled, scaled, scaled]
        }
      });
      return kit.layers.register({ id: o.id, title: o.title, type: "hillshade", opacity: o.opacity, legend: false }, layer);
    }
    setVariables(id, vars) {
      const layer = this.kit.layers.get(id);
      if (!layer || !layer.updateStyleVariables) return false;
      layer.updateStyleVariables(vars);
      return true;
    }
    destroy() {
    }
  };

  // src/core/kit.js
  var DEFAULT_CONTROLS = {
    zoom: true,
    fullscreen: true,
    scale: true,
    attribution: true,
    layers: true,
    fitAll: false,
    search: false,
    measure: false,
    locate: false,
    print: false,
    import: false,
    select: false,
    offline: false
  };
  var instances = 0;
  var MapKit = class extends Emitter {
    constructor(target, options) {
      super();
      if (typeof ol === "undefined" || !ol.Map) throw new Error("[OLMapKit] OpenLayers (ol) must be loaded first.");
      const opts = this.options = Object.assign({
        center: [0, 20],
        zoom: 2,
        minZoom: 0,
        maxZoom: 21,
        locale: "en",
        units: "metric",
        labels: null,
        ctrlScrollZoom: false,
        doubleClickZoom: true,
        projection: "EPSG:3857",
        proj4Defs: null,
        theme: null
      }, options || {});
      opts.controls = Object.assign({}, DEFAULT_CONTROLS, opts.controls || {});
      this.id = "olmk" + ++instances;
      this.el = typeof target === "string" ? document.getElementById(target) : target;
      if (!this.el) throw new Error("[OLMapKit] map container not found: " + target);
      injectCss();
      this.el.classList.add("olmk");
      if (getComputedStyle(this.el).position === "static") this.el.style.position = "relative";
      if (opts.theme) Object.keys(opts.theme).forEach((k) => this.el.style.setProperty("--olmk-" + k, opts.theme[k]));
      const i18n = createLabels(opts.locale, opts.labels);
      this.labels = i18n.labels;
      this.t = i18n.t;
      this.format = createFormatter(opts.locale, opts.units);
      this._registerProjections(opts);
      this.projection = ol.proj.get(opts.projection);
      this.geojson = new ol.format.GeoJSON({ dataProjection: "EPSG:4326", featureProjection: this.projection });
      this._panGuards = [];
      this._clickHandlers = [];
      this._tool = null;
      this._cleanups = [];
      this.olMap = new ol.Map({
        target: this.el,
        layers: [],
        controls: this._buildControls(opts),
        interactions: this._buildInteractions(opts),
        view: new ol.View({
          projection: this.projection,
          center: this.toMap(opts.center),
          zoom: opts.zoom,
          minZoom: opts.minZoom,
          maxZoom: opts.maxZoom,
          constrainResolution: false
        })
      });
      this.ui = new UI(this);
      this.basemaps = new Basemaps(this, opts);
      this.offline = new Offline(this, opts.offline || {});
      this.markers = new Markers(this, opts.markers || {});
      this.layers = new Layers(this, opts);
      this.compare = new Compare(this);
      this.draw = new Draw(this, opts.draw || {});
      this.measure = new Measure(this);
      this.query = new Query(this, opts.featureInfo || {});
      this.search = new Search(this, opts.search || {});
      this.select = new Select(this);
      this.io = new IO(this);
      this.geolocation = new Geolocation(this, opts.geolocation || {});
      this.viz = new Viz(this);
      this.raster = new Raster(this);
      this._wireEvents(opts);
      if (typeof opts.onEvent === "function") this.on("*", opts.onEvent);
      if (opts.markersData) this.markers.set(opts.markersData);
      (opts.layersData || []).forEach((l) => this.layers.add(l));
      setTimeout(() => this.emit("ready", this.getView()), 0);
    }
    /* ---------------- setup ---------------- */
    _registerProjections(opts) {
      if (!opts.proj4Defs) return;
      if (typeof proj4 === "undefined") {
        console.warn("[OLMapKit] proj4Defs given but proj4 is not loaded.");
        return;
      }
      Object.keys(opts.proj4Defs).forEach((code) => proj4.defs(code, opts.proj4Defs[code]));
      ol.proj.proj4.register(proj4);
    }
    _buildControls(opts) {
      const c = opts.controls;
      const list = [];
      if (c.zoom) list.push(new ol.control.Zoom());
      if (c.attribution) list.push(new ol.control.Attribution({ collapsible: true, collapsed: true }));
      if (c.scale) list.push(new ol.control.ScaleLine({ units: opts.units === "imperial" ? "imperial" : "metric" }));
      return list;
    }
    _buildInteractions(opts) {
      const cond = ol.events.condition;
      const kit = this;
      const list = [
        new ol.interaction.DragRotate(),
        new ol.interaction.DragPan({
          condition: function(e) {
            return cond.noModifierKeys(e) && cond.primaryAction(e) && kit._panAllowed(e);
          }
        }),
        new ol.interaction.PinchRotate(),
        new ol.interaction.PinchZoom(),
        new ol.interaction.KeyboardPan(),
        new ol.interaction.KeyboardZoom(),
        new ol.interaction.MouseWheelZoom({
          condition: (e) => !opts.ctrlScrollZoom || e.originalEvent.ctrlKey || e.originalEvent.metaKey
        }),
        new ol.interaction.DragZoom()
      ];
      if (opts.doubleClickZoom) list.push(new ol.interaction.DoubleClickZoom());
      list.push(new ol.interaction.Interaction({
        handleEvent: (e) => !(e.type === "dblclick" && kit._tool && kit._tool.blocksDblClick !== false)
      }));
      return list;
    }
    _wireEvents(opts) {
      const map = this.olMap;
      map.on("singleclick", (e) => this._dispatchClick(e));
      map.on("moveend", () => this.emit("moveend", this.getView()));
      if (opts.controls.fullscreen) {
        this.ui.button({
          id: "fullscreen",
          icon: "fullscreen",
          title: "Fullscreen",
          order: 90,
          onClick: () => {
            const doc = document;
            if (doc.fullscreenElement) doc.exitFullscreen();
            else if (this.el.requestFullscreen) this.el.requestFullscreen();
            else this.el.classList.toggle("olmk-pseudo-fullscreen");
          }
        });
      }
      if (opts.controls.fitAll) {
        this.ui.button({ id: "fitall", icon: "fit", title: this.t("fitAll"), order: 15, onClick: () => this.fitAll() });
      }
      if (opts.ctrlScrollZoom) {
        const msg = document.createElement("div");
        msg.className = "olmk-overlay-msg";
        msg.textContent = this.t("ctrlScroll");
        this.el.appendChild(msg);
        let timer = null;
        const onWheel = (e) => {
          if (e.ctrlKey || e.metaKey) return;
          msg.classList.add("is-visible");
          clearTimeout(timer);
          timer = setTimeout(() => msg.classList.remove("is-visible"), 1500);
        };
        map.getViewport().addEventListener("wheel", onWheel, { passive: true });
      }
    }
    _panAllowed(e) {
      for (let i = 0; i < this._panGuards.length; i++) {
        if (!this._panGuards[i](e)) return false;
      }
      return true;
    }
    // A pan guard returns false to block one-finger pan (e.g. while dragging a vertex)
    addPanGuard(fn) {
      this._panGuards.push(fn);
      return () => {
        const i = this._panGuards.indexOf(fn);
        if (i >= 0) this._panGuards.splice(i, 1);
      };
    }
    // Click handlers: fn(evt) returns true when it consumed the click. Lower priority runs first.
    addClickHandler(fn, priority) {
      const h = { fn, priority: priority == null ? 50 : priority };
      this._clickHandlers.push(h);
      this._clickHandlers.sort((a, b) => a.priority - b.priority);
      return () => {
        const i = this._clickHandlers.indexOf(h);
        if (i >= 0) this._clickHandlers.splice(i, 1);
      };
    }
    _dispatchClick(e) {
      const ll = this.toLonLat(e.coordinate);
      this.emit("click", { lon: ll[0], lat: ll[1] });
      if (this._tool && this._tool.blocksClicks !== false) return;
      for (let i = 0; i < this._clickHandlers.length; i++) {
        if (this._clickHandlers[i].fn(e)) return;
      }
    }
    /* ---------------- tools ---------------- */
    // Only one interactive tool at a time (draw, measure, select…). `tool.stop()` must release it.
    activateTool(name, tool) {
      if (this._tool && this._tool.name !== name) {
        const prev = this._tool;
        this._tool = null;
        prev.stop();
      }
      this._tool = Object.assign({ name }, tool);
      this.ui.closePopup();
      this.emit("toolchange", { tool: name });
    }
    releaseTool(name) {
      if (this._tool && this._tool.name === name) {
        this._tool = null;
        this.emit("toolchange", { tool: null });
      }
    }
    get activeTool() {
      return this._tool ? this._tool.name : null;
    }
    stopTool() {
      if (this._tool) this._tool.stop();
    }
    /* ---------------- coordinates ---------------- */
    toMap(lonLat) {
      return ol.proj.fromLonLat([Number(lonLat[0]), Number(lonLat[1])], this.projection);
    }
    toLonLat(coord) {
      return ol.proj.toLonLat(coord, this.projection);
    }
    // [minLon, minLat, maxLon, maxLat] <-> map extent
    extentToMap(bbox2) {
      return ol.proj.transformExtent(bbox2, "EPSG:4326", this.projection);
    }
    extentToLonLat(extent) {
      return ol.proj.transformExtent(extent, this.projection, "EPSG:4326");
    }
    readFeatures(geojson) {
      if (!geojson) return [];
      const obj = typeof geojson === "string" ? JSON.parse(geojson) : geojson;
      if (obj.type && obj.type !== "FeatureCollection" && obj.type !== "Feature") {
        return [new ol.Feature(this.geojson.readGeometry(obj))];
      }
      return this.geojson.readFeatures(obj);
    }
    readGeometry(geometry) {
      if (!geometry) return null;
      const obj = typeof geometry === "string" ? JSON.parse(geometry) : geometry;
      if (obj.type === "Feature") return this.geojson.readGeometry(obj.geometry);
      if (obj.type === "FeatureCollection") return obj.features.length ? this.geojson.readGeometry(obj.features[0].geometry) : null;
      return this.geojson.readGeometry(obj);
    }
    writeFeatures(features) {
      return this.geojson.writeFeaturesObject(features, { decimals: 7 });
    }
    writeGeometry(geom) {
      return this.geojson.writeGeometryObject(geom, { decimals: 7 });
    }
    /* ---------------- view ---------------- */
    getView() {
      const view = this.olMap.getView();
      const size = this.olMap.getSize();
      const center = this.toLonLat(view.getCenter());
      const extent = size ? this.extentToLonLat(view.calculateExtent(size)) : null;
      return { center, zoom: view.getZoom(), rotation: view.getRotation(), bbox: extent };
    }
    goTo(opts) {
      const view = this.olMap.getView();
      const o = opts || {};
      const anim = { duration: o.duration != null ? o.duration : 500 };
      if (o.center) anim.center = this.toMap(o.center);
      if (o.zoom != null) anim.zoom = o.zoom;
      if (o.rotation != null) anim.rotation = o.rotation;
      view.animate(anim);
    }
    // Fits a lon/lat bbox, a GeoJSON object or an OpenLayers extent (map projection)
    fit(target, opts) {
      const o = Object.assign({ padding: [48, 48, 48, 48], maxZoom: 17, duration: 500 }, opts || {});
      let extent = null;
      if (Array.isArray(target) && target.length === 4) {
        extent = o.mapExtent ? target : this.extentToMap(target);
      } else if (target) {
        const feats = this.readFeatures(target);
        extent = ol.extent.createEmpty();
        feats.forEach((f) => f.getGeometry() && ol.extent.extend(extent, f.getGeometry().getExtent()));
      }
      if (!extent || ol.extent.isEmpty(extent)) return false;
      this.olMap.getView().fit(extent, { padding: o.padding, maxZoom: o.maxZoom, duration: o.duration });
      return true;
    }
    // Fits everything: markers and visible overlay layers
    fitAll(opts) {
      const extent = ol.extent.createEmpty();
      const m = this.markers.getExtent();
      if (m) ol.extent.extend(extent, m);
      this.layers.list().filter((l) => l.visible).forEach((l) => {
        const e = this.layers.getExtent(l.id);
        if (e) ol.extent.extend(extent, e);
      });
      if (ol.extent.isEmpty(extent)) return false;
      return this.fit(extent, Object.assign({ mapExtent: true }, opts || {}));
    }
    /* ---------------- lifecycle ---------------- */
    onDestroy(fn) {
      this._cleanups.push(fn);
    }
    destroy() {
      this.emit("destroy", {});
      this._cleanups.splice(0).forEach((fn) => {
        try {
          fn();
        } catch (e) {
          console.warn(e);
        }
      });
      ["raster", "viz", "geolocation", "io", "select", "search", "query", "measure", "draw", "compare", "layers", "markers", "offline"].forEach((k) => {
        try {
          this[k] && this[k].destroy && this[k].destroy();
        } catch (e) {
          console.warn(e);
        }
      });
      this.ui.destroy();
      this.olMap.setTarget(null);
      this._handlers = {};
      this.el.classList.remove("olmk", "olmk-narrow");
    }
  };

  // src/index.js
  var version = "0.1.0";
  function create(target, options) {
    return new MapKit(target, options);
  }
  return __toCommonJS(index_exports);
})();
