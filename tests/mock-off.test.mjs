// Headless check: with Mock data OFF no SAMPLE / demo / stub data appears anywhere (command board, every Command room, every business board and room, Yorri answers),
// with and without the Support server; leftover mock-tagged items saved earlier (sample decisions, sample Vault entries, stub-ticket state) are cleared, real ones kept;
// rooms sit under the right business (Weather Radar + Hunt under Your World Apps; Support/Growth/Marketing in Your World Apps; Maintenance in Safe Rack) incl. a one-time fix of an old layout;
// with Mock data ON the sample data is back and labelled SAMPLE. All network mocked. Run: node tests/mock-off.test.mjs
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8164);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, CAR = !!process.env.CAR, NOW = Date.now();
const APPS = [{ id: 'weather', label: 'Weather Radar', domain: 'weather.yourworldapps.si', url: 'https://weather.yourworldapps.si/' }, { id: 'hunt', label: 'Hunt', domain: 'hunt.yourworldapps.si', url: 'https://hunt.yourworldapps.si/' }, { id: 'market', label: 'Market Analyzer', domain: '', url: '' }];
const PL = [['tiktok', 'TikTok'], ['youtube', 'YouTube Shorts'], ['instagram', 'Instagram Reels'], ['facebook', 'Facebook'], ['x', 'X'], ['reddit', 'Reddit'], ['pinterest', 'Pinterest'], ['linkedin', 'LinkedIn'], ['medium', 'Medium'], ['quora', 'Quora'], ['hackernews', 'Hacker News'], ['directory', 'Directories']];
const TR = { tiktok: { visitors: 20, visits: 22, goVisitors: 4, playClicks: 6, sources: ['TikTok', 'tiktok', 'vm.tiktok.com'] }, youtube: { visitors: 5, visits: 6, goVisitors: 1, playClicks: 0, sources: ['Youtube'] }, pinterest: { visitors: 2, visits: 2, goVisitors: 0, playClicks: 0, sources: ['Pinterest'] } };
const plats = o => PL.map(([id, label]) => ({ id, label, visitors: 0, visits: 0, playClicks: 0, campaigns: [], ...(o[id] || {}), traffic: { id, label, visitors: 0, visits: 0, goVisitors: 0, playClicks: 0, sources: [], ...(TR[id] || {}) } }));
let YTS = { configured: false, source: null, at: null };
const STATUS = () => ({ plausible: { configured: true, source: 'stored', at: NOW }, youtube: YTS, apps: APPS, platforms: PL.map(([id, label]) => ({ id, label })), posts: POSTS.length });
const LIVE = { app: APPS[0], asOf: NOW, connected: true, state: 'live', hasData: true, source: 'stored', totals: { visitors: 80, visits: 90, pageviews: 150, bounceRate: 50, visitDuration: 60 }, daily: [{ date: '2026-10-21', visitors: 80 }], pages: [{ page: '/', visitors: 60, pageviews: 100 }], sources: [{ source: 'tiktok', visitors: 12 }],
  playClicks: { visitors: 6, clicks: 9 }, platforms: plats({ tiktok: { visitors: 12, visits: 13, playClicks: 4, campaigns: [{ slug: 'wx-launches-ultra', visitors: 8, visits: 9, playClicks: 3, sources: ['tiktok'] }, { slug: 'bio', visitors: 4, visits: 4, playClicks: 1, sources: ['tiktok'] }] } }), otherUtm: [],
  traffic: { platforms: [], unmapped: [], go: { ok: true }, playBySource: { ok: true } } };
const STATS = app => app === 'market' ? { app: APPS[2], asOf: NOW, connected: false, state: 'no-site', note: 'Market Analyzer has no Plausible site yet (site TBD), so traffic is not connected. Posts can still be logged.' }
  : app === 'hunt' ? { app: APPS[1], asOf: NOW, connected: true, state: 'empty', hasData: false, totals: { visitors: 0, visits: 0, pageviews: 0 }, daily: [], pages: [], sources: [], utm: [], playClicks: { visitors: 0, clicks: 0 }, platforms: plats({}).map(p => ({ ...p, traffic: { ...p.traffic, visitors: 0, visits: 0, goVisitors: 0, playClicks: 0, sources: [] } })), otherUtm: [] } : LIVE;
const H = 36e5, iso = t => new Date(t).toISOString(), etDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date(t));
let POSTS = [{ id: 'P1', app: 'weather', platform: 'tiktok', slug: 'wx-launches-ultra', date: '2026-10-21', status: 'posted', postUrl: 'https://www.tiktok.com/@yourworldapps/video/7699217873545350413', link: 'https://weather.yourworldapps.si/?utm_source=tiktok&utm_medium=social&utm_campaign=wx-launches-ultra', notes: '', via: 'api', at: NOW, views: 1234, viewsCheckedAt: '2026-10-21T21:10:00.000Z' },
  { id: 'P2', app: 'weather', platform: 'youtube', slug: 'wx-launches-ultra', date: '2026-10-21', status: 'posted', postUrl: 'https://youtube.com/shorts/38AZy3zch8g', link: 'https://weather.yourworldapps.si/?utm_source=youtube&utm_medium=social&utm_campaign=wx-launches-ultra', notes: '', via: 'api', at: NOW, views: 310, viewsCheckedAt: '2026-10-21T20:05:00.000Z' },
  { id: 'P3', app: 'weather', platform: 'instagram', slug: 'wx-launches-ultra', date: '2026-10-21', status: 'drafted', postUrl: '', link: 'https://weather.yourworldapps.si/?utm_source=instagram&utm_medium=social&utm_campaign=wx-launches-ultra', notes: '', via: 'api', at: NOW },
  { id: 'Q1', app: 'weather', platform: 'youtube', slug: 'wx-rain-eta', date: etDay(NOW + 30 * H), status: 'queued', plannedFor: iso(NOW + 30 * H), title: 'Rain ETA (Short)', postUrl: '', link: 'https://weather.yourworldapps.si/?utm_source=youtube&utm_medium=social&utm_campaign=wx-rain-eta', notes: '', via: 'api', at: NOW },
  { id: 'Q2', app: 'market', platform: 'tiktok', slug: 'ywma-6tabs', date: etDay(NOW + 3 * H), status: 'queued', plannedFor: iso(NOW + 3 * H), title: 'Six tabs that watch the market for you', postUrl: '', link: '', notes: '', via: 'api', at: NOW },
  { id: 'Q3', app: 'weather', platform: 'x', slug: 'wx-late', date: etDay(NOW - 2 * H), status: 'queued', plannedFor: iso(NOW - 2 * H), title: 'Missed one', postUrl: '', link: '', notes: '', via: 'api', at: NOW },
  { id: 'L1', app: 'weather', platform: 'tiktok', slug: 'wx-sun-tab', date: '2099-10-27', status: 'planned', postUrl: '', link: '', notes: '', via: 'import', at: NOW },
  { id: 'L0', app: 'weather', platform: 'tiktok', slug: 'wx-old-plan', date: '2020-01-01', status: 'planned', postUrl: '', link: '', notes: '', via: 'import', at: NOW }];
let n = 3; const reqs = [];
const CH = () => { const S = YTS.configured ? { source: 'YouTube Data API v3', asOf: NOW, followers: 37, views: 1204, videos: 9, followersHidden: false } : { source: null, followers: null, views: null, videos: null, note: 'no data source connected — add a YouTube Data API key in Settings → Connections → Marketing (or YOUTUBE_API_KEY on Render)' };
  const pc = pl => ({ logged: POSTS.filter(p => p.platform === pl).length, posted: POSTS.filter(p => p.platform === pl && p.status === 'posted').length });
  return { channels: [{ id: 'youtube-yourworldapps', platform: 'youtube', handle: '@yourworldapps', name: 'Your World Apps', channelId: 'UCv_HP3UU30nKawvJ0AgHL3A', url: 'https://www.youtube.com/channel/UCv_HP3UU30nKawvJ0AgHL3A', posts: pc('youtube'), stats: S },
    { id: 'tiktok-yourworldapps', platform: 'tiktok', handle: '@yourworldapps', name: 'Your World Apps', url: 'https://www.tiktok.com/@yourworldapps', created: '2026-10-21', posts: pc('tiktok'), stats: { source: null, followers: null, views: null, videos: null, note: 'no data source connected — TikTok has no public stats API for this account' } }], youtube: YTS, tiktok: { configured: false }, asOf: NOW }; };
async function open(NOSV, seed, mock = '0') {
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
pg.on('dialog', d => d.accept());
await pg.addInitScript(([car, mock]) => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); if (!sessionStorage.getItem('mk0')) { sessionStorage.setItem('mk0', '1'); localStorage.setItem('ywMockData', mock); } if (car) localStorage.setItem('ywCarLayout', '1'); }, [CAR, mock]);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8164') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + u.search + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const P = u.pathname;
  if (P === '/kpi/marketing') body = STATS(u.searchParams.get('app') || 'weather');
  else if (P === '/marketing/status') body = STATUS(); else if (P === '/marketing/channels') body = CH();
  else if (P === '/marketing/youtube' && M === 'POST') { if (!/^AIza/.test(bd.key)) { status = 400; body = { error: 'Paste the whole YouTube Data API key (starts with AIza, no spaces)' }; } else { YTS = { configured: true, source: 'stored', at: NOW }; body = STATUS(); } }
  else if (P === '/marketing/posts' && M === 'GET') body = { posts: POSTS };
  else if (P === '/marketing/posts' && M === 'POST') { const p = { id: 'P' + (++n), ...bd, at: NOW }; POSTS.push(p); body = { ok: true, created: 1, updated: 0, posts: [p] }; }
  else if (/^\/marketing\/posts\/\w+$/.test(P) && M === 'PUT') { const p = POSTS.find(x => x.id === P.split('/').pop()); Object.assign(p, bd); body = { ok: true, post: p }; }
  else if (P === '/kpi/growth') body = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [] };
  else if (P === '/kpi/summary') body = { configured: false, asOf: NOW, appstore: { configured: false } };
  else if (P === '/kpi/status') body = { play: { configured: false }, ga4: { configured: false, apps: [] }, appstore: { configured: false } };
  else if (P === '/tickets') body = []; else if (P === '/handoff/connections') body = { connections: [] }; else if (P === '/handoff/config') body = { configured: false }; else if (P === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (P === '/alerts/actions') body = { actions: [] }; else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (/\/inbox\/config$/.test(P)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8164/');
if (seed) await pg.evaluate(seed);
if (!NOSV) await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(6500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
return { ctx, pg, errs, ev, wt, out };
}



const FAKE = /\bSAMPLE\b|\bsample\b|\bdemo\b|\bmock\b|\bstub\b|Login loop|Radar refresh lag|Hunt sync delay|\b12k\b|NEXRAD|Severe watch|Flash flood|8\.2k|GPS drift|Offline pack|1\.1k|\$71,880|\$184\.2k|Acme|J\. Ruiz|VPN access|Payroll portal|Expense policy|WO-50\d\d|PM-2\d\d|Beam safety clip/i;
async function scanAll(T, tag) { const { ev, wt } = T, hits = [];
  const scan = async label => { const r = await ev(re => { const R = new RegExp(re, 'i'), out = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { const el = n.parentElement; if (!el || el.closest('#setPage,script,style,#log,[hidden],#mockChip,.car-ctl,#llmPanel') || !el.offsetParent && getComputedStyle(el).position !== 'fixed') continue; const t = n.textContent.trim(); if (t && R.test(t)) out.push(t.slice(0, 120)); } return [...new Set(out)]; }, FAKE.source);
    for (const x of r) hits.push(tag + ' · ' + label + ' :: ' + x); };
  await ev(() => { setPageView('command'); roomView = 'Command Board'; draw() }); await wt(900); await scan('command board');
  for (const r of await ev(() => CMD_ROOMS)) { await ev(r => { roomView = r; draw() }, r); await wt(700); await scan('cmd ' + r); }
  const B = await ev(() => bizStore.businesses.map(b => ({ id: b.id, name: b.name, rooms: b.rooms.map(r => r.label) })));
  for (const b of B) { await ev(id => { bizStore.activeId = id; setPageView('apps'); roomView = 'Business Board'; draw() }, b.id); await wt(900); await scan(b.name + ' board');
    for (const lab of b.rooms) { await ev(l => { roomView = l; draw() }, lab); await wt(700); await scan(b.name + ' › ' + lab); } }
  await ev(() => { setPageView('command'); roomView = 'Command Board'; draw() }); await wt(400);
  for (const q of ['briefing', 'status', 'how is support', 'what needs a reply', 'open finance', 'what needs my decision', 'kpis', 'how is maintenance', 'how is marketing doing']) {
    await ev(t => ask(t), q); await wt(1400); const l = await ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' ')); if (FAKE.test(l)) hits.push(tag + ' · yorri ' + q + ' :: ' + l.slice(0, 200)); }
  const q = await ev(() => document.querySelector('#queue').innerText); if (FAKE.test(q)) hits.push(tag + ' · queue :: ' + q.slice(0, 200));
  return hits; }
// 1) old saved state: Weather/Hunt top-level, Marketing room parked under Hunt, Maintenance under Weather; mock-tagged leftovers + real items that must stay
const OLD = () => { const B = { activeId: 'yw-apps', businesses: [
  { id: 'yw-apps', name: 'Your World Apps', rooms: [{ id: 'r1', label: 'Overview', type: 'metrics' }, { id: 'r2', label: 'Support', type: 'tickets', role: 'support' }, { id: 'yw-growth', label: 'Growth', type: 'growth', role: 'growth' }, { id: 'cal1', label: 'Calendar', type: 'calendar' }] },
  { id: 'weather', name: 'Weather Radar', rooms: [{ id: 'w1', label: 'Storm board', type: 'map' }, { id: 'sr-maint', label: 'Maintenance', type: 'maint' }] },
  { id: 'hunt', name: 'Hunt', rooms: [{ id: 'h1', label: 'Seasons', type: 'pipeline' }, { id: 'yw-marketing', label: 'Marketing', type: 'marketing', role: 'marketing' }] },
  { id: 'safe-rack', name: 'Safe Rack', rooms: [{ id: 'sr-ov', label: 'Overview', type: 'metrics' }] }] };
  localStorage.setItem('ywBusinesses', JSON.stringify(B)); for (const k of ['ywSeedGrowth', 'ywSeedMarketing', 'ywSeedSR', 'ywSeedCal']) localStorage.setItem(k, '1'); localStorage.removeItem('ywSeedPlace');
  localStorage.setItem('ywConn', JSON.stringify({ 'hunt/yw-marketing': { type: 'rest', url: 'https://x.test', live: false } }));
  localStorage.setItem('ywVaultAudit', JSON.stringify([{ ts: '2026-10-20T10:00:00.000Z', decision: 'APPROVED', title: 'Real decision · keep me', lane: 'Support' }, { ts: '2026-10-19T10:00:00.000Z', decision: 'SAMPLE · APPROVED (nothing ran)', title: 'Run Friday payroll · $71,880', sample: true, mode: 'SAMPLE' }, { ts: '2026-10-18T10:00:00.000Z', decision: 'APPROVED', title: 'Send Acme NDA renewal notice' }]));
  localStorage.setItem('ywSupportState', JSON.stringify({ 'S-102': { read: true, sent: [{ from: 'you (stub — not emailed)', at: 1, body: 'x', out: true }] }, 'S-16bb688f': { read: true } }));
};
const T1 = await open(true, OLD);
const st = await T1.ev(() => ({ biz: bizStore.businesses.map(b => ({ id: b.id, parent: b.parent || '', rooms: b.rooms.map(r => r.id) })), conn: Object.keys(JSON.parse(localStorage.getItem('ywConn') || '{}')),
  audit: JSON.parse(localStorage.getItem('ywVaultAudit') || '[]').map(e => e.title), sup: Object.keys(JSON.parse(localStorage.getItem('ywSupportState') || '{}')), log: JSON.parse(localStorage.getItem('ywPlaceLog') || '{}').moved, purged: JSON.parse(localStorage.getItem('ywMockPurged') || '{}') }));
console.log('placement', JSON.stringify(st.biz), st.log);
const by = id => st.biz.find(b => b.id === id);
assert.equal(by('weather').parent, 'yw-apps'); assert.equal(by('hunt').parent, 'yw-apps'); assert.equal(by('safe-rack').parent, ''); assert.equal(by('yw-apps').parent, '');
assert.ok(by('yw-apps').rooms.includes('yw-marketing') && !by('hunt').rooms.includes('yw-marketing'), 'Marketing moved to Your World Apps');
assert.ok(by('safe-rack').rooms.includes('sr-maint') && !by('weather').rooms.includes('sr-maint'), 'Maintenance moved to Safe Rack');
assert.ok(by('weather').rooms.includes('w1') && by('hunt').rooms.includes('h1'), 'other rooms stay put'); assert.equal(st.biz.reduce((n, b) => n + b.rooms.length, 0), 9, 'no room lost');
assert.ok(st.conn.includes('yw-apps/yw-marketing') && !st.conn.includes('hunt/yw-marketing'), 'connection moved with its room');
assert.deepEqual(st.audit, ['Real decision · keep me'], 'only sample Vault entries removed'); assert.deepEqual(st.sup, ['S-16bb688f'], 'only stub-ticket state removed');
assert.ok(st.purged.vault === 2 && st.purged.sampleTickets === 1, JSON.stringify(st.purged));
assert.equal(await T1.ev(() => bizStore.businesses.find(b => b.id === 'yw-apps').rooms.find(r => r.id === 'yw-marketing').type), 'marketing', 'built-in room keeps its type');
await T1.ev(() => { location.reload() }); await T1.wt(5000);
assert.equal(await T1.ev(() => bizStore.businesses.reduce((n, b) => n + b.rooms.length, 0)), 9, 'one-time fix: nothing changes on reload');
// a business the user nested elsewhere / renamed is never moved again: user moves Hunt back to top level
await T1.ev(() => { delete bizStore.businesses.find(b => b.id === 'hunt').parent; saveBiz(); location.reload() }); await T1.wt(5000);
assert.equal(await T1.ev(() => bizStore.businesses.find(b => b.id === 'hunt').parent || ''), '', 'user choice kept after the one-time fix');
const H1 = await scanAll(T1, 'no server'); assert.deepEqual(T1.errs, []); await T1.ctx.close();
// 2) fresh install with the Support server connected (empty)
const T2 = await open(false, () => { localStorage.clear(); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywUnlock', '1'); saveBiz(); });
const H2 = await scanAll(T2, 'server'); assert.deepEqual(T2.errs, []);
const nc = await T2.ev(() => { bizStore.activeId = 'safe-rack'; setPageView('apps'); roomView = 'Business Board'; draw(); return document.querySelector('#board').innerText });
console.log('hits', JSON.stringify(H1.concat(H2), null, 1)); assert.deepEqual(H1.concat(H2), [], 'no sample/demo/stub text with Mock data off');
// fresh seed puts Weather Radar + Hunt under Your World Apps
assert.deepEqual(await T2.ev(() => bizStore.businesses.map(b => b.id + ':' + (b.parent || ''))), ['yw-apps:', 'weather:yw-apps', 'hunt:yw-apps', 'safe-rack:']);
await T2.ctx.close();
// 3) Mock data ON (no server): SAMPLE data is back and labelled
const T3 = await open(true, null, '1');
await T3.ev(() => { bizStore.activeId = 'yw-apps'; setPageView('apps'); roomView = 'Support'; draw() }); await T3.wt(1200);
let t = await T3.ev(() => document.querySelector('#board').innerText); assert.match(t, /VPN access for new hire/); assert.match(t, /SAMPLE|MOCK|Stub/i);
await T3.ev(() => { bizStore.activeId = 'safe-rack'; roomView = 'Maintenance'; draw() }); await T3.wt(1200); t = await T3.ev(() => document.querySelector('#board').innerText); assert.match(t, /SAMPLE data/); assert.match(t, /WO-50/);
await T3.ev(() => { setPageView('command'); roomView = 'Command Board'; draw() }); await T3.wt(800); t = await T3.ev(() => document.querySelector('#board').innerText); assert.match(t, /sample|mock/i);
await T3.ev(() => ask('status')); await T3.wt(1200); assert.match(await T3.ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText), /SAMPLE/);
// toggling Mock off live clears it without a reload
await T3.ev(() => { const m = document.querySelector('#mockT'); m.checked = false; m.onchange() }); await T3.wt(1500);
await T3.ev(() => { bizStore.activeId = 'yw-apps'; setPageView('apps'); roomView = 'Support'; draw() }); await T3.wt(1200); t = await T3.ev(() => document.querySelector('#board').innerText);
assert.doesNotMatch(t, /VPN access|Payroll portal|SAMPLE/); assert.match(t, /not connected/i);
await T3.ev(() => { bizStore.activeId = 'safe-rack'; roomView = 'Maintenance'; draw() }); await T3.wt(1200); t = await T3.ev(() => document.querySelector('#board').innerText); assert.doesNotMatch(t, /WO-50|SAMPLE/); assert.match(t, /EMAINT NOT CONNECTED/i);
assert.deepEqual(T3.errs, []); await T3.ctx.close();
console.log('mock-off: OK'); await b.close(); srv.close();
