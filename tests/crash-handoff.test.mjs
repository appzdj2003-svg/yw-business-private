// Headless check: crash reports (Crashlytics) → red Crash chip, urgent Needs reply, decision card (not relayed as a generic decision),
// Approve → Send to Grok Bot (WeatherAI suggested), Settings → Connections → Grok Bot handoff (key never kept in the browser),
// stage tracker (dialog + row + board tile) driven by server actions, never a Repeat / cleanup candidate, Yorri crash commands. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8134);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, NOW = Date.now();
const KEEP = { kind: 'keep', label: 'Keep — crash alerts', target: '', oneTap: false, cleanup: false, hint: 'Crash reports are always kept.' };
const CRASH = { source: 'crashlytics', kind: 'crash', platform: 'android', package: 'com.yourworld.weatheranalyzer', app: 'Your World Weather Radar', version: '0.8.97', build: '135', crashes: 4, users: 2, exception: 'java.lang.IllegalStateException - Not implemented', consoleLink: 'https://console.firebase.google.com/project/your-world-weather-radar/crashlytics/app/android:com.yourworld.weatheranalyzer/issues/6a2c5bda', issue: 's2.f.invokeSuspend', issues: 1, alert: 'Trending stability issues', suggestedBot: 'WeatherAI' };
const HUNT = { ...CRASH, package: 'com.yourworld.hunt', app: 'Your World Hunt', version: '2.0', build: '9', crashes: 1, users: 1, exception: 'java.lang.NullPointerException', alert: 'New fatal issue', suggestedBot: 'HuntAI' };
const tk = (id, from, subject, box, x = {}) => ({ id, from, fromName: '', subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: NOW - 3600e3, sla: 'ok', unread: true, status: 'open', snippet: subject, thread: [{ from, at: NOW - 3600e3, body: subject }], box, boxBy: 'rule', boxWhy: 'rule', boxConf: 0.9, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false, cleanup: false }, ...x });
const crashT = (id, c, subj, at) => tk(id, 'firebase-noreply@google.com', subj, 'reply', { priority: 'high', slaH: 4, crash: c, tags: ['Crash'], handoff: null, unsub: KEEP, receivedAt: at, boxWhy: 'crash report (Firebase Crashlytics) · urgent' });
const TS = [crashT('S-e15fcf7a', CRASH, 'Trending stability issues for 2026-10-17 - Android com.yourworld.weatheranalyzer', NOW - 1800e3), crashT('S-hunt0001', HUNT, 'New fatal issue - Android com.yourworld.hunt', NOW - 7200e3), tk('S-jane0001', 'jane@gmail.com', 'App crashes on launch', 'reply')];
let HCFG = { configured: false }, ACTS = [], CONNS = []; const reqs = [];
const H = (id, st, extra = {}) => { const t = TS.find(x => x.id === id), h = t.handoff ||= { status: st, timeline: [], bot: null }; h.status = st; h.label = { approved: 'Approved — ready to send', handing: 'Handing off…', researching: 'Researching', building: 'Building fix', internal: 'Sent to Internal', production: 'Sent to Production', fixed: 'Fixed', blocked: 'Blocked' }[st] || st; Object.assign(h, extra); h.timeline.push({ at: Date.now(), status: st, text: h.label + (extra.version ? ' (' + extra.version + ')' : '') }); return h; };
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); window.confirm = () => true; });
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8134') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const p = u.pathname.split('/').filter(Boolean);
  if (u.pathname === '/tickets') body = TS;
  else if (p[0] === 'tickets' && p[2] === 'crash' && p[3] === 'approve') { const h = H(p[1], 'approved', { approvedAt: Date.now(), approvedVia: bd.via }); body = { ok: true, handoff: h, suggestedBot: TS.find(x => x.id === p[1]).crash.suggestedBot }; }
  else if (p[0] === 'tickets' && p[2] === 'crash' && p[3] === 'send') { if (!HCFG.configured) { status = 409; body = { error: 'Grok Bot handoff isn’t set up: Settings → Connections → Grok Bot handoff' }; } else body = { ok: true, handoff: H(p[1], 'handing', { bot: bd.bot }) }; }
  else if (p[0] === 'tickets' && p.length === 2) body = TS.find(x => x.id === p[1]);
  else if (u.pathname === '/handoff/connections') { if (M === 'POST') { const c = { id: bd.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: bd.name, host: new URL(bd.url).hostname, header: bd.header, keySet: !!bd.key, scope: bd.scope, kinds: bd.kinds, bot: bd.bot, enabled: bd.enabled, ready: !!(bd.enabled && bd.key) }; CONNS.push(c); HCFG = { configured: c.ready, host: c.host, header: c.header, keySet: true }; status = 201; body = { ok: true, connection: c }; } else body = { connections: CONNS }; }
  else if (u.pathname === '/handoff/config') { if (M === 'POST') HCFG = { configured: true, host: new URL(bd.url).hostname, header: bd.header, keySet: true, at: Date.now() }; if (M === 'DELETE') HCFG = { configured: false }; body = HCFG; }
  else if (u.pathname === '/alerts/actions') body = { actions: ACTS.filter(a => a.at > +u.searchParams.get('since')) };
  else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', address: 'yo•••@gmail.com', kind: 'support', canSend: true, builtin: true }] };
  else if (u.pathname === '/inbox/config') body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null };
  else if (u.pathname === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8134/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(2000);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 300)); return l };
const R = '.sup-room[data-supiid="yw-support"]';
await ev(() => supGoInbox('yw-support')); await wt(1500);
// Row: red Crash chip, impact + needs approval; the person asking about crashes is not a crash report
const row = id => ev(([R, id]) => { const e = document.querySelector(`${R} [data-supo="${id}"]`); return e && { txt: e.innerText.replace(/\s+/g, ' '), chip: !!e.querySelector('.sup-crash-chip'), bg: e.querySelector('.sup-crash-chip') && getComputedStyle(e.querySelector('.sup-crash-chip')).backgroundColor } }, [R, id]);
let rw = await row('S-e15fcf7a'); assert.ok(rw && rw.chip, 'crash chip'); assert.equal(rw.bg, 'rgb(198, 40, 40)', 'red chip'); assert.match(rw.txt, /4 crashes · 2 users · needs approval/); assert.match(rw.txt, /high/);
assert.equal((await row('S-jane0001')).chip, false);
// Never a Repeat / cleanup candidate
assert.deepEqual(await ev(() => { const c = SUP.tickets.filter(t => t.crash)[0]; const L = [1, 2, 3, 4].map(i => Object.assign({}, c, { id: 'X' + i, box: 'auto', receivedAt: Date.now() - i * 864e5 })); return supRepeats(L) }), {});
assert.ok(!(await ev(() => { CLN.ctx = supCtxP(); return supCleanCands().map(x => x.from) })).includes('firebase-noreply@google.com'));
// Decision queue: crash approvals queued, not relayed as generic decisions (the server already made C<n> + push)
const q = await ev(() => queue.filter(a => a.crash).map(a => a.title)); out.push('queue: ' + JSON.stringify(q));
assert.ok(q.includes('Approve crash fix: Your World Weather Radar 0.8.97 (135) · S-e15fcf7a')); assert.ok(!reqs.some(x => x.startsWith('POST /alerts/decision')), 'not relayed');
// Dialog: parsed fields + Approve
await ev(([R]) => document.querySelector(`${R} [data-supo="S-e15fcf7a"]`).click(), [R]); await wt(800);
const dlg = () => ev(() => { const m = document.querySelector('#supModal .crash-box'); return m && { t: m.innerText.replace(/\s+/g, ' '), cra: !!m.querySelector('[data-cra]'), crs: m.querySelector('[data-crs]')?.textContent, stages: [...m.querySelectorAll('.cr-stages span')].map(s => s.className.trim() + ':' + s.textContent) } });
let D = await dlg(); assert.ok(D, 'crash section in dialog'); for (const s of ['Your World Weather Radar', 'com.yourworld.weatheranalyzer', 'Android', '0.8.97 (135)', 'java.lang.IllegalStateException - Not implemented', 's2.f.invokeSuspend', '4 crashes · 2 users', 'Open in Crashlytics']) assert.ok(D.t.includes(s), s);
assert.ok(D.cra); assert.equal(await ev(() => document.querySelector('#supModal .crash-box a').getAttribute('rel')), 'noopener');
await pg.screenshot({ path: '/tmp/cr_dialog' + (DESK ? '_d' : '') + '.png' });
await ev(() => document.querySelector('#supModal [data-cra]').click()); await wt(800);
assert.ok(reqs.some(x => x.startsWith('POST /tickets/S-e15fcf7a/crash/approve')), 'approve hit the server'); D = await dlg(); assert.equal(D.crs, 'Send to WeatherAI'); assert.match(D.t, /Approved\. Send it to WeatherAI/);
assert.ok(!(await ev(() => queue.some(a => a.crash && a.crash.id === 'S-e15fcf7a'))), 'decision card cleared');
// Not set up yet → clear error, nothing sent
await ev(() => { HO.st = { configured: false }; supModal(); document.querySelector('#supModal [data-crs]').click() }); await wt(800); D = await dlg(); assert.match(D.t, /Not handed off: .*Grok Bot handoff/); assert.match(D.t, /No Grok Bot handoff covers this inbox/);
await ev(() => document.querySelector('#supModal [data-supx]').click()); await wt(300);
// Settings → Connections → Grok Bot handoff: save URL + key; key never kept in the browser
l0: { let l = await say('open Grok Bot handoff settings', 900); assert.match(l, /Opened Grok Bot handoff/); }
await wt(600); assert.match(await ev(() => document.querySelector('#hoCard summary').innerText), /Grok Bot handoffs\s*not set up/);
await ev(() => document.querySelector('[data-ho="new"]').click()); await wt(300);
await ev(() => { document.querySelector('#hoName').value = 'Crash fix handoff'; document.querySelector('#hoUrl').value = 'https://api2.cursor.sh/automations/webhook/abc123'; document.querySelector('#hoKey').value = 'sender-key-ABCDEFGHIJKLMNOP'; document.querySelector('[data-ho="save"]').click() }); await wt(800);
assert.ok(reqs.some(x => x.startsWith('POST /handoff/connections') && x.includes('"key":"sender-key-ABCDEFGHIJKLMNOP"') && x.includes('"header":"Authorization"') && x.includes('"scope":["yw-support"]') && x.includes('"kinds":["crash"]')));
let card = await ev(() => document.querySelector('#hoCard').innerText); assert.match(card, /1 connection · 1 on/); assert.match(card, /Crash fix handoff[\s\S]*api2\.cursor\.sh/); assert.match(card, /Authorization: Bearer ••••/); assert.doesNotMatch(card, /sender-key|abc123/);
assert.ok(!(await ev(() => JSON.stringify(localStorage))).includes('sender-key-ABCDEFGHIJKLMNOP'), 'key not in localStorage'); assert.ok(!(await ev(() => JSON.stringify(localStorage))).includes('abc123'), 'URL not in localStorage');
await pg.screenshot({ path: '/tmp/cr_conn' + (DESK ? '_d' : '') + '.png' }); await ev(() => ywSettings(false));
// Send → Handing off…
let l = await say('send it to WeatherAI', 1300); assert.match(l, /Handing off .*Your World Weather Radar 0\.8\.97 \(135\) to WeatherAI/);
assert.ok(reqs.some(x => x.startsWith('POST /tickets/S-e15fcf7a/crash/send') && x.includes('"bot":"WeatherAI"'))); assert.match((await row('S-e15fcf7a')).txt, /Handing off…/);
// Stage updates arrive as server actions (from the routine's status route) → tracker in dialog, row, board tile
const act = async (st, extra = {}) => { const h = H('S-e15fcf7a', st, { bot: 'WeatherAI', ...extra }); ACTS.push({ at: Date.now() + ACTS.length, kind: 'handoff', tid: 'S-e15fcf7a', iid: 'yw-support', status: st, label: h.label, version: extra.version, summary: extra.summary || '', bot: 'WeatherAI', title: 'Your World Weather Radar 0.8.97 (135)' }); await ev(() => alertsActions()); await wt(900); return last(); };
l = await act('researching'); assert.match(l, /Crash fix · Your World Weather Radar 0\.8\.97 \(135\): Researching/);
l = await act('building'); l = await act('internal', { version: '0.8.98' }); assert.match(l, /Sent to Internal \(0\.8\.98\)/);
rw = await row('S-e15fcf7a'); assert.match(rw.txt, /Sent to Internal/); assert.equal(await ev(([R]) => document.querySelectorAll(`${R} [data-supo="S-e15fcf7a"] .cr-mini i.on`).length, [R]), 3);
const tile = await ev(() => { const d = document.createElement('div'); d.innerHTML = supWith(INB_PRIMARY, supTileHTML); return d.innerText.replace(/\s+/g, ' ') }); assert.match(tile, /Crash Your World Weather Radar 0\.8\.97 \(135\) · Sent to Internal/);
await ev(([R]) => document.querySelector(`${R} [data-supo="S-e15fcf7a"]`).click(), [R]); await wt(800); D = await dlg();
assert.deepEqual(D.stages, ['on:1. Researching', 'on:2. Building fix', 'on cur:3. Sent to Internal', ':4. Sent to Production', ':5. Fixed']); assert.match(D.t, /Handoff timeline/);
await pg.screenshot({ path: '/tmp/cr_stages' + (DESK ? '_d' : '') + '.png' }); await ev(() => document.querySelector('#supModal [data-supx]').click()); await wt(200);
l = await say('what’s the status of the crash fix'); assert.match(l, /Your World Weather Radar 0\.8\.97 \(135\): Sent to Internal \(stage 3 of 5\) · 0\.8\.98 · WeatherAI/);
l = await act('blocked', { summary: 'Need Play Console access' }); assert.match(l, /Blocked — Need Play Console access/); l = await say('crash fix status'); assert.match(l, /Blocked — Need Play Console access/);
assert.match((await row('S-e15fcf7a')).txt, /Blocked/);
l = await act('production', { version: '0.8.98 (136)' }); l = await act('fixed', { summary: 'Implemented the missing branch' }); assert.match(l, /Fixed — Implemented the missing branch\. Ticket marked Done and logged to Vault/);
assert.ok((await ev(() => auditList().map(a => a.decision))).some(x => /^FIXED by WeatherAI/.test(x)), 'logged to Vault');
l = await say('status of the crash fix'); assert.match(l, /Fixed \(stage 5 of 5\)/);
// Push approval of the Hunt crash (server action) → offer Send to HuntAI; Yorri crash commands
l = await say('any crashes?'); assert.match(l, /Your World Hunt 2\.0 \(9\) — java\.lang\.NullPointerException \(1 crash · 1 user\) — Needs approval/);
H('S-hunt0001', 'approved', { approvedAt: Date.now(), approvedVia: 'push' }); ACTS.push({ at: Date.now() + 99, kind: 'crash', id: 'C2', tid: 'S-hunt0001', iid: 'yw-support', ok: true, via: 'push', title: 'Crash: Your World Hunt 2.0 (9)' }); await ev(() => alertsActions()); await wt(1200);
l = await last(); assert.match(l, /approved from your push\. Send it to HuntAI\?/); assert.ok(await ev(() => !![...document.querySelectorAll('#log p.y')].pop().querySelector('[data-crs="S-hunt0001"]')), 'Send button offered in chat');
assert.ok(!(await ev(() => queue.some(a => a.crash && a.crash.id === 'S-hunt0001'))));
await ev(() => [...document.querySelectorAll('#log p.y')].pop().querySelector('[data-crs]').click()); await wt(1000); assert.ok(reqs.some(x => x.startsWith('POST /tickets/S-hunt0001/crash/send') && x.includes('"bot":"HuntAI"')));
l = await say('approve the crash'); assert.match(l, /No crash report is waiting for approval/);
// Decision queue approve path (voice "approve" → decide) on a fresh crash
TS.push(crashT('S-new00001', { ...CRASH, version: '0.8.99', build: '140' }, 'New fatal issue - Android com.yourworld.weatheranalyzer', NOW)); await ev(() => supWith(INB_PRIMARY, supRefresh)); await wt(800);
const qi = await ev(() => queue.findIndex(a => a.crash && a.crash.id === 'S-new00001')); assert.ok(qi >= 0); await ev(i => decide(i, true), qi); await wt(1000);
l = await last(); assert.match(l, /Approved the crash fix for Your World Weather Radar 0\.8\.99 \(140\)\. Send it to WeatherAI\?/); assert.ok(reqs.some(x => x.startsWith('POST /tickets/S-new00001/crash/approve')));
l = await say('send the crash to Grok Bot', 1300); assert.match(l, /Handing off Your World Weather Radar 0\.8\.99 \(140\) to WeatherAI/);
assert.ok(!reqs.some(x => x.startsWith('POST /alerts/decision') && x.includes('crash')), 'crash approvals never relayed as generic decisions');
assert.deepEqual(await ev(() => ycCoverage()), []);
const ids = await ev(() => YC.list.filter(c => /^crash\./.test(c.id)).map(c => c.id)); assert.deepEqual(ids.sort(), ['crash.approve', 'crash.list', 'crash.release', 'crash.relpol', 'crash.send', 'crash.setup', 'crash.status']);
console.log(out.join('\n')); console.log('errors:', errs); assert.deepEqual(errs, []); console.log('crash handoff: all passed'); await b.close(); srv.close();
