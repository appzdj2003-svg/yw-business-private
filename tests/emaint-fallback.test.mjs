// Headless: eMaint emails (Worker / IMAP via the Support server's /maint/mail) show in Safe Rack › Maintenance even though the room's own eMaint (API) connector is not live.
// Board tile line, default eMaint emails tab, one Yorri note per new work request (no decision card / no decision alert), Yorri commands. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8151);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', CAR = !!process.env.CAR, NOW = Date.now();
const MAIL = [{ id: 'M-0dda7c8f2b', from: 'noreply@emaint.com', fromName: 'eMaint', subject: 'BREAKDOWN Request has been submitted. 12830', date: NOW - 20 * 60e3, unread: true, snippet: 'TEST', via: 'worker', work: true, info: { parsed: true, kind: 'request', requestNo: '12830', desc: 'TEST', needsApproval: true } }];
const ctx = await b.newContext(CAR ? { viewport: { width: 1180, height: 820 } } : { viewport: { width: 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, CAR);
const reqs = [];
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8151') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(); reqs.push(M + ' ' + u.pathname);
  let body = {}, status = 200;
  if (u.pathname === '/maint/mail') body = MAIL; else if (u.pathname.startsWith('/maint/')) { status = 503; body = { error: 'maintenance not configured' }; }
  else if (u.pathname === '/tickets' || /\/tickets$/.test(u.pathname)) body = []; else if (u.pathname === '/alerts/actions') body = { actions: [] };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (u.pathname === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }, { id: 'safe-rack-maint', label: 'eMaint inbox', kind: 'emaint', canSend: false, builtin: true }] };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8151/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; a[MT_KEY()] = { type: 'emaint', url: '', token: '', live: false }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await pg.waitForTimeout(3500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const logT = () => ev(() => [...document.querySelectorAll('#log p.y')].map(p => p.innerText.replace(/\s+/g, ' ')));
let L = await logT(); assert.equal(L.filter(x => /New eMaint work request #12830/.test(x)).length, 1, 'Yorri notes the new WR once'); assert.match(L.join('\n'), /Safe Rack › Maintenance → eMaint emails/);
assert.ok(!reqs.some(r => /^POST \/(alerts\/decision|decisions)/.test(r)), 'no decision card / decision alert for eMaint mail'); assert.equal(await ev(() => queue.filter(q => q.mtmail).length), 0);
// Safe Rack board tile
await ev(() => { const f = roomFind(r => r.type === 'maint'); bizStore.activeId = f.b.id; saveBiz(); setPageView('apps'); roomView = 'Business Board'; draw(); }); await wt(900);
let t = await ev(() => document.querySelector('#board').innerText.replace(/\s+/g, ' ')); assert.match(t, /eMaint emails: 1, 1 unread · 1 work request\/order\. Latest: BREAKDOWN Request has been submitted\. 12830/);
if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + '-board.png' });
await ev(() => document.querySelector('#board [data-mmgo]').click()); await wt(900);
t = await ev(() => document.querySelector('#board').innerText.replace(/\s+/g, ' ')); assert.match(t, /eMaint emails · 1/); assert.match(t, /BREAKDOWN Request has been submitted\. 12830/); assert.match(t, /Req #12830/); assert.match(t, /needs approval/); assert.match(t, /MAINTENANCE · SAFE RACK Live/); assert.doesNotMatch(t, /NOT CONFIGURED|NOT CONNECTED|SAMPLE/);
if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + '-room.png' });
// default tab is eMaint emails when there is no eMaint API data
await ev(() => { MT.tab = undefined; draw(); }); await wt(300); assert.equal(await ev(() => mtTab()), 'mail');
// reload: not noted again
await pg.reload(); await wt(3500); L = await logT(); assert.equal(L.filter(x => /New eMaint work request #12830/.test(x)).length, 0, 'not repeated after reload');
// Yorri commands
await ev(() => ask('any new work requests')); await wt(1500); L = await logT(); assert.match(L.pop(), /1 new in the last 24 hours/);
await ev(() => ask('read the last work request')); await wt(1500); L = await logT(); assert.match(L.pop(), /12830/);
const ov = await ev(() => document.documentElement.scrollWidth - innerWidth); assert.ok(ov <= 1, 'overflow ' + ov);
assert.deepEqual(errs, []); console.log('EMAINT FALLBACK OK' + (CAR ? ' (car)' : ' (desk)')); await b.close(); srv.close();
