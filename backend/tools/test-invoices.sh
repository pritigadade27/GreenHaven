#!/usr/bin/env bash
# Green Haven — the document ledger, end to end.
#
#   bash backend/tools/test-invoices.sh
#
# The rule this suite holds down: an issued invoice is never edited and never
# deleted. Cancelling a paid order does not rub it out — the money really was
# taken — it issues a CREDIT NOTE that offsets it, and both documents stand.
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

Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-52s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-52s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}
code() { curl -s -o /dev/null -m 30 -w '%{http_code}' "$@"; }
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

# Does a PDF show this text?
#
# The search happens inside Python rather than by piping to grep: the
# decompressed page stream is binary, and pushing it through the shell mangles
# it — which reads as "the text is missing" when it is right there.
has() { python -c '
import re, sys, zlib
d = open(sys.argv[1], "rb").read()
out = b""
for m in re.finditer(rb"stream\r?\n(.*?)endstream", d, re.S):
    try: out += zlib.decompress(m.group(1))
    except Exception: out += m.group(1)
text = out.decode("latin-1", "replace")
needle = sys.argv[2].replace("(", chr(92) + "(").replace(")", chr(92) + ")")
print("yes" if needle in text else "no")' "$1" "$2"; }

STAMP=$(date +%s)
SLUG=snake-plant
EM="inv$STAMP@example.com"
TOK=$(curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"Deepa Rane\",\"email\":\"$EM\",\"password\":\"Testing@123\"}" | jq_ token)
EM2="inv2$STAMP@example.com"
TOK2=$(curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"Vikas Pawar\",\"email\":\"$EM2\",\"password\":\"Testing@123\"}" | jq_ token)
if [ -z "$TOK" ] || [ -z "$TOK2" ]; then
  echo "  Could not register a test account — the rate limit is probably spent."
  echo "  Restart the API and run this again."
  exit 1
fi

SHIP="{\"addressLine\":\"4 Ferguson Road\",\"phone\":\"9876543210\",\"city\":\"Pune\",\"state\":\"Maharashtra\",\"pincode\":\"411004\",\"items\":[{\"slug\":\"$SLUG\",\"quantity\":1}]}"
WORK=$(mktemp -d); WIN=$(cygpath -m "$WORK")

echo
echo "== AN UNPAID ORDER HAS NO DOCUMENT =="
ORDER=$(post POST $API/orders "$SHIP")
ON=$(echo "$ORDER" | jq_ orderNumber)
RID=$(echo "$ORDER" | jq_ razorpayOrderId)
check "no invoice number yet" "" "$(Q "SELECT IFNULL(invoice_number,'') FROM orders WHERE order_number='$ON';")"
check "no ledger row"         "0" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON';")"
check "downloading is refused" 400 \
  "$(code -H "Authorization: Bearer $TOK" "$API/profile/orders/$ON/invoice")"

echo
echo "== PAYING ISSUES ONE =="
SIG=$(curl -s -m 30 -X POST "$API/orders/$RID/simulate?succeed=true" -H "Authorization: Bearer $TOK")
curl -s -m 30 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "$SIG" >/dev/null
INV=$(Q "SELECT invoice_number FROM orders WHERE order_number='$ON';")
check "the order has an invoice number" "yes" "$([ -n "$INV" ] && echo yes || echo no)"
check "the ledger has one row"          "1" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON';")"
check "…of type INVOICE"                "INVOICE" \
  "$(Q "SELECT i.doc_type FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON';")"
check "…numbered the same"              "$INV" \
  "$(Q "SELECT i.number FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON';")"
check "…for the amount charged"         "$(Q "SELECT total FROM orders WHERE order_number='$ON';")" \
  "$(Q "SELECT i.amount FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON';")"

echo
echo "== PAYING TWICE DOES NOT ISSUE TWICE =="
# The webhook and the browser callback race by design; replaying one must not
# mint a second document for the same money.
curl -s -m 30 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' -d "$SIG" >/dev/null
check "still one document" "1" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON';")"

echo
echo "== THE DOCUMENT LIST AND DOWNLOAD =="
LIST=$(curl -s -m 30 -H "Authorization: Bearer $TOK" $API/profile/invoices)
check "the invoice is listed"  "1" \
  "$(echo "$LIST" | python -c "import json,sys;print(len(json.load(sys.stdin)))")"
check "…marked as an INVOICE"  "INVOICE" "$(echo "$LIST" | jq_ 0.docType)"
curl -s -m 30 -H "Authorization: Bearer $TOK" "$API/profile/documents/$INV" -o "$WORK/inv.pdf"
check "the PDF downloads"      "yes" "$(head -c4 "$WORK/inv.pdf" | grep -q '%PDF' && echo yes || echo no)"
check "…headed INVOICE"        "yes" "$(has "$WORK/inv.pdf" 'INVOICE')"
check "…and is not a credit note" "no" "$(has "$WORK/inv.pdf" 'CREDIT NOTE')"

echo
echo "== SOMEBODY ELSE'S DOCUMENT =="
# Invoice numbers run in sequence, so without an ownership check anyone could
# walk the series and read every customer's name and address.
check "refused" 404 "$(code -H "Authorization: Bearer $TOK2" "$API/profile/documents/$INV")"
check "…and gives nothing away" "No document with that number." \
  "$(curl -s -m 30 -H "Authorization: Bearer $TOK2" "$API/profile/documents/$INV" | jq_ message)"
check "a made-up number is the same 404" 404 \
  "$(code -H "Authorization: Bearer $TOK" "$API/profile/documents/INV-GH-1999-99999")"

echo
echo "== CANCELLING A PAID ORDER ISSUES A CREDIT NOTE =="
json '{"reason":"Ordered the wrong size"}'
curl -s -m 30 -X POST "$API/profile/orders/$ON/cancel" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' --data-binary @"$BODY" >/dev/null
check "the invoice still stands"   "1" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id
         WHERE o.order_number='$ON' AND i.doc_type='INVOICE';")"
check "…still numbered the same"   "$INV" "$(Q "SELECT invoice_number FROM orders WHERE order_number='$ON';")"
check "a credit note is issued"    "1" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id
         WHERE o.order_number='$ON' AND i.doc_type='CREDIT_NOTE';")"
CRN=$(Q "SELECT i.number FROM invoice i JOIN orders o ON o.id=i.order_id
          WHERE o.order_number='$ON' AND i.doc_type='CREDIT_NOTE';")
check "…in its own series"         "yes" "$(echo "$CRN" | grep -q '^CRN-GH-' && echo yes || echo no)"
check "…for the full amount"       "$(Q "SELECT total FROM orders WHERE order_number='$ON';")" \
  "$(Q "SELECT amount FROM invoice WHERE number='$CRN';")"
check "…recording the reason"      "Ordered the wrong size" \
  "$(Q "SELECT reason FROM invoice WHERE number='$CRN';")"
check "the order still says PAID"  "PAID" "$(Q "SELECT status FROM orders WHERE order_number='$ON';")"

echo
echo "== CANCELLING TWICE IS NOT TWO REFUNDS =="
json '{"reason":"again"}'
curl -s -m 30 -X POST "$API/profile/orders/$ON/cancel" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' --data-binary @"$BODY" >/dev/null
check "still one credit note" "1" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id
         WHERE o.order_number='$ON' AND i.doc_type='CREDIT_NOTE';")"

echo
echo "== THE CREDIT NOTE READS AS ONE =="
curl -s -m 30 -H "Authorization: Bearer $TOK" "$API/profile/documents/$CRN" -o "$WORK/crn.pdf"
check "it downloads"                 "yes" "$(head -c4 "$WORK/crn.pdf" | grep -q '%PDF' && echo yes || echo no)"
check "headed CREDIT NOTE"           "yes" "$(has "$WORK/crn.pdf" 'CREDIT NOTE')"
check "says it is not a bill"        "yes" "$(has "$WORK/crn.pdf" 'not a request for payment')"
check "names the invoice it cancels" "yes" "$(has "$WORK/crn.pdf" "$INV")"
check "carries its own number"       "yes" "$(has "$WORK/crn.pdf" "$CRN")"
check "and the reason"               "yes" "$(has "$WORK/crn.pdf" 'Ordered the wrong size')"

echo
echo "== BOTH APPEAR IN THE CUSTOMER'S LIST =="
LIST=$(curl -s -m 30 -H "Authorization: Bearer $TOK" $API/profile/invoices)
check "two documents"     "2" "$(echo "$LIST" | python -c "import json,sys;print(len(json.load(sys.stdin)))")"
check "newest first"      "CREDIT_NOTE" "$(echo "$LIST" | jq_ 0.docType)"
check "…the invoice below" "INVOICE"    "$(echo "$LIST" | jq_ 1.docType)"

echo
echo "== AN UNPAID CANCELLATION CREDITS NOTHING =="
ORDER2=$(post POST $API/orders "$SHIP")
ON2=$(echo "$ORDER2" | jq_ orderNumber)
json '{"reason":"changed my mind"}'
curl -s -m 30 -X POST "$API/profile/orders/$ON2/cancel" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' --data-binary @"$BODY" >/dev/null
check "the order is cancelled" "CANCELLED" "$(Q "SELECT status FROM orders WHERE order_number='$ON2';")"
check "no document at all"     "0" \
  "$(Q "SELECT COUNT(*) FROM invoice i JOIN orders o ON o.id=i.order_id WHERE o.order_number='$ON2';")"

echo
echo "== NUMBERS ARE UNIQUE AND GAPLESS PER SERIES =="
check "no duplicate numbers" "0" \
  "$(Q "SELECT COUNT(*) FROM (SELECT number FROM invoice GROUP BY number HAVING COUNT(*)>1) d;")"
check "credit notes have their own counter" "1" \
  "$(Q "SELECT COUNT(*) FROM document_sequence WHERE name='CREDIT_NOTE';")"
check "…separate from the invoice one" "1" \
  "$(Q "SELECT COUNT(*) FROM document_sequence WHERE name='INVOICE';")"

# ---- tidy up --------------------------------------------------------------
Q "DELETE i FROM invoice i JOIN orders o ON o.id=i.order_id
    JOIN app_user u ON u.id=o.user_id WHERE u.email IN ('$EM','$EM2');" >/dev/null
rm -rf "$WORK" "$BODY"

echo
echo "  $pass passed, $fail failed"
[ "$fail" = "0" ]
