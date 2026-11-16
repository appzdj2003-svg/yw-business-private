// Headless check: Search consoles (Google Search Console + Bing Webmaster Tools). Settings → Connections → Search consoles: add, Change/replace (key kept when blank,
// replaced when given), Remove (two-step), Sync now, auto sync toggle, red/amber/green lights + Connection status rows; Growth Search card (live, not connected,
// SAMPLE only with Mock on); Yorri "search stats" / "sync search" / "search sync off|status" / "open search consoles"; keys never shown back; phone/desk/car.
// All network mocked. SHOT=1 saves screenshots to SHOTDIR (default /workspace/search-consoles).
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8151);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, CAR = !!process.env.CAR, MOCK = !!process.env.MOCK, NOW = Date.now(), SHOTDIR = process.env.SHOTDIR || '/workspace/search-consoles';
const SA = JSON.stringify({ type: 'service_account', client_email: 'yw-search@proj.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nSECRETPK123\n-----END PRIVATE KEY-----\n' });
const BK = 'a1b2c3d4e5f60718293a4b5c6d7e8f90', BK2 = 'ffffeeeeddddccccbbbbaaaa99998888';
const CFG = { gsc: null, bing: null }, SY = { enabled: true, everyH: 6, lastRunAt: null }; let BING_PARTIAL = false; const reqs = [];
const gscRes = s => ({ site: s, host: s.replace(/^sc-domain:|^https?:\/\/|\/$/g, ''), range: { end: '2026-11-14' }, d7: { clicks: 41, impressions: 1630, ctr: .025, position: 14.2 }, d28: { clicks: 162, impressions: 6120, ctr: .026, position: 15.1 }, daily: Array.from({ length: 28 }, (_, i) => ({ date: 'd' + i, clicks: i % 7, impressions: 100 })),
  queries: [{ query: 'weather radar app', clicks: 38, impressions: 900, position: 8.4 }, { query: 'your world hunt', clicks: 22, impressions: 140, position: 1.6 }], pages: [], indexing: { checked: 5, indexed: 4, sitemapsSubmitted: 24, sitemapErrors: 0, urls: [{ url: 'https://yourworldapps.si/', indexed: true, verdict: 'PASS' }] }, errors: [] });
const bingRes = s => ({ site: s, host: s.replace(/^https?:\/\/|\/$/g, ''), d7: { clicks: 6, impressions: 310, ctr: .019 }, d28: { clicks: 23, impressions: 1280, ctr: .018 }, daily: [], queries: [{ query: 'your world apps', clicks: 5, impressions: 40, position: 1.2 }], pages: [], indexing: { inIndex: 19, crawled28: 84, crawlErrors28: 0 }, errors: BING_PARTIAL ? ['crawl: Bing: busy'] : [] });
const pub = p => { const c = CFG[p]; if (!c) return { configured: false, light: 'red', status: 'missing', sites: [], results: [] };
  const amber = p === 'bing' && BING_PARTIAL; return { configured: true, light: amber ? 'amber' : 'green', status: amber ? 'partial' : 'ok', lastSyncAt: c.syncAt, lastOkAt: c.syncAt, lastError: amber ? 'yourworldapps.si: crawl: Bing: busy' : null, sites: c.sites, autoSites: !c.sitesSet, at: c.at,
    ...(p === 'gsc' ? { account: 'yw-search@proj.iam.gserviceaccount.com' } : { keyHint: 'Saved (never shown)' }), results: c.sites.map(p === 'gsc' ? gscRes : bingRes) }; };
const status = () => ({ asOf: Date.now(), gsc: pub('gsc'), bing: pub('bing'), syncer: { ...SY, nextAt: SY.enabled ? Date.now() + 5 * 36e5 : null } });
const ctx = await b.newContext(DESK || CAR ? { viewport: { width: CAR ? 1200 : 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(([car, mock]) => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', mock ? '1' : '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, [CAR, MOCK]);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8151') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), raw = q.postData(), bd = raw ? JSON.parse(raw) : null; reqs.push({ m: M, p: u.pathname + u.search, b: bd });
  let body = {}, st = 200;
  if (u.pathname === '/search/config' && M === 'PUT') { const p = bd.provider, prev = CFG[p];
    if (p === 'bing' && bd.apiKey && !/^[A-Za-z0-9]{16,64}$/.test(bd.apiKey)) { st = 400; body = { error: 'That doesn’t look like a Bing API key' }; }
    else if (!prev && !(bd.serviceAccount || bd.apiKey)) { st = 400; body = { error: 'missing key' }; }
    else { const given = !!String(bd.sites || '').trim(); const sites = given ? String(bd.sites).split(/[\s,]+/).filter(Boolean).map(x => p === 'gsc' ? (/^(http|sc-domain:)/.test(x) ? x : 'sc-domain:' + x) : (x.startsWith('http') ? x : 'https://' + x + '/')) : prev?.sites || [p === 'gsc' ? 'sc-domain:yourworldapps.si' : 'https://yourworldapps.si/'];
      CFG[p] = { sites, sitesSet: given || !!prev?.sitesSet, at: Date.now(), syncAt: Date.now(), key: bd.serviceAccount || bd.apiKey || prev.key }; const s = status(); body = { gsc: s.gsc, bing: s.bing, syncer: s.syncer }; } }
  else if (u.pathname === '/search/config' && M === 'DELETE') { CFG[u.searchParams.get('provider')] = null; body = status(); }
  else if (u.pathname === '/search/sync' && M === 'PUT') { SY.enabled = !!bd.enabled; body = status().syncer; }
  else if (u.pathname === '/search/sync' && M === 'POST') { SY.lastRunAt = Date.now(); const R = {}; for (const p of bd?.provider ? [bd.provider] : ['gsc', 'bing']) if (CFG[p]) { CFG[p].syncAt = Date.now(); R[p] = { status: pub(p).status, lastError: pub(p).lastError, sites: CFG[p].sites.length }; } body = { ok: true, results: R, ...status() }; }
  else if (u.pathname === '/search/stats' || u.pathname === '/search/status') body = status();
  else if (u.pathname === '/appstore/stats') body = { apps: [], syncer: { enabled: true, everyH: 4 } }; else if (u.pathname === '/appstore/sync') body = { enabled: true, everyH: 4 };
  else if (u.pathname === '/kpi/growth') body = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [] };
  else if (u.pathname === '/kpi/status') body = { play: { configured: false }, ga4: { configured: false, apps: [] }, appstore: { configured: false } };
  else if (u.pathname === '/tickets' || u.pathname === '/maint/mail') body = []; else if (u.pathname === '/alerts/actions') body = { actions: [] };
  else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null };
  await r.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8151/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(4800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
const card = () => ev(() => (document.querySelector('.sc-sec') || {}).innerText || ''), box = () => ev(() => (document.querySelector('#scBox') || {}).innerText || '');
const dotOf = p => ev(p => document.querySelector(`#scBox [data-sc-p="${p}"] h6 .cx-dot`).className, p);
const noKeys = async () => { const h = await ev(() => document.documentElement.outerHTML + [...document.querySelectorAll('input,textarea')].map(i => i.value).join('|')); for (const k of [BK, BK2, 'SECRETPK123', 'BEGIN PRIVATE KEY-----\\nSECRET']) assert.ok(!h.includes(k), 'key shown back: ' + k.slice(0, 6)); };
const click = sel => ev(s => document.querySelector(s).click(), sel);
const fill = (sel, v) => ev(([s, v]) => { const n = document.querySelector(s); n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
const narrow = async () => { const o = await ev(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(o <= 2, 'horizontal overflow ' + o); };

let l = await say('open growth', 2500); assert.match(l, /Growth/); await ev(() => scLoad(true)); await wt(700);
let t = await card(); out.push('GROWTH (not connected)\n' + t.slice(0, 500));
if (MOCK) { assert.match(t, /SAMPLE/); assert.match(t, /weather radar app/); out.push('mock on: SAMPLE shown'); }
else { assert.match(t, /Google Search Console[\s\S]*NOT CONNECTED[\s\S]*Bing Webmaster Tools[\s\S]*NOT CONNECTED/); assert.ok(!/SAMPLE|weather radar app/.test(t), 'no mock data when Mock is off');
  l = await say('Yorri search stats'); assert.match(l, /Google Search Console: not connected.*Bing Webmaster Tools: not connected/);
  // Connections: both rows red
  await ev(() => csLoad(true)); await wt(1200); let rows = JSON.parse(await ev(() => JSON.stringify(csRows().filter(r => r.id === 'gsc' || r.id === 'bing'))));
  assert.equal(rows.length, 2); assert.ok(rows.every(r => r.st === 'err' && r.go === 'sc'), JSON.stringify(rows));
  // Open settings card via Yorri
  l = await say('open search consoles', 1500); assert.match(l, /Opened .*Search consoles/); assert.equal(await ev(() => document.querySelector('#scCard').open), true);
  let s = await box(); assert.match(s, /Google Search Console[\s\S]*Enable[\s\S]*Restricted[\s\S]*Bing Webmaster Tools[\s\S]*API access/); assert.equal(await dotOf('gsc'), 'cx-dot err');
  // Add GSC (paste) with an empty key → error, then real
  await click('[data-sc="save"][data-p="gsc"]'); await wt(300); assert.match(await box(), /Upload or paste the service-account JSON key/);
  await fill('#scGscSa', SA); await fill('#scGscSites', 'yourworldapps.si'); await click('[data-sc="save"][data-p="gsc"]'); await wt(1200);
  let put = reqs.filter(x => x.m === 'PUT' && x.p === '/search/config').pop(); assert.equal(put.b.provider, 'gsc'); assert.ok(put.b.serviceAccount.includes('service_account')); assert.equal(put.b.sites, 'yourworldapps.si');
  s = await box(); assert.match(s, /Connected — synced OK\. Key never shown again/); assert.match(s, /yw-search@proj/); assert.match(s, /sc-domain:yourworldapps\.si/); assert.equal(await dotOf('gsc'), 'cx-dot live'); await noKeys();
  // Upload a key file (file input) path for Change / replace
  await click('[data-sc="edit"][data-p="gsc"]'); await wt(200); assert.match(await box(), /Changing Google Search Console/);
  await pg.setInputFiles('#scGscFile', { name: 'yw-search.json', mimeType: 'application/json', buffer: Buffer.from(SA.replace('SECRETPK123', 'SECRETPK123B')) }); await wt(400); assert.match(await box(), /Loaded yw-search\.json \(not shown\)/);
  await click('[data-sc="save"][data-p="gsc"]'); await wt(1200); put = reqs.filter(x => x.m === 'PUT' && x.p === '/search/config').pop(); assert.ok(put.b.serviceAccount.includes('SECRETPK123B'), 'uploaded file replaces key'); assert.match(await box(), /Key replaced/); await noKeys();
  // Bing: bad key → error; good key → green
  await fill('#scBingKey', 'nope'); await click('[data-sc="save"][data-p="bing"]'); await wt(800); assert.match(await box(), /Couldn’t save: That doesn’t look like a Bing API key/);
  await fill('#scBingKey', BK); await click('[data-sc="save"][data-p="bing"]'); await wt(1200); s = await box(); assert.match(s, /API key: saved \(never shown\)/); assert.equal(await dotOf('bing'), 'cx-dot live'); await noKeys();
  // Change sites only (key kept) → PUT has no apiKey
  await click('[data-sc="edit"][data-p="bing"]'); await wt(200); assert.equal(await ev(() => document.querySelector('#scBingKey').value), '', 'key field blank on change'); assert.equal(await ev(() => document.querySelector('#scBingKey').type), 'password');
  await fill('#scBingSites', 'yourworldapps.si, hunt.yourworldapps.si'); await click('[data-sc="save"][data-p="bing"]'); await wt(1200);
  put = reqs.filter(x => x.m === 'PUT' && x.p === '/search/config').pop(); assert.equal(put.b.apiKey, undefined, 'blank key keeps the saved one'); s = await box(); assert.match(s, /Sites updated/); assert.match(s, /https:\/\/hunt\.yourworldapps\.si\//);
  // Replace key
  await click('[data-sc="edit"][data-p="bing"]'); await wt(200); await fill('#scBingKey', BK2); await click('[data-sc="save"][data-p="bing"]'); await wt(1200);
  put = reqs.filter(x => x.m === 'PUT' && x.p === '/search/config').pop(); assert.equal(put.b.apiKey, BK2); assert.match(await box(), /Key replaced/); await noKeys();
  // Cancel edit leaves things alone
  await click('[data-sc="edit"][data-p="bing"]'); await wt(150); await click('[data-sc="cancel"][data-p="bing"]'); await wt(150); assert.match(await box(), /Change \/ replace/);
  // Amber when partial; Connections rows reflect it
  BING_PARTIAL = true; await click('[data-sc="sync1"][data-p="bing"]'); await wt(1200); assert.ok(reqs.some(x => x.m === 'POST' && x.p === '/search/sync' && x.b?.provider === 'bing'));
  assert.equal(await dotOf('bing'), 'cx-dot sample', 'amber when partial'); assert.match(await box(), /Last error: yourworldapps\.si: crawl: Bing: busy/);
  await ev(() => csLoad(true)); await wt(1200); rows = JSON.parse(await ev(() => JSON.stringify(csRows().filter(r => r.id === 'gsc' || r.id === 'bing'))));
  out.push('CONNECTIONS ' + JSON.stringify(rows)); assert.equal(rows.find(r => r.id === 'gsc').st, 'live'); assert.equal(rows.find(r => r.id === 'bing').st, 'sample'); assert.match(rows[0].detail, /Synced OK/);
  // Auto sync toggle
  await click('#scAuto'); await wt(600); assert.ok(reqs.some(x => x.m === 'PUT' && x.p === '/search/sync' && x.b.enabled === false)); assert.match(await box(), /Search auto sync\s*OFF[\s\S]*Next: off/);
  BING_PARTIAL = false;
  // Yorri
  l = await say('Yorri search sync on'); assert.match(l, /Search auto sync is now ON/);
  l = await say('search sync status', 1500); assert.match(l, /Search auto sync ON.*Google Search Console: Synced OK/);
  const n = reqs.filter(x => x.m === 'POST' && x.p === '/search/sync').length; l = await say('Yorri sync search', 1800); assert.equal(reqs.filter(x => x.m === 'POST' && x.p === '/search/sync').length, n + 1); assert.match(l, /Google: synced OK/); assert.match(l, /Google \(28d\): 162 clicks, 6,120 impressions, top query “weather radar app” · 4 of 5 key pages indexed/);
  l = await say('Yorri sync Bing', 1500); assert.equal(reqs.filter(x => x.m === 'POST' && x.p === '/search/sync').pop().b.provider, 'bing');
  l = await say('Yorri search stats'); assert.match(l, /Bing \(28d\): 46 clicks/);
  l = await say('Yorri sync Apple', 600); assert.ok(!/Search|Google: /.test(l), 'Apple sync still routes to Apple');
  // Growth card with live data
  await ev(() => { ywSettings(false); }); await wt(300); await say('open growth', 2500); await wt(500); t = await card(); out.push('GROWTH (live)\n' + t.slice(0, 900));
  assert.match(t, /Google Search Console\s*LIVE[\s\S]*Clicks · 28d\s*162[\s\S]*Impressions · 28d\s*6,120[\s\S]*Indexing\s*4 \/ 5[\s\S]*weather radar app/i); assert.match(t, /Bing Webmaster Tools\s*LIVE[\s\S]*In index|Bing Webmaster Tools\s*LIVE[\s\S]*Indexing\s*19/i); assert.ok(!/SAMPLE/.test(t));
  await click('.sc-sec [data-sc="sync"]'); await wt(900); assert.ok(reqs.filter(x => x.m === 'POST' && x.p === '/search/sync').length >= n + 3);
  if (process.env.SHOT) { await ev(() => { document.documentElement.setAttribute('data-theme', 'midnight'); document.querySelector('.sc-sec').scrollIntoView({ block: 'start' }); }); await wt(400); await pg.locator('.sc-sec').screenshot({ path: `${SHOTDIR}/${CAR ? 'car' : DESK ? 'desk' : 'phone'}-search-card.png` }); }
  await narrow();
  // Settings screenshot, then Remove (two-step) for both
  await ev(() => csGo('sc')); await wt(900);
  if (process.env.SHOT) { await pg.setViewportSize({ width: CAR ? 1200 : DESK ? 1440 : 390, height: 1700 }); await ev(() => { document.documentElement.setAttribute('data-theme', 'midnight'); document.querySelector('#scCard').scrollIntoView({ block: 'start' }); }); await wt(400); await pg.locator('#scCard').screenshot({ path: `${SHOTDIR}/${CAR ? 'car' : DESK ? 'desk' : 'phone'}-search-settings.png` }); }
  await click('[data-sc="del"][data-p="bing"]'); await wt(200); assert.match(await box(), /Remove the Bing key, sites and synced data from the server\?/); assert.ok(!reqs.some(x => x.m === 'DELETE'), 'nothing removed before confirm');
  await click('[data-sc="del-no"][data-p="bing"]'); await wt(200); assert.ok(!reqs.some(x => x.m === 'DELETE'));
  await click('[data-sc="del"][data-p="bing"]'); await wt(150); await click('[data-sc="del-yes"][data-p="bing"]'); await wt(1000);
  assert.ok(reqs.some(x => x.m === 'DELETE' && x.p === '/search/config?provider=bing')); s = await box(); assert.match(s, /Removed the Bing Webmaster Tools key/); assert.equal(await dotOf('bing'), 'cx-dot err'); assert.equal(await dotOf('gsc'), 'cx-dot live');
  await click('[data-sc="del"][data-p="gsc"]'); await wt(150); await click('[data-sc="del-yes"][data-p="gsc"]'); await wt(1000); assert.match(await box(), /Google Search Console\s*not connected[\s\S]*Removed the Google Search Console key[\s\S]*Bing Webmaster Tools\s*not connected/);
  const vault = await ev(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]').filter(e => e.lane === 'Connections').map(e => e.decision + ' ' + e.title)); out.push('VAULT ' + JSON.stringify(vault)); assert.ok(vault.length >= 6); assert.ok(vault.every(v => !v.includes(BK)));
  await noKeys(); await narrow();
  // Coverage: the new card is covered by Yorri commands
  const cov = await ev(() => ycCoverage()); assert.ok(!JSON.stringify(cov).includes('scCard'), 'scCard covered by Yorri: ' + JSON.stringify(cov)); }
assert.deepEqual(errs, [], 'page errors: ' + errs.join(' | '));
console.log(out.join('\n')); console.log('\nSEARCH CONSOLES OK (' + (CAR ? 'car' : DESK ? 'desk' : 'phone') + (MOCK ? ', mock on' : '') + ')');
await b.close(); srv.close();
