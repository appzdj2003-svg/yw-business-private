// Headless: (1) Vault log + eMaint seen ids sync through /config with union merge (website ↔ Android app share one state),
// (2) /sync/rev moving triggers an immediate refresh (config pulled again), (3) Settings → Alerts lists phone-app devices with Remove/Test,
// (4) Yorri "list my devices" / "send a test to my phone app", (5) inside the app (window.YWApp) push shows as handled by the app.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url));
const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8191);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe });
const SV = 'https://sv.test', TOK = 'x'.repeat(40);
const S = { rev: 5, boot: 'b1', bundle: { mod: { vault: Date.now() - 1000, mmseen: Date.now() - 1000 }, vault: [{ id: 'vApp', ts: '2026-11-20T15:00:00.000Z', decision: 'APPROVED via app', title: 'From phone' }], mmseen: ['m-app'] },
  puts: [], gets: 0, devices: [{ id: 'a0123456789ab', label: 'Pixel 9 Pro Fold', model: 'Pixel 9 Pro Fold', app: '1.0.0', lastSeen: Date.now() - 20e3, fcm: false, mode: 'poll' }], tests: 0, dels: [] };
// same rule as the server's mergeBundles: vault / eMaint ids are unioned, other sections newest-wins
function unionLikeServer(cur, inc) { const out = { ...cur, ...inc, mod: { ...(cur.mod || {}), ...(inc.mod || {}) } };
  const m = new Map(); for (const e of [...(cur.vault || []), ...(inc.vault || [])]) m.set(e.id, e); out.vault = [...m.values()].sort((x, y) => String(y.ts).localeCompare(String(x.ts)));
  out.mmseen = [...new Set([...(cur.mmseen || []), ...(inc.mmseen || [])])]; return out; }
async function page(app) {
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); const pg = await ctx.newPage();
  await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8191') ? r.continue() : r.abort());
  await ctx.route(SV + '/**', async r => { const u = new URL(r.request().url()), M = r.request().method(), P = u.pathname; let body = {};
    if (P === '/config' && M === 'GET') { S.gets++; body = { store: 'upstash', durable: true, rev: S.rev, savedAt: 1, bundle: S.bundle }; }
    else if (P === '/config' && M === 'PUT') { const bd = JSON.parse(r.request().postData() || '{}'); S.puts.push(bd); S.rev++; S.bundle = unionLikeServer(S.bundle, bd.bundle); body = { ok: true, durable: true, rev: S.rev, savedAt: Date.now(), bundle: S.bundle }; }
    else if (P === '/sync/rev') body = { rev: S.rev, boot: S.boot };
    else if (P === '/devices' && M === 'GET') body = { devices: S.devices, fcmServer: false };
    else if (P === '/devices/test') { S.tests++; body = { sent: true, devices: 1 }; }
    else if (P.startsWith('/devices/') && M === 'DELETE') { S.dels.push(P.split('/')[2]); S.devices = []; body = { ok: true, removed: 1 }; }
    else if (P === '/push/vapid') body = { publicKey: 'x', devices: 1 };
    else if (P === '/toggles') body = { connections: [] };
    else if (P === '/alerts/settings') body = { pushLive: true, settings: null };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
  await pg.addInitScript(({ sv, tok, app }) => {
    localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0');
    localStorage.setItem('ywDevSync', JSON.stringify({ url: sv, token: tok, linked: true, rev: 1 }));
    localStorage.setItem('ywConn', JSON.stringify({ 'yw-apps:support': { type: 'support', url: sv, token: tok, live: true } }));
    localStorage.setItem('ywVaultAudit', JSON.stringify([{ id: 'vWeb', ts: '2026-11-20T14:00:00.000Z', decision: 'APPROVED via site', title: 'From web' }]));
    localStorage.setItem('ywMtMailSeen', JSON.stringify(['m-web']));
    if (app) window.YWApp = { isApp: () => true };
  }, { sv: SV, tok: TOK, app });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:8191/'); await pg.waitForTimeout(3000);
  return { ctx, pg, errs };
}
{ const { ctx, pg, errs } = await page(false);
  const v = await pg.evaluate(() => JSON.parse(localStorage.getItem('ywVaultAudit')).map(x => x.id));
  assert.ok(v.includes('vApp') && v.includes('vWeb'), 'vault union on this device: ' + v);
  assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('ywMtMailSeen')))).includes('m-app'), 'eMaint seen from the app');
  await pg.waitForTimeout(2500);
  const up = { bundle: S.bundle }; assert.ok(S.puts.length >= 1 && up.bundle.vault.some(x => x.id === 'vWeb') && up.bundle.vault.some(x => x.id === 'vApp'), 'server copy has both devices\' Vault entries');
  assert.ok(up.bundle.mmseen.includes('m-web') && up.bundle.mmseen.includes('m-app'));
  // the app approves something → server rev moves → this deck refreshes within one tick
  const g0 = S.gets; S.bundle = { ...up.bundle, mod: { ...up.bundle.mod, vault: Date.now() + 5000 }, vault: [{ id: 'vApp2', ts: '2026-11-20T16:00:00.000Z', title: 'Approved on phone' }, ...up.bundle.vault] }; S.rev += 3;
  await pg.waitForTimeout(9500);
  assert.ok(S.gets > g0, 'rev change pulled config again');
  assert.ok((await pg.evaluate(() => JSON.parse(localStorage.getItem('ywVaultAudit')).map(x => x.id))).includes('vApp2'), 'phone approval visible on website');
  // Settings → Alerts: phone app card
  await pg.evaluate(() => { ywSettings(true); setTab('alerts'); }); await pg.waitForTimeout(800);
  const card = await pg.evaluate(() => document.querySelector('#andCard')?.innerText || '');
  assert.match(card, /Pixel 9 Pro Fold/); assert.match(card, /Remove/); assert.match(card, /send a test to my phone app/i);
  await pg.click('[data-andtest="a0123456789ab"]'); await pg.waitForTimeout(500); assert.equal(S.tests, 1);
  // Yorri
  await pg.evaluate(() => { $('#q').value = 'list my devices'; submitQ(); }); await pg.waitForTimeout(800);
  assert.match(await pg.evaluate(() => document.querySelector('#log').innerText), /Phone app: Pixel 9 Pro Fold/);
  await pg.evaluate(() => { $('#q').value = 'send a test to my phone app'; submitQ(); }); await pg.waitForTimeout(800); assert.equal(S.tests, 2);
  pg.once('dialog', d => d.accept()); await pg.evaluate(() => { ywSettings(true); setTab('alerts'); }); await pg.waitForTimeout(300);
  await pg.click('[data-anddel="a0123456789ab"]'); await pg.waitForTimeout(600); assert.deepEqual(S.dels, ['a0123456789ab']);
  assert.match(await pg.evaluate(() => document.querySelector('#andCard')?.innerText || ''), /No phone app registered/);
  assert.deepEqual(errs, []); await ctx.close(); }
{ const { ctx, pg, errs } = await page(true);
  await pg.evaluate(() => { ywSettings(true); setTab('alerts'); }); await pg.waitForTimeout(600);
  assert.match(await pg.evaluate(() => document.querySelector('#smsBox')?.innerText || ''), /Handled by the Your World Business app/);
  assert.deepEqual(errs, []); await ctx.close(); }
await b.close(); srv.close(); console.log('app-sync: all passed');
