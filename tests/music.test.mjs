// Headless check of the Music business: Auto/Manual tile labels, Music Settings room (masked keys only, saves via PUT /music/keys + /music/settings,
// manual entry via POST /music/update), Yorri "music settings", desk + car layout. All network mocked. Run: node tests/music.test.mjs
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(process.env.HTML || new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8171);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', NOW = Date.now(); const reqs = [];
const man = v => ({ value: v, asOf: v == null ? null : '2026-11-04' }); const M = o => Object.fromEntries(['spotify_monthly_listeners', 'spotify_followers', 'tiktok_followers', 'tiktok_likes', 'tiktok_views', 'soundcloud_followers', 'soundcloud_plays'].map(k => [k, man(o[k] ?? null)]));
const STATE = { asOf: NOW, youtube: { configured: true, error: null, asOf: NOW }, spotify: { configured: true, error: null, asOf: NOW }, sources: {},
  artists: [{ id: 'dirty-road-drift', name: 'Dirty Road Drift', platforms: ['spotify', 'youtube', 'tiktok', 'soundcloud'], manual: M({ spotify_monthly_listeners: 6 }), history: [], ytHistory: [], youtube: { subscribers: 1, views: 56, videos: 2, recent: [], asOf: NOW }, spotify: { followers: 4, popularity: 3, asOf: NOW }, posts: [], claims: [], links: {} },
    { id: 'black-mirage', name: 'Black Mirage', platforms: ['spotify', 'youtube'], manual: M({}), history: [], ytHistory: [], youtube: { subscribers: 0, views: 0, videos: 0, recent: [], asOf: NOW }, spotify: null, posts: [], claims: [], links: {} }] };
const SET = { artists: [{ id: 'dirty-road-drift', name: 'Dirty Road Drift', channelId: 'UCDnSfCl5kC4hS7dDFzkgVFQ', spotifyId: '2DyRhfwZYc4f4zUTdYYD3S', tiktok: 'dirtyroaddrift', soundcloud: 'https://soundcloud.com/dirtyroaddrift' }, { id: 'black-mirage', name: 'Black Mirage', channelId: 'UC6MF9x7Vh9OXTnybzOXbcpQ', spotifyId: '2DvBGZ0jnVLBiHLjKMUnkb', tiktok: '', soundcloud: '' }],
  sources: { youtube: { label: 'YouTube (Data API v3)', canAuto: true, mode: 'auto', on: true, intervalH: 1, lastOk: NOW, lastError: null, note: 'n' }, spotify_api: { label: 'Spotify Web API (followers, popularity)', canAuto: true, mode: 'auto', on: true, intervalH: 6, lastOk: null, lastError: null, note: 'n' }, tiktok: { label: 'TikTok', canAuto: false, mode: 'manual', on: true, intervalH: 24, lastOk: null, lastError: null, note: 'n' } },
  keys: { spotifyClientId: null, spotifyClientSecret: null, youtubeKey: null, youtubeKeyFallback: true } };
const SECRET = 'S3cretSpotifySecretValue1234wxyz';
for (const car of [false, true]) {
  const p = await b.newPage({ viewport: { width: car ? 1280 : 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.addInitScript(([car, SV]) => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); if (car) localStorage.setItem('ywCarLayout', '1'); }, [car, SV]);
  await p.route(SV + '/**', async r => { const u = new URL(r.request().url()), m = r.request().method(), body = r.request().postData(); reqs.push([m, u.pathname, body]);
    let j = {}; if (u.pathname === '/music/state') j = STATE; else if (u.pathname === '/music/settings') j = SET; else if (u.pathname === '/music/keys') { const o = JSON.parse(body); j = { ...SET, keys: { ...SET.keys, spotifyClientSecret: o.spotifyClientSecret ? '••••' + o.spotifyClientSecret.slice(-4) : null } }; SET.keys = j.keys; } else if (u.pathname === '/music/update') j = { ok: true };
    await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(j) }); });
  await p.goto('http://localhost:8171/'); await p.waitForTimeout(800);
  await p.evaluate(SV => { const c = connAll(); c[SUP_KEY()] = { type: 'server', url: SV, token: 't', live: true }; connSave(c); muOpen('overview'); }, SV); await p.waitForTimeout(800);
  const ov = await p.evaluate(() => document.body.innerText);
  assert.match(ov, /Auto\s*· pulled/); assert.match(ov, /Manual\s*· as of 2026-11-04/); assert.ok(ov.includes('Music Settings'), 'settings tab'); assert.ok(!/Aaron|Your World/.test(await p.evaluate(() => document.querySelector('.mk.mk-full').innerText)), 'no personal/brand names in Music');
  await p.evaluate(() => muOpen('settings')); await p.waitForTimeout(800);
  const st = await p.evaluate(() => document.body.innerText); assert.match(st, /Spotify developer app — setup steps/i); assert.match(st, /not configured/); assert.match(st, /using the Marketing YouTube key/); assert.match(st, /Manual only/);
  await p.fill('.mu-keys [data-f="spotifyClientSecret"]', SECRET); await p.click('[data-mu="save-keys"]'); await p.waitForTimeout(1500);
  const st2 = await p.evaluate(() => document.body.innerText + document.body.innerHTML); assert.ok(!st2.includes(SECRET), 'secret never re-shown'); assert.ok(st2.includes('••••wxyz'), 'masked last 4');
  await p.fill('.mu-man-f [data-k="tiktok_followers"]', '12'); await p.click('[data-mu="manual"]'); await p.waitForTimeout(1000);
  const up = reqs.filter(r => r[1] === '/music/update').pop(); assert.ok(up && JSON.parse(up[2]).stats.tiktok_followers === 12);
  await p.click('[data-mu="save-src"]'); await p.waitForTimeout(400); assert.ok(reqs.some(r => r[0] === 'PUT' && r[1] === '/music/settings' && JSON.parse(r[2]).sources.youtube && !('mode' in JSON.parse(r[2]).sources.tiktok)));
  const y = await p.evaluate(() => { const c = YC.list.find(x => x.id === 'mu.settings'); return [c.match(null, 'music settings'), c.match(null, 'open music settings'), (typeof ycCoverage === 'function' ? ycCoverage() : []).length]; });
  assert.deepEqual(y, [true, true, 0]); assert.ok(!/Aaron|Your World/.test(await p.evaluate(() => document.querySelector('.mk.mk-full').innerText)), 'no names in Music Settings'); assert.deepEqual(errs, []);
  if (car) assert.ok(await p.evaluate(() => document.body.classList.contains('car-layout')));
  await p.close(); }
await b.close(); srv.close(); console.log('music: OK');
