// All component styles, injected once. Theme with CSS variables on the map container
// (or with the `theme` option), e.g. --olmk-primary.
const CSS = `
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

export function injectCss() {
    if (document.getElementById('olmk-style')) return;
    const style = document.createElement('style');
    style.id = 'olmk-style';
    style.textContent = CSS;
    document.head.appendChild(style);
}
