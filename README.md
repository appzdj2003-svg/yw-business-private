# Your World Business — Web (Yorri command center)
Static single page (`index.html`), no build. Unlisted: NOT linked from yourworldapps.si hub; `noindex` meta set.
Live: https://appzdj2003-svg.github.io/yw-business-private/  (repo appzdj2003-svg/yw-business-private, Pages from main /)
Update: edit index.html, commit, push to main.
Optional custom domain business.yourworldapps.si: in Spaceship DNS add CNAME `business` → `appzdj2003-svg.github.io`, then set custom domain in repo Settings → Pages (or add CNAME file). Not configured yet.

## Access gate
The page shows an access-code screen before the board. The entered code is SHA-256 hashed in the browser and compared to a stored hash (no plaintext code in source). Unlock persists for the browser tab via `sessionStorage`. Code provided privately to Aaron. This is an obscurity gate, not server-side security.
