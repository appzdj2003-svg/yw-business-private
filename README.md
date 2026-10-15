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
