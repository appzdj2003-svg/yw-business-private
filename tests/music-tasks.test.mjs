// Headless check: Music Claims & To-dos delete/archive, Clear completed, Archived view,
// Yorri "delete task" / "clear completed tasks" / "show archived tasks", desk + car (44px buttons).
// Test / SAMPLE fixture data only. Run: node tests/music-tasks.test.mjs
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8173);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test'; const NOW = Date.now();
const man = v => ({ value: v, asOf: v == null ? null : '2026-11-04' }); const M = o => Object.fromEntries(['spotify_monthly_listeners', 'spotify_followers', 'tiktok_followers', 'tiktok_likes', 'tiktok_views', 'soundcloud_followers', 'soundcloud_plays'].map(k => [k, man(o[k] ?? null)]));
function baseState() {
  return { asOf: NOW, youtube: { configured: true, error: null, asOf: NOW }, spotify: { configured: true, error: null, asOf: NOW }, sources: {},
    artists: [
      { id: 'dirty-road-drift', name: 'Dirty Road Drift', platforms: ['spotify', 'youtube', 'tiktok'], manual: M({}), history: [], ytHistory: [], youtube: { subscribers: 1, views: 1, videos: 1, recent: [], asOf: NOW }, spotify: null,
        posts: [{ date: null, platform: 'TikTok', title: 'SAMPLE visualizer', status: 'planned', url: null }, { date: '2026-11-01', platform: 'YouTube', title: 'SAMPLE posted short', status: 'posted', url: null, views: 9 }],
        claims: [{ item: 'SAMPLE YouTube Official Artist Channel', status: 'pending', note: 'test only', checkedAt: '2026-11-04' }, { item: 'SAMPLE Spotify for Artists', status: 'claimed', note: 'test only', checkedAt: '2026-11-04' }],
        archivedClaims: [], archivedPosts: [], links: {} },
      { id: 'black-mirage', name: 'Black Mirage', platforms: ['spotify', 'youtube'], manual: M({}), history: [], ytHistory: [], youtube: { subscribers: 0, views: 0, videos: 0, recent: [], asOf: NOW }, spotify: null, posts: [], claims: [], archivedClaims: [], archivedPosts: [], links: {} }] };
}
const reqs = [];
for (const car of [false, true]) {
  let STATE = baseState();
  const p = await b.newPage({ viewport: { width: car ? 1280 : 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(([car]) => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); window.confirm = () => true; }, [car]);
  await p.route(SV + '/**', async r => {
    const u = new URL(r.request().url()), m = r.request().method(), body = r.request().postData(); reqs.push([m, u.pathname, body, car]);
    let j = {};
    if (u.pathname === '/music/state') j = STATE;
    else if (u.pathname === '/music/archive') {
      const b = JSON.parse(body || '{}');
      const art = a => STATE.artists.find(x => x.id === a || x.name === a);
      const move = (list, arch, pred, via) => { const i = list.findIndex(pred); if (i < 0) return; const row = list.splice(i, 1)[0]; arch.push({ ...row, archivedAt: '2026-11-17T12:00:00.000Z', archivedVia: via || 'delete' }); };
      if (b.clearCompleted) {
        let n = 0;
        for (const a of STATE.artists) {
          for (const c of [...a.claims]) if (/^(posted|claimed|approved|done|live|verified)/i.test(c.status || '')) { move(a.claims, a.archivedClaims, x => x.item === c.item, 'clear-completed'); n++; }
          for (const p of [...a.posts]) if (/^(posted|claimed|approved|done|live|verified)/i.test(p.status || '')) { move(a.posts, a.archivedPosts, x => x.title === p.title && x.platform === p.platform, 'clear-completed'); n++; }
        }
        j = { ok: true, archived: n, state: STATE };
      } else if (b.kind === 'post') {
        const a = art(b.artist); move(a.posts, a.archivedPosts, x => x.title === b.title && x.platform === b.platform, b.via || 'delete'); j = { ok: true, state: STATE };
      } else {
        const a = art(b.artist); move(a.claims, a.archivedClaims, x => x.item === b.item, b.via || 'delete'); j = { ok: true, state: STATE };
      }
    } else if (u.pathname === '/music/reopen') {
      const b = JSON.parse(body || '{}'); const a = STATE.artists.find(x => x.id === b.artist || x.name === b.artist);
      if (b.kind === 'post') { const i = a.archivedPosts.findIndex(x => x.title === b.title && x.platform === b.platform); if (i >= 0) { const row = a.archivedPosts.splice(i, 1)[0]; delete row.archivedAt; a.posts.push(row); } }
      else { const i = a.archivedClaims.findIndex(x => x.item === b.item); if (i >= 0) { const row = a.archivedClaims.splice(i, 1)[0]; delete row.archivedAt; a.claims.push(row); } }
      j = { ok: true, state: STATE };
    } else if (u.pathname === '/music/settings') j = { artists: STATE.artists.map(a => ({ id: a.id, name: a.name })), sources: {}, keys: {} };
    else if (u.pathname === '/music/update') j = { ok: true, state: STATE };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(j) });
  });
  await p.goto('http://localhost:8173/'); await p.waitForTimeout(600);
  await p.evaluate(SV => { const c = connAll(); c[SUP_KEY()] = { type: 'server', url: SV, token: 't', live: true }; connSave(c); muOpen('claims'); }, SV); await p.waitForTimeout(800);
  const txt = await p.evaluate(() => document.querySelector('.mk.mk-full').innerText);
  assert.match(txt, /SAMPLE YouTube Official Artist Channel/); assert.match(txt, /SAMPLE Spotify for Artists/);
  assert.match(txt, /Clear completed/); assert.ok(await p.$('[data-mu="arch-claim"]'), 'delete on claim');
  if (car) {
    assert.ok(await p.evaluate(() => document.body.classList.contains('car-layout')));
    const h = await p.evaluate(() => Math.min(...[...document.querySelectorAll('.mu-task .og-b')].map(b => b.getBoundingClientRect().height)));
    assert.ok(h >= 44, 'car claim buttons are at least 44px, got ' + h);
  }
  await p.click('[data-mu="arch-claim"][data-item="SAMPLE YouTube Official Artist Channel"]'); await p.waitForTimeout(600);
  assert.ok(reqs.some(r => r[0] === 'POST' && r[1] === '/music/archive' && /YouTube Official Artist Channel/.test(r[2] || '') && r[3] === car), 'archive posted');
  const vault = await p.evaluate(() => JSON.parse(localStorage.getItem('ywVaultAudit') || '[]'));
  assert.ok(vault.some(e => e.decision === 'ARCHIVED' && /SAMPLE YouTube Official Artist Channel/.test(e.title) && e.lane === 'Music'), 'vault log');
  await p.click('[data-mu="view-arch"]'); await p.waitForTimeout(200);
  const arch = await p.evaluate(() => document.querySelector('.mk.mk-full').innerText);
  assert.match(arch, /SAMPLE YouTube Official Artist Channel/); assert.match(arch, /Archived/);
  await p.click('[data-mu="view-open"]'); await p.waitForTimeout(200);
  await p.click('[data-mu="clear-completed"]'); await p.waitForTimeout(600);
  assert.ok(reqs.some(r => r[0] === 'POST' && r[1] === '/music/archive' && /clearCompleted/.test(r[2] || '') && r[3] === car));
  const after = await p.evaluate(() => document.querySelector('.mk.mk-full').innerText);
  assert.match(after, /SAMPLE Spotify for Artists/); // now in archived view after clear
  await p.evaluate(() => { MU.view = 'open'; muOpen('posts'); }); await p.waitForTimeout(400);
  assert.ok(await p.$('[data-mu="arch-post"][data-title="SAMPLE visualizer"]'), 'delete on planned post');
  // Yorri commands (once, on desk pass)
  if (!car) {
    const cmds = await p.evaluate(() => {
      const d = YC.list.find(x => x.id === 'mu.delTask'), c = YC.list.find(x => x.id === 'mu.clearCompleted'), a = YC.list.find(x => x.id === 'mu.showArchived');
      return {
        d: !!(d && d.match(null, 'delete task SAMPLE YouTube Official Artist Channel') && d.match(null, 'delete the SAMPLE visualizer post')),
        c: !!(c && c.match(null, 'clear completed tasks')),
        a: !!(a && a.match(null, 'show archived tasks') && a.match(null, 'open archived tasks')),
        help: [d.help, c.help, a.help].join(' ')
      };
    });
    assert.ok(cmds.d && cmds.c && cmds.a, 'Yorri matchers');
    assert.match(cmds.help, /Archived/);
    await p.evaluate(() => ycRun('show archived tasks')); await p.waitForTimeout(500);
    const y = await p.evaluate(() => ([...document.querySelectorAll('#log p.y')].pop() || {}).innerText || '');
    assert.match(y, /Archived/);
  }
  assert.deepEqual(errs, []);
  await p.close();
}
await b.close(); srv.close(); console.log('music-tasks: OK');
