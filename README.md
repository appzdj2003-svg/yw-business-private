# Your World Business — Web (Yorri command center)

Static single page (`index.html`), no build. Unlisted: NOT linked from yourworldapps.si hub; `noindex` meta set.

Live: https://business.yourworldapps.si/ (repo `appzdj2003-svg/yw-business-private`, Pages from `main` /)

## Views
- **Command Center** (default, `?view=command`) — CEO board: Briefing, Finance, HR, Payroll, Legal, Support, Vault + Ask Yorri decisions.
- **Your World Apps** (`?view=apps`) — separate page with **business dropdown**, **Add business**, **Edit rooms** (per-business layouts: metrics / tickets / pipeline / map / custom). Not mixed with the CEO board.

## Controls
- **Mock data** header switch — master on/off for all demo KPIs; off shows Connect live empty states. Persists in `localStorage` (`ywMockData`).
- **Screens** 1–6 multi-monitor pop-outs (saved layout).
- Voice: `Yorri approve` / `Yorri decline`; `open Apps` / `open Your World Apps` / `open YourWorldApps`; `open Command Center`; `open Finance` / HR / etc. Tesla: mic focuses ask box for yoke dictation (no SpeechRecognition).

## Access gate
SHA-256 hash compare in browser (no plaintext code in source). `GATE.txt` is gitignored. Unlock persists via session/localStorage.

## Ask Yorri → Grok (xAI)
After unlock, tap **⚙ AI** in the Ask Yorri header → paste your xAI API key (console.x.ai) → **Save** → **Test**.
Stored only in this browser's localStorage (`ywLlm`); never in the repo. Defaults: base `https://api.x.ai/v1`, model `grok-4` (editable).
No key or API error → falls back to built-in pattern replies. api.x.ai currently allows browser CORS; if that changes, put a proxy URL in Base URL (e.g. a Cloudflare Worker that forwards `/chat/completions` to api.x.ai and adds `Access-Control-Allow-Origin`).
Yorri can end a reply with `ACTION: T2 | title | why` lines, which become decision cards.
