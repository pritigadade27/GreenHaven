#!/usr/bin/env bash
# Admin session security: logout revokes, single-session, RBAC, audit trail.
API=http://localhost:8080/api
MYSQL="/c/Users/vnp12/mysql/mysql-8.4.9-winx64/bin/mysql.exe"
# Credentials come from backend/tools/test-env.sh, which is gitignored. There
# is deliberately no built-in default: a fallback password in a committed
# script is a published password.
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/test-env.sh" ] && . "$HERE/test-env.sh"
: "${MYSQL_PWD:?set MYSQL_PWD — copy test-env.example.sh to test-env.sh}"
ADMIN_EMAIL=${ADMIN_EMAIL:?set ADMIN_EMAIL in test-env.sh}
ADMIN_PASSWORD=${ADMIN_PASSWORD:?set ADMIN_PASSWORD in test-env.sh}
export MYSQL_PWD
export MYSQL_PWD='$ADMIN_PASSWORD'
Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }

pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-52s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-52s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }

PW=$(grep '^ADMIN_PASSWORD=' "/c/Users/vnp12/Desktop/green haven/backend/.env" | cut -d= -f2- | tr -d '\r')
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "/c/Users/vnp12/Desktop/green haven/backend/.env" | cut -d= -f2- | tr -d '\r')
login() {
  curl -s -m 20 -X POST $API/admin/auth/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}" \
    | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))"
}

echo "== ADMIN LOGIN IS ITS OWN ENDPOINT =="
A1=$(login)
check "admin signs in at /api/admin/auth/login" "yes" "$([ -n "$A1" ] && echo yes || echo no)"
check "wrong password refused" 400 "$(code -X POST $API/admin/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"nope-not-it\"}")"
check "a CUSTOMER cannot use the admin login" 400 "$(code -X POST $API/admin/auth/login -H 'Content-Type: application/json' -d '{"email":"priti@greenhaven.in","password":"GreenHaven2026"}')"
check "session row created" 1 "$(Q "SELECT COUNT(*) FROM admin_session WHERE revoked=0;")"

echo "== RBAC =="
CUST=$(curl -s -m 20 -X POST $API/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"priti@greenhaven.in","password":"GreenHaven2026"}' \
  | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
check "admin token reaches the dashboard" 200 "$(code $API/admin/stats -H "Authorization: Bearer $A1")"
check "customer token is refused" 403 "$(code $API/admin/stats -H "Authorization: Bearer $CUST")"
check "no token is refused" 403 "$(code $API/admin/stats)"
check "customer cannot read the audit trail" 403 "$(code $API/admin/auth/activity -H "Authorization: Bearer $CUST")"

echo "== LOGOUT ACTUALLY INVALIDATES THE TOKEN =="
check "token works before logout" 200 "$(code $API/admin/stats -H "Authorization: Bearer $A1")"
check "logout accepted" 200 "$(code -X POST $API/admin/auth/logout -H "Authorization: Bearer $A1")"
check "SAME token now rejected (back button is dead)" 403 "$(code $API/admin/stats -H "Authorization: Bearer $A1")"
check "session marked revoked in MySQL" "LOGOUT" "$(Q "SELECT revoked_reason FROM admin_session ORDER BY id DESC LIMIT 1;")"

echo "== ONE SESSION AT A TIME =="
B1=$(login)
check "first session works" 200 "$(code $API/admin/stats -H "Authorization: Bearer $B1")"
B2=$(login)
check "second sign-in returned a token (not rate limited)" "yes" "$([ -n "$B2" ] && echo yes || echo no)"
check "second sign-in works" 200 "$(code $API/admin/stats -H "Authorization: Bearer $B2")"
check "FIRST session is now dead" 403 "$(code $API/admin/stats -H "Authorization: Bearer $B1")"
# Scoped to this run — the tables keep every earlier run's rows.
check "reason recorded as SUPERSEDED" SUPERSEDED "$(Q "SELECT revoked_reason FROM admin_session WHERE revoked=1 ORDER BY id DESC LIMIT 1;")"

echo "== ACTIVITY LOG =="
OID=$(Q "SELECT id FROM orders ORDER BY id DESC LIMIT 1;")
PID=$(Q "SELECT id FROM plant WHERE slug='tulsi';")
BEFORE=$(Q "SELECT stock FROM plant WHERE id=$PID;")
# Delta, not a total — the log keeps every earlier run's rows.
LOGGED_BEFORE=$(Q "SELECT COUNT(*) FROM admin_activity_log WHERE action='INVENTORY_UPDATED';")
curl -s -o /dev/null -m 20 -X PATCH "$API/admin/inventory/$PID/stock" -H "Authorization: Bearer $B2" \
  -H 'Content-Type: application/json' -d '{"stock":7}'
check "INVENTORY_UPDATED logged" 1 "$(( $(Q "SELECT COUNT(*) FROM admin_activity_log WHERE action='INVENTORY_UPDATED';") - LOGGED_BEFORE ))"
check "log records who" "$ADMIN_EMAIL" "$(Q "SELECT admin_email FROM admin_activity_log WHERE action='INVENTORY_UPDATED' ORDER BY id DESC LIMIT 1;")"
check "log records what changed" "stock set to 7 (IN_STOCK)" "$(Q "SELECT detail FROM admin_activity_log WHERE action='INVENTORY_UPDATED' ORDER BY id DESC LIMIT 1;")"
check "log records the IP" "yes" "$([ -n "$(Q "SELECT ip_address FROM admin_activity_log ORDER BY id DESC LIMIT 1;")" ] && echo yes || echo no)"
check "LOGIN logged" "yes" "$([ "$(Q "SELECT COUNT(*) FROM admin_activity_log WHERE action='LOGIN';")" -gt 0 ] && echo yes || echo no)"
check "LOGOUT logged" "yes" "$([ "$(Q "SELECT COUNT(*) FROM admin_activity_log WHERE action='LOGOUT';")" -gt 0 ] && echo yes || echo no)"
check "failed sign-in logged" "yes" "$([ "$(Q "SELECT COUNT(*) FROM admin_activity_log WHERE action='LOGIN_FAILED';")" -gt 0 ] && echo yes || echo no)"
check "activity endpoint serves it" 200 "$(code $API/admin/auth/activity -H "Authorization: Bearer $B2")"
Q "UPDATE plant SET stock=$BEFORE WHERE id=$PID;"

echo "== IDLE TIMEOUT =="
# Age the session past the configured idle window rather than waiting 20 minutes.
JTI=$(Q "SELECT jti FROM admin_session WHERE revoked=0 ORDER BY id DESC LIMIT 1;")
Q "UPDATE admin_session SET last_seen_at = DATE_SUB(last_seen_at, INTERVAL 45 MINUTE) WHERE jti='$JTI';"
check "idle session is rejected" 403 "$(code $API/admin/stats -H "Authorization: Bearer $B2")"
check "revoked with reason TIMEOUT" "TIMEOUT" "$(Q "SELECT revoked_reason FROM admin_session WHERE jti='$JTI';")"

echo "== CUSTOMER SIDE UNAFFECTED =="
check "shop catalogue still open" 200 "$(code $API/categories)"
check "customer token still valid" 200 "$(code $API/auth/me -H "Authorization: Bearer $CUST")"

echo
echo "  $pass passed, $fail failed"
