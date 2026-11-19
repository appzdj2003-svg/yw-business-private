// Headless check: Command Deck Mail room (inbox from /mail store), Settings → Support mail + Resend,
// propose-then-approve send, AI options, Yorri commands, archive+Vault, delete+Trash. All network mocked.
// CAR=1 = car layout (48px targets). Screenshots under SHOTDIR or /workspace/support-mail/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
import { defaultYourWorldSig, renderSignature, normalizeSig } from '../../yw-business-server/mailsig.js';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8188);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/support-mail', tag = CAR ? 'car' : 'desk', SV = 'https://sv.test';
fs.mkdirSync(SHOT, { recursive: true });
const NOW = Date.now();
const ywSig = defaultYourWorldSig(NOW);
let sigs = { signatures: [ywSig], defaultId: 'yw', autoAppend: true };
const box = {
  m1: { id: 'm1', from: 'casey@example.com', fromName: 'Casey Lee', to: 'support@yourworldapps.si', cc: 'Ann Diaz <ann@example.com>, support@yourworldapps.si', subject: 'Widget outage on checkout', snippet: 'Checkout is failing for some users since noon.', text: 'Checkout is failing for some users since noon. Can you take a look today?', date: NOW - 3600e3, receivedAt: NOW - 3600e3, seen: false, label: 'inbox', urgent: false, out: false, pulled: true, attachments: [{ n: 0, name: 'screenshot.png', size: 20480, type: 'image/png' }] },
  m2: { id: 'm2', from: 'pat@example.com', fromName: 'Pat Nguyen', to: 'support@yourworldapps.si', subject: 'Thanks for the fix', snippet: 'All good on our side.', text: 'All good on our side. Thanks!', date: NOW - 86400e3, receivedAt: NOW - 86400e3, seen: true, label: 'inbox', urgent: false, out: false, pulled: true, attachments: [] },
  m3: { id: 'm3', from: 'support@yourworldapps.si', fromName: 'Your World Apps Support', to: 'old@example.com', subject: 'Re: Old thread', snippet: 'We looked into it.', text: 'We looked into it.', date: NOW - 2 * 86400e3, receivedAt: NOW - 2 * 86400e3, seen: true, label: 'replied', urgent: false, out: true, pulled: true, attachments: [] },
  m4: { id: 'm4', from: 'lee@example.com', fromName: 'Lee Ortiz', to: 'support@yourworldapps.si', subject: 'Billing question', snippet: 'Can you check my invoice?', text: 'Can you check my invoice?', date: NOW - 1800e3, receivedAt: NOW - 1800e3, seen: true, label: 'inbox', urgent: false, out: false, pulled: false, attachments: [] }
};
const HTML_BLOCK = '<p>Checkout is failing.</p><img src="https://evil.example/px.png" alt="x">';
const HTML_IMG = '<p>Checkout is failing.</p><img src="https://evil.example/px.png" alt="x">';
let imagesOn = false, sent = [], reqs = [];
const foldersOf = () => {
  const all = Object.values(box);
  const folders = { inbox: 0, reply: 0, replied: 0, archived: 0, spam: 0, trash: 0 };
  for (const m of all) folders[m.label] = (folders[m.label] || 0) + 1;
  return folders;
};
const listOf = (u) => {
  const label = u.searchParams.get('label') || 'inbox';
  const q = (u.searchParams.get('q') || '').toLowerCase();
  let items = Object.values(box).filter(m => (m.label || 'inbox') === label);
  if (q) items = items.filter(m => [m.from, m.fromName, m.subject, m.snippet, m.text].some(v => String(v || '').toLowerCase().includes(q)));
  items = items.slice().sort((a, b) => (b.date || 0) - (a.date || 0));
  return { items, folders: foldersOf(), unread: Object.values(box).filter(m => !m.seen && !m.out && m.label !== 'archived' && m.label !== 'spam' && m.label !== 'trash').length, total: items.length, trashUnpulled: Object.values(box).filter(m => m.label === 'trash' && !m.pulled).length };
};
const ctx = await b.newContext({ viewport: { width: CAR ? 1200 : 1440, height: 1100 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => { if (!/sandboxed and lacks the 'allow-same-origin' flag/.test(e.message)) errs.push(e.message); });
pg.on('dialog', d => d.accept());
await pg.addInitScript(car => {
  try {
    localStorage.setItem('ywUnlock', '1');
    localStorage.setItem('ywYorriSpeak', '0');
    localStorage.setItem('ywMockData', '0');
    localStorage.setItem('ywCarLayout', car ? '1' : '0');
    localStorage.setItem('ywLlm', JSON.stringify({ key: 'x'.repeat(40), base: 'https://api.x.ai/v1', model: 'grok-4' }));
    localStorage.setItem('ywA11y', JSON.stringify({ theme: 'dark' }));
  } catch (e) {}
}, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8188') ? r.continue() : r.abort());
await ctx.route('https://api.x.ai/**', async r => {
  const raw = r.request().postData() || '';
  let content = '• Checkout is failing since noon\n• Casey asks for a look today\n• Flag as urgent';
  if (/Draft a reply/i.test(raw)) content = 'Hi Casey — thanks for flagging the checkout issue. We are looking into it and will update you shortly.';
  if (/Suggest one label/i.test(raw)) content = 'Needs reply, high priority: a customer outage. LABEL: reply';
  if (/URGENT:/i.test(raw) && /If this email is urgent/i.test(raw)) content = 'URGENT: yes — checkout is down for users today.';
  if (/Extract concrete action items/i.test(raw)) content = 'TASK: Investigate checkout outage\nTASK: Reply to Casey today';
  if (/Translate this email/i.test(raw)) content = 'Already in English. Tighter: Checkout has been failing for some users since noon; they want a look today.';
  await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify({ choices: [{ message: { content } }] }) });
});
await ctx.route(SV + '/**', async r => {
  const q = r.request(), u = new URL(q.url()), M = q.method(), raw = q.postData(), bd = raw ? (() => { try { return JSON.parse(raw) } catch { return null } })() : null;
  reqs.push({ m: M, p: u.pathname, b: bd, search: u.search });
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
  if (M === 'OPTIONS') return r.fulfill({ status: 204, headers: cors, body: '' });
  const P = u.pathname;
  let body = {}, st = 200, ctype = 'application/json', bin = null;
  if (P === '/healthz') body = { ok: true, build: 'mailtest' };
  else if (P === '/toggles' && M === 'GET') body = { connections: [{ id: 'supportmail', name: 'Support mail (domain copy)', on: true }, { id: 'resend', name: 'Resend (support@ send)', on: true }], at: Date.now(), storeOk: true };
  else if (P === '/toggles' && M === 'PUT') body = { connections: [{ id: bd.id, name: bd.id, on: !!bd.on }], at: Date.now(), storeOk: true };
  else if (P === '/mail/health') body = { configured: true, count: Object.keys(box).length, unpulled: 2, lastReceivedAt: NOW - 3600e3, lastPullAt: NOW - 7200e3 };
  else if (P === '/mail/send-health') body = { configured: true, lastSentAt: sent.at(-1)?.at || null, lastError: null, sentCount: sent.length, from: 'Your World Apps Support <support@yourworldapps.si>' };
  else if (P === '/mail/list' || P === '/mail/search') body = listOf(u);
  else if (P.startsWith('/mail/thread/')) body = { id: P.split('/')[3], items: [box[P.split('/')[3]]].filter(Boolean) };
  else if (P.startsWith('/mail/message/')) {
    const id = P.split('/')[3]; const m = box[id]; if (!m) { st = 404; body = { error: 'not found' }; }
    else {
      const imgs = u.searchParams.get('images') === '1'; if (imgs) imagesOn = true;
      const html = imgs ? HTML_IMG : HTML_BLOCK.replace('src="https://evil.example/px.png"', 'data-blocked-src="https://evil.example/px.png"');
      body = { ...m, html };
    }
  } else if (P.startsWith('/mail/attachment/')) {
    const name = 'screenshot.png';
    bin = Buffer.from('fake-png');
    return r.fulfill({ status: 200, contentType: 'image/png', headers: { ...cors, 'content-disposition': `attachment; filename="${name}"` }, body: bin });
  } else if (P === '/mail/read' && M === 'POST') { (bd.ids || []).forEach(id => { if (box[id]) box[id].seen = bd.read !== false; }); body = { ok: true }; }
  else if (P === '/mail/label' && M === 'POST') { (bd.ids || []).forEach(id => { if (box[id]) { if (bd.label) box[id].label = bd.label; if (bd.urgent != null) box[id].urgent = !!bd.urgent; } }); body = { ok: true }; }
  else if (P === '/mail/archive' && M === 'POST') { (bd.ids || []).forEach(id => { if (box[id]) box[id].label = 'archived'; }); body = { ok: true, label: 'archived' }; }
  else if (P === '/mail/trash' && M === 'POST') { (bd.ids || []).forEach(id => { if (box[id] && box[id].label !== 'trash') { box[id].prevLabel = box[id].label; box[id].label = 'trash'; } }); body = { ok: true, updated: (bd.ids || []).length, label: 'trash' }; }
  else if (P === '/mail/restore' && M === 'POST') { let n = 0; (bd.ids || []).forEach(id => { if (box[id] && box[id].label === 'trash') { box[id].label = box[id].prevLabel || 'inbox'; delete box[id].prevLabel; n++; } }); body = { ok: true, updated: n }; }
  else if (P === '/mail/purge' && M === 'POST') { const ids = (bd.ids || []).filter(id => box[id] && box[id].label === 'trash'); const unpulled = ids.filter(id => box[id] && !box[id].pulled).length; ids.forEach(id => delete box[id]); body = { ok: true, purged: ids.length, unpulled, ids }; }
  else if ((P === '/mail/empty-trash' || P === '/mail/emptytrash') && M === 'POST') { const ids = Object.keys(box).filter(id => box[id].label === 'trash'); const unpulled = ids.filter(id => !box[id].pulled).length; ids.forEach(id => delete box[id]); body = { ok: true, purged: ids.length, unpulled, ids }; }
  else if (P.startsWith('/mail/forward/') && M === 'GET') { const m = box[P.split('/')[3]]; if (!m) { st = 404; body = { error: 'not found' }; } else body = { subject: 'Fwd: ' + m.subject, text: '', attachments: (m.attachments || []).map(a => ({ name: a.name, type: a.type, size: a.size })), skipped: [], original: { id: m.id }, maxRecipients: 20 }; }
  else if ((P === '/mail/reply' || P === '/mail/compose' || P === '/mail/forward') && M === 'POST') {
    if (!bd || bd.approved !== true) { st = 400; body = { error: 'requires {approved:true}' }; }
    else { const to = [].concat(bd.to || (box[bd.id] && box[bd.id].from) || []); const rec = { at: Date.now(), path: P, to: to.join(', '), toList: to, cc: bd.cc || [], bcc: bd.bcc || [], attachments: bd.attachments, id: bd.id, body: bd.body, html: bd.html, subject: bd.subject }; sent.push(rec); body = { ok: true, messageId: '<t@support.yourworldapps.si>', resendId: 're_test', via: 'resend', to: to.join(', '), cc: bd.cc || [], bcc: bd.bcc || [], attachments: P === '/mail/forward' && bd.attachments !== false ? 1 : 0, from: 'Your World Apps Support <support@yourworldapps.si>' }; }
  } else if (P === '/mail/signatures' && M === 'GET') body = sigs;
  else if (P === '/mail/signatures' && M === 'PUT') {
    if (Array.isArray(bd.signatures)) sigs.signatures = bd.signatures.map(x => normalizeSig(x, { now: NOW }));
    if (!sigs.signatures.length) sigs.signatures = [defaultYourWorldSig(NOW)];
    if (bd.defaultId) sigs.defaultId = bd.defaultId;
    if (bd.autoAppend != null) sigs.autoAppend = !!bd.autoAppend;
    body = sigs;
  } else if (P === '/mail/signatures/preview' && M === 'POST') body = renderSignature(normalizeSig(bd || {}, { now: NOW }), { now: NOW });
  else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
  else if (P === '/tickets' || P === '/maint/mail') body = [];
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null };
  else body = {};
  await r.fulfill({ status: st, contentType: ctype, headers: cors, body: JSON.stringify(body) });
});
await pg.goto('http://127.0.0.1:8188/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, SV);
await pg.reload({ waitUntil: 'domcontentloaded' });
await pg.evaluate(() => { try { ywA11yResolve({ theme: 'dark' }); } catch (e) { document.documentElement.removeAttribute('data-theme'); } });
await pg.waitForTimeout(800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop()?.innerText.replace(/\s+/g, ' ') || '');
const shot = async (name, sel) => {
  if (sel) await ev(s => { const n = document.querySelector(s); if (n) { if (n.tagName === 'DETAILS') n.open = true; n.scrollIntoView({ block: 'center' }); } }, sel);
  await wt(300);
  await pg.screenshot({ path: `${SHOT}/${tag}-${name}.png` });
};
const minH = CAR ? 48 : 44;

// ---- Nav includes Mail, room opens
assert.equal(await ev(() => !!(window.mailRender && window.mailLoad && window.smLoad)), true, 'mail + settings fns');
assert.ok(await ev(() => [...document.querySelectorAll('#nav button')].some(b => b.textContent === 'Mail')), 'Mail in main nav');
await ev(() => { const b = [...document.querySelectorAll('#nav button')].find(x => x.textContent === 'Mail'); b.click(); });
await wt(800);
assert.match(await ev(() => document.querySelector('.mail-room')?.innerText || ''), /Casey Lee/);
assert.match(await ev(() => document.querySelector('.mail-room')?.innerText || ''), /Widget outage on checkout/);
assert.match(await ev(() => document.querySelector('.mail-room')?.innerText || ''), /Checkout is failing/);
const unreadBold = await ev(() => { const r = document.querySelector('[data-mailopen="m1"]'); return r && r.classList.contains('unread') && getComputedStyle(r).fontWeight >= 600; });
assert.ok(unreadBold, 'unread is bold');
assert.equal(await ev(() => document.querySelector('[data-mailopen="m2"]').classList.contains('unread')), false);
const hFolder = await ev(() => Math.round(document.querySelector('[data-mailfolder="inbox"]').getBoundingClientRect().height));
assert.ok(hFolder >= minH, 'folder target ' + hFolder);
const hSearch = await ev(() => Math.round(document.querySelector('#mailQ').getBoundingClientRect().height));
assert.ok(hSearch >= minH, 'search target ' + hSearch);
await shot('mail-inbox', '.mail-room');

// ---- Flicker guards: no backdrop blur on chrome, no tight board rewrite loop
const fx = await ev(() => {
  const h = document.querySelector('header');
  const cs = h ? getComputedStyle(h) : null;
  const card = document.querySelector('#board .card');
  const ccs = card ? getComputedStyle(card) : null;
  const before = getComputedStyle(document.body, '::before');
  return {
    bf: (cs && (cs.backdropFilter || cs.webkitBackdropFilter)) || 'none',
    cardAnim: (ccs && ccs.animationName) || 'none',
    before: before && before.content,
    beforeDisp: before && before.display
  };
});
assert.equal(fx.bf, 'none', 'header backdrop-filter should be off, got ' + fx.bf);
assert.ok(!fx.cardAnim || fx.cardAnim === 'none', 'card should not animate, got ' + fx.cardAnim);
const burst = await ev(async () => {
  const el = document.getElementById('board');
  let cuts = 0;
  const mo = new MutationObserver(() => { cuts++; });
  mo.observe(el, { childList: true });
  await new Promise(r => setTimeout(r, 1600));
  mo.disconnect();
  return cuts;
});
assert.ok(burst <= 1, 'Mail board rewrite burst after settle: ' + burst);
await shot('mail-inbox-t1', '.mail-room');
await wt(400);
await shot('mail-inbox-t2', '.mail-room');
await wt(400);
await shot('mail-inbox-t3', '.mail-room');

// ---- Thread: sandboxed iframe, images blocked, Load images, attachments
await ev(() => document.querySelector('[data-mailopen="m1"]').click());
await wt(700);
const iframe = await ev(() => { const f = document.querySelector('#mailHtml'); if (!f) return null; return { sandbox: f.getAttribute('sandbox') || '', srcdoc: f.srcdoc || '', allow: f.getAttribute('allow') || '' }; });
assert.ok(iframe, 'html iframe');
assert.doesNotMatch(iframe.sandbox, /allow-scripts/);
assert.doesNotMatch(iframe.sandbox, /allow-same-origin/);
assert.match(iframe.srcdoc, /data-blocked-src|Checkout is failing/);
assert.doesNotMatch(iframe.srcdoc, /<img[^>]*\ssrc=/);
assert.ok(reqs.some(x => x.p === '/mail/message/m1' && !/images=1/.test(x.search || '')), 'message without images first');
await ev(() => document.querySelector('[data-mailact="images"]').click());
await wt(500);
assert.ok(reqs.some(x => x.p === '/mail/message/m1' && /images=1/.test(x.search || '')), 'Load images');
assert.ok(await ev(() => /<img[^>]*\ssrc="https:\/\/evil\.example\/px\.png"/.test(document.querySelector('#mailHtml').srcdoc || '')), 'images after load');
assert.match(await ev(() => document.querySelector('.mail-thread').innerText), /screenshot\.png/);
assert.ok(await ev(() => !!document.querySelector('.mail-thread [data-mailact="trash"]')), 'Delete next to Archive');
assert.match(await ev(() => document.querySelector('.mail-thread [data-mailact="trash"]')?.textContent || ''), /Delete/);
const hDel = await ev(() => Math.round(document.querySelector('.mail-thread [data-mailact="trash"]').getBoundingClientRect().height));
assert.ok(hDel >= minH, 'Delete target ' + hDel);
await shot('mail-thread', '.mail-room');
await shot('mail-delete', '.mail-room');

// ---- Search
await ev(() => { const q = document.querySelector('#mailQ'); q.value = 'outage'; MAIL.q = 'outage'; });
await ev(() => document.querySelector('[data-mailact="search"]').click());
await pg.waitForFunction(() => document.querySelector('[data-mailopen="m1"]') && !document.querySelector('[data-mailopen="m2"]'), { timeout: 8000 });
assert.ok(await ev(() => !!document.querySelector('[data-mailopen="m1"]')));
assert.equal(await ev(() => !!document.querySelector('[data-mailopen="m2"]')), false, 'search hides non-match');
await ev(() => { const q = document.querySelector('#mailQ'); q.value = ''; MAIL.q = ''; });
await ev(() => document.querySelector('[data-mailact="search"]').click());
await pg.waitForFunction(() => document.querySelector('[data-mailopen="m1"]') && document.querySelector('[data-mailopen="m2"]'), { timeout: 8000 });

// ---- AI: summarize + draft into editor (nothing sent)
const nSent = sent.length;
await ev(() => document.querySelector('[data-mailai="summarize"]').click());
await wt(1200);
assert.match(await ev(() => document.querySelector('#mailAiOut')?.innerText || ''), /Checkout is failing|noon|urgent/i);
await ev(() => document.querySelector('[data-mailai="draft"]').click());
await wt(1200);
const draft = await ev(() => document.querySelector('#mailDraft')?.value || '');
assert.match(draft, /Hi Casey/);
assert.equal(sent.length, nSent, 'AI draft does not send');
await shot('mail-ai-draft', '.mail-thread');

// ---- Extract tasks, add to Command task list
await ev(() => document.querySelector('[data-mailai="tasks"]').click());
await wt(1200);
assert.ok(await ev(() => !!document.querySelector('[data-mailaddtask]')));
await ev(() => document.querySelector('[data-mailaddtask="0"]').click());
await wt(300);
assert.match(await ev(() => document.querySelector('.mail-tasks')?.innerText || ''), /Investigate checkout outage/);
assert.ok(await ev(() => auditList().some(a => a.decision === 'TASK ADDED' && /Investigate/.test(a.title))), 'task logged to Vault');

// ---- Propose reply, then Approve — only then POST /mail/reply with approved:true
await ev(() => document.querySelector('[data-mailact="propose"]').click());
await wt(500);
assert.equal(sent.length, nSent, 'propose does not send');
assert.match(await ev(() => document.querySelector('#queue')?.innerText || ''), /Send reply to casey@example.com/);
await ev(() => document.querySelector('#queue button[data-i]')?.click());
await wt(800);
assert.equal(sent.length, nSent + 1, 'approved send');
assert.deepEqual({ path: sent.at(-1).path, approved: true }, { path: '/mail/reply', approved: true });
assert.ok(reqs.some(x => x.p === '/mail/reply' && x.b && x.b.approved === true && x.b.id === 'm1' && /Casey/.test(x.b.body || '')), 'reply body + approved');
assert.ok(await ev(() => auditList().some(a => /SENT via Resend/.test(a.decision))), 'send logged to Vault');
assert.match(await last(), /Sent via Resend/);

// Decline path: compose, propose, decline — no send
const n2 = sent.length;
await ev(() => document.querySelector('[data-mailact="compose"]').click());
await wt(200);
await ev(() => { document.querySelector('#mailTo').value = 'new@example.com'; document.querySelector('#mailSubj').value = 'Follow up'; document.querySelector('#mailDraft').value = 'Thanks for writing in.'; });
await ev(() => document.querySelector('[data-mailact="propose-new"]').click());
await wt(400);
await ev(() => document.querySelector('#queue button[data-x]')?.click());
await wt(400);
assert.equal(sent.length, n2, 'decline sends nothing');
assert.match(await last(), /Nothing sent/i);

// Compose + approve does send (different subject so qKey isn't blocked by the declined card)
await ev(() => document.querySelector('[data-mailact="compose"]').click());
await wt(200);
await ev(() => { document.querySelector('#mailTo').value = 'approved@example.com'; document.querySelector('#mailSubj').value = 'Shipping update'; document.querySelector('#mailDraft').value = 'Your order is on the way.'; });
await ev(() => document.querySelector('[data-mailact="propose-new"]').click());
await wt(400);
assert.match(await ev(() => document.querySelector('#queue')?.innerText || ''), /Shipping update/);
await ev(() => document.querySelector('#queue button[data-i]')?.click());
await wt(800);
assert.ok(sent.some(x => x.path === '/mail/compose' && x.to === 'approved@example.com'), 'compose approved');

// ---- Archive (confirm accepted by dialog hook) + Vault + folder
imagesOn = false;
await ev(() => { const b = [...document.querySelectorAll('#nav button')].find(x => x.textContent === 'Mail'); b.click(); });
await wt(400);
if (!await ev(() => !!document.querySelector('[data-mailopen="m2"]'))) {
  await ev(() => { MAIL.label = 'inbox'; MAIL.q = ''; });
  await ev(() => mailLoad(true));
  await wt(400);
}
await ev(() => document.querySelector('[data-mailopen="m2"]').click());
await wt(400);
await ev(() => document.querySelector('[data-mailact="archive"]').click());
await wt(700);
assert.equal(box.m2.label, 'archived');
assert.ok(await ev(() => auditList().some(a => a.decision === 'ARCHIVED')), 'archive logged to Vault');
await ev(() => document.querySelector('[data-mailfolder="archived"]').click());
await wt(400);
assert.ok(await ev(() => !!document.querySelector('[data-mailopen="m2"]')), 'archived folder shows it');

// ---- Delete → confirm → Trash + undo + restore + delete forever + empty trash
await ev(() => document.querySelector('[data-mailfolder="inbox"]').click());
await wt(400);
if (!await ev(() => !!document.querySelector('[data-mailopen="m4"]'))) { await ev(() => { MAIL.label = 'inbox'; MAIL.q = ''; }); await ev(() => mailLoad(true)); await wt(400); }
await ev(() => document.querySelector('[data-mailopen="m4"]').click());
await wt(400);
assert.ok(await ev(() => !!document.querySelector('.mail-thread [data-mailact="trash"]')));
await ev(() => document.querySelector('.mail-thread [data-mailact="trash"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
assert.match(await ev(() => document.querySelector('#mailAsk')?.innerText || ''), /Trash|Delete this email/i);
assert.match(await ev(() => document.querySelector('#mailAsk')?.innerText || ''), /Billing question/);
const hAsk = await ev(() => Math.round(document.querySelector('#mailAsk [data-mailask="1"]').getBoundingClientRect().height));
assert.ok(hAsk >= minH, 'confirm Delete target ' + hAsk);
await shot('mail-delete-confirm', '.mail-room');
// Cancel leaves it
await ev(() => document.querySelector('#mailAsk [data-mailask="0"]').click());
await wt(300);
assert.equal(box.m4.label, 'inbox');
await ev(() => document.querySelector('.mail-thread [data-mailact="trash"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
await ev(() => document.querySelector('#mailAsk [data-mailask="1"]').click());
await wt(700);
assert.equal(box.m4.label, 'trash');
assert.ok(await ev(() => auditList().some(a => a.decision === 'MOVED TO TRASH' && /Billing question/.test(a.title))), 'delete logged to Vault');
assert.ok(await ev(() => !document.querySelector('#ywToast')?.hidden && /Trash/.test(document.querySelector('#ywToast')?.innerText || '')), 'undo toast');
assert.ok(await ev(() => !!document.querySelector('#toastUndo')));
await ev(() => document.querySelector('#toastUndo').click());
await wt(700);
assert.equal(box.m4.label, 'inbox', 'undo restores');
assert.ok(await ev(() => auditList().some(a => a.decision === 'RESTORED (undo)')), 'undo logged');
// Delete again and open Trash
await ev(() => { MAIL.label = 'inbox'; MAIL.q = ''; MAIL.open = null; });
await ev(() => mailLoad(true));
await wt(400);
await ev(() => document.querySelector('[data-mailopen="m4"]').click());
await wt(400);
await ev(() => document.querySelector('.mail-thread [data-mailact="trash"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
await ev(() => document.querySelector('#mailAsk [data-mailask="1"]').click());
await wt(700);
assert.equal(box.m4.label, 'trash');
await ev(() => document.querySelector('[data-mailfolder="trash"]').click());
await wt(500);
assert.ok(await ev(() => !!document.querySelector('[data-mailopen="m4"]')), 'trash folder shows it');
assert.match(await ev(() => document.querySelector('[data-mailfolder="trash"]')?.innerText || ''), /Trash/);
assert.ok(await ev(() => !!document.querySelector('[data-mailact="empty-trash"]')), 'Empty trash button');
await ev(() => document.querySelector('[data-mailopen="m4"]').click());
await wt(400);
assert.ok(await ev(() => !!document.querySelector('.mail-thread [data-mailact="restore"]')));
assert.ok(await ev(() => !!document.querySelector('.mail-thread [data-mailact="purge"]')));
const hRest = await ev(() => Math.round(document.querySelector('.mail-thread [data-mailact="restore"]').getBoundingClientRect().height));
assert.ok(hRest >= minH, 'Restore target ' + hRest);
await shot('mail-trash', '.mail-room');
await ev(() => document.querySelector('.mail-thread [data-mailact="restore"]').click());
await wt(700);
assert.equal(box.m4.label, 'inbox');
assert.ok(await ev(() => auditList().some(a => a.decision === 'RESTORED' && !/undo/.test(a.decision))), 'restore logged');
// Delete forever + empty trash (m4 unpulled note)
await ev(() => { MAIL.label = 'inbox'; MAIL.open = null; });
await ev(() => mailLoad(true));
await wt(400);
await ev(() => document.querySelector('[data-mailopen="m4"]').click());
await wt(400);
await ev(() => document.querySelector('.mail-thread [data-mailact="trash"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
await ev(() => document.querySelector('#mailAsk [data-mailask="1"]').click());
await wt(600);
await ev(() => document.querySelector('[data-mailfolder="trash"]').click());
await wt(400);
await ev(() => document.querySelector('[data-mailopen="m4"]').click());
await wt(400);
await ev(() => document.querySelector('.mail-thread [data-mailact="purge"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
assert.match(await ev(() => document.querySelector('#mailAsk')?.innerText || ''), /Permanently delete|Delete forever|not been copied/i);
await ev(() => document.querySelector('#mailAsk [data-mailask="0"]').click());
await wt(200);
assert.ok(box.m4, 'cancel keeps it');
// Empty trash with the unpulled item still in trash
await ev(() => document.querySelector('[data-mailact="empty-trash"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
assert.match(await ev(() => document.querySelector('#mailAsk')?.innerText || ''), /Empty trash|Permanently delete/i);
assert.match(await ev(() => document.querySelector('#mailAsk')?.innerText || ''), /not been copied to your PC/i);
await ev(() => document.querySelector('#mailAsk [data-mailask="1"]').click());
await wt(700);
assert.equal(box.m4, undefined, 'emptied');
assert.ok(await ev(() => auditList().some(a => /EMPTIED TRASH/.test(a.decision))), 'empty trash logged');
assert.ok(box.m1 && box.m1.label !== 'trash', 'did not delete other mail');

// ---- Settings card
await ev(() => { ywSettings(true); setTab('connections'); });
await wt(900);
await ev(() => { const c = document.querySelector('#smCard'); if (c) c.open = true; });
await wt(200);
const card = await ev(() => document.querySelector('#smCard')?.innerText || '');
const cardHtml = await ev(() => document.querySelector('#smCard')?.innerHTML || '');
assert.match(card, /Support mail/);
assert.match(card, /Ingest token \(Render\):/);
assert.match(card, /Resend/);
assert.match(card, /RESEND_API_KEY|API key set/);
assert.match(card, /Last received/);
assert.match(card, /Last PC pull/);
assert.match(card, /FORWARD_TO_GMAIL|Gmail forwarding/);
assert.match(cardHtml, /Do not change the root MX/);
assert.match(cardHtml, /MAIL_INGEST_TOKEN/);
assert.match(cardHtml, /DNS only/);
assert.ok(await ev(() => !!document.querySelector('#smCard [data-tgsw="supportmail"]')));
assert.ok(await ev(() => !!document.querySelector('#smCard [data-tgsw="resend"]')));
const hSw = await ev(() => Math.round(document.querySelector('#smCard [data-tgsw="supportmail"]').getBoundingClientRect().height));
assert.ok(hSw >= minH, 'supportmail switch ' + hSw);
await ev(() => { const c = document.querySelector('#smCard'); if (c) c.open = true; });
await shot('settings-support-mail', '#smCard');
assert.match(card + (await ev(() => document.querySelector('#sigBox')?.innerText || '')), /Signature/);
assert.match(await ev(() => document.querySelector('#sigBox')?.innerText || ''), /Your World|Aaron Burgan|Founder/);
await ev(() => document.querySelector('#sigBox [data-sigact="edit"]')?.click());
await pg.waitForFunction(() => !!document.querySelector('#sigTitle'), { timeout: 8000 });
assert.equal(await ev(() => document.querySelector('#sigTitle')?.value || ''), 'Founder & CEO, Your World Apps');
assert.ok(await ev(() => !document.querySelector('#sigTitle').readOnly && !document.querySelector('#sigTitle').disabled), 'title is editable');
const hTitle = await ev(() => Math.round(document.querySelector('#sigTitle').getBoundingClientRect().height));
assert.ok(hTitle >= minH, 'title field ' + hTitle);
await ev(() => document.querySelector('#sigTitle').fill?.('x') || true);
await pg.waitForFunction(() => /Your World Weather Radar|FEATURED|Apps for your whole world/.test(document.querySelector('#sigPrevLight')?.innerText || document.querySelector('.sig-paper')?.innerText || ''), { timeout: 8000 });
assert.match(await ev(() => (document.querySelector('#sigPrevLight')?.innerText || '') + (document.querySelector('#sigPrevDark')?.innerText || '')), /Aaron Burgan/);
assert.match(await ev(() => document.querySelector('#sigPrevLight')?.innerHTML || ''), /Founder &amp; CEO, Your World Apps|Founder & CEO, Your World Apps/);
assert.doesNotMatch(await ev(() => (document.querySelector('#sigPrevLight')?.innerText || '') + (document.querySelector('#sigPrevDark')?.innerText || '')), /Travel/);
assert.doesNotMatch(await ev(() => document.querySelector('#sigPrevLight')?.innerHTML || ''), /business\.yourworldapps\.si/);
await shot('mail-signature', '#sigAsk');
await ev(() => document.querySelector('#sigTitle').value = 'Founder & CEO, Your World Apps');
await ev(() => document.querySelector('[data-sigact="save"]').click());
await wt(500);

// Connection status rows
await ev(() => { const c = document.querySelector('#csCard'); if (c) { c.open = true; } csLoad(true); });
await wt(600);
assert.ok(await ev(() => !!document.querySelector('#csCard [data-tgsw="supportmail"]')));
assert.ok(await ev(() => !!document.querySelector('#csCard [data-tgsw="resend"]')));

// ---- Yorri commands
await ev(() => ywSettings(false));
await ev(() => ask('open mail'));
await wt(700);
assert.ok(await ev(() => !!document.querySelector('.mail-room') && roomView === 'Mail'));
await ev(() => ask('read my latest email'));
await wt(1500);
assert.match(await last(), /Widget outage on checkout/);
await ev(() => ask('summarize unread mail'));
await wt(1200);
assert.match(await last(), /unread/i);
await ev(() => ask('draft a reply to the last email'));
await wt(1500);
assert.match(await ev(() => document.querySelector('#mailDraft')?.value || ''), /Casey|checkout|looking into it/i);
await ev(() => ask('turn off gmail forward'));
await wt(400);
assert.match(await last(), /FORWARD_TO_GMAIL|Cloudflare Worker/);
await ev(() => ask('check support mail'));
await wt(900);
assert.match(await last(), /ingest|Resend|waiting for the PC/i);
assert.ok(await ev(() => document.querySelector('#smCard')?.open), 'status opens the card');
await shot('settings-after-yorri', '#smCard');
await ev(() => { ywSettings(false); setPageView('command'); roomView = 'Mail'; MAIL.label = 'inbox'; MAIL.q = ''; MAIL.open = null; mailLoad(true); });
await wt(500);
await ev(() => ask('show trash'));
await wt(800);
assert.equal(await ev(() => MAIL.label), 'trash');
assert.match(await last(), /Trash/i);
await ev(() => ask('delete the last email'));
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
assert.match(await ev(() => document.querySelector('#mailAsk')?.innerText || ''), /Trash|Delete/i);
await ev(() => document.querySelector('#mailAsk [data-mailask="1"]').click());
await wt(800);
assert.ok(Object.values(box).some(m => m.label === 'trash'), 'yorri delete moved one to trash');
await ev(() => ask('show trash'));
await wt(500);
await ev(() => ask('restore this email'));
await wt(800);
assert.ok(await ev(() => auditList().some(a => a.decision === 'RESTORED' || a.decision === 'RESTORED (undo)')), 'yorri restore logged');
await ev(() => ask('empty trash'));
await wt(500);
// trash may already be empty after restore; if a confirm appears, cancel so we don't wipe leftover test mail
if (await ev(() => !!document.querySelector('#mailAsk'))) {
  await ev(() => document.querySelector('#mailAsk [data-mailask="0"]').click());
  await wt(200);
}
await ev(() => { ywSettings(false); setPageView('command'); roomView = 'Mail'; MAIL.label = 'inbox'; MAIL.q = ''; MAIL.noSig = false; mailLoad(true); });
await wt(600);
if (!await ev(() => !!document.querySelector('[data-mailopen="m1"]'))) { await ev(() => { MAIL.label = 'inbox'; }); await ev(() => mailLoad(true)); await wt(400); }
await ev(() => document.querySelector('[data-mailopen="m1"]').click());
await wt(500);
await ev(() => document.querySelector('[data-mailact="reply"]').click());
await pg.waitForFunction(() => /Aaron Burgan|Founder & CEO|Apps for your whole world/.test(document.querySelector('#mailDraft')?.value || ''), { timeout: 8000 });
assert.match(await ev(() => document.querySelector('#mailDraft')?.value || ''), /Aaron Burgan/);
assert.match(await ev(() => document.querySelector('#mailDraft')?.value || ''), /Founder & CEO, Your World Apps/);
assert.match(await ev(() => document.querySelector('#mailDraft')?.value || ''), /weather\.yourworldapps\.si|Your World Weather Radar/);
assert.ok(await ev(() => !!document.querySelector('#mailSigBtn')));
const hSig = await ev(() => Math.round(document.querySelector('#mailSigBtn').getBoundingClientRect().height));
assert.ok(hSig >= minH, 'Signature button ' + hSig);
await ev(() => { const n = document.querySelector('#mailDraft'); if (n) n.scrollTop = n.scrollHeight; const t = document.querySelector('#ywToast'); if (t) t.hidden = true; });
await pg.waitForFunction(() => /Aaron Burgan/.test(document.querySelector('#mailSigPrev')?.innerText || ''), { timeout: 8000 });
assert.match(await ev(() => document.querySelector('#mailSigPrev')?.innerText || ''), /Founder & CEO, Your World Apps/);
await ev(() => document.querySelector('#mailSigPrev')?.scrollIntoView({ block: 'center' }));
await shot('mail-signature-preview', '.mail-thread');
await ev(() => ask('turn signature off'));
await wt(800);
assert.match(await last(), /off|Signature/i);
await ev(() => ask('edit signature'));
await pg.waitForFunction(() => !!document.querySelector('#sigTitle'), { timeout: 8000 });
assert.equal(await ev(() => document.querySelector('#sigTitle')?.value || ''), 'Founder & CEO, Your World Apps');
await ev(() => document.querySelector('[data-sigact="close"]').click());
await wt(200);

const help = await ev(() => (typeof ycListHTML === 'function' ? ycListHTML('mail') : YC.list.filter(c => c.group === 'Mail').map(c => c.ex.join(' ')).join(' ')));
assert.match(help, /read my latest email/);
assert.match(help, /summarize unread mail/);
assert.match(help, /draft a reply to the last email/);
assert.match(help, /archive this email/);
assert.match(help, /delete this email/);
assert.match(help, /delete the last email/);
assert.match(help, /show trash/);
assert.match(help, /restore this email/);
assert.match(help, /empty trash/);
assert.match(help, /edit signature/);
assert.match(help, /use signature Your World/);
assert.match(help, /turn signature off/);
assert.match(help, /check support mail|support mail status/);

await ev(() => { ywSettings(true); setTab('connections'); smRender(); });
await wt(400);
const cov = await ev(() => ycCoverage());
assert.deepEqual(cov.filter(k => k === 'room:Mail' || k === 'card:smCard'), [], 'Mail room + smCard covered: ' + JSON.stringify(cov));

// ---- Post-delete: empty Inbox + 2 in Trash must not freeze; Compose + top-bar tabs work
const savedBox = JSON.parse(JSON.stringify(box));
for (const k of Object.keys(box)) delete box[k];
box.d1 = { id: 'd1', from: 'test2@example.com', fromName: 'TEST 2', to: 'support@yourworldapps.si', subject: 'TEST 2', snippet: 'please delete', text: 'please delete', date: NOW - 3e5, receivedAt: NOW - 3e5, seen: true, label: 'inbox', urgent: false, out: false, pulled: true, attachments: [] };
box.d2 = { id: 'd2', from: 'support@yourworldapps.si', fromName: 'Your World Apps Support', to: 'test2@example.com', subject: 'Re: TEST 2', snippet: 'sent reply', text: 'sent reply', date: NOW - 2e5, receivedAt: NOW - 2e5, seen: true, label: 'replied', urgent: false, out: true, pulled: true, attachments: [] };
await ev(() => { ywSettings(false); setPageView('command'); roomView = 'Mail'; MAIL.label = 'inbox'; MAIL.q = ''; MAIL.open = null; MAIL.compose = false; MAIL._ask = null; MAIL._fp = ''; mailLoad(true); });
await pg.waitForFunction(() => !!document.querySelector('[data-mailopen="d1"]'), { timeout: 8000 });
await ev(() => document.querySelector('[data-mailopen="d1"]').click());
await wt(400);
await ev(() => document.querySelector('[data-mailact="trash"]')?.click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
await ev(() => document.querySelector('[data-mailask="1"]').click());
await wt(600);
assert.equal(box.d1.label, 'trash', 'd1 moved to trash');
assert.equal(await ev(() => MAIL.items.length), 0, 'inbox empty after deleting the open thread');
await ev(() => document.querySelector('[data-mailfolder="replied"]').click());
await pg.waitForFunction(() => !!document.querySelector('[data-mailopen="d2"]'), { timeout: 8000 });
await ev(() => document.querySelector('[data-mailopen="d2"]').click());
await wt(400);
await ev(() => document.querySelector('[data-mailact="trash"]')?.click());
await pg.waitForFunction(() => !!document.querySelector('#mailAsk'), { timeout: 8000 });
await ev(() => document.querySelector('[data-mailask="1"]').click());
await wt(600);
assert.equal(box.d2.label, 'trash', 'd2 moved to trash');
await ev(() => document.querySelector('[data-mailfolder="inbox"]').click());
await wt(500);
assert.deepEqual(await ev(() => ({ inbox: (MAIL.folders && MAIL.folders.inbox) || 0, trash: (MAIL.folders && MAIL.folders.trash) || 0, open: MAIL.open })), { inbox: 0, trash: 2, open: null });

// hide undo toast so it cannot eat clicks
await ev(() => { const t = document.getElementById('ywToast'); if (t) t.hidden = true; });

const n0 = await ev(() => window.__drawN || 0);
const storm = await ev(async () => {
  const board = document.getElementById('board'), nav = document.getElementById('nav');
  let boardW = 0, navW = 0;
  const mo = new MutationObserver(muts => { for (const m of muts) { if (m.target === board) boardW++; if (m.target === nav) navW++; } });
  if (board) mo.observe(board, { childList: true });
  if (nav) mo.observe(nav, { childList: true });
  const t0 = performance.now();
  let long = 0;
  const po = (typeof PerformanceObserver !== 'undefined') ? new PerformanceObserver(list => { for (const e of list.getEntries()) if (e.duration >= 50) long++; }) : null;
  try { po && po.observe({ type: 'longtask', buffered: true }); } catch (e) {}
  await new Promise(r => setTimeout(r, 1600));
  mo.disconnect();
  try { po && po.disconnect(); } catch (e) {}
  return { boardW, navW, long, ms: Math.round(performance.now() - t0), draws: (window.__drawN || 0) };
});
const draws = (storm.draws || 0) - n0;
assert.ok(storm.boardW <= 1, 'empty-inbox board rewrite storm ' + storm.boardW);
assert.ok(storm.navW <= 1, 'empty-inbox nav rewrite storm ' + storm.navW);
assert.ok(draws <= 2, 'empty-inbox draw storm ' + draws);

// Compose must open a new-message panel (any address), with signature controls and propose-then-approve
await ev(() => document.querySelector('[data-mailact="compose"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailTo') && !!document.querySelector('#mailDraft'), { timeout: 8000 });
assert.ok(await ev(() => !!document.querySelector('.mail-compose') && MAIL.compose === true), 'compose panel open');
assert.ok(await ev(() => !!document.querySelector('[data-mailact="propose-new"]')), 'propose send on compose');
assert.ok(await ev(() => !!document.querySelector('#mailSigBtn') || !!document.querySelector('#mailNoSig')), 'signature controls on compose');
await ev(() => { document.querySelector('#mailTo').value = 'anyone@example.com'; document.querySelector('#mailSubj').value = 'Compose check'; document.querySelector('#mailDraft').value = 'Hello from a test.'; });
await ev(() => { const n = document.querySelector('#mailNoSig'); if (n && !n.checked) { /* leave default signature setting */ } });
await ev(() => document.querySelector('[data-mailact="cancel"]').click());
await wt(300);
assert.equal(await ev(() => !!document.querySelector('#mailTo')), false, 'cancel closes compose');
assert.equal(sent.filter(x => x.subject === 'Compose check').length, 0, 'compose did not send');

// Top-bar room tabs (and Settings) must switch away from Mail
const tabs = await ev(() => [...document.querySelectorAll('#nav button')].map(b => b.getAttribute('data-room') || b.textContent.trim()).filter(t => t && t !== 'Mail'));
assert.ok(tabs.length >= 3, 'expected several top-bar rooms, got ' + tabs.join(','));
for (const tab of tabs) {
  await ev(tab => { ywSettings(false); const b = [...document.querySelectorAll('#nav button')].find(x => (x.getAttribute('data-room') || x.textContent.trim()) === tab); if (!b) throw new Error('missing tab ' + tab); b.click(); }, tab);
  await wt(250);
  const got = await ev(() => ({ room: roomView, settings: document.body.classList.contains('view-settings') }));
  assert.equal(got.room, tab, 'clicking ' + tab + ' from Mail, roomView=' + got.room);
  assert.equal(got.settings, false, tab + ' should not be blocked by Settings');
}
await ev(() => { const b = [...document.querySelectorAll('#nav button')].find(x => (x.getAttribute('data-room') || x.textContent.trim()) === 'Mail'); b.click(); });
await wt(300);
await ev(() => document.getElementById('navSettings').click());
await wt(300);
assert.ok(await ev(() => document.body.classList.contains('view-settings') && getComputedStyle(document.getElementById('setPage')).display !== 'none'), 'Settings opens from Mail');
await ev(() => { ywSettings(false); });
await wt(200);
assert.equal(await ev(() => document.body.classList.contains('view-settings')), false);

// restore mock mailbox so later nothing leaks; leave test trash as test data only
for (const k of Object.keys(box)) delete box[k];
Object.assign(box, savedBox);

// ---- Forward, Reply all, editable To + Cc/Bcc on every send, approval card shows recipients, Edit from the card
const qRow = re => ev(src => { const r = new RegExp(src); const rows = [...document.querySelectorAll('#queue .row')]; const i = rows.findIndex(x => r.test(x.innerText)); return i < 0 ? null : { i, text: rows[i].innerText, hasEdit: !!rows[i].querySelector('[data-qedit]') }; }, re.source);
const qClick = (re, attr) => ev(([src, attr]) => { const r = new RegExp(src); const row = [...document.querySelectorAll('#queue .row')].find(x => r.test(x.innerText)); row && row.querySelector('button[' + attr + ']').click(); }, [re.source, attr]);
for (const k of ['m1', 'm2', 'm4']) if (box[k]) box[k].label = 'inbox';
await ev(() => { ywSettings(false); setPageView('command'); roomView = 'Mail'; MAIL.label = 'inbox'; MAIL.q = ''; MAIL.compose = false; draw(); return mailLoad(true); });
await ev(() => ask('turn signature on')); await wt(600);
await ev(() => mailOpen('m1')); await wt(500);
assert.ok(await ev(() => !!document.querySelector('.mail-thread [data-mailact="forward"]')), 'Forward button on open email');
assert.ok(await ev(() => !!document.querySelector('.mail-thread [data-mailact="replyall"]')), 'Reply all shows when others are on the email');
const hFwd = await ev(() => Math.round(document.querySelector('.mail-thread [data-mailact="forward"]').getBoundingClientRect().height)); assert.ok(hFwd >= minH, 'forward target ' + hFwd);
await ev(() => document.querySelector('.mail-thread [data-mailact="forward"]').click());
await pg.waitForFunction(() => !!document.querySelector('#mailReplyBox[data-mode="forward"] #mailTo') && !!document.querySelector('#mailFwdAtt'), { timeout: 8000 });
await wt(400);
let fw = await ev(() => ({ to: document.querySelector('#mailTo').value, subj: document.querySelector('#mailSubj').value, blk: document.querySelector('.mail-fwd').innerText, draft: document.querySelector('#mailDraft').value, att: document.querySelector('#mailFwdAtt').checked }));
assert.equal(fw.to, ''); assert.equal(fw.subj, 'Fwd: Widget outage on checkout');
assert.match(fw.blk, /---------- Forwarded message ----------/); assert.match(fw.blk, /From: Casey Lee <casey@example\.com>/); assert.match(fw.blk, /Subject: Widget outage on checkout/); assert.match(fw.blk, /To: support@yourworldapps\.si/); assert.match(fw.blk, /Checkout is failing/);
assert.match(fw.blk, /screenshot\.png/); assert.ok(fw.att, 'attachments included by default');
assert.match(fw.draft, /\n-- \n/, 'signature in the forward note');
// Cc/Bcc collapsed until toggled
assert.equal(await ev(() => document.querySelector('#mailCcBox').hidden), true);
await ev(() => document.querySelector('#mailReplyBox [data-mailact="cc-toggle"]').click());
assert.equal(await ev(() => document.querySelector('#mailCcBox').hidden), false, 'Cc/Bcc toggle opens');
for (const sel of ['#mailTo', '#mailCc', '#mailBcc', '#mailSubj', '#mailReplyBox [data-mailact="cc-toggle"]', '#mailReplyBox [data-mailact="propose"]']) { const h = await ev(s => Math.round(document.querySelector(s).getBoundingClientRect().height), sel); assert.ok(h >= minH, sel + ' target ' + h); }
const typeIn = (sel, v) => ev(([sel, v]) => { const n = document.querySelector(sel); n.value = v; n.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
await typeIn('#mailTo', 'bob@example.com'); await typeIn('#mailCc', 'ann@example.com'); await typeIn('#mailBcc', 'not-an-address');
// typing never rebuilds the board (no flicker), values survive a forced redraw
const boardNode = await ev(() => { window.__mb = document.querySelector('#board .mail-room'); return !!window.__mb; });
await wt(300); assert.ok(await ev(() => document.querySelector('#board .mail-room') === window.__mb), 'no rebuild while typing');
await ev(() => { MAIL._fp = ''; _lastBoardHtml = ''; draw(); }); await wt(200);
assert.equal(await ev(() => document.querySelector('#mailCc').value), 'ann@example.com', 'Cc survives redraw');
let nQ = await ev(() => queue.length), nS = sent.length;
await ev(() => document.querySelector('#mailReplyBox [data-mailact="propose"]').click()); await wt(300);
assert.equal(await ev(() => queue.length), nQ, 'bad Bcc is not queued');
assert.match(await ev(() => document.querySelector('#mailRcErr').innerText), /not-an-address/);
assert.equal(await ev(() => document.querySelector('#mailBcc').getAttribute('aria-invalid')), 'true');
await typeIn('#mailBcc', 'me@example.com');
assert.equal(await ev(() => document.querySelector('#mailRcErr').hidden), true, 'error clears once fixed');
const shotTop = async (name, sel) => { await ev(s => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel); await wt(300); await pg.screenshot({ path: `${SHOT}/${tag}-${name}.png` }); };
await shotTop('forward-compose', '#mailReplyBox');
await ev(() => document.querySelector('#mailReplyBox [data-mailact="propose"]').click()); await wt(400);
let row = await qRow(/Forward to bob@example\.com/);
assert.ok(row, 'forward queued'); assert.equal(sent.length, nS, 'proposing never sends');
assert.match(row.text, /To\s+bob@example\.com/); assert.match(row.text, /Cc\s+ann@example\.com/); assert.match(row.text, /Bcc\s+me@example\.com/); assert.ok(row.hasEdit, 'Edit on the approval card');
await shot('forward-approval', '#queue');
// Edit from the card: back in the editor with every field, change To, re-propose, approve
await qClick(/Forward to bob@example\.com/, 'data-qedit'); await wt(800);
fw = await ev(() => ({ mode: MAIL.rc && MAIL.rc.mode, to: document.querySelector('#mailTo')?.value, cc: document.querySelector('#mailCc')?.value, bcc: document.querySelector('#mailBcc')?.value, q: queue.some(a => /Forward to bob@/.test(a.title)) }));
assert.deepEqual(fw, { mode: 'forward', to: 'bob@example.com', cc: 'ann@example.com', bcc: 'me@example.com', q: false });
await typeIn('#mailTo', 'Bob Two <bob2@example.com>');
await ev(() => document.querySelector('#mailReplyBox [data-mailact="propose"]').click()); await wt(400);
assert.ok(await qRow(/Forward to Bob Two <bob2@example\.com>/), 'edited forward queued');
await qClick(/Forward to Bob Two/, 'data-i'); await wt(900);
let s1 = sent.at(-1);
assert.equal(s1.path, '/mail/forward'); assert.deepEqual(s1.toList, ['Bob Two <bob2@example.com>']); assert.deepEqual(s1.cc, ['ann@example.com']); assert.deepEqual(s1.bcc, ['me@example.com']); assert.equal(s1.attachments, true); assert.equal(s1.id, 'm1'); assert.equal(s1.subject, 'Fwd: Widget outage on checkout');
assert.ok(await ev(() => auditList().some(a => /FORWARDED via Resend.*Cc ann@example\.com.*Bcc me@example\.com/.test(a.decision))), 'forward logged to Vault with recipients');
assert.match(await last(), /Forwarded via Resend/);
// Reply all: To = sender (editable), Cc = everyone else minus support@
await ev(() => mailOpen('m1')); await wt(400);
await ev(() => document.querySelector('.mail-thread [data-mailact="replyall"]').click()); await wt(300);
let ra = await ev(() => ({ to: document.querySelector('#mailTo').value, cc: document.querySelector('#mailCc').value, open: !document.querySelector('#mailCcBox').hidden, subj: document.querySelector('#mailSubj').value }));
assert.deepEqual(ra, { to: 'casey@example.com', cc: 'ann@example.com', open: true, subj: 'Re: Widget outage on checkout' });
await typeIn('#mailTo', 'casey@example.com, lead@example.com'); await typeIn('#mailBcc', 'audit@example.com');
await ev(() => { document.querySelector('#mailDraft').value = 'Thanks all — on it.\n\n' + document.querySelector('#mailDraft').value; });
await shotTop('reply-cc-bcc', '#mailReplyBox');
await ev(() => document.querySelector('#mailReplyBox [data-mailact="propose"]').click()); await wt(400);
row = await qRow(/Reply all to casey@example\.com, lead@example\.com/); assert.ok(row, 'reply all queued');
assert.match(row.text, /Cc\s+ann@example\.com/); assert.match(row.text, /Bcc\s+audit@example\.com/);
await qClick(/Reply all to casey@example\.com/, 'data-i'); await wt(900);
s1 = sent.at(-1); assert.equal(s1.path, '/mail/reply'); assert.deepEqual(s1.toList, ['casey@example.com', 'lead@example.com']); assert.deepEqual(s1.cc, ['ann@example.com']); assert.deepEqual(s1.bcc, ['audit@example.com']); assert.match(s1.body, /Thanks all/);
// Plain reply: To prefilled + editable, Cc/Bcc collapsed
await ev(() => mailOpen('m2')); await wt(400);
assert.equal(await ev(() => !!document.querySelector('.mail-thread [data-mailact="replyall"]')), false, 'no Reply all when only the sender');
await ev(() => document.querySelector('.mail-thread [data-mailact="reply"]').click()); await wt(300);
assert.equal(await ev(() => document.querySelector('#mailTo').value), 'pat@example.com'); assert.equal(await ev(() => document.querySelector('#mailTo').readOnly), false);
assert.equal(await ev(() => document.querySelector('#mailCcBox').hidden), true);
await ev(() => document.querySelector('#mailReplyBox [data-mailact="cancel-reply"]').click()); await wt(200);
// Compose has Cc/Bcc too
await ev(() => document.querySelector('[data-mailact="compose"]').click()); await wt(300);
assert.ok(await ev(() => !!document.querySelector('#mailCc') && !!document.querySelector('#mailBcc') && !!document.querySelector('[data-mailact="cc-toggle"]')), 'compose Cc/Bcc');
await typeIn('#mailTo', 'new1@example.com'); await typeIn('#mailSubj', 'Cc compose'); await ev(() => document.querySelector('[data-mailact="cc-toggle"]').click()); await typeIn('#mailCc', 'c1@example.com'); await typeIn('#mailBcc', 'b1@example.com'); await ev(() => { document.querySelector('#mailDraft').value = 'Hello'; });
await ev(() => document.querySelector('[data-mailact="propose-new"]').click()); await wt(400);
await qClick(/Send email to new1@example\.com: Cc compose/, 'data-i'); await wt(900);
s1 = sent.at(-1); assert.equal(s1.path, '/mail/compose'); assert.deepEqual(s1.cc, ['c1@example.com']); assert.deepEqual(s1.bcc, ['b1@example.com']);
// Yorri: forward this email to <spoken address>, add cc / add bcc, reply all
await ev(() => mailOpen('m1')); await wt(400);
await ev(() => ask('forward this email to jane at example dot com')); await wt(900);
assert.deepEqual(await ev(() => ({ mode: MAIL.rc && MAIL.rc.mode, to: document.querySelector('#mailTo')?.value })), { mode: 'forward', to: 'jane@example.com' });
assert.match(await last(), /Forward is ready to jane@example\.com/);
await ev(() => ask('add cc kim@example.com')); await wt(400);
await ev(() => ask('add bcc lee at example dot com')); await wt(400);
assert.deepEqual(await ev(() => ({ cc: document.querySelector('#mailCc')?.value, bcc: document.querySelector('#mailBcc')?.value, open: !document.querySelector('#mailCcBox').hidden, mode: MAIL.rc.mode })), { cc: 'kim@example.com', bcc: 'lee@example.com', open: true, mode: 'forward' });
assert.match(await last(), /Added lee@example\.com to Bcc/);
await ev(() => ask('add cc nonsense')); await wt(300); assert.match(await last(), /doesn’t look like an email address/);
await ev(() => ask('reply all')); await wt(600);
assert.equal(await ev(() => MAIL.rc && MAIL.rc.mode), 'replyall'); assert.match(await last(), /Reply all is open\. To: casey@example\.com\. Cc: ann@example\.com/);
assert.equal(sent.length, nS + 3, 'only the three approved sends went out');
assert.ok(await ev(() => YC.list.some(c => c.id === 'mail.fwd') && YC.list.some(c => c.id === 'mail.replyall') && YC.list.some(c => c.id === 'mail.addcc')), 'Yorri commands registered');
await ev(() => document.querySelector('#mailReplyBox [data-mailact="cancel-reply"]')?.click()); await wt(200);
for (const k of Object.keys(box)) delete box[k];
Object.assign(box, savedBox);

await ev(() => { ywSettings(false); setPageView('command'); roomView = 'Mail'; MAIL.label = 'inbox'; MAIL.q = ''; MAIL.compose = false; MAIL.open = null; mailLoad(true); });
await wt(500);
await shot('mail-final', '.mail-room');

console.log('errors:', errs);
if (errs.length) process.exitCode = 1;
console.log('SUPPORT MAIL OK (' + tag + ') shots in ' + SHOT);
await b.close(); srv.close();
