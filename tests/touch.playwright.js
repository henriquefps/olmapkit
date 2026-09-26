// Testes de toque do editor v2. Executar via Playwright (recebe `page`); cria um contexto móvel com touch.
async (page) => {
  const SHOTS = 'screenshots/'; // relativo à pasta de trabalho do Playwright
  const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const sleep = ms => p.waitForTimeout(ms);

  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((pt, i) => ({ x: pt[0], y: pt[1], id: i })) });
  async function tap(pt) { await touch('touchStart', [pt]); await sleep(40); await touch('touchEnd', []); await sleep(120); }
  async function drag(from, to, steps = 10) {
    await touch('touchStart', [from]);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', [[from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps]]); await sleep(16); }
    await touch('touchEnd', []); await sleep(150);
  }
  async function twoFinger(a, b, dx, dy, steps = 10) {
    await touch('touchStart', [a, b]);
    for (let i = 1; i <= steps; i++) { const k = i / steps; await touch('touchMove', [[a[0] + dx * k, a[1] + dy * k], [b[0] + dx * k, b[1] + dy * k]]); await sleep(16); }
    await touch('touchEnd', []); await sleep(150);
  }
  const px = ll => p.evaluate(ll => {
    const m = window.OpenLayers.Map, r = m.getTargetElement().getBoundingClientRect();
    return ll.map(c => { const q = m.getPixelFromCoordinate(ol.proj.fromLonLat(c)); return [r.left + q[0], r.top + q[1]]; });
  }, ll);
  // Nº de vértices do anel editável (a saída enviada ao ecrã é simplificada e pode ter menos)
  const ringLen = () => p.evaluate(() => { const f = window.drawVector.getSource().getFeatures().find(x => x.getGeometry() && x.getGeometry().getType() === 'MultiPoint'); return f ? f.getGeometry().getCoordinates().length : 0; });
  const center = () => p.evaluate(() => window.OpenLayers.Map.getView().getCenter().map(v => Math.round(v * 100) / 100));
  const info = () => p.evaluate(() => ({
    hud: document.querySelector('.olx-area').textContent,
    msg: document.querySelector('.olx-msg').textContent,
    buttons: [...document.querySelectorAll('.olx-buttons button')].filter(b => !b.hidden).map(b => b.textContent + (b.disabled ? '(off)' : '')),
    screenArea: window.sandbox.screen.areaHa,
    screenVerts: window.sandbox.screen.coordinates.length,
    events: document.querySelectorAll('#log li.event').length
  }));

  const out = {};
  await p.goto('http://localhost:8765/demo/?s=occupied');
  await sleep(1800);

  // 1) Arrasto com um dedo no modo desenho: mapa NÃO se move, ponto colocado onde o dedo soltou
  const c0 = await center();
  const [a, b2, c, d] = await px([[-120.5015, 36.9018], [-120.4990, 36.9012], [-120.4992, 36.8992], [-120.5018, 36.8994]]);
  await drag([a[0] - 40, a[1] - 40], a);
  out.dragDrawing = { centerUnchanged: JSON.stringify(c0) === JSON.stringify(await center()), ...(await info()) };

  // 2) Toques simples + gesto com dois dedos (pan) no meio do desenho: mapa move-se, nenhum ponto acrescentado
  await tap(b2);
  const before2f = await p.evaluate(() => document.querySelector('.olx-buttons button[data-a=finish]').disabled);
  await twoFinger([150, 400], [250, 450], 0, -60);
  const c1 = await center();
  out.twoFingerPan = { centerChanged: JSON.stringify(c0) !== JSON.stringify(c1), ...(await info()) };

  // 3) Completa: 2 pontos restantes (coords recalculadas após pan) e toca no primeiro ponto para fechar
  const [a2, , c2, d2] = await px([[-120.5015, 36.9018], [-120.4990, 36.9012], [-120.4992, 36.8992], [-120.5018, 36.8994]]);
  await tap(c2); await tap(d2);
  await p.screenshot({ path: SHOTS + 'touch-drawing.png' });
  await tap(a2);
  out.closed = await info();

  // 4) Arrastar um vértice (modo edição): mapa NÃO se move, área recalculada e enviada
  const c2c = await center();
  const eventsBefore = (await info()).events;
  const [v] = await px([[-120.4992, 36.8992]]);
  await drag(v, [v[0] + 30, v[1] + 40]);
  out.vertexDrag = { centerUnchanged: JSON.stringify(c2c) === JSON.stringify(await center()), newEvent: (await info()).events > eventsBefore, ...(await info()) };

  // 5) Arrasto com um dedo fora dos pontos no modo edição: mapa move-se
  await drag([80, 300], [80, 360]);
  out.panInEdit = { centerChanged: JSON.stringify(c2c) !== JSON.stringify(await center()) };

  // 6) Toque no "+" do meio de uma aresta → novo vértice
  const nBefore = await ringLen();
  const mid = await p.evaluate(() => {
    const m = window.OpenLayers.Map, r = m.getTargetElement().getBoundingClientRect();
    const f = window.drawVector.getSource().getFeatures().find(x => x.getGeometry() && x.getGeometry().getType() === 'Polygon' && x.getGeometry().getCoordinates()[0].length < 10);
    const ring = f.getGeometry().getCoordinates()[0];
    const q = m.getPixelFromCoordinate([(ring[0][0] + ring[1][0]) / 2, (ring[0][1] + ring[1][1]) / 2]);
    return [r.left + q[0], r.top + q[1]];
  });
  await tap(mid);
  out.midpointInsert = { before: nBefore, after: await ringLen() };

  // 7) Toque num vértice → seleciona → "Remover ponto"
  await tap(mid);
  out.selected = (await info()).buttons;
  await p.click('.olx-buttons button[data-a=remove]'); await sleep(200);
  out.removed = { after: await ringLen(), ...(await info()) };
  await p.screenshot({ path: SHOTS + 'touch-editing.png' });

  // 8) Duplo toque no mapa em modo edição não deve fazer zoom
  const z0 = await p.evaluate(() => window.OpenLayers.Map.getView().getZoom());
  await tap([200, 250]); await tap([200, 250]); await sleep(400);
  out.doubleTapNoZoom = z0 === await p.evaluate(() => window.OpenLayers.Map.getView().getZoom());

  out.errors = errors;
  await ctx.close();
  return out;
}
