#!/usr/bin/env bash
# Read-only Hunt iOS sync for Business deck POST /appstore/stats.
# Uses public iTunes lookup for version/rating/icon/price. Never edits ASC or the iOS repo.
# Sales stay null until Aaron enters a Sales and Reports key in Settings.
set -euo pipefail
SRV=${SRV:-https://yw-business-server.onrender.com}
TOK=${SITE_TOKEN:-$(cat /workspace/tiktok-marketing/.secrets/yw_business_site_token)}
APP_ID=6822549497
LOOKUP=$(curl -sf "https://itunes.apple.com/lookup?id=$APP_ID")
BODY=$(LOOKUP="$LOOKUP" python3 - <<'PY'
import os,json,datetime
j=json.loads(os.environ['LOOKUP']); r=(j.get('results') or [{}])[0]
if not r.get('trackId'): raise SystemExit('itunes lookup empty')
# Catalog prices (public App Store facts; Sales reports need Sales and Reports key)
subs=[
  {'id':'premium_monthly','name':'Premium monthly','price':'$4.99','status':'Approved','trial':'7-day'},
  {'id':'sharp','name':'Sharp','price':'$2.99','status':'Approved'},
  {'id':'dogs','name':'Dogs','price':'$2.99','status':'Approved'},
  {'id':'land_us','name':'Land US','price':'$2.99','status':'Approved'},
  {'id':'land_ca','name':'Land CA','price':'$2.99','status':'Approved'},
  {'id':'land_eu','name':'Land EU','price':'$2.99','status':'Approved'},
  {'id':'land_au','name':'Land AU','price':'$2.99','status':'Approved'},
  {'id':'land_world','name':'Land World','price':'$8.99','status':'Approved'},
  {'id':'avatars_pro','name':'Avatars Pro','price':'$9.99','status':'Approved'},
  {'id':'arsenal','name':'Arsenal','price':'$9.99','status':'Approved'},
  {'id':'outfitter','name':'Outfitter','price':'$14.99','status':'Approved'},
]
b={
  'app':'hunt-ios','name':r.get('trackName') or 'Your World Hunt','appId':str(r['trackId']),
  'bundleId':r.get('bundleId') or 'com.yourworld.hunt',
  'liveVersion':r.get('version') or '0.3.0','build':'29','reviewStatus':'READY_FOR_SALE',
  'liveSince':'2026-11-07','free':True,'priceLabel':'Free',
  'storeUrl':(r.get('trackViewUrl') or f'https://apps.apple.com/us/app/id{r["trackId"]}').split('?')[0],
  'iconUrl':r.get('artworkUrl100') or r.get('artworkUrl60') or '',
  'rating':float(r.get('averageUserRating') or 0),'ratingCount':int(r.get('userRatingCount') or 0),
  'reviewCount':int(r.get('userRatingCount') or 0),
  'subStatus':'11 IAPs approved · Premium $4.99/mo (7-day trial)',
  'subs':subs,'source':'itunes lookup + public catalog','note':'Sales pending: enter Sales and Reports key in Settings → App Store Connect',
  'reportPending':True
}
print(json.dumps(b))
PY
)
curl -sf -X POST "$SRV/appstore/stats" -H "Authorization: Bearer $TOK" -H "Origin: https://business.yourworldapps.si" -H 'Content-Type: application/json' -d "$BODY" >/dev/null && echo "posted hunt-ios: $BODY"
