// Headless check: Settings regrouped into tabs (General · Businesses & rooms · Connections · Alerts & push · Handoffs · Growth · Inbox sorting · Yorri & AI · Security & Vault · Advanced),
// Growth + Handoffs cards in their own tabs (ycCard switches tab), Connections jump-to, search, Security & Vault never shows secret values, Yorri "open settings <section>";
// Marketing traffic from Google Analytics (GA4) with Plausible as fallback: provider badge, property + Measurement ID / no web stream / stream check unavailable,
// no-web-stream + empty notes, Settings → Marketing traffic row + web streams (GET /kpi/streams), Plausible key marked optional fallback. Env DESK=1 / CAR=1. All network mocked.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import assert from 'node:assert';
const html = fs.readFileSync(new URL('../index.html', import.meta.url)); const srv = http.createServer((q, r) => { if (q.url.startsWith('/sw.js')) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': 'text/html' }); r.end(html); }).listen(8166);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe }); const SV = 'https://sv.test', DESK = !!process.env.DESK, CAR = !!process.env.CAR, NOW = Date.now();
const TOK = 'tok-SECRET-' + 'z'.repeat(30), XAI = 'xai-SECRETKEY-0123456789';
const APPS = [{ id: 'weather', label: 'Weather Radar', domain: 'weather.yourworldapps.si', url: 'https://weather.yourworldapps.si/' }, { id: 'hunt', label: 'Hunt', domain: 'hunt.yourworldapps.si', url: 'https://hunt.yourworldapps.si/' }, { id: 'market', label: 'Market Analyzer', domain: '', url: '' }];
const PL = ['tiktok', 'youtube', 'instagram', 'facebook', 'x', 'reddit', 'pinterest', 'linkedin', 'medium', 'quora', 'hackernews', 'directory'];
const plats = () => PL.map(id => ({ id, label: id, visitors: 0, visits: 0, playClicks: 0, campaigns: [], traffic: { id, label: id, visitors: 0, visits: 0, goVisitors: 0, playClicks: 0, sources: [] } }));
const base = (app, o) => ({ app: APPS.find(a => a.id === app), asOf: NOW, connected: true, hasData: false, totals: { visitors: 0, visits: 0, pageviews: 0, bounceRate: 0, visitDuration: 0 }, daily: [], pages: [], sources: [], utm: [], playClicks: { visitors: 0, clicks: 0 }, platforms: plats(), otherUtm: [], traffic: { platforms: [], unmapped: [], go: { ok: true }, playBySource: { ok: true } }, ...o });
const STATS = (app, rg) => app === 'market' ? { app: APPS[2], asOf: NOW, connected: false, state: 'no-site', note: 'Market Analyzer has no website yet (site TBD).' }
  : app === 'weather' && rg === '7d' ? base('weather', { state: 'live', provider: 'ga4', hasData: true, ga4: { propertyId: '559303196', property: 'Weather Radar', host: 'weather.yourworldapps.si', webStream: { measurementId: 'G-WX12345', url: 'https://weather.yourworldapps.si', name: 'Weather site' } }, totals: { visitors: 41, visits: 52, pageviews: 97, bounceRate: 40, visitDuration: 50 }, daily: [{ date: '2026-10-21', visitors: 41 }], playClicks: { visitors: 3, clicks: 4 } })
  : app === 'weather' ? base('weather', { state: 'empty', provider: 'ga4', note: 'GA4 has no visits for weather.yourworldapps.si in this range — is the Google tag live on the site?', ga4: { propertyId: '559303196', property: 'Weather Radar', host: 'weather.yourworldapps.si', webStream: null, streamsError: 'Google Analytics Admin API has not been used in project 123' } })
  : rg === '7d' ? base('hunt', { state: 'no-web-stream', provider: 'ga4', note: 'Add a Web data stream for https://hunt.yourworldapps.si in the Hunt GA4 property.', ga4: { propertyId: '559431330', property: 'Hunt', host: 'hunt.yourworldapps.si', webStream: null } })
  : base('hunt', { state: 'live', provider: 'plausible', hasData: true, totals: { visitors: 7, visits: 8, pageviews: 9 }, playClicks: { visitors: 1, clicks: 1 } });
const STATUS = { plausible: { configured: false, source: null }, youtube: { configured: false }, apps: APPS, posts: 0, traffic: { provider: 'ga4', ga4: { configured: true, apps: [{ app: 'weather', propertyId: '559303196', property: 'Weather Radar' }, { app: 'hunt', propertyId: '559431330', property: 'Hunt' }] } } };
const STREAMS = { apps: [{ id: 'weather-radar', property: 'Weather Radar', propertyId: '559303196', streams: [{ id: '1', type: 'web', name: 'Weather site', measurementId: 'G-WX12345', url: 'https://weather.yourworldapps.si', host: 'weather.yourworldapps.si' }, { id: '2', type: 'android', name: 'App' }], web: [{ id: '1', type: 'web', name: 'Weather site', measurementId: 'G-WX12345', url: 'https://weather.yourworldapps.si', host: 'weather.yourworldapps.si' }] }, { id: 'hunt', property: 'Hunt', propertyId: '559431330', streams: [{ id: '3', type: 'android' }], web: [] }] };
const ctx = await b.newContext(DESK ? { viewport: { width: 1440, height: 900 } } : { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('dialog', d => d.accept());
await pg.addInitScript(([car, x]) => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); localStorage.setItem('ywLlm', JSON.stringify({ key: x })) }, [CAR, XAI]);
await ctx.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8166') ? r.continue() : r.abort());
const reqs = [];
await ctx.route(SV + '/**', async r => { const q = r.request(), u = new URL(q.url()), P = u.pathname; reqs.push(q.method() + ' ' + P + u.search); let body = {};
  if (P === '/kpi/marketing') body = STATS(u.searchParams.get('app'), u.searchParams.get('range')); else if (P === '/marketing/status') body = STATUS; else if (P === '/kpi/streams') body = STREAMS;
  else if (P === '/marketing/channels') body = { channels: [] }; else if (P === '/marketing/posts') body = { posts: [] }; else if (P === '/kpi/growth') body = { asOf: NOW, play: { configured: false }, appstore: { configured: false }, apps: [] };
  else if (P === '/kpi/summary') body = { configured: false, asOf: NOW, appstore: { configured: false } }; else if (P === '/kpi/status') body = { play: { configured: false }, ga4: { configured: true, apps: [] }, appstore: { configured: false, note: 'App Store Connect key not set.' } }; else if (P === '/tickets') body = [];
  else if (P === '/handoff/connections') body = { connections: [] }; else if (P === '/handoff/config') body = { configured: false }; else if (P === '/handoff/approvals') body = { internal: 'ask', production: 'ask' };
  else if (P === '/inboxes') body = { inboxes: [{ id: 'yw-support', label: 'Support', kind: 'support', canSend: true, builtin: true }] }; else if (/\/inbox\/config$/.test(P)) body = { kind: 'support', rules: [], always: [], ai: { on: false }, unsubscribed: [], canSend: true };
  else if (P === '/alerts/settings') body = { smsLive: false, pushLive: true, settings: null }; else if (P === '/alerts/actions') body = { actions: [] }; else if (P === '/maint/mail') body = []; else if (P === '/finance/status') body = { stripe: { configured: false }, qbo: { connected: false }, plaid: { items: [] }, csv: { accounts: [] } };
  await r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }, body: JSON.stringify(body) }); });
await pg.goto('http://127.0.0.1:8166/');
await pg.evaluate(([sv, tok]) => { const a = JSON.parse(localStorage.getItem('ywConn') || '{}'); a[SUP_KEY()] = { type: 'support', url: sv, token: tok, live: true }; localStorage.setItem('ywConn', JSON.stringify(a)); }, [SV, TOK]);
await pg.reload(); await pg.waitForTimeout(5000);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop().innerText.replace(/\s+/g, ' '));
const vis = () => ev(() => [...document.querySelectorAll('#setPage section[data-tab]')].filter(s => !s.hidden).map(s => s.querySelector('h4').textContent));
const ovf = () => ev(() => document.documentElement.scrollWidth - innerWidth);
// Tabs
await ev(() => ywSettings(true)); await wt(400);
assert.deepEqual(await ev(() => [...document.querySelectorAll('#setTabs [data-stab]')].map(x => x.textContent)), ['General', 'Businesses & rooms', 'Connections', 'Alerts & push', 'Handoffs', 'Growth', 'Inbox sorting', 'Yorri & AI', 'Security & Vault', 'Advanced']);
const want = { general: ['Quick switches', 'Screen layout', 'Appearance', 'Accessibility'], organize: ['Businesses & rooms'], connections: ['Connections'], alerts: ['Alerts & push'], handoffs: ['Handoffs'], growth: ['Growth'], inbox: ['Inbox sorting'], yorri: ['Yorri voice', 'Yorri commands', 'Yorri AI'], security: ['Security & Vault'], advanced: ['Advanced'] };
for (const [k, h] of Object.entries(want)) { await ev(k => setTab(k), k); await wt(250); assert.deepEqual(await vis(), h, k); assert.ok(await ovf() <= 0, 'overflow on tab ' + k); }
// Growth + Handoffs moved out of Connections (and ycCard follows them)
assert.equal(await ev(() => document.querySelector('#grCard').closest('section').dataset.tab), 'growth'); assert.equal(await ev(() => document.querySelector('#hoCard').closest('section').dataset.tab), 'handoffs');
assert.equal(await ev(() => !!document.querySelector('section[data-tab="connections"] #grBox, section[data-tab="connections"] #hoBox')), false);
await ev(() => ywSettings(false)); await ev(() => ask('open growth settings')); await wt(500); assert.equal(await ev(() => localStorage.getItem('ywSetTab')), 'growth'); assert.ok(await ev(() => !document.querySelector('#grCard').closest('section').hidden && document.querySelector('#grCard').open));
await ev(() => ask('open handoff settings')); await wt(500); assert.equal(await ev(() => localStorage.getItem('ywSetTab')), 'handoffs'); assert.ok(await ev(() => document.querySelector('#hoCard').offsetParent !== null));
// Yorri: open settings <section>
for (const [q, k, re] of [['open settings security', 'security', /Settings → Security & Vault/], ['open settings businesses and rooms', 'organize', /Businesses & rooms/], ['open settings alerts and push', 'alerts', /Alerts & push/], ['open settings general', 'general', /General/], ['open settings vault', 'security', /Security/], ['open settings layout', 'general', /General/]]) {
  await ev(q => ask(q), q); await wt(400); assert.equal(await ev(() => localStorage.getItem('ywSetTab')), k, q); assert.match(await last(), re, q); }
await ev(() => ask('open settings connections')); await wt(400); assert.equal(await ev(() => localStorage.getItem('ywSetTab')), 'connections');
// Connections jump-to
await ev(() => document.querySelector('[data-cxj="fin"]').click()); await wt(200); assert.ok(await ev(() => document.querySelector('#finCard').open));
await ev(() => document.querySelector('[data-cxj="mk"]').click()); await wt(300); assert.ok(await ev(() => document.querySelector('#mkCard').open));
// Settings → Marketing: traffic row, streams, Plausible optional
await wt(800); let s = await ev(() => document.querySelector('#mkCard').innerText.replace(/\s+/g, ' '));
assert.match(s, /Marketing Google Analytics · 3 apps/); assert.match(s, /Website traffic: Google Analytics via the Weather Radar \/ Hunt properties\./); assert.match(s, /Weather Radar 559303196 G-WX12345 weather\.yourworldapps\.si/); assert.match(s, /Hunt 559431330 no web stream yet/);
assert.match(s, /Plausible key \(optional fallback\)/i); assert.ok(reqs.some(x => x.startsWith('GET /kpi/streams')));
await ev(() => document.querySelector('[data-cxj="ai"]').click()); await wt(200); assert.equal(await ev(() => localStorage.getItem('ywSetTab')), 'yorri');
// Search
await ev(() => { const i = document.querySelector('#setSearch'); i.value = 'vault'; i.dispatchEvent(new Event('input', { bubbles: true })) }); await wt(200); assert.ok((await vis()).includes('Security & Vault'));
// Security & Vault: status only, never values
await ev(() => setTab('security')); await wt(300); s = await ev(() => document.querySelector('#secBox').innerText.replace(/\s+/g, ' '));
assert.match(s, /Support server token set/); assert.match(s, /xAI \(Grok\) key set/); assert.match(s, /Lock this device/);
const all = await ev(() => document.querySelector('#setPage').innerText + [...document.querySelectorAll('#setPage input')].filter(i => i.type !== 'password').map(i => i.value).join(' '));
assert.ok(!all.includes(TOK) && !all.includes(XAI), 'no secret values shown in Settings');
await ev(() => ywSettings(false));
// Marketing room: GA4
await ev(() => { bizStore.activeId = 'yw-apps'; setPageView('apps'); roomView = 'Marketing'; draw() }); await wt(1500);
const room = () => ev(() => (document.querySelector('.mk-full') || {}).innerText?.replace(/\s+/g, ' ') || '');
let t = await room(); console.log('weather 7d:', t.slice(0, 400));
assert.match(t, /LIVE ?GA4/); assert.match(t, /weather\.yourworldapps\.si · Google Analytics/); assert.match(t, /GA4 property Weather Radar · G-WX12345/); assert.match(t, /41 visitors 52 visits/); assert.match(t, /Visitors = GA4 active users · Visits = sessions/); assert.doesNotMatch(t, /Plausible/);
await ev(() => document.querySelector('[data-mk="rg"][data-v="28d"]').click()); await wt(1200); t = await room();
assert.match(t, /No visits yet — GA4 has no visits for weather\.yourworldapps\.si in this range — is the Google tag live on the site\?/); assert.match(t, /GA4 property Weather Radar · stream check unavailable \(Admin API off\)/);
await ev(() => document.querySelector('[data-mk="app"][data-id="hunt"]').click()); await wt(1200); t = await room();
assert.match(t, /Plausible \(fallback\)/); assert.match(t, /hunt\.yourworldapps\.si · Plausible \(fallback\)/); assert.match(t, /7 visitors 8 visits/);
await ev(() => document.querySelector('[data-mk="rg"][data-v="7d"]').click()); await wt(1200); t = await room();
assert.match(t, /No web stream yet — Add a Web data stream for https:\/\/hunt\.yourworldapps\.si in the Hunt GA4 property\./); assert.match(t, /GA4 property Hunt · no web stream yet/);
let l; await ev(() => ask('how is marketing doing for hunt')); await wt(900); l = await last(); assert.match(l, /Hunt: Google Analytics is linked but has no web stream for the site yet/);
await ev(() => ask('how is marketing doing')); await wt(900); l = await last(); assert.match(l, /source: GA4|no web stream|Weather Radar/);
await ev(() => document.querySelector('[data-mk="app"][data-id="market"]').click()); await wt(1000); t = await room(); assert.match(t, /Traffic not connected — Market Analyzer has no website yet/);
assert.ok(await ovf() <= 0, 'no overflow in Marketing'); assert.deepEqual(errs, []);
console.log('settings-ga4: OK' + (DESK ? ' (desktop)' : CAR ? ' (car)' : ' (phone)')); await b.close(); srv.close();
