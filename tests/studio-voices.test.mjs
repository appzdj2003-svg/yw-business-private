// Headless E2E (real network: jsDelivr + Hugging Face): Studio voices in Settings → Yorri & AI. Checks the picker (studio group first,
// Preview per voice, pitch off for studio voices), that a Kokoro voice (Heart) and a Piper voice (Lessac) really synthesize non-silent
// audio in the Web Worker, cache reuse after reload, Yorri "list voices" / "change voice to …" / "preview voice", mute, weak-device and
// Tesla fallbacks. CAR=1 = car layout. Screenshots + WAVs under SHOTDIR or /workspace/voices/.
import { chromium } from '/node_modules/playwright-core/index.mjs'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert';
const ROOT = new URL('..', import.meta.url).pathname, PORT = 8302;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
const srv = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; if (p.startsWith('/sw.js')) { r.writeHead(404); return r.end(); }
  const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(fs.readFileSync(f)); }).listen(PORT);
const exe = fs.readdirSync('/home/box/.cache/ms-playwright').filter(d => d.startsWith('chromium_headless_shell')).map(d => `/home/box/.cache/ms-playwright/${d}/chrome-headless-shell-linux64/chrome-headless-shell`).find(fs.existsSync);
const b = await chromium.launch({ executablePath: exe, args: ['--autoplay-policy=no-user-gesture-required'] });
const CAR = !!process.env.CAR, SHOT = process.env.SHOTDIR || '/workspace/voices', tag = CAR ? 'car' : 'desk'; fs.mkdirSync(SHOT, { recursive: true });
const OK_HOSTS = [`http://127.0.0.1:${PORT}`, 'https://cdn.jsdelivr.net', 'https://huggingface.co', 'https://cas-bridge.xethub.hf.co', 'https://cdn-lfs.hf.co', 'https://cdn-lfs-us-1.hf.co', 'https://us.gcp.cdn.hf.co', 'https://cas-server.xethub.hf.co', 'https://transfer.xethub.hf.co'];
const init = car => { localStorage.setItem('ywUnlock', '1'); localStorage.setItem('ywYorriSpeak', '0'); localStorage.setItem('ywMockData', '0'); localStorage.setItem('ywCarLayout', car ? '1' : '0'); localStorage.setItem('ywA11y', JSON.stringify({ theme: 'dark' }));
  // record every buffer handed to Web Audio, so the test can measure what Yorri actually plays
  window.__played = []; const st = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { try { const d = this.buffer.getChannelData(0); let s = 0, m = 0; for (let i = 0; i < d.length; i++) { s += d[i] * d[i]; m = Math.max(m, Math.abs(d[i])); } window.__played.push({ sr: this.buffer.sampleRate, len: d.length, dur: this.buffer.duration, rms: Math.sqrt(s / d.length), max: m, pcm: Array.from(d.subarray(0, Math.min(d.length, 24000 * 8))) }); } catch (e) {} return st.apply(this, a); }; };
const ctx = await b.newContext({ viewport: { width: CAR ? 1200 : 1440, height: 1000 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.addInitScript(init, CAR);
await ctx.route('**/*', r => OK_HOSTS.some(h => r.request().url().startsWith(h)) || /\.hf\.co\//.test(r.request().url()) ? r.continue() : r.abort());
await pg.goto(`http://127.0.0.1:${PORT}/`); await pg.waitForTimeout(1500);
const ev = (f, a) => pg.evaluate(f, a), wt = ms => pg.waitForTimeout(ms);
const last = () => ev(() => [...document.querySelectorAll('#log p.y')].pop()?.innerText.replace(/\s+/g, ' ') || '');
const yorri = async t => { await ev(t => ask(t), t); await wt(900); return last(); };
const waitFor = async (f, a, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(f, a)) return Date.now() - t0; await wt(250); } throw new Error('timeout: ' + what + ' ' + JSON.stringify(await ev(() => ({ n: window.__played.length, p: window.__played.map(x => [x.dur, x.rms]), err: ST.err, note: ST.note, id: ST.id, src: ST.src.length })))); };
const wav = (file, pcm, sr) => { const n = pcm.length, buf = Buffer.alloc(44 + n * 2); buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40); pcm.forEach((v, i) => buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), 44 + i * 2)); fs.writeFileSync(file, buf); };
const R = {};
// ---- picker ----
await ev(() => ycSec('yorri', 'vcH')); await wt(800);
const groups = await ev(() => [...document.querySelectorAll('#vcSel optgroup')].map(g => g.label));
assert.equal(groups[0], 'Studio voices (natural, on this device)', 'studio group listed first'); assert.match(groups[1] || '', /This device/);
const rows = await ev(() => [...document.querySelectorAll('#stBox .st-row')].map(r => r.innerText.replace(/\s+/g, ' ')));
assert.equal(rows.length, 10); for (const n of ['Heart', 'Bella', 'Michael', 'Emma', 'Dora (Español)', 'Lessac (classic)', 'Lessac HD', 'Ryan HD', 'Alba', 'Claude (Español)']) assert.ok(rows.some(r => r.startsWith(n + ' ')), 'row ' + n);
assert.match(rows[0], /Heart US English · warm female · Kokoro · ≈ 117 MB ▶ Preview Use/); assert.match(rows[7], /Ryan HD .* Piper · ≈ 151 MB/);
const tgt = await ev(() => [...document.querySelectorAll('#stBox button')].map(x => Math.round(Math.min(x.getBoundingClientRect().height, x.getBoundingClientRect().width))).reduce((a, x) => Math.min(a, x), 99));
assert.ok(tgt >= (CAR ? 48 : 44), 'tap targets ' + tgt);
// ---- Heart (Kokoro): Use → progress → ready → Preview plays non-silent audio ----
const t0 = Date.now();
await pg.click('#stBox [data-stact=use][data-stv="kokoro-af_heart"]'); await wt(1500);
assert.equal(await ev(() => vcGet().studio), 'kokoro-af_heart'); assert.equal(await ev(() => document.querySelector('#vcPitch').disabled), true, 'pitch off for studio voices');
assert.equal(await ev(() => document.querySelector('#vcSel').value), 'studio:kokoro-af_heart');
await waitFor(() => !document.querySelector('#stProg').hidden && /Downloading Heart: .* of about 117 MB/.test(document.querySelector('#stProg').innerText), null, 60000, 'progress text');
await ev(() => { const sp = document.querySelector('#setPage'), h = document.querySelector('#vcH'); sp.scrollTop += h.getBoundingClientRect().top - (document.querySelector('#setPage .set-tabs, #setPage [role=tablist]')?.getBoundingClientRect().bottom || 190) - 70; }); await wt(300); await pg.screenshot({ path: `${SHOT}/${tag}-picker-downloading.png` });
await waitFor(() => ST.ready.kokoro, null, 300000, 'kokoro ready'); R.kokoroLoad = (Date.now() - t0) / 1000;
assert.match(await ev(() => document.querySelector('#stBox .st-row').innerText), /ready · loaded in/);
let n0 = await ev(() => __played.length); const tp = Date.now();
await pg.click('#stBox [data-stact=prev][data-stv="kokoro-af_heart"]');
await waitFor(n => __played.length > n, n0, 60000, 'kokoro audio'); R.kokoroFirst = (Date.now() - tp) / 1000;
await waitFor(n => __played.length >= n + 2, n0, 90000, 'kokoro all sentences');
const kk = await ev(n => __played.slice(n).map(({ pcm, ...x }) => x), n0); assert.ok(kk.every(x => x.sr === 24000 && x.rms > 0.01 && x.max > 0.1 && x.dur > 0.3), 'Kokoro non-silent ' + JSON.stringify(kk));
wav(`${SHOT}/heart.wav`, (await ev(n => __played.slice(n).flatMap(x => x.pcm), n0)), 24000); R.kokoro = kk;
// ---- Lessac (Piper) via the dropdown + the main Preview button ----
await ev(() => { const s = document.querySelector('#vcSel'); s.value = 'studio:piper-lessac-medium'; s.dispatchEvent(new Event('change', { bubbles: true })); }); const t1 = Date.now();
await waitFor(() => ST.ready['en_US-lessac-medium'], null, 300000, 'piper ready'); R.piperLoad = (Date.now() - t1) / 1000;
n0 = await ev(() => __played.length); const tq = Date.now(); await pg.click('#vcPrev');
await waitFor(n => __played.length > n, n0, 30000, 'piper audio'); R.piperFirst = (Date.now() - tq) / 1000; await waitFor(n => __played.length >= n + 2, n0, 30000, 'piper all');
const pp = await ev(n => __played.slice(n).map(({ pcm, ...x }) => x), n0); assert.ok(pp.every(x => x.sr === 22050 && x.rms > 0.01 && x.max > 0.1), 'Piper non-silent ' + JSON.stringify(pp));
wav(`${SHOT}/lessac.wav`, (await ev(n => __played.slice(n).flatMap(x => x.pcm), n0)), 22050); R.piper = pp;
await ev(() => { const sp = document.querySelector('#setPage'), h = document.querySelector('#vcH'); sp.scrollTop += h.getBoundingClientRect().top - (document.querySelector('#setPage .set-tabs, #setPage [role=tablist]')?.getBoundingClientRect().bottom || 190) - 70; }); await wt(300); await pg.screenshot({ path: `${SHOT}/${tag}-picker-ready.png` });
// ---- mute stops playback mid-sentence ----
await ev(() => ycSpeak(true)); await ev(() => ttsSpeak('This is a long message that keeps going. It has a second sentence. And a third one, to be sure.')); await waitFor(() => ST.src.length > 0, null, 20000, 'speaking');
await ev(() => ycSpeak(false)); await wt(300); assert.equal(await ev(() => ST.src.length), 0, 'mute stopped studio audio');
// ---- Yorri commands ----
const lv = await yorri('list voices'); assert.match(lv, /Studio voices: Heart — US English · warm female, ready; .*Lessac \(classic\) \(in use\) — US English · female · fastest, ready; .*Ryan HD — US English · male · high quality, 151 MB; .*device voice/);
assert.match(await yorri('change voice to Heart'), /Voice set to Heart\./); assert.equal(await ev(() => vcGet().studio), 'kokoro-af_heart');
assert.match(await yorri('change voice to zorg'), /I don’t have a voice called “zorg”/);
n0 = await ev(() => __played.length); assert.match(await yorri('preview voice'), /Previewing Heart\./); await waitFor(n => __played.length > n, n0, 60000, 'preview cmd audio');
await ev(() => ttsStop());
assert.match(await yorri('change voice to device voice'), /Back to the device voice\./); assert.equal(await ev(() => vcGet().studio), '');
assert.match(await yorri('use the lessac voice'), /Voice set to Lessac \(classic\)\./);
const help = await ev(() => YC.list.filter(c => /^vc\.(setname|list|preview)$/.test(c.id)).map(c => c.id + ':' + c.help)); assert.equal(help.length, 3);
// ---- fallbacks: not-yet-downloaded voice → device voice; weak device → device voice ----
assert.equal(await ev(() => stSpeak('Hello there.', stById('piper-ryan-high'))), false, 'unready voice falls back'); await ev(() => { stStop(); ST.loading = null; ST.after = null; if (ST.w) ST.w.terminate(); ST.w = null; ST.ready = {}; });
assert.equal(await ev(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2, configurable: true }); return stSpeak('Hello.', stById('piper-lessac-medium')); }), false, 'weak device falls back');
await ev(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8, configurable: true }); });
// ---- cached reload: warms from Cache Storage, no re-download ----
await ev(() => vcSet({ studio: 'kokoro-af_heart' })); const t2 = Date.now(); await pg.reload(); await waitFor(() => typeof ST !== 'undefined' && ST.ready.kokoro, null, 120000, 'cached warm'); R.kokoroCached = (Date.now() - t2) / 1000;
await ev(() => vcSet({ studio: 'piper-lessac-medium' })); const t3 = Date.now(); await pg.reload(); await waitFor(() => typeof ST !== 'undefined' && ST.ready['en_US-lessac-medium'], null, 120000, 'cached piper'); R.piperCached = (Date.now() - t3) / 1000;
assert.deepEqual(errs, []);
// ---- Tesla: studio voices off, no TTS ----
const tz = await b.newContext({ userAgent: 'Mozilla/5.0 (X11; GNU/Linux) AppleWebKit/537.36 (KHTML, like Gecko) Chromium/79.0.3945.130 Chrome/79.0.3945.130 Safari/537.36 Tesla/2024.14', viewport: { width: 1200, height: 900 } });
const tp2 = await tz.newPage(); await tp2.addInitScript(init, true); await tz.route('**/*', r => r.request().url().startsWith(`http://127.0.0.1:${PORT}`) ? r.continue() : r.abort());
await tp2.goto(`http://127.0.0.1:${PORT}/`); await tp2.waitForTimeout(1200); await tp2.evaluate(() => ycSec('yorri', 'vcH')); await tp2.waitForTimeout(600);
assert.equal(await tp2.evaluate(() => STUDIO_OK), false); assert.match(await tp2.evaluate(() => document.querySelector('#stBox').innerText), /can’t play in the Tesla browser/);
await tz.close();
console.log(JSON.stringify(R, (k, v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v));
console.log(`studio-voices (${tag}): ok`); await b.close(); srv.close();
