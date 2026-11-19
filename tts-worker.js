// Studio voices: on-device neural speech (Kokoro-82M and Piper), synthesized in this worker so the page never blocks.
// Free and open source, no keys. Engines and models load only when a studio voice is chosen or previewed, and are
// kept in Cache Storage ('yw-studio-voices'; Kokoro model files also in Transformers.js' own 'transformers-cache').
// Pinned: kokoro-js 1.2.1 (bundles Transformers.js 3.5.1 / ONNX Runtime 1.21), onnxruntime-web 1.20.1,
// piper_phonemize (espeak-ng) from @diffusionstudio/piper-wasm 1.0.0, Piper voices rhasspy/piper-voices v1.0.0.
const KOKORO_JS = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';
const KOKORO_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const ORT_JS = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.wasm.min.mjs';
const ORT_DIR = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
const PP_DIR = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/';
const PIPER_HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/';
const PIPER_PATH = { 'en_US-lessac-medium': 'en/en_US/lessac/medium/', 'en_US-lessac-high': 'en/en_US/lessac/high/', 'en_US-ryan-high': 'en/en_US/ryan/high/', 'en_GB-alba-medium': 'en/en_GB/alba/medium/', 'es_MX-claude-high': 'es/es_MX/claude/high/' };
// Piper tuning (same as the offline assistant): a little faster than stock, slightly calmer prosody, short pause between sentences.
const PIPER_TUNE = { length_scale: 0.92, noise_scale: 0.6, noise_w: 0.75, sentence_silence: 0.15 };
const CACHE = 'yw-studio-voices';
const post = (m, t) => self.postMessage(m, t || []);
const dbg = t => { if (self.YW_DEBUG === true) post({ type: 'dbg', text: t }); };

const rawFetch = self.fetch.bind(self);
// Fetch through Cache Storage with byte progress. Kokoro's model/tokenizer files are left to Transformers.js' own cache.
async function cfetch(url, label) {
  let c = null; try { c = await caches.open(CACHE); const hit = await c.match(url); if (hit) { post({ type: 'progress', file: label, loaded: 1, total: 1, cached: true }); return hit; } } catch (e) { c = null; }
  const r = await rawFetch(url, { mode: 'cors' }); if (!r.ok) throw new Error('download failed (' + r.status + '): ' + label);
  const total = +r.headers.get('content-length') || 0, rd = r.body.getReader(), parts = []; let loaded = 0, last = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); loaded += value.length; const now = Date.now(); if (now - last > 150) { last = now; post({ type: 'progress', file: label, loaded, total }); } }
  post({ type: 'progress', file: label, loaded, total: total || loaded }); dbg('downloaded ' + label + ' ' + loaded);
  const blob = new Blob(parts, { type: r.headers.get('content-type') || 'application/octet-stream' });
  const res = new Response(blob, { headers: { 'content-type': blob.type, 'content-length': String(blob.size) } });
  if (c) try { await c.put(url, res.clone()); dbg('cached ' + label); } catch (e) { dbg('cache put failed ' + e.message); }
  return res;
}
// ONNX Runtime fetches its .wasm with fetch(); route jsdelivr/HF voice files through the cache too.
self.fetch = (input, init) => { const u = typeof input === 'string' ? input : input && input.url || '';
  if (/^https:\/\/cdn\.jsdelivr\.net\/npm\/.*\.wasm$/.test(u) || /Kokoro-82M-v1\.0-ONNX\/resolve\/main\/voices\//.test(u)) return cfetch(u, u.split('/').pop());
  return rawFetch(input, init); };

// ---- sentence splitter (start talking after the first sentence) ----
function sentences(t) { const out = []; let cur = ''; (String(t).match(/[^.!?…;:\n]+[.!?…;:]*\s*|\n+/g) || [t]).forEach(x => { if (!x.trim()) return;
  if ((cur + x).length > 240 && cur.trim()) { out.push(cur.trim()); cur = ''; } cur += x; if (cur.length > 40 || /[.!?…]\s*$/.test(cur)) { out.push(cur.trim()); cur = ''; } });
  if (cur.trim()) out.push(cur.trim());
  // a short first chunk gets audio started sooner: split a long opening sentence at its first comma
  if (out[0] && out[0].length > 70) { const k = out[0].search(/[,—–]\s/); if (k >= 6 && k < out[0].length - 12) out.splice(0, 1, out[0].slice(0, k + 1), out[0].slice(k + 1).trim()); }
  return out.flatMap(s => { if (s.length <= 300) return [s]; const w = s.split(/\s+/), r = []; let p = ''; for (const x of w) { if ((p + ' ' + x).length > 280) { r.push(p); p = x; } else p = p ? p + ' ' + x : x; } if (p) r.push(p); return r; }); }

// ---- espeak-ng phonemizer (Piper; also Spanish for Kokoro) ----
let PP = null, ppWasm = null, ppData = null;
async function phonemizer() { if (PP) return PP;
  const [mod, w, d] = await Promise.all([import(new URL('./vendor/piper_phonemize-1.0.0.mjs', self.location.href).href), cfetch(PP_DIR + 'piper_phonemize.wasm', 'espeak-ng.wasm').then(r => r.arrayBuffer()), cfetch(PP_DIR + 'piper_phonemize.data', 'espeak-ng voices data').then(r => r.arrayBuffer())]);
  PP = mod.default; ppWasm = w; ppData = d; dbg('phonemizer ok'); return PP; }
async function phonemize(text, voice) { const create = await phonemizer();
  return new Promise((resolve, reject) => { let got = false;
    create({ wasmBinary: ppWasm, getPreloadedPackage: () => ppData, print: s => { if (got) return; got = true; try { resolve(JSON.parse(s)); } catch (e) { reject(e); } }, printErr: m => { if (!got && /error/i.test(m)) reject(new Error(m)); },
      locateFile: u => PP_DIR + u, noInitialRun: true })
      .then(M => { try { M.callMain(['-l', voice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']); } catch (e) { if (!got) reject(e); } }, reject); }); }

// ---- Piper ----
let ORT = null; const piper = {};
async function piperLoad(id) { if (piper[id]) return piper[id];
  dbg('piper: ort import'); if (!ORT) { ORT = await import(ORT_JS); dbg('piper: ort ok'); ORT.env.wasm.wasmPaths = ORT_DIR; ORT.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1; }
  const base = PIPER_HF + PIPER_PATH[id] + id; if (!PIPER_PATH[id]) throw new Error('unknown Piper voice ' + id);
  const [cfg, model] = await Promise.all([cfetch(base + '.onnx.json', id + '.json').then(r => r.json()), cfetch(base + '.onnx', id + '.onnx').then(r => r.arrayBuffer()), phonemizer()]);
  dbg('piper: files ok, creating session'); const session = await ORT.InferenceSession.create(new Uint8Array(model), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return piper[id] = { cfg, session, sr: cfg.audio.sample_rate }; }
async function piperSay(id, text, speed) { const P = await piperLoad(id), ph = await phonemize(text, P.cfg.espeak.voice), ids = ph.phoneme_ids;
  const feeds = { input: new ORT.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), input_lengths: new ORT.Tensor('int64', BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ORT.Tensor('float32', Float32Array.from([PIPER_TUNE.noise_scale, PIPER_TUNE.length_scale / Math.max(0.5, speed || 1), PIPER_TUNE.noise_w]), [3]) };
  if (P.cfg.num_speakers > 1) feeds.sid = new ORT.Tensor('int64', BigInt64Array.from([0n]), [1]);
  const out = await P.session.run(feeds), pcm = out.output.data, gap = Math.round(P.sr * PIPER_TUNE.sentence_silence), a = new Float32Array(pcm.length + gap); a.set(pcm); return { pcm: a, sr: P.sr }; }

// ---- Kokoro ----
let K = null, kDevice = 'wasm';
async function kokoroLoad(gpu) { if (K) return K; const { KokoroTTS } = await import(KOKORO_JS);
  const prog = p => { if (p && p.status === 'progress') post({ type: 'progress', file: p.file, loaded: p.loaded, total: p.total }); else if (p && p.status === 'done') post({ type: 'progress', file: p.file, loaded: 1, total: 1, cached: true }); };
  if (gpu && self.navigator.gpu) { try { K = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'fp32', device: 'webgpu', progress_callback: prog }); kDevice = 'webgpu'; return K; } catch (e) { post({ type: 'note', text: 'GPU unavailable, using CPU (' + String(e.message || e).slice(0, 80) + ')' }); K = null; } }
  K = await KokoroTTS.from_pretrained(KOKORO_ID, { dtype: 'q8', device: 'wasm', progress_callback: prog }); kDevice = 'wasm'; return K; }
async function kokoroSay(voice, text, speed, gpu) { const k = await kokoroLoad(gpu); let audio;
  if (/^e[fm]_/.test(voice)) { const ph = await phonemize(text, 'es'); const ipa = (ph.phonemes || []).map(x => Array.isArray(x) ? x.join('') : x).join(' ').replace(/\s+/g, ' ').trim();
    const { input_ids } = k.tokenizer(ipa, { truncation: true }); audio = await k.generate_from_ids(input_ids, { voice, speed: speed || 1 }); }
  else audio = await k.generate(text, { voice, speed: speed || 1 });
  return { pcm: audio.audio, sr: audio.sampling_rate || 24000 }; }

// ---- protocol ----
let current = 0; const q = []; let busy = false;
async function pump() { if (busy) return; busy = true;
  while (q.length) { const m = q.shift();
    try {
      if (m.type === 'load') { const t0 = performance.now(); if (m.engine === 'kokoro') await kokoroLoad(m.gpu); else await piperLoad(m.voice);
        if (m.engine === 'kokoro') await kokoroSay(m.voice, 'Ready.', 1, m.gpu); // warms the voice style + kernels
        post({ type: 'ready', voice: m.voice, engine: m.engine, ms: Math.round(performance.now() - t0), device: m.engine === 'kokoro' ? kDevice : 'wasm' }); }
      else if (m.type === 'speak') { const S = sentences(m.text); let i = 0;
        for (const s of S) { if (m.id !== current) break; const t0 = performance.now();
          const r = m.engine === 'kokoro' ? await kokoroSay(m.voice, s, m.speed, m.gpu) : await piperSay(m.voice, s, m.speed);
          if (m.id !== current) break; const pcm = r.pcm instanceof Float32Array ? r.pcm : Float32Array.from(r.pcm);
          post({ type: 'audio', id: m.id, i: i++, n: S.length, sr: r.sr, pcm, ms: Math.round(performance.now() - t0), dur: pcm.length / r.sr }, [pcm.buffer]); }
        post({ type: 'done', id: m.id }); }
    } catch (e) { post({ type: 'error', id: m.id, voice: m.voice, error: String(e && e.message || e).slice(0, 200) }); }
  }
  busy = false; }
self.onmessage = e => { const m = e.data || {};
  if (m.type === 'cancel') { current = -1; q.length = 0; return; }
  if (m.type === 'speak') { current = m.id; for (let i = q.length - 1; i >= 0; i--) if (q[i].type === 'speak') q.splice(i, 1); }
  if (m.type === 'clear') { caches.delete(CACHE).then(() => caches.delete('transformers-cache')).then(() => post({ type: 'cleared' })); return; }
  if (m.type === 'usage') { (async () => { let n = 0, bytes = 0; try { for (const name of [CACHE, 'transformers-cache']) { const c = await caches.open(name); for (const k of await c.keys()) { n++; const r = await c.match(k); const l = +r.headers.get('content-length'); bytes += l || 0; } } } catch (x) {} post({ type: 'usage', n, bytes }); })(); return; }
  q.push(m); pump(); };
