// Headless check: Marketing room — Plausible not connected (Connect Plausible CTA, empty states), then live-shape data (campaigns by platform with aliases already mapped server-side,
// best platform, post ↔ campaign join), UTM link builder, post log add/edit/delete (confirm), Settings card (key → server only), Growth marketing rule, Yorri commands, SAMPLE only with Mock on, phone/desktop/car. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8149);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, CAR = !!process.env.CAR, NOW = Date.now();
const APPS = [{ id: 'weather', label: 'Weather Radar', domain: 'weather.yourworldapps.si', url: 'https://weather.yourworldapps.si/' }, { id: 'hunt', label: 'Hunt', domain: 'hunt.yourworldapps.si', url: 'https://hunt.yourworldapps.si/' }];
const PL = [['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['reddit', 'Reddit'], ['instagram', 'Instagram Reels'], ['youtube', 'YouTube Shorts'], ['x', 'X']];
const plats = o => PL.map(([id, label]) => ({ id, label, visitors: 0, visits: 0, playClicks: 0, campaigns: [], ...(o[id] || {}) }));
let STATUS = { plausible: { configured: false, source: null, at: null }, apps: APPS, posts: 0 };
let STATS = app => ({ app: APPS.find(a => a.id === app), asOf: NOW, connected: false, state: 'not-connected', note: 'Plausible isn’t connected' });
const LIVE = app => app === 'hunt' ? { app: APPS[1], asOf: NOW, connected: true, state: 'empty', hasData: false, totals: { visitors: 0, visits: 0, pageviews: 0 }, daily: [], pages: [], sources: [], utm: [], playClicks: { visitors: 0, clicks: 0 }, platforms: plats({}), otherUtm: [] }
  : { app: APPS[0], asOf: NOW, connected: true, state: 'live', hasData: true, source: 'stored', totals: { visitors: 41, visits: 52, pageviews: 97, bounceRate: 61, visitDuration: 74 }, daily: [{ date: '2026-10-20', visitors: 20 }, { date: '2026-10-21', visitors: 21 }],
    pages: [{ page: '/', visitors: 30, pageviews: 44 }, { page: '/outlook.html', visitors: 9, pageviews: 12 }], sources: [{ source: 'Direct / None', visitors: 18 }, { source: 'tiktok', visitors: 12 }], playClicks: { visitors: 1, clicks: 2 },
    platforms: plats({ tiktok: { visitors: 12, visits: 13, playClicks: 1, campaigns: [{ slug: 'wx-rain-eta', visitors: 10, visits: 11, playClicks: 1, sources: ['tiktok'] }, { slug: 'bio', visitors: 2, visits: 2, playClicks: 0, sources: ['TikTok'] }] }, instagram: { visitors: 4, visits: 4, playClicks: 1, campaigns: [{ slug: 'wx-rain-eta', visitors: 4, visits: 4, playClicks: 1, sources: ['ig'] }] } }),
    otherUtm: [{ source: 'newsletter', medium: 'email', campaign: 'oct', visitors: 5 }] };
let POSTS = []; let n = 0; const reqs = [];
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
const dialogs = []; pg.on('dialog', d => { dialogs.push(d.message()); d.accept(); });
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); if (!localStorage.getItem('ywMockData')) localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8149') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + u.search + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const P = u.pathname;
  if (P === '/kpi/marketing') body = STATS(u.searchParams.get('app') || 'weather');
  else if (P === '/marketing/status') body = STATUS;
  else if (P === '/marketing/plausible' && M === 'POST') { if (bd.key.length < 20) { status = 400; body = { error: 'Paste the whole Plausible Stats API key (no spaces)' }; } else { STATUS = { ...STATUS, plausible: { configured: true, source: 'stored', at: NOW } }; STATS = LIVE; body = STATUS; } }
  else if (P === '/marketing/posts' && M === 'GET') body = { posts: POSTS };
  else if (P === '/marketing/posts' && M === 'POST') { const p = { id: 'P' + (++n), ...bd, at: NOW }; POSTS.push(p); body = { ok: true, created: 1, updated: 0, posts: [p] }; }
  else if (/^\/marketing\/posts\/P\d+$/.test(P) && M === 'PUT') { const p = POSTS.find(x => x.id === P.split('/').pop()); Object.assign(p, bd); body = { ok: true, post: p }; }
  else if (/^\/marketing\/posts\/P\d+$/.test(P) && M === 'DELETE') { const id = P.split('/').pop(); if (u.searchParams.get('confirm') !== id) { status = 400; body = { error: 'confirm' }; } else { POSTS = POSTS.filter(x => x.id !== id); body = { ok: true }; } }
  else if (P === '/kpi/growth') body = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [] };
  else if (P === '/kpi/summary') body = { configured: false, asOf: NOW, appstore: { configured: false } };
  else if (P === '/kpi/status') body = { play: { configured: false }, ga4: { configured: false, apps: [] }, appstore: { configured: false } };
  else if (P === '/tickets') body = []; else if (P === '/handoff/connections') body = { connections: [] }; else if (P === '/handoff/config') body = { configured: false }; else if (P === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (P === '/alerts/actions') body = { actions: [] }; else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (/\/inbox\/config$/.test(P)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8149/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(6500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
const room = () => ev(() => (document.querySelector('.mk-full') || {}).innerText?.replace(/\s+/g, ' ') || '');
const ovf = () => ev(() => { const g = document.querySelector('.mk-full'); return { doc: document.documentElement.scrollWidth - innerWidth, mk: g ? g.scrollWidth - g.clientWidth : 0 } });
const click = sel => ev(s => document.querySelector(s).click(), sel);
const type = (sel, v) => ev(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })) }, [sel, v]);
// The Marketing room is seeded right after Growth in Your World Apps
const rooms = await ev(() => bizStore.businesses.find(b => b.id === 'yw-apps').rooms.map(r => r.type + ':' + r.label)); const gi = rooms.indexOf('growth:Growth'); assert.ok(gi >= 0 && rooms[gi + 1] === 'marketing:Marketing', JSON.stringify(rooms));
// Not connected: CTA + empty states, no invented numbers
let l = await say('open marketing'); assert.match(l, /Opened Your World Apps › Marketing/); await wt(600);
let t = await room(); out.push('off: ' + t.slice(0, 400)); assert.match(t, /Google Analytics not connected/); assert.match(t, /weather\.yourworldapps\.si/); assert.match(t, /Settings → Connections → GA4 & Play/); assert.match(t, /Plausible key is only an optional fallback/);
assert.match(t, /TikTok — — — 0/); assert.match(t, /No posts logged for Weather Radar yet/); assert.doesNotMatch(t, /SAMPLE|LIVE/);
l = await say('how is marketing doing'); assert.match(l, /Google Analytics isn’t linked for this site yet, so there are no site numbers.*0 posts logged/);
// Connect Plausible from the CTA → Settings card; key goes to the server only
await click('[data-mk="connect"]'); await wt(500); assert.ok(await ev(() => document.querySelector('#mkCard').open));
let s = await ev(() => document.querySelector('#mkCard').innerText.replace(/\s+/g, ' ')); assert.match(s, /Marketing traffic not linked · 2 apps/); assert.match(s, /Plausible key \(optional fallback\)/); assert.match(s, /Stats API/); assert.match(s, /PLAUSIBLE_API_KEY/);
assert.equal(await ev(() => document.querySelector('#mkKeyIn').type), 'password');
await type('#mkKeyIn', 'short'); await click('[data-mks="key"]'); await wt(400); assert.match(await ev(() => document.querySelector('#mkCard').innerText), /Not saved: Paste the whole/);
const KEY = 'plausible-live-key-0123456789abcdef'; await type('#mkKeyIn', KEY); await click('[data-mks="key"]'); await wt(1500);
s = await ev(() => document.querySelector('#mkCard').innerText.replace(/\s+/g, ' ')); assert.match(s, /Connected — key stored encrypted on your server/); assert.match(s, /optional fallback/);
assert.ok(reqs.some(x => x.startsWith('POST /marketing/plausible') && x.includes(KEY))); assert.ok(!(await ev(() => JSON.stringify(localStorage))).includes(KEY), 'key never stored in the browser');
await ev(() => ywSettings(false));
// Live data
l = await say('open marketing', 1500); t = await room(); out.push('live: ' + t.slice(0, 700));
assert.match(t, /LIVE/); assert.match(t, /41 visitors 52 visits 97 pageviews 2 Play clicks 2% visitors → Play/); assert.match(t, /TikTok best so far — 12 1 0/); assert.match(t, /Instagram Reels — 4 1 0/);
assert.match(t, /Top pages \/ 30 \/outlook\.html 9/i); assert.match(t, /Sources Direct \/ None 18 tiktok 12/i); assert.match(t, /Other UTM ?newsletter \/ email \/ oct 5/i);
l = await say('which platform is working best'); assert.match(l, /For Weather Radar \(7 days\), TikTok is working best: 12 visitors and 1 Play click\. Then Instagram Reels \(4 visitors, 1 Play click\)\./);
l = await say('how is marketing doing'); assert.match(l, /Weather Radar site, last 7 days: 41 visitors, 97 pageviews, 2 Play-button clicks\. Best platform so far: TikTok with 12 visitors and 1 Play click\. 0 posts logged/);
// Link builder
await type('#mkLbPl', 'instagram'); await wt(300); await type('#mkLbSlug', 'WX Sun Tab'); await type('#mkLbPath', '/outlook.html'); await wt(200);
assert.equal(await ev(() => document.querySelector('#mkLinkOut').textContent), 'https://weather.yourworldapps.si/outlook.html?utm_source=instagram&utm_medium=social&utm_campaign=wx-sun-tab');
l = await say('build a campaign link for tiktok wx-rain-eta'); assert.match(l, /TikTok link for wx-rain-eta: https:\/\/weather\.yourworldapps\.si\/\?utm_source=tiktok&utm_medium=social&utm_campaign=wx-rain-eta/);
l = await say('build a campaign link for hunt on youtube hunt-blind-tips'); assert.match(l, /YouTube Shorts link for hunt-blind-tips: https:\/\/hunt\.yourworldapps\.si\/\?utm_source=youtube&utm_medium=social&utm_campaign=hunt-blind-tips/);
l = await say('build a campaign link'); assert.match(l, /Opened the campaign link builder/);
// Post log: log a post by voice → form prefilled → Save → POST; joins to campaign numbers
l = await say('log a tiktok post wx-rain-eta'); assert.match(l, /New post for Weather Radar: TikTok · wx-rain-eta · posted\. Check it and tap Save post/);
assert.equal(await ev(() => document.querySelector('#mkFSlug').value), 'wx-rain-eta'); await type('#mkFNotes', 'first launch video'); await click('[data-mk="save"]'); await wt(800);
let pp = reqs.filter(x => x.startsWith('POST /marketing/posts')); assert.equal(pp.length, 1); let pb = JSON.parse(pp[0].slice(pp[0].indexOf('{')));
assert.deepEqual([pb.app, pb.platform, pb.slug, pb.status, pb.notes, pb.link], ['weather', 'tiktok', 'wx-rain-eta', 'posted', 'first launch video', 'https://weather.yourworldapps.si/?utm_source=tiktok&utm_medium=social&utm_campaign=wx-rain-eta']);
t = await room(); assert.match(t, /Logged TikTok · wx-rain-eta/); assert.match(t, /TikTok wx-rain-eta posted Views — Visits 10 Play clicks 1/i); assert.match(t, /TikTok best so far — 12 1 1/);
// Add from the form (Log a post button) with planned status
await click('[data-mk="add"]'); await wt(200); await type('#mkFPl', 'x'); await type('#mkFSlug', 'wx-outlook-live'); await type('#mkFSt', 'planned'); await click('[data-mk="save"]'); await wt(800);
t = await room(); assert.match(t, /X wx-outlook-live planned Views — Visits 0 Play clicks 0/i);
// Edit → PUT
await click('[data-mkedit="P2"]'); await wt(200); assert.equal(await ev(() => document.querySelector('#mkFSlug').value), 'wx-outlook-live'); await type('#mkFSt', 'drafted'); await click('[data-mk="save"]'); await wt(800);
assert.ok(reqs.some(x => x.startsWith('PUT /marketing/posts/P2') && x.includes('"status":"drafted"'))); t = await room(); assert.match(t, /Saved changes to X · wx-outlook-live/); assert.match(t, /wx-outlook-live drafted/i);
// Delete → confirm dialog → DELETE ?confirm=id
await click('[data-mkdel="P2"]'); await wt(800); assert.match(dialogs.pop(), /Delete the X post “wx-outlook-live”/); assert.ok(reqs.some(x => x.startsWith('DELETE /marketing/posts/P2?confirm=P2')));
t = await room(); assert.doesNotMatch(t, /wx-outlook-live drafted/i); assert.match(t, /Deleted X · wx-outlook-live/);
assert.ok(await ev(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]').some(a => a.lane === 'Marketing' && /POST LOGGED/.test(a.decision))));
// App picker: Hunt is connected but empty
await click('[data-mk="app"][data-id="hunt"]'); await wt(900); t = await room(); assert.match(t, /hunt\.yourworldapps\.si/); assert.match(t, /No visits yet — Google Analytics is linked — no visits on this site in this range yet/); assert.match(t, /No page views yet/);
l = await say('how is marketing doing for hunt'); assert.match(l, /Hunt: Google Analytics is linked but recorded no visits in the last 7 days/);
await click('[data-mk="app"][data-id="weather"]'); await wt(400);
// Growth hand-off: marketing rule (41 visitors, 1 tapped Play = 2% < 5%)
const F = await ev(() => grFocus().items.find(f => f.rule === 'marketing')); assert.ok(F, 'marketing focus item'); out.push('focus: ' + JSON.stringify(F));
assert.deepEqual([F.title, F.metric, F.bot], ['Turn Weather Radar site visitors into installs', '1 of 41 site visitors tapped Google Play in the last 7 days (2%, threshold 5%)', 'WeatherAI']);
// Layout: nothing overflows (phone / desktop / car)
await say('open marketing', 900); let o = await ovf(); assert.ok(o.doc <= 1 && o.mk <= 1, 'overflow ' + JSON.stringify(o));
await ev(() => document.body.classList.add('car-layout')); await wt(300); o = await ovf(); assert.ok(o.doc <= 1 && o.mk <= 1, 'car overflow ' + JSON.stringify(o));
if (process.env.SHOT) { await ev(() => document.querySelector('.mk-full').scrollIntoView()); await wt(300); await pg.locator('.mk-full').screenshot({ path: `/tmp/marketing-${DESK ? 'desk' : CAR ? 'car' : 'phone'}.png` }); } await ev(() => document.body.classList.remove('car-layout'));
// Board tile
await ev(() => { roomView = 'Business Board'; draw() }); await wt(400); const tile = await ev(() => (document.querySelector('.mk-tile') || {}).innerText?.replace(/\s+/g, ' ')); assert.match(tile, /Weather Radar.*41.*visitors.*Best platform: TikTok.*1 post logged \(1 posted\)/); out.push('tile: ' + tile);
// Mock on with no key → SAMPLE (never shown with Mock off)
STATS = app => ({ app: APPS.find(a => a.id === app), connected: false, state: 'not-connected' }); await ev(() => { MK.d = {}; localStorage.setItem('ywMockData', '1'); mockOn = true; }); await say('open marketing', 1200);
t = await room(); assert.match(t, /SAMPLE/); l = await say('how is marketing doing'); assert.match(l, /Sample data:/); await ev(() => { localStorage.setItem('ywMockData', '0'); mockOn = false; MK.d = {}; });
// Help lists the commands; registry coverage; no errors
const help = await ev(() => ycListHTML('marketing')); for (const x of ['open marketing', 'how is marketing doing', 'log a post', 'which platform is working best', 'build a campaign link', 'open marketing settings']) assert.ok(help.includes(x), 'help: ' + x);
assert.deepEqual(await ev(() => ycCoverage()), []); assert.deepEqual(errs, []);
console.log(out.join('\n')); console.log('\nMARKETING OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
