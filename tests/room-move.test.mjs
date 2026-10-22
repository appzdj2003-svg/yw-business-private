// Headless check: move rooms between businesses / sub-businesses. Arrange mode: "Move to…" picker (business tray, hierarchy, current one disabled),
// drag a room box onto the tray, a business tile on the Command board or a business tab (highlight while hovering), long-press then drag;
// keeps id/type/role/data/connection, built-ins stay built-in, label clash renamed; toast with Undo; Vault logs ROOM MOVED; other windows get it (storage);
// blocks nonsense (same business, second Calendar, custom-inbox rooms) and warns for Support/Maintenance; Yorri "move <room> to <business>" / "undo room move".
// Env DESK=1 / CAR=1. No network.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8167);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const DESK = !!process.env.DESK, CAR = !!process.env.CAR;
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : CAR ? { viewport: { width: 1200, height: 800 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8167') ? r.continue() : r.abort());
const pg = await ctx.newPage(); const errs = [], dialogs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => { dialogs.push(d.message()); d.accept() });
await pg.goto('http://127.0.0.1:8167/'); await pg.waitForTimeout(3500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const toastT = () => ev(() => { const t = document.querySelector('#ywToast'); return t.hidden ? '' : t.innerText.replace(/\s+/g, ' ') });
const rooms = id => ev(id => bizStore.businesses.find(b => b.id === id).rooms.map(r => r.label), id);
const R = (bid, lab) => ev(([bid, lab]) => { const r = bizStore.businesses.find(b => b.id === bid).rooms.find(r => r.label === lab); return r && { id: r.id, type: r.type, role: r.role || '', label: r.label } }, [bid, lab]);
const ovf = () => ev(() => document.documentElement.scrollWidth - innerWidth);
const go = id => ev(id => { bizStore.activeId = id; setPageView('apps'); roomView = 'Business Board'; draw(); scrollTo(0, 0) }, id);
const vault = () => ev(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]').map(e => e.decision + ' · ' + e.title));
// a connection on Hunt › Tickets travels with the room
const T0 = await R('hunt', 'Tickets'); await ev(k => connSet(k, { type: 'rest', url: 'https://tickets.example', live: false }), 'hunt/' + T0.id);
const p2 = await ctx.newPage(); await p2.goto('http://127.0.0.1:8167/'); await p2.waitForTimeout(3000);
// 1) Move to… picker
await go('hunt'); await wt(300); await ev(() => arrEnter('btn')); await wt(200);
const btn = await ev(() => [...document.querySelectorAll('#board .card[data-room] .arr-to')].map(b => b.textContent)); assert.ok(btn.length >= 3 && btn.every(t => t === 'Move to…'), 'every room box has Move to…');
await ev(id => document.querySelector(`#board .card[data-room="hunt/${id}"] .arr-to`).click(), T0.id); await wt(200);
let tray = await ev(() => { const T = document.querySelector('#arrTray'); return { hidden: T.hidden, role: T.getAttribute('role'), h: T.querySelector('h5').innerText, b: [...T.querySelectorAll('[data-arrdrop]')].map(x => (x.classList.contains('kid') ? '› ' : '') + x.textContent + (x.getAttribute('aria-disabled') === 'true' ? ' [x]' : '')), focus: document.activeElement.dataset.arrdrop } });
console.log('tray', tray); assert.equal(tray.hidden, false); assert.equal(tray.role, 'dialog'); assert.match(tray.h, /Move Tickets to/);
assert.deepEqual(tray.b, ['Your World Apps', '› Weather Radar', '› Hunt · here [x]', 'Safe Rack']); assert.equal(tray.focus, 'yw-apps');
const tb = await ev(() => [...document.querySelectorAll('#arrTray .at-b')].map(x => x.getBoundingClientRect().height)); assert.ok(tb.every(h => h >= (CAR ? 60 : 48)), 'big targets ' + tb);
assert.ok(await ovf() <= 0, 'no overflow with the tray open');
await ev(() => document.querySelector('#arrTray [data-arrdrop="hunt"]').click()); await wt(200); assert.match(await toastT(), /Already in Hunt/); // same business: refused
await ev(() => document.querySelector('#arrTray [data-arrdrop="weather"]').click()); await wt(500);
assert.ok(!(await rooms('hunt')).includes('Tickets')); let m = await R('weather', 'Tickets'); assert.deepEqual(m, T0, 'same room object (id/type/label)');
assert.deepEqual(await ev(() => Object.keys(connAll()).filter(k => /tickets|/.test(k) && connAll()[k].url === 'https://tickets.example')), ['weather/' + T0.id], 'connection moved with the room');
assert.match(await toastT(), /Moved Tickets from Your World Apps › Hunt to Your World Apps › Weather Radar\. Undo/); assert.equal(await ev(() => document.body.classList.contains('arr-on')), false);
assert.match((await vault())[0], /^ROOM MOVED · Tickets: Your World Apps › Hunt → Your World Apps › Weather Radar$/); assert.equal(await ev(() => JSON.parse(localStorage.getItem('ywVaultAudit'))[0].move), true);
await p2.waitForTimeout(400); assert.ok(await p2.evaluate(id => bizStore.businesses.find(b => b.id === 'weather').rooms.some(r => r.id === id), T0.id), 'other window got the move');
// Undo
const hi = (await rooms('hunt')); await ev(() => document.querySelector('#toastUndo').click()); await wt(400);
assert.deepEqual(await rooms('hunt'), ['Seasons', 'Tickets', 'KPIs', 'Calendar'], 'undo puts it back in place'); assert.match((await vault())[0], /^ROOM MOVE UNDONE · Tickets: back to Your World Apps › Hunt/);
assert.ok(await ev(id => !!connAll()['hunt/' + id], T0.id)); assert.ok(hi.length === 3);
// 2) Drag a room box onto a tray entry (mouse/pen) — highlight while hovering
await go('weather'); await wt(300); await ev(() => arrEnter('btn')); await wt(200);
const SB = await R('weather', 'Storm board');
const hp = await ev(id => { const h = document.querySelector(`#board .card[data-room="weather/${id}"] .arr-h`); h.scrollIntoView({ block: 'center' }); const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, SB.id);
await pg.mouse.move(hp.x, hp.y); await pg.mouse.down(); await pg.mouse.move(hp.x - 20, hp.y - 20, { steps: 3 }); await wt(150);
tray = await ev(() => ({ hidden: document.querySelector('#arrTray').hidden, mode: document.querySelector('#arrTray').dataset.mode })); assert.deepEqual(tray, { hidden: false, mode: 'drag' }, 'tray shows while dragging');
const tp = await ev(() => { const r = document.querySelector('#arrTray [data-arrdrop="hunt"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
await pg.mouse.move(tp.x, tp.y, { steps: 8 }); await wt(100); assert.ok(await ev(() => document.querySelector('#arrTray [data-arrdrop="hunt"]').classList.contains('arr-hot')), 'drop target highlighted');
await pg.mouse.up(); await wt(500); assert.deepEqual((await R('hunt', 'Storm board')).id, SB.id); assert.match(await toastT(), /Moved Storm board .* to Your World Apps › Hunt/); assert.ok(await ev(() => document.querySelector('#arrTray').hidden));
// 3) Drag onto a business tab (sub-business nav) — from Hunt back to Weather Radar
await go('hunt'); await wt(300); await ev(() => arrEnter('btn')); await wt(200);
const hp2 = await ev(id => { const h = document.querySelector(`#board .card[data-room="hunt/${id}"] .arr-h`); h.scrollIntoView({ block: 'center' }); const r = h.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, SB.id);
await pg.mouse.move(hp2.x, hp2.y); await pg.mouse.down(); await pg.mouse.move(hp2.x - 10, hp2.y - 10, { steps: 2 }); await wt(100);
const tab = await ev(() => { const t = document.querySelector('#bizNav [data-bznav="weather"]'); t.scrollIntoView({ block: 'nearest' }); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
await ev(() => { document.querySelector('#arrTray').style.display = 'none' }); // tab hidden under the tray on small screens: test the tab path itself
await pg.mouse.move(tab.x, tab.y, { steps: 8 }); await wt(100); assert.ok(await ev(() => document.querySelector('#bizNav [data-bznav="weather"]').classList.contains('arr-hot')));
await pg.mouse.up(); await wt(500); await ev(() => { document.querySelector('#arrTray').style.display = '' }); assert.ok(await R('weather', 'Storm board'), 'dropped on the Weather Radar tab');
// 4) Command board: drop onto a business tile (long-press, then drag in one gesture)
await ev(() => { bizStore.activeId = 'yw-apps'; setPageView('command'); roomView = 'Command Board'; draw(); scrollTo(0, 0) }); await wt(300);
// business tiles only exist on the Command board (no room boxes there), so check the tile is a live drop target
assert.ok(await ev(() => { const t = document.querySelector('#board .biztile[data-bizgo="safe-rack"]'); t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); const d = rmDropAt(r.left + 5, r.top + 5, null); return d === t }), 'business tiles are drop targets');
await go('hunt'); await wt(300); const KP = await R('hunt', 'KPIs');
const lp = await ev(id => { const c = document.querySelector(`#board .card[data-room="hunt/${id}"]`); c.scrollIntoView({ block: 'center' }); const r = c.querySelector('h3').getBoundingClientRect(); return { x: r.left + 6, y: r.top + r.height / 2 } }, KP.id);
await pg.mouse.move(lp.x, lp.y); await pg.mouse.down(); await wt(550); assert.ok(await ev(() => document.body.classList.contains('arr-on')), 'long-press enters arrange');
await pg.mouse.move(lp.x + 6, lp.y + 6, { steps: 2 }); await wt(100); assert.equal(await ev(() => document.querySelector('#arrTray').dataset.mode), 'drag', 'same press keeps dragging');
const sr = await ev(() => { const r = document.querySelector('#arrTray [data-arrdrop="safe-rack"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } });
await pg.mouse.move(sr.x, sr.y, { steps: 8 }); await pg.mouse.up(); await wt(500); assert.deepEqual((await R('safe-rack', 'KPIs')).id, KP.id);
// 5) blocks + warnings
await go('hunt'); await ev(() => arrEnter('btn')); const cal = await R('hunt', 'Calendar');
await ev(id => document.querySelector(`#board .card[data-room="hunt/${id}"] .arr-to`).click(), cal.id); await ev(() => document.querySelector('#arrTray [data-arrdrop="weather"]').click()); await wt(300);
assert.match(await toastT(), /Can’t move: Weather Radar already has its own Calendar room/); assert.ok(await R('hunt', 'Calendar'));
await ev(() => { rmTrayClose(); arrExit(false) });
await go('safe-rack'); await ev(() => arrEnter('btn')); const MT0 = await R('safe-rack', 'Maintenance'); dialogs.length = 0;
await ev(id => document.querySelector(`#board .card[data-room="safe-rack/${id}"] .arr-to`).click(), MT0.id); await ev(() => document.querySelector('#arrTray [data-arrdrop="yw-apps"]').click()); await wt(400);
assert.match(dialogs[0] || '', /Move Maintenance to Your World Apps\?[\s\S]*eMaint work orders/); assert.deepEqual(await R('yw-apps', 'Maintenance'), MT0, 'built-in maint room keeps its type');
await ev(() => document.querySelector('#toastUndo').click()); await wt(300); assert.ok(await R('safe-rack', 'Maintenance'));
await ev(() => { INB.list = [{ id: 'ops', label: 'Ops mail', room: 'Safe Rack › Overview' }] });
assert.match(await ev(() => (rmCheck('safe-rack/sr-ov', 'yw-apps') || {}).block || ''), /“Ops mail” inbox, which the server links by name to “Safe Rack › Overview”/); await ev(() => { INB.list = null });
// 6) Yorri
await ev(() => { bizStore.activeId = 'yw-apps'; setPageView('apps'); roomView = 'Business Board'; draw() });
await ev(() => ask('move growth to hunt')); await wt(500); assert.match(await last(), /Moved Growth from Your World Apps to Your World Apps › Hunt\..*Note: Growth covers all Your World apps/);
assert.deepEqual(await R('hunt', 'Growth'), { id: 'yw-growth', type: 'growth', role: 'growth', label: 'Growth' });
await ev(() => ask('undo room move')); await wt(400); assert.match(await last(), /Moved Growth back/); assert.ok(await R('yw-apps', 'Growth'));
await ev(() => ask('move overview from safe rack to your world apps')); await wt(500); assert.match(await last(), /Moved Overview \(now “Overview 2”, the name was taken\) from Safe Rack to Your World Apps/);
await ev(() => ask('undo room move')); await wt(300); assert.ok(await R('safe-rack', 'Overview'));
await ev(() => ask('move calendar to hunt')); await wt(300); assert.match(await last(), /didn’t move it: Hunt already has its own Calendar room/);
await ev(() => ask('move roadmap to your world apps')); await wt(300); assert.match(await last(), /didn’t move it: Roadmap is already in Your World Apps/);
await ev(() => ask('move support to safe rack')); await wt(400); assert.match(await last(), /Moved Support .*Note: Support keeps the same inbox and ticket routing/); await ev(() => ask('undo room move')); await wt(300);
// not a room/business → other commands still get it (calendar "move my 3pm to 4")
assert.equal(await ev(() => { const c = YC.list.find(x => x.id === 'org.moveroom'); return !!c.match('', 'move my 3pm to 4') || !!c.match('', 'move this to automated') }), false);
assert.ok(await ev(() => YC.list.some(c => c.id === 'org.moveroom' && /Moves a room to another business/.test(c.help))));
assert.ok(await ovf() <= 0); assert.deepEqual(errs, []); await p2.close();
console.log('room-move: OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
