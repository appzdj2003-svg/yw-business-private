// Headless check: unsubscribe status labels/buttons, confirm + result badges, link-only senders open in a new tab, repeat-sender chips/groups,
// AI cleanup checklist (single confirm), Settings unsubscribed list, Yorri commands. ALL network is mocked; any other host is aborted.
// Run: node tests/unsubscribe.test.mjs   (DESK=1 for desktop)
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8131);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', D = Date.now() - 2 * 864e5, DESK = !!process.env.DESK;
const U = { oc: h => ({ kind: 'oneclick', label: 'One-tap unsubscribe', target: h, oneTap: true }), mt: a => ({ kind: 'mailto', label: 'One-tap unsubscribe', target: a, oneTap: true }), ln: (h, url) => ({ kind: 'link', label: 'Needs your action: open link', target: h, oneTap: false, url }),
  ac: hint => ({ kind: 'account', label: 'Manage in account settings', oneTap: false, hint }), no: () => ({ kind: 'none', label: 'No unsubscribe offered', oneTap: false }) };
let n = 0; const tk = (from, subject, box, unsub, cleanup, extra = {}) => ({ id: 'S-' + (++n), from, fromName: from.split('@')[0], subject, priority: 'medium', slaH: box === 'reply' ? 48 : null, receivedAt: D - n * 36e5, sla: box === 'reply' ? 'ok' : 'none', unread: false, status: 'open', snippet: subject,
  thread: [{ from, at: D, body: subject }], box, boxBy: 'rule', boxWhy: 'List-Unsubscribe header', boxConf: 0.9, unsub: { ...unsub, cleanup }, ...extra });
let T = [tk('news@weekly.example', 'The best tools this week #41', 'auto', U.oc('weekly.example'), true), tk('news@weekly.example', 'The best tools this week #40', 'auto', U.oc('weekly.example'), true), tk('news@weekly.example', 'The best tools this week #39', 'auto', U.oc('weekly.example'), true),
  tk('noreply@redditmail.com', 'Trending on Reddit today', 'auto', U.mt('unsub@redditmail.com'), true), tk('promo@shop.example', 'Big autumn sale', 'spam', U.ln('shop.example', 'https://shop.example/prefs?u=1'), true),
  tk('builds@ci.example', 'Build 1234 processed', 'auto', U.no(), false), tk('robot@ci.example', 'Build 1240 processed', 'auto', U.no(), false), tk('agent@ci.example', 'Build 1251 processed', 'auto', U.no(), false),
  tk('developer@insideapple.apple.com', 'Welcome to the Apple Developer Program', 'stores', U.ac('Apple: developer mail → developer.apple.com → Account → Email preferences'), false),
  tk('deals@social.example', 'Your weekly digest', 'auto', U.oc('social.example'), true), tk('fail@broken.example', 'Promo', 'spam', U.oc('broken.example'), true),
  tk('jane@gmail.com', 'Re: app crash', 'reply', U.no(), false), tk('jane@gmail.com', 'Re: app crash', 'reply', U.no(), false), tk('jane@gmail.com', 'Re: app crash again', 'reply', U.no(), false)];
const unsubbed = [], posted = [], confirms = []; let confirmAns = true;
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.exposeFunction('__conf', m => { confirms.push(m); return confirmAns; });
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywSupSortReport', '1') });
await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://127.0.0.1:8131')) return r.continue(); return r.abort(); }); // nothing real leaves the box
const blocked = []; await ctx.route('https://shop.example/**', r => { blocked.push(r.request().url()); r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>Confirm unsubscribe</h1>' }); });
let aiCalls = 0; await ctx.route('https://api.x.ai/**', r => { aiCalls++; const sent = JSON.parse(r.request().postData()); const L = JSON.parse(sent.messages[1].content); assert.ok(!L.some(x => /apple|ci\.example|gmail/.test(x.from)), 'AI only sees cleanup candidates');
  r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify({ choices: [{ message: { content: JSON.stringify([{ from: 'news@weekly.example', ok: true, reason: 'weekly tools newsletter' }, { from: 'deals@social.example', ok: false, reason: 'looks personal' }, { from: 'noreply@redditmail.com', ok: true, reason: 'social digest' }]) } }] }) }); });
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), M = q.method(); const bd = q.postData() ? JSON.parse(q.postData()) : null; if (M === 'POST' || M === 'PUT') posted.push(M + ' ' + u.pathname + ' ' + (q.postData() || ''));
  let body = {}, status = 200; const un = u.pathname.match(/^\/tickets\/([^/]+)\/unsubscribe$/);
  if (u.pathname === '/tickets') body = T;
  else if (un) { const t = T.find(x => x.id === decodeURIComponent(un[1])); const k = t.unsub.kind, f = t.from;
    const st = f.startsWith('fail@') ? 'failed' : k === 'oneclick' ? 'unsubscribed' : k === 'mailto' ? 'sent' : 'link'; const label = { unsubscribed: 'Unsubscribed', sent: 'Request sent — may take a few days', link: 'Link opened by you — confirm on their page', failed: 'Failed: broken.example answered HTTP 500' }[st];
    const rec = { state: st, at: Date.now(), method: k, detail: st === 'failed' ? 'broken.example answered HTTP 500' : '' }; unsubbed.push({ sender: f, ...rec });
    for (const x of T.filter(x => x.from === f)) { x.unsub = { ...x.unsub, cleanup: false, result: { ...rec, label } }; if (st !== 'failed') { x.box = 'spam'; x.boxBy = 'you'; } }
    body = { ok: st !== 'failed', state: st, method: k, label, detail: rec.detail, url: st === 'link' ? t.unsub.url : undefined, taught: st !== 'failed' ? `From ${f} → Spam/Other` : null, ticket: t }; }
  else if (/^\/tickets\/[^/]+$/.test(u.pathname)) body = T.find(x => x.id === decodeURIComponent(u.pathname.split('/')[2]));
  else if (u.pathname === '/inbox/config') body = { rules: [], always: [], ai: { on: false }, unsubscribed: unsubbed.map(({ sender, at, method, state, detail }) => ({ sender, at, method, state, detail })) };
  else if (u.pathname === '/alerts/settings') body = { smsLive: false, pushLive: false, settings: null };
  await r.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8131/');
await pg.evaluate(sv => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)) }, SV);
await pg.reload(); await pg.waitForTimeout(2000);
// window.confirm is synchronous; record the text and answer from a page-side flag.
await pg.evaluate(() => { window.__ans = true; window.__confs = []; window.confirm = m => { window.__confs.push(m); return window.__ans } });
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms), out = [], tap = sel => DESK ? pg.click(sel) : pg.tap(sel);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const say = async (t, ms = 900) => { await ev(t => ask(t), t); await wt(ms); const l = await last(); out.push('» ' + t + '\n   ' + l.slice(0, 300)); return l };
const nPost = re => posted.filter(p => re.test(p)).length;
await ev(() => supRefresh()); await wt(300); await ev(() => { SUP.box = 'auto'; supGo() }); await wt(300);
// Automated: grouped weekly (×3, same sender) and CI builds (×3 subject pattern), plus labels
let room = await ev(() => [...document.querySelectorAll('.sup-grp')].map(g => g.innerText.replace(/\s+/g, ' ')));
out.push('groups: ' + JSON.stringify(room)); assert.equal(room.length, 2); assert.match(room.join('|'), /news — 3 emails here Repeats ×3/); assert.match(room.join('|'), /ci\.example · “build # processed” — 3 emails here Repeats ×3/);
await pg.screenshot({ path: '/tmp/un_auto' + (DESK ? '_d' : '') + '.png' });
await tap('.sup-grp[data-supgrp="s:news@weekly.example"]'); await wt(200); assert.equal(await ev(() => document.querySelectorAll('.sup-sub').length), 3);
const labels = await ev(() => Object.fromEntries([...document.querySelectorAll('[data-supo]')].map(r => [r.dataset.supo, r.querySelector('.sup-un')?.textContent + (r.querySelector('[data-supun]') ? ' +btn' : '') + (r.querySelector('[data-supunl]') ? ' +link' : '')])));
out.push('labels(auto): ' + JSON.stringify(labels)); assert.equal(labels['S-4'], 'One-tap unsubscribe +btn'); assert.equal(labels['S-1'], 'One-tap unsubscribe +btn');
// Customer Re: thread never flagged
await ev(() => { SUP.box = 'reply'; draw() }); assert.equal(await ev(() => document.querySelectorAll('.sup-rep').length), 0);
// Account sender: label + hint
await ev(() => { SUP.box = 'stores'; draw() }); const ac = await ev(() => { const c = document.querySelector('[data-supo="S-9"] .sup-un'); return c.textContent + ' | ' + c.title + ' | btn:' + !!document.querySelector('[data-supo="S-9"] [data-supun],[data-supo="S-9"] [data-supunl]') });
assert.match(ac, /^Manage in account settings \| Apple: developer mail → developer\.apple\.com.* \| btn:false$/); out.push('account: ' + ac);
// One-tap button: cancel = nothing sent; OK = POST + toast + badge
await ev(() => { SUP.box = 'auto'; draw() }); await ev(() => window.__ans = false);
await tap('[data-supun="S-4"]'); await wt(300); assert.equal(nPost(/unsubscribe/), 0, 'cancel sends nothing');
let cf = await ev(() => window.__confs.at(-1)); assert.match(cf, /^This sends an unsubscribe request to noreply:\n• noreply <noreply@redditmail\.com> — an unsubscribe email from your support address to unsub@redditmail\.com/); out.push('confirm: ' + cf.split('\n').slice(0, 2).join(' / '));
await ev(() => window.__ans = true); await tap('[data-supun="S-4"]'); await wt(700);
assert.equal(nPost(/S-4\/unsubscribe \{"confirm":true\}/), 1); const toast = await ev(() => document.querySelector('#supToast').innerText); assert.match(toast, /noreply: Request sent — may take a few days · filed under Spam\/Other/); out.push('toast: ' + toast);
await ev(() => { SUP.box = 'spam'; draw() }); const badge = await ev(() => document.querySelector('[data-supo="S-4"] .sup-un').textContent); assert.match(badge, /^Request sent — may take a few days · \w{3} \d+$/); assert.ok(!(await ev(() => !!document.querySelector('[data-supo="S-4"] [data-supun]'))), 'no button after success');
// Failure shows reason + allows a manual retry button
await tap('[data-supun="S-11"]'); await wt(700); const fb = await ev(() => document.querySelector('[data-supo="S-11"]').innerText.replace(/\s+/g, ' ')); assert.match(fb, /Failed: broken\.example answered HTTP 500 · \w{3} \d+/); assert.match(fb, /Try unsubscribe again/); out.push('failed row: ' + fb.slice(0, 160));
// Link-only: opens in a new tab (mocked page), records, explains confirmation
const pop = ctx.waitForEvent('page'); await tap('[data-supunl="S-5"]'); const np = await pop; await np.waitForLoadState().catch(() => {}); await wt(700);
assert.equal(np.url(), 'https://shop.example/prefs?u=1'); assert.equal(await np.evaluate(() => window.opener), null, 'noopener'); await np.close();
assert.equal(nPost(/S-5\/unsubscribe/), 1); assert.match(await ev(() => document.querySelector('#supToast').innerText), /You may need to confirm on their page/);
// Modal: status + Yorri "can I unsubscribe from this?"
await ev(() => supOpen('S-10')); await wt(400); assert.match(await ev(() => document.querySelector('.sup-unm').innerText), /One-tap unsubscribe\s*Unsubscribe/);
let l = await say('can I unsubscribe from this?'); assert.match(l, /deals \(deals@social\.example\): One-tap unsubscribe\. I can do it here — one-click request to social\.example/);
await ev(() => { SUP.open = null; supModal() });
l = await say('can I unsubscribe from apple'); assert.match(l, /Manage in account settings\. Apple: developer mail/);
l = await say('can I unsubscribe from the build processed'); assert.match(l, /No unsubscribe offered/);
// unsubscribe from X: yes/no first
const before = nPost(/unsubscribe/); l = await say('unsubscribe from weekly'); assert.match(l, /This sends a one-click unsubscribe request to weekly\.example for news .* Say yes to unsubscribe or no to cancel/);
l = await say('no'); assert.match(l, /didn’t unsubscribe/); assert.equal(nPost(/unsubscribe/), before);
await say('unsubscribe from weekly'); l = await say('yes', 1200); assert.match(l, /Unsubscribe — news@weekly\.example: Unsubscribed\. Filed under Spam\/Other/); assert.equal(nPost(/unsubscribe/), before + 1);
l = await say('unsubscribe from weekly'); assert.match(l, /Already done/); l = await say('unsubscribe from zebra'); assert.match(l, /didn’t find .*Nothing was sent/);
// Cleanup via Yorri: AI drops deals@social (looked personal) -> nothing one-tap left except... reset state for a clean run
for (const t of T) if (['news@weekly.example', 'noreply@redditmail.com', 'deals@social.example'].includes(t.from)) { t.unsub = { ...t.unsub, cleanup: true }; delete t.unsub.result; t.box = 'auto'; }
T.find(t => t.from === 'promo@shop.example').unsub = { ...U.ln('shop.example', 'https://shop.example/prefs?u=1'), cleanup: true }; unsubbed.length = 0;
l = await say('clean up my inbox', 1500); assert.match(l, /I found 4 senders to unsubscribe from: news \(×3\), noreply, deals, promo\. 3 are one-tap, 1 needs you to open a link\. Rule-based .*Say yes to unsubscribe the 3 one-tap senders, or show list to pick/); assert.equal(aiCalls, 0, 'no key → no AI call');
l = await say('show list', 800); assert.match(l, /cleanup list — 4 senders/);
const panel = await ev(() => ({ checks: [...document.querySelectorAll('[data-clid]')].map(c => c.dataset.clid + ':' + c.checked), links: [...document.querySelectorAll('#supClean [data-supunl]')].map(a => a.getAttribute('href') + '|' + a.target + '|' + a.rel), btn: document.querySelector('[data-clgo]').textContent }));
out.push('panel: ' + JSON.stringify(panel)); assert.deepEqual(panel.checks.sort(), ['deals@social.example:true', 'news@weekly.example:true', 'noreply@redditmail.com:true']); assert.deepEqual(panel.links, ['https://shop.example/prefs?u=1|_blank|noopener noreferrer']); assert.equal(panel.btn, 'Unsubscribe selected (3)');
await pg.screenshot({ path: '/tmp/un_clean' + (DESK ? '_d' : '') + '.png' });
await ev(() => document.querySelector('[data-clx]').click());
// With a Grok key: AI reasons + drops "looks personal"; then panel → untick one → single confirm → sequential POSTs
await ev(() => localStorage.setItem('ywLlm', JSON.stringify({ key: 'xai-test', base: 'https://api.x.ai/v1', model: 'grok-4' })));
await tap('[data-clopen]'); await wt(1500); assert.equal(aiCalls, 1);
const ai = await ev(() => [...document.querySelectorAll('#supClean .cl-r')].map(r => r.innerText.replace(/\s+/g, ' ')));
out.push('AI panel: ' + JSON.stringify(ai)); assert.ok(ai.some(r => /🤖 weekly tools newsletter · repeats ×3/.test(r))); assert.ok(!ai.some(r => /deals@social/.test(r)), 'AI keep → dropped');
await ev(() => { const c = document.querySelector('[data-clid="noreply@redditmail.com"]'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })) }); await wt(100);
const c0 = await ev(() => window.__confs.length), p0 = nPost(/unsubscribe/); await tap('[data-clgo]'); await wt(1500);
assert.equal(await ev(() => window.__confs.length), c0 + 1, 'single confirm'); assert.match(await ev(() => window.__confs.at(-1)), /^This sends an unsubscribe request to news:/);
assert.equal(nPost(/unsubscribe/), p0 + 1); assert.match(await ev(() => document.querySelector('#supClean').innerText), /Unsubscribed/); assert.match(await last(), /Cleanup: 1 unsubscribed, 0 requests sent/);
await ev(() => document.querySelector('[data-clx]').click());
// Voice batch: clean up → yes
l = await say('unsubscribe from junk', 2000); assert.match(l, /I found 2 senders .*1 is one-tap.*AI reviewed/); l = await say('yes', 1500); assert.match(l, /Cleanup: 0 unsubscribed, 1 request sent/);
l = await say('who have I unsubscribed from'); assert.match(l, /2 senders: .*news@weekly\.example — unsubscribed .*noreply@redditmail\.com — request sent/);
l = await say('what needs my action'); assert.match(l, /2 need your action: promo — open their unsubscribe link; fail — Failed: broken\.example answered HTTP 500 \(you can try again\)/);
l = await say('who keeps emailing me'); assert.match(l, /2 repeat senders \(30 days\): news ×3 \(Spam\/Other, Unsubscribed\)/);
l = await say('show repeat senders'); assert.match(l, /grouped in this box/);
// Settings list
await ev(() => { ywSettings(true); setTab('connections') }); await wt(800); const st = await ev(() => document.querySelector('#inbUnsub').innerText.replace(/\s+/g, ' '));
assert.match(st, /news@weekly\.example · Unsubscribed · \w{3} \d+ · one-click/); assert.match(st, /noreply@redditmail\.com · Request sent — may take a few days/); out.push('settings: ' + st);
await ev(() => document.querySelector('#inbH').scrollIntoView()); await pg.screenshot({ path: '/tmp/un_set' + (DESK ? '_d' : '') + '.png' }); await ev(() => ywSettings(false));
assert.deepEqual(await ev(() => ycCoverage()), []);
const hl = await ev(() => YC.list.filter(c => /^sup\.(canunsub|unsub|clean|cleanlist|unsubbed|myaction|repeats)$/.test(c.id)).map(c => c.id).length); assert.equal(hl, 7);
assert.deepEqual(blocked, ['https://shop.example/prefs?u=1'], 'only the link Aaron tapped was opened (mocked)');
console.log(out.join('\n')); console.log('errors:', errs); assert.deepEqual(errs, []); console.log('unsubscribe: all passed');
await b.close(); srv.close();
