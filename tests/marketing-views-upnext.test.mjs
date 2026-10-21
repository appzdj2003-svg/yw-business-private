// Headless check (views + Up next): views per post with checked time in ET, queued posts with plannedFor/title in Up next (ET, overdue, date-only plan rows), queue form (ET entry), Yorri what's up next / views on <slug>, phone/desktop/car. Based on the TikTok test harness.
// Original header: TikTok + 12 platforms in the Marketing room — traffic by platform (all traffic from Plausible sources + tagged + /go/ link), post-log platform chips,
// Market Analyzer app (no site → traffic not connected, posts still log), Channels panel (YouTube + TikTok @yourworldapps, "—" without a real source, real YouTube counts when the server has them),
// YouTube key slot (→ server only), Yorri commands, phone/desktop/car. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8152);
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
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
pg.on('dialog', d => d.accept());
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8152') ? r.continue() : r.abort());
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
await pg.goto('http://127.0.0.1:8152/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(6500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
const room = () => ev(() => (document.querySelector('.mk-full') || {}).innerText?.replace(/\s+/g, ' ') || '');
const ovf = () => ev(() => { const g = document.querySelector('.mk-full'); return { doc: document.documentElement.scrollWidth - innerWidth, mk: g ? g.scrollWidth - g.clientWidth : 0 } });
const click = sel => ev(s => document.querySelector(s).click(), sel);
const type = (sel, v) => ev(([s, v]) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })) }, [sel, v]);

const fmt = t => new Date(t).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
let l = await say('open marketing', 1500); let t = await room(); out.push('room: ' + t.slice(0, 900));
// Up next: queued only, by plannedFor, all apps, ET, overdue flagged; plan rows (date only) folded, past plan rows hidden
let up = await ev(() => document.querySelector('#mkUpNext').innerText.replace(/\s+/g, ' ').toLowerCase()); out.push('up: ' + up);
assert.deepEqual(await ev(() => [...document.querySelectorAll('#mkUpNext [data-mkup]')].map(x => x.dataset.mkup)), ['Q3', 'Q2', 'Q1']);
assert.ok(up.includes((fmt(NOW - 2 * H) + ' X Weather Radar due Missed one wx-late').toLowerCase()), up); assert.ok(up.includes((fmt(NOW + 3 * H) + ' TikTok Market Analyzer Six tabs that watch the market for you ywma-6tabs').toLowerCase()), up);
assert.ok(up.includes((fmt(NOW + 30 * H) + ' YouTube Shorts Weather Radar Rain ETA (Short)').toLowerCase()), up); assert.match(up, /1 planned from the content plan \(date only\)/i); assert.doesNotMatch(up, /wx-old-plan/i);
await ev(() => document.querySelector('[data-mkupl]').open = true); await wt(200); up = await ev(() => document.querySelector('#mkUpNext').innerText.replace(/\s+/g, ' ').toLowerCase()); assert.match(up, /TikTok Weather Radar · date only wx-sun-tab/i);
// Post log: Views with checked time (ET), — until first check; queued rows show their time + title
t = await room(); assert.ok(t.includes('Views 1,234 checked ' + fmt('2026-10-21T21:10:00.000Z')), t); assert.ok(t.includes('Views 310 checked ' + fmt('2026-10-21T20:05:00.000Z')));
assert.match(await ev(() => document.querySelector('[data-mkpost="P3"]').innerText.replace(/\s+/g, ' ')), /Views — Visits/); assert.doesNotMatch(await ev(() => document.querySelector('[data-mkpost="P3"]').innerText), /checked/);
let q1 = await ev(() => document.querySelector('[data-mkpost="Q1"]').innerText.replace(/\s+/g, ' ')); assert.ok(q1.includes('QUEUED for ' + fmt(NOW + 30 * H)) || q1.includes('queued for ' + fmt(NOW + 30 * H)), q1); assert.match(q1, /Rain ETA \(Short\)/);
// Yorri
l = await say("what's up next"); assert.ok(l.includes('Up next: X “Missed one” (Weather Radar) at ' + fmt(NOW - 2 * H) + ' — overdue, not logged as posted yet; TikTok “Six tabs that watch the market for you” (Market Analyzer) at ' + fmt(NOW + 3 * H)), l);
l = await say('what is queued'); assert.match(l, /^Yorri: Up next:/);
l = await say('views on wx-launches-ultra'); assert.ok(l.includes('Views on wx-launches-ultra: TikTok 1,234 (checked ' + fmt('2026-10-21T21:10:00.000Z') + '); YouTube Shorts 310 (checked ' + fmt('2026-10-21T20:05:00.000Z') + '). Total 1,544. 1 not checked yet.'), l);
l = await say('how many views on wx-rain-eta'); assert.match(l, /No view counts for wx-rain-eta yet — 1 post logged \(YouTube Shorts queued\), none checked so far/);
l = await say('views on nothing-here'); assert.match(l, /No post with the slug nothing-here is logged/);
l = await say('views on tiktok'); assert.doesNotMatch(l, /No post with the slug/);
// Queue a post from the form: ET entry → ISO, date = ET day; queued needs a time
l = await say('log a tiktok post wx-kit-list'); await type('#mkFSt', 'queued'); await click('[data-mk="save"]'); await wt(400); assert.match(await room(), /A queued post needs a Planned for time \(ET\)/);
await type('#mkFTitle', 'Emergency kit list'); await type('#mkFWhen', '2026-11-03T11:00'); await click('[data-mk="save"]'); await wt(900);
let pb = JSON.parse(reqs.filter(x => x.startsWith('POST /marketing/posts')).pop().replace(/^[^{]*/, '')); assert.deepEqual([pb.status, pb.plannedFor, pb.date, pb.title, pb.slug], ['queued', '2026-11-03T16:00:00.000Z', '2026-11-03', 'Emergency kit list', 'wx-kit-list'], 'Nov 3 = EST (UTC-5)');
await click('[data-mkedit="Q1"]'); await wt(200); assert.equal(await ev(() => document.querySelector('#mkFWhen').value), await ev(i => { const P = {}; for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(i))) P[x.type] = x.value; return `${P.year}-${P.month}-${P.day}T${P.hour}:${P.minute}` }, POSTS.find(p => p.id === 'Q1').plannedFor));
await type('#mkFWhen', '2026-10-23T09:30'); await click('[data-mk="save"]'); await wt(800); assert.ok(reqs.some(x => x.startsWith('PUT /marketing/posts/Q1') && x.includes('"plannedFor":"2026-10-23T13:30:00.000Z"')), 'Oct 23 = EDT (UTC-4)');
// Empty state
const saved = POSTS; POSTS = saved.filter(p => p.status !== 'queued'); await ev(() => mkPostsLoad(false)); await wt(500); up = await ev(() => document.querySelector('#mkUpNext').innerText.replace(/\s+/g, ' ').toLowerCase()); assert.match(up, /Nothing queued\./i);
l = await say("what's up next"); assert.match(l, /Nothing is queued right now\. Next on the content plan \(date only\): TikTok wx-sun-tab on 2099-10-27/); POSTS = saved; await ev(() => mkPostsLoad(false)); await wt(500);
// Board tile shows the next queued post
await ev(() => { roomView = 'Business Board'; draw() }); await wt(400); const tile = await ev(() => (document.querySelector('.mk-tile') || {}).innerText?.replace(/\s+/g, ' ')); assert.match(tile, /Up next: X · Missed one/); out.push('tile: ' + tile);
// Layout: phone / desktop / car
await say('open marketing', 900); let o = await ovf(); assert.ok(o.doc <= 1 && o.mk <= 1, 'overflow ' + JSON.stringify(o));
await ev(() => document.body.classList.add('car-layout')); await wt(300); o = await ovf(); assert.ok(o.doc <= 1 && o.mk <= 1, 'car overflow ' + JSON.stringify(o));
if (process.env.SHOT) { await ev(() => document.querySelector('#mkUpNext').scrollIntoView()); await wt(300); await pg.locator('.mk-full').screenshot({ path: `/tmp/mk-up-${DESK ? 'desk' : CAR ? 'car' : 'phone'}.png` }); } await ev(() => document.body.classList.remove('car-layout'));
const help = await ev(() => ycListHTML('marketing')); for (const x of ["what's up next", 'what is queued', 'views on wx-launches-ultra', 'how many views on wx-launches-ultra']) assert.ok(help.includes(x.replace("'", '&#39;')) || help.includes(x), 'help: ' + x);
assert.deepEqual(await ev(() => ycCoverage()), []); assert.deepEqual(errs, []);
console.log(out.join('\n')); console.log('\nMARKETING VIEWS+UPNEXT OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
