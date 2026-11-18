// Headless check: Settings search finds lazily rendered cards (vendor, App Store, Bing, Twilio)
// after the first keystroke, filters at card/row level, highlights, shows a results header or
// empty message, and restores the tab view on clear / Escape / tab click. Yorri
// "search settings for …" / "find setting …". Env CAR=1 uses the car layout (48px targets).
// Screenshots under SHOTDIR or /workspace/settings-search-fix/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8176);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe });
const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/settings-search-fix';
fs.mkdirSync(SHOT, { recursive: true });
const tag = CAR ? 'car' : 'desk';
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); }, CAR);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8176') ? r.continue() : r.abort());
await pg.goto('http://127.0.0.1:8176/');
await pg.waitForTimeout(800);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const vis = () => ev(() => [...document.querySelectorAll('#setPage section[data-tab]')].filter(s => !s.hidden).map(s => (s.querySelector('h4') || s).textContent.replace(/\s+/g, ' ').trim()));
const meta = () => ev(() => { const m = document.querySelector('#setSearchMeta'); return !m || m.hidden ? '' : m.innerText.replace(/\s+/g, ' ').trim(); });
const visibleText = () => ev(() => [...document.querySelectorAll('#setPage section[data-tab]')].filter(s => !s.hidden).map(s => s.innerText).join('\n'));
const hits = () => ev(() => [...document.querySelectorAll('#setSearchMeta .set-hit')].map(b => b.textContent));
const marks = () => ev(() => [...document.querySelectorAll('#setPage mark.set-hl')].map(m => m.textContent));
const hidCount = () => ev(() => document.querySelectorAll('#setPage .set-hid').length);
const minHit = () => ev(() => { const b = document.querySelector('#setSearchMeta .set-hit'); return b ? Math.round(b.getBoundingClientRect().height) : 0; });
async function search(q) { await ev(q => { const i = document.querySelector('#setSearch'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); }, q); await wt(700); }
async function shot(name) { await pg.screenshot({ path: `${SHOT}/${tag}-${name}.png`, fullPage: false }); }

await ev(() => ywSettings(true)); await wt(400);
await ev(() => setTab('general')); await wt(200);
// Lazy connections cards are not built until search (or visiting the tab)
assert.equal(await ev(() => !!document.querySelector('#csCard')), false, 'csCard should be lazy before search');
assert.equal(await ev(() => !!document.querySelector('#scCard')), false, 'scCard should be lazy before search');
assert.deepEqual(await vis(), ['Quick switches', 'Screen layout', 'Appearance', 'Accessibility']);

// Keep a typed value through search/clear
await ev(() => { const i = document.querySelector('#llmKey'); if (i) i.value = 'KEEP-ME'; });

await search('vendor');
assert.match(await meta(), /\d+ results? for “vendor”/i, 'vendor meta');
assert.ok((await visibleText()).match(/App Store Connect/i), 'vendor finds App Store Connect');
assert.ok((await hits()).some(t => /app store/i.test(t)), 'vendor hit label');
assert.ok(await ev(() => !document.querySelector('section[data-tab="connections"]').hidden), 'connections section shown');
await shot('vendor');

await search('app store');
assert.match(await meta(), /results? for “app store”/i);
assert.ok(/App Store Connect/i.test(await visibleText()), 'app store text');
assert.ok((await marks()).some(t => /app store/i.test(t)), 'app store highlight');
await shot('appstore');

await search('bing');
assert.match(await meta(), /results? for “bing”/i);
assert.ok(/Bing/i.test(await visibleText()), 'bing text');
assert.ok((await marks()).some(t => /bing/i.test(t)), 'bing highlight');
await shot('bing');

await search('theme');
assert.match(await meta(), /results? for “theme”/i);
assert.ok((await vis()).some(t => /Appearance|Quick switches/i.test(t)), 'theme sections');
assert.ok(/theme/i.test(await visibleText()), 'theme text');
await shot('theme');

await search('twilio');
assert.match(await meta(), /results? for “twilio”/i);
assert.ok(/Twilio/i.test(await visibleText()), 'twilio text');
assert.ok((await vis()).some(t => /Alerts/i.test(t)), 'twilio alerts section');
if (CAR) assert.ok((await minHit()) >= 44, 'car hit target height ' + await minHit());
await shot('twilio');

await search('zzzz');
assert.match(await meta(), /No settings match “zzzz” — try: App Store, keys, theme, alerts/);
assert.equal((await vis()).length, 0, 'no sections for zzzz');
await shot('zzzz');

// Clear restores the general tab view
await search('');
assert.equal(await meta(), '');
assert.deepEqual(await vis(), ['Quick switches', 'Screen layout', 'Appearance', 'Accessibility']);
assert.equal(await hidCount(), 0);
assert.equal(await ev(() => document.querySelectorAll('#setPage mark.set-hl').length), 0);
assert.equal(await ev(() => (document.querySelector('#llmKey') || {}).value), 'KEEP-ME', 'typed key not wiped');
await shot('cleared');

// Escape clears an active search instead of closing Settings
await search('vendor');
assert.match(await meta(), /vendor/);
await pg.keyboard.press('Escape'); await wt(200);
assert.equal(await ev(() => document.body.classList.contains('view-settings')), true, 'settings stays open');
assert.equal(await ev(() => document.querySelector('#setSearch').value), '');
assert.deepEqual(await vis(), ['Quick switches', 'Screen layout', 'Appearance', 'Accessibility']);

// Clicking a tab restores the tab view
await search('twilio');
assert.ok((await vis()).some(t => /Alerts/i.test(t)));
await ev(() => document.querySelector('#setTabs [data-stab="advanced"]').click()); await wt(200);
assert.equal(await ev(() => document.querySelector('#setSearch').value), '');
assert.deepEqual(await vis(), ['Advanced']);
assert.equal(await hidCount(), 0);

// Yorri commands
await ev(() => setTab('general'));
await ev(() => ask('search settings for vendor')); await wt(900);
assert.equal(await ev(() => document.querySelector('#setSearch').value), 'vendor');
assert.match(await meta(), /vendor/);
assert.match(await last(), /Searching Settings for vendor/i);
await ev(() => ask('find setting theme')); await wt(900);
assert.equal(await ev(() => document.querySelector('#setSearch').value), 'theme');
assert.match(await meta(), /theme/);
assert.match(await last(), /Searching Settings for theme/i);
assert.ok(await ev(() => YC.list.some(c => c.id === 'set.search')), 'set.search command registered');
const help = await ev(() => ycListHTML('search settings'));
assert.match(help, /search settings for vendor/i);
assert.match(help, /find setting theme/i);

console.log('vis vendor path ok; meta samples logged');
console.log('errors:', errs);
if (errs.length) process.exitCode = 1;
await b.close(); srv.close();
