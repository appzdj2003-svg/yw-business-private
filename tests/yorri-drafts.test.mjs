// Headless: Yorri-drafted outgoing mail saved on the server (Support drafts, by:'yorri', Bcc + note + label) shows as approval cards in Awaiting decision.
// Nothing is sent by showing/reloading; Vault logs DRAFTED once; decline deletes the draft (nothing sent); approve sends via /mail/compose with the card's Bcc then deletes the draft; Edit opens the editor with Bcc. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8153);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', CAR = !!process.env.CAR;
const B1 = Array.from({ length: 14 }, (_, i) => `p1t${i}@example.com`), B2 = Array.from({ length: 14 }, (_, i) => `p2t${i}@example.com`);
const SUBJ = "You're invited to test Your World Travel", BODY = 'Hi,\n\nYou\'re invited to try it.\n\nAaron Burgan';
let DRAFTS = [{ id: 'D-part2', to: 'support@yourworldapps.si', cc: '', bcc: B2.join(', '), subject: SUBJ, body: BODY, by: 'yorri', label: 'Part 2 of 2', note: 'Two sbcglobal.net addresses can only join if tied to a Google account.', updatedAt: 2, createdAt: 2 },
  { id: 'D-part1', to: 'support@yourworldapps.si', cc: '', bcc: B1.join(', '), subject: SUBJ, body: BODY, by: 'yorri', label: 'Part 1 of 2', note: 'Two sbcglobal.net addresses can only join if tied to a Google account.', updatedAt: 1, createdAt: 1 },
  { id: 'D-mine', to: 'x@example.com', cc: '', bcc: '', subject: 'My own draft', body: 'b', updatedAt: 0, createdAt: 0 }];
const reqs = [], sent = [];
const ctx = await b.newContext(CAR ? { viewport: { width: 1180, height: 820 } } : { viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8153') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), P = u.pathname, bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + P);
  let body = {}, status = 200, m;
  if (P === '/tickets/drafts' && M === 'GET') body = { drafts: DRAFTS };
  else if ((m = /^\/tickets\/drafts\/([^/]+)$/.exec(P)) && M === 'DELETE') { DRAFTS = DRAFTS.filter(d => d.id !== m[1]); body = { ok: true }; }
  else if (P === '/mail/compose' && M === 'POST') { sent.push(bd); body = { ok: true, messageId: '<m1@x>', to: [].concat(bd.to).join(', '), cc: bd.cc, bcc: bd.bcc, via: 'resend' }; }
  else if (/\/send$|\/reply$|\/forward$/.test(P) && M === 'POST') { sent.push({ path: P }); body = { ok: true }; }
  else if (P === '/mail/messages' || P === '/mail/list') body = { messages: [] };
  else if (/\/tickets/.test(P)) body = []; else if (P === '/alerts/actions') body = { actions: [] }; else if (P === '/maint/mail') body = [];
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8153/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(4500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const cards = () => ev(() => queue.filter(q => q.mail && q.mail.draftId).map(q => ({ title: q.title, why: q.why, bcc: q.mail.bcc.length, id: q.mail.draftId })));
let C = await cards(); assert.equal(C.length, 2, 'two Yorri drafts → two cards (own draft not carded)');
assert.equal(C[0].title, "Send email (Part 1 of 2) to support@yourworldapps.si: You're invited to test Your World Travel"); assert.equal(C[1].title, "Send email (Part 2 of 2) to support@yourworldapps.si: You're invited to test Your World Travel");
assert.ok(C.every(c => c.bcc === 14)); assert.match(C[0].why, /drafted by Yorri · from support@yourworldapps\.si via Resend · To: support@yourworldapps\.si · Bcc \(14\): p1t0@example\.com/); assert.match(C[0].why, /Note: Two sbcglobal\.net addresses/);
const qt = await ev(() => document.querySelector('#queue').innerText.replace(/\s+/g, ' ')); assert.match(qt, /Part 1 of 2/); assert.match(qt, /Bcc/);
let V = await ev(() => auditList().filter(a => /^DRAFTED/.test(a.decision)).length); assert.equal(V, 2, 'Vault DRAFTED x2');
assert.equal(sent.length, 0); assert.ok(!reqs.some(x => /POST \/(mail\/(compose|reply|forward)|tickets\/drafts\/.*\/send|decisions\/decide)/.test(x)), 'nothing sent or approved');
if (process.env.SHOT) { await ev(() => document.querySelector('#queue').scrollIntoView({ block: 'start' })); await pg.screenshot({ path: process.env.SHOT }); }
// reload: no duplicate cards, no second DRAFTED
await pg.reload(); await wt(4500); assert.equal((await cards()).length, 2); assert.equal(await ev(() => auditList().filter(a => /^DRAFTED/.test(a.decision)).length), 2);
// Edit → editor with Bcc filled, card off the queue, draft not re-carded on sync
await ev(() => { const i = queue.findIndex(q => q.mail && q.mail.draftId === 'D-part2'); mailEditQueued(i); }); await wt(1500);
assert.equal(await ev(() => document.querySelector('#mailBcc').value.split(',').length), 14); assert.match(await ev(() => document.querySelector('#mailSubj').value), /Your World Travel/);
await ev(() => mdSync()); await wt(600); assert.equal((await cards()).length, 1, 'edited draft not re-carded');
await ev(() => mailPropose('compose')); await wt(600); C = await cards(); assert.equal(C.length, 2); assert.ok(C.some(c => c.id === 'D-part2' && /Part 2 of 2/.test(c.title)), 're-proposed card keeps the draft link');
// Decline Part 2 → draft deleted, nothing sent
await ev(() => decide(queue.findIndex(q => q.mail && q.mail.draftId === 'D-part2'), 0)); await wt(800);
assert.ok(reqs.includes('DELETE /tickets/drafts/D-part2')); assert.equal(sent.length, 0); assert.ok(await ev(() => auditList().some(a => /DECLINED draft/.test(a.decision))));
// Approve Part 1 → /mail/compose with the 14 Bcc, then draft deleted
await ev(() => decide(queue.findIndex(q => q.mail && q.mail.draftId === 'D-part1'), 1)); await wt(1500);
assert.equal(sent.length, 1); assert.deepEqual(sent[0].to, ['support@yourworldapps.si']); assert.equal(sent[0].bcc.length, 14); assert.equal(sent[0].subject, SUBJ); assert.ok(reqs.includes('DELETE /tickets/drafts/D-part1'));
await ev(() => mdSync()); await wt(600); assert.equal((await cards()).length, 0);
assert.deepEqual(errs, []); console.log('YORRI DRAFTS OK' + (CAR ? ' (car)' : ' (desk)')); await b.close(); srv.close();
