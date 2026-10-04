// End-to-end checks for the other modules (run with Playwright's browser_run_code, demo served on BASE).
async (page) => {
  const BASE = 'http://localhost:8765';
  const browser = page.context().browser();
  const out = {};
  const errors = [];
  const sleep = (p, ms) => p.waitForTimeout(ms);
  const toPx = (p, ll) => p.evaluate(ll => { const r = kit.el.getBoundingClientRect(); return ll.map(c => { const q = kit.olMap.getPixelFromCoordinate(kit.toMap(c)); return [r.left + q[0], r.top + q[1]]; }); }, ll);
  const events = (p, type) => p.evaluate(t => [...document.querySelectorAll('#log li')].filter(li => li.dataset.type === t).map(li => li.lastChild.textContent.trim()), type);

  /* ---------- Markers on a phone: tap -> event + zoom; close -> fit all ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push('markers: ' + e.message));
    await p.goto(BASE + '/demo/?s=markers&lang=pt');
    await sleep(p, 2500);
    await p.evaluate(() => { kit.markers.setClustering(false); kit.markers.fitAll({ duration: 0 }); });
    await sleep(p, 500);
    const z0 = await p.evaluate(() => kit.getView().zoom);
    const [m] = await toPx(p, [[-9.1520, 38.7560]]); // p13, isolated
    await p.touchscreen.tap(m[0], m[1] - 20);
    await sleep(p, 900);
    const card = await p.evaluate(() => document.querySelector('.card h4') && document.querySelector('.card h4').textContent.trim());
    const z1 = await p.evaluate(() => kit.getView().zoom);
    await p.locator('#panel').getByRole('button', { name: 'Fechar' }).tap();
    await sleep(p, 900);
    const z2 = await p.evaluate(() => kit.getView().zoom);
    out.markers = { card, clicked: (await events(p, 'markerclick')).length, zoomedIn: z1 > z0 + 1, backToAll: Math.abs(z2 - z0) < 0.6, selected: await p.evaluate(() => kit.markers.selectedId) };
    await p.screenshot({ path: '.playwright-mcp/mobile-markers.png' });
    await ctx.close();
  }

  /* ---------- Desktop: measure, select, split, import, time slider, route, compare ---------- */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, geolocation: { latitude: 38.7139, longitude: -9.1447, accuracy: 12 }, permissions: ['geolocation'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => errors.push('desktop: ' + e.message));

  await p.goto(BASE + '/demo/?s=measure&lang=en');
  await sleep(p, 2000);
  let pts = await toPx(p, [[-9.150, 38.705], [-9.130, 38.705], [-9.130, 38.716]]);
  for (const q of pts) { await p.mouse.click(q[0], q[1]); await sleep(p, 250); }
  await p.mouse.dblclick(pts[2][0], pts[2][1]);
  await sleep(p, 400);
  out.measure = await events(p, 'measure');

  await p.goto(BASE + '/demo/?s=search&lang=en');
  await sleep(p, 2000);
  await p.locator('#panel').getByRole('button', { name: 'Select by rectangle' }).click();
  pts = await toPx(p, [[-9.16, 38.72], [-9.12, 38.70]]);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down();
  await p.mouse.move((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2, { steps: 5 });
  await p.mouse.move(pts[1][0], pts[1][1], { steps: 5 }); await p.mouse.up();
  await sleep(p, 400);
  out.select = await p.evaluate(() => { const s = kit.select.getSelection(); return s && { count: s.count, markers: s.markers.length, zones: (s.layers.zones || []).length }; });

  await p.goto(BASE + '/demo/?s=draw&lang=en');
  await sleep(p, 2000);
  await p.locator('#panel').getByRole('button', { name: 'Split a field with a line' }).click();
  pts = await toPx(p, [[-120.5075, 36.9050], [-120.5070, 36.8980]]);
  await p.mouse.click(pts[0][0], pts[0][1]); await sleep(p, 250);
  await p.mouse.dblclick(pts[1][0], pts[1][1]);
  await sleep(p, 500);
  out.split = await p.evaluate(() => ({ fields: kit.layers.getFeatures('fields').features.map(f => f.id) }));

  await p.goto(BASE + '/demo/?s=io&lang=en');
  await sleep(p, 2000);
  await p.evaluate(() => {
    const input = document.querySelector('.olmk input[type=file]');
    const dt = new DataTransfer();
    dt.items.add(new File(['name;lat;lon\nA;38.71;-9.14\nB;38.72;-9.15\n'], 'points.csv', { type: 'text/csv' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
  await sleep(p, 500);
  out.importCsv = await events(p, 'import');
  const dl = p.waitForEvent('download');
  await p.locator('#panel').getByRole('button', { name: 'Export markers (GeoJSON)' }).click();
  const file = await dl;
  out.export = file.suggestedFilename();
  const pdf = p.waitForEvent('download', { timeout: 20000 });
  await p.locator('#panel').getByRole('button', { name: 'Print PDF' }).click();
  out.printPdf = (await pdf).suggestedFilename();

  await p.goto(BASE + '/demo/?s=mobile&lang=en');
  await sleep(p, 2000);
  await p.locator('#panel').getByRole('button', { name: 'Locate me' }).click();
  await sleep(p, 1500);
  out.position = (await events(p, 'position')).slice(0, 1);
  await p.locator('#panel').getByRole('button', { name: 'Simulate a walk' }).click();
  await sleep(p, 3000);
  await p.locator('#panel').getByRole('button', { name: 'Stop track' }).click();
  await sleep(p, 300);
  out.track = await events(p, 'trackend');
  await p.evaluate(() => { kit.basemaps.set('streets'); kit.goTo({ center: [-9.14, 38.71], zoom: 15, duration: 0 }); });
  await sleep(p, 800);
  out.offline = await p.evaluate(() => kit.offline.prefetch({ minZoom: 15, maxZoom: 15 }).then(r => r.count).then(n => kit.offline.stats().then(s => ({ fetched: n, cached: s.count }))));
  out.offlineOsm = await p.evaluate(() => { kit.basemaps.set('osm'); return kit.offline.prefetch().then(() => 'allowed', e => e.message); });

  await p.goto(BASE + '/demo/?s=viz&lang=en');
  await sleep(p, 2000);
  await p.locator('#panel').getByRole('button', { name: 'Time slider' }).click();
  await sleep(p, 300);
  await p.click('.olmk-time button');
  await sleep(p, 1500);
  out.time = (await events(p, 'timechange')).length > 0;
  await p.locator('#panel').getByRole('button', { name: 'Animate route' }).click();
  await sleep(p, 1500);
  out.route = (await events(p, 'routeprogress')).length > 0;
  await p.locator('#panel').getByRole('button', { name: 'Choropleth' }).click();
  await sleep(p, 500);
  out.legend = await p.evaluate(() => document.querySelectorAll('.olmk-legend-item').length);

  await p.goto(BASE + '/demo/?s=layers&lang=en');
  await sleep(p, 2500);
  await p.locator('#panel').getByRole('button', { name: 'Compare with satellite' }).click();
  await sleep(p, 800);
  const h = await p.locator('.olmk-swipe-handle').boundingBox();
  await p.mouse.move(h.x + 20, h.y + 20); await p.mouse.down(); await p.mouse.move(h.x + 220, h.y + 20, { steps: 6 }); await p.mouse.up();
  out.swipe = await p.evaluate(() => Math.round(kit.compare.active.state.position * 100) / 100);
  await p.locator('#panel').getByRole('button', { name: '“What is here?” (GetFeatureInfo)' }).click();
  pts = await toPx(p, [[-99.0, 31.0]]);
  await p.mouse.click(pts[0][0], pts[0][1]);
  await sleep(p, 2500);
  out.featureInfo = await p.evaluate(() => document.querySelector('.olmk-popup') && document.querySelector('.olmk-popup h4') && document.querySelector('.olmk-popup h4').textContent);
  await p.screenshot({ path: '.playwright-mcp/desktop-layers.png' });

  await ctx.close();
  out.errors = errors;
  return out;
}
