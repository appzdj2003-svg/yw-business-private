// Headless smoke for R&D + Acquisitions rooms: seeded under Your World Apps, render empty states (no server), Yorri commands match. Run: node tests/growthrooms.test.mjs
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8131);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const pg = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(() => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); });
await pg.goto('http://localhost:8131/'); await pg.waitForTimeout(1500);
const types = await pg.evaluate(() => bizStore.businesses.flatMap(b => b.rooms.filter(r => r.type === 'rnd' || r.type === 'acq').map(r => b.id + '/' + r.label)));
assert.deepEqual(types.sort(), ['yw-apps/Acquisitions', 'yw-apps/R&D'], 'rooms seeded'); 
for (const t of ['rnd', 'acq']) { await pg.evaluate(t => g2Open(t), t); await pg.waitForTimeout(500); const tx = await pg.evaluate(() => (document.getElementById('board')||document.body).innerText); console.log(t, await pg.evaluate(()=>[pageView,roomView,singleRoom(),document.getElementById('board')?.innerHTML.length]), tx.slice(0, 300).replace(/\n/g, ' | ')); assert.ok(/connect|server/i.test(tx), t + ' empty state'); }
for (const c of ['open R&D', 'open acquisitions', 'running experiments', 'what opportunities', 'top domain flips', "what's in the pipeline", 'start experiment hook test', 'add target stormradar.com']) { const id = await pg.evaluate(c => { const r = c, l = c.toLowerCase(); const e = YC.list.find(x => x.match(r, l)); return e && e.id; }, c); console.log(c, '->', id); assert.ok(id && /^(rnd|acq)\./.test(id), c); }
// connected phase with mocked server
const NOW = Date.now(); const EXP = [{ id: 'e1', title: 'Hook test', app: 'hunt', hypothesis: 'Question hooks lift clicks', metric: 'clicks/session', status: 'running', variants: [{ name: 'A', utm: 'a' }, { name: 'B', utm: 'b' }], results: [{ at: NOW, summary: 'B ahead', by: 'bot' }], createdAt: NOW }, { id: 'e2', title: 'Dark radar', app: 'weather', status: 'proposed', changesLive: true, variants: [], results: [], createdAt: NOW }];
const OPP = [{ id: 'o1', type: 'domain', name: 'stormradar.app', url: 'https://stormradar.app', askingPrice: 12, estResale: 900, estProfit: 888, score: 82, status: 'new', rationale: 'Weather keyword', foundAt: NOW }, { id: 'o2', type: 'website', name: 'deerforum.net', askingPrice: 4000, score: 61, status: 'proposed', foundAt: NOW }];
const MET = { id: 'e1', variants: [{ name: 'A', sessions: 400, users: 350, goals: 40 }, { name: 'B', sessions: 410, users: 360, goals: 62 }], readout: { basis: 'click per session', liftPct: 51.2, confidence: 97, significant: true }, checkedAt: new Date(NOW).toISOString() };
const patched = [];
await pg.route('https://sv.test/**', async r => { const u = new URL(r.request().url()); const m = r.request().method(); if (m !== 'GET') patched.push(m + ' ' + u.pathname + ' ' + (r.request().postData() || ''));
 const j = /\/rnd\/experiments\/e1\/metrics/.test(u.pathname) ? MET : /\/rnd\/experiments\/?$/.test(u.pathname) ? (m === 'POST' ? { id: 'e3', title: 'hook test', status: 'proposed' } : { experiments: EXP }) : /\/acquisitions\/opportunities\/?$/.test(u.pathname) ? (m === 'POST' ? { ok: true } : { opportunities: OPP, scanner: { lastScanAt: NOW - 3600e3, nextScanAt: NOW + 11 * 3600e3, scans: 3, total: 2 } }) : /\/acquisitions\/scans/.test(u.pathname) ? { scans: [] } : u.pathname.includes('/rnd/experiments/') || u.pathname.includes('/acquisitions/opportunities/') ? { ok: true } : {};
 r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(j) }); });
await pg.evaluate(() => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: 'https://sv.test', token: 'x'.repeat(40), live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); });
await pg.reload(); await pg.waitForTimeout(1500);
await pg.evaluate(() => g2Open('rnd')); await pg.waitForTimeout(1500); let tx = await pg.evaluate(() => document.getElementById('board').innerText); console.log('RND:', tx.slice(0, 900).replace(/\n+/g, ' | '));
assert.match(tx, /Hook test/); assert.match(tx, /Dark radar/); assert.match(tx, /51/);
await pg.evaluate(() => g2Open('acq')); await pg.waitForTimeout(1500); tx = await pg.evaluate(() => document.getElementById('board').innerText); console.log('ACQ:', tx.slice(0, 900).replace(/\n+/g, ' | '));
assert.match(tx, /stormradar\.app/); assert.match(tx, /deerforum/);
const q = await pg.evaluate(() => (typeof Q !== 'undefined' ? Q : []).filter(a => a.gr2).map(a => a.title)); console.log('queue', q);
console.log('writes', patched);
assert.deepEqual(errs, []); console.log('GROWTHROOMS OK'); await b.close(); srv.close();
