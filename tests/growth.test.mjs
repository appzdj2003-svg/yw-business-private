// Headless check: Growth room — real-shape GA4 data (Weather Radar 22 / Hunt 7 weekly users), Focus next rules, crash → stability, AI insights + Ask (mocked xAI, numbers guard),
// Make this a task → decision → POST /growth/handoff (needs-connection and success), Growth settings card, Yorri commands, Waiting for data, SAMPLE only with Mock on, phone/desktop/car. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8147);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, CAR = !!process.env.CAR, NOW = Date.now();
const day = (n, au, nu) => ({ date: new Date(NOW - n * 864e5).toISOString().slice(0, 10).replace(/-/g, ''), activeUsers: au, newUsers: nu, sessions: au, engagementSec: au * 60 });
const daily = L => Array.from({ length: 28 }, (_, i) => { const n = 28 - i, x = L[n]; return x ? day(n, ...x) : day(n, 0, 0); });
const WEATHER = { id: 'weather-radar', label: 'Weather Radar', biz: 'weather', propertyId: '559303196', ga4: { hasData: true, totals: { d28: { activeUsers: 22, newUsers: 22, sessions: 37, userEngagementDuration: 8870, engagementRate: 0.7837837837837838, screenPageViews: 54 }, d7: { activeUsers: 22, newUsers: 22, sessions: 37, userEngagementDuration: 8870, engagementRate: 0.7837837837837838, screenPageViews: 54 } },
  daily: daily({ 2: [12, 12], 1: [13, 10] }), countries: [{ name: '(not set)', d7: 10, p7: 0 }, { name: 'United States', d7: 4, p7: 0 }, { name: 'Hungary', d7: 2, p7: 0 }], versions: [{ name: '0.8.98', d7: 9, p7: 0 }, { name: '0.8.99', d7: 9, p7: 0 }], platform: [{ name: 'Android', users: 22 }], events: { error: 'fetch failed' }, screens: { error: 'fetch failed' }, retention: { error: 'fetch failed' }, activeUsers7: 22 } };
const HUNT = { id: 'hunt', label: 'Hunt', biz: 'hunt', propertyId: '559431330', ga4: { hasData: true, totals: { d28: { activeUsers: 7, newUsers: 7, sessions: 5, userEngagementDuration: 147, engagementRate: 0.4, screenPageViews: 5 }, d7: { activeUsers: 7, newUsers: 7, sessions: 5, userEngagementDuration: 147, engagementRate: 0.4, screenPageViews: 5 } },
  daily: daily({ 2: [7, 7] }), countries: [{ name: '(not set)', d7: 4, p7: 0 }, { name: 'United States', d7: 3, p7: 0 }], versions: [{ name: '0.1.92', d7: 7, p7: 0 }], platform: [{ name: 'Android', users: 7 }], events: [{ name: 'first_open', count: 7 }, { name: 'screen_view', count: 5 }], screens: [{ name: '(not set)', views: 5 }], retention: { cohortUsers: 0, d1Users: 0, d7Users: 0, d1: null, d7: null, window: '2026-09-28..2026-10-11' }, activeUsers7: 7 } };
let GROWTH = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [WEATHER, HUNT] }, HOFF = { status: 409, body: { error: 'needs a handoff connection: add one for the Growth room (kind growth) in Settings → Connections → Grok Bot handoffs', code: 'no-connection' } };
const KEEP = { kind: 'keep', label: 'Keep', target: '', oneTap: false, cleanup: false };
const TS = [{ id: 'S-hunt0001', from: 'firebase-noreply@google.com', fromName: '', subject: 'New fatal issue - Android com.yourworld.hunt', priority: 'high', slaH: 4, receivedAt: NOW - 3600e3, sla: 'ok', unread: true, status: 'open', snippet: '', thread: [], box: 'reply', boxBy: 'rule', boxWhy: 'crash', boxConf: 1, unsub: KEEP, tags: ['Crash'], handoff: null,
  crash: { source: 'crashlytics', kind: 'crash', platform: 'android', package: 'com.yourworld.hunt', app: 'Your World Hunt', version: '0.1.92', build: '12', crashes: 2, users: 1, exception: 'java.lang.NullPointerException', suggestedBot: 'HuntAI' } }];
const reqs = [], ai = [];
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); if (!localStorage.getItem('ywMockData')) localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywLlm', JSON.stringify({ key: 'xai-test-key', base: 'https://api.x.ai/v1', model: 'grok-4' })); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8147') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + u.search + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200;
  if (u.pathname === '/tickets') body = TS; else if (u.pathname === '/kpi/growth') body = GROWTH;
  else if (u.pathname === '/kpi/summary') body = { configured: true, asOf: NOW, ga4: { apps: [] }, appstore: { configured: false } };
  else if (u.pathname === '/kpi/status') body = { play: { configured: false }, ga4: { configured: true, apps: [{ id: 'hunt', label: 'Hunt', biz: 'hunt', propertyId: '559431330' }, { id: 'weather-radar', label: 'Weather Radar', biz: 'weather', propertyId: '559303196' }] }, appstore: { configured: false, note: 'Not connected' } };
  else if (u.pathname === '/kpi/config') body = { play: { configured: false }, ga4: { configured: true, apps: [] } };
  else if (u.pathname === '/growth/handoff' && M === 'POST') { status = HOFF.status; body = HOFF.body; }
  else if (u.pathname === '/growth/handoff') body = { connections: [] };
  else if (u.pathname === '/handoff/connections') body = { connections: [{ id: 'crash-fix-handoff', name: 'Crash fix handoff', host: 'api2.cursor.sh', header: 'Authorization', keySet: true, scope: ['yw-support'], kinds: ['crash'], bot: '', enabled: true, ready: true }] };
  else if (u.pathname === '/handoff/config') body = { configured: true }; else if (u.pathname === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (u.pathname === '/alerts/actions') body = { actions: [] }; else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (/\/inbox\/config$/.test(u.pathname)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (u.pathname === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
// Mocked Grok/xAI: insights (one line invents "45 users" → must be hidden) and Ask answers (with a TASK line).
await ctx.route('https://api.x.ai/**', async r => { const q = JSON.parse(r.request().postData()), sys = q.messages[0].content, usr = q.messages[1].content; ai.push({ sys, usr, auth: r.request().headers().authorization });
  let out; if (/growth analyst/.test(sys)) out = ['LOWDATA | Both apps are too small to judge trends yet; Hunt has only 7 weekly users. | Hunt last7.activeUsers=7', 'RANK | Weather Radar engages well — 78% engaged sessions — so more installs should convert. | Weather Radar last7.engagedSessionsPct=78', 'ANOMALY | Hunt suddenly lost 45 users this week. | Hunt last7.activeUsers=45', 'EXPERIMENT | Test a new first screenshot on the Weather Radar listing for two weeks. | Weather Radar last7.newUsers=22', 'GUIDE | Ask satisfied users for a review after a success moment. | general'].join('\n');
  else if (/fast/.test(usr)) out = 'Weather Radar is ahead: 22 active users in the last 7 days versus 7 for Hunt. Hunt will double next week to 14 users.\nTASK: Push Weather Radar installs with TikTok | Weather Radar | last7.activeUsers=22';
  else out = 'Hunt has 7 active users in the last 7 days and a 40% engaged-session rate, which is too little data to judge.';
  await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify({ choices: [{ message: { content: out } }] }) }); });
await pg.goto('http://127.0.0.1:8147/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(4800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
const room = () => ev(() => (document.querySelector('.gr-full') || document.querySelector('.gr') || {}).innerText?.replace(/\s+/g, ' ') || '');
const ovf = () => ev(() => { const g = document.querySelector('.gr'); return { doc: document.documentElement.scrollWidth - innerWidth, gr: g ? g.scrollWidth - g.clientWidth : 0 } });
// The Growth room exists in Your World Apps (migration) and opens by voice
assert.ok(await ev(() => bizStore.businesses.find(b => b.id === 'yw-apps').rooms.some(r => r.type === 'growth' && r.label === 'Growth')));
let l = await say('open growth', 2500); assert.match(l, /Opened Your World Apps › Growth/);
let t = await room(); out.push('room: ' + t.slice(0, 900));
assert.match(t, /Weather Radar/); assert.match(t, /\b22 active users/); assert.match(t, /Hunt/); assert.match(t, /\b7 active users/); assert.match(t, /LIVE/); assert.doesNotMatch(t, /SAMPLE/);
assert.match(t, /78% engaged sessions/); assert.match(t, /no prior data/); assert.match(t, /D1 \/ D7 retention.*(no cohort yet|unavailable)/);
assert.match(t, /Play Console connect/); assert.match(t, /Reviews need Play Console/); assert.match(t, /Crash tickets 1 open/);
assert.match(t, /All apps \(sum\) 29 active users/);
assert.equal(await ev(() => document.querySelectorAll('.gr-full .gr-spark').length), 3, 'per-app + combined sparklines');
// Focus next: crash (stability) first, then low-data items, filled with general guidance — each with metric + bot + Make this a task
const F = await ev(() => grFocus().items.map(f => [f.rule, f.title, f.metric, f.bot, !!f.general]));
out.push('focus: ' + JSON.stringify(F));
assert.deepEqual(F.map(f => f[0]), ['stability', 'lowData', 'lowData']);
assert.match(F[0][1], /Fix the open crash in Hunt/); assert.equal(F[0][3], 'HuntAI');
assert.deepEqual(F[1].slice(1, 4), ['Grow Hunt installs first', '7 active users in the last 7 days (threshold 50)', 'TikTok Marketing']);
assert.deepEqual(F[2].slice(1, 3), ['Grow Weather Radar installs first', '22 active users in the last 7 days (threshold 50)']);
assert.equal(await ev(() => document.querySelectorAll('.gr-full [data-grtask]').length), 3);
// AI insights: marked AI, cites metrics, hides the invented "45" line, explains its limits
await wt(800); t = await room();
assert.match(t, /AI AI insights/); assert.match(t, /LOWDATA Both apps are too small/); assert.match(t, /Hunt last7\.activeUsers=7/); assert.match(t, /EXPERIMENT Test a new first screenshot/); assert.match(t, /GENERAL GUIDANCE Ask satisfied users/);
assert.doesNotMatch(t, /45 users/); assert.match(t, /1 line hidden — it used a number that isn’t in your data/);
assert.ok(ai.length >= 1 && ai[0].auth === 'Bearer xai-test-key'); const D = JSON.parse(ai[0].usr.replace(/^DATA: /, '')); assert.equal(D.apps[0].last7.activeUsers, 22); assert.equal(D.playConsole, 'not connected (no crash rate, ANR or reviews)'); assert.match(ai[0].sys, /too small|thin/);
out.push('ai: ' + t.slice(t.indexOf('AI insights'), t.indexOf('AI insights') + 500));
// Ask about growth (typed): drops the invented sentence, offers Make this a task
await ev(() => { const i = document.querySelector('#grAsk'); i.value = 'Which app is growing faster?'; i.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-gr="ask"]').click() }); await wt(900);
t = await room(); assert.match(t, /Weather Radar is ahead: 22 active users in the last 7 days versus 7 for Hunt\./); assert.doesNotMatch(t, /double next week/); assert.match(t, /left out 1 sentence/);
await ev(() => document.querySelector('[data-grans]').click()); await wt(300);
let q = await ev(() => queue.filter(x => x.growth).map(x => [x.title, x.why, x.lane, x.growth.bot]));
assert.deepEqual(q[0], ['Growth · Weather Radar: Push Weather Radar installs with TikTok', 'last7.activeUsers=22 → WeatherAI', 'Growth', 'WeatherAI']);
// Focus item → decision → approve: no growth connection → "needs a handoff connection", nothing sent
await ev(() => document.querySelector('.gr-full [data-grtask="hunt:lowData"]').click()); await wt(300);
assert.match(await last(), /Added Grow Hunt installs first to your decisions\. Approve it to hand it to TikTok Marketing/);
assert.match(await room(), /In your decisions ✓/);
await ev(() => decide(queue.findIndex(x => x.growth && x.growth.focusId === 'hunt:lowData'), true)); await wt(700);
l = await last(); assert.match(l, /Approved, but this needs a handoff connection/); out.push('approve (no conn): ' + l);
const hp = reqs.filter(x => x.startsWith('POST /growth/handoff')); assert.equal(hp.length, 1); const hb = JSON.parse(hp[0].slice(hp[0].indexOf('{')));
assert.deepEqual([hb.focusId, hb.app, hb.rule, hb.bot, hb.metric], ['hunt:lowData', 'Hunt', 'lowData', 'TikTok Marketing', '7 active users in the last 7 days (threshold 50)']);
await ev(() => document.querySelector('[data-grho]').click()); await wt(1200);
assert.ok(await ev(() => document.querySelector('#hoForm [data-hosc="growth"]').checked && document.querySelector('#hoKGrowth').checked && !document.querySelector('#hoKCrash').checked), 'growth handoff form prefilled');
assert.ok(await ev(() => [...document.querySelectorAll('#hoBot option')].some(o => o.textContent === 'TikTok Marketing')));
await ev(() => ywSettings(false)); await wt(200);
// With a growth connection the approve hands off
HOFF = { status: 200, body: { ok: true, connection: { id: 'growth', name: 'Growth handoff' }, bot: 'WeatherAI', payload: {} } };
await ev(() => decide(queue.findIndex(x => x.growth && /TikTok/.test(x.title)), true)); await wt(700);
l = await last(); assert.match(l, /Approved — Push Weather Radar installs with TikTok handed to WeatherAI through “Growth handoff”/); out.push('approve (conn): ' + l);
assert.ok(await ev(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]').some(a => /handed to WeatherAI via Growth handoff/.test(a.decision))));
// Yorri commands (spoken replies)
l = await say('what should I focus on'); assert.match(l, /Focus next: 1\. Fix the open crash in Hunt — 1 open crash report.*2\. Grow Hunt installs first — 7 active users/);
l = await say('how is Weather doing'); assert.match(l, /Weather Radar: 22 active users in the last 7 days, no data for the week before, 22 new, 37 sessions, 78% engaged sessions\. Not enough users yet for retention\./);
l = await say('how is Hunt doing'); assert.match(l, /Hunt: 7 active users .*1 open crash report\./);
l = await say('compare my apps'); assert.match(l, /Weather Radar 22 active users \(7 days\), 22 new, 78% engaged; Hunt 7 active users \(7 days\), 7 new, 40% engaged\. Weather Radar is ahead/);
const n0 = ai.length; l = await say('why is Hunt engagement low?', 1500); assert.equal(ai.length, n0 + 1, 'growth question routed to AI'); assert.match(l, /AI Hunt has 7 active users in the last 7 days and a 40% engaged-session rate/);
l = await say('open growth settings', 1500); assert.match(l, /Opened Growth settings/); assert.ok(await ev(() => document.querySelector('#grCard').open));
// Growth settings: auto by default; rename, rule off, threshold, default bot, AI off, reset to auto
let s = await ev(() => document.querySelector('#grCard').innerText.replace(/\s+/g, ' ')); out.push('settings: ' + s.slice(0, 600)); assert.match(s, /Growth auto setup · 2 apps/); assert.match(s, /Play Console connect/);
const ch = (sel, f) => ev(([sel, f]) => { const e = document.querySelector(sel); new Function('e', f)(e); e.dispatchEvent(new Event('change', { bubbles: true })) }, [sel, f]);
await ch('[data-grs="label"][data-app="hunt"]', 'e.value="Hunt Pro"'); await ch('[data-grs="rule"][data-rule="lowData"]', 'e.checked=false'); await ch('[data-grs="th"][data-rule="firstSession"][data-k="min"]', 'e.value="5"'); await ch('[data-grs="bot"][data-app="hunt"]', 'e.value="AppleHuntAi"'); await wt(300);
s = await ev(() => document.querySelector('#grCard').innerText.replace(/\s+/g, ' ')); assert.match(s, /manual setup/); assert.match(s, /Saved — manual setup/);
const F2 = await ev(() => grFocus().items.map(f => [f.rule, f.app, f.bot, f.metric])); out.push('focus (manual): ' + JSON.stringify(F2));
assert.ok(!F2.some(f => f[0] === 'lowData'), 'lowData rule off');
const F3 = await ev(() => grFocus().items.find(f => f.rule === 'firstSession')); // min lowered to 5 → Hunt (7 new of 7, 40% engaged < 50%) now triggers first-session work
assert.ok(F3 && F3.app === 'Hunt Pro' && F3.bot === 'AppleHuntAi' && /7 of 7 28-day users are new; engaged-session rate 40% \(threshold 50%\)/.test(F3.metric), JSON.stringify(F3));
await ch('#grAi', 'e.checked=false'); const n1 = ai.length; await ev(() => ywSettings(false)); await say('open growth', 1200); t = await room(); assert.match(t, /AI insights are off/); assert.equal(ai.length, n1);
await ev(() => { ycCard('grCard') }); await wt(400); await ev(() => document.querySelector('[data-grs="reset"]').click()); await wt(300);
assert.equal(await ev(() => localStorage.getItem('ywGrowth')), null); assert.match(await ev(() => document.querySelector('#grCard').innerText), /auto setup/); await ev(() => ywSettings(false));
// Range toggle 28 days
await say('open growth', 1500); await ev(() => document.querySelector('[data-gr="rg"][data-n="28"]').click()); await wt(500); assert.match(await room(), /daily active users · 28 days/);
// Layout: phone / desktop / car — nothing overflows
let o = await ovf(); assert.ok(o.doc <= 1 && o.gr <= 1, 'overflow ' + JSON.stringify(o));
await ev(() => document.body.classList.add('car-layout')); await wt(300); o = await ovf(); assert.ok(o.doc <= 1 && o.gr <= 1, 'car overflow ' + JSON.stringify(o));
if (process.env.SHOT) { await ev(() => { document.documentElement.setAttribute('data-theme', 'midnight'); document.querySelector('.gr-full').scrollIntoView() }); await wt(300); await pg.locator('.gr-full').screenshot({ path: `/tmp/growth-${DESK ? 'desk' : CAR ? 'car' : 'phone'}.png` }); await ev(() => document.documentElement.removeAttribute('data-theme')); } await ev(() => document.body.classList.remove('car-layout'));
// Board tile on the Business Board
await ev(() => { roomView = 'Business Board'; draw() }); await wt(400); const tile = await ev(() => (document.querySelector('.gr-tile') || {}).innerText?.replace(/\s+/g, ' ')); assert.match(tile, /Weather Radar.*22.*active users.*Focus next/); out.push('tile: ' + tile.slice(0, 300));
// No data: Waiting for data + GENERAL GUIDANCE (no numbers); Mock on → SAMPLE
GROWTH = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [{ ...HUNT, ga4: { hasData: false } }] }; await ev(() => grRefresh(true, true)); await wt(600); await say('open growth', 900);
t = await room(); assert.match(t, /Waiting for data/); assert.match(t, /GENERAL GUIDANCE/); assert.doesNotMatch(t, /SAMPLE/);
l = await say('what should I focus on'); assert.match(l, /Analytics is still waiting for data\. Focus next: 1\. Fix the open crash in Hunt — 1 open crash.*2\. Grow installs first \(general guidance\)/);
GROWTH = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [] }; await ev(() => { GR.d = null; localStorage.setItem('ywMockData', '1'); mockOn = true; }); await ev(() => grRefresh(true, true)); await wt(600); await say('open growth', 900);
t = await room(); assert.match(t, /SAMPLE/); assert.match(t, /Weather Radar/); l = await say('how is Weather doing'); assert.match(l, /^Yorri.*Sample data:/);
await ev(() => { localStorage.setItem('ywMockData', '0'); mockOn = false; });
// Registry coverage + no errors
assert.deepEqual(await ev(() => ycCoverage()), []); assert.deepEqual(errs, []);
console.log(out.join('\n')); console.log('\nGROWTH OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
