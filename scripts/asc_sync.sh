#!/usr/bin/env bash
# Read-only App Store Connect sync for Your World Weather Radar (iOS) -> Business deck POST /appstore/stats.
# Only triggers asc.yml in stats mode; never edits the iOS repo or App Store Connect.
set -euo pipefail
R=appzdj2003-svg/your-world-weather-ios; SRV=${SRV:-https://yw-business-server.onrender.com}
TOK=${SITE_TOKEN:-$(cat /workspace/tiktok-marketing/.secrets/yw_business_site_token)}
t0=$(date +%s); since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh workflow run asc.yml -R $R -f mode=stats >/dev/null
for i in $(seq 1 30); do sleep 5; id=$(gh run list -R $R -w asc.yml -L 5 --json databaseId,createdAt -q "[.[]|select(.createdAt>=\"$since\")][0].databaseId" 2>/dev/null || true); [ -n "$id" ] && break; done
[ -n "${id:-}" ] || { echo "run not found"; exit 1; }
gh run watch $id -R $R --exit-status >/dev/null 2>&1 || true
job=$(gh run view $id -R $R --json jobs -q '.jobs[0].databaseId')
LOG=$(gh api --allow-escape-sequences repos/$R/actions/jobs/$job/logs | sed 's/\x1b\[[0-9;]*m//g' | grep -o 'ASC .*' || true)
BODY=$(LOG="$LOG" python3 - <<'PY'
import os,re,json,datetime
L=os.environ['LOG'].splitlines(); b={'app':'weather-ios','name':'Your World Weather Radar','appId':'6822555783','source':'asc.yml stats'}
g=lambda p:next((m for l in L for m in [re.search(p,l)] if m),None)
for l in L:
  m=re.search(r'ASC existing version (\S+) (\S+)',l)
  if m:
    if m.group(2)=='READY_FOR_SALE': b.setdefault('liveVersion',m.group(1))
    elif 'reviewVersion' not in b: b['reviewVersion']=m.group(1); b['reviewStatus']=m.group(2).replace('_',' ').title()
m=g(r'ASC reviews count=(\d+)');  b.update(reviewCount=int(m.group(1))) if m else None
m=g(r'ASC rating(?:s)?\s*(?:avg|average)?=?\s*([\d.]+)'); b.update(rating=float(m.group(1))) if m else None
m=g(r'ASC monthly state=(\S+)'); y=g(r'ASC yearly state=(\S+)')
b['subStatus']=' · '.join(x for x in [m and 'Monthly '+m.group(1).replace('_',' ').lower(), y and 'Yearly '+y.group(1).replace('_',' ').lower()] if x)
# Daily totals: generic "ASC <field>[ YYYY-MM-DD]=<n>" lines (format set by AppleWeatherAI's asc_run.sh)
F={'downloads':'downloads','redownloads':'redownloads','updates':'updates','trials':'trials','paid':'paidSubs','paidsubs':'paidSubs','subscriptions':'activeSubs','proceeds':'proceeds'}
day=None
for l in L:
  for k,d,v in re.findall(r'\b(downloads|redownloads|updates|trials|paid|paidSubs|subscriptions|proceeds)(?: (\d{4}-\d\d-\d\d))?=([\d.]+)',l,re.I):
    b[F[k.lower()]]=float(v); day=d or day
errs=[l for l in L if re.search(r'ASC (SALES|SUBSCRIPTION)\S* \S+: HTTP',l)]
if day: b['date']=day
elif errs: b['reportPending']=True; b['note']=('Sales/subscription reports unavailable: '+(re.search(r'"detail" : "([^"]+)',errs[0]) or [0,'error'])[1])[:200]
# Public catalog (read-only facts); sales still come from ASC reports when key is linked
b.setdefault('storeUrl','https://apps.apple.com/us/app/your-world-weather-radar/id6822555783')
b.setdefault('bundleId','com.yourworld.weatherradar')
b['free']=True; b['priceLabel']='Free'
b['subs']=[{'id':'ywweather_premium','name':'Premium monthly','price':'$4.99','status':'Approved / Live','trial':'7-day'},
           {'id':'ywweather_premium_yearly','name':'Premium yearly','price':'$47.99','status':'Waiting for Review','offer':'WEATHER30'}]
if not b.get('subStatus'):
  b['subStatus']='Monthly $4.99 live · Yearly $47.99 Waiting for Review · offer WEATHER30'
print(json.dumps(b))
PY
)
curl -sf -X POST "$SRV/appstore/stats" -H "Authorization: Bearer $TOK" -H "Origin: https://business.yourworldapps.si" -H 'Content-Type: application/json' -d "$BODY" >/dev/null && echo "posted: $BODY"
echo "sync took $(( $(date +%s) - t0 ))s"
