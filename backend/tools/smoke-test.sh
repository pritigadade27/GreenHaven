#!/usr/bin/env bash
# Green Haven — end-to-end smoke test, customer side and admin side.
#
#   bash backend/tools/smoke-test.sh
#
# Kept in the repo rather than a temp folder so it survives the session and can
# be run before any deploy.
#
# RESTART THE API FIRST. The rate limiter is in-memory and deliberately tight:
# 5 admin sign-ins per 15 minutes. Running this twice — or running it alongside
# another suite that signs in — exhausts that budget, and every later check then
# fails for want of a token rather than for any real fault. A restart clears the
# buckets. This is the limiter working, not a bug.
API=${API:-http://localhost:8080/api}
MYSQL=${MYSQL:-/c/Users/vnp12/mysql/mysql-8.4.9-winx64/bin/mysql.exe}
# Credentials come from backend/tools/test-env.sh, which is gitignored. There
# is deliberately no built-in default: a fallback password in a committed
# script is a published password.
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/test-env.sh" ] && . "$HERE/test-env.sh"
: "${MYSQL_PWD:?set MYSQL_PWD — copy test-env.example.sh to test-env.sh}"
ADMIN_EMAIL=${ADMIN_EMAIL:?set ADMIN_EMAIL in test-env.sh}
ADMIN_PASSWORD=${ADMIN_PASSWORD:?set ADMIN_PASSWORD in test-env.sh}
export MYSQL_PWD
ENV_FILE="$(dirname "$0")/../.env"

Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }

# Shared, foreign-key-ordered teardown. Each suite used to roll its own and
# every one was incomplete, so cleanup aborted on the first FK error.
. "$(cd "$(dirname "$0")" && pwd)/cleanup.sh"
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-52s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-52s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }

echo "== CATALOGUE =="
check "categories" 200 "$(code $API/categories)"
check "badges" 200 "$(code $API/badges)"
check "paginated plants" 200 "$(code "$API/plants?page=0&size=12")"
check "catalogue size matches MySQL" "$(Q 'SELECT COUNT(*) FROM plant;')" \
  "$(curl -s -m 15 "$API/plants?page=0&size=1" | python -c "import json,sys;print(json.load(sys.stdin)['totalElements'])")"
check "unknown slug is 404" 404 "$(code $API/plants/does-not-exist)"
check "search wildcards are literal" 0 \
  "$(curl -s -m 15 "$API/plants?q=%25&size=1" | python -c "import json,sys;print(json.load(sys.stdin)['totalElements'])")"
check "parser internals are not leaked" "clean" "$(curl -s -m 15 "$API/plants?maxPrice=abc" | python -c "
import json,sys
try: m=json.load(sys.stdin).get('message','')
except Exception: m=''
print('leak' if 'notation exponential' in m or 'java.' in m else 'clean')")"

echo "== PUBLIC FORMS =="
check "contact accepted" 200 "$(code -X POST $API/contact -H 'Content-Type: application/json' -d '{"name":"Smoke Test","email":"smoke@example.in","subject":"Care advice","message":"Checking that this still reaches the database."}')"
check "contact validates" 400 "$(code -X POST $API/contact -H 'Content-Type: application/json' -d '{"name":"","email":"nope","subject":"x","message":"hi"}')"
check "newsletter accepted" 200 "$(code -X POST $API/newsletter -H 'Content-Type: application/json' -d '{"email":"smoke@example.in"}')"
check "contact row in MySQL" 1 "$(Q "SELECT COUNT(*) FROM contact_message WHERE email='smoke@example.in';")"

echo "== CUSTOMER AUTH =="
CUST=$(curl -s -m 20 -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"priti@greenhaven.in","password":"GreenHaven2026"}' \
  | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
check "customer signs in" "yes" "$([ -n "$CUST" ] && echo yes || echo no)"
check "/auth/me with token" 200 "$(code $API/auth/me -H "Authorization: Bearer $CUST")"
check "/auth/me without token" 403 "$(code $API/auth/me)"
check "tampered token refused" 403 "$(code $API/auth/me -H "Authorization: Bearer ${CUST}x")"

echo "== CHECKOUT VALIDATION =="
check "checkout needs a session" 403 "$(code -X POST $API/orders -H 'Content-Type: application/json' -d '{"addressLine":"a","phone":"9876543210","city":"Pune","state":"MH","pincode":"411045","items":[{"slug":"tulsi","quantity":1}]}')"
check "phone required" 400 "$(code -X POST $API/orders -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' -d '{"addressLine":"12 Baner Road","city":"Pune","state":"MH","pincode":"411045","items":[{"slug":"tulsi","quantity":1}]}')"
check "absurd quantity refused" 400 "$(code -X POST $API/orders -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' -d '{"addressLine":"12 Baner Road","phone":"9876543210","city":"Pune","state":"MH","pincode":"411045","items":[{"slug":"tulsi","quantity":2000000000}]}')"
MODE=$(grep '^RAZORPAY_MODE=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
CART='{"addressLine":"12 Baner Road","phone":"9876543210","city":"Pune","state":"MH","pincode":"411045","items":[{"slug":"tulsi","quantity":1}]}'
if [ "$MODE" = "simulated" ]; then
  check "simulated gateway opens an order" 201 "$(code -X POST $API/orders -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' -d "$CART")"
else
  check "gateway unconfigured says so" 503 "$(code -X POST $API/orders -H "Authorization: Bearer $CUST" -H 'Content-Type: application/json' -d "$CART")"
fi
check "order history" 200 "$(code $API/orders -H "Authorization: Bearer $CUST")"

echo "== ADMIN =="
PW=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
ADMIN=$(curl -s -m 20 -X POST $API/admin/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}" \
  | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
check "admin signs in" "yes" "$([ -n "$ADMIN" ] && echo yes || echo no)"
check "admin reaches the dashboard" 200 "$(code $API/admin/stats -H "Authorization: Bearer $ADMIN")"
check "CUSTOMER cannot reach the dashboard" 403 "$(code $API/admin/stats -H "Authorization: Bearer $CUST")"
check "anonymous cannot reach the dashboard" 403 "$(code $API/admin/stats)"
for ep in orders payments users inventory reviews analytics; do
  check "GET /admin/$ep" 200 "$(code "$API/admin/$ep" -H "Authorization: Bearer $ADMIN")"
done
check "totalProducts matches MySQL" "$(Q 'SELECT COUNT(*) FROM plant;')" \
  "$(curl -s -m 20 $API/admin/stats -H "Authorization: Bearer $ADMIN" | python -c "import json,sys;print(json.load(sys.stdin)['totalProducts'])")"
check "logout revokes the token" 403 "$(curl -s -o /dev/null -m 20 -X POST $API/admin/auth/logout -H "Authorization: Bearer $ADMIN" >/dev/null; code $API/admin/stats -H "Authorization: Bearer $ADMIN")"

echo "== CLEANUP =="
Q "DELETE FROM contact_message WHERE email='smoke@example.in';
   DELETE FROM newsletter_subscriber WHERE email='smoke@example.in';" >/dev/null
echo "  test rows removed"

# Shared teardown: returns consumed stock, then removes the run in
# foreign-key order. Rolling its own left accounts behind on every run.
purge_test_accounts "moved%@example.com"
assert_clean "moved%@example.com"


echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]
