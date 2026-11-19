// Headless: 🗑 Delete on eMaint emails (Safe Rack › Maintenance → eMaint emails list + detail, bulk, Deleted view + Restore, Undo toast, Vault),
// eMaint inbox list + detail delete, Yorri "delete this work request email" / "delete the last eMaint email" (confirm first), car targets ≥44px. All network mocked; nothing sent.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8152);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', CAR = !!process.env.CAR, NOW = Date.now();
const mk = (id, subj, mins, info = {}) => ({ id, from: 'noreply@emaint.com', fromName: 'eMaint CMMS', subject: subj, date: NOW - mins * 60e3, unread: true, snippet: 'x', body: 'Body of ' + subj, via: 'worker', work: !!info.kind, info: { parsed: true, ...info } });
let MAIL = [mk('M-a1', 'DUMMY Request has been submitted. 99001', 5, { kind: 'request', requestNo: '99001', needsApproval: true }), mk('M-b2', 'Work Order 5012 assigned', 30, { kind: 'workorder', workOrderNo: '5012' }), mk('M-c3', 'PM due: monthly lube', 60, { kind: 'pm' }), mk('M-d4', 'Weekly digest', 90)];
let TRASH = []; const reqs = [];
const tickets = () => MAIL.map(m => ({ id: 'S-' + m.id.slice(2), from: m.from, fromName: m.fromName, subject: m.subject, priority: 'medium', slaH: 48, receivedAt: m.date, sla: 'ok', unread: true, status: 'open', snippet: 'x', thread: [{ from: m.from, at: m.date, body: m.body, out: false }], box: 'reply', boxBy: 'rule', boxWhy: 'eMaint', boxConf: 1, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false }, info: m.info, mailIds: [m.id] }));
const ctx = await b.newContext(CAR ? { viewport: { width: 1180, height: 820 } } : { viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
let dialogs = [], accept = true; pg.on('dialog', d => { dialogs.push(d.message()); accept ? d.accept() : d.dismiss(); });
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywMtMailSeen', '["M-a1","M-b2","M-c3","M-d4"]'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8152') ? r.continue() : r.abort());
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
await pg.goto('http://127.0.0.1:8152/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; a[MT_KEY()] = { type: 'emaint', url: '', token: '', live: false }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(3500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const boardT = () => ev(() => document.querySelector('#board').innerText.replace(/\s+/g, ' '));
const lastY = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const vault = () => ev(() => auditList().map(a => a.decision));
await ev(() => { const f = roomFind(r => r.type === 'maint'); bizStore.activeId = f.b.id; saveBiz(); setPageView('apps'); roomView = f.r.label; MT.tab = 'mail'; draw(); }); await wt(1200);
// row delete: cancel keeps it, accept deletes; row click not opened
assert.equal(await ev(() => document.querySelectorAll('#board [data-mmdel]').length), 4);
accept = false; await ev(() => document.querySelector('#board [data-mmdel="M-d4"]').click()); await wt(400);
assert.match(dialogs.pop(), /Delete “Weekly digest”\?[\s\S]*Undo[\s\S]*30 days[\s\S]*Nothing changes in Gmail or eMaint/); assert.ok(!reqs.some(x => x.startsWith('DELETE')), 'cancel = nothing');
accept = true; await ev(() => document.querySelector('#board [data-mmdel="M-d4"]').click()); await wt(800);
assert.ok(reqs.includes('DELETE /maint/mail/M-d4')); assert.equal(await ev(() => mmS(MT_KEY()).open), null, 'row did not open');
let t = await boardT(); assert.doesNotMatch(t, /Weekly digest/); assert.ok((await vault()).includes('DELETED eMaint email: Weekly digest'));
assert.match(await ev(() => document.querySelector('#ywToast').innerText), /Deleted “Weekly digest”[\s\S]*Undo/);
if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT });
// Undo
await ev(() => document.querySelector('#toastUndo').click()); await wt(1000); assert.ok(reqs.includes('POST /maint/mail/M-d4/restore')); assert.match(await boardT(), /Weekly digest/); assert.ok((await vault()).includes('RESTORED eMaint email: Weekly digest'));
// detail view delete
await ev(() => document.querySelector('#board [data-mmo="M-c3"]').click()); await wt(700); assert.match(await boardT(), /Body of PM due/);
await ev(() => document.querySelector('#board .mm-acts [data-mmdel="M-c3"]').click()); await wt(800); t = await boardT(); assert.doesNotMatch(t, /PM due/); assert.equal(await ev(() => mmS(MT_KEY()).open), null, 'back to list');
// bulk
await ev(() => { for (const id of ['M-b2', 'M-d4']) document.querySelector(`#board [data-mmsel="${id}"]`).click(); }); await wt(400);
assert.match(await boardT(), /2 selected/); await ev(() => document.querySelector('#board [data-mmbulk]').click()); await wt(1000);
assert.match(dialogs.pop(), /Delete 2 eMaint emails\?/); t = await boardT(); assert.doesNotMatch(t, /Work Order 5012|Weekly digest|selected/); assert.equal(MAIL.length, 1);
// Deleted view + Restore
await ev(() => document.querySelector('#board [data-mmview]').click()); await wt(800); t = await boardT(); assert.match(t, /Deleted emails are kept 30 days/); assert.match(t, /PM due: monthly lube/); assert.match(t, /30 days left/);
await ev(() => document.querySelector('#board [data-mmres="M-c3"]').click()); await wt(1000); assert.ok(reqs.includes('POST /maint/mail/M-c3/restore')); assert.doesNotMatch(await boardT(), /PM due/);
await ev(() => document.querySelector('#board [data-mmview]').click()); await wt(500); assert.match(await boardT(), /PM due: monthly lube/);
// car targets
if (CAR) { const sz = await ev(() => [...document.querySelectorAll('#board .mm-del,#board .mm-tog,#board .mm-sel')].map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); })); assert.ok(sz.length && sz.every(x => x >= 44), 'car targets ' + sz); }
// Yorri: confirm first
const n0 = reqs.filter(x => x.startsWith('DELETE')).length;
await ev(() => ask('delete the last eMaint email')); await wt(1200); assert.match(await lastY(), /Delete “DUMMY Request has been submitted\. 99001” \(#99001\)\? Say yes/);
await ev(() => ask('no')); await wt(600); assert.match(await lastY(), /Kept it/); assert.equal(reqs.filter(x => x.startsWith('DELETE')).length, n0);
await ev(() => { mmS(MT_KEY()).open = 'M-c3'; draw(); }); await wt(400);
await ev(() => ask('delete this work request email')); await wt(1200); assert.match(await lastY(), /Delete “PM due: monthly lube”\?/);
await ev(() => ask('yes')); await wt(1200); assert.ok(reqs.includes('DELETE /maint/mail/M-c3')); assert.match(await lastY(), /Deleted “PM due: monthly lube”\. Logged to Vault/);
await ev(() => document.querySelector('#toastUndo').click()); await wt(1000);
// eMaint inbox list + detail
await ev(() => { const S = supState('safe-rack-maint'); return supWith('safe-rack-maint', supRefresh); }); await wt(800);
await ev(() => { const d = document.createElement('div'); d.id = 'tbox'; d.setAttribute('data-supiid', 'safe-rack-maint'); d.innerHTML = supWith('safe-rack-maint', () => supRender()); document.body.appendChild(d); });
assert.ok(await ev(() => document.querySelectorAll('#tbox [data-mmdelt]').length >= 2), 'inbox rows have delete');
const c0 = reqs.filter(x => x === 'DELETE /maint/mail/M-c3').length; await ev(() => document.querySelector('#tbox [data-mmdelt="S-c3"]').click()); await wt(1000); assert.equal(reqs.filter(x => x === 'DELETE /maint/mail/M-c3').length, c0 + 1);
assert.equal(await ev(() => supState('safe-rack-maint').tickets.some(t => t.id === 'S-c3')), false, 'inbox refreshed');
await ev(() => supWith('safe-rack-maint', () => supOpen('S-a1'))); await wt(800);
assert.ok(await ev(() => !!document.querySelector('#supModal [data-mmdelt="S-a1"]')), 'detail delete'); accept = false; await ev(() => document.querySelector('#supModal [data-mmdelt="S-a1"]').click()); await wt(500); assert.ok(!reqs.includes('DELETE /maint/mail/M-a1'));
assert.ok(!reqs.some(x => /reply|send|compose/.test(x)), 'nothing sent');
const ov = await ev(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, 'overflow ' + ov);
assert.deepEqual(errs, []); console.log('EMAINT DELETE OK' + (CAR ? ' (car)' : ' (desk)')); await b.close(); srv.close();
