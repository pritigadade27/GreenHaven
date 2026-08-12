#!/usr/bin/env bash
API=${API:-http://localhost:8080/api}
MYSQL=${MYSQL:-/c/Users/vnp12/mysql/mysql-8.4.9-winx64/bin/mysql.exe}
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/test-env.sh" ] && . "$HERE/test-env.sh"
: "${MYSQL_PWD:?set MYSQL_PWD — copy test-env.example.sh to test-env.sh}"
ADMIN_EMAIL=${ADMIN_EMAIL:?set ADMIN_EMAIL in test-env.sh}
ADMIN_PASSWORD=${ADMIN_PASSWORD:?set ADMIN_PASSWORD in test-env.sh}
export MYSQL_PWD
ENV_FILE="$(dirname "$0")/../.env"

Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }

. "$(cd "$(dirname "$0")" && pwd)/cleanup.sh"
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-52s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-52s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }
jq_() { python -c "import json,sys; d=json.load(sys.stdin); v=d.get('$1'); print('' if v is None else v)"; }

MODE=$(grep '^RAZORPAY_MODE=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
if [ "$MODE" != "simulated" ]; then
  echo "  RAZORPAY_MODE is '$MODE', not 'simulated' — nothing to test here."
  exit 0
fi

CART='{"addressLine":"12 Test Lane, Kothrud","phone":"9876543210","city":"Pune","state":"Maharashtra","pincode":"411038","items":[{"slug":"aloe-vera","quantity":2}]}'
buyer() {
  curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"fullName\":\"Pay Test\",\"email\":\"$1\",\"password\":\"Testing@123\"}" | jq_ token
}
open_order() {
  curl -s -m 20 -X POST $API/orders -H "Authorization: Bearer $1" \
    -H 'Content-Type: application/json' -d "$CART" | jq_ razorpayOrderId
}

STAMP=$(date +%s)
TOK=$(buyer "paytest$STAMP@example.com")

echo "== CHECKOUT OPENS IN SIMULATED MODE =="
ORDER=$(curl -s -m 20 -X POST $API/orders -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "$CART")
RID=$(echo "$ORDER" | jq_ razorpayOrderId)
check "order created"          "PENDING"            "$(echo "$ORDER" | jq_ status)"
check "flagged as simulated"   "True"               "$(echo "$ORDER" | jq_ simulated)"
check "sentinel key id"        "rzp_test_simulated" "$(echo "$ORDER" | jq_ razorpayKeyId)"
check "gateway order id minted" "yes"               "$(case "$RID" in order_SIM*) echo yes;; *) echo no;; esac)"
check "no invoice yet"         ""                   "$(Q "SELECT IFNULL(invoice_number,'') FROM orders WHERE razorpay_order_id='$RID';")"
check "attempt row is CREATED" "CREATED"            "$(Q "SELECT status FROM payment WHERE razorpay_order_id='$RID';")"

echo "== A FAILED PAYMENT CHARGES NOTHING =="
STOCK=$(Q "SELECT stock FROM plant WHERE slug='aloe-vera';")
BAD=$(curl -s -m 20 -X POST "$API/orders/$RID/simulate?succeed=false" -H "Authorization: Bearer $TOK")
check "verify rejects a bad signature" 400 \
  "$(code -X POST $API/orders/verify -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "$BAD")"
check "order marked FAILED"     "FAILED" "$(Q "SELECT status FROM orders WHERE razorpay_order_id='$RID';")"
check "reason recorded"         "1"      "$(Q "SELECT COUNT(*) FROM payment WHERE razorpay_order_id='$RID' AND failure_reason LIKE 'HMAC signature did not match%';")"
check "unverified id not stored in the unique column" "1" \
  "$(Q "SELECT COUNT(*) FROM payment WHERE razorpay_order_id='$RID' AND razorpay_payment_id IS NULL;")"
check "but kept as evidence"    "1"      "$(Q "SELECT COUNT(*) FROM payment WHERE razorpay_order_id='$RID' AND failure_reason LIKE '%claimed payment id pay_SIM%';")"
check "no invoice issued"       ""       "$(Q "SELECT IFNULL(invoice_number,'') FROM orders WHERE razorpay_order_id='$RID';")"
check "stock untouched"         "$STOCK" "$(Q "SELECT stock FROM plant WHERE slug='aloe-vera';")"

GOOD=$(curl -s -m 20 -X POST "$API/orders/$RID/simulate?succeed=true" -H "Authorization: Bearer $TOK")
check "a FAILED order cannot then be paid" 400 \
  "$(code -X POST $API/orders/verify -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "$GOOD")"

echo "== A FORGED SIGNATURE IS REFUSED =="
forge() {
  code -X POST $API/orders/verify -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
    -d "{\"razorpayOrderId\":\"$1\",\"razorpayPaymentId\":\"pay_forged\",\"razorpaySignature\":\"deadbeefdeadbeef\"}"
}
R2=$(open_order "$TOK")
check "hand-made signature rejected" 400 "$(forge "$R2")"
R2B=$(open_order "$TOK")
check "the same forged id on another order" 400 "$(forge "$R2B")"
check "and that order really is FAILED" "FAILED" "$(Q "SELECT status FROM orders WHERE razorpay_order_id='$R2B';")"

echo "== A SUCCESSFUL PAYMENT =="
STOCK=$(Q "SELECT stock FROM plant WHERE slug='aloe-vera';")
R3=$(open_order "$TOK")
SIG=$(curl -s -m 20 -X POST "$API/orders/$R3/simulate?succeed=true" -H "Authorization: Bearer $TOK")
PAID=$(curl -s -m 20 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "$SIG")
check "order is PAID"        "PAID" "$(echo "$PAID" | jq_ status)"
check "invoice allocated"    "yes"  "$(case "$(echo "$PAID" | jq_ invoiceNumber)" in INV-GH-*) echo yes;; *) echo no;; esac)"
check "payment id recorded"  "yes"  "$(case "$(echo "$PAID" | jq_ razorpayPaymentId)" in pay_SIM*) echo yes;; *) echo no;; esac)"
check "payment row CAPTURED" "CAPTURED" "$(Q "SELECT status FROM payment WHERE razorpay_order_id='$R3';")"
check "and VERIFIED"         "VERIFIED" "$(Q "SELECT verification_status FROM payment WHERE razorpay_order_id='$R3';")"
check "verified_at stamped"  "1"    "$(Q "SELECT COUNT(*) FROM payment WHERE razorpay_order_id='$R3' AND verified_at IS NOT NULL;")"
check "stock decremented by 2" "$((STOCK - 2))" "$(Q "SELECT stock FROM plant WHERE slug='aloe-vera';")"

echo "== PAYING TWICE IS IMPOSSIBLE =="
AFTER=$(Q "SELECT stock FROM plant WHERE slug='aloe-vera';")
INV=$(echo "$PAID" | jq_ invoiceNumber)
REPLAY=$(curl -s -m 20 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "$SIG")
check "replay returns the same order" "PAID" "$(echo "$REPLAY" | jq_ status)"
check "same invoice, not a new one"   "$INV" "$(echo "$REPLAY" | jq_ invoiceNumber)"
check "stock not decremented again"   "$AFTER" "$(Q "SELECT stock FROM plant WHERE slug='aloe-vera';")"

echo "== THE SIMULATOR IS NOT AN OPEN DOOR =="
check "anonymous cannot simulate" 403 "$(code -X POST "$API/orders/$R3/simulate")"
OTHER=$(buyer "other$STAMP@example.com")
check "another customer cannot simulate mine" 400 \
  "$(code -X POST "$API/orders/$R3/simulate" -H "Authorization: Bearer $OTHER")"
check "unknown order id" 404 "$(code -X POST "$API/orders/order_NOPE/simulate" -H "Authorization: Bearer $TOK")"

echo "== THE PAYMENT REACHES THE ADMIN BOOKS =="
PW=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
ADMIN=$(curl -s -m 20 -X POST $API/admin/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}" | jq_ token)
check "captured payment is listed" "yes" \
  "$(curl -s -m 20 "$API/admin/payments?status=CAPTURED" -H "Authorization: Bearer $ADMIN" \
     | python -c "import json,sys;print('yes' if '$R3' in sys.stdin.read() else 'no')")"
check "revenue counts it" "yes" \
  "$(curl -s -m 20 "$API/admin/stats" -H "Authorization: Bearer $ADMIN" \
     | python -c "import json,sys;print('yes' if json.load(sys.stdin)['totalRevenue'] > 0 else 'no')")"

echo "== CLEANUP =="
Q "DELETE p FROM payment p JOIN orders o ON o.id = p.order_id
     JOIN app_user u ON u.id = o.user_id WHERE u.email LIKE 'paytest%@example.com';
   DELETE i FROM order_item i JOIN orders o ON o.id = i.order_id
     JOIN app_user u ON u.id = o.user_id WHERE u.email LIKE 'paytest%@example.com';
   DELETE o FROM orders o JOIN app_user u ON u.id = o.user_id
     WHERE u.email LIKE 'paytest%@example.com';
   DELETE FROM app_user WHERE email LIKE 'paytest%@example.com' OR email LIKE 'other%@example.com';
   UPDATE plant SET stock = $STOCK WHERE slug='aloe-vera';" >/dev/null
echo "  test orders removed, stock restored to $STOCK"

purge_test_accounts "paytest%@example.com"
assert_clean "paytest%@example.com"

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]
