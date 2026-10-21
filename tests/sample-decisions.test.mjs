// Headless check: sample (mock) decisions never appear or get reported "Done" with Mock data OFF; labelled SAMPLE when ON; never relayed to the server;
// old fake Vault entries are relabelled SAMPLE while real Vault entries stay untouched.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8142);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const DESK = !!process.env.DESK, out = [], reqs = [];
const run = async (mock, vault) => { const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.addInitScript(([m, v]) => { if (sessionStorage.getItem('init')) return; sessionStorage.setItem('init', '1'); localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', m); if (v) localStorage.setItem('ywVaultAudit', JSON.stringify(v)); window.confirm = () => true; }, [mock, vault]);
  await ctx.route('**/*', r => { const u = r.request().url(); if (u.startsWith('http://127.0.0.1:8142')) return r.continue(); reqs.push(r.request().method() + ' ' + u); return r.abort(); });
  await pg.goto('http://127.0.0.1:8142/'); await pg.waitForTimeout(2200); return { pg, errs, ctx, ev: (f, a) => pg.evaluate(f, a) }; };
const last = P => P.ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
// 1) Mock OFF: no seeded payroll/NDA; P-table keywords queue nothing; a synced/stale sample item is purged; old fake Vault entries relabelled, real ones untouched
const TS0 = '2026-10-17T15:00:00.000Z'; const OLD = [{ ts: TS0, at: 1, decision: 'APPROVED', tier: 'T3', title: 'Run Friday payroll · $71,880', lane: '' }, { ts: TS0, at: 2, decision: 'APPROVED', tier: 'T2', title: 'Send Acme NDA renewal notice', lane: '' }, { ts: TS0, at: 3, decision: 'HANDED OFF to WeatherAI', tier: 'T1', title: 'Crash Weather Radar · S-e15fcf7a', lane: 'Support' }, { ts: TS0, at: 4, decision: 'APPROVED', tier: 'T2', title: 'Run Friday payroll · $71,880', lane: 'Finance' }];
let P = await run('0', OLD); await P.ev(() => setPageView('command')); await P.pg.waitForTimeout(600);
assert.deepEqual(await P.ev(() => queue.map(a => a.title)), [], 'nothing seeded with mock off');
for (const t of ['run payroll', 'pay vendor bills', 'hire 2 engineers']) { await P.ev(t => ask(t), t); await P.pg.waitForTimeout(500); const l = await last(P); out.push('mock off » ' + t + '\n   ' + l.slice(0, 200)); assert.match(l, /sample data only.*didn’t queue anything/, t); }
assert.equal(await P.ev(() => queue.length), 0); await P.ev(() => ask('send the NDA')); await P.pg.waitForTimeout(900); assert.match(await last(P), /sample data only — nothing real is connected for it/); assert.doesNotMatch(await last(P), /\bSAMPLE\b/);
await P.ev(() => { queue.push({ t: ['t3', 'T3'], title: 'Run Friday payroll · $71,880', why: '' }); draw() }); assert.equal(await P.ev(() => queue.length), 0, 'stale sample purged on draw');
const V = await P.ev(() => JSON.parse(localStorage.getItem('ywVaultAudit')));
assert.deepEqual(V.map(e => [e.decision, !!e.sample]), [['HANDED OFF to WeatherAI', false], ['APPROVED', false]], 'mock off: sample Vault entries cleared, real ones kept'); assert.equal((await P.ev(() => JSON.parse(localStorage.getItem('ywMockPurged')))).vault, 2); out.push('vault relabel: ' + V.map(e => e.decision).join(' | '));
assert.ok(!reqs.some(x => /alerts\/decision/.test(x))); assert.deepEqual(P.errs, []); await P.ctx.close();
// 2) Mock ON: seeded items carry a SAMPLE badge; approving says "Sample … nothing ran" (never "Done … Report filed"), Vault entry marked sample; nothing relayed
P = await run('1'); await P.ev(() => setPageView('command')); await P.pg.waitForTimeout(800);
const qt = await P.ev(() => ({ q: queue.map(a => a.title + ':' + isSampleQ(a)), html: document.querySelector('#queue').innerText }));
assert.deepEqual(qt.q, ['Run Friday payroll · $71,880:true', 'Send Acme NDA renewal notice:true']); assert.equal((qt.html.match(/SAMPLE/g) || []).length, 2); out.push('mock on queue: ' + qt.q.join(', '));
await P.ev(() => ask('approve payroll')); await P.pg.waitForTimeout(600); let l = await last(P); assert.match(l, /Sample: approved Run Friday payroll.*nothing ran/); assert.doesNotMatch(l, /Done:|Report filed/); out.push('mock on » approve payroll\n   ' + l);
const v1 = await P.ev(() => JSON.parse(localStorage.getItem('ywVaultAudit'))[0]); assert.equal(v1.sample, true); assert.match(v1.decision, /^SAMPLE · APPROVED \(nothing ran\)/);
await P.ev(t => ask(t), 'pay vendor bills'); await P.pg.waitForTimeout(500); assert.ok(await P.ev(() => queue.some(a => a.sample && /vendor bills/.test(a.title))), 'P-table queues a labelled sample in mock mode');
await P.pg.screenshot({ path: '/tmp/sample-on' + (DESK ? '-desk' : '') + '.png' });
assert.ok(!reqs.some(x => /alerts\/decision/.test(x)), 'samples never relayed'); assert.deepEqual(P.errs, []); await P.ctx.close();
console.log(out.join('\n')); console.log('sample-decisions' + (DESK ? ' (desktop)' : '') + ': all passed'); await b.close(); srv.close();
