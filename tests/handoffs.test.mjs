// Headless check: Grok Bot handoffs list — migrated connection, add/edit/copy (key re-entered or carried server-side)/delete (confirmed), per-room attach, ticket picker, Yorri commands. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8143);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, NOW = Date.now();
const KEEP = { kind: 'keep', label: 'Keep — crash alerts', target: '', oneTap: false, cleanup: false, hint: 'Crash reports are always kept.' };
const CRASH = { source: 'crashlytics', kind: 'crash', platform: 'android', package: 'com.yourworld.weatheranalyzer', app: 'Your World Weather Radar', version: '0.8.97', build: '135', crashes: 4, users: 2, exception: 'java.lang.IllegalStateException - Not implemented', consoleLink: 'https://console.firebase.google.com/project/your-world-weather-radar/crashlytics/app/android:com.yourworld.weatheranalyzer/issues/6a2c5bda', issue: 's2.f.invokeSuspend', issues: 1, alert: 'Trending stability issues', suggestedBot: 'WeatherAI' };
const HUNT = { ...CRASH, package: 'com.yourworld.hunt', app: 'Your World Hunt', version: '2.0', build: '9', crashes: 1, users: 1, exception: 'java.lang.NullPointerException', alert: 'New fatal issue', suggestedBot: 'HuntAI' };
const tk = (id, from, subject, box, x = {}) => ({ id, from, fromName: '', subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: NOW - 3600e3, sla: 'ok', unread: true, status: 'open', snippet: subject, thread: [{ from, at: NOW - 3600e3, body: subject }], box, boxBy: 'rule', boxWhy: 'rule', boxConf: 0.9, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false, cleanup: false }, ...x });
const crashT = (id, c, subj, at) => tk(id, 'firebase-noreply@google.com', subj, 'reply', { priority: 'high', slaH: 4, crash: c, tags: ['Crash'], handoff: null, unsub: KEEP, receivedAt: at, boxWhy: 'crash report (Firebase Crashlytics) · urgent' });
const TS = [crashT('S-e15fcf7a', CRASH, 'Trending stability issues for 2026-10-17 - Android com.yourworld.weatheranalyzer', NOW - 1800e3), crashT('S-hunt0001', HUNT, 'New fatal issue - Android com.yourworld.hunt', NOW - 7200e3), tk('S-jane0001', 'jane@gmail.com', 'App crashes on launch', 'reply')];
let CONNS = [{ id: 'crash-fix-handoff', name: 'Crash fix handoff', host: 'api2.cursor.sh', header: 'Authorization', keySet: true, scope: ['yw-support'], kinds: ['crash'], bot: '', enabled: true, ready: true, migrated: true }];
const reqs = [], confirms = []; let CONFIRM = true;
TS[0].handoff = { status: 'approved', label: 'Approved — ready to send', timeline: [], approvedAt: NOW }; TS[0].handoffOptions = [{ id: 'crash-fix-handoff', name: 'Crash fix handoff', bot: '' }, { id: 'weather-team', name: 'Weather team', bot: 'AppleWeatherAI' }];
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); });
await pg.exposeFunction('__confirm', m => { confirms.push(m); return CONFIRM; }); await pg.addInitScript(() => { window.confirm = () => (window.__cf ?? true); });
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8143') ? r.continue() : r.abort());
const pubC = c => ({ ...c, ready: !!(c.enabled && c.keySet) });
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + u.search + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const p = u.pathname.split('/').filter(Boolean);
  if (u.pathname === '/tickets') body = TS;
  else if (p[0] === 'tickets' && p[2] === 'crash' && p[3] === 'send') body = { ok: true, handoff: { ...TS[0].handoff, status: 'handing', label: 'Handing off…', bot: bd.bot, conn: bd.connection } };
  else if (p[0] === 'tickets' && p.length === 2) body = TS.find(x => x.id === p[1]);
  else if (p[0] === 'handoff' && p[1] === 'connections') { const c = CONNS.find(x => x.id === p[2]);
    if (p.length === 2 && M === 'GET') body = { connections: CONNS.map(pubC) };
    else if (p.length === 2 && M === 'POST') { const n = { id: bd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: bd.name, host: new URL(bd.url).hostname, header: bd.header, keySet: !!bd.key, scope: bd.scope, kinds: bd.kinds, bot: bd.bot, enabled: bd.enabled }; CONNS.push(n); status = 201; body = { ok: true, connection: pubC(n) }; }
    else if (p.length === 3 && M === 'PUT') { const { key, url, ...rest } = bd; Object.assign(c, rest, key ? { keySet: true } : {}); body = { ok: true, connection: pubC(c) }; }
    else if (p.length === 3 && M === 'DELETE') { if (u.searchParams.get('confirm') !== c.id) { status = 428; body = { error: 'confirm' }; } else { CONNS = CONNS.filter(x => x !== c); body = { ok: true }; } }
    else if (p[3] === 'copy') { const n = { ...c, id: bd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: bd.name, keySet: !!(bd.carryKey || bd.key), copiedFrom: c.id, migrated: undefined }; n.enabled = n.keySet; CONNS.push(n); status = 201; body = { ok: true, connection: pubC(n) }; } }
  else if (u.pathname === '/handoff/config') body = { configured: CONNS.some(c => c.enabled && c.keySet) };
  else if (u.pathname === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (u.pathname === '/alerts/actions') body = { actions: [] };
  else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', address: 'yo•••@gmail.com', kind: 'support', canSend: true, builtin: true }, { id: 'safe-rack-support', label: 'Safe Rack Support', address: 'sr•••@gmail.com', kind: 'gmail', canSend: true, builtin: false, room: 'Safe Rack › Support' }] };
  else if (/\/inbox\/config$/.test(u.pathname)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (p[0] === 'inboxes' && p[2] === 'tickets') body = [];
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null };
  else if (u.pathname === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8143/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(2200);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 300)); return l };
const card = () => ev(() => document.querySelector('#hoCard').innerText.replace(/\s+/g, ' '));
// Settings → Connections → Grok Bot handoffs: migrated "Crash fix handoff" (Your World Apps › Support, crash)
await ev(() => ycCard('hoCard')); await wt(1500);
let c = await card(); assert.match(c, /Grok Bot handoffs 1 connection · 1 on/); assert.match(c, /Crash fix handoff on · api2\.cursor\.sh/); assert.match(c, /Support · Crash reports · Authorization: Bearer ••••/); out.push('card: ' + c.slice(0, 220));
const ov = await ev(() => { const d = document.querySelector('#hoCard'); return d.scrollWidth - d.clientWidth }); assert.ok(ov <= 1, 'no overflow ' + ov);
// Copy without the key → POST copy {carryKey:false}; the copy opens for editing (scope → Safe Rack) and stays off until a key is added
await ev(() => document.querySelector('[data-ho="copy"][data-hoid="crash-fix-handoff"]').click()); await wt(300);
await ev(() => { document.querySelector('#hoCpName').value = 'Safe Rack handoff'; document.querySelector('[data-ho="copygo"]').click() }); await wt(800);
assert.ok(reqs.some(x => x.startsWith('POST /handoff/connections/crash-fix-handoff/copy') && /"carryKey":false/.test(x) && !/"key"/.test(x)));
assert.match(await card(), /Copied to “Safe Rack handoff” — off until you add a sender key/);
await ev(() => { document.querySelector('#hoForm [data-hosc="yw-support"]').checked = false; document.querySelector('#hoForm [data-hosc="safe-rack-support"]').checked = true; document.querySelector('#hoKAll').checked = true; document.querySelector('#hoTags').value = 'Bug, Billing'; document.querySelector('#hoKey').value = 'second-key-QRSTUVWXYZ12'; document.querySelector('#hoBot').value = 'HuntAI'; document.querySelector('[data-ho="save"]').click() }); await wt(800);
const put = reqs.find(x => x.startsWith('PUT /handoff/connections/safe-rack-handoff')); assert.ok(put); const pb = JSON.parse(put.slice(put.indexOf('{')));
assert.deepEqual([pb.scope, pb.kinds, pb.bot, pb.key, pb.url], [['safe-rack-support'], ['crash', 'all', 'tag:Bug', 'tag:Billing'], 'HuntAI', 'second-key-QRSTUVWXYZ12', undefined], 'blank URL keeps the stored one');
c = await card(); assert.match(c, /Saved “Safe Rack handoff” — on for Safe Rack › Support \(Crash reports, All approved tickets, #Bug, #Billing\)/); out.push('copy+edit: ' + c.match(/Saved[^.]*\)/)[0]);
// Copy carrying the key over server-side, then delete it (confirm cancelled → nothing; confirmed → DELETE ?confirm=id)
await ev(() => document.querySelector('[data-ho="copy"][data-hoid="crash-fix-handoff"]').click()); await wt(300);
await ev(() => { document.querySelector('#hoCpCarry').checked = true; document.querySelector('[data-ho="copygo"]').click() }); await wt(800);
assert.ok(reqs.some(x => /copy .*"carryKey":true/.test(x))); assert.match(await card(), /key reused on the server/); await ev(() => document.querySelector('[data-ho="cancel"]').click());
await ev(() => { window.__cf = false; document.querySelector('[data-ho="del"][data-hoid="crash-fix-handoff-copy-"]').click() }); await wt(400); assert.ok(!reqs.some(x => x.startsWith('DELETE')), 'cancelled confirm deletes nothing');
await ev(() => { window.__cf = true; document.querySelector('[data-ho="del"][data-hoid="crash-fix-handoff-copy-"]').click() }); await wt(700);
assert.ok(reqs.some(x => x === 'DELETE /handoff/connections/crash-fix-handoff-copy-?confirm=crash-fix-handoff-copy-')); assert.match(await card(), /Deleted “Crash fix handoff \(copy\)”/); assert.equal(CONNS.length, 2);
await pg.screenshot({ path: '/tmp/ho-settings' + (DESK ? '-desk' : '') + '.png', fullPage: false });
assert.ok(!(await ev(() => JSON.stringify(localStorage))).match(/second-key|sender-key|webhook\/abc/), 'no key or URL in localStorage');
await ev(() => ywSettings(false));
// Per-room visibility + quick attach
await ev(() => supGoInbox('yw-support')); await wt(1500);
let room = await ev(() => document.querySelector('.sup-room[data-supiid="yw-support"] .ho-room').innerText.replace(/\s+/g, ' ')); assert.match(room, /Grok Bot handoffs Crash fix handoff/); out.push('room yw-support: ' + room);
await ev(() => { const s = document.querySelector('[data-hoatt="yw-support"]'); s.value = 'safe-rack-handoff'; document.querySelector('[data-ho="attach"][data-hoiid="yw-support"]').click() }); await wt(800);
assert.ok(reqs.some(x => x.startsWith('PUT /handoff/connections/safe-rack-handoff') && x.includes('"scope":["safe-rack-support","yw-support"]'))); assert.match(await last(), /Attached Safe Rack handoff to Your World Apps › Support|Attached Safe Rack handoff to .*Support/);
// Ticket dialog: two handoffs match → picker; Send without choosing is refused; choosing sends with that connection
await ev(() => supOpen('S-e15fcf7a')); await wt(900);
const opts = await ev(() => [...document.querySelectorAll('#crConn option')].map(o => o.textContent)); assert.deepEqual(opts, ['Choose handoff…', 'Crash fix handoff', 'Weather team']);
await ev(() => document.querySelector('#supModal [data-crs]').click()); await wt(500); assert.match(await ev(() => document.querySelector('#supModal .crash-box').innerText), /Several handoffs cover this ticket — choose one/); assert.ok(!reqs.some(x => x.includes('/crash/send')));
await pg.selectOption('#crConn', 'weather-team'); await wt(400); assert.equal(await ev(() => document.querySelector('#crBot').value), 'AppleWeatherAI', 'default bot follows the connection');
await pg.screenshot({ path: '/tmp/ho-picker' + (DESK ? '-desk' : '') + '.png' });
await ev(() => document.querySelector('#supModal [data-crs]').click()); await wt(800); assert.ok(reqs.some(x => x.startsWith('POST /tickets/S-e15fcf7a/crash/send') && x.includes('"connection":"weather-team"')));
await ev(() => { SUP.open = null; supWith('yw-support', supModal) });
// Yorri
let l = await say('list my handoffs'); assert.match(l, /2 handoffs: Crash fix handoff \(on · Your World Apps › Support · Crash reports\); Safe Rack handoff \(on · Safe Rack › Support, Your World Apps › Support/);
l = await say('which handoff does Safe Rack use'); assert.match(l, /Safe Rack › Support: Safe Rack handoff — Crash reports, All approved tickets, #Bug, #Billing/);
l = await say('disable crash fix handoff'); assert.match(l, /Crash fix handoff is off/); assert.ok(reqs.some(x => x.startsWith('PUT /handoff/connections/crash-fix-handoff') && x.includes('"enabled":false')));
l = await say('disable crash fix handoff'); assert.match(l, /already off/);
l = await say('enable crash fix handoff'); assert.match(l, /Crash fix handoff is on/);
l = await say('disable zebra handoff'); assert.match(l, /I don’t see a handoff called/);
l = await say('add a handoff for Safe Rack', 1500); assert.match(l, /Opened a new handoff for Safe Rack › Support/);
const f = await ev(() => ({ name: document.querySelector('#hoName').value, sc: [...document.querySelectorAll('#hoForm [data-hosc]')].filter(x => x.checked).map(x => x.dataset.hosc) })); assert.deepEqual(f, { name: 'Safe Rack handoff', sc: ['safe-rack-support'] });
const reg = await ev(() => YC.list.filter(c => /^handoff\./.test(c.id)).map(c => c.id + ': ' + c.ex.join(' / '))); out.push('registry: ' + reg.join(' || ')); assert.equal(reg.length, 3); assert.deepEqual(await ev(() => ycCoverage()), []);
console.log(out.join('\n')); assert.deepEqual(errs, []); console.log('handoffs' + (DESK ? ' (desktop)' : '') + ': all passed'); await b.close(); srv.close();
