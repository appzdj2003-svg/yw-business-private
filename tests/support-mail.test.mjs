// Headless check: Command Deck Mail room (inbox from /mail store), Settings → Support mail + Resend,
// propose-then-approve send, AI options, Yorri commands, archive+Vault. All network mocked.
// CAR=1 = car layout (48px targets). Screenshots under SHOTDIR or /workspace/support-mail/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8188);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/support-mail', tag = CAR ? 'car' : 'desk', SV = 'https://sv.test';
fs.mkdirSync(SHOT, { recursive: true });
const NOW = Date.now();
const box = {
  m1: { id: 'm1', from: 'casey@example.com', fromName: 'Casey Lee', to: 'support@yourworldapps.si', subject: 'Widget outage on checkout', snippet: 'Checkout is failing for some users since noon.', text: 'Checkout is failing for some users since noon. Can you take a look today?', date: NOW - 3600e3, receivedAt: NOW - 3600e3, seen: false, label: 'inbox', urgent: false, out: false, attachments: [{ n: 0, name: 'screenshot.png', size: 20480, type: 'image/png' }] },
  m2: { id: 'm2', from: 'pat@example.com', fromName: 'Pat Nguyen', to: 'support@yourworldapps.si', subject: 'Thanks for the fix', snippet: 'All good on our side.', text: 'All good on our side. Thanks!', date: NOW - 86400e3, receivedAt: NOW - 86400e3, seen: true, label: 'inbox', urgent: false, out: false, attachments: [] },
  m3: { id: 'm3', from: 'support@yourworldapps.si', fromName: 'Your World Apps Support', to: 'old@example.com', subject: 'Re: Old thread', snippet: 'We looked into it.', text: 'We looked into it.', date: NOW - 2 * 86400e3, receivedAt: NOW - 2 * 86400e3, seen: true, label: 'replied', urgent: false, out: true, attachments: [] }
};
const HTML_BLOCK = '<p>Checkout is failing.</p><img src="https://evil.example/px.png" alt="x">';
const HTML_IMG = '<p>Checkout is failing.</p><img src="https://evil.example/px.png" alt="x">';
let imagesOn = false, sent = [], reqs = [];
const foldersOf = () => {
  const all = Object.values(box);
  const folders = { inbox: 0, reply: 0, replied: 0, archived: 0, spam: 0 };
  for (const m of all) folders[m.label] = (folders[m.label] || 0) + 1;
  return folders;
};
const listOf = (u) => {
  const label = u.searchParams.get('label') || 'inbox';
  const q = (u.searchParams.get('q') || '').toLowerCase();
  let items = Object.values(box).filter(m => (m.label || 'inbox') === label);
  if (q) items = items.filter(m => [m.from, m.fromName, m.subject, m.snippet, m.text].some(v => String(v || '').toLowerCase().includes(q)));
  items = items.slice().sort((a, b) => (b.date || 0) - (a.date || 0));
  return { items, folders: foldersOf(), unread: Object.values(box).filter(m => !m.seen && !m.out).length, total: items.length };
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
  else if ((P === '/mail/reply' || P === '/mail/compose') && M === 'POST') {
    if (!bd || bd.approved !== true) { st = 400; body = { error: 'requires {approved:true}' }; }
    else { const rec = { at: Date.now(), path: P, to: bd.to, id: bd.id, body: bd.body, subject: bd.subject }; sent.push(rec); body = { ok: true, messageId: '<t@support.yourworldapps.si>', resendId: 're_test', via: 'resend', to: bd.to || (box[bd.id] && box[bd.id].from), from: 'Your World Apps Support <support@yourworldapps.si>' }; }
  } else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] };
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
await shot('mail-thread', '.mail-room');

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

const help = await ev(() => (typeof ycListHTML === 'function' ? ycListHTML('mail') : YC.list.filter(c => c.group === 'Mail').map(c => c.ex.join(' ')).join(' ')));
assert.match(help, /read my latest email/);
assert.match(help, /summarize unread mail/);
assert.match(help, /draft a reply to the last email/);
assert.match(help, /archive this email/);
assert.match(help, /check support mail|support mail status/);

await ev(() => { ywSettings(true); setTab('connections'); smRender(); });
await wt(400);
const cov = await ev(() => ycCoverage());
assert.deepEqual(cov.filter(k => k === 'room:Mail' || k === 'card:smCard'), [], 'Mail room + smCard covered: ' + JSON.stringify(cov));

await ev(() => { ywSettings(false); setPageView('command'); roomView = 'Mail'; MAIL.label = 'inbox'; MAIL.q = ''; mailLoad(true); });
await wt(500);
await shot('mail-final', '.mail-room');

console.log('errors:', errs);
if (errs.length) process.exitCode = 1;
console.log('SUPPORT MAIL OK (' + tag + ') shots in ' + SHOT);
await b.close(); srv.close();
