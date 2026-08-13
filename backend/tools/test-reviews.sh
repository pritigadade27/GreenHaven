#!/usr/bin/env bash
# Config and credentials
API=${API:-http://localhost:8080/api}
MYSQL=${MYSQL:-/c/Users/vnp12/mysql/mysql-8.4.9-winx64/bin/mysql.exe}
HERE="$(cd "$(dirname "$0")" && pwd)"
[ -f "$HERE/test-env.sh" ] && . "$HERE/test-env.sh"
: "${MYSQL_PWD:?set MYSQL_PWD — copy test-env.example.sh to test-env.sh}"
ADMIN_EMAIL=${ADMIN_EMAIL:?set ADMIN_EMAIL in test-env.sh}
ADMIN_PASSWORD=${ADMIN_PASSWORD:?set ADMIN_PASSWORD in test-env.sh}
export MYSQL_PWD
ENV_FILE="$(dirname "$0")/../.env"

# MySQL query helper
Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }

# Test helpers and cleanup
. "$(cd "$(dirname "$0")" && pwd)/cleanup.sh"
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-54s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-54s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }
checkr() { check "$1" "$(python -c "print(float('$2'))")" "$(python -c "print(float('$3' or 0))")"; }
jq_() { python -c "import json,sys
d=json.load(sys.stdin)
for k in '$1'.split('.'):
    if d is None: break
    d = d[int(k)] if k.isdigit() else d.get(k)
print('' if d is None else d)"; }

# JSON request helpers
BODY=$(mktemp)
json() { python -c "
import io, json, sys
io.open(sys.argv[1], 'w', encoding='utf-8').write(json.dumps(json.loads(sys.argv[2])))" "$BODY" "$1"; }
post() { json "$3"; curl -s -m 20 -X "$1" "$2" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"; }
postc() { json "$3"; code -X "$1" "$2" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"; }

# Fixtures and test accounts
SLUG=snake-plant
STAMP=$(date +%s)
purge_test_accounts "rev%@example.com"
restore_plant snake-plant

reg() {
  curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"fullName\":\"$2\",\"email\":\"$1\",\"password\":\"Testing@123\"}" | jq_ token
}
EM="rev$STAMP@example.com"
EM2="rev2$STAMP@example.com"
TOK=$(reg "$EM" "Ravi Kulkarni")
TOK2=$(reg "$EM2" "Neha Joshi")
A()  { curl -s -m 20 -H "Authorization: Bearer $TOK"  "$@"; }
Ac() { code -H "Authorization: Bearer $TOK" "$@"; }

SEED_RATING=NULL
SEED_COUNT=0

EXISTING=$(Q "SELECT COUNT(*) FROM review r JOIN plant p ON p.id = r.plant_id WHERE p.slug='$SLUG';")
if [ "$EXISTING" != "0" ]; then
  echo "  $SLUG already has $EXISTING real review(s)."
  echo "  This suite needs a product with none. Remove them, or point SLUG at another product."
  exit 1
fi

REVIEW='{"rating":4,"title":"Thriving on my windowsill","body":"Arrived well packed and has already put out two new leaves. The care card was genuinely useful."}'

echo "== READING IS PUBLIC =="
check "anyone can read reviews"   200 "$(code $API/plants/$SLUG/reviews)"
check "unknown product is a 404"  404 "$(code $API/plants/not-a-plant/reviews)"
check "summary starts empty"      "0" "$(curl -s -m 20 $API/plants/$SLUG/reviews | jq_ summary.total)"
check "breakdown has all 5 keys"  "5" \
  "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;print(len(json.load(sys.stdin)['summary']['breakdown']))")"

echo "== WRITING IS NOT =="
check "anonymous cannot write"      403 "$(code -X POST $API/reviews/$SLUG -H 'Content-Type: application/json' -d "$REVIEW")"
check "anonymous cannot ask if able" 403 "$(code $API/reviews/$SLUG/eligibility)"
check "anonymous cannot list mine"   403 "$(code $API/reviews/mine)"

echo "== THE GATE: NEVER BOUGHT IT =="
check "not eligible"        "False" "$(A $API/reviews/$SLUG/eligibility | jq_ canReview)"
check "…and told why"       "Only customers who have received this plant can review it." \
  "$(A $API/reviews/$SLUG/eligibility | jq_ reason)"
check "writing is refused"  400 "$(postc POST $API/reviews/$SLUG "$REVIEW")"

echo "== THE GATE: PAID BUT NOT DELIVERED =="
CART="{\"addressLine\":\"9 Baner Road\",\"phone\":\"9876543210\",\"city\":\"Pune\",\"state\":\"Maharashtra\",\"pincode\":\"411045\",\"items\":[{\"slug\":\"$SLUG\",\"quantity\":1}]}"
RID=$(post POST $API/orders "$CART" | jq_ razorpayOrderId)
SIG=$(A -X POST "$API/orders/$RID/simulate?succeed=true")
ON=$(curl -s -m 20 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
      -H 'Content-Type: application/json' -d "$SIG" | jq_ orderNumber)
check "order is paid"       "PAID"  "$(Q "SELECT status FROM orders WHERE order_number='$ON';")"
check "still not eligible"  "False" "$(A $API/reviews/$SLUG/eligibility | jq_ canReview)"
check "still refused"       400     "$(postc POST $API/reviews/$SLUG "$REVIEW")"

echo "== THE GATE: DELIVERED =="
Q "UPDATE orders SET delivery_status='DELIVERED' WHERE order_number='$ON';" >/dev/null
check "now eligible"          "True" "$(A $API/reviews/$SLUG/eligibility | jq_ canReview)"
check "…against that order"   "$ON"  "$(A $API/reviews/$SLUG/eligibility | jq_ orderNumber)"

echo "== WRITING ONE =="
NEW=$(post POST $API/reviews/$SLUG "$REVIEW")
RVID=$(echo "$NEW" | jq_ id)
checkr "created"                "4"     "$(echo "$NEW" | jq_ rating)"
check "verified purchase"       "True"  "$(echo "$NEW" | jq_ verifiedPurchase)"
check "marked as mine"          "True"  "$(echo "$NEW" | jq_ mine)"
check "name is abbreviated"     "Ravi K." "$(echo "$NEW" | jq_ author)"
check "published straight away" "APPROVED" "$(Q "SELECT status FROM review WHERE id=$RVID;")"
check "order recorded"          "$ON" "$(Q "SELECT o.order_number FROM review r JOIN orders o ON o.id=r.order_id WHERE r.id=$RVID;")"
check "user recorded"           "$EM" "$(Q "SELECT u.email FROM review r JOIN app_user u ON u.id=r.user_id WHERE r.id=$RVID;")"
check "product recorded"        "$SLUG" "$(Q "SELECT p.slug FROM review r JOIN plant p ON p.id=r.plant_id WHERE r.id=$RVID;")"
check "date recorded"           "1"   "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID AND created_at IS NOT NULL;")"
check "not marked edited yet"   "1"   "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID AND updated_at IS NULL;")"

echo "== THE PRODUCT'S RATING FOLLOWS =="
check "average rewritten"    "4.0" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"
check "count rewritten"      "1"   "$(Q "SELECT review_count FROM plant WHERE slug='$SLUG';")"
check "summary agrees"       "4.0" "$(curl -s -m 20 $API/plants/$SLUG/reviews | jq_ summary.average)"
check "breakdown counts it"  "1"   "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;print(json.load(sys.stdin)['summary']['breakdown']['4'])")"
check "and the catalogue"    "4.0" "$(curl -s -m 20 $API/plants/$SLUG | jq_ rating)"

echo "== NO DUPLICATES =="
check "a second review is refused" 400 "$(postc POST $API/reviews/$SLUG "$REVIEW")"
check "eligibility says so"        "True" "$(A $API/reviews/$SLUG/eligibility | jq_ alreadyReviewed)"
check "…and hands back the existing one" "$RVID" "$(A $API/reviews/$SLUG/eligibility | jq_ existing.id)"
check "only one row exists"        "1" "$(Q "SELECT COUNT(*) FROM review r JOIN app_user u ON u.id=r.user_id JOIN plant p ON p.id=r.plant_id WHERE u.email='$EM' AND p.slug='$SLUG';")"

echo "== EDITING MY OWN =="
EDIT='{"rating":5,"title":"Even better a month on","body":"Updating after four weeks - it has doubled in size and needed no fuss at all."}'
checkr "edit accepted"    "5" "$(post PUT $API/reviews/$RVID "$EDIT" | jq_ rating)"
check "marked as edited"  "1" "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID AND updated_at IS NOT NULL;")"
check "average follows"   "5.0" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"
check "someone else cannot edit mine" 404 \
  "$(code -X PUT $API/reviews/$RVID -H "Authorization: Bearer $TOK2" -H 'Content-Type: application/json' -d "$EDIT")"
check "someone else cannot delete mine" 404 \
  "$(code -X DELETE $API/reviews/$RVID -H "Authorization: Bearer $TOK2")"

echo "== VALIDATION =="
badfield() { json "$2"; curl -s -m 20 -X POST "$API/reviews/$SLUG" -H "Authorization: Bearer $TOK"   -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"   | python -c "import json,sys;print(','.join(sorted((json.load(sys.stdin).get('fields') or {}).keys())))"; }
check "0 stars names the field"  "rating" "$(badfield x '{"rating":0,"body":"Zero stars should not be allowed at all."}')"
check "6 stars names the field"  "rating" "$(badfield x '{"rating":6,"body":"Six stars should not be allowed either."}')"
check "a missing rating too"     "rating" "$(badfield x '{"body":"No rating at all was supplied here."}')"
check "an empty body too"        "body"   "$(badfield x '{"rating":5,"body":""}')"
check "a two-word body too"      "body"   "$(badfield x '{"rating":5,"body":"Too short"}')"

echo "== A SECOND CUSTOMER, AND THE AVERAGE =="
TOK_KEEP=$TOK; TOK=$TOK2
RID2=$(post POST $API/orders "$CART" | jq_ razorpayOrderId)
SIG2=$(curl -s -m 20 -X POST "$API/orders/$RID2/simulate?succeed=true" -H "Authorization: Bearer $TOK2")
ON2=$(curl -s -m 20 -X POST $API/orders/verify -H "Authorization: Bearer $TOK2" \
      -H 'Content-Type: application/json' -d "$SIG2" | jq_ orderNumber)
Q "UPDATE orders SET delivery_status='DELIVERED' WHERE order_number='$ON2';" >/dev/null
RVID2=$(post POST $API/reviews/$SLUG '{"rating":2,"title":"Mine sulked","body":"Not the plant for a north-facing room, whatever the label says. Two leaves lost already."}' | jq_ id)
TOK=$TOK_KEEP
check "both reviews are listed" "2" "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;print(len(json.load(sys.stdin)['reviews']))")"
check "average is the mean"     "3.5" "$(curl -s -m 20 $API/plants/$SLUG/reviews | jq_ summary.average)"
check "…and on the plant row"   "3.5" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"
check "count is 2"              "2"   "$(Q "SELECT review_count FROM plant WHERE slug='$SLUG';")"
check "breakdown: one 5, one 2" "1,1" \
  "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;b=json.load(sys.stdin)['summary']['breakdown'];print(str(b['5'])+','+str(b['2']))")"
check "mine is flagged only for me" "1" \
  "$(A $API/plants/$SLUG/reviews | python -c "import json,sys;print(sum(1 for r in json.load(sys.stdin)['reviews'] if r['mine']))")"
check "anonymous sees none as theirs" "0" \
  "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;print(sum(1 for r in json.load(sys.stdin)['reviews'] if r['mine']))")"

echo "== ADMIN MODERATION =="
# Sign in as admin
PW=$(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
ADMIN=$(curl -s -m 20 -X POST $API/admin/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}" | jq_ token)
AD() { curl -s -m 20 -H "Authorization: Bearer $ADMIN" "$@"; }
check "admin sees the reviews" "yes" \
  "$(AD "$API/admin/reviews" | python -c "import json,sys;print('yes' if json.load(sys.stdin)['totalElements'] >= 2 else 'no')")"
check "a customer cannot"      403 "$(Ac $API/admin/reviews)"

AD -X PATCH "$API/admin/reviews/$RVID2/status" -H 'Content-Type: application/json' \
  -d '{"status":"HIDDEN","reason":"Off topic"}' >/dev/null
check "hidden in MySQL"          "HIDDEN"    "$(Q "SELECT status FROM review WHERE id=$RVID2;")"
check "reason recorded"          "Off topic" "$(Q "SELECT hidden_reason FROM review WHERE id=$RVID2;")"
check "gone from the shop"       "1" "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;print(len(json.load(sys.stdin)['reviews']))")"
check "and out of the average"   "5.0" "$(curl -s -m 20 $API/plants/$SLUG/reviews | jq_ summary.average)"
check "…including the plant row" "5.0" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"
check "count drops to 1"         "1"   "$(Q "SELECT review_count FROM plant WHERE slug='$SLUG';")"
check "the words are kept"       "1"   "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID2 AND body IS NOT NULL;")"

AD -X PATCH "$API/admin/reviews/$RVID2/status" -H 'Content-Type: application/json' \
  -d '{"status":"APPROVED"}' >/dev/null
check "unhiding restores it"    "2"   "$(curl -s -m 20 $API/plants/$SLUG/reviews | python -c "import json,sys;print(len(json.load(sys.stdin)['reviews']))")"
check "…and the average"        "3.5" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"
check "reason cleared"          "1"   "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID2 AND hidden_reason IS NULL;")"
check "a bad status is refused" 400 \
  "$(code -X PATCH "$API/admin/reviews/$RVID2/status" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"status":"NONSENSE"}')"

AD -X DELETE "$API/admin/reviews/$RVID2" >/dev/null
check "admin delete removes it" "0"   "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID2;")"
check "average recomputed"      "5.0" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"

AD -X PATCH "$API/admin/reviews/$RVID/status" -H 'Content-Type: application/json'   -d '{"status":"HIDDEN","reason":"Last one"}' >/dev/null
check "hiding the last review clears the rating" "NULL" "$(Q "SELECT IFNULL(rating,'NULL') FROM plant WHERE slug='$SLUG';")"
check "…and the count"                          "0"    "$(Q "SELECT review_count FROM plant WHERE slug='$SLUG';")"
AD -X PATCH "$API/admin/reviews/$RVID/status" -H 'Content-Type: application/json'   -d '{"status":"APPROVED"}' >/dev/null
check "unhiding brings it back"                 "5.0"  "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"

echo "== DELETING MY OWN =="
check "delete accepted"   200 "$(Ac -X DELETE $API/reviews/$RVID)"
check "row gone"          "0" "$(Q "SELECT COUNT(*) FROM review WHERE id=$RVID;")"
check "summary is empty"  "0" "$(curl -s -m 20 $API/plants/$SLUG/reviews | jq_ summary.total)"
check "eligible again"    "True" "$(A $API/reviews/$SLUG/eligibility | jq_ canReview)"
check "rating is cleared with the last review" "NULL" "$(Q "SELECT IFNULL(rating,'NULL') FROM plant WHERE slug='$SLUG';")"
check "count is cleared too" "0" "$(Q "SELECT review_count FROM plant WHERE slug='$SLUG';")"

echo "== A TITLE IS OPTIONAL =="
UNTITLED=$(post POST $API/reviews/$SLUG '{"rating":5,"body":"No title on this one at all, which the form allows."}')
LIVE_ID=$(echo "$UNTITLED" | jq_ id)
checkr "accepted without a title" "5" "$(echo "$UNTITLED" | jq_ rating)"
check "…and stored with none"    "1" "$(Q "SELECT COUNT(*) FROM review WHERE id=$(echo "$UNTITLED" | jq_ id) AND title IS NULL;")"

echo "== MY REVIEWS =="
check "listed under mine"  "1" "$(A $API/reviews/mine | python -c "import json,sys;print(len(json.load(sys.stdin)))")"
check "someone else's list is empty" "0" \
  "$(curl -s -m 20 -H "Authorization: Bearer $TOK2" $API/reviews/mine | python -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo "== HALF STARS =="
HALF='{"rating":3.5,"title":"Good with a caveat","body":"Healthy plant, well packed, but one leaf arrived with a tear in it."}'
check "a half star is accepted" 200 "$(postc PUT $API/reviews/$LIVE_ID "$HALF")"
checkr "…and stored as 3.5"     "3.5" "$(A $API/plants/$SLUG/reviews | jq_ reviews.0.rating)"
checkr "the average follows"    "3.5" "$(A $API/plants/$SLUG/reviews | jq_ summary.average)"
checkr "…and so does the card"  "3.5" "$(Q "SELECT rating FROM plant WHERE slug='$SLUG';")"
check "3.5 sits in the 4-star bar" "1"   "$(A $API/plants/$SLUG/reviews | python -c "import json,sys;print(json.load(sys.stdin)['summary']['breakdown']['4'])")"
check "and not in the 3-star bar"  "0"   "$(A $API/plants/$SLUG/reviews | python -c "import json,sys;print(json.load(sys.stdin)['summary']['breakdown']['3'])")"
check "a third of a star is refused" 400   "$(postc PUT $API/reviews/$LIVE_ID '{"rating":3.7,"body":"A rating that is not a half step at all here."}')"
check "…with a message saying why" "Ratings go in half stars — 3.5, not 3.7."   "$(post PUT $API/reviews/$LIVE_ID '{"rating":3.7,"body":"A rating that is not a half step at all here."}' | jq_ message)"
check "zero is refused" 400 "$(postc PUT $API/reviews/$LIVE_ID '{"rating":0,"body":"No stars at all is not a rating we take."}')"
check "5.5 is refused"  400 "$(postc PUT $API/reviews/$LIVE_ID '{"rating":5.5,"body":"More than five stars is not a rating either."}')"

echo "== CLEANUP =="
rm -f "$BODY"

purge_test_accounts "rev%@example.com"
restore_plant snake-plant
assert_clean "rev%@example.com"
rm -f "$BODY"

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]
