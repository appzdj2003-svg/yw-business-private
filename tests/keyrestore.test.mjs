// Headless check: access-code restore + Device sync → Support server + Connection status.
// (1) fresh profile: gate → code → encrypted restore copy fetched by id, decrypted in the page → Support connection + Device sync restored → App Growth LIVE (not SAMPLE).
// (2) Device-sync-only profile whose server bundle has empty Support URLs (the real bug) → Support connection filled from the sync link; KPIs/Finance/Calendars not "needs server".
// (3) unlocked, nothing stored → "needs server" rows have a Connect button that opens the server form; status list red rows; wrong code feedback; Yorri commands. All network mocked; test code only.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert'; import crypto from 'node:crypto';
const CODE = 'Test-Code-Kr-4242', HASH = crypto.createHash('sha256').update(CODE).digest('hex');
const html = String(fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url))).replace(/var H="[0-9a-f]{64}"/, 'var H="' + HASH + '"');
const PORT = 8191; const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(PORT);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://yw-business-server.onrender.com', TOK = 't'.repeat(40), NOW = Date.now(), CAR = !!process.env.CAR;
const W = crypto.webcrypto.subtle, te = new TextEncoder(), b64 = u => Buffer.from(u).toString('base64');
const base = await W.importKey('raw', te.encode(CODE), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
const ID = Buffer.from(await W.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: te.encode('yw-restore-id-v1'), iterations: 310000 }, base, 256)).toString('hex');
const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = await W.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const PAY = { v: 1, at: NOW, ds: { url: SV, token: TOK, xai: true }, conn: {}, llm: null };
const BLOB = { v: 1, alg: 'PBKDF2-SHA256/AES-GCM', it: 310000, salt: b64(salt), iv: b64(iv), ct: b64(await W.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(PAY)))) };
const BUNDLE = { conn: { 'yw-apps/support': { type: 'support', url: '', live: false } }, xai: { key: 'xai-restored-key', base: 'https://api.x.ai/v1', model: 'grok-4' }, mod: { conn: NOW - 864e5, xai: 1 } };
const GROWTH = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [{ id: 'weather-radar', label: 'Weather Radar', biz: 'weather', propertyId: '559303196', ga4: { hasData: true, totals: { d7: { activeUsers: 54, newUsers: 40, sessions: 133, userEngagementDuration: 9000, engagementRate: .6 }, d28: { activeUsers: 90, newUsers: 70, sessions: 200, userEngagementDuration: 12000, engagementRate: .6 } }, daily: [], countries: [], versions: [], platform: [], events: [], screens: [], retention: {}, activeUsers7: 54 } }] };
let failures = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) failures++; };
async function ctxFor(init) {
  const ctx = await b.newContext(CAR ? { viewport: { width: 1180, height: 900 } } : { viewport: { width: 1440, height: 900 } }); const reqs = [];
  await ctx.addInitScript(([init, car]) => { if (sessionStorage.getItem('krInit')) return; sessionStorage.setItem('krInit', '1'); localStorage.setItem('ywYorriSpeak', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v); }, [init, CAR]);
  await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:' + PORT) ? r.continue() : r.abort());
  await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), auth = q.headers().authorization || ''; reqs.push(M + ' ' + u.pathname + (auth ? ' [auth]' : ''));
    const J = (s, o) => r.fulfill({ status: s, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (u.pathname === '/restore/' + ID && M === 'GET') return J(200, { blob: BLOB, savedAt: NOW });
    if (u.pathname.startsWith('/restore/') && M === 'GET') return J(404, { error: 'no restore copy' });
    if (u.pathname.startsWith('/restore/') && M === 'PUT') return J(auth === 'Bearer ' + TOK ? 200 : 401, { ok: true, savedAt: NOW });
    if (auth !== 'Bearer ' + TOK) return J(401, { error: 'unauthorized' });
    if (u.pathname === '/config' && M === 'GET') return J(200, { store: 'gmail', durable: true, rev: 5, savedAt: NOW, bundle: BUNDLE });
    if (u.pathname === '/config' && M === 'PUT') { const bd = JSON.parse(q.postData()); reqs.push('PUTCONF ' + JSON.stringify(bd.bundle.conn)); return J(200, { ok: true, rev: 6, savedAt: NOW, durable: true, bundle: bd.bundle }); }
    if (u.pathname === '/kpi/growth') return J(200, GROWTH);
    if (u.pathname === '/kpi/status') return J(200, { play: { configured: false }, ga4: { configured: true, apps: [{ id: 'weather-radar', label: 'Weather Radar', biz: 'weather', propertyId: '559303196' }] }, appstore: { configured: false } });
    if (u.pathname === '/finance/status') return J(200, { stripe: { configured: false }, qbo: { connected: false }, plaid: { items: [] }, csv: { accounts: [] } });
    if (u.pathname === '/calendar/status') return J(200, { google: { connected: false, calendars: [] }, ms: { connected: false, calendars: [] } });
    if (u.pathname === '/maint/status') return J(200, { configured: true, ok: false, error: 'eMaint login 401: Authentication failure' });
    if (u.pathname === '/inboxes') return J(200, { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', builtin: true }] });
    if (u.pathname === '/tickets') return J(200, []);
    return J(200, {}); });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); return { ctx, pg, reqs, errs };
}
const shot = (pg, n) => process.env.SHOTS ? pg.screenshot({ path: process.env.SHOTS + '/' + n + (CAR ? '-car' : '-desk') + '.png', fullPage: false }) : null;
// (1) fresh profile
{ const { ctx, pg, reqs, errs } = await ctxFor({});
  await pg.goto('http://127.0.0.1:' + PORT + '/'); ok(await pg.isVisible('#ywGate'), 'gate shown on a fresh profile');
  await pg.fill('#ywCode', 'wrong-code'); await pg.click('#ywGate button'); await pg.waitForTimeout(300); ok(/denied/i.test(await pg.textContent('#ywErr')), 'wrong code → Access denied');
  await pg.fill('#ywCode', CODE); await pg.click('#ywGate button');
  await pg.waitForFunction(() => { try { const c = JSON.parse(localStorage.getItem('ywConn') || '{}'); return Object.values(c).some(x => x.token && x.url) && JSON.parse(localStorage.getItem('ywDevSync') || '{}').linked; } catch { return false; } }, null, { timeout: 30000 });
  ok(true, 'restore filled the Support connection + linked Device sync');
  await pg.waitForLoadState('load'); await pg.waitForTimeout(1500);
  const st = await pg.evaluate(() => ({ sup: smsServer() && smsServer().url, llm: !!llmCfg().key, dsLinked: dsGet().linked }));
  ok(st.sup === 'https://yw-business-server.onrender.com' && st.dsLinked, 'after reload: Support server + Device sync live');
  ok(st.llm, 'Grok key restored through Device sync (xai on)');
  ok(reqs.some(x => x.startsWith('GET /restore/' + ID) && !x.includes('[auth]')), 'restore fetch is by derived id, no token sent');
  ok(!(await pg.content()).includes(TOK), 'token never rendered into the page');
  await pg.evaluate(() => grRefresh(true)); await pg.waitForTimeout(800);
  const g = await pg.evaluate(() => { const D = grData(); return { sample: !!(D && D.sample), n: D && D.apps && D.apps.length } });
  ok(!g.sample && g.n === 1, 'App Growth shows LIVE data, not SAMPLE');
  ok(reqs.some(x => x.startsWith('PUTCONF') && x.includes('onrender.com')), 'Support URL pushed back into the sync bundle (fixes other browsers)');
  await pg.evaluate(() => { ywSettings(true); setTab('connections') }); await pg.waitForSelector('#csCard'); await pg.waitForTimeout(800);
  const rows = await pg.$$eval('.cs-row', L => L.map(l => l.className + '|' + l.querySelector('.cs-l').textContent));
  ok(rows.some(r => /cs-live/.test(r) && /Support server/.test(r)), 'status: Support server green'); ok(rows.some(r => /cs-err/.test(r) && /App Store/.test(r)), 'status: App Store Connect red'); ok(rows.some(r => /cs-err/.test(r) && /eMaint/.test(r)), 'status: eMaint red (login failing)');
  await shot(pg, 'restored-status');
  ok(!errs.length, 'no page errors: ' + errs.join(' | ')); await ctx.close(); }
// (2) Device sync linked, Support conn missing locally, server bundle has empty Support URL (root cause)
{ const { ctx, pg, errs } = await ctxFor({ ywUnlock: '1', ywDevSync: JSON.stringify({ url: SV, token: TOK, linked: true, xai: true, rev: 1 }) });
  await pg.goto('http://127.0.0.1:' + PORT + '/'); await pg.waitForTimeout(2500);
  const s = await pg.evaluate(() => ({ sup: smsServer(), k: SUP_KEY() }));
  ok(s.sup && s.sup.url === SV && s.sup.token === TOK, 'Device sync link fills the Support connection (' + s.k + ')');
  await pg.evaluate(() => { ywSettings(true); setTab('connections') }); await pg.waitForTimeout(1200);
  const t = await pg.evaluate(() => ['#kpiCard', '#finCard', '#calCard'].map(s => (document.querySelector(s + ' summary') || {}).textContent || ''));
  ok(t.every(x => !/needs server/.test(x)), 'KPIs/Finance/Calendars no longer "needs server": ' + t.join(' / '));
  ok(!errs.length, 'no page errors: ' + errs.join(' | ')); await ctx.close(); }
// (3) unlocked, nothing stored
{ const { ctx, pg, errs } = await ctxFor({ ywUnlock: '1' });
  await pg.goto('http://127.0.0.1:' + PORT + '/'); await pg.waitForTimeout(2000);
  ok(await pg.isVisible('#rsToast'), 'nudge shown when this browser has no connection');
  await pg.evaluate(() => { ywSettings(true); setTab('connections') }); await pg.waitForTimeout(500);
  ok(await pg.isVisible('#kpiCard .cs-srvb') || (await pg.$$('#kpiCard [data-csgo="srv"]')).length > 0, 'App KPIs "needs server" has a Connect button');
  ok((await pg.$$('#finCard [data-csgo="srv"]')).length > 0 && (await pg.$$('#calCard [data-csgo="srv"]')).length > 0, 'Finance + Calendars have Connect buttons');
  ok(/needs server/.test(await pg.textContent('#mkCard summary')), 'Marketing says needs server (not "traffic not linked")');
  await pg.evaluate(() => { const d = document.querySelector('#kpiCard'); d.open = true; d.querySelector('[data-csgo="srv"]').click(); }); await pg.waitForTimeout(400);
  ok(await pg.evaluate(() => document.activeElement && document.activeElement.id === 'csCode'), 'Connect jumps to the server form and focuses the access-code box');
  const reds = await pg.$$eval('.cs-row.cs-err', L => L.length); ok(reds >= 10, 'status lists missing items in red (' + reds + ')');
  await shot(pg, 'unconnected-status');
  await pg.fill('#csCode', 'nope'); await pg.click('#csSrv [data-rs="restore"]'); await pg.waitForTimeout(300); ok(/isn’t right/.test(await pg.textContent('#csSrv')), 'wrong code in restore form → clear feedback');
  await pg.fill('#csCode', CODE); await pg.click('#csSrv [data-rs="restore"]');
  await pg.waitForFunction(() => !!smsServer(), null, { timeout: 30000 }).catch(() => {}); await pg.waitForLoadState('load'); await pg.waitForTimeout(1500);
  ok(await pg.evaluate(() => !!smsServer()), 'Restore from access code on an already-unlocked browser connects the server');
  const say = await pg.evaluate(async () => { const m = YC.list.find(c => c.id === 'conn.status'); return !!m.match(null, "what's not linked") && !!YC.list.find(c => c.id === 'conn.restore').match(null, 'restore my keys') });
  ok(say, 'Yorri: "what\'s not linked" and "restore my keys" match');
  ok(!errs.length, 'no page errors: ' + errs.join(' | ')); await ctx.close(); }
await b.close(); srv.close(); if (failures) { console.log(failures + ' FAILED'); process.exitCode = 1; } else console.log('ALL PASS');
