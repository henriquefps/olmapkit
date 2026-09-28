// Touch gestures on the polygon editor (demo "draw" scenario). Run with Playwright's browser_run_code:
// it opens a mobile context, sends real touch events through CDP and returns a JSON report.
// Serve the repository root first (npm run serve) and adjust BASE if needed.
async (page) => {
  const BASE = 'http://127.0.0.1:8777';
  const ctx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const sleep = ms => p.waitForTimeout(ms);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i })) });
  async function tap(pt) { await touch('touchStart', [pt]); await sleep(40); await touch('touchEnd', []); await sleep(140); }
  async function drag(from, to, steps = 10, hold) {
    await touch('touchStart', [from]);
    for (let i = 1; i <= steps; i++) { await touch('touchMove', [[from[0] + (to[0] - from[0]) * i / steps, from[1] + (to[1] - from[1]) * i / steps]]); await sleep(16); }
    if (hold) await hold();
    await touch('touchEnd', []); await sleep(160);
  }
  async function twoFinger(a, b, dx, dy, steps = 10) {
    await touch('touchStart', [a, b]);
    for (let i = 1; i <= steps; i++) { const k = i / steps; await touch('touchMove', [[a[0] + dx * k, a[1] + dy * k], [b[0] + dx * k, b[1] + dy * k]]); await sleep(16); }
    await touch('touchEnd', []); await sleep(160);
  }
  const px = ll => p.evaluate(ll => {
    const r = kit.el.getBoundingClientRect();
    return ll.map(c => { const q = kit.olMap.getPixelFromCoordinate(kit.toMap(c)); return [r.left + q[0], r.top + q[1]]; });
  }, ll);
  const ringPx = async () => px((await p.evaluate(() => kit.draw.debugState())).ring);
  const center = () => p.evaluate(() => kit.getView().center.map(v => v.toFixed(7)).join());
  const info = () => p.evaluate(() => {
    const r = kit.draw.getResult();
    const s = kit.draw.debugState();
    return {
      mode: s.mode, ring: s.ring.length, selected: s.selected, touch: s.touch,
      status: r.status, areaHa: Math.round(r.areaHa * 10000) / 10000,
      buttons: [...document.querySelectorAll('.olmk-buttons button')].filter(b => !b.hidden).map(b => b.dataset.a + (b.disabled ? '(off)' : '')),
      changes: [...document.querySelectorAll('#log li b')].filter(b => b.textContent === 'drawchange').length
    };
  });

  const out = {};
  await p.goto(BASE + '/demo/?s=draw&lang=en');
  await sleep(2500);
  const LL = [[-120.5015, 36.9015], [-120.4998, 36.9012], [-120.4996, 36.8992], [-120.5018, 36.8994]];
  let [a, b, c, d] = await px(LL);

  // 1) One-finger drag while placing: the map does not move, the point lands where the finger lifts; the loupe shows
  const c0 = await center();
  let loupe = false;
  await drag([a[0] - 30, a[1] - 30], a, 10, async () => { loupe = await p.evaluate(() => getComputedStyle(document.querySelector('.olmk-loupe')).display === 'block'); });
  out.placeDrag = { mapStill: c0 === await center(), loupeShown: loupe, loupeHidden: await p.evaluate(() => getComputedStyle(document.querySelector('.olmk-loupe')).display === 'none'), ...(await info()) };

  // 2) Second point, then a two-finger pan: the map moves and no point is added
  await tap(b);
  await twoFinger([120, 250], [220, 300], 0, -50);
  out.twoFinger = { mapMoved: c0 !== await center(), ...(await info()) };

  // 3) Third and fourth points (recomputed after the pan): area is sent from the 3rd point on
  [a, b, c, d] = await px(LL);
  await tap(c);
  out.third = await info();
  await tap(d);
  // 4) Tap the first point to finish
  await tap(a);
  out.closed = await info();

  // 5) Drag a vertex in editing mode: map still, area recomputed
  const c1 = await center();
  let r = await ringPx();
  await drag(r[2], [r[2][0] + 20, r[2][1] + 25]);
  out.vertexDrag = { mapStill: c1 === await center(), ...(await info()) };

  // 6) One-finger drag on empty map in editing mode pans
  await drag([60, 120], [60, 170]);
  out.panEditing = { mapMoved: c1 !== await center() };

  // 7) Tap a "+" to insert a vertex, then select it and remove it
  r = await ringPx();
  const mid = [(r[0][0] + r[1][0]) / 2, (r[0][1] + r[1][1]) / 2];
  const n0 = (await info()).ring;
  await tap(mid);
  out.insert = { before: n0, after: (await info()).ring };
  await tap(mid);
  out.selected = (await info()).buttons;
  await p.click('.olmk-buttons button[data-a=remove]');
  await sleep(200);
  out.removed = await info();

  // 8) Double tap on the map in editing mode does not zoom
  const z0 = await p.evaluate(() => kit.getView().zoom);
  await tap([200, 200]); await tap([200, 200]); await sleep(400);
  out.doubleTapNoZoom = z0 === await p.evaluate(() => kit.getView().zoom);

  // 9) Drawing over the blocked zone: the useful area excludes it
  await p.evaluate(() => { kit.goTo({ center: [-120.4985, 36.9011], zoom: 16, duration: 0 }); kit.draw.polygon({ within: 'base', exclude: 'blocked' }); });
  await sleep(400);
  const [e1, e2, e3, e4] = await px([[-120.5000, 36.9022], [-120.4966, 36.9022], [-120.4966, 36.9000], [-120.5000, 36.9000]]);
  for (const q of [e1, e2, e3, e4]) await tap(q);
  out.blockedBeforeFinish = await info();
  await p.evaluate(() => kit.draw.finish());
  await sleep(200);
  out.blocked = await p.evaluate(() => {
    const r = kit.draw.getResult();
    const drawn = OLMapKit.geo.area({ type: 'Polygon', coordinates: [r.drawn.concat([r.drawn[0]])] });
    return { status: r.status, useful: Math.round(r.area), drawn: Math.round(drawn), lessThanDrawn: r.area < drawn };
  });
  await p.screenshot({ path: '.playwright-mcp/touch-draw.png' });

  out.errors = errors;
  await ctx.close();
  return out;
}
