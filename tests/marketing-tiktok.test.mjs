// Headless check: TikTok + 12 platforms in the Marketing room — traffic by platform (all traffic from Plausible sources + tagged + /go/ link), post-log platform chips,
// Market Analyzer app (no site → traffic not connected, posts still log), Channels panel (YouTube + TikTok @yourworldapps, "—" without a real source, real YouTube counts when the server has them),
// YouTube key slot (→ server only), Yorri commands, phone/desktop/car. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8151);
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
let POSTS = [{ id: 'P1', app: 'weather', platform: 'tiktok', slug: 'wx-launches-ultra', date: '2026-10-21', status: 'posted', postUrl: 'https://www.tiktok.com/@yourworldapps/video/7699217873545350413', link: 'https://weather.yourworldapps.si/?utm_source=tiktok&utm_medium=social&utm_campaign=wx-launches-ultra', notes: '', via: 'api', at: NOW },
  { id: 'P2', app: 'weather', platform: 'youtube', slug: 'wx-launches-ultra', date: '2026-10-21', status: 'posted', postUrl: 'https://youtube.com/shorts/38AZy3zch8g', link: 'https://weather.yourworldapps.si/?utm_source=youtube&utm_medium=social&utm_campaign=wx-launches-ultra', notes: '', via: 'api', at: NOW },
  { id: 'P3', app: 'weather', platform: 'instagram', slug: 'wx-launches-ultra', date: '2026-10-21', status: 'drafted', postUrl: '', link: 'https://weather.yourworldapps.si/?utm_source=instagram&utm_medium=social&utm_campaign=wx-launches-ultra', notes: '', via: 'api', at: NOW }];
let n = 3; const reqs = [];
const CH = () => { const S = YTS.configured ? { source: 'YouTube Data API v3', asOf: NOW, followers: 37, views: 1204, videos: 9, followersHidden: false } : { source: null, followers: null, views: null, videos: null, note: 'no data source connected — add a YouTube Data API key in Settings → Connections → Marketing (or YOUTUBE_API_KEY on Render)' };
  const pc = pl => ({ logged: POSTS.filter(p => p.platform === pl).length, posted: POSTS.filter(p => p.platform === pl && p.status === 'posted').length });
  return { channels: [{ id: 'youtube-yourworldapps', platform: 'youtube', handle: '@yourworldapps', name: 'Your World Apps', channelId: 'UCv_HP3UU30nKawvJ0AgHL3A', url: 'https://www.youtube.com/channel/UCv_HP3UU30nKawvJ0AgHL3A', posts: pc('youtube'), stats: S },
    { id: 'tiktok-yourworldapps', platform: 'tiktok', handle: '@yourworldapps', name: 'Your World Apps', url: 'https://www.tiktok.com/@yourworldapps', created: '2026-10-21', posts: pc('tiktok'), stats: { source: null, followers: null, views: null, videos: null, note: 'no data source connected — TikTok has no public stats API for this account' } }], youtube: YTS, tiktok: { configured: false }, asOf: NOW }; };
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
pg.on('dialog', d => d.accept());
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8151') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + u.search + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const P = u.pathname;
  if (P === '/kpi/marketing') body = STATS(u.searchParams.get('app') || 'weather');
  else if (P === '/marketing/status') body = STATUS(); else if (P === '/marketing/channels') body = CH();
  else if (P === '/marketing/youtube' && M === 'POST') { if (!/^AIza/.test(bd.key)) { status = 400; body = { error: 'Paste the whole YouTube Data API key (starts with AIza, no spaces)' }; } else { YTS = { configured: true, source: 'stored', at: NOW }; body = STATUS(); } }
  else if (P === '/marketing/posts' && M === 'GET') body = { posts: POSTS };
  else if (P === '/marketing/posts' && M === 'POST') { const p = { id: 'P' + (++n), ...bd, at: NOW }; POSTS.push(p); body = { ok: true, created: 1, updated: 0, posts: [p] }; }
  else if (P === '/kpi/growth') body = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [] };
  else if (P === '/kpi/summary') body = { configured: false, asOf: NOW, appstore: { configured: false } };
  else if (P === '/kpi/status') body = { play: { configured: false }, ga4: { configured: false, apps: [] }, appstore: { configured: false } };
  else if (P === '/tickets') body = []; else if (P === '/handoff/connections') body = { connections: [] }; else if (P === '/handoff/config') body = { configured: false }; else if (P === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (P === '/alerts/actions') body = { actions: [] }; else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (/\/inbox\/config$/.test(P)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8151/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(6500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
const room = () => ev(() => (document.querySelector('.mk-full') || {}).innerText?.replace(/\s+/g, ' ') || '');
const ovf = () => ev(() => { const g = document.querySelector('.mk-full'); return { doc: document.documentElement.scrollWidth - innerWidth, mk: g ? g.scrollWidth - g.clientWidth : 0 } });
const click = sel => ev(s => document.querySelector(s).click(), sel);
const type = (sel, v) => ev(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })) }, [sel, v]);
// Weather: traffic by platform — TikTok and YouTube on top, all traffic vs tagged, /go/ link, Plausible sources; empty platforms folded
let l = await say('open marketing', 1500); let t = await room(); out.push('weather: ' + t.slice(0, 900));
assert.match(t, /Traffic by platform Platform All traffic Tagged Play clicks Posted/i); assert.match(t, /TikTok best so far 4 via \/go\/ link 20 12 6 1/); assert.match(t, /YouTube Shorts 1 via \/go\/ link 5 0 0 1/);
assert.match(t, /Instagram Reels — ?0 0 0 1 planned\/drafted|Instagram Reels 0 0 0 0 1 planned\/drafted/); assert.match(t, /Pinterest 2 0 0 0/);
assert.match(t, /8 more platforms with no visits or posts yet — Facebook, X, Reddit, LinkedIn, Medium, Quora, Hacker News, Directories/);
assert.equal(await ev(() => [...document.querySelectorAll('.mk-full .mk-pl[data-mkpl]')].map(x => x.dataset.mkpl).slice(0, 2).join()), 'tiktok,youtube');
assert.match(t, /tiktok\.com → TikTok/); assert.match(t, /\/go\/\?src=tiktok counts as TikTok/);
await ev(() => document.querySelector('[data-mkpl="tiktok"]').open = true); await wt(200); t = await room(); assert.match(t, /Plausible sources: TikTok, tiktok, vm\.tiktok\.com/); assert.match(t, /wx-launches-ultra 8 3 logged/);
// Channels: both @yourworldapps accounts, no invented numbers
let ch = await ev(() => document.querySelector('#mkChannels').innerText.replace(/\s+/g, ' ')); out.push('channels: ' + ch);
assert.match(ch, /Channels YouTube @yourworldapps Your World Apps — subscribers — views — videos no data source connected/i); assert.match(ch, /TikTok @yourworldapps Your World Apps — followers — views — videos no data source connected — TikTok has no public stats API/i);
assert.match(ch, /1 post logged · 1 posted · created 2026-10-21/); assert.match(ch, /UCv_HP3UU30nKawvJ0AgHL3A/);
assert.deepEqual(await ev(() => [...document.querySelectorAll('#mkChannels a')].map(a => a.href)), ['https://www.youtube.com/channel/UCv_HP3UU30nKawvJ0AgHL3A', 'https://www.tiktok.com/@yourworldapps']);
l = await say('how many followers do we have on tiktok'); assert.match(l, /TikTok @yourworldapps: no followers or view counts — no data source connected\. 1 posts logged, 1 posted\./); assert.doesNotMatch(l, /YouTube/);
l = await say('show our channels'); assert.match(l, /YouTube @yourworldapps: no subscribers or view counts — no data source connected.*TikTok @yourworldapps/);
// Post log: platform chips; TikTok post with its post URL
t = await room(); assert.match(t, /All 3 TikTok 1 YouTube 1 Instagram 1/); assert.match(t, /2026-10-21 TikTok wx-launches-ultra posted Views — Visits 8 Play clicks 3 post/i);
await click('[data-mk="pf"][data-v="tiktok"]'); await wt(300); let cards = await ev(() => [...document.querySelectorAll('.mk-post')].map(x => x.dataset.mkpost)); assert.deepEqual(cards, ['P1']);
assert.equal(await ev(() => document.querySelector('[data-mkpost="P1"] a').href), 'https://www.tiktok.com/@yourworldapps/video/7699217873545350413');
await click('[data-mk="pf"][data-v=""]'); await wt(300); assert.equal(await ev(() => document.querySelectorAll('.mk-post').length), 3);
// New platforms in the form + link builder
assert.deepEqual(await ev(() => [...document.querySelectorAll('#mkLbPl option')].map(o => o.value)), PL.map(p => p[0]));
await type('#mkLbPl', 'hackernews'); await wt(300); await type('#mkLbSlug', 'wx-show-hn'); await wt(200); assert.equal(await ev(() => document.querySelector('#mkLinkOut').textContent), 'https://weather.yourworldapps.si/?utm_source=hackernews&utm_medium=social&utm_campaign=wx-show-hn');
l = await say('log a pinterest post wx-pin-radar'); assert.match(l, /New post for Weather Radar: Pinterest · wx-pin-radar · posted/); await click('[data-mk="save"]'); await wt(800);
let pb = JSON.parse(reqs.filter(x => x.startsWith('POST /marketing/posts')).pop().replace(/^[^{]*/, '')); assert.deepEqual([pb.app, pb.platform, pb.slug], ['weather', 'pinterest', 'wx-pin-radar']);
l = await say('log a hacker news post wx-show-hn'); assert.match(l, /Hacker News · wx-show-hn/); await click('[data-mk="cancel"]'); await wt(200);
l = await say('log a linkedin post wx-li-1'); assert.match(l, /LinkedIn · wx-li-1/); await click('[data-mk="cancel"]'); await wt(200);
// Market Analyzer: app button, traffic not connected (no CTA, no numbers), posts log with the post URL and no tracking link
assert.match(await room(), /Weather Radar Hunt Market Analyzer/);
await click('[data-mk="app"][data-id="market"]'); await wt(900); t = await room(); out.push('market: ' + t.slice(0, 600));
assert.match(t, /Traffic not connected — Market Analyzer has no Plausible site yet \(site TBD\)/); assert.match(t, /no site yet · traffic not connected/); assert.doesNotMatch(t, /Connect Plausible|LIVE|SAMPLE/); assert.match(t, /— visitors/);
assert.match(t, /No posts logged for Market Analyzer yet/); assert.match(t, /Market Analyzer has no site yet — no tracking link to build/);
l = await say('log a youtube post for market analyzer ma-short-oct21'); assert.match(l, /New post for Market Analyzer: YouTube Shorts · ma-short-oct21 · posted/);
await type('#mkFUrl', 'https://youtube.com/shorts/oVyaP1owlvA'); await click('[data-mk="save"]'); await wt(800);
pb = JSON.parse(reqs.filter(x => x.startsWith('POST /marketing/posts')).pop().replace(/^[^{]*/, '')); assert.deepEqual([pb.app, pb.platform, pb.slug, pb.postUrl, pb.link], ['market', 'youtube', 'ma-short-oct21', 'https://youtube.com/shorts/oVyaP1owlvA', '']);
t = await room(); assert.match(t, /2026-10-\d\d YouTube Shorts ma-short-oct21 posted Views — Visits — Play clicks — post/i); assert.match(t, /All 1 YouTube 1/);
l = await say('how is marketing doing for market analyzer'); assert.match(l, /Market Analyzer/); assert.doesNotMatch(l, /\d+ visitors/);
await click('[data-mk="app"][data-id="weather"]'); await wt(500);
// YouTube Data API key slot (settings) → server only; then real counts appear
await say('open marketing settings', 900); let s = await ev(() => document.querySelector('#mkCard').innerText.replace(/\s+/g, ' ')); assert.match(s, /YouTube Data API key \(optional · channel counts\) Not connected/); assert.match(s, /TikTok has no public stats API/);
assert.equal(await ev(() => document.querySelector('#mkYtIn').type), 'password'); assert.match(s, /Platforms: tiktok, youtube, instagram, facebook, x, reddit, pinterest, linkedin, medium, quora, hackernews, directory/);
await type('#mkYtIn', 'nope'); await click('[data-mks="ytkey"]'); await wt(500); assert.match(await ev(() => document.querySelector('#mkCard').innerText), /Not saved: Paste the whole YouTube/);
const YK = 'AIzaSyLIVEKEY_0123456789abcdefghijklmn'; await type('#mkYtIn', YK); await click('[data-mks="ytkey"]'); await wt(1200);
s = await ev(() => document.querySelector('#mkCard').innerText.replace(/\s+/g, ' ')); assert.match(s, /Connected — key stored encrypted on your server/); assert.ok(!(await ev(() => JSON.stringify(localStorage))).includes(YK), 'key never in the browser');
await ev(() => ywSettings(false)); await say('open marketing', 1200); ch = await ev(() => document.querySelector('#mkChannels').innerText.replace(/\s+/g, ' '));
assert.match(ch, /YouTube @yourworldapps Your World Apps 37 subscribers 1,204 views 9 videos From YouTube Data API v3/i); assert.match(ch, /TikTok @yourworldapps Your World Apps — followers/i);
l = await say('youtube subscribers'); assert.match(l, /YouTube @yourworldapps: 37 subscribers, 1,204 views, 9 videos \(YouTube Data API v3\)/);
// Layout: phone / desktop / car
await say('open marketing', 900); let o = await ovf(); assert.ok(o.doc <= 1 && o.mk <= 1, 'overflow ' + JSON.stringify(o));
await ev(() => document.body.classList.add('car-layout')); await wt(300); o = await ovf(); assert.ok(o.doc <= 1 && o.mk <= 1, 'car overflow ' + JSON.stringify(o));
if (process.env.SHOT) { await ev(() => document.querySelector('.mk-full').scrollIntoView()); await wt(300); await pg.locator('.mk-full').screenshot({ path: `/tmp/mk-tiktok-${DESK ? 'desk' : CAR ? 'car' : 'phone'}.png` }); } await ev(() => document.body.classList.remove('car-layout'));
// Help + registry
const help = await ev(() => ycListHTML('marketing')); for (const x of ['show our channels', 'how many followers do we have on tiktok', 'log a youtube post for market analyzer']) assert.ok(help.includes(x), 'help: ' + x);
assert.match(help, /Hacker News/); assert.deepEqual(await ev(() => ycCoverage()), []); assert.deepEqual(errs, []);
// "subscribers" alone is not hijacked (Play subscriptions), "show our accounts" is not either
assert.equal(await ev(() => YC.list.find(c => c.id === 'mk.channels').match('', 'how many subscribers do we have')), null); assert.equal(await ev(() => YC.list.find(c => c.id === 'mk.channels').match('', 'show our accounts')), null);
console.log(out.join('\n')); console.log('\nMARKETING TIKTOK OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
