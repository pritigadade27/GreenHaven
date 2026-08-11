#!/usr/bin/env bash
# Green Haven — the My Profile module, end to end.
#
#   bash backend/tools/test-profile.sh
#
# Covers personal information, orders, order detail and its tracking timeline,
# cancellation rules, payment history, invoices and the PDF, saved addresses,
# password change, notifications — and the isolation between two accounts,
# which is the part that matters most: nothing here takes a user id, so the
# only thing standing between two customers is the token.
#
# RESTART THE API FIRST — /api/orders is capped at 30 an hour.
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
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-54s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-54s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 20 -w '%{http_code}' "$@"; }
jq_() { python -c "import json,sys
d=json.load(sys.stdin)
for k in '$1'.split('.'):
    if d is None: break
    d = d[int(k)] if k.isdigit() else d.get(k)
print('' if d is None else d)"; }

STAMP=$(date +%s)
EM="prof$STAMP@example.com"
EM2="prof2$STAMP@example.com"

reg() {
  curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"fullName\":\"$2\",\"email\":\"$1\",\"password\":\"Testing@123\"}" | jq_ token
}
TOK=$(reg "$EM" "Profile Tester")
TOK2=$(reg "$EM2" "Someone Else")
A()  { curl -s -m 20 -H "Authorization: Bearer $TOK"  "$@"; }
A2() { curl -s -m 20 -H "Authorization: Bearer $TOK2" "$@"; }
Ac() { curl -s -o /dev/null -m 20 -w '%{http_code}' -H "Authorization: Bearer $TOK" "$@"; }

echo "== PERSONAL INFORMATION =="
check "profile loads"          "Profile Tester" "$(A $API/profile | jq_ fullName)"
check "email is the caller's"  "$EM"            "$(A $API/profile | jq_ email)"
check "date joined is set"     "yes"            "$([ -n "$(A $API/profile | jq_ joinedAt)" ] && echo yes || echo no)"
check "starts with no orders"  "0"              "$(A $API/profile | jq_ totalOrders)"
check "starts with nothing spent" "0.0"         "$(A $API/profile | jq_ totalSpent)"
check "anonymous is refused"   403              "$(code $API/profile)"

A -X PATCH $API/profile -H 'Content-Type: application/json' \
  -d '{"fullName":"Profile Tester Two","phone":"9876543210","avatarUrl":""}' >/dev/null
check "name saved"             "Profile Tester Two" "$(A $API/profile | jq_ fullName)"
check "phone saved"            "9876543210"         "$(A $API/profile | jq_ phone)"
check "…and it reached MySQL"  "9876543210"         "$(Q "SELECT phone FROM app_user WHERE email='$EM';")"
check "a bad phone is refused" 400 "$(Ac -X PATCH $API/profile -H 'Content-Type: application/json' -d '{"fullName":"X Y","phone":"123","avatarUrl":""}')"
check "an empty name is refused" 400 "$(Ac -X PATCH $API/profile -H 'Content-Type: application/json' -d '{"fullName":"","phone":"","avatarUrl":""}')"

echo "== SAVED ADDRESSES =="
ADDR='{"label":"Home","fullName":"Profile Tester","phone":"9876543210","line1":"12 Baner Road, Flat 4","line2":"Near the park","city":"Pune","state":"Maharashtra","pincode":"411045","country":"India","makeDefault":false}'
A1=$(A -X POST $API/addresses -H 'Content-Type: application/json' -d "$ADDR")
AID=$(echo "$A1" | jq_ id)
check "first address created"     "1"    "$(echo "$A1" | jq_ id | sed 's/[0-9]*/1/')"
check "…and is default by itself" "True" "$(echo "$A1" | jq_ isDefault)"

A2ID=$(A -X POST $API/addresses -H 'Content-Type: application/json' \
  -d '{"label":"Work","fullName":"Profile Tester","phone":"9876543211","line1":"5 Hinjewadi Phase 2","city":"Pune","state":"Maharashtra","pincode":"411057","country":"India","makeDefault":true}' | jq_ id)
check "second address takes default" "True"  "$(A $API/addresses | jq_ 0.isDefault)"
check "…and the first loses it"      "1"     "$(Q "SELECT COUNT(*) FROM address a JOIN app_user u ON u.id=a.user_id WHERE u.email='$EM' AND a.is_default=1;")"
check "both are listed"              "2"     "$(A $API/addresses | python -c "import json,sys;print(len(json.load(sys.stdin)))")"

A -X PUT "$API/addresses/$AID" -H 'Content-Type: application/json' \
  -d '{"label":"Home","fullName":"Profile Tester","phone":"9876543210","line1":"12 Baner Road, Flat 9","city":"Pune","state":"Maharashtra","pincode":"411045","country":"India","makeDefault":false}' >/dev/null
check "edit saved"          "12 Baner Road, Flat 9" "$(Q "SELECT line1 FROM address WHERE id=$AID;")"
check "bad pincode refused" 400 "$(Ac -X POST $API/addresses -H 'Content-Type: application/json' -d '{"label":"Home","fullName":"X Y","phone":"9876543210","line1":"12 Somewhere Road","city":"Pune","state":"MH","pincode":"41","country":"India","makeDefault":false}')"
check "another account cannot edit mine" 404 \
  "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -X PUT "$API/addresses/$AID" -H "Authorization: Bearer $TOK2" -H 'Content-Type: application/json' -d "$ADDR")"
check "another account sees none of mine" "0" \
  "$(A2 $API/addresses | python -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo "== ORDERS =="
CART='{"addressLine":"12 Baner Road, Flat 9","phone":"9876543210","city":"Pune","state":"Maharashtra","pincode":"411045","items":[{"slug":"aloe-vera","quantity":2},{"slug":"tulsi","quantity":1}]}'
RID=$(A -X POST $API/orders -H 'Content-Type: application/json' -d "$CART" | jq_ razorpayOrderId)
ON=$(A $API/profile/orders | jq_ 0.orderNumber)
check "the new order is listed"  "yes" "$([ -n "$ON" ] && echo yes || echo no)"
check "…as awaiting payment"     "PENDING" "$(A $API/profile/orders | jq_ 0.status)"
check "…with an expected date"   "yes" "$([ -n "$(A $API/profile/orders | jq_ 0.estimatedDelivery)" ] && echo yes || echo no)"
check "…and 3 items"             "3"   "$(A $API/profile/orders | jq_ 0.totalItems)"
check "product thumbnails carried" "yes" \
  "$([ -n "$(A "$API/profile/orders" | jq_ 0.preview.0.image)" ] && echo yes || echo no)"
check "an unpaid order has no invoice" "" "$(A "$API/profile/orders/$ON" | jq_ invoiceNumber)"
check "…so the PDF is refused"   400 "$(Ac "$API/profile/orders/$ON/invoice")"
check "ORDER_PLACED was recorded" "1" \
  "$(Q "SELECT COUNT(*) FROM notification n JOIN app_user u ON u.id=n.user_id WHERE u.email='$EM' AND n.type='ORDER_PLACED';")"

SIG=$(A -X POST "$API/orders/$RID/simulate?succeed=true")
A -X POST $API/orders/verify -H 'Content-Type: application/json' -d "$SIG" >/dev/null
check "order is now PAID"        "PAID" "$(A "$API/profile/orders/$ON" | jq_ status)"
check "invoice allocated"        "yes"  "$(case "$(A "$API/profile/orders/$ON" | jq_ invoiceNumber)" in INV-GH-*) echo yes;; *) echo no;; esac)"
check "payment method recorded"  "SIMULATED" "$(A "$API/profile/orders/$ON" | jq_ payment.method)"
check "PAYMENT_SUCCESSFUL recorded" "1" \
  "$(Q "SELECT COUNT(*) FROM notification n JOIN app_user u ON u.id=n.user_id WHERE u.email='$EM' AND n.type='PAYMENT_SUCCESSFUL';")"
check "lifetime spend updated"   "1097.0" "$(A $API/profile | jq_ totalSpent)"
check "order count updated"      "1"      "$(A $API/profile | jq_ totalOrders)"

echo "== ORDER DETAIL =="
D=$(A "$API/profile/orders/$ON")
check "customer name on it"   "Profile Tester Two" "$(echo "$D" | jq_ customerName)"
check "ships to the address"  "12 Baner Road, Flat 9" "$(echo "$D" | jq_ shipTo.line)"
check "two product lines"     "2"  "$(echo "$D" | python -c "import json,sys;print(len(json.load(sys.stdin)['items']))")"
check "line total computed"   "898.0" "$(echo "$D" | jq_ items.0.lineTotal)"
check "razorpay ids shown"    "yes" "$(case "$(echo "$D" | jq_ payment.razorpayPaymentId)" in pay_*) echo yes;; *) echo no;; esac)"
check "timeline has 7 stops"  "7"  "$(echo "$D" | python -c "import json,sys;print(len(json.load(sys.stdin)['timeline']))")"
check "payment step is done"  "DONE" "$(echo "$D" | jq_ timeline.1.state)"
check "exactly one step is current" "1" \
  "$(echo "$D" | python -c "import json,sys;print(sum(1 for s in json.load(sys.stdin)['timeline'] if s['state']=='CURRENT'))")"
check "another account cannot read it" 404 \
  "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -H "Authorization: Bearer $TOK2" "$API/profile/orders/$ON")"

echo "== INVOICE PDF =="
PDF=$(mktemp); curl -s -m 20 -H "Authorization: Bearer $TOK" -D "$PDF.h" -o "$PDF" "$API/profile/orders/$ON/invoice"
check "content type"       "application/pdf" "$(grep -i '^content-type' "$PDF.h" | tr -d '\r' | awk '{print $2}')"
check "sent as a download" "yes" "$(grep -qi 'attachment; filename=\"INV-GH' "$PDF.h" && echo yes || echo no)"
check "is a real PDF"      "%PDF" "$(head -c 4 "$PDF")"
check "has some size"      "yes"  "$([ "$(wc -c < "$PDF")" -gt 1200 ] && echo yes || echo no)"
check "another account cannot download it" 404 \
  "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -H "Authorization: Bearer $TOK2" "$API/profile/orders/$ON/invoice")"
rm -f "$PDF" "$PDF.h"
check "invoice listed"     "1" "$(A $API/profile/invoices | python -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo "== PAYMENT HISTORY =="
check "one payment listed"  "1" "$(A $API/profile/payments | python -c "import json,sys;print(len(json.load(sys.stdin)))")"
check "it is captured"      "CAPTURED" "$(A $API/profile/payments | jq_ 0.status)"
check "and verified"        "VERIFIED" "$(A $API/profile/payments | jq_ 0.verificationStatus)"
check "another account sees none" "0" \
  "$(A2 $API/profile/payments | python -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo "== REORDER =="
check "reorder returns the lines" "2" \
  "$(A "$API/profile/orders/$ON/reorder" | python -c "import json,sys;print(len(json.load(sys.stdin)))")"
check "…with quantities"          "2" "$(A "$API/profile/orders/$ON/reorder" | jq_ 0.quantity)"

echo "== CANCELLING =="
check "a paid, unshipped order can be cancelled" "True" "$(A "$API/profile/orders/$ON" | jq_ cancellable)"
A -X POST "$API/profile/orders/$ON/cancel" -H 'Content-Type: application/json' -d '{"reason":"Changed my mind"}' >/dev/null
check "delivery marked cancelled" "CANCELLED" "$(Q "SELECT delivery_status FROM orders WHERE order_number='$ON';")"
check "cancelled_by recorded"     "CUSTOMER"  "$(Q "SELECT cancelled_by FROM orders WHERE order_number='$ON';")"
check "reason recorded"           "Changed my mind" "$(Q "SELECT cancel_reason FROM orders WHERE order_number='$ON';")"
check "payment status untouched"  "PAID"      "$(Q "SELECT status FROM orders WHERE order_number='$ON';")"
check "invoice NOT withdrawn"     "1"         "$(Q "SELECT COUNT(*) FROM orders WHERE order_number='$ON' AND invoice_number IS NOT NULL;")"
check "payment row NOT deleted"   "1"         "$(Q "SELECT COUNT(*) FROM payment p JOIN orders o ON o.id=p.order_id WHERE o.order_number='$ON' AND p.status='CAPTURED';")"
check "timeline now shows cancelled" "CANCELLED" "$(A "$API/profile/orders/$ON" | jq_ timeline.1.state)"
check "cancelling twice is refused" 400 "$(Ac -X POST "$API/profile/orders/$ON/cancel" -H 'Content-Type: application/json' -d '{"reason":"again"}')"
check "ORDER_CANCELLED recorded"  "1" \
  "$(Q "SELECT COUNT(*) FROM notification n JOIN app_user u ON u.id=n.user_id WHERE u.email='$EM' AND n.type='ORDER_CANCELLED';")"

echo "== A SHIPPED ORDER CANNOT BE CANCELLED =="
RID2=$(A -X POST $API/orders -H 'Content-Type: application/json' -d "$CART" | jq_ razorpayOrderId)
SIG2=$(A -X POST "$API/orders/$RID2/simulate?succeed=true")
A -X POST $API/orders/verify -H 'Content-Type: application/json' -d "$SIG2" >/dev/null
ON2=$(A $API/profile/orders | jq_ 0.orderNumber)
Q "UPDATE orders SET delivery_status='SHIPPED' WHERE order_number='$ON2';" >/dev/null
check "no longer cancellable" "False" "$(A "$API/profile/orders/$ON2" | jq_ cancellable)"
check "and the API refuses"   400     "$(Ac -X POST "$API/profile/orders/$ON2/cancel" -H 'Content-Type: application/json' -d '{"reason":"too late"}')"
check "tracking has moved on" "CURRENT" "$(A "$API/profile/orders/$ON2" | jq_ timeline.4.state)"

echo "== NOTIFICATIONS =="
check "several were recorded" "yes" \
  "$([ "$(A $API/profile/notifications | python -c "import json,sys;print(len(json.load(sys.stdin)))")" -ge 4 ] && echo yes || echo no)"
check "unread counted on the profile" "yes" \
  "$([ "$(A $API/profile | jq_ unreadNotifications)" -gt 0 ] && echo yes || echo no)"
A -X POST $API/profile/notifications/read >/dev/null
check "marking read clears the count" "0" "$(A $API/profile | jq_ unreadNotifications)"
check "another account sees none"     "0" \
  "$(A2 $API/profile/notifications | python -c "import json,sys;print(len(json.load(sys.stdin)))")"

echo "== CHANGE PASSWORD =="
check "wrong current password refused" 400 \
  "$(Ac -X POST $API/profile/password -H 'Content-Type: application/json' -d '{"currentPassword":"NotIt@123","newPassword":"Brand@New456","confirmPassword":"Brand@New456"}')"
check "mismatched confirmation refused" 400 \
  "$(Ac -X POST $API/profile/password -H 'Content-Type: application/json' -d '{"currentPassword":"Testing@123","newPassword":"Brand@New456","confirmPassword":"Different@789"}')"
check "too short refused" 400 \
  "$(Ac -X POST $API/profile/password -H 'Content-Type: application/json' -d '{"currentPassword":"Testing@123","newPassword":"short","confirmPassword":"short"}')"
check "reusing the old one refused" 400 \
  "$(Ac -X POST $API/profile/password -H 'Content-Type: application/json' -d '{"currentPassword":"Testing@123","newPassword":"Testing@123","confirmPassword":"Testing@123"}')"
OLD_HASH=$(Q "SELECT password_hash FROM app_user WHERE email='$EM';")
check "a good change is accepted" 200 \
  "$(Ac -X POST $API/profile/password -H 'Content-Type: application/json' -d '{"currentPassword":"Testing@123","newPassword":"Brand@New456","confirmPassword":"Brand@New456"}')"
check "the stored hash changed" "yes" \
  "$([ "$OLD_HASH" != "$(Q "SELECT password_hash FROM app_user WHERE email='$EM';")" ] && echo yes || echo no)"
check "it is still a BCrypt hash" "yes" \
  "$(case "$(Q "SELECT password_hash FROM app_user WHERE email='$EM';")" in '$2a$'*|'$2b$'*|'$2y$'*) echo yes;; *) echo no;; esac)"
check "the new password signs in" 200 \
  "$(code -X POST $API/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EM\",\"password\":\"Brand@New456\"}")"
check "the old one no longer does" 400 \
  "$(code -X POST $API/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EM\",\"password\":\"Testing@123\"}")"

echo "== CHANGE EMAIL =="
NEW_EM="moved$STAMP@example.com"
check "wrong password refused" 400 \
  "$(Ac -X POST $API/profile/email -H 'Content-Type: application/json' -d "{\"email\":\"$NEW_EM\",\"password\":\"nope\"}")"
TOKEN=$(A -X POST $API/profile/email -H 'Content-Type: application/json' \
  -d "{\"email\":\"$NEW_EM\",\"password\":\"Brand@New456\"}" | jq_ token)
check "change is only pending" "$EM"     "$(Q "SELECT email FROM app_user WHERE id=(SELECT id FROM app_user WHERE email='$EM');")"
check "…and parked separately" "$NEW_EM" "$(Q "SELECT pending_email FROM app_user WHERE email='$EM';")"
check "a bad token is refused" 400 "$(Ac -X POST "$API/profile/email/confirm?token=rubbish")"
# Confirming reissues the token, because a JWT names its subject by email.
NEWSESSION=$(A -X POST "$API/profile/email/confirm?token=$TOKEN")
check "confirming returns a new token" "yes" "$([ -n "$(echo "$NEWSESSION" | jq_ token)" ] && echo yes || echo no)"
check "…naming the new address"     "$NEW_EM" "$(echo "$NEWSESSION" | jq_ user.email)"
TOK=$(echo "$NEWSESSION" | jq_ token)
check "the new token works at once" 200 "$(Ac $API/profile)"
check "the address has moved"  "1" "$(Q "SELECT COUNT(*) FROM app_user WHERE email='$NEW_EM';")"
check "pending cleared"        "0" "$(Q "SELECT COUNT(*) FROM app_user WHERE email='$NEW_EM' AND pending_email IS NOT NULL;")"
check "an in-use address is refused" 400 \
  "$(curl -s -o /dev/null -m 20 -w '%{http_code}' -H "Authorization: Bearer $TOK2" -X POST $API/profile/email \
     -H 'Content-Type: application/json' -d "{\"email\":\"$NEW_EM\",\"password\":\"Testing@123\"}")"

echo "== HISTORY SURVIVES A DELETED ADDRESS =="
BEFORE=$(Q "SELECT address_line FROM orders WHERE order_number='$ON';")
A -X DELETE "$API/addresses/$AID" >/dev/null
check "address gone"              "0" "$(Q "SELECT COUNT(*) FROM address WHERE id=$AID;")"
check "the order still knows where it went" "$BEFORE" "$(Q "SELECT address_line FROM orders WHERE order_number='$ON';")"
check "a default was promoted"    "1" "$(Q "SELECT COUNT(*) FROM address a JOIN app_user u ON u.id=a.user_id WHERE u.email='$NEW_EM' AND a.is_default=1;")"

echo "== CLEANUP =="
Q "DELETE n FROM notification n JOIN app_user u ON u.id=n.user_id WHERE u.email LIKE 'prof%@example.com' OR u.email LIKE 'moved%@example.com';
   DELETE p FROM payment p JOIN orders o ON o.id=p.order_id JOIN app_user u ON u.id=o.user_id WHERE u.email LIKE 'prof%@example.com' OR u.email LIKE 'moved%@example.com';
   DELETE i FROM order_item i JOIN orders o ON o.id=i.order_id JOIN app_user u ON u.id=o.user_id WHERE u.email LIKE 'prof%@example.com' OR u.email LIKE 'moved%@example.com';
   DELETE o FROM orders o JOIN app_user u ON u.id=o.user_id WHERE u.email LIKE 'prof%@example.com' OR u.email LIKE 'moved%@example.com';
   DELETE a FROM address a JOIN app_user u ON u.id=a.user_id WHERE u.email LIKE 'prof%@example.com' OR u.email LIKE 'moved%@example.com';
   DELETE FROM app_user WHERE email LIKE 'prof%@example.com' OR email LIKE 'moved%@example.com';
   UPDATE plant SET stock=40 WHERE slug='aloe-vera';
   UPDATE plant SET stock=100 WHERE slug='tulsi';" >/dev/null
echo "  test accounts removed, stock restored"

echo
echo "  $pass passed, $fail failed"
[ "$fail" -eq 0 ]
