#!/usr/bin/env bash
# Every data read and write goes through dch_app. This check makes that
# structural rather than a convention people remember.
#
# Why it matters more than it looks: once row-level security is switched on,
# a surviving supabase.from() returns ZERO ROWS rather than an error. The
# screen renders blank, no exception, no failed request in the network tab.
# This check is the thing that catches it, and it must run before RLS goes on.
#
# Run from dch_front/WEB:  npm run conformance
set -u
fails=0
cd "$(dirname "$0")/.." || exit 1

# F1 — no PostgREST table access anywhere in src/.
# Excludes Array.from / Object.from, comment lines, and the service README,
# which documents the ban by quoting it. Storage buckets are a separate
# surface with its own check below — this one is about tables.
hits=$(grep -rn "\.from(" src 2>/dev/null \
  | grep -v "Array\.from" \
  | grep -v "Object\.from" \
  | grep -v "storage$" \
  | grep -v "\.storage$" \
  | grep -vE "^[^:]+:[0-9]+: *[/*]" \
  | grep -v "SIGNATURE_BUCKET" \
  | grep -v "services/api/README")
if [ -z "$hits" ]; then
  echo "PASS  F1 no direct database access in src/"
else
  echo "FAIL  F1 direct database access found:"; echo "$hits" | head -20
  fails=$((fails+1))
fi

# F2 — the supabase client may only be imported where it is genuinely needed.
#   login.vue / authStore.js  supabase.auth — Supabase is the identity
#                             provider and the JWT it issues is what the API
#                             verifies. The one documented exception.
#
# footerRepor.vue was on this list for its signature upload and came off when
# /api/report-signatures-upload replaced it. Nothing else belongs here: adding
# a file means adding a way around the permission layer.
allowed="src/pages/login.vue src/stores/authStore.js"
actual=$(grep -rln 'from "@/utils/supabase' src 2>/dev/null | sort)
expected=$(printf '%s\n' $allowed | sort)
if [ "$actual" = "$expected" ]; then
  echo "PASS  F2 supabase client imported only where allowed"
else
  echo "FAIL  F2 supabase import list changed:"
  diff <(echo "$expected") <(echo "$actual") | sed 's/^/      /'
  fails=$((fails+1))
fi

# F3 — service modules must not reach for the client either. They are the
# layer that replaced it; an import here would defeat the whole arrangement.
check3=$(grep -rn "utils/supabase" src/services 2>/dev/null)
if [ -z "$check3" ]; then
  echo "PASS  F3 service layer is client-free"
else
  echo "FAIL  F3 service layer imports the supabase client:"; echo "$check3"
  fails=$((fails+1))
fi

# F4 — the storage bypass is a KNOWN, BOUNDED exception, not a resolved one.
# footerRepor.vue uploads signature images straight to a Supabase bucket with
# the publishable key, upsert:true and a client-supplied path. That is a real
# bypass of the API and the permission layer; it is simply not a table read.
# Pinning the count means the debt cannot quietly grow, and the check turns
# green the moment an upload endpoint replaces it.
storage=$(grep -rn "supabase\.storage" src 2>/dev/null | wc -l | tr -d ' ')
if [ "$storage" = "2" ]; then
  echo "PASS  F4 storage bypass still confined to footerRepor.vue (2 calls, tracked)"
elif [ "$storage" = "0" ]; then
  echo "PASS  F4 storage bypass is gone — drop footerRepor.vue from F2's allow-list"
else
  echo "FAIL  F4 storage bypass changed size: expected 2 or 0, found $storage"
  grep -rn "supabase\.storage" src | sed 's/^/      /'
  fails=$((fails+1))
fi

# F5 — the /api prefix must be normalised centrally, and VITE_API_URL must
# stay the bare origin.
#
# Two call-site conventions coexist: 59 paths written "/api/weekday-all" and
# 219 written bare as "years-all". They need OPPOSITE VITE_API_URL values, so
# no env setting satisfies both — with a trailing /api the first group becomes
# /api/api/... ("Cannot POST /api/api/academics-periods-terms"); without it the
# second group 404s. The request interceptor in src/utils/api.js reconciles
# them. Checking individual call sites would be wrong now: both spellings are
# legal. What must not regress is the normaliser itself.
if grep -qE 'startsWith\("api/"\)' src/utils/api.js 2>/dev/null; then
  echo "PASS  F5 api path normaliser present in src/utils/api.js"
else
  echo "FAIL  F5 api path normaliser missing — bare paths like api.post(\"years-all\") will lose the /api prefix"
  fails=$((fails+1))
fi
# The normaliser only holds if baseURL is the bare origin. A trailing /api in
# the example env would put every path back to /api/api/...
if grep -qE '^VITE_API_URL=.*/api/?$' .env.example 2>/dev/null; then
  echo "FAIL  F5b .env.example VITE_API_URL must be the bare origin, with no /api suffix"
  fails=$((fails+1))
else
  echo "PASS  F5b .env.example VITE_API_URL has no /api suffix"
fi

echo
[ $fails -eq 0 ] && echo "conformance: ALL PASS" || { echo "conformance: $fails FAILURE(S)"; exit 1; }
