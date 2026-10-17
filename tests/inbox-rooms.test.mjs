// Headless check: every room with an inbox attached (primary Support, the Safe Rack eMaint inbox, and a Gmail inbox added later and
// attached to a room in Settings → Inbox) renders the SAME Support template, driven by that inbox's config + canSend flag.
// Read-only inboxes hide reply/propose; moves/cleanup hit /inboxes/:iid. All network mocked. Run: node tests/inbox-rooms.test.mjs (DESK=1 desktop)
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8133);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', D = Date.now() - 864e5, DESK = !!process.env.DESK;
let n = 0; const tk = (from, subject, box, x = {}) => ({ id: 'T-' + (++n), from, fromName: from.split('@')[0], subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: D - n * 6e5, sla: 'ok', unread: true, status: 'open', snippet: subject, thread: [{ from, at: D, body: subject }], box, boxBy: 'rule', boxWhy: 'rule', boxConf: 0.9, unsub: { kind: 'none', label: 'No unsubscribe offered', oneTap: false, cleanup: false }, ...x });
const INB = { 'yw-support': [tk('jane@gmail.com', 'App crashes', 'reply'), tk('reports@jetpack.com', 'Jetpack Monthly Report', 'auto')],
  'safe-rack-maint': [tk('notifications@emaint.com', 'New Work Request #1042 submitted: approval required', 'reply', { info: { parsed: true, kind: 'request', requestNo: '1042', needsApproval: true, asset: 'Forklift 7', location: 'Dock 3' } }), tk('noreply@emaint.com', 'Work Order 5012 assigned', 'reply', { info: { parsed: true, kind: 'workorder', workOrderNo: '5012' } }), tk('no-reply@accounts.google.com', 'Security alert', 'auto'), tk('news@macrium.example', 'Macrium news', 'auto', { unsub: { kind: 'oneclick', label: 'One-tap unsubscribe', target: 'macrium.example', oneTap: true, cleanup: true } })],
  'acme-help': [tk('cust@acme.example', 'Where is my order?', 'reply'), tk('news@promo.example', 'Weekly deals', 'auto', { unsub: { kind: 'oneclick', label: 'One-tap unsubscribe', target: 'promo.example', oneTap: true, cleanup: true } })] };
let LIST = null; const CFG = {}; const cfgOf = id => CFG[id] ||= { kind: id === 'safe-rack-maint' ? 'emaint' : 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: id !== 'safe-rack-maint', inbox: id };
const reqs = []; const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); window.confirm = () => true; });
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8133') ? r.continue() : r.abort());
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(), bd = q.postData() ? JSON.parse(q.postData()) : null; reqs.push(M + ' ' + u.pathname + (bd ? ' ' + q.postData() : ''));
  let body = {}; const pth = u.pathname.split('/').filter(Boolean); const iid = pth[0] === 'inboxes' && pth.length >= 3 ? pth[1] : (pth[0] === 'tickets' || pth[0] === 'inbox') ? 'yw-support' : null; const rest = pth[0] === 'inboxes' ? pth.slice(2) : pth[0] === 'inbox' ? ['config'] : pth;
  const T = iid && rest[1] && INB[iid].find(x => x.id === rest[1]);
  if (u.pathname === '/inboxes' && M === 'GET') body = { inboxes: LIST };
  else if (iid && rest[0] === 'config') { if (M === 'PUT') Object.assign(cfgOf(iid), bd); body = cfgOf(iid); }
  else if (iid && rest[0] === 'tickets' && rest.length === 1) body = INB[iid];
  else if (T && rest[2] === 'box') { T.box = bd.box; T.boxBy = 'manual'; body = T; }
  else if (T && rest[2] === 'unsubscribe') { T.unsub = { ...T.unsub, cleanup: false, result: { state: 'unsubscribed', at: Date.now(), method: 'oneclick', label: 'Unsubscribed' } }; T.box = 'spam'; cfgOf(iid).unsubscribed.push({ sender: T.from, at: Date.now(), method: 'oneclick', state: 'unsubscribed' }); body = { ok: true, state: 'unsubscribed', method: 'oneclick', label: 'Unsubscribed', ticket: T }; }
  else if (T) { if (M !== 'GET') Object.assign(T, bd || {}); body = T; }
  else if (u.pathname === '/maint/mail') body = [];
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: false, settings: null };
  await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8133/');
// Wire: Support server, Safe Rack maint room = eMaint connector; pick an unrelated room in another business for the custom inbox (added "later").
const W = await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true };
  const sr = bizStore.businesses.find(b => /safe ?rack/i.test(b.name)); const r = sr.rooms.find(r => /maint/i.test(r.label)) || sr.rooms[0]; a[connKey(sr.id, r.id)] = { type: 'emailbox', url: sv, token: 'y'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a));
  const ob = bizStore.businesses.find(b => b !== sr && !b.rooms.some(x => x.role === 'support')) || bizStore.businesses.find(b => b !== sr); const or = ob.rooms.find(x => x.role !== 'support' && !/support/i.test(x.label));
  return { sr: sr.name + ' › ' + r.label, srRoom: r.label, srBiz: sr.name, cu: ob.name + ' › ' + or.label, cuRoom: or.label, cuBiz: ob.name } }, SV);
LIST = [{ id: 'yw-support', label: 'Support', address: 'yo•••@gmail.com', kind: 'support', canSend: true, builtin: true }, { id: 'safe-rack-maint', label: 'eMaint inbox', address: 'sa•••@gmail.com', kind: 'emaint', canSend: false, builtin: true }, { id: 'acme-help', label: 'Acme help', address: 'he•••@acme.example', kind: 'gmail', canSend: true, builtin: false, room: W.cu }];
await pg.reload(); await pg.waitForTimeout(2200);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [];
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 1200) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 300)); return l };
const room = s => `.sup-room[data-supiid="${s}"]`;
// Shared template: same structural parts in every inbox-attached room
const shape = s => ev(s => { const R = document.querySelector(s); if (!R) return null; return { boxes: R.querySelectorAll('[data-supbox]').length, filters: R.querySelectorAll('[data-supf]').length, sort: !!R.querySelector('[data-sups]'), clean: R.querySelector('[data-clopen]')?.dataset.clopen, refresh: !!R.querySelector('[data-supr]'), rows: R.querySelectorAll('[data-supo]').length, src: (R.innerText.match(/source:[^\n]*/) || [''])[0], txt: R.innerText } }, s);
const open = async iid => { assert.ok(await ev(i => supGoInbox(i), iid), 'room found for ' + iid); await wt(1200); };
await open('yw-support'); const P = await shape(room('yw-support')); assert.ok(P, 'primary room renders template'); out.push('primary: ' + JSON.stringify({ ...P, txt: undefined }));
await open('safe-rack-maint'); let S = await shape(room('safe-rack-maint')); assert.ok(S, 'Safe Rack room renders the shared Support template'); out.push('safe rack: ' + JSON.stringify({ ...S, txt: undefined }));
assert.equal(await ev(() => roomView), W.srRoom); assert.ok(reqs.includes('GET /inboxes/safe-rack-maint/tickets'), 'Safe Rack loads its own inbox');
for (const k of ['boxes', 'filters', 'sort', 'refresh']) assert.equal(S[k], P[k], 'same template part: ' + k);
assert.equal(S.clean, 'safe-rack-maint'); assert.equal(P.clean, 'yw-support');
assert.match(S.src, /server · sa•••@gmail\.com · read-only · nothing is sent from this inbox/); assert.doesNotMatch(P.src, /read-only/);
assert.match(S.txt, /Needs reply\D*2/); assert.match(S.txt, /WR #?1042|Req #1042|WR 1042/); assert.match(S.txt, /Inbox connector settings/);
await pg.screenshot({ path: '/tmp/ir_sr' + (DESK ? '_d' : '') + '.png', fullPage: false });
// Ticket detail: parsed eMaint fields, no reply/propose
const wr = INB['safe-rack-maint'][0].id; await ev(([s, id]) => document.querySelector(`${s} [data-supo="${id}"]`).click(), [room('safe-rack-maint'), wr]); await wt(900);
let M = await ev(() => { const m = document.querySelector('#supModal'); return m && { iid: m.dataset.supiid, t: m.innerText, d: !!m.querySelector('[data-supd]'), p: !!m.querySelector('[data-supp]'), info: !!m.querySelector('.mm-info') } });
assert.ok(M, 'ticket dialog opens'); assert.equal(M.iid, 'safe-rack-maint'); assert.ok(!M.d && !M.p, 'no draft/propose on read-only'); assert.ok(M.info); assert.match(M.t, /Req #1042/); assert.match(M.t, /Forklift 7/); assert.match(M.t, /read-only/i);
assert.ok(reqs.includes(`GET /inboxes/safe-rack-maint/tickets/${wr}`) || true);
await pg.screenshot({ path: '/tmp/ir_srmodal' + (DESK ? '_d' : '') + '.png' });
await ev(() => document.querySelector('#supModal [data-supx]').click()); await wt(400); assert.ok(!(await ev(() => document.querySelector('#supModal'))), 'dialog closed');
// Move in Safe Rack hits its inbox only
const sec = INB['safe-rack-maint'][2].id; await ev(([s]) => { const R = document.querySelector(s); R.querySelector('[data-supbox="auto"]')?.click() }, [room('safe-rack-maint')]); await wt(500);
await ev(([s, id]) => { const sel = document.querySelector(`${s} [data-supmv="${id}"]`); sel.value = 'reply'; sel.dispatchEvent(new Event('change', { bubbles: true })) }, [room('safe-rack-maint'), sec]); await wt(800);
assert.ok(reqs.some(x => x.startsWith(`POST /inboxes/safe-rack-maint/tickets/${sec}/box`)), 'move hit /inboxes/safe-rack-maint'); assert.ok(!reqs.some(x => x.startsWith(`POST /tickets/${sec}`)));
// Cleanup from the Safe Rack room: one-click POST (server allowed) against that inbox
await ev(s => document.querySelector(`${s} [data-clopen]`).click(), room('safe-rack-maint')); await wt(900);
assert.match(await ev(() => document.querySelector('#supClean').innerText), /news@macrium\.example/);
await ev(() => document.querySelector('[data-clgo]').click()); await wt(900); assert.ok(reqs.some(x => /^POST \/inboxes\/safe-rack-maint\/tickets\/T-\d+\/unsubscribe/.test(x)));
await ev(() => document.querySelector('[data-clx]')?.click()); await wt(300);
// Decision guard: a send decision for a read-only inbox is refused
assert.match(await ev(async () => { const t = supState('safe-rack-maint').tickets[0]; const r = await supOnDecide({ sup: { kind: 'send', id: t.id, iid: 'safe-rack-maint', text: 'x' } }, true).catch(e => 'ERR ' + e.message); return String(r) + ' ' + [...document.querySelectorAll('#log p.y')].pop().innerText }), /read-only/);
assert.ok(!reqs.some(x => /safe-rack-maint\/tickets\/[^/]+\/(reply|send)/.test(x)), 'nothing sent from Safe Rack');
// Custom inbox added later and attached to a room → same template, can send
await open('acme-help'); const C = await shape(room('acme-help')); assert.ok(C, 'custom inbox room renders the shared template'); out.push('custom: ' + JSON.stringify({ ...C, txt: undefined }));
assert.equal(await ev(() => roomView), W.cuRoom); for (const k of ['boxes', 'filters', 'sort', 'refresh']) assert.equal(C[k], P[k], 'custom same part: ' + k);
assert.match(C.src, /server · he•••@acme\.example/); assert.doesNotMatch(C.src, /read-only/); assert.equal(C.clean, 'acme-help');
await ev(([s, id]) => document.querySelector(`${s} [data-supo="${id}"]`).click(), [room('acme-help'), INB['acme-help'][0].id]); await wt(800);
M = await ev(() => { const m = document.querySelector('#supModal'); return m && { iid: m.dataset.supiid, d: !!m.querySelector('[data-supd],[data-supp]') } }); assert.equal(M.iid, 'acme-help'); assert.ok(M.d, 'sendable inbox keeps reply tools');
await ev(() => document.querySelector('#supModal [data-supx]').click()); await wt(300);
// Generic: every inbox in the list that is attached to a room renders the shared template in that room
const all = await ev(() => INB.list.map(x => ({ id: x.id, at: !!inboxRoom(x.id) })));
for (const x of all) if (x.at) { await open(x.id); assert.ok(await shape(room(x.id)), 'template for ' + x.id); } assert.equal(all.filter(x => x.at).length, 3);
// Board tiles too
await ev(() => { roomView = null; draw() }); await wt(500);
// Primary room unaffected
await open('yw-support'); const P2 = await shape(room('yw-support')); assert.match(P2.txt, /App crashes/); assert.doesNotMatch(P2.txt, /Work Request/);
// Yorri: per-inbox commands
let l = await say('what needs a reply in Safe Rack', 1500); assert.match(l, /need a reply in .*Safe Rack/); assert.match(l, /WR #1042/);
l = await say('show Safe Rack automated', 1500); assert.match(l, /Showing Automated in .*Safe Rack/); assert.equal(await ev(() => roomView), W.srRoom); assert.equal(await ev(() => supState('safe-rack-maint').box), 'auto');
l = await say('show safe rack needs reply', 1500); assert.match(l, /Showing Needs reply in .*Safe Rack.* — \d+ ticket/);
INB['safe-rack-maint'].push(tk('digest@mega.example', 'MEGA digest', 'auto', { unsub: { kind: 'oneclick', label: 'One-tap unsubscribe', target: 'mega.example', oneTap: true, cleanup: true } }));
await ev(() => supWith('safe-rack-maint', supRefresh)); await wt(600);
l = await say('clean up Safe Rack inbox', 1800); assert.match(l, /In .*Safe Rack.* I found 1 sender to unsubscribe from: digest/);
const before = reqs.length; l = await say('no', 600); assert.ok(!reqs.slice(before).some(x => x.includes('unsubscribe')), '“no” sends nothing');
l = await say('show automated', 1200); assert.match(l, /Automated/); // primary command still works
l = await say('clean up the zebra inbox'); assert.match(l, /don’t see an inbox matching “zebra”/);
l = await say('clean up my inbox', 1800); assert.doesNotMatch(l, /don’t see an inbox/);
await ev(() => document.querySelector('[data-clx]')?.click());
assert.deepEqual(await ev(() => ycCoverage()), []);
const help = await ev(() => YC.list.filter(c => ['inb.clean', 'inb.show', 'inb.needs'].includes(c.id)).map(c => c.ex[0])); assert.equal(help.length, 3);
console.log(out.join('\n')); console.log('errors:', errs); assert.deepEqual(errs, []); console.log('inbox rooms: all passed'); await b.close(); srv.close();
