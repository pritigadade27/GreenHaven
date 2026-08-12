#!/usr/bin/env bash
# Green Haven — discount codes, end to end.
#
#   bash backend/tools/test-coupons.sh
#
# A discount is money leaving the shop, so the rule this suite exists to hold
# down is that the SERVER decides what a code is worth. The browser sends a
# code and nothing else; it never sends a figure, and no figure it sends is
# ever believed.
#
# The rest is the arithmetic and the limits: percentages, caps, floors,
# windows, per-customer and overall ceilings, and what happens to a code when
# the order that used it is cancelled.
#
# RESTART THE API FIRST — /api/orders is capped at 30 an hour and the quote
# endpoint at 15 per 15 minutes.
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

Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }

# Shared, foreign-key-ordered teardown. Each suite used to roll its own and
# every one was incomplete, so cleanup aborted on the first FK error.
. "$(cd "$(dirname "$0")" && pwd)/cleanup.sh"
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-52s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-52s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 30 -w '%{http_code}' "$@"; }
# Money comes back as JSON numbers, so 479.20 arrives as 479.2. Comparing the
# printed forms would fail on a difference that does not exist — these are
# compared as numbers, to the paisa.
money() { python -c "print(f'{float('${1:-0}' or 0):.2f}')" 2>/dev/null || echo "$1"; }
checkm() {
  local got want
  want=$(money "$2"); got=$(money "$3")
  check "$1" "$want" "$got"
}
jq_() { python -c "import json,sys
d=json.load(sys.stdin)
for k in '$1'.split('.'):
    if d is None: break
    d = d[int(k)] if k.isdigit() else d.get(k)
print('' if d is None else d)"; }

BODY=$(mktemp)
json() { python -c "
import io, json, sys
io.open(sys.argv[1], 'w', encoding='utf-8').write(json.dumps(json.loads(sys.argv[2])))" "$BODY" "$1"; }
post()  { json "$3"; curl -s -m 30 -X "$1" "$2" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"; }
postc() { json "$3"; code -X "$1" "$2" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"; }
apost() { json "$3"; curl -s -m 30 -X "$1" "$2" -H "Authorization: Bearer $ATOK" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"; }

STAMP=$(date +%s)
SLUG=snake-plant
PRICE=$(Q "SELECT price FROM plant WHERE slug='$SLUG';")
echo "  $SLUG is ₹$PRICE"

# Residue from an earlier run, cleared BEFORE this run creates anything —
# doing it afterwards deletes the accounts the suite is about to use.
purge_test_accounts "cpn%@example.com"

reg() {
  curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"fullName\":\"$2\",\"email\":\"$1\",\"password\":\"Testing@123\"}" | jq_ token
}
EM="cpn$STAMP@example.com"
EM2="cpn2$STAMP@example.com"
TOK=$(reg "$EM" "Kavita Naik")
TOK2=$(reg "$EM2" "Rahul Mehta")
if [ -z "$TOK" ] || [ -z "$TOK2" ]; then
  echo "  Could not register a test account — the rate limit is probably spent."
  echo "  Restart the API and run this again."
  exit 1
fi
ATOK=$(curl -s -m 20 -X POST $API/admin/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq_ token)

# Residue from an earlier run, cleared so the counts below are absolute.
Q "DELETE FROM coupon WHERE code LIKE 'TEST%';" >/dev/null

# A basket of 4, comfortably over the ₹999 free-delivery line.
CART4="[{\"slug\":\"$SLUG\",\"quantity\":4}]"
CART1="[{\"slug\":\"$SLUG\",\"quantity\":1}]"
quote() { post POST $API/coupons/quote "{\"code\":\"$1\",\"items\":$2}"; }

echo
echo "== THE ADMIN MAKES A CODE =="
NEW=$(apost POST $API/admin/coupons \
  '{"code":"test20","description":"Twenty per cent off","discountType":"PERCENT","discountValue":20,"perUserLimit":1}')
C20=$(echo "$NEW" | jq_ id)
check "created"                 "TEST20" "$(echo "$NEW" | jq_ code)"
check "stored uppercase"        "TEST20" "$(Q "SELECT code FROM coupon WHERE id=$C20;")"
check "starts live"             "Live"   "$(echo "$NEW" | jq_ state)"
check "nothing given away yet"  "0"      "$(echo "$NEW" | jq_ timesUsed)"
check "a duplicate is refused"  400 \
  "$(json '{"code":"TEST20","discountType":"FLAT","discountValue":50}'; \
     code -X POST $API/admin/coupons -H "Authorization: Bearer $ATOK" \
       -H 'Content-Type: application/json' --data-binary @"$BODY")"
check "over 100 per cent refused" 400 \
  "$(json '{"code":"TESTBAD","discountType":"PERCENT","discountValue":120}'; \
     code -X POST $API/admin/coupons -H "Authorization: Bearer $ATOK" \
       -H 'Content-Type: application/json' --data-binary @"$BODY")"
check "a customer cannot make one" 403 \
  "$(postc POST $API/admin/coupons '{"code":"TESTHACK","discountType":"FLAT","discountValue":9999}')"

echo
echo "== QUOTING IT =="
SUB4=$(python -c "print(f'{$PRICE*4:.2f}')")
EXPECTED=$(python -c "print(f'{$PRICE*4*0.2:.2f}')")
QUOTE=$(quote TEST20 "$CART4")
check "applied"                "True"       "$(echo "$QUOTE" | jq_ applied)"
checkm "subtotal is ours"       "$SUB4"      "$(echo "$QUOTE" | jq_ subtotal)"
checkm "20% of the goods"       "$EXPECTED"  "$(echo "$QUOTE" | jq_ discount)"
checkm "total is subtotal less discount" \
  "$(python -c "print(f'{$PRICE*4*0.8:.2f}')")" "$(echo "$QUOTE" | jq_ total)"
check "lowercase works too"    "True" "$(quote test20 "$CART4" | jq_ applied)"
check "whitespace is trimmed"  "True" "$(quote "  TEST20  " "$CART4" | jq_ applied)"
check "an unknown code"        "False" "$(quote NOPE1234 "$CART4" | jq_ applied)"
check "…is told so"            "We do not recognise that code." \
  "$(quote NOPE1234 "$CART4" | jq_ message)"
check "anonymous cannot quote" 403 \
  "$(json "{\"code\":\"TEST20\",\"items\":$CART4}"; \
     code -X POST $API/coupons/quote -H 'Content-Type: application/json' --data-binary @"$BODY")"

echo
echo "== THE BROWSER CANNOT NAME ITS OWN DISCOUNT =="
# The request carries a discount and a total. Both must be ignored entirely.
FORGED=$(post POST $API/coupons/quote \
  "{\"code\":\"TEST20\",\"items\":$CART4,\"discount\":99999,\"total\":1,\"subtotal\":1}")
checkm "the sent discount is ignored" "$EXPECTED" "$(echo "$FORGED" | jq_ discount)"
checkm "the sent subtotal is ignored" "$SUB4"     "$(echo "$FORGED" | jq_ subtotal)"

echo
echo "== SPENDING IT =="
SHIP() { echo "{\"addressLine\":\"9 Baner Road\",\"phone\":\"9876543210\",\"city\":\"Pune\",\"state\":\"Maharashtra\",\"pincode\":\"411045\",\"items\":$1$2}"; }
ORDER=$(post POST $API/orders "$(SHIP "$CART4" ',"couponCode":"TEST20"')")
RID=$(echo "$ORDER" | jq_ razorpayOrderId)
checkm "the order carries the discount" "$EXPECTED" "$(echo "$ORDER" | jq_ discount)"
check "…and names the code"            "TEST20"    "$(echo "$ORDER" | jq_ couponCode)"
checkm "the total matches the quote"    "$(python -c "print(f'{$PRICE*4*0.8:.2f}')")" \
  "$(echo "$ORDER" | jq_ total)"
ON=$(echo "$ORDER" | jq_ orderNumber)
check "the redemption is recorded"     "1" \
  "$(Q "SELECT COUNT(*) FROM coupon_redemption r JOIN orders o ON o.id=r.order_id WHERE o.order_number='$ON';")"
check "Razorpay was asked for the discounted amount" \
  "$(python -c "print(int($PRICE*4*0.8*100))")" \
  "$(Q "SELECT ROUND(amount*100) FROM payment p JOIN orders o ON o.id=p.order_id WHERE o.order_number='$ON' LIMIT 1;" | cut -d. -f1)"

SIG=$(curl -s -m 30 -X POST "$API/orders/$RID/simulate?succeed=true" -H "Authorization: Bearer $TOK")
curl -s -m 30 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "$SIG" >/dev/null
check "the order is paid" "PAID" "$(Q "SELECT status FROM orders WHERE order_number='$ON';")"

echo
echo "== ONCE EACH =="
check "the same customer is refused" "False" "$(quote TEST20 "$CART4" | jq_ applied)"
check "…and told why"                "You have already used that code." \
  "$(quote TEST20 "$CART4" | jq_ message)"
check "checkout refuses it too"      400 \
  "$(postc POST $API/orders "$(SHIP "$CART4" ',"couponCode":"TEST20"')")"
check "somebody else may still use it" "True" \
  "$(curl -s -m 30 -X POST $API/coupons/quote -H "Authorization: Bearer $TOK2" \
      -H 'Content-Type: application/json' -d "{\"code\":\"TEST20\",\"items\":$CART4}" | jq_ applied)"

echo
echo "== A CANCELLED ORDER GIVES THE CODE BACK =="
Q "UPDATE orders SET status='CANCELLED' WHERE order_number='$ON';" >/dev/null
check "usable again" "True" "$(quote TEST20 "$CART4" | jq_ applied)"
Q "UPDATE orders SET status='PAID' WHERE order_number='$ON';" >/dev/null
check "and spent again once it is not" "False" "$(quote TEST20 "$CART4" | jq_ applied)"

echo
echo "== A FLAT CODE NEVER EXCEEDS THE GOODS =="
apost POST $API/admin/coupons \
  '{"code":"TESTBIG","discountType":"FLAT","discountValue":99999,"perUserLimit":9}' >/dev/null
BIG=$(quote TESTBIG "$CART1")
checkm "capped at the subtotal" "$(python -c "print(f'{$PRICE:.2f}')")" "$(echo "$BIG" | jq_ discount)"
checkm "the total never goes below delivery" "99.00" "$(echo "$BIG" | jq_ total)"

echo
echo "== A CAP ON A PERCENTAGE =="
apost POST $API/admin/coupons \
  '{"code":"TESTCAP","discountType":"PERCENT","discountValue":50,"maxDiscount":100,"perUserLimit":9}' >/dev/null
checkm "half the basket, capped at ₹100" "100.00" "$(quote TESTCAP "$CART4" | jq_ discount)"

echo
echo "== A MINIMUM BASKET =="
apost POST $API/admin/coupons \
  '{"code":"TESTMIN","discountType":"FLAT","discountValue":100,"minOrderValue":100000,"perUserLimit":9}' >/dev/null
check "refused under the minimum" "False" "$(quote TESTMIN "$CART1" | jq_ applied)"
check "…and says how much more"   "yes" \
  "$(quote TESTMIN "$CART1" | jq_ message | grep -q "add ₹" && echo yes || echo no)"

echo
echo "== A WINDOW =="
apost POST $API/admin/coupons \
  '{"code":"TESTPAST","discountType":"FLAT","discountValue":50,"expiresAt":"2020-01-01T00:00:00Z","perUserLimit":9}' >/dev/null
apost POST $API/admin/coupons \
  '{"code":"TESTSOON","discountType":"FLAT","discountValue":50,"startsAt":"2090-01-01T00:00:00Z","perUserLimit":9}' >/dev/null
check "expired is refused"      "That code has expired."      "$(quote TESTPAST "$CART4" | jq_ message)"
check "not started is refused"  "That code is not active yet." "$(quote TESTSOON "$CART4" | jq_ message)"
check "expired reads as Expired"   "Expired"   "$(curl -s -H "Authorization: Bearer $ATOK" "$API/admin/coupons?size=100" | python -c "
import json,sys
print(next(r['state'] for r in json.load(sys.stdin)['content'] if r['code']=='TESTPAST'))")"
check "scheduled reads as Scheduled" "Scheduled" "$(curl -s -H "Authorization: Bearer $ATOK" "$API/admin/coupons?size=100" | python -c "
import json,sys
print(next(r['state'] for r in json.load(sys.stdin)['content'] if r['code']=='TESTSOON'))")"

echo
echo "== TURNED OFF =="
apost POST $API/admin/coupons \
  '{"code":"TESTOFF","discountType":"FLAT","discountValue":50,"active":false,"perUserLimit":9}' >/dev/null
check "an inactive code is refused" "That code is no longer available." \
  "$(quote TESTOFF "$CART4" | jq_ message)"
OFFID=$(curl -s -H "Authorization: Bearer $ATOK" "$API/admin/coupons?size=100" | python -c "
import json,sys
print(next(r['id'] for r in json.load(sys.stdin)['content'] if r['code']=='TESTOFF'))")
curl -s -m 30 -X PATCH "$API/admin/coupons/$OFFID/state?active=true" \
  -H "Authorization: Bearer $ATOK" >/dev/null
check "turning it on makes it work" "True" "$(quote TESTOFF "$CART4" | jq_ applied)"

echo
echo "== FREE DELIVERY =="
apost POST $API/admin/coupons \
  '{"code":"TESTSHIP","discountType":"FLAT","discountValue":1,"freeShipping":true,"perUserLimit":9}' >/dev/null
SHIPQ=$(quote TESTSHIP "$CART1")
checkm "delivery is waived on a small basket" "0.00" "$(echo "$SHIPQ" | jq_ shipping)"
# Without the code, one plant is under ₹999 and pays the ₹99 fee.
checkm "…and charged without it" "99.00" "$(quote NOPE9999 "$CART1" | jq_ shipping)"

echo
echo "== A DISCOUNT NEVER COSTS THE CUSTOMER FREE DELIVERY =="
# The basket qualifies at ₹999+; a code taking it under must not re-add the fee.
apost POST $API/admin/coupons \
  '{"code":"TESTDROP","discountType":"PERCENT","discountValue":70,"perUserLimit":9}' >/dev/null
DROP=$(quote TESTDROP "$CART4")
check "the basket qualified before the discount" "yes" \
  "$(python -c "print('yes' if $PRICE*4 >= 999 else 'no')")"
check "…and after it does not" "yes" \
  "$(python -c "print('yes' if $PRICE*4*0.3 < 999 else 'no')")"
checkm "delivery stays free"    "0.00" "$(echo "$DROP" | jq_ shipping)"

echo
echo "== AN OVERALL CEILING =="
apost POST $API/admin/coupons \
  '{"code":"TESTONE","discountType":"FLAT","discountValue":50,"usageLimit":1,"perUserLimit":9}' >/dev/null
O1=$(post POST $API/orders "$(SHIP "$CART1" ',"couponCode":"TESTONE"')")
checkm "the first customer gets it" "50.00" "$(echo "$O1" | jq_ discount)"
check "the second is refused"      "That code has been fully claimed." \
  "$(curl -s -m 30 -X POST $API/coupons/quote -H "Authorization: Bearer $TOK2" \
      -H 'Content-Type: application/json' -d "{\"code\":\"TESTONE\",\"items\":$CART1}" | jq_ message)"
check "the dashboard says Claimed"  "Claimed" \
  "$(curl -s -H "Authorization: Bearer $ATOK" "$API/admin/coupons?size=100" | python -c "
import json,sys
print(next(r['state'] for r in json.load(sys.stdin)['content'] if r['code']=='TESTONE'))")"

echo
echo "== NO COUPON AT ALL STILL WORKS =="
PLAIN=$(post POST $API/orders "$(SHIP "$CART4" '')")
checkm "no discount"        "0.00" "$(echo "$PLAIN" | jq_ discount)"
check "no code"            ""     "$(echo "$PLAIN" | jq_ couponCode)"
checkm "priced as before"   "$SUB4" "$(echo "$PLAIN" | jq_ total)"

echo
echo "== WHAT THE DASHBOARD REPORTS =="
ROW=$(curl -s -H "Authorization: Bearer $ATOK" "$API/admin/coupons?size=100" | python -c "
import json,sys
r=next(r for r in json.load(sys.stdin)['content'] if r['code']=='TEST20')
print(r['timesUsed'], r['givenAway'])")
check "TEST20 used once"        "1" "$(echo "$ROW" | cut -d' ' -f1)"
checkm "…and what it cost"       "$EXPECTED" "$(echo "$ROW" | cut -d' ' -f2)"

# ---- tidy up --------------------------------------------------------------
assert_clean "cpn%@example.com"
Q "DELETE FROM coupon WHERE code LIKE 'TEST%';" >/dev/null
rm -f "$BODY"

# Teardown. Runs at the end as well as the start, so a finished run leaves
# the database exactly as it found it.
purge_test_accounts "cpn%@example.com"
assert_clean "cpn%@example.com"
rm -f "$BODY"


echo
echo "  $pass passed, $fail failed"
[ "$fail" = "0" ]
