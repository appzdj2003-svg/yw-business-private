// Headless check: Safe Rack maintenance room on LIVE eMaint (read-only) via the Support server — counts, LIVE label, no send actions, eMaint email tab kept, login-error help. Was: Growth room — real-shape GA4 data (Weather Radar 22 / Hunt 7 weekly users), Focus next rules, crash → stability, AI insights + Ask (mocked xAI, numbers guard),
// Make this a task → decision → POST /growth/handoff (needs-connection and success), Growth settings card, Yorri commands, Waiting for data, SAMPLE only with Mock on, phone/desktop/car. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8149);
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
const NOWW = Date.now(), WO = (id, t, due, x = {}) => ({ id, title: t, status: 'OPEN', type: 'CM', asset: 'RACK-' + id, priority: '2', assignee: 'JO', openedAt: NOWW - 5 * 864e5, dueAt: due, overdue: !!due && due < NOWW, ...x });
let MS = { status: 200, body: { asOf: NOWW, live: true, readOnly: true, workorders: { open: 31, overdue: 4, items: [WO('5012', 'Upright damage aisle 14', NOWW - 2 * 864e5), WO('5019', 'Beam clips zone B', NOWW + 2 * 864e5)] }, pms: { open: 6, overdue: 1, items: [WO('PM-220', 'Monthly rack inspection', NOWW - 864e5, { type: 'PM' })] },
  requests: { open: 3, items: [{ id: 'R-88', title: 'Bent upright night shift', requester: 'NIGHTLEAD', status: 'open', at: NOWW - 8 * 36e5 }] }, parts: { total: 140, low: 2, items: [{ id: 'P-BC10', name: 'Beam safety clip', onHand: 12, reorderAt: 50, low: true }] } } };
const MAIL = [{ id: 'm1', from: 'noreply@emaint.com', fromName: 'eMaint', subject: 'Work Request #88 submitted', date: NOWW - 36e5, unread: true, snippet: 'WR 88', body: 'WR 88', info: { requestNo: '88', needsApproval: true } }];
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); if (!localStorage.getItem('ywMockData')) localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywLlm', JSON.stringify({ key: 'xai-test-key', base: 'https://api.x.ai/v1', model: 'grok-4' })); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8149') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + u.search + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200;
  if (u.pathname === '/tickets') body = TS; else if (u.pathname === '/kpi/growth') body = GROWTH;
  else if (u.pathname === '/kpi/summary') body = { configured: true, asOf: NOW, ga4: { apps: [] }, appstore: { configured: false } };
  else if (u.pathname === '/kpi/status') body = { play: { configured: false }, ga4: { configured: true, apps: [{ id: 'hunt', label: 'Hunt', biz: 'hunt', propertyId: '559431330' }, { id: 'weather-radar', label: 'Weather Radar', biz: 'weather', propertyId: '559303196' }] }, appstore: { configured: false, note: 'Not connected' } };
  else if (u.pathname === '/kpi/config') body = { play: { configured: false }, ga4: { configured: true, apps: [] } };
  else if (u.pathname === '/maint/summary') { status = MS.status; body = MS.body; } else if (u.pathname === '/maint/mail') body = MAIL;
  else if (u.pathname === '/growth/handoff' && M === 'POST') { status = HOFF.status; body = HOFF.body; }
  else if (u.pathname === '/growth/handoff') body = { connections: [] };
  else if (u.pathname === '/handoff/connections') body = { connections: [{ id: 'crash-fix-handoff', name: 'Crash fix handoff', host: 'api2.cursor.sh', header: 'Authorization', keySet: true, scope: ['yw-support'], kinds: ['crash'], bot: '', enabled: true, ready: true }] };
  else if (u.pathname === '/handoff/config') body = { configured: true }; else if (u.pathname === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (u.pathname === '/alerts/actions') body = { actions: [] }; else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (/\/inbox\/config$/.test(u.pathname)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (u.pathname === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8149/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(3000);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 320)); return l };
const roomT = () => ev(() => document.querySelector('#board').innerText.replace(/\s+/g, ' '));
await ev(() => { maintGo(); MT.loaded = false; maintRefresh() }); await wt(900);
let t = await roomT(); out.push('room: ' + t.slice(0, 900)); assert.match(t, /MAINTENANCE · SAFE RACK Live/);
assert.match(t, /31 open WOs 4 overdue 6 PMs due 3 requests 2 low stock/); assert.match(t, /LIVE · read-only/); assert.match(t, /source: eMaint \(live, read-only\)/); assert.doesNotMatch(t, /SAMPLE/);
assert.match(t, /5012 — Upright damage aisle 14/); assert.match(t, /OVERDUE 2d/); assert.match(t, /R-88 — Bent upright night shift/); assert.match(t, /P-BC10 — Beam safety clip 12 on hand \/ reorder at 50/);
assert.match(t, /Read-only — close, approve and create in eMaint itself/);
assert.equal(await ev(() => document.querySelectorAll('#board [data-mtclose],#board [data-mtappr],#board [data-mtrej],#board [data-mtnew],#board [data-mtcreate]').length), 0, 'send actions hidden');
assert.ok(await ev(() => !!document.querySelector('#board [data-mmtab="mail"]')), 'eMaint email tab kept');
await ev(() => document.querySelector('#board [data-mmtab="mail"]').click()); await wt(900); assert.match(await roomT(), /eMaint emails/); await ev(() => document.querySelector('#board [data-mmtab="wo"]').click()); await wt(300);
assert.ok(!reqs.some(r => /^(POST|PUT|DELETE) \/maint\//.test(r)), 'no eMaint writes'); assert.ok(reqs.some(r => r.startsWith('GET /maint/summary')));
const l1 = await ev(() => { maintPropose({ t: ['t1', 'T1'], title: 'Close WO 5012', maint: { kind: 'close', id: '5012' } }); return [...document.querySelectorAll('#log p.y')].pop().innerText }); assert.match(l1, /eMaint is connected read-only here, so I can’t close WO 5012/); assert.equal(await ev(() => queue.filter(q => q.maint).length), 0);
assert.match(await ev(() => maintSummary()), /LIVE eMaint.*31 open work orders.*4 overdue.*3 pending requests.*Low stock \(2\)/);
// Requests table not found + parts error → explained, not invented
MS.body = { ...MS.body, requests: { unavailable: 'no work-request table found' }, parts: { unavailable: 'eMaint 403: no access' } }; await ev(() => maintRefresh()); await wt(500);
t = await roomT(); assert.match(t, /31 open WOs 4 overdue 6 PMs due — requests — low stock/); assert.match(t, /no work-request table found/); assert.match(t, /eMaint 403: no access/);
// Login rejected → non-secret error + what to do; email tab still there
MS = { status: 502, body: { error: 'eMaint login 401: Authentication failure (check EMAINT_USER / EMAINT_PASS and that this user has API access)' } }; await ev(() => maintRefresh()); await wt(500);
t = await roomT(); out.push('error: ' + t.slice(0, 500)); assert.match(t, /SAFE RACK Error/); assert.match(t, /EMAINT NOT CONNECTED eMaint login 401: Authentication failure/); assert.match(t, /ask your eMaint admin to enable API access/); assert.match(t, /The eMaint email tab still works/); assert.doesNotMatch(t, /SAMPLE/);
const ov = await ev(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, 'overflow ' + ov);
assert.deepEqual(errs, []); console.log(out.join('\n')); console.log('\nMAINT LIVE OK' + (DESK ? ' (desktop)' : ' (phone)')); await b.close(); srv.close();
