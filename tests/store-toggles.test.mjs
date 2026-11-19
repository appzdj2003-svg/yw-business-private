// Headless check: Settings → Connections → Data store health (Gmail vs Upstash, "Move storage to Upstash (free)" steps, migration bar,
// Migrate now) and Connection status On/Off switches (confirm before Off, PUT /toggles, Vault log, rows show Off, rooms get a clean
// "Off — turn it on in Settings" error), plus Yorri "list connections" / "turn off <connection>" (+ yes) / "turn on <connection>".
// All network mocked. CAR=1 = car layout (48px targets). Screenshots under SHOTDIR or /workspace/store-toggles/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8177);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/store-toggles', tag = CAR ? 'car' : 'desk', SV = 'https://sv.test';
fs.mkdirSync(SHOT, { recursive: true });
const NAMES = { support: 'Support inbox (Gmail)', maint: 'Maintenance inbox + eMaint', alerts: 'Alerts (push + text)', kpi: 'KPIs (GA4 + Play)', appstore: 'App Store sync', search: 'Search consoles', finance: 'Finance', calendar: 'Calendars', marketing: 'Marketing', infra: 'Infrastructure', music: 'Music', rnd: 'R&D experiments', acq: 'Acquisitions', gmailSend: 'Gmail send (OAuth)', handoff: 'Grok Bot handoffs', supportmail: 'Support mail (domain copy)', resend: 'Resend (support@ send)' };
const OFF = {}; let BACK = 'gmail'; const reqs = [];
const tview = () => ({ connections: Object.entries(NAMES).map(([id, name]) => ({ id, name, what: name + ' polling', on: !OFF[id], lockedOff: false })), at: Date.now(), storeOk: true });
let MIG = 'waiting'; const mig = () => ({ needed: true, state: MIG, done: 7, total: 19, pending: ['kpi', 'finance', 'music'], copied: 6, lastError: 'ClosedAfterConnectTLS: Unexpected close', retryInS: MIG === 'paused' ? 3600 : 240, ...(MIG === 'paused' ? { note: 'Gmail unreachable; using fresh data' } : {}) });
const store = () => BACK === 'gmail' ? { backend: 'gmail', ok: false, state: 'failing', lastError: 'ClosedAfterConnectTLS: Unexpected close', failures: 12, retryInS: 300, lastOkAt: Date.now() - 864e5 }
  : { backend: 'upstash', ok: true, state: 'ok', lastError: null, failures: 0, retryInS: 0, lastOkAt: Date.now(), migration: mig(), usage: { sinceBoot: 41, thisMonth: 1234, freeLimit: 500000 } };
const offOr = (id, body) => OFF[id] ? { off: true, connection: id, name: NAMES[id], message: NAMES[id] + ' is Off — turn it on in Settings → Connections.' } : body;
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8177') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), raw = q.postData(), bd = raw ? JSON.parse(raw) : null; reqs.push({ m: M, p: u.pathname, b: bd }); let body = {};
  const P = u.pathname;
  if (P === '/healthz') body = { ok: true, build: 'abc1234', store: store(), off: Object.keys(OFF) };
  else if (P === '/store/migrate') body = { ...store(), started: true };
  else if (P === '/store/health') body = { ...store(), retried: true, probeOk: BACK === 'upstash' };
  else if (P === '/toggles' && M === 'GET') body = tview();
  else if (P === '/toggles' && M === 'PUT') { if (bd.on) delete OFF[bd.id]; else OFF[bd.id] = true; body = tview(); }
  else if (P === '/finance/status') body = offOr('finance', { stripe: { configured: true }, qbo: { connected: false }, plaid: { items: [] }, csv: { accounts: [] } });
  else if (P === '/search/status') body = offOr('search', { gsc: { configured: false }, bing: { configured: false }, syncer: { enabled: true } });
  else if (P === '/kpi/status') body = offOr('kpi', { play: { configured: false }, ga4: { configured: false, apps: [] }, appstore: { configured: false } });
  else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (P === '/tickets' || P === '/maint/mail') body = offOr(P === '/tickets' ? 'support' : 'maint', []);
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/alerts/actions') body = { actions: [] };
  else if (P === '/mail/health') body = offOr('supportmail', { configured: true, count: 3, unpulled: 1, lastReceivedAt: Date.now() - 3600e3, lastPullAt: Date.now() - 7200e3 });
  else if (P === '/mail/send-health') body = offOr('resend', { configured: true, lastSentAt: null, lastError: null, sentCount: 0, from: 'Your World Apps Support <support@yourworldapps.si>' });
  await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8177/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.waitForTimeout(600);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const puts = () => reqs.filter(x => x.p === '/toggles' && x.m === 'PUT').map(x => x.b);
const shot = async (name, sel) => { if (sel) await ev(s => { const n = document.querySelector(s); if (n) n.scrollIntoView({ block: s === '#shCard' || s === '#csCard' ? 'start' : 'center' }); }, sel); await wt(250); await pg.screenshot({ path: `${SHOT}/${tag}-${name}.png` }); };

await ev(() => { ywSettings(true); setTab('connections'); }); await wt(900);
// ---- Data store health: Gmail (old store) → Upstash steps shown on top
await ev(() => shLoad(true)); await wt(400);
let card = await ev(() => document.querySelector('#shCard').innerText);
assert.match(card, /Gmail \(old store\)/); assert.match(card, /Move storage to Upstash \(free\)/); assert.match(card, /console\.upstash\.com/); assert.match(card, /us-west-2 \(Oregon\)/);
assert.match(card, /UPSTASH_REDIS_REST_URL/); assert.match(card, /UPSTASH_REDIS_REST_TOKEN/); assert.match(card, /500K commands/);
assert.equal(await ev(() => document.querySelector('#shUp').open), true, 'Upstash steps open while on Gmail');
assert.equal(await ev(() => !!document.querySelector('#shMigrate')), false);
await shot('store-gmail', '#shCard');
// ---- After Aaron adds the env vars: Upstash + migration progress + Migrate now
BACK = 'upstash'; await ev(() => document.querySelector('#shCheck').click()); await wt(500);
card = await ev(() => document.querySelector('#shCard').innerText);
assert.match(card, /Storage: Upstash/); assert.match(card, /Migration from Gmail/); assert.match(card, /7 of 19/); assert.match(card, /1,234 of 500,000/); assert.doesNotMatch(card, /Move storage to Upstash/);
assert.equal(await ev(() => document.querySelector('#shMig [role=progressbar]').getAttribute('aria-valuenow')), '7');
if (CAR) assert.ok(await ev(() => document.querySelector('#shMigrate').getBoundingClientRect().height) >= 48, 'Migrate now 48px in car');
await ev(() => document.querySelector('#shMigrate').click()); await wt(400);
assert.ok(reqs.some(x => x.p === '/store/migrate' && x.m === 'POST'), 'POST /store/migrate');
assert.match(await ev(() => document.querySelector('#shMsg').textContent), /Migration started/);
assert.ok(await ev(() => auditList().some(a => /Migrate now/.test(a.title))), 'migrate logged to Vault');
await shot('store-upstash', '#shCard');

// ---- Paused migration: deck stays healthy (green) and works with fresh data
MIG = 'paused'; await ev(() => document.querySelector('#shCheck').click()); await wt(500);
card = await ev(() => document.querySelector('#shCard').innerText);
assert.match(card, /Paused — Gmail unreachable; using fresh data/);
assert.match(card, /Healthy · using fresh data/);
assert.match(card, /retry hourly|retries about once an hour|will retry hourly/i);
assert.doesNotMatch(card, /migrating — Gmail unavailable/);
assert.equal(await ev(() => document.querySelector('#shCard .cx-dot').className), 'cx-dot live', 'green while paused');
await shot('store-paused', '#shCard');
MIG = 'waiting';

// ---- Connection status switches
await ev(() => { const c = document.querySelector('#csCard'); c.open = true; csLoad(true); }); await wt(800);
const nsw = await ev(() => document.querySelectorAll('#csCard [role=switch][data-tgsw]').length); assert.ok(nsw >= 15, 'switches on rows: ' + nsw);
const ids = await ev(() => [...new Set([...document.querySelectorAll('#csCard [data-tgsw]')].map(x => x.dataset.tgsw))].sort()); assert.ok(Object.keys(NAMES).every(id => ids.includes(id)), 'every known connection has a switch: missing ' + Object.keys(NAMES).filter(id => !ids.includes(id)).join(','));
const h = await ev(() => Math.round(document.querySelector('#csCard [data-tgsw="finance"]').getBoundingClientRect().height)); assert.ok(h >= (CAR ? 48 : 44), 'switch height ' + h);
assert.equal(await ev(() => document.querySelector('#csCard [data-tgsw="finance"]').getAttribute('aria-checked')), 'true');
await shot('switches', '#csCard');
await ev(() => document.querySelector('#csCard [data-tgsw="finance"][data-row="stripe"]').click()); await wt(200);
assert.match(await ev(() => document.querySelector('.cs-confirm').innerText), /Turn off Finance\?/); assert.equal(puts().length, 0, 'no change before confirm');
if (CAR) assert.ok(await ev(() => document.querySelector('[data-tgyes]').getBoundingClientRect().height) >= 48);
await shot('confirm-off', '.cs-confirm');
await ev(() => document.querySelector('[data-tgno]').click()); await wt(150); assert.equal(await ev(() => !!document.querySelector('.cs-confirm')), false); assert.equal(puts().length, 0);
await ev(() => document.querySelector('#csCard [data-tgsw="finance"][data-row="stripe"]').click()); await wt(150);
await ev(() => document.querySelector('[data-tgyes]').click()); await wt(900);
assert.deepEqual(puts().pop(), { id: 'finance', on: false });
const stripe = await ev(() => document.querySelector('#csCard [data-row="stripe"]').closest('li').innerText); assert.match(stripe, /Off — switched off here/);
assert.equal(await ev(() => document.querySelector('#csCard [data-tgsw="finance"]').getAttribute('aria-checked')), 'false');
assert.match(await ev(() => document.querySelector('#csCard summary').innerText), /off/);
assert.ok(await ev(() => auditList().some(a => a.title === 'Connection Finance turned off (Settings)' && a.decision === 'TURNED OFF')), 'Vault log');
// rooms: svReq gives a clean Off error, not a 503
assert.match(await ev(() => svReq('GET', '/finance/status').then(() => 'no error', e => (e.off ? 'OFF:' : '') + e.message)), /^OFF:Finance is Off — turn it on in Settings/);
await shot('finance-off', '#csCard [data-row="stripe"]');
// turning back on needs no confirm
await ev(() => document.querySelector('#csCard [data-tgsw="finance"]').click()); await wt(800); assert.deepEqual(puts().pop(), { id: 'finance', on: true });

// ---- Yorri (works the same in the car: text in, "yes" to confirm)
const n0 = puts().length;
await ev(() => ask('turn off push')); await wt(300); assert.equal(puts().length, n0, '"turn off push" stays the device push command');
await ev(() => ask('turn off finance')); await wt(300); assert.match(await last(), /Turn off Finance\?.*Say yes/i); assert.equal(puts().length, n0);
await ev(() => ask('yes')); await wt(900); assert.deepEqual(puts().pop(), { id: 'finance', on: false }); assert.match(await last(), /Finance is now Off/);
await ev(() => ask('list connections')); await wt(700); assert.match(await last(), /Off \(1\): Finance/);
await ev(() => ask('turn on finance')); await wt(900); assert.deepEqual(puts().pop(), { id: 'finance', on: true }); assert.match(await last(), /Finance is now On/);
await ev(() => ask('disable search consoles')); await wt(300); await ev(() => ask('no')); await wt(300); assert.equal(puts().filter(x => x.id === 'search').length, 0, '"no" keeps it on');
await ev(() => ask('turn off alerts connection')); await wt(300); assert.match(await last(), /Turn off Alerts \(push \+ text\)\?/); await ev(() => ask('yes')); await wt(900); assert.deepEqual(puts().pop(), { id: 'alerts', on: false });
await ev(() => ask('switch the support inbox off')); await wt(300); assert.match(await last(), /Support inbox/); await ev(() => ask('yes')); await wt(900); assert.deepEqual(puts().pop(), { id: 'support', on: false });
await ev(() => ask('which connections are off')); await wt(700); assert.match(await last(), /Off \(2\)/);
assert.ok(await ev(() => ['conn.toggle', 'conn.list'].every(id => YC.list.some(c => c.id === id))));
const help = await ev(() => ycListHTML('connection')); assert.match(help, /turn off finance/); assert.match(help, /list connections/);
await ev(() => { ywSettings(true); setTab('connections'); document.querySelector('#csCard').open = true; }); await wt(500);
await shot('yorri-after', '#csCard');
console.log('errors:', errs); if (errs.length) process.exitCode = 1;
await b.close(); srv.close();
