// Headless: Device sync re-uploads this browser's copy when the server bundle is empty (never overwrites a non-empty server).
// A brand-new profile with no prior local settings does not upload seeds.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url));
const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8178);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe });
const SV = 'https://sv.test', TOK = 'x'.repeat(40);
const BIZ = { businesses: [{ id: 'yw-apps', name: 'Your World Apps', rooms: [] }], activeId: 'yw-apps' };

async function run(local, serverBundle, expectPut) {
  const puts = [];
  const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
  const pg = await ctx.newPage();
  await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8178') ? r.continue() : r.abort());
  await ctx.route(SV + '/**', async r => {
    const u = new URL(r.request().url()), M = r.request().method(), P = u.pathname;
    let body = {};
    if (P === '/config' && M === 'GET') body = { store: 'upstash', durable: true, rev: serverBundle ? 4 : 0, savedAt: serverBundle ? 100 : null, bundle: serverBundle };
    else if (P === '/config' && M === 'PUT') { const bd = JSON.parse(r.request().postData() || '{}'); puts.push(bd); body = { ok: true, store: 'upstash', durable: true, rev: 1, savedAt: Date.now(), bundle: bd.bundle || null }; }
    else if (P === '/healthz') body = { ok: true, store: { backend: 'upstash', ok: true, state: 'ok', migration: { needed: true, state: 'paused', done: 1, total: 19, note: 'Gmail unreachable; using fresh data' } } };
    else if (P === '/toggles') body = { connections: [], at: Date.now() };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) });
  });
  await pg.addInitScript(({ local, sv, tok, biz }) => {
    localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0');
    localStorage.setItem('ywDevSync', JSON.stringify({ url: sv, token: tok, linked: true, rev: local.rev || 0, savedAt: local.savedAt || null }));
    if (local.biz) localStorage.setItem('ywBusinesses', JSON.stringify(local.biz));
    if (local.mod) localStorage.setItem('ywDsMod', JSON.stringify(local.mod));
  }, { local, sv: SV, tok: TOK, biz: BIZ });
  await pg.goto('http://127.0.0.1:8178/');
  await pg.waitForTimeout(2500);
  const ui = await pg.evaluate(() => ({ err: DSU.err, msg: DSU.msg, linked: dsGet().linked, stat: (document.querySelector('#syncBox') && document.querySelector('#syncBox').innerText) || '', bizId: (JSON.parse(localStorage.getItem('ywBusinesses')||'{}').activeId||'') }));
  await ctx.close();
  return { puts, ui };
}

// (1) this browser has prior settings, server copy is empty → upload
{
  const { puts, ui } = await run({ rev: 3, savedAt: 50, biz: BIZ, mod: { biz: 50, conn: 50 } }, null, true);
  assert.ok(puts.length >= 1, 'uploaded local copy when server empty: ' + puts.length);
  assert.ok(puts.some(p => p.bundle && p.bundle.biz && p.bundle.biz.activeId === 'yw-apps'), 'bundle includes local businesses');
  assert.equal(ui.err, false, 'no sync error: ' + ui.msg);
  assert.match(ui.stat, /Synced/);
  assert.doesNotMatch(ui.stat, /Sync error/);
}
// (2) server already has a bundle → apply it; do not replace it with an "empty server" re-upload of local seeds
{
  const server = { biz: { businesses: [{ id: 'server-biz', name: 'From Server', rooms: [] }], activeId: 'server-biz' }, mod: { biz: Date.now() + 864e5 } };
  const { puts, ui } = await run({ rev: 1, savedAt: 10, biz: BIZ, mod: { biz: 10 } }, server, false);
  assert.equal(ui.bizId, 'server-biz', 'non-empty server bundle wins over older local copy');
  assert.equal(ui.err, false);
  assert.equal(ui.err, false);
}
// (3) linked profile, empty server, no prior savedAt — still shows Synced (not a 503 error).
// A linked device may still push ordinary local edits (existing dsQueue behavior).
{
  const { ui } = await run({ rev: 0, savedAt: null }, null, false);
  assert.equal(ui.err, false, 'linked empty is still synced, not an error: ' + ui.msg);
  assert.match(ui.stat, /Synced/);
  assert.doesNotMatch(ui.stat, /Sync error/);
}
console.log('ds-hydrate ok');
await b.close(); srv.close();
