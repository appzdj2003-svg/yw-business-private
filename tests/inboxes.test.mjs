// Headless check: Settings → Inbox tab (scrollable tab bar, Connections link), inbox picker across rooms, per-inbox config/tickets/cleanup,
// add/remove Gmail inbox (password never stored in the browser), Yorri inbox commands. All network mocked. Run: node tests/inboxes.test.mjs (DESK=1 desktop)
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8132);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', D = Date.now() - 864e5, DESK = !!process.env.DESK;
let n = 0; const tk = (from, subject, box, x = {}) => ({ id: 'T-' + (++n), from, fromName: from.split('@')[0], subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: D - n * 6e5, sla: 'ok', unread: true, status: 'open', snippet: subject, thread: [{ from, at: D, body: subject }], box, boxBy: 'rule', boxWhy: 'rule', boxConf: 0.9, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false, cleanup: false }, ...x });
const INB = { 'yw-support': [tk('jane@gmail.com', 'App crashes', 'reply'), tk('reports@jetpack.com', 'Jetpack Monthly Report', 'auto')],
  'safe-rack-maint': [tk('notifications@emaint.com', 'New Work Request #1042 submitted: approval required', 'reply', { info: { parsed: true, kind: 'request', requestNo: '1042', needsApproval: true } }), tk('noreply@emaint.com', 'Work Order 5012 assigned', 'reply', { info: { parsed: true, kind: 'workorder', workOrderNo: '5012' } }), tk('it@company.example', 'Password expires soon', 'auto')],
  'acme-help': [tk('cust@acme.example', 'Where is my order?', 'reply'), tk('news@promo.example', 'Weekly deals', 'auto', { unsub: { kind: 'oneclick', label: 'One-tap unsubscribe', target: 'promo.example', oneTap: true, cleanup: true } })] };
let LIST = [{ id: 'yw-support', label: 'Support', address: 'yo•••@gmail.com', kind: 'support', canSend: true, builtin: true }, { id: 'safe-rack-maint', label: 'eMaint inbox', address: 'sa•••@gmail.com', kind: 'emaint', canSend: false, builtin: true }, { id: 'acme-help', label: 'Acme help', address: 'he•••@acme.example', kind: 'gmail', canSend: true, builtin: false, room: '' }];
const CFG = {}; const cfgOf = id => CFG[id] ||= { kind: id === 'safe-rack-maint' ? 'emaint' : 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: id !== 'safe-rack-maint', inbox: id };
const reqs = []; const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywSupSortReport', '1'); window.confirm = () => true; });
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8132') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + (bd ? ' ' + q.postData() : ''));
  let body = {}, status = 200; const pth = u.pathname.split('/').filter(Boolean); const iid = pth[0] === 'inboxes' && pth.length >= 3 ? pth[1] : (pth[0] === 'tickets' || pth[0] === 'inbox') ? 'yw-support' : null; const rest = pth[0] === 'inboxes' ? pth.slice(2) : pth[0] === 'inbox' ? ['config'] : pth;
  if (u.pathname === '/inboxes' && M === 'GET') body = { inboxes: LIST };
  else if (u.pathname === '/inboxes' && M === 'POST') { if (bd.pass === 'wrongpassword') { status = 400; body = { error: 'could not sign in to that inbox: wrong address or app password' }; } else { const x = { id: 'ops-mail', label: bd.label, address: 'op•••@x.example', kind: 'gmail', canSend: true, builtin: false, room: bd.room }; LIST = [...LIST, x]; INB['ops-mail'] = []; body = { ok: true, inbox: x }; } }
  else if (pth[0] === 'inboxes' && pth.length === 2 && M === 'DELETE') { LIST = LIST.filter(x => x.id !== pth[1]); body = { ok: true }; }
  else if (iid && rest[0] === 'config') { if (M === 'PUT') Object.assign(cfgOf(iid), bd); body = cfgOf(iid); }
  else if (iid && rest[0] === 'tickets' && rest.length === 1) body = INB[iid];
  else if (iid && rest[2] === 'unsubscribe') { const t = INB[iid].find(x => x.id === rest[1]); t.unsub = { ...t.unsub, cleanup: false, result: { state: 'unsubscribed', at: Date.now(), method: 'oneclick', label: 'Unsubscribed' } }; t.box = 'spam'; cfgOf(iid).unsubscribed.push({ sender: t.from, at: Date.now(), method: 'oneclick', state: 'unsubscribed' }); body = { ok: true, state: 'unsubscribed', method: 'oneclick', label: 'Unsubscribed', ticket: t }; }
  else if (iid && rest[0] === 'tickets') body = INB[iid].find(x => x.id === rest[1]);
  else if (u.pathname === '/maint/mail') body = [];
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: false, settings: null };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8132/');
const room = await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true };
  const sr = bizStore.businesses.find(b => /safe ?rack/i.test(b.name)); const r = sr.rooms.find(r => /maint/i.test(r.label)) || sr.rooms[0]; a[connKey(sr.id, r.id)] = { type: 'emailbox', url: sv, token: 'y'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); return sr.name + ' › ' + r.label }, SV);
await pg.reload(); await pg.waitForTimeout(2000);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [], tap = sel => DESK ? pg.click(sel) : pg.tap(sel);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1000) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 300)); return l };
// Tabs: Inbox after Connections; active tab fully visible in the scrollable bar
await ev(() => { ywSettings(true); setTab('general') }); await wt(300);
assert.deepEqual(await ev(() => [...document.querySelectorAll('#setTabs [data-stab]')].map(b => b.textContent)), ['General', 'Businesses & rooms', 'Connections', 'Alerts & push', 'Handoffs', 'Growth', 'Inbox sorting', 'Yorri & AI', 'Security & Vault', 'Advanced']);
const vis = k => ev(k => { setTab(k); const T = document.querySelector('#setTabs'), bt = T.querySelector(`[data-stab="${k}"]`), a = T.getBoundingClientRect(), c = bt.getBoundingClientRect(); return c.left >= a.left - 1 && c.right <= a.right + 1 }, k);
for (const k of ['advanced', 'organize', 'inbox', 'yorri', 'general']) { await wt(50); assert.ok(await vis(k), k + ' tab fully visible'); }
if (!DESK) { await ev(() => setTab('general')); await wt(400); assert.ok(await ev(() => document.querySelector('.st-wrap').classList.contains('st-fr')), 'right fade shows more tabs'); }
await pg.screenshot({ path: '/tmp/ib_tabs' + (DESK ? '_d' : '') + '.png' });
await ev(() => setTab('connections')); await wt(200); await ev(() => document.querySelector('#setPage section[data-tab="connections"] [data-stab="inbox"]').click()); await wt(1200);
assert.equal(await ev(() => document.querySelector('#stab_inbox').getAttribute('aria-selected')), 'true');
// Picker
const opts = await ev(() => [...document.querySelectorAll('#inbPick option')].map(o => o.textContent)); out.push('picker: ' + JSON.stringify(opts));
assert.match(opts[0], /^Your World Apps › Support = yo•••@gmail\.com$/); assert.equal(opts[1], room + ' = sa•••@gmail.com · read-only'); assert.equal(opts[2], 'Acme help = he•••@acme.example');
assert.match(await ev(() => document.querySelector('#inbBox').innerText), /Needs reply 1 · Automated 1/);
await pg.screenshot({ path: '/tmp/ib_inbox' + (DESK ? '_d' : '') + '.png' });
// Switch to Safe Rack eMaint inbox: its own config + counts; saving rules only touches that inbox
await pg.selectOption('#inbPick', 'safe-rack-maint'); await wt(800);
let txt = await ev(() => document.querySelector('#inbBox').innerText); assert.match(txt, /Read-only eMaint Gmail/); assert.match(txt, /Needs reply 2 · Automated 1/);
assert.ok(reqs.includes('GET /inboxes/safe-rack-maint/config') && reqs.includes('GET /inboxes/safe-rack-maint/tickets'));
await ev(() => { document.querySelector('#inbAlways').value = 'plant.manager@saferack.example'; document.querySelector('[data-inbsave]').click() }); await wt(600);
assert.deepEqual(CFG['safe-rack-maint'].always, ['plant.manager@saferack.example']); assert.deepEqual(cfgOf('yw-support').always, [], 'primary untouched');
assert.equal(await ev(() => localStorage.getItem('ywInbSel')), 'safe-rack-maint');
await pg.screenshot({ path: '/tmp/ib_maint' + (DESK ? '_d' : '') + '.png' });
// Acme inbox: cleanup works against that inbox
await pg.selectOption('#inbPick', 'acme-help'); await wt(800); assert.match(await ev(() => document.querySelector('#inbBox').innerText), /Needs reply 1 · Automated 1/);
await ev(() => document.querySelector('#inbBox [data-clopen]').click()); await wt(800);
assert.match(await ev(() => document.querySelector('#supClean').innerText), /Inbox cleanup · Acme help[\s\S]*news@promo\.example/);
await ev(() => document.querySelector('[data-clgo]').click()); await wt(900); assert.ok(reqs.some(x => x.startsWith('POST /inboxes/acme-help/tickets/') && x.includes('/unsubscribe')), 'unsubscribe hit the Acme inbox');
assert.ok(!reqs.some(x => /^POST \/tickets\/.*unsubscribe/.test(x)), 'not the primary inbox'); await ev(() => document.querySelector('[data-clx]').click()); await wt(300);
assert.match(await ev(() => document.querySelector('#inbUnsub').innerText), /news@promo\.example · Unsubscribed/);
// Add inbox: wrong password error, then success; password never kept in the browser
await ev(() => { document.querySelector('.inb-add').open = true }); await wt(100);
const fill = async p => ev(p => { document.querySelector('#inbNewL').value = 'Ops mail'; document.querySelector('#inbNewU').value = 'ops@x.example'; document.querySelector('#inbNewP').value = p; document.querySelector('[data-inbaddbox]').click() }, p);
await fill('wrongpassword'); await wt(600); assert.match(await ev(() => document.querySelector('#inbAddMsg').textContent), /wrong address or app password/); assert.equal(await ev(() => document.querySelector('#inbNewP').value), '');
await fill('abcd efgh ijkl mnop'); await wt(1000); assert.ok(reqs.some(x => x.startsWith('POST /inboxes {') && x.includes('"pass":"abcd efgh ijkl mnop"')));
assert.equal(await ev(() => document.querySelector('#inbPick').value), 'ops-mail'); assert.ok(!(await ev(() => JSON.stringify(localStorage))).includes('abcd efgh'), 'password not in localStorage');
await ev(() => document.querySelector('[data-inbdelbox]').click()); await wt(800); assert.ok(reqs.includes('DELETE /inboxes/ops-mail')); assert.equal(await ev(() => document.querySelector('#inbPick').value), 'yw-support');
await ev(() => ywSettings(false)); await wt(200);
// Yorri
let l = await say('open inbox settings'); assert.match(l, /Opened Settings → Inbox/); assert.equal(await ev(() => document.querySelector('#stab_inbox').getAttribute('aria-selected')), 'true');
l = await say('switch to Safe Rack inbox', 1400); assert.match(l, /Switched to .*Safe Rack.* \(read-only\) — Needs reply 2, Automated 1/); assert.equal(await ev(() => INB.iid), 'safe-rack-maint');
l = await say('what needs a reply in safe rack', 1200); assert.match(l, /2 need a reply in .*Safe Rack.*: New Work Request #1042 submitted: approval required \(WR #1042, needs approval\)/);
l = await say('what needs a reply in the your world apps inbox', 1500); assert.match(l, /1 needs a reply in Your World Apps › Support/);
l = await say('switch to the zebra inbox'); assert.match(l, /don’t see an inbox matching “zebra”/);
l = await say('what needs a reply'); assert.match(l, /needs a reply: App crashes/);
await ev(() => ywSettings(false));
assert.deepEqual(await ev(() => ycCoverage()), []);
console.log(out.join('\n')); console.log('errors:', errs); assert.deepEqual(errs, []); console.log('inboxes: all passed'); await b.close(); srv.close();
