// Node check of sw.js: release push Approve/Decline POST /push/action {t, action} (the signed token of that one decision) without opening the site,
// then show the follow-up push titled by the server (e.g. "Approved: Production 0.8.99 (137) sent to WeatherAI").
import fs from 'node:fs'; import assert from 'node:assert'; import vm from 'node:vm';
const code = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8'); const L = {}, shown = [], posts = [], opened = [];
const self = { addEventListener: (k, f) => (L[k] = f), skipWaiting() {}, clients: { claim() {}, matchAll: async () => [], openWindow: async u => opened.push(u) }, registration: { showNotification: async (t, o) => shown.push([t, o.body]) } };
let reply; const fetch = async (u, o) => { posts.push([u, o.method, JSON.parse(o.body)]); return { json: async () => reply }; };
vm.runInNewContext(code, { self, fetch, console, URL });
const data = { title: 'Promote Weather Radar 0.8.99 (137) to Production', t: 'TOKEN-R1', api: 'https://yw-business-server.onrender.com', tag: 'R1', url: '/?decisions=1&ticket=S-e15fcf7a', actions: [{ action: 'yes', title: 'Approve' }, { action: 'no', title: 'Decline' }] };
const click = async action => { let p; await L.notificationclick({ action, notification: { data, close() {} }, waitUntil: x => (p = x) }); await p; };
reply = { ok: true, found: true, kind: 'release', title: 'Approved: Production 0.8.99 (137) sent to WeatherAI', msg: 'Approved: Promote Weather Radar 0.8.99 (137) to Production. Relayed to WeatherAI.' };
await click('yes'); assert.deepEqual(posts[0], ['https://yw-business-server.onrender.com/push/action', 'POST', { t: 'TOKEN-R1', action: 'yes' }]); assert.deepEqual(shown.at(-1), [reply.title, reply.msg]); assert.equal(opened.length, 0, 'site not opened');
reply = { ok: true, title: 'Declined: Production 0.8.99 (137) — WeatherAI told', msg: 'Declined: …' }; await click('no'); assert.deepEqual(posts[1][2], { t: 'TOKEN-R1', action: 'no' }); assert.equal(shown.at(-1)[0], 'Declined: Production 0.8.99 (137) — WeatherAI told');
reply = { ok: true, msg: 'Approved D3: x.' }; await click('yes'); assert.equal(shown.at(-1)[0], 'Approved', 'other decisions keep the generic title');
reply = { error: 'expired or invalid action' }; await click('yes'); assert.deepEqual(shown.at(-1), ['Not recorded', 'expired or invalid action']);
console.log(shown.map(s => s[0]).join('\n')); console.log('sw actions: all passed');
