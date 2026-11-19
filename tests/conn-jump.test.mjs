// Headless check: every Connections jump (eMaint, Finance, KPI, Calendar, Search consoles, Marketing, Cloudflare,
// Support mail, Inboxes, Data store, Device sync) lands on ITS OWN card — opened, at the top, focused, highlighted —
// and stays there while slow /finance, /kpi, /calendar … status calls re-render the boxes above it. Ops room
// "Set up" lands on the eMaint card. eMaint stays read-only (no credential fields). CAR=1 = car layout.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8193);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/conn-jump', tag = CAR ? 'car' : 'desk', SV = 'https://sv.test';
fs.mkdirSync(SHOT, { recursive: true });
const ctx = await b.newContext({ viewport: { width: CAR ? 1200 : 1440, height: 1000 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); localStorage.setItem('ywA11y', JSON.stringify({ theme: 'dark' })); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8193') ? r.continue() : r.abort());
const slow = { '/finance/status': 500, '/kpi/status': 900, '/calendar/status': 700 };
await ctx.route(SV + '/**', async r => {
  const q = r.request(), u = new URL(q.url()), M = q.method(), P = u.pathname;
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (M === 'OPTIONS') return r.fulfill({ status: 204, headers: cors, body: '' });
  if (slow[P]) await new Promise(res => setTimeout(res, slow[P]));
  let body = {};
  if (P === '/healthz') body = { ok: true };
  else if (P === '/maint/status' || P.startsWith('/maint')) body = { status: 'Live', readOnly: true, items: [] };
  return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
});
await pg.goto('http://127.0.0.1:8193/'); await pg.waitForTimeout(800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
await ev(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload(); await wt(1200);
const at = sel => ev(sel => { const n = document.querySelector(sel), P = document.querySelector('#setPage'); if (!n) return null; const r = n.getBoundingClientRect(), H = document.querySelector('#setPage .set-stick'), pr = { top: H ? H.getBoundingClientRect().bottom : 0, bottom: innerHeight };
  const sc = P && P.scrollHeight - P.clientHeight - P.scrollTop < 4; return { end: sc, top: Math.round(r.top - pr.top), vis: r.top < pr.bottom - 40 && r.bottom > pr.top, open: n.tagName !== 'DETAILS' || n.open, hl: n.classList.contains('cx-hl'), foc: n.contains(document.activeElement) }; }, sel);
const CARDS = [['ops', '#emCard', 'eMaint'], ['fin', '#finCard', 'Finance'], ['kpi', '#kpiCard', 'GA4'], ['cal', '#calCard', 'Calendars'], ['sc', '#scCard', 'Search consoles'], ['mk', '#mkCard', 'Marketing'], ['infra', '#infCard', 'Cloudflare'], ['inbox', '#inboxCard', 'Support & Gmail'], ['sync', '#dsCard', 'Device sync'], ['store', '#shCard', 'Data store']];
for (const [k, sel, label] of (process.env.QUICK ? CARDS.slice(0,1) : CARDS)) {
  await ev(() => { ywSettings(true); setTab('general'); }); await wt(200);
  // Fresh visit each time: slow status calls re-render the boxes above the target after the jump.
  await ev(() => { try { FINL.st = null; } catch (e) {} });
  await ev(() => setTab('connections')); await wt(100);
  const btn = await pg.$(`#cxJump [data-cxj="${k}"]`); assert.ok(btn, 'jump button for ' + k);
  await btn.click(); await wt(2600);
  const s = await at(sel); assert.ok(s, label + ' card exists (' + sel + ')');
  assert.ok(s.vis && s.top >= 0 && s.top < 40, `${label}: card at top of Settings (got top=${s.top})`);
  assert.ok(s.open, label + ' card expanded');
  assert.ok(s.foc, label + ' card has focus');
  console.log('jump', k, '→', sel, 'top', s.top);
}
// eMaint highlight + screenshot right after the jump
await ev(() => setTab('general')); await wt(200);
await ev(() => setTab('connections')); await wt(100); await pg.click('#cxJump [data-cxj="ops"]');
await wt(1300);
let s = await at('#emCard'); console.log('emaint', s); assert.ok(s.hl && s.open && s.foc && s.vis && s.top >= 0 && s.top < 40, 'eMaint highlighted+open+focused+visible');
assert.equal(await ev(() => document.querySelectorAll('#emCard input[type=password],#emCard input[name*=pass i],#emCard input[id*=pass i]').length), 0, 'eMaint shows no credential fields (read-only, Aaron sets them on Render)');
await pg.screenshot({ path: `${SHOT}/${tag}-emaint-jump.png` });
// Ops room 'Set up' (Safe Rack) → eMaint card
await ev(() => ywSettings(false)); await wt(200);
await ev(() => { const b = document.createElement('button'); b.className = 'bz-link'; b.dataset.cxgo = MT_KEY(); b.id = 'tOpsSetup'; b.textContent = 'Set up'; document.body.appendChild(b); });
await pg.click('#tOpsSetup'); await wt(2600);
s = await at('#emCard'); assert.ok(s && s.vis && s.top >= 0 && s.top < 40 && s.open && s.foc, 'Ops Set up → eMaint card (top=' + (s && s.top) + ')');
// A user scroll stops the re-assert (no fighting the user)
await ev(() => setTab('general')); await wt(150); await ev(() => cxFocus('cal')); await wt(120);
await pg.mouse.move(700, 500); await pg.mouse.wheel(0, 900); await wt(1500);
const t2 = await at('#calCard'); assert.ok(t2.top < -100 || !t2.vis, 'user scroll wins over re-assert (top=' + t2.top + ')');
assert.deepEqual(errs, []);
console.log('conn-jump: all passed'); await b.close(); srv.close();
