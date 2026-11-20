// Headless: eMaint emails list shows every email; detail view has ‹ Prev / “n of N” / Next › and a clear ← All emails (N);
// the tab opens to the list (no auto-opened email) unless a push/Yorri link names one (?mmail=); Yorri “next email” / “previous email”; car targets 44–48px. Network mocked; nothing deleted or sent.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8158);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', CAR = !!process.env.CAR, NOW = Date.now();
const mk = (id, subj, mins, info = {}) => ({ id, from: 'noreply@emaint.com', fromName: 'eMaint CMMS', subject: subj, date: NOW - mins * 60e3, unread: true, snippet: 'x', body: 'Body of ' + subj, via: 'worker', work: !!info.kind, info: { parsed: true, ...info } });
let MAIL = [mk('M-35', 'Electrical Request has been submitted. 12835', 10, { kind: 'request', requestNo: '12835', needsApproval: true, desc: 'Breaker trips' }), mk('M-34', 'BREAKDOWN Request has been submitted. 12834', 35, { kind: 'request', requestNo: '12834', needsApproval: true, desc: 'Hydraulic leak' }), mk('M-33', 'BREAKDOWN Request has been submitted. 12833', 50, { kind: 'request', requestNo: '12833', needsApproval: true, desc: 'A axis is not referencing' })];
let TRASH = []; const reqs = [];
const tickets = () => MAIL.map(m => ({ id: 'S-' + m.id.slice(2), from: m.from, fromName: m.fromName, subject: m.subject, priority: 'medium', slaH: 48, receivedAt: m.date, sla: 'ok', unread: true, status: 'open', snippet: 'x', thread: [{ from: m.from, at: m.date, body: m.body, out: false }], box: 'reply', boxBy: 'rule', boxWhy: 'eMaint', boxConf: 1, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false }, info: m.info, mailIds: [m.id] }));
const ctx = await b.newContext(CAR ? { viewport: { width: 1180, height: 820 } } : { viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
let dialogs = [], accept = true; pg.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywMtMailSeen', '["M-35","M-34","M-33"]'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8158') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), P = u.pathname; reqs.push(M + ' ' + P);
  let body = {}, status = 200, m;
  if (P === '/maint/mail' && M === 'GET') body = MAIL.map(({ body, ...x }) => x);
  else if (P === '/maint/mail/deleted') body = { deleted: TRASH.map(t => ({ id: t.id, subject: t.subject, at: t.at, via: 'worker' })) };
  else if ((m = /^\/maint\/mail\/([^/]+)$/.exec(P)) && M === 'DELETE') { const x = MAIL.find(y => y.id === m[1]); if (!x) { status = 404; body = { error: 'not found' }; } else { MAIL = MAIL.filter(y => y !== x); TRASH.unshift({ ...x, at: Date.now() }); body = { ok: true, id: x.id, subject: x.subject, via: 'worker', restoreDays: 30 }; } }
  else if ((m = /^\/maint\/mail\/([^/]+)\/restore$/.exec(P)) && M === 'POST') { const x = TRASH.find(y => y.id === m[1]); if (!x) { status = 404; body = { error: 'not in Deleted' }; } else { TRASH = TRASH.filter(y => y !== x); const { at, ...it } = x; MAIL.push(it); MAIL.sort((a, c) => c.date - a.date); body = { ok: true, id: x.id, subject: x.subject }; } }
  else if ((m = /^\/maint\/mail\/([^/]+)$/.exec(P))) body = MAIL.find(y => y.id === m[1]) || {};
  else if (P.startsWith('/maint/')) { status = 503; body = { error: 'maintenance not configured' }; }
  else if (P === '/inboxes/safe-rack-maint/tickets') body = tickets(); else if ((m = /^\/inboxes\/safe-rack-maint\/tickets\/([^/]+)$/.exec(P))) body = tickets().find(t => t.id === m[1]) || {}; else if (P === '/inboxes/safe-rack-maint/config') body = { kind: 'emaint', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: false, inbox: 'safe-rack-maint' };
  else if (/\/tickets/.test(P)) body = []; else if (P === '/alerts/actions') body = { actions: [] };
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }, { id: 'safe-rack-maint', label: 'eMaint inbox', kind: 'emaint', canSend: false, builtin: true }] };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8158/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; a[MT_KEY()] = { type: 'emaint', url: '', token: '', live: false }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(3500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), OUT = process.env.SHOTDIR;
const lastY = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const go = () => ev(() => { const f = roomFind(r => r.type === 'maint'); bizStore.activeId = f.b.id; saveBiz(); setPageView('apps'); roomView = f.r.label; draw(); });
const st = () => ev(() => ({ open: mmS(MT_KEY()).open, rows: document.querySelectorAll('#board .mm-row').length, nav: (document.querySelector('#board .mm-nav') || {}).innerText || '', tab: mtTab() }));
const ask = t => ev(t => ask(t), t);
// Yorri reads the latest email first (used to silently open it) → the tab still opens to the list
await ask('read the latest emaint email'); await wt(1200); assert.match(await lastY(), /12835/);
await go(); await wt(1200); let S = await st();
assert.equal(S.tab, 'mail'); assert.equal(S.open, null, 'no auto-opened email'); assert.equal(S.rows, 3, 'list shows all 3');
const tabT = await ev(() => document.querySelector('[data-mmtab="mail"]').innerText); assert.match(tabT, /eMaint emails · 3/);
const list = await ev(() => [...document.querySelectorAll('#board .mm-row')].map(r => r.innerText)); ['12835', '12834', '12833'].forEach((n, i) => assert.match(list[i], new RegExp(n)));
if (OUT) await pg.screenshot({ path: OUT + '-list.png' });
// open the middle one → 2 of 3, Prev/Next, ← All emails (3)
await ev(() => document.querySelector('#board [data-mmo="M-34"]').click()); await wt(600); S = await st();
assert.equal(S.open, 'M-34'); assert.match(S.nav, /← All emails \(3\)/); assert.match(S.nav, /‹ Prev/); assert.match(S.nav, /2 of 3/); assert.match(S.nav, /Next ›/);
if (OUT) await pg.screenshot({ path: OUT + '-detail.png' });
await ev(() => document.querySelector('#board [data-mmnav="1"]').click()); await wt(500); S = await st(); assert.equal(S.open, 'M-33'); assert.match(S.nav, /3 of 3/);
assert.equal(await ev(() => document.querySelector('#board [data-mmnav="1"]').disabled), true, 'Next disabled on the last');
await ev(() => document.querySelector('#board [data-mmnav="-1"]').click()); await wt(400); await ev(() => document.querySelector('#board [data-mmnav="-1"]').click()); await wt(400);
S = await st(); assert.equal(S.open, 'M-35'); assert.match(S.nav, /1 of 3/); assert.equal(await ev(() => document.querySelector('#board [data-mmnav="-1"]').disabled), true);
await ev(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))); await wt(400); assert.equal((await st()).open, 'M-34', '→ key = next');
// car targets
const sizes = await ev(() => [...document.querySelectorAll('#board .mm-nav .btn, #board .mm-acts .btn')].map(b => { const r = b.getBoundingClientRect(); return [b.innerText, Math.round(r.height), Math.round(r.width)]; }));
if (CAR) for (const [t, h, w] of sizes) { assert.ok(h >= 44 && h <= 52, t + ' height ' + h); assert.ok(w >= 44, t + ' width ' + w); }
// ← All emails → list
await ev(() => document.querySelector('#board .mm-all').click()); await wt(400); S = await st(); assert.equal(S.open, null); assert.equal(S.rows, 3);
if (CAR) { const rh = await ev(() => [...document.querySelectorAll('#board .mm-row')].map(r => r.getBoundingClientRect().height)); assert.ok(rh.every(h => h >= 44), 'car rows ≥44: ' + rh); }
// leave and come back → list, not the email that was open
await ev(() => document.querySelector('#board [data-mmo="M-33"]').click()); await wt(500); assert.equal((await st()).open, 'M-33');
await ev(() => { setPageView('command'); draw(); }); await wt(300); await go(); await wt(500); assert.equal((await st()).open, null, 'back in the room = list');
await ev(() => document.querySelector('#board [data-mmo="M-33"]').click()); await wt(400); await ev(() => document.querySelector('[data-mmtab="wo"]').click()); await wt(200); await ev(() => document.querySelector('[data-mmtab="mail"]').click()); await wt(400);
assert.equal((await st()).open, null, 'tab click = list');
// push / Yorri link (?mmail=) opens that one email
await ev(() => { setPageView('command'); draw(); }); await ev(() => mmGo('M-34')); await wt(800); S = await st(); assert.equal(S.open, 'M-34'); assert.match(S.nav, /2 of 3/);
await pg.goto('http://127.0.0.1:8158/?room=Maintenance&biz=safe-rack&mmail=M-33'); await wt(3500); S = await st(); assert.equal(S.open, 'M-33', 'push link opens that email'); assert.match(S.nav, /3 of 3/);
// Yorri next / previous (from anywhere)
await ev(() => { setPageView('command'); draw(); }); await wt(300);
await ask('previous email'); await wt(700); assert.equal((await st()).open, 'M-34'); assert.match(await lastY(), /Email 2 of 3: BREAKDOWN Request has been submitted\. 12834/);
await ask('next email'); await wt(600); assert.equal((await st()).open, 'M-33'); assert.match(await lastY(), /Email 3 of 3/);
await ask('next email'); await wt(600); assert.equal((await st()).open, 'M-33'); assert.match(await lastY(), /last one \(3 of 3\)/);
await ask('Yorri previous emaint email'); await wt(600); assert.equal((await st()).open, 'M-34');
await ev(() => document.querySelector('#board .mm-all').click()); await wt(300); await ask('next email'); await wt(600); assert.equal((await st()).open, 'M-35', 'from the list: next = newest'); assert.match(await lastY(), /Email 1 of 3/);
await ask('previous email'); await wt(500); assert.match(await lastY(), /newest one \(1 of 3\)/);
assert.ok(!reqs.some(x => /^(DELETE|POST)/.test(x)), 'nothing deleted or sent: ' + reqs.filter(x => /^(DELETE|POST)/.test(x)));
assert.deepEqual(errs, []); console.log('EMAINT NAV OK' + (CAR ? ' (car)' : ' (desk)')); await b.close(); srv.close();
