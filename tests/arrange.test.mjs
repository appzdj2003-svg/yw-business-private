// Headless check: Arrange screen (Android home-screen style). ✥ Arrange button and long-press (0.4 s) enter arrange mode; scrolling/moving cancels the long-press;
// drag the ⠿ handle (pointer events), ↑/↓ buttons and arrow keys reorder; clicks inside boxes are ignored while arranging; Done saves per business + room
// (localStorage ywArrange), Cancel/Esc restores, Reset layout clears; order survives reload and reaches other windows (storage event); pop-outs have the button;
// big targets in car layout; no horizontal overflow. Yorri: arrange screen / reset layout. Env DESK=1 / CAR=1. All network blocked (no server needed).
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8165);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const DESK = !!process.env.DESK, CAR = !!process.env.CAR;
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); window.confirm = () => true; }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8165') ? r.continue() : r.abort());
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:8165/'); await pg.waitForTimeout(4000);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const cards = (p = pg) => p.evaluate(() => [...document.querySelectorAll('#board > .card')].map(c => arrKey(c)));
const tiles = () => ev(() => [...document.querySelectorAll('#board section.bizrow .biztile')].map(t => t.dataset.bizgo));
const on = () => ev(() => document.body.classList.contains('arr-on'));
const ovf = () => ev(() => document.documentElement.scrollWidth - innerWidth);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
await ev(() => { setPageView('command'); roomView = 'Command Board'; draw() }); await wt(500);
const C0 = await cards(); console.log('default', C0); assert.ok(C0.length >= 4, 'command board has boxes');
// 1) ✥ Arrange button → handles on every box, bar, big targets, no overflow
assert.ok(await ev(() => !!document.querySelector('.room-bar [data-arr="on"]')));
await ev(() => document.querySelector('.room-bar [data-arr="on"]').click()); await wt(200); assert.ok(await on()); assert.equal(await ev(() => document.querySelector('#arrBar').hidden), false);
const H = await ev(() => [...document.querySelectorAll('#board > .card > .arr-ctl .arr-h')].map(h => { const r = h.getBoundingClientRect(); return [r.width, r.height] })); assert.equal(H.length, C0.length);
for (const [w, h] of H) { assert.ok(w >= (CAR ? 56 : 44) && h >= (CAR ? 56 : 44), 'handle ≥ ' + (CAR ? 56 : 44) + 'px: ' + w + 'x' + h); }
assert.ok(await ovf() <= 0, 'no horizontal overflow in arrange mode: ' + await ovf());
// biz tiles get handles too
assert.ok(await ev(() => document.querySelectorAll('#board section.bizrow .biztile .arr-h').length) >= 2);
// clicks inside boxes are ignored while arranging
await ev(() => document.querySelector('#board .biztile').click()); await wt(200); assert.equal(await ev(() => pageView), 'command', 'tile click ignored while arranging');
// ↓ on the first box
await ev(() => document.querySelector('#board > .card .arr-ctl [data-arrmv="1"]').click()); await wt(100);
let C1 = await cards(); assert.deepEqual(C1.slice(0, 2), [C0[1], C0[0]]);
// keyboard: arrow down on the (new) first box's handle
await ev(() => document.querySelector('#board > .card .arr-h').focus()); await pg.keyboard.press('ArrowDown'); await wt(100);
C1 = await cards(); assert.deepEqual(C1.slice(0, 3), [C0[0], C0[1], C0[2]], 'arrow key moved it back');
// drag the 3rd box's handle onto the 1st box (pointer events)
const box = async sel => ev(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, sel);
await ev(() => document.querySelectorAll('#board > .card')[2].scrollIntoView({ block: 'center' })); await wt(100);
const third = await ev(() => arrKey(document.querySelectorAll('#board > .card')[2]));
const hp = await ev(() => { const h = document.querySelectorAll('#board > .card')[2].querySelector('.arr-h'); h.scrollIntoView({ block: 'center' }); const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
const tp = await ev(() => { const c = document.querySelectorAll('#board > .card')[0], r = c.getBoundingClientRect(); return { x: r.left + 20, y: r.top + 10 } });
await pg.mouse.move(hp.x, hp.y); await pg.mouse.down(); for (let i = 1; i <= 12; i++) { await pg.mouse.move(hp.x + (tp.x - hp.x) * i / 12, hp.y + (tp.y - hp.y) * i / 12); await wt(20); } await pg.mouse.up(); await wt(100);
C1 = await cards(); console.log('after drag', C1); assert.equal(C1[0], third, 'dragged box is first');
// Done saves per scope
await ev(() => document.querySelector('#arrDone').click()); await wt(300); assert.ok(!(await on()));
const saved = await ev(() => JSON.parse(localStorage.getItem('ywArrange'))); assert.deepEqual(saved['cmd|Command Board'].board.filter(k => k !== 'bizrow'), C1); assert.ok(saved['cmd|Command Board'].board.includes('bizrow'), 'the Businesses row moves as one box'); assert.deepEqual(await cards(), C1, 'draw keeps the saved order');
// other window gets it (storage event) and reload keeps it
const p2 = await ctx.newPage(); await p2.goto('http://127.0.0.1:8165/'); await p2.waitForTimeout(3500); await p2.evaluate(() => { setPageView('command'); roomView = 'Command Board'; draw() });
assert.deepEqual(await cards(p2), C1, 'second window uses the saved order');
await ev(C0 => { arrSaveAll(Object.assign(arrAll(), { 'cmd|Command Board': { board: [C0[3], C0[0]] } })) }, C0); await p2.waitForTimeout(400); // write in window 1 → storage event in window 2
assert.equal((await cards(p2))[0], C0[3], 'storage event re-applies the order'); await p2.close();
await pg.reload(); await wt(3500); await ev(() => { setPageView('command'); roomView = 'Command Board'; draw() }); assert.equal((await cards())[0], C0[3], 'order survives reload');
// 2) long-press (0.4 s) on a box enters arrange mode; nothing opens
const lp = await ev(() => { const c = document.querySelectorAll('#board > .card')[1]; c.scrollIntoView({ block: 'center' }); const r = c.querySelector('h3').getBoundingClientRect(); return { x: r.left + 8, y: r.top + r.height / 2 } });
await pg.mouse.move(lp.x, lp.y); await pg.mouse.down(); await wt(250); assert.ok(!(await on()), 'not before 0.4 s'); await wt(350); assert.ok(await on(), 'long-press enters arrange'); await pg.mouse.up(); await wt(100);
assert.equal(await ev(() => roomView), 'Command Board');
// Esc cancels and restores (nothing saved)
await ev(() => document.querySelector('#board > .card .arr-ctl [data-arrmv="1"]').click()); await pg.keyboard.press('Escape'); await wt(300); assert.ok(!(await on())); assert.equal((await cards())[0], C0[3], 'cancel restores');
// moving (scroll gesture) cancels the long-press
await pg.mouse.move(lp.x, lp.y); await pg.mouse.down(); await wt(80); await pg.mouse.move(lp.x, lp.y + 30, { steps: 4 }); await wt(600); assert.ok(!(await on()), 'moving cancels the long-press'); await pg.mouse.up();
await ev(() => { const c = document.querySelectorAll('#board > .card')[1]; c.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10, pointerType: 'touch', isPrimary: true })); window.scrollBy(0, 60); dispatchEvent(new Event('scroll')) }); await wt(600);
assert.ok(!(await on()), 'scrolling cancels the long-press'); await ev(() => document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
// long-press on a button does nothing
await ev(() => window.scrollTo(0, 0));
// 3) Business board of Your World Apps: own scope, tiles + boxes
await ev(() => { bizStore.activeId = 'yw-apps'; setPageView('apps'); roomView = 'Business Board'; draw() }); await wt(600);
const B0 = await cards(); assert.ok(B0.length >= 3); await ev(() => ask('arrange screen')); await wt(400); assert.ok(await on()); assert.match(await last(), /Arrange mode on for Business Board/);
await ev(() => document.querySelectorAll('#board > .card')[0].querySelector('[data-arrmv="1"]').click()); await ev(() => document.querySelector('#arrDone').click()); await wt(300);
assert.deepEqual((await cards()).slice(0, 2), [B0[1], B0[0]]); assert.ok(await ev(() => !!arrAll()['biz:yw-apps|Business Board']));
assert.equal((await ev(() => { setPageView('command'); roomView = 'Command Board'; draw(); return [...document.querySelectorAll('#board > .card')].map(c => arrKey(c)) }))[0], C0[3], 'command board order is separate');
// 4) Yorri reset layout → default order on this screen only
await ev(() => ask('reset layout')); await wt(400); assert.match(await last(), /Reset the box order on Command Board/); assert.deepEqual(await cards(), C0);
assert.ok(await ev(() => !!arrAll()['biz:yw-apps|Business Board']), 'other screens keep theirs');
await ev(() => ask('reset layout')); await wt(300); assert.match(await last(), /already uses the default order/);
// Settings → General → Screen layout
await ev(() => { ywSettings(true); setTab('general') }); await wt(200); assert.match(await ev(() => document.querySelector('#arrInfo').textContent), /1 screen has a custom box order/);
await ev(() => document.querySelector('#setArrResetAll').click()); await wt(300); assert.deepEqual(await ev(() => arrAll()), {}); await ev(() => ywSettings(false));
// biz tiles drag order is stored under bizrow
await ev(() => { setPageView('command'); roomView = 'Command Board'; draw(); arrEnter('btn') }); const T0 = await tiles();
await ev(() => document.querySelector('#board section.bizrow .biztile [data-arrmv="1"]').click()); await ev(() => document.querySelector('#arrDone').click()); await wt(200);
assert.deepEqual((await tiles()).slice(0, 2), [T0[1], T0[0]]); assert.deepEqual(await ev(() => arrAll()['cmd|Command Board'].bizrow.slice(0, 2)), ['biz:' + T0[1], 'biz:' + T0[0]]);
// unknown/new boxes keep their default place: saved order naming a box that doesn't exist is harmless
await ev(C0 => { arrSaveAll({ 'cmd|Command Board': { board: ['h:Nope', C0[2]] } }); draw() }, C0); assert.deepEqual((await cards()).length, C0.length);
// 5) pop-out screen has the Arrange button
const p3 = await ctx.newPage(); await p3.goto('http://127.0.0.1:8165/?screen=2&room=Finance'); await p3.waitForTimeout(3000);
assert.ok(await p3.evaluate(() => !!document.querySelector('.arr-satbar [data-arr="on"]'))); await p3.close();
assert.ok(await ovf() <= 0); assert.deepEqual(errs, []);
console.log('arrange: OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
