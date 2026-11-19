// Headless E2E: Command Center decision handoffs + Vault entry reader against the REAL server app (createApp + handoffService,
// in-memory stores, routine webhook captured — nothing leaves the box). Decision card shows the routed bot with a picker and a
// stage chip; approve → {type:'decision'} payload to the handoff connection; bot status POSTs flow back to the chip;
// Settings → Handoffs routing map / fallback / switches stay editable; Yorri 'who gets this' / 'send this to <bot>' /
// 'handoff status' / 'open the last vault entry' / 'read vault entry'; Vault rows open a reader (Esc, prev/next, Copy, links).
// CAR=1 = car layout (48px targets). Screenshots under SHOTDIR or /workspace/handoffs/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
import { createApp } from '../../yw-business-server/app.js'; import { memoryBackend } from '../../yw-business-server/store.js';
import { durableAlerts, decideItem } from '../../yw-business-server/sms.js'; import { handoffService } from '../../yw-business-server/handoff.js';
const T = 'd'.repeat(32), KEY = 'routine-sender-key-' + 'k'.repeat(24), HOOK = 'https://api2.cursor.sh/automations/webhook/abc123';
const alerts = durableAlerts(memoryBackend(), () => T); await alerts.put({ phone: '', all: true, quiet: { on: false, start: '00:00', end: '23:59' }, cats: {} });
const hooks = []; const fetchImpl = async (url, o) => { hooks.push({ url, body: JSON.parse(o.body) }); return { status: 200 }; };
const handoff = handoffService({ backend: memoryBackend(), secret: () => T, fetchImpl, resolve: async () => [{ address: '34.1.2.3', family: 4 }] });
await handoff.addConn({ name: 'TheBizBot handoff', url: HOOK, key: KEY, scope: ['yw-support'], kinds: ['crash', 'decision'] });
const sms = { push: null, notify: async () => ({ sent: 1 }) }; sms.decide = (id, ok, via, o = {}) => decideItem(alerts, id, ok, via, { crash: sms.crashHook, release: sms.releaseHook, dec: sms.decHook, ...o });
const api = createApp({ mail: { listMessages: async () => [], markSeen: async () => {} }, alerts, sms, handoff, token: T, self: 'me@x' }).listen(0);
const API = 'http://127.0.0.1:' + api.address().port;
const bot = async (p, body) => { const r = await fetch(API + p, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + T }, body: JSON.stringify(body) }); return r.json(); };

const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8197);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/handoffs', tag = CAR ? 'car' : 'desk', SV = 'https://sv.test';
fs.mkdirSync(SHOT, { recursive: true });
const ctx = await b.newContext({ viewport: { width: CAR ? 1200 : 1440, height: 1000 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); localStorage.setItem('ywA11y', JSON.stringify({ theme: 'dark' })); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8197') ? r.continue() : r.abort());
const reqs = [];
await ctx.route(SV + '/**', async r => {
  const q = r.request(), u = new URL(q.url()); const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (q.method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors, body: '' });
  reqs.push({ m: q.method(), p: u.pathname, b: q.postData() });
  const res = await fetch(API + u.pathname + u.search, { method: q.method(), headers: { 'content-type': 'application/json', authorization: q.headers()['authorization'] || '', origin: 'https://business.yourworldapps.si' }, body: ['GET', 'HEAD'].includes(q.method()) ? undefined : q.postData() });
  return r.fulfill({ status: res.status, headers: { ...cors, 'content-type': res.headers.get('content-type') || 'application/json' }, body: Buffer.from(await res.arrayBuffer()) });
});
await pg.goto('http://127.0.0.1:8197/'); await pg.waitForTimeout(800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
await ev(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'd'.repeat(32), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); localStorage.removeItem('ywVaultAudit'); }, SV);
await pg.reload(); await wt(4000);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop()?.innerText.replace(/\s+/g, ' ') || '');
const yorri = async t => { await ev(t => ask(t), t); await wt(900); return last(); };
const tall = sel => ev(sel => [...document.querySelectorAll(sel)].filter(n => n.offsetParent).map(n => Math.round(n.getBoundingClientRect().height)), sel);
const MIN = CAR ? 48 : 44;

// 1. A decision lands on the queue: bot picker shows the routed bot (Weather Radar Android → WeatherAI), chip "Not sent yet"
await ev(() => { setPageView('command'); queue = []; pushQ({ t: ['t2', 'T2'], title: 'Publish Weather Radar 0.9.1 Play listing copy', why: 'New store listing text is ready for com.yourworld.weatheranalyzer', lane: 'Growth', app: 'Weather Radar', platform: 'android' }); pushQ({ t: ['t1', 'T1'], title: 'Refresh the business deck pricing page', why: 'Command Center site copy', lane: 'Briefing' }); draw(); }); await wt(1200);
let sel = await ev(() => [...document.querySelectorAll('[data-qbot]')].map(s => s.value)); assert.deepEqual(sel, ['WeatherAI', 'TheBizBot'], 'routed bots on cards');
assert.match(await ev(() => document.querySelector('#queue').innerText), /Hand off to[\s\S]*Not sent yet[\s\S]*Matched “Weather Radar · Android”/);
assert.ok((await tall('#queue [data-qbot]')).every(h => h >= MIN), 'picker ≥ ' + MIN + 'px');
// redraws don't rebuild the queue (no flicker / no loop)
await ev(() => { window._qm = 0; new MutationObserver(m => { window._qm += m.length }).observe(document.querySelector('#queue'), { childList: true, subtree: true }); for (let i = 0; i < 5; i++) draw(); }); await wt(300);
assert.equal(await ev(() => window._qm), 0, 'draw() with no change leaves the queue DOM alone');
// 2. Yorri: who gets this / send this to <bot>
assert.match(await yorri('who gets this'), /goes to WeatherAI when you approve it — matched Weather Radar · Android/);
assert.match(await yorri('send this to the biz bot'), /I don’t know a bot|will go to TheBizBot/);
assert.match(await yorri('send this to AppleWeatherAI'), /will go to AppleWeatherAI when you approve it\. Nothing is approved yet/);
assert.equal(await ev(() => queue[0].bot), 'AppleWeatherAI');
// picker change back to WeatherAI
await pg.selectOption('[data-qbot="0"]', 'WeatherAI'); await wt(600);
assert.match(await last(), /goes to WeatherAI/);
assert.equal(hooks.length, 0, 'nothing sent before approval');
// 3. Approve the card (site button) → real server POSTs the decision payload to the routine webhook
await ev(() => document.querySelector('#queue [data-i="0"]').click()); await wt(1800);
assert.equal(hooks.length, 1, 'one handoff POST'); const P = hooks[0].body;
assert.equal(hooks[0].url, HOOK); assert.equal(P.type, 'decision'); assert.equal(P.bot, 'WeatherAI'); assert.equal(P.suggestedBot, 'WeatherAI'); assert.equal(P.approvedVia, 'site');
assert.match(P.decisionId, /^dec_[a-f0-9]{12}$/); assert.equal(P.title, 'Publish Weather Radar 0.9.1 Play listing copy'); assert.match(P.statusRoute, /\/decisions\/dec_[a-f0-9]{12}\/handoff$/);
console.log('payload', JSON.stringify(P));
assert.match(await last(), /Sent to WeatherAI/);
// 4. Bot status flows back → chip under "Handed off"
await bot(`/decisions/${P.decisionId}/handoff`, { status: 'working', bot: 'WeatherAI', note: 'Editing listing text' }); await bot(`/decisions/${P.decisionId}/handoff`, { status: 'working', bot: 'WeatherAI', note: 'Editing listing text' });
await ev(() => dhLoad(true)); await wt(800);
assert.match(await ev(() => document.querySelector('#dhList').innerText), /Publish Weather Radar[\s\S]*WeatherAI · Editing listing text[\s\S]*Working/);
assert.match(await yorri('handoff status'), /WeatherAI: Working — Publish Weather Radar 0\.9\.1 Play listing copy \(Editing listing text\)/);
await ev(() => document.querySelector('#dq')?.scrollIntoView({ block: 'start' })); await wt(300);
await pg.screenshot({ path: `${SHOT}/${tag}-decision-card.png` });
// 5. Settings → Handoffs: routing map edit + fallback + switches persist on the server
await ev(() => { ywSettings(true); setTab('handoffs'); }); await wt(1500);
assert.match(await ev(() => document.querySelector('#dhSet').innerText), /Decision handoffs[\s\S]*Uses “TheBizBot handoff”[\s\S]*Weather Radar · Android[\s\S]*→ WeatherAI/);
await pg.click('[data-dhact="edit"]'); await wt(200);
await ev(() => { const r = document.querySelector('[data-dhr="0"]'); r.querySelector('[data-dhf="match"]').value = 'weather radar, weatheranalyzer, weather, radar'; });
await pg.click('[data-dhact="add"]'); await wt(200);
await ev(() => { const rows = document.querySelectorAll('[data-dhr]'), r = rows[rows.length - 1]; r.querySelector('[data-dhf="label"]').value = 'Safe Rack ops'; r.querySelector('[data-dhf="match"]').value = 'safe rack, emaint'; r.querySelector('[data-dhf="bot"]').value = 'TheBizBot'; });
assert.ok((await tall('#dhSet .dh-rt input, #dhSet .dh-rt select, #dhSet .og-b')).every(h => h >= MIN), 'routing inputs ≥ ' + MIN);
await pg.screenshot({ path: `${SHOT}/${tag}-settings-routing-edit.png` });
await pg.click('[data-dhact="save"]'); await wt(900);
let R = await handoff.routes(); assert.ok(R.custom && R.routes.some(r => r.label === 'Safe Rack ops' && r.bot === 'TheBizBot'), 'saved routing on server');
await pg.selectOption('#dhFb', 'TheBizBot'); await wt(900); assert.equal((await handoff.routes()).fallback, 'TheBizBot');
await pg.click('#dhOnDec'); await wt(900); assert.equal((await handoff.switches()).decisionsOn, false); await pg.click('#dhOnDec'); await wt(900); assert.equal((await handoff.switches()).decisionsOn, true);
await pg.reload(); await wt(3500); await ev(() => { ywSettings(true); setTab('handoffs'); }); await wt(1500);
assert.match(await ev(() => document.querySelector('#dhSet').innerText), /\(edited\)[\s\S]*Safe Rack ops/); assert.equal(await ev(() => document.querySelector('#dhFb').value), 'TheBizBot');
await ev(() => document.querySelector('#dhSet').scrollIntoView({ block: 'start' })); await wt(200);
await pg.screenshot({ path: `${SHOT}/${tag}-settings-routing.png` });
await ev(() => ywSettings(false)); await wt(300);
// 6. Vault: rows are buttons; tap opens reader with the handoff entry fields; Esc closes; prev/next; Copy; secrets redacted
await ev(() => audit({ decision: 'TEST SECRET', title: 'redaction check', lane: 'Vault', token: 'abc', note: 'key re_ABCDEFGHIJKLMNOP and Bearer xyz123' }));
await ev(() => { setPageView('command'); roomView = 'Vault'; draw(); }); await wt(600);
assert.ok(await ev(() => document.querySelectorAll('button.vx-row[data-vx]').length) >= 2, 'vault rows are buttons');
assert.ok((await tall('button.vx-row')).every(h => h >= MIN), 'vault rows ≥ ' + MIN);
await ev(() => document.querySelector('button.vx-row[data-vx="0"]').focus()); await pg.keyboard.press('Enter'); await wt(300);
let t = await ev(() => document.querySelector('#vxModal .vx').innerText);
assert.match(t, /TEST SECRET[\s\S]*redaction check/); assert.doesNotMatch(t, /re_ABCDEFGHIJKLMNOP|xyz123|\babc\b/); assert.match(t, /token\s+•••• \(redacted\)/);
assert.equal(await ev(() => document.activeElement.id), 'vxClose', 'focus moves into the reader');
await pg.keyboard.press('Escape'); await wt(200); assert.equal(await ev(() => !!document.querySelector('#vxModal')), false, 'Esc closes');
assert.equal(await ev(() => document.activeElement.dataset.vx), '0', 'focus returns to the row');
let say = await yorri('open the last vault entry'); assert.match(say, /TEST SECRET — redaction check\. .* ET, by Aaron, in Vault/);
await pg.click('[data-vxa="next"]'); await wt(200);
const hoIdx = await ev(() => vxList().findIndex(e => /^HANDOFF SENT/.test(e.decision))); await ev(i => vxOpen(i), hoIdx); await wt(200);
t = await ev(() => document.querySelector('#vxModal .vx').innerText);
assert.match(t, /HANDOFF SENT → WeatherAI[\s\S]*Publish Weather Radar[\s\S]*ET[\s\S]*By\s+Aaron[\s\S]*Decision id\s+dec_[a-f0-9]{12}[\s\S]*Bot\s+WeatherAI[\s\S]*Status\s+sent/);
assert.match(t, /Show the decision/);
assert.match(await yorri('read vault entry'), /HANDOFF SENT → WeatherAI — Publish Weather Radar 0\.9\.1 Play listing copy\. .* ET, by Aaron, in Handoffs/);
assert.ok((await tall('#vxModal .vx-acts button')).every(h => h >= MIN), 'reader buttons ≥ ' + MIN);
await pg.screenshot({ path: `${SHOT}/${tag}-vault-entry.png` });
await ev(() => { window.__cp = ''; navigator.clipboard.writeText = async x => { window.__cp = x; }; }); await pg.click('[data-vxa="copy"]'); await wt(200);
assert.match(await ev(() => window.__cp), /HANDOFF SENT → WeatherAI[\s\S]*Decision id: dec_/);
await pg.click('[data-vxa="go"][data-k="decision"]'); await wt(500); assert.equal(await ev(() => !!document.querySelector('#vxModal')), false, 'link closes reader');
// 7. Decline sends nothing to the routine
await ev(() => { queue.splice(0, queue.length); pushQ({ t: ['t1', 'T1'], title: 'Hunt iOS map tile tweak', why: 'Hunt', lane: 'Growth', app: 'Hunt', platform: 'ios' }); draw(); }); await wt(800);
assert.equal(await ev(() => document.querySelector('[data-qbot="0"]').value), 'AppleHuntAi');
const n0 = hooks.length; await ev(() => document.querySelector('#queue [data-d="0"]') && decide(0, false)); await wt(1200); assert.equal(hooks.length, n0, 'decline posts nothing');
assert.deepEqual(errs, []);
console.log('decision-handoff: all passed'); await b.close(); srv.close(); api.close();
