// Headless check: release approvals — decision card, row + dialog Approve Production buttons under the tracker, voice/push/auto actions, Release approvals settings + Yorri policy commands. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8141);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, NOW = Date.now();
const KEEP = { kind: 'keep', label: 'Keep — crash alerts', target: '', oneTap: false, cleanup: false, hint: 'Crash reports are always kept.' };
const CRASH = { source: 'crashlytics', kind: 'crash', platform: 'android', package: 'com.yourworld.weatheranalyzer', app: 'Your World Weather Radar', version: '0.8.97', build: '135', crashes: 4, users: 2, exception: 'java.lang.IllegalStateException - Not implemented', consoleLink: 'https://console.firebase.google.com/project/your-world-weather-radar/crashlytics/app/android:com.yourworld.weatheranalyzer/issues/6a2c5bda', issue: 's2.f.invokeSuspend', issues: 1, alert: 'Trending stability issues', suggestedBot: 'WeatherAI' };
const HUNT = { ...CRASH, package: 'com.yourworld.hunt', app: 'Your World Hunt', version: '2.0', build: '9', crashes: 1, users: 1, exception: 'java.lang.NullPointerException', alert: 'New fatal issue', suggestedBot: 'HuntAI' };
const tk = (id, from, subject, box, x = {}) => ({ id, from, fromName: '', subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: NOW - 3600e3, sla: 'ok', unread: true, status: 'open', snippet: subject, thread: [{ from, at: NOW - 3600e3, body: subject }], box, boxBy: 'rule', boxWhy: 'rule', boxConf: 0.9, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false, cleanup: false }, ...x });
const crashT = (id, c, subj, at) => tk(id, 'firebase-noreply@google.com', subj, 'reply', { priority: 'high', slaH: 4, crash: c, tags: ['Crash'], handoff: null, unsub: KEEP, receivedAt: at, boxWhy: 'crash report (Firebase Crashlytics) · urgent' });
const TS = [crashT('S-e15fcf7a', CRASH, 'Trending stability issues for 2026-10-17 - Android com.yourworld.weatheranalyzer', NOW - 1800e3), crashT('S-hunt0001', HUNT, 'New fatal issue - Android com.yourworld.hunt', NOW - 7200e3), tk('S-jane0001', 'jane@gmail.com', 'App crashes on launch', 'reply')];
let HCFG = { configured: true, host: 'api2.cursor.sh', header: 'Authorization', keySet: true }, ACTS = []; const reqs = [], RELS = [], POL = { internal: 'ask', production: 'ask' };
const H = (id, st, extra = {}) => { const t = TS.find(x => x.id === id), h = t.handoff ||= { status: st, timeline: [], bot: null }; h.status = st; h.label = { approved: 'Approved — ready to send', handing: 'Handing off…', researching: 'Researching', building: 'Building fix', internal: 'Sent to Internal', production: 'Sent to Production', fixed: 'Fixed', blocked: 'Blocked' }[st] || st; Object.assign(h, extra); h.timeline.push({ at: Date.now(), status: st, text: h.label + (extra.version ? ' (' + extra.version + ')' : '') }); return h; };
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); window.confirm = () => true; });
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8141') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const p = u.pathname.split('/').filter(Boolean);
  if (u.pathname === '/tickets') body = TS;
  else if (p[0] === 'tickets' && p[2] === 'crash' && p[3] === 'approve') { const h = H(p[1], 'approved', { approvedAt: Date.now(), approvedVia: bd.via }); body = { ok: true, handoff: h, suggestedBot: TS.find(x => x.id === p[1]).crash.suggestedBot }; }
  else if (p[0] === 'tickets' && p[2] === 'crash' && p[3] === 'send') { if (!HCFG.configured) { status = 409; body = { error: 'Grok Bot handoff isn’t set up: Settings → Connections → Grok Bot handoff' }; } else body = { ok: true, handoff: H(p[1], 'handing', { bot: bd.bot }) }; }
  else if (p[0] === 'tickets' && p.length === 2) body = TS.find(x => x.id === p[1]);
  else if (u.pathname === '/handoff/config') { if (M === 'POST') HCFG = { configured: true, host: new URL(bd.url).hostname, header: bd.header, keySet: true, at: Date.now() }; if (M === 'DELETE') HCFG = { configured: false }; body = HCFG; }
  else if (p[0] === 'tickets' && p[2] === 'crash' && p[3] === 'release') { const t = TS.find(x => x.id === p[1]), ap = t.handoff && t.handoff.approval; if (!ap || ap.status !== 'pending') { status = 404; body = { error: 'no approval is waiting on this ticket' }; } else if (bd.id && bd.id !== ap.id) { status = 409; body = { error: 'that decision is no longer current' }; } else { ap.status = bd.decision === 'approve' ? 'approved' : 'declined'; ap.via = bd.via; ap.relayed = true; RELS.push(p[1] + ':' + bd.decision + ':' + bd.via); body = { ok: true, msg: (bd.decision === 'approve' ? 'Approved: ' : 'Declined: ') + 'Promote Weather Radar ' + ap.version + ' to Production. Relayed to ' + t.handoff.bot + '.', handoff: t.handoff }; } }
  else if (u.pathname === '/handoff/approvals') { if (M === 'PUT') Object.assign(POL, bd); body = POL; }
  else if (u.pathname === '/alerts/actions') body = { actions: ACTS.filter(a => a.at > +u.searchParams.get('since')) };
  else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', address: 'yo•••@gmail.com', kind: 'support', canSend: true, builtin: true }] };
  else if (u.pathname === '/inbox/config') body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null };
  else if (u.pathname === '/maint/mail') body = [];
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
const AP = v => ({ type: 'production', version: v, status: 'pending', id: 'R1', at: Date.now(), note: 'Null-check in RadarRepo; holding the Production swap for your OK', testsPassed: null, relayed: null });
H('S-e15fcf7a', 'internal', { bot: 'WeatherAI', version: '0.8.99 (137)', approvedAt: NOW, approval: AP('0.8.99 (137)') }); H('S-hunt0001', 'building', { bot: 'HuntAI', approvedAt: NOW });
await pg.goto('http://127.0.0.1:8141/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(2000);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 300)); return l };
const R = '.sup-room[data-supiid="yw-support"]';
await ev(() => supGoInbox('yw-support')); await wt(1500);
// Decision queue card: Promote Weather Radar 0.8.99 (137) to Production (T2, Support), not relayed as a generic decision
await ev(() => setPageView('command')); await wt(800);
let q = await ev(() => queue.filter(a => a.release).map(a => ({ title: a.title, why: a.why, rid: a.release.rid })));
assert.equal(q.length, 1); assert.equal(q[0].title, 'Promote Weather Radar 0.8.99 (137) to Production'); assert.match(q[0].why, /IllegalStateException.*4 crashes · 2 users.*Fix: Null-check.*WeatherAI is holding/); assert.equal(q[0].rid, 'R1');
assert.ok(!reqs.some(x => x.startsWith('POST /alerts/decision')), 'release card is not relayed as a generic decision'); out.push('queue card: ' + q[0].title);
const qtxt = await ev(() => document.querySelector('#queue').innerText); assert.match(qtxt, /Promote Weather Radar 0\.8\.99 \(137\) to Production/);
// Row chip: Awaiting your OK + Approve Production / Decline buttons; dialog: tracker chip + buttons right under it
await ev(() => { setPageView('apps'); supGoInbox('yw-support') }); await wt(1200);
const row = await ev(R => { const r = document.querySelector(R + ' [data-supo="S-e15fcf7a"]'); return r && { t: r.innerText.replace(/\s+/g, ' '), b: [...r.querySelectorAll('[data-rel]')].map(x => x.innerText) } }, R);
assert.match(row.t, /Awaiting your OK for Production/); assert.deepEqual(row.b, ['Approve Production', 'Decline']); out.push('row: ' + row.t.slice(0, 160));
await ev(() => supOpen('S-e15fcf7a')); await wt(900);
const dlg = await ev(() => { const m = document.querySelector('#supModal .crash-box'); const st = [...m.querySelectorAll('.cr-stages span')].map(x => x.innerText); const tr = m.querySelector('.cr-stages'), nx = tr.nextElementSibling; return { st, under: [...nx.querySelectorAll('[data-rel]')].map(x => x.innerText), cur: m.querySelector('.cr-stages [aria-current]').innerText, txt: m.innerText.replace(/\s+/g, ' ') } });
assert.deepEqual(dlg.st, ['1. Researching', '2. Building fix', '3. Sent to Internal', '⏳ Awaiting your OK for Production', '4. Sent to Production', '5. Fixed']); assert.equal(dlg.cur, '⏳ Awaiting your OK for Production');
assert.deepEqual(dlg.under, ['Approve Production', 'Decline'], 'buttons right under the tracker'); assert.match(dlg.txt, /Fix: Null-check in RadarRepo/); out.push('dialog tracker: ' + dlg.st.join(' | '));
const ov = await ev(() => { const m = document.querySelector('#supModal .crash-box'); return m.scrollWidth - m.clientWidth }); assert.ok(ov <= 1, 'no horizontal overflow ' + ov);
await pg.screenshot({ path: '/tmp/rel-dialog' + (DESK ? '-desk' : '') + '.png' });
// Tap Approve Production in the dialog → POST /crash/release {decision:approve, via:site, id:R1}; Vault entry; queue card gone
await pg.locator('#supModal [data-rel="approve"]').first().click(); await wt(900);
assert.ok(reqs.some(x => x.startsWith('POST /tickets/S-e15fcf7a/crash/release') && /"decision":"approve"/.test(x) && /"via":"site"/.test(x) && /"id":"R1"/.test(x)), 'release POST carries the decision id');
assert.deepEqual(RELS, ['S-e15fcf7a:approve:site']); assert.equal(await ev(() => queue.filter(a => a.release).length), 0);
const vault = await ev(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]')[0]); assert.match(vault.decision, /^APPROVED Production · relayed to WeatherAI/); assert.equal(vault.title, 'Promote Weather Radar 0.8.99 (137) to Production');
const dlg2 = await ev(() => [...document.querySelectorAll('#supModal .cr-stages span')].map(x => x.innerText)); assert.ok(dlg2.includes('✓ You OK’d Production'), dlg2.join('|')); out.push('after approve: ' + dlg2.join(' | '));
await ev(() => { SUP.open = null; supWith('yw-support', supModal) });
// Voice: approve the release → targets only the pending release; none pending → says so
TS[0].handoff.approval = { ...AP('0.9.0 (138)'), id: 'R2' }; await ev(() => supWith('yw-support', supRefresh)); await wt(900);
let l = await say('approve the release', 1500); assert.match(l, /Approved: Promote Weather Radar 0\.9\.0 \(138\) to Production/); assert.deepEqual(RELS.at(-1), 'S-e15fcf7a:approve:voice');
l = await say('approve production', 1200); assert.match(l, /No Production release is waiting for your OK/);
TS[0].handoff.approval = { ...AP('0.9.1 (139)'), id: 'R3' }; await ev(() => supWith('yw-support', supRefresh)); await wt(900);
l = await say('decline production', 1500); assert.match(l, /Declined: Promote/); assert.equal(RELS.at(-1), 'S-e15fcf7a:decline:voice');
// Internal approval: chip sits before stage 3
TS[1].handoff.approval = { type: 'internal', version: '2.0.1 (10)', status: 'pending', id: 'R4', at: Date.now(), note: '' }; await ev(() => supWith('yw-support', supRefresh)); await wt(900);
const ist = await ev(() => crTracker(SUP.tickets.find(t => t.id === 'S-hunt0001').handoff).replace(/<[^>]+>/g, '|').split('|').filter(Boolean)); assert.deepEqual(ist.slice(0, 4), ['1. Researching', '2. Building fix', '⏳ Awaiting your OK for Internal', '3. Sent to Internal']);
// Push/SMS approval action arrives from the server → Vault + message; auto-approved action → logged as AUTO-APPROVED
ACTS.push({ at: Date.now(), kind: 'release', id: 'R4', tid: 'S-hunt0001', iid: 'yw-support', title: 'Promote Hunt 2.0.1 (10) to Internal', version: '2.0.1 (10)', ok: true, via: 'push' }, { at: Date.now() + 1, kind: 'release', id: 'auto', tid: 'S-e15fcf7a', iid: 'yw-support', title: 'Promote Weather Radar 0.9.2 (140) to Internal', ok: true, via: 'auto', why: 'tests passed', relayed: true });
await ev(() => alertsActions()); await wt(1000);
const V = await ev(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]').slice(0, 2).map(e => e.decision + ' · ' + e.title)); assert.match(V[0], /^AUTO-APPROVED \(tests passed\) · relayed to bot · Promote Weather Radar 0\.9\.2/); assert.match(V[1], /^APPROVED via push · 2\.0\.1 \(10\) · Promote Hunt/);
out.push('remote actions → Vault: ' + V.join(' / '));
// Settings → Connections → Grok Bot handoff → Release approvals (both default Ask me every time)
await ev(() => ycCard('hoCard')); await wt(1500);
const sel = await ev(() => [...document.querySelectorAll('[data-relpol]')].map(s => s.dataset.relpol + '=' + s.value + ':' + s.options[s.selectedIndex].text)); assert.deepEqual(sel, ['internal=ask:Ask me every time', 'production=ask:Ask me every time']);
await pg.selectOption('#relPol_internal', 'tests'); await wt(700); assert.equal(POL.internal, 'tests'); assert.match(await ev(() => document.querySelector('#hoCard').innerText), /Saved — Sent to Internal: auto-approve if tests pass; Sent to Production: ask me every time/);
await pg.screenshot({ path: '/tmp/rel-settings' + (DESK ? '-desk' : '') + '.png' });
// Yorri policy commands
l = await say('what are my release approval settings'); assert.match(l, /Sent to Internal: auto-approve if tests pass; Sent to Production: ask me every time/);
l = await say('auto-approve internal'); assert.match(l, /Saved.*Sent to Internal: auto-approve;/); assert.equal(POL.internal, 'auto');
l = await say('auto-approve production if tests pass'); assert.equal(POL.production, 'tests');
l = await say('require approval for production'); assert.match(l, /Sent to Production: ask me every time/); assert.equal(POL.production, 'ask');
const cov = await ev(() => ycCoverage()); assert.deepEqual(cov, []); const help = await ev(() => YC.list.filter(c => /^crash\.rel/.test(c.id)).map(c => c.ex.join(' / '))); out.push('registry: ' + help.join(' || '));
console.log(out.join('\n')); assert.deepEqual(errs, []); console.log('release-approvals' + (DESK ? ' (desktop)' : '') + ': all passed'); await b.close(); srv.close();
