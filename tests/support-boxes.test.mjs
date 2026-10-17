// Headless check: Support inbox boxes. Only Needs reply has SLA (list, calendar, tiles); moves POST and teach; AI sorting only for uncertain tickets when on;
// Settings rules save; calendar SLA source chip; Yorri support commands. Run: node tests/support-boxes.test.mjs
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8130);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', OLD = Date.now() - 5 * 864e5;
const tk = (id, from, subject, box, by, why, extra = {}) => ({ id, from, fromName: from.split('@')[0], subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: OLD, sla: box === 'reply' ? 'breach' : 'none', unread: true, status: 'open', snippet: subject, thread: [{ from, at: OLD, body: subject }], box, boxBy: by, boxWhy: why, boxConf: 0.9, ...extra });
let T = [tk('S-1', 'developer@insideapple.apple.com', 'Welcome to the Apple Developer Program', 'stores', 'rule', 'known sender: Apple'), tk('S-2', 'noreply@host.example', 'Auto-renewal notice', 'billing', 'rule', 'no-reply sender · receipt/order/renewal'),
  tk('S-3', 'store@shop.example', 'Your order is being processed', 'billing', 'rule', 'List-Unsubscribe header · receipt/order/renewal'), tk('S-4', 'reports@jetpack.com', 'Jetpack Monthly Report', 'auto', 'rule', 'known sender: service notifications'),
  tk('S-5', 'jane@gmail.com', 'App crashes on login', 'reply', 'rule', 'question or request from a person'), tk('S-6', 'kim@corp.example', 'Partnership update', 'reply', 'rule', 'no automated signals', { uncertain: true, boxConf: 0.55 })];
let cfg = { rules: [], always: [], ai: { on: false }, boxes: {} }; const posted = [];
const ctx = await b.newContext(process.env.DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { window.confirm = () => true; localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0') });
await pg.route('https://api.x.ai/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify({ choices: [{ message: { content: '[{"id":"S-6","box":"auto","conf":0.86,"reason":"FYI broadcast, no question"}]' } }] }) }));
await pg.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(); const body0 = q.postData() ? JSON.parse(q.postData()) : null; if (M !== 'GET' && M !== 'OPTIONS') posted.push(M + ' ' + u.pathname + ' ' + (q.postData() || ''));
  let body = {}; const mv = u.pathname.match(/^\/tickets\/([^/]+)\/box$/);
  if (u.pathname === '/tickets') body = T; else if (mv) { const t = T.find(x => x.id === decodeURIComponent(mv[1])); Object.assign(t, { box: body0.box, boxBy: body0.by === 'ai' ? 'ai' : 'you', boxWhy: body0.by === 'ai' ? body0.reason : 'moved by you', boxConf: body0.conf || 1, slaH: body0.box === 'reply' ? 48 : null, uncertain: false }); body = { ok: true, taught: body0.by === 'ai' ? null : 'From ' + t.from + ' → X', ticket: t }; }
  else if (/^\/tickets\/[^/]+$/.test(u.pathname)) body = T.find(x => x.id === decodeURIComponent(u.pathname.split('/')[2]));
  else if (u.pathname === '/inbox/config') { if (M === 'PUT') cfg = { ...cfg, ...body0, ai: body0.ai || cfg.ai }; body = cfg; }
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: false, settings: null };
  await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8130/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)) }, SV);
await pg.reload(); await pg.waitForTimeout(2500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 900) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 260)); return l };
await ev(() => supRefresh()); await wt(500);
const rep = await last(); out.push('report: ' + rep); assert.match(rep, /I sorted your Support inbox: Needs reply 2, Automated 1, Billing\/Receipts 2, App stores 1, Spam\/Other 0, Done 0\. 4 automated\/billing\/app-store emails left the overdue SLA list/);
await ev(() => supRefresh()); await wt(400); assert.equal(await last(), rep, 'report is one-time');
// Support room
await ev(() => supGo()); await wt(300);
const room = await ev(() => ({ tabs: [...document.querySelectorAll('.sup-boxes button')].map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')).join(' | '), rows: [...document.querySelectorAll('[data-supo]')].map(r => r.dataset.supo).join(), breach: document.querySelectorAll('[data-supo] .dn').length }));
out.push('room: ' + JSON.stringify(room)); assert.equal(room.tabs, 'Needs reply 2* | Automated 1 | Billing/Receipts 2 | App stores 1 | Spam/Other 0 | Done 0'); assert.equal(room.rows, 'S-5,S-6');
await pg.screenshot({ path: '/tmp/sup_reply.png' });
await pg.click('[data-supbox="billing"]'); await wt(200);
const bill = await ev(() => ({ rows: [...document.querySelectorAll('[data-supo]')].map(r => r.dataset.supo).join(), sla: [...document.querySelectorAll('[data-supo] .sup-rt .mono')].map(x => x.textContent).join('|'), why: document.querySelector('[data-supo] .sup-why')?.textContent }));
out.push('billing: ' + JSON.stringify(bill)); assert.equal(bill.rows, 'S-2,S-3'); assert.match(bill.sla, /Billing\/Receipts · no SLA/); assert.match(bill.why, /rule · /);
await pg.screenshot({ path: '/tmp/sup_billing.png' });
// Calendar: SLA entries only for Needs reply; SLA chip hides them
const sla = await ev(() => calItems().filter(x => String(x.id).startsWith('sup:')).map(x => x.id).join()); assert.equal(sla, 'sup:S-5,sup:S-6'); out.push('calendar SLA items: ' + sla);
await ev(() => { roomView = 'Calendar'; setPageView('command'); roomView = 'Calendar'; CAL.view = 'agenda'; draw() }); await wt(200);
const chip = await ev(() => document.querySelector('[data-calsrc="sla"]')?.textContent); assert.match(chip, /SLA 2/);
await pg.click('[data-calsrc="sla"]'); await wt(150); assert.equal(await ev(() => calScoped({ all: true }).filter(x => String(x.id).startsWith('sup:')).length), 0);
assert.equal(await ev(() => document.querySelector('[data-calsrc="sla"]').getAttribute('aria-pressed')), 'false'); await pg.click('[data-calsrc="sla"]'); await wt(100); out.push('calendar SLA chip toggles ok');
// Move via row select (teaches)
await ev(() => supGo()); await ev(() => { SUP.box = 'reply'; draw() }); await wt(150);
await pg.selectOption('[data-supmv="S-6"]', 'auto'); await wt(500);
assert.match(posted.at(-1), /POST \/tickets\/S-6\/box \{"box":"auto"\}/); assert.match(await last(), /Moved S-6 to Automated\. No SLA in that box\. Learned: From kim@corp.example → X/);
assert.equal(await ev(() => calItems().filter(x => String(x.id).startsWith('sup:')).length), 1); out.push('row move ok: ' + (await last()).slice(0, 120));
// Modal + "move this to automated" + back to needs reply
await ev(() => supOpen('S-5')); await wt(400); assert.ok(await ev(() => !!document.querySelector('#supMvM')));
let l = await say('move this to automated', 900); assert.match(l, /Moved S-5 to Automated/);
await ev(() => { SUP.open = null; supModal() });
l = await say('move the jetpack email to needs reply', 900); assert.match(l, /Moved S-4 to Needs reply\. It now has an SLA deadline/);
l = await say('move the zebra thing to spam'); assert.match(l, /didn’t find .*Nothing moved/);
l = await say('what needs a reply'); assert.match(l, /1 needs a reply: Jetpack Monthly Report from reports — overdue/);
l = await say('any billing emails'); assert.match(l, /2 in Billing\/Receipts: Your order is being processed|2 in Billing\/Receipts: Auto-renewal notice/);
l = await say('show automated'); assert.match(l, /Showing Automated — 2 tickets\. No SLA in this box/); assert.equal(await ev(() => SUP.box), 'auto');
l = await say('always treat jane@gmail.com as needs reply', 1200); assert.match(l, /mail from jane@gmail.com will always land in Needs reply/); assert.deepEqual(cfg.always, ['jane@gmail.com']);
// Settings: rules editor + AI toggle; AI sorts only uncertain tickets
T.find(x => x.id === 'S-6').box = 'reply'; Object.assign(T.find(x => x.id === 'S-6'), { boxBy: 'rule', uncertain: true, slaH: 48 });
await ev(() => { ywSettings(true); setTab('connections') }); await wt(800);
assert.match(await ev(() => document.querySelector('#inbBox').innerText), /AI sorting/);
await ev(() => document.querySelector('[data-inbadd]').click()); await wt(100);
await ev(() => { const r = [...document.querySelectorAll('#inbRules .inb-r')].pop(); r.querySelector('[data-inbf]').value = 'subject'; r.querySelector('[data-inbm]').value = 'Monthly Report'; r.querySelector('[data-inbb]').value = 'auto'; document.querySelector('[data-inbsave]').click() }); await wt(700);
assert.deepEqual(cfg.rules, [{ field: 'subject', match: 'Monthly Report', box: 'auto', learned: false }]); out.push('rules saved: ' + JSON.stringify(cfg.rules));
await ev(() => localStorage.setItem('ywLlm', JSON.stringify({ key: 'xai-test', base: 'https://api.x.ai/v1', model: 'grok-4' })));
await ev(() => { const c = document.querySelector('#inbAi'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })) }); await wt(2000);
assert.equal(cfg.ai.on, true); const aiPost = posted.find(p => /S-6\/box .*"by":"ai"/.test(p)); assert.ok(aiPost, 'AI move posted'); assert.match(aiPost, /"reason":"FYI broadcast, no question","conf":0.86/);
assert.ok(!posted.some(p => /S-5\/box .*"by":"ai"/.test(p)), 'confident tickets are not sent to AI');
await ev(() => { ywSettings(false); SUP.box = 'auto'; supGo() }); await wt(300);
const aiChip = await ev(() => document.querySelector('[data-supo="S-6"] .sup-why')?.textContent); assert.match(aiChip, /🤖 sorted by AI · FYI broadcast, no question · 86%/); out.push('AI chip: ' + aiChip);
await pg.screenshot({ path: '/tmp/sup_ai'+(process.env.DESK?'_d':'')+'.png' }); await ev(() => { ywSettings(true); setTab('connections'); document.querySelector('#inbH').scrollIntoView() }); await wt(400); await pg.screenshot({ path: '/tmp/sup_set'+(process.env.DESK?'_d':'')+'.png' }); await ev(() => ywSettings(false));
const cov = await ev(() => ycCoverage()); assert.deepEqual(cov, []);
console.log(out.join('\n')); console.log('errors:', errs); assert.deepEqual(errs, []); console.log('support boxes: all passed');
await b.close(); srv.close();
