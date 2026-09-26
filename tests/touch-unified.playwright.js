// Fluxo unificado (v2): ajustar vértices durante o desenho, área enviada desde o 3º ponto, Terminar / Adicionar pontos.
async (page) => {
  const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const sleep = ms => p.waitForTimeout(ms);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  async function tap(pt) { await touch('touchStart', [pt]); await sleep(40); await touch('touchEnd', []); await sleep(120); }
  async function drag(from, to, steps = 10) {
    await touch('touchStart', [from]);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', [[from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps]]); await sleep(16); }
    await touch('touchEnd', []); await sleep(150);
  }
  const px = ll => p.evaluate(ll => {
    const m = window.OpenLayers.Map, r = m.getTargetElement().getBoundingClientRect();
    return ll.map(c => { const q = m.getPixelFromCoordinate(ol.proj.fromLonLat(c)); return [r.left + q[0], r.top + q[1]]; });
  }, ll);
  const ringPx = () => p.evaluate(() => {
    const m = window.OpenLayers.Map, r = m.getTargetElement().getBoundingClientRect();
    const f = window.drawVector.getSource().getFeatures().find(x => x.getGeometry() && x.getGeometry().getType() === 'MultiPoint');
    return f ? f.getGeometry().getCoordinates().map(c => { const q = m.getPixelFromCoordinate(c); return [r.left + q[0], r.top + q[1]]; }) : [];
  });
  const center = () => p.evaluate(() => window.OpenLayers.Map.getView().getCenter().map(v => Math.round(v * 100) / 100).join());
  const info = async () => ({
    ...(await p.evaluate(() => ({
      buttons: [...document.querySelectorAll('.olx-buttons button')].filter(b => !b.hidden).map(b => b.textContent + (b.disabled ? '(off)' : '')),
      screenArea: Math.round(window.sandbox.screen.areaHa * 10000) / 10000,
      events: document.querySelectorAll('#log li.event').length
    }))),
    ring: (await ringPx()).length
  });
  const out = {};
  await p.goto('http://localhost:8765/demo/?s=occupied'); await sleep(1800);
  const [a, b, c, d] = await px([[-120.5015, 36.9018], [-120.4990, 36.9012], [-120.4992, 36.8992], [-120.5018, 36.8994]]);

  // 1) 2 pontos: nada enviado ainda; arrastar o 2º ponto move-o (não cria um 3º) e o mapa não se mexe
  await tap(a); await tap(b);
  const c0 = await center();
  await drag(b, [b[0] + 25, b[1] - 20]);
  out.dragWhileDrawing2 = { mapStill: c0 === await center(), ...(await info()) };

  // 2) 3º ponto: a área é enviada imediatamente, sem Terminar
  await tap(c);
  out.third = await info();

  // 3) arrastar o 1º ponto ainda em modo desenho: área reenviada, continua em desenho
  let r = await ringPx();
  await drag(r[0], [r[0][0] - 20, r[0][1] - 20]);
  out.dragFirstWhileDrawing = { mapStill: c0 === await center(), ...(await info()) };

  // 4) "+" entre o 1º e 2º pontos durante o desenho
  r = await ringPx();
  await tap([(r[0][0] + r[1][0]) / 2, (r[0][1] + r[1][1]) / 2]);
  out.midpointWhileDrawing = await info();

  // 5) 5º ponto e Terminar pelo botão
  await tap(d);
  await p.click('.olx-buttons button[data-a=finish]'); await sleep(200);
  out.afterFinish = await info();

  // 6) Em "Terminar", toque numa zona vazia não cria ponto e um dedo move o mapa
  const c1 = await center();
  await tap([60, 330]);
  await drag([60, 330], [60, 390]);
  out.finishedEmptyTap = { mapMoved: c1 !== await center(), ...(await info()) };

  // 7) Adicionar pontos retoma o desenho a partir do último ponto
  await p.click('.olx-buttons button[data-a=resume]'); await sleep(200);
  const [e2] = await px([[-120.5025, 36.9005]]);
  await tap(e2);
  out.resumed = await info();

  // 8) Duplo toque no último ponto termina
  await tap(e2); await sleep(200);
  out.doubleTapLast = await info();

  // 9) Guardar sem nunca ter carregado em Terminar (novo mapa)
  await p.click('#btn-reload'); await sleep(1500);
  const [f1, f2, f3] = await px([[-120.5015, 36.9018], [-120.4990, 36.9012], [-120.4992, 36.8992]]);
  await tap(f1); await tap(f2); await tap(f3);
  await p.click('#btn-save'); await sleep(200);
  out.saveWithoutFinish = await p.evaluate(() => document.querySelector('#log li').textContent.slice(0, 90));
  await p.screenshot({ path: 'screenshots/unified.png' });

  out.errors = errors;
  await ctx.close();
  return out;
}
