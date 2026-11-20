// Headless: mail-send approvals are sent by the deck, never handed off.
// No 'Hand off to' on mail cards, no POST /decisions, stale email decisions hidden from Handed off, and the 'Sending…' line is replaced in place by the real result (sent or failed). All network mocked.
// (based on: Yorri-drafted outgoing mail saved on the server (Support drafts, by:'yorri', Bcc + note + label) shows as approval cards in Awaiting decision.
// Nothing is sent by showing/reloading; Vault logs DRAFTED once; decline deletes the draft (nothing sent); approve sends via /mail/compose with the card's Bcc then deletes the draft; Edit opens the editor with Bcc. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8157);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', CAR = !!process.env.CAR;
const B1 = Array.from({ length: 14 }, (_, i) => `p1t${i}@example.com`), B2 = Array.from({ length: 14 }, (_, i) => `p2t${i}@example.com`);
const SUBJ = "You're invited to test Your World Travel", BODY = 'Hi,\n\nYou\'re invited to try it.\n\nAaron Burgan';
let DRAFTS = [{ id: 'D-part2', to: 'support@yourworldapps.si', cc: '', bcc: B2.join(', '), subject: SUBJ, body: BODY, by: 'yorri', label: 'Part 2 of 2', note: 'Two sbcglobal.net addresses can only join if tied to a Google account.', updatedAt: 2, createdAt: 2 },
  { id: 'D-part1', to: 'support@yourworldapps.si', cc: '', bcc: B1.join(', '), subject: SUBJ, body: BODY, by: 'yorri', label: 'Part 1 of 2', note: 'Two sbcglobal.net addresses can only join if tied to a Google account.', updatedAt: 1, createdAt: 1 },
  { id: 'D-mine', to: 'x@example.com', cc: '', bcc: '', subject: 'My own draft', body: 'b', updatedAt: 0, createdAt: 0 }];
const reqs = [], sent = []; let FAIL = false;
const DECS = [{ id: 'dec_c7e49a2a52d6', key: 'k1', title: "Send email (Part 2 of 2) to support@yourworldapps.si: You're invited to test Your World Travel", bot: 'TravelAI', state: 'approved', status: 'failed', label: 'Not sent', error: 'No handoff connection — add one in Settings → Handoffs', handledByDeck: true, email: true },
  { id: 'dec_070cb85e855a', key: 'k2', title: "Send email (Part 1 of 2) to support@yourworldapps.si: You're invited to test Your World Travel", bot: 'TravelAI', state: 'approved', status: 'failed', label: 'Not sent', error: 'No handoff connection — add one in Settings → Handoffs', handledByDeck: true, email: true },
  { id: 'dec_real', key: 'k3', title: 'Ship the Travel build', bot: 'TravelAI', state: 'approved', status: 'sent', label: 'Sent', email: false }];
const ctx = await b.newContext(CAR ? { viewport: { width: 1180, height: 820 } } : { viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8157') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), P = u.pathname, bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + P);
  let body = {}, status = 200, m;
  if (P === '/tickets/drafts' && M === 'GET') body = { drafts: DRAFTS };
  else if ((m = /^\/tickets\/drafts\/([^/]+)$/.exec(P)) && M === 'DELETE') { DRAFTS = DRAFTS.filter(d => d.id !== m[1]); body = { ok: true }; }
  else if (P === '/decisions' && M === 'GET') body = { decisions: DECS, connection: null };
  else if (P === '/handoff/routes' && M === 'GET') body = { routes: null, decisionsOn: true, connection: { conn: null } };
  else if (P === '/mail/compose' && M === 'POST' && FAIL) { status = 502; body = { error: 'Resend said no' }; }
  else if (P === '/mail/compose' && M === 'POST') { sent.push(bd); body = { ok: true, messageId: '<m1@x>', to: [].concat(bd.to).join(', '), cc: bd.cc, bcc: bd.bcc, via: 'resend' }; }
  else if (/\/send$|\/reply$|\/forward$/.test(P) && M === 'POST') { sent.push({ path: P }); body = { ok: true }; }
  else if (P === '/mail/messages' || P === '/mail/list') body = { messages: [] };
  else if (/\/tickets/.test(P)) body = []; else if (P === '/alerts/actions') body = { actions: [] }; else if (P === '/maint/mail') body = [];
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8157/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(4500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
await ev(() => dhLoad(true)); await wt(600);
const ho = await ev(() => (document.querySelector('#dhList') || {}).innerText || '');
assert.doesNotMatch(ho, /Send email|Your World Travel|Not sent/, 'stale email rows gone from Handed off'); assert.match(ho, /Ship the Travel build/, 'real handoffs still listed');
const qh = await ev(() => { const i = queue.findIndex(q => q.mail && q.mail.draftId === 'D-part1'); return { i, ok: dhOk(queue[i]), html: document.querySelector('#queue').innerHTML }; });
assert.ok(qh.i >= 0); assert.equal(qh.ok, false, 'mail card is not a handoff'); assert.doesNotMatch(qh.html, /data-qbot="0"/);
// approve Part 1 → sent; the Sending… line becomes the result in place
await ev(() => decide(queue.findIndex(q => q.mail && q.mail.draftId === 'D-part1'), 1)); await wt(1500);
assert.equal(sent.length, 1); assert.equal(sent[0].bcc.length, 14);
assert.ok(!reqs.some(x => /^POST \/decisions/.test(x)), 'no handoff register/decide for mail cards: ' + reqs.filter(x => /decisions/.test(x)).join(','));
let log = await ev(() => document.querySelector('#log').innerText);
assert.doesNotMatch(log, /Sending…|result follows/); assert.match(log, /Email sent ✓ — Send email \(Part 1 of 2\)[^\n]*Sent via Resend · <m1@x>[^\n]*Bcc p1t0@example\.com/);
assert.equal((log.match(/Part 1 of 2/g) || []).length, 1, 'one line for the send, not two');
assert.ok(await ev(() => auditList().some(a => /^SENT via Resend/.test(a.decision))));
assert.ok(!(await ev(() => auditList().some(a => /HANDOFF/.test(a.decision)))), 'no handoff noise in Vault');
// a failed send replaces the line with the failure
FAIL = true; await ev(() => decide(queue.findIndex(q => q.mail && q.mail.draftId === 'D-part2'), 1)); await wt(1500);
log = await ev(() => document.querySelector('#log').innerText);
assert.doesNotMatch(log, /Sending…/); assert.match(log, /Send failed — Send email \(Part 2 of 2\)[^\n]*Nothing was sent\./);
if (process.env.SHOT) { await ev(() => document.querySelector('#log').scrollIntoView({ block: 'center' })); await pg.screenshot({ path: process.env.SHOT }); }
assert.deepEqual(errs, []); console.log('MAIL SENT UX OK' + (CAR ? ' (car)' : ' (desk)')); await b.close(); srv.close();
