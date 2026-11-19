// Headless E2E (real server app, in-memory stores): eMaint by email. Connections → eMaint card says the API isn't available and shows
// Gmail/Worker health (throttled IMAP here); Alerts → "eMaint work requests" on/off + work-order filter save to the server;
// Yorri "any new work requests" / "read the last work request". CAR=1 = car layout. Screenshots under SHOTDIR or /workspace/emaint-email/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
import { createApp } from '../../yw-business-server/app.js'; import { memoryBackend } from '../../yw-business-server/store.js';
import { supportMailService } from '../../yw-business-server/supportmail.js';
import { maintInboundStore, combinedMaintBox, maintMailRoutes } from '../../yw-business-server/maintmail.js';
import { durableAlerts } from '../../yw-business-server/sms.js';
const T = 'd'.repeat(32), ING = 'i'.repeat(32), NOW = Date.now();
const be = memoryBackend(), inbound = maintInboundStore({ backend: be, secret: () => T });
const box = combinedMaintBox({ imap: { list: async () => { throw new Error('[THROTTLED] Too many simultaneous connections'); } }, inbound });
const maintMail = maintMailRoutes(box, { ttlMs: 0 });
const alerts = durableAlerts(memoryBackend(), () => T); await alerts.put({ phone: '', all: true, quiet: { on: false, start: '22:00', end: '07:00' }, cats: { wr: { on: true, push: true, pri: 'any', enabled: true, wo: true } } });
const sm = supportMailService({ backend: be, secret: () => T, ingestToken: ING, resendKey: '', canSend: () => false, log: { log() {}, error() {} } });
const api = createApp({ mail: { listMessages: async () => [], markSeen: async () => {} }, token: T, supportMail: sm, maintMail, maintInbound: inbound, maintBox: box, alerts, self: 'me@x' }).listen(0);
const API = 'http://127.0.0.1:' + api.address().port;
const eml = (from, to, subj, body, mid, date) => Buffer.from(`From: ${from}\r\nTo: ${to}\r\nSubject: ${subj}\r\nDate: ${new Date(date).toUTCString()}\r\nMessage-ID: ${mid}\r\nContent-Type: text/plain\r\n\r\n${body}\r\n`);
const post = b => fetch(API + '/mail/inbound', { method: 'POST', headers: { authorization: 'Bearer ' + ING }, body: b }).then(r => r.json());
assert.equal((await post(eml('eMaint X4 <noreply@emaint.com>', 'maint@yourworldapps.si', 'Work Order 5012 assigned to J. Ortiz', 'Work Order #5012\nAsset ID: RACK-A3\nPriority: 2\nDescription: Replace guard bolt', '<wo@x>', NOW - 5 * 3600e3))).routed, 'emaint');
assert.equal((await post(eml('eMaint X4 <notifications@emaint.com>', 'maint@yourworldapps.si', 'New Work Request #5021 submitted', 'Work Request #: 5021\nAsset ID: RACK-A14\nLocation: Building 2 · Bay 7\nPriority: 1 - Emergency\nRequested By: J. Ortiz <jortiz@saferack.com>\nStatus: Pending Approval\nDescription: Hydraulic leak under the lift table', '<wr@x>', NOW - 3600e3))).routed, 'emaint');

const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8199);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/emaint-email', tag = CAR ? 'car' : 'desk', SV = 'https://sv.test';
fs.mkdirSync(SHOT, { recursive: true });
const ctx = await b.newContext({ viewport: { width: CAR ? 1200 : 1440, height: 1000 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); localStorage.setItem('ywA11y', JSON.stringify({ theme: 'dark' })); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8199') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => {
  const q = r.request(), u = new URL(q.url()); const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors, body: '' });
  const res = await fetch(API + u.pathname + u.search, { method: q.method(), headers: { 'content-type': 'application/json', authorization: q.headers()['authorization'] || '', origin: 'https://business.yourworldapps.si' }, body: ['GET', 'HEAD'].includes(q.method()) ? undefined : q.postData() });
  return r.fulfill({ status: res.status, headers: { ...cors, 'content-type': res.headers.get('content-type') || 'application/json' }, body: Buffer.from(await res.arrayBuffer()) });
});
await pg.goto('http://127.0.0.1:8199/'); await pg.waitForTimeout(800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
await ev(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'd'.repeat(32), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await wt(3000);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop()?.innerText.replace(/\s+/g, ' ') || '');
const yorri = async t => { await ev(t => ask(t), t); await wt(1200); return last(); };
// Connections → eMaint
await ev(() => cxFocus('ops')); await wt(2600);
const card = await ev(() => document.querySelector('#emCard').innerText.replace(/\s+/g, ' '));
assert.match(card, /API: not available from eMaint — using email notifications/); assert.match(card, /Gmail inbox: throttled by Gmail/); assert.match(card, /Cloudflare Worker path: ready on the server · 2 received · alias maint@yourworldapps\.si/);
assert.match(card, /Seen: 2 eMaint emails · 2 work requests \/ orders/);
assert.equal(await ev(() => document.querySelectorAll('#emCard input[type=password]').length), 0, 'no credential fields');
await pg.screenshot({ path: `${SHOT}/${tag}-emaint-card.png` });
// Alerts → eMaint work requests switch + work-order filter → server
await ev(() => setTab('alerts')); await wt(1200); await ev(() => { const o = smsGet(); o.all = true; smsSave(o); smsRender(); }); await wt(1000);
assert.match(await ev(() => document.querySelector('#smsBox').innerText), /eMaint work requests[\s\S]*every new eMaint work request or work order email/);
await pg.click('#smWrOn'); await wt(1200); assert.equal((await alerts.get()).cats.wr.enabled, false, 'switch off saved on server');
await pg.click('#smWrOn'); await wt(1200); assert.equal((await alerts.get()).cats.wr.enabled, true, 'switch on saved');
await ev(() => { const n = document.querySelector('#smWrWo'); n.checked = !n.checked; n.dispatchEvent(new Event('change', { bubbles: true })); }); await wt(1200); assert.equal((await alerts.get()).cats.wr.wo, false, 'work-order filter saved');
await ev(() => { const n = document.querySelector('#smWrWo'); n.checked = !n.checked; n.dispatchEvent(new Event('change', { bubbles: true })); }); await wt(1200);
await ev(() => { const n = document.querySelector('#smWrOn'); n.closest('.sm-row').scrollIntoView({ block: 'center' }); const d = document.querySelector('#smWrWo').closest('details'); if (d) d.open = true; }); await wt(300);
await pg.screenshot({ path: `${SHOT}/${tag}-alerts-emaint.png` });
await ev(() => ywSettings(false)); await wt(300);
// Yorri
assert.match(await yorri('any new work requests'), /2 new in the last 24 hours: WR #5021 · RACK-A14 · Building 2 · Bay 7 · P1 · from J\. Ortiz: Hydraulic leak under the lift table WO #5012 · RACK-A3 · P2: Replace guard bolt Approve or assign them in eMaint\./);
assert.match(await yorri('read the last work request'), /Latest, .* ET: WR #5021 · RACK-A14 · Building 2 · Bay 7 · P1 · from J\. Ortiz: Hydraulic leak under the lift table\. Status: Pending Approval\. It needs approval — approve it in eMaint\./);
assert.doesNotMatch(await last(), /@/);
assert.deepEqual(errs, []);
console.log('emaint-email: all passed'); await b.close(); srv.close(); api.close();
