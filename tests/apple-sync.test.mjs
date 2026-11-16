// Headless check: Apple live sync on App Growth + Settings → App Store Connect. Per-card "synced X ago" / sync issue, Sync now (POST /appstore/sync),
// Apple Live Sync On/Off toggle (PUT /appstore/sync), Settings light (green ok / amber partial / red failing), Connections light, Yorri "sync Apple" + "Apple sync on/off",
// phone/desktop/car layout without overflow. All network mocked. APPLE_JSON=<file> renders real /appstore/stats output; SHOT=1 saves screenshots to SHOTDIR.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8149);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, CAR = !!process.env.CAR, NOW = Date.now();
const day = n => new Date(NOW - n * 864e5).toISOString().slice(0, 10);
let SYNCER = { enabled: true, everyH: 4, lastRunAt: NOW - 20 * 6e4, lastOkAt: NOW - 20 * 6e4, lastError: null, status: 'ok', nextAt: NOW + 220 * 6e4 };
const W = { app: 'weather-ios', updatedAt: new Date(NOW - 20 * 6e4).toISOString(), status: { name: 'Your World Weather Radar', appId: '6822555783', bundleId: 'com.yourworld.weatherradar', liveVersion: '1.0.1', build: '37', reviewVersion: '1.0.2', reviewBuild: '43', reviewStatus: 'In Review', rating: 4.5, ratingCount: 2, storeUrl: 'https://apps.apple.com/us/app/your-world-weather-radar/id6822555783', subStatus: '2 subs: 1 Approved, 1 Waiting for Review', subs: [{ id: 'ywweather_premium', name: 'Premium monthly', price: '$4.99', status: 'Approved' }] },
  latest: { date: day(1), downloads: 4, trials: 1, paidSubs: 0 }, totals: { downloads: 31 }, totals30: { days: 30, downloads: 31, redownloads: 2, updates: 9, trials: 3, paidSubs: 1, proceeds: 3.49 }, sync: { lastSyncAt: NOW - 20 * 6e4, lastOkAt: NOW - 20 * 6e4, lastError: null }, days: [] };
const Hn = { app: 'hunt-ios', updatedAt: new Date(NOW - 20 * 6e4).toISOString(), status: { name: 'Your World Hunt', appId: '6822549497', liveVersion: '0.3.1', build: '31', reviewStatus: 'Ready for Distribution', rating: 0, ratingCount: 0, reportPending: true, note: 'Sales not synced: Vendor number is wrong' },
  latest: null, totals: {}, totals30: { days: 0 }, sync: { lastSyncAt: NOW - 20 * 6e4, lastOkAt: NOW - 20 * 6e4, lastError: 'Vendor number is wrong (Sales and Trends → Reports shows it, top left)', salesError: 'Vendor number is wrong' }, days: [] };
let APPS = process.env.APPLE_JSON ? JSON.parse(fs.readFileSync(process.env.APPLE_JSON, 'utf8')) : null; if (APPS?.syncer) SYNCER = APPS.syncer;
const reqs = [];
const ctx = await b.newContext(DESK || CAR ? { viewport: { width: CAR ? 1200 : 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => { const u = r.request().url(); return u.startsWith('http://127.0.0.1:8149') || (APPS && u.startsWith('https://is1-ssl.mzstatic.com/')) ? r.continue() : r.abort(); });
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200;
  if (u.pathname === '/appstore/stats') body = APPS || { apps: [W, Hn], syncer: SYNCER };
  else if (u.pathname === '/appstore/sync' && M === 'PUT') { SYNCER = { ...SYNCER, enabled: !!bd.enabled, nextAt: bd.enabled ? SYNCER.nextAt : null }; body = SYNCER; }
  else if (u.pathname === '/appstore/sync' && M === 'POST') { SYNCER = { ...SYNCER, lastRunAt: Date.now(), status: 'partial', lastError: 'Vendor number is wrong' }; body = { ...SYNCER, apps: {} }; }
  else if (u.pathname === '/appstore/sync') body = SYNCER;
  else if (u.pathname === '/kpi/growth') body = { asOf: NOW, play: { configured: false }, appstore: { configured: true }, apps: [] };
  else if (u.pathname === '/kpi/summary') body = { configured: true, asOf: NOW, ga4: { apps: [] }, appstore: { configured: true } };
  else if (u.pathname === '/kpi/status') body = { play: { configured: true, account: 'x@y', packages: [], discovered: [] }, ga4: { configured: false, apps: [] }, appstore: { configured: true, keyId: 'KEYID00001', note: 'Linked (Sales and Reports). Key never shown again.' } };
  else if (u.pathname === '/tickets' || u.pathname === '/maint/mail') body = []; else if (u.pathname === '/alerts/actions') body = { actions: [] };
  else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8149/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(4800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
let l = await say('open growth', 2500); assert.match(l, /Growth/);
await ev(() => asLoad()); await wt(800);
const sec = () => ev(() => (document.querySelector('.as-sec') || {}).innerText || '');
let t = await sec(); out.push('APPLE SECTION\n' + t.slice(0, 900));
if (!APPS) { assert.match(t, /Auto sync on/); assert.match(t, /synced 20 min ago/); assert.match(t, /Downloads · 30d\s*31/i); assert.match(t, /Apple sync issue — Vendor number is wrong/i); assert.match(t, /Sync now/);
  // Sync now from the card
  await ev(() => document.querySelector('.as-sec [data-asact="sync"]').click()); await wt(900); assert.ok(reqs.some(x => x === 'POST /appstore/sync'), 'sync now posted');
  // Yorri
  l = await say('Yorri Apple sync off'); assert.match(l, /Apple live sync is now OFF/); assert.ok(reqs.some(x => /PUT \/appstore\/sync .*"enabled":false/.test(x)));
  l = await say('Yorri Apple sync on'); assert.match(l, /Apple live sync is now ON/);
  l = await say('Apple sync status'); assert.match(l, /Apple live sync ON/);
  const n = reqs.filter(x => x === 'POST /appstore/sync').length; l = await say('Yorri sync Apple', 1500); assert.ok(reqs.filter(x => x === 'POST /appstore/sync').length === n + 1); assert.match(l, /Weather Radar iOS: live 1\.0\.1/);
  // Settings → App Store Connect: toggle, Sync now, last/next, error, light
  await ev(() => ywSettings(true)); await wt(1500); await ev(() => { const d = document.querySelector('#kpiCard'); if (d) d.open = true; }); await wt(400);
  const st = await ev(() => (document.querySelector('#kpiBox') || {}).innerText || ''); out.push('SETTINGS ASC\n' + st.slice(st.indexOf('App Store Connect'), st.indexOf('App Store Connect') + 600));
  assert.match(st, /Apple Live Sync ON/); assert.match(st, /Last sync:/); assert.match(st, /Next:/); assert.match(st, /Last error: Vendor number is wrong/);
  assert.equal(await ev(() => document.querySelector('#ascAuto').closest('.fin-p').querySelector('h6 .cx-dot').className), 'cx-dot sample', 'amber light when partial');
  await ev(() => document.querySelector('#ascAuto').click()); await wt(700); assert.ok(reqs.filter(x => /PUT \/appstore\/sync .*"enabled":false/.test(x)).length >= 2);
  assert.match(await ev(() => document.querySelector('#kpiBox').innerText), /Apple Live Sync OFF[\s\S]*Next: off/);
  await ev(() => document.querySelector('#kpiBox [data-asact="sync"]').click()); await wt(900); assert.ok(reqs.filter(x => x === 'POST /appstore/sync').length >= n + 2, 'Sync now works with auto off');
  SYNCER = { ...SYNCER, lastError: null, status: 'ok', enabled: true }; await ev(() => { AS.at = 0; return asLoad(); }); await wt(500);
  assert.equal(await ev(() => document.querySelector('#ascAuto').closest('.fin-p').querySelector('h6 .cx-dot').className), 'cx-dot live', 'green when synced OK');
  await ev(() => csLoad(true)); await wt(1500); const cs = await ev(() => JSON.stringify(csRows().find(r => r.id === 'asc'))); out.push('CONNECTIONS ' + cs); assert.match(cs, /"st":"live".*Synced OK/);
  await ev(() => ywSettings(false)); await wt(400); }
// Layout: nothing overflows (car layout too)
const ovf = () => ev(() => { const g = document.querySelector('.as-sec'); return { doc: document.documentElement.scrollWidth - innerWidth, as: g ? g.scrollWidth - g.clientWidth : 0 } });
let o = await ovf(); assert.ok(o.doc <= 1 && o.as <= 1, 'overflow ' + JSON.stringify(o));
await ev(() => document.body.classList.add('car-layout')); await wt(300); o = await ovf(); assert.ok(o.doc <= 1 && o.as <= 1, 'car overflow ' + JSON.stringify(o)); if (!CAR) await ev(() => document.body.classList.remove('car-layout'));
if (process.env.SHOT) { const dir = process.env.SHOTDIR || '/tmp'; await ev(() => { document.documentElement.setAttribute('data-theme', 'midnight'); document.querySelector('.as-sec').scrollIntoView() }); await wt(400);
  await pg.locator('.as-sec').screenshot({ path: `${dir}/${CAR ? 'car' : DESK ? 'desk' : 'phone'}-apple-live-sync.png` }); }
assert.deepEqual(errs, [], 'page errors: ' + errs.join(' | '));
console.log(out.join('\n')); console.log('\nAPPLE SYNC OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
