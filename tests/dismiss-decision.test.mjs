// Headless check: Awaiting-your-decision has a Dismiss button (separate from Decline), confirm + Vault log,
// dismissed SAMPLE stays gone on reload, car-layout buttons are 44px. Run: node tests/dismiss-decision.test.mjs
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8144);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const reqs = [];
const run = async car => {
  const ctx = await b.newContext({ viewport: { width: car ? 1280 : 1440, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(car => { sessionStorage.setItem('init', '1'); localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '1'); if (car) localStorage.setItem('ywCarLayout', '1'); window.confirm = () => true; }, car);
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://127.0.0.1:8144')) return r.continue(); reqs.push(r.request().method() + ' ' + u); return r.abort(); });
  await pg.goto('http://127.0.0.1:8144/'); await pg.waitForTimeout(2200);
  await pg.evaluate(() => setPageView('command')); await pg.waitForTimeout(400);
  return { pg, errs, ctx, ev: (f, a) => pg.evaluate(f, a) };
};
for (const car of [false, true]) {
  const P = await run(car);
  const q0 = await P.ev(() => ({ titles: queue.map(a => a.title), hasDismiss: !!document.querySelector('#queue [data-d]'), hasDecline: !!document.querySelector('#queue [data-x]'), hasApprove: !!document.querySelector('#queue [data-i]') }));
  assert.deepEqual(q0.titles, ['Run Friday payroll · $71,880', 'Send Acme NDA renewal notice']);
  assert.ok(q0.hasDismiss && q0.hasDecline && q0.hasApprove, 'Approve, Decline and Dismiss all present');
  if (car) {
    assert.ok(await P.ev(() => document.body.classList.contains('car-layout')));
    const h = await P.ev(() => Math.min(...[...document.querySelectorAll('#queue .btn')].map(b => b.getBoundingClientRect().height)));
    assert.ok(h >= 44, 'car decision buttons are at least 44px, got ' + h);
  }
  await P.pg.click('#queue button[data-d="0"]'); await P.pg.waitForTimeout(500);
  const after = await P.ev(() => ({ titles: queue.map(a => a.title), vault: JSON.parse(localStorage.getItem('ywVaultAudit') || '[]')[0], flags: JSON.parse(localStorage.getItem('ywDismissedSample') || '[]') }));
  assert.deepEqual(after.titles, ['Send Acme NDA renewal notice']);
  assert.match(after.vault.decision, /SAMPLE · DISMISSED/); assert.equal(after.vault.sample, true); assert.match(after.vault.title, /payroll/);
  await P.pg.reload(); await P.pg.waitForTimeout(2200); await P.ev(() => setPageView('command')); await P.pg.waitForTimeout(800);
  const again = await P.ev(() => queue.map(a => a.title));
  assert.deepEqual(again, ['Send Acme NDA renewal notice'], 'dismissed SAMPLE stays gone on reload');
  assert.ok(!reqs.some(x => /alerts\/decision/.test(x)), 'dismiss is not relayed as a decision');
  assert.deepEqual(P.errs, []);
  await P.ctx.close();
}
console.log('dismiss-decision: all passed'); await b.close(); srv.close();
