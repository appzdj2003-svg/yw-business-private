// Headless check: voice/text approve/decline never guesses. Unknown or ambiguous targets change nothing; remote (SMS/push) actions only apply by exact key.
// Run: node tests/decisions.test.mjs (needs playwright-core + chromium headless shell).
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8129);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test'; let actions = [];
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { window.confirm = () => true; localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0') });
await pg.route(SV + '/**', r => { const u = new URL(r.request().url()); const body = u.pathname === '/alerts/actions' ? { actions } : u.pathname === '/alerts/settings' ? { smsLive: false, pushLive: false, settings: null } : {}; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }) });
await pg.goto('http://127.0.0.1:8129/'); await pg.waitForTimeout(2500);
const ev = (f, a) => pg.evaluate(f, a);
const reset = () => ev(() => { queue = [{ t: ['t1', 'T1'], title: 'Approve 3 PTO requests', why: '' }, { t: ['t2', 'T2'], title: 'Send renewal reminder to Acme legal', why: '' }, { t: ['t1', 'T1'], title: 'Continue onboarding J. Ruiz', why: '' }, { t: ['t3', 'T3'], title: 'Run Friday payroll', why: '' }]; Object.keys(decided).forEach(k => delete decided[k]); draw() });
const run = async t => { await ev(t => ask(t), t); await pg.waitForTimeout(600); return ev(() => ({ q: queue.map(a => a.title), last: [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' ') })) };
const N = 4; const out = [];
for (const [t, expectN, re] of [
  ['approve T9', N, /I don’t see T9 — pending are T1 ?Approve 3 PTO requests · T2 ?Send renewal reminder.*Nothing was approved/],
  ['Yorri approve T9', N, /I don’t see T9/], ['decline T9', N, /I don’t see T9.*Nothing was declined/], ['yes T7', N, /I don’t see T7/], ['T9 approved', N, /I don’t see T9/],
  ['approve T1', N, /More than one item matches T1.*Nothing was changed/], ['approve the zebra contract', N, /I don’t see “zebra contract”/],
  ['approve T2', N - 1, /Done: Send renewal reminder/], ['decline onboarding', N - 1, /Declined: Continue onboarding/], ['approve payroll', N - 1, /Done: Run Friday payroll/],
  ['Yorri approve', N - 1, /Done: Approve 3 PTO requests/], ['yorri decline', N - 1, /Declined: Approve 3 PTO requests/]]) {
  await reset(); const r = await run(t); out.push(t + ' → ' + r.q.length + ' | ' + r.last.slice(0, 140)); assert.equal(r.q.length, expectN, t); assert.match(r.last, re, t);
}
await ev(() => { queue = [] }); const e = await run('approve T2'); assert.match(e.last, /I don’t see T2 — nothing is pending. Nothing was approved/); out.push('empty → ' + e.last);
// Remote SMS/push actions apply by exact key only
await reset(); await ev(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); localStorage.removeItem('ywAlertActSince') }, SV);
actions = [{ at: Date.now(), kind: 'dec', id: 'D9', key: 'T9|nothing like this', title: 'ghost', ok: true, via: 'sms' }];
await ev(() => alertsActions()); await pg.waitForTimeout(400); assert.equal(await ev(() => queue.length), N, 'unknown remote key must not act'); out.push('remote unknown key → queue ' + await ev(() => queue.length));
actions = [{ at: Date.now() + 1, kind: 'dec', id: 'D2', key: await ev(() => qKey(queue[1])), title: 'x', ok: false, via: 'push' }];
await ev(() => alertsActions()); await pg.waitForTimeout(400); assert.deepEqual(await ev(() => queue.map(a => a.t[1])), ['T1', 'T1', 'T3'], 'exact key declines that item only'); out.push('remote exact key → declined T2 only');
console.log(out.join('\n')); assert.deepEqual(errs, []); console.log('decisions: all passed');
await b.close(); srv.close();
