#!/usr/bin/env bash
# Green Haven — photographs attached to a review, end to end.
#
#   bash backend/tools/test-review-images.sh
#
# An upload endpoint reachable by customers is the largest new door this
# feature opens, so most of this suite is about what must NOT get through it:
# files that are not images, paths that were never uploaded, links pointing off
# this site, and callers who have never received an order.
#
# RESTART THE API FIRST — /api/orders is capped at 30 an hour and the upload
# endpoint at 20.
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
UPLOADS="$(cd "$(dirname "$0")/.." && pwd)/uploads"

Q() { "$MYSQL" --default-character-set=utf8mb4 -u priti green_haven -N -B -e "$1"; }

# Shared, foreign-key-ordered teardown. Each suite used to roll its own and
# every one was incomplete, so cleanup aborted on the first FK error.
. "$(cd "$(dirname "$0")" && pwd)/cleanup.sh"
pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-54s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-54s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
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
postc() { json "$3"; code -X "$1" "$2" -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json; charset=utf-8' --data-binary @"$BODY"; }

SLUG=peace-lily
STAMP=$(date +%s)
WORK=$(mktemp -d)
# Git Bash's /tmp is invisible to Windows python and curl, which is where the
# fixtures are written and read. Bash keeps $WORK; native programs get $WIN.
WIN=$(cygpath -m "$WORK")

# ---- fixtures -------------------------------------------------------------
# Real PNG bytes, written by Python rather than checked in: the point is that
# the server decodes them, so they have to actually be an image.
python - "$WIN" <<'PY'
import struct, sys, zlib, os
work = sys.argv[1]

def png(path, w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))
    open(path, 'wb').write(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(raw))
        + chunk(b'IEND', b''))

png(os.path.join(work, 'leaf1.png'), 40, 40, (76, 122, 71))
png(os.path.join(work, 'leaf2.png'), 40, 40, (140, 62, 78))
png(os.path.join(work, 'leaf3.png'), 40, 40, (108, 112, 60))
png(os.path.join(work, 'leaf4.png'), 40, 40, (60, 80, 100))
png(os.path.join(work, 'leaf5.png'), 40, 40, (200, 180, 90))

# A script wearing an image's content type — the case the decode check exists
# for. Named .png and declared image/png at upload time.
open(os.path.join(work, 'notreally.png'), 'wb').write(
    b'<?php system($_GET["c"]); ?>\n')
PY
echo "  fixtures in $WORK"

# Residue from an earlier run, cleared BEFORE this run creates anything —
# doing it afterwards deletes the accounts the suite is about to use.
purge_test_accounts "img%@example.com"
restore_plant peace-lily

reg() {
  curl -s -m 20 -X POST $API/auth/register -H 'Content-Type: application/json' \
    -d "{\"fullName\":\"$2\",\"email\":\"$1\",\"password\":\"Testing@123\"}" | jq_ token
}
EM="img$STAMP@example.com"
EM2="img2$STAMP@example.com"
TOK=$(reg "$EM" "Meera Shinde")
TOK2=$(reg "$EM2" "Sanjay Rao")

# Registration is capped at 5 an hour per IP. Without this guard a capped run
# hands out empty tokens, every authenticated call comes back 403, and the
# report reads like a wall of product bugs.
if [ -z "$TOK" ] || [ -z "$TOK2" ]; then
  echo "  Could not register a test account — the rate limit is probably spent."
  echo "  Restart the API (that clears the in-memory limiter) and run this again."
  exit 1
fi
A() { curl -s -m 30 -H "Authorization: Bearer $TOK" "$@"; }
up()  { curl -s -m 30 -X POST $API/reviews/image -H "Authorization: Bearer $1" -F "file=@$WIN/$2"; }
upc() { code -X POST $API/reviews/image -H "Authorization: Bearer $1" -F "file=@$WIN/$2"; }

# The suite asserts absolute counts, so the product must start clean.
EXISTING=$(Q "SELECT COUNT(*) FROM review r JOIN plant p ON p.id=r.plant_id WHERE p.slug='$SLUG';")
if [ "$EXISTING" != "0" ]; then
  echo "  $SLUG already has $EXISTING real review(s). Point SLUG at another product."
  exit 1
fi

echo
echo "== THE UPLOAD DOOR IS SHUT BY DEFAULT =="
check "anonymous cannot upload"        403 "$(code -X POST $API/reviews/image -F "file=@$WIN/leaf1.png")"
check "signed in but never delivered"  400 "$(upc "$TOK" "leaf1.png")"
check "…and told why" \
  "Photographs can be added once an order has been delivered." \
  "$(up "$TOK" "leaf1.png" | jq_ message)"

echo
echo "== BUY IT AND HAVE IT DELIVERED =="
CART="{\"addressLine\":\"9 Baner Road\",\"phone\":\"9876543210\",\"city\":\"Pune\",\"state\":\"Maharashtra\",\"pincode\":\"411045\",\"items\":[{\"slug\":\"$SLUG\",\"quantity\":1}]}"
RID=$(post POST $API/orders "$CART" | jq_ razorpayOrderId)
SIG=$(A -X POST "$API/orders/$RID/simulate?succeed=true")
ON=$(curl -s -m 30 -X POST $API/orders/verify -H "Authorization: Bearer $TOK" \
      -H 'Content-Type: application/json' -d "$SIG" | jq_ orderNumber)
Q "UPDATE orders SET delivery_status='DELIVERED' WHERE order_number='$ON';" >/dev/null
check "order delivered"  "DELIVERED" "$(Q "SELECT delivery_status FROM orders WHERE order_number='$ON';")"
check "now eligible"     "True"      "$(A $API/reviews/$SLUG/eligibility | jq_ canReview)"

echo
echo "== WHAT MAY BE UPLOADED =="
U1=$(up "$TOK" "leaf1.png" | jq_ url)
U2=$(up "$TOK" "leaf2.png" | jq_ url)
check "upload succeeds"          200 "$(upc "$TOK" "leaf3.png")"
case "$U1" in /uploads/reviews/*) R=yes;; *) R=no;; esac
check "stored under /uploads/reviews" "yes" "$R"
check "…not among the product shots" "no" \
  "$(case "$U1" in /uploads/products/*) echo yes;; *) echo no;; esac)"
check "the file is really there" "yes" \
  "$([ -f "$UPLOADS/reviews/$(basename "$U1")" ] && echo yes || echo no)"
check "each upload gets its own name" "different" \
  "$([ "$U1" != "$U2" ] && echo different || echo same)"
check "the client filename is discarded" "no" \
  "$(case "$U1" in *leaf1*) echo yes;; *) echo no;; esac)"

echo
echo "== WHAT MAY NOT =="
check "a script wearing image/png"  400 "$(upc "$TOK" "notreally.png")"
check "…and says so plainly"        "That file is not a readable image." \
  "$(up "$TOK" "notreally.png" | jq_ message)"
# 6 MB of a real PNG, over the 5 MB cap.
python -c "
import struct, sys, zlib
w = h = 1400
raw = b''.join(b'\x00' + bytes((i%255, 40, 90)) * w for i in range(h))
def chunk(tag, data):
    c = tag + data
    return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c))
open(r'$WIN/huge.png','wb').write(b'\x89PNG\r\n\x1a\n'
  + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
  + chunk(b'IDAT', zlib.compress(raw, 0))
  + chunk(b'IEND', b''))"
SIZE=$(stat -c%s "$WORK/huge.png")
check "the oversized fixture really is big" "yes" \
  "$([ "$SIZE" -gt 5242880 ] && echo yes || echo no)"
BIG=$(upc "$TOK" "huge.png")
check "over 5 MB is refused" "yes" \
  "$([ "$BIG" = "400" ] || [ "$BIG" = "413" ] && echo yes || echo no)"

echo
echo "== ATTACHING THEM TO A REVIEW =="
REVIEW="{\"rating\":5,\"title\":\"Arrived beautifully\",\"body\":\"Packed better than I expected and the leaves had no damage at all. Photographs attached.\",\"images\":[\"$U1\",\"$U2\"]}"
NEW=$(post POST $API/reviews/$SLUG "$REVIEW")
RID_REVIEW=$(echo "$NEW" | jq_ id)
# Ratings are DECIMAL(2,1), so a 5 arrives as 5.0 — the same rating.
check "review created"           "5.0" "$(echo "$NEW" | jq_ rating)"
check "…carries both photographs" "2" \
  "$(echo "$NEW" | python -c "import json,sys;print(len(json.load(sys.stdin)['images']))")"
check "…in the order given"      "$U1" "$(echo "$NEW" | jq_ images.0)"
check "rows written"             "2" "$(Q "SELECT COUNT(*) FROM review_image WHERE review_id=$RID_REVIEW;")"

PUB=$(curl -s -m 30 $API/plants/$SLUG/reviews)
check "a public reader sees them" "2" \
  "$(echo "$PUB" | python -c "import json,sys;print(len(json.load(sys.stdin)['reviews'][0]['images']))")"

echo
echo "== FORGED PATHS ARE REFUSED =="
GHOST='/uploads/reviews/0000000000000000000000000000dead.png'
check "a path never uploaded"  400 \
  "$(postc PUT $API/reviews/$RID_REVIEW "{\"rating\":5,\"body\":\"Still very happy with this plant indeed.\",\"images\":[\"$GHOST\"]}")"
check "an off-site link"       400 \
  "$(postc PUT $API/reviews/$RID_REVIEW '{"rating":5,"body":"Still very happy with this plant indeed.","images":["https://example.com/tracker.png"]}')"
check "a product photograph"   400 \
  "$(postc PUT $API/reviews/$RID_REVIEW '{"rating":5,"body":"Still very happy with this plant indeed.","images":["/uploads/products/anything.jpg"]}')"
check "climbing out of the folder" 400 \
  "$(postc PUT $API/reviews/$RID_REVIEW '{"rating":5,"body":"Still very happy with this plant indeed.","images":["/uploads/reviews/../../application.properties"]}')"
check "…and the review is untouched" "2" \
  "$(Q "SELECT COUNT(*) FROM review_image WHERE review_id=$RID_REVIEW;")"

echo
echo "== THE LIMIT =="
U3=$(up "$TOK" "leaf3.png" | jq_ url)
U4=$(up "$TOK" "leaf4.png" | jq_ url)
U5=$(up "$TOK" "leaf5.png" | jq_ url)
check "four is allowed" 200 \
  "$(postc PUT $API/reviews/$RID_REVIEW "{\"rating\":5,\"body\":\"Still very happy with this plant indeed.\",\"images\":[\"$U1\",\"$U2\",\"$U3\",\"$U4\"]}")"
check "five is not"     400 \
  "$(postc PUT $API/reviews/$RID_REVIEW "{\"rating\":5,\"body\":\"Still very happy with this plant indeed.\",\"images\":[\"$U1\",\"$U2\",\"$U3\",\"$U4\",\"$U5\"]}")"
check "…still four on the review" "4" "$(Q "SELECT COUNT(*) FROM review_image WHERE review_id=$RID_REVIEW;")"

echo
echo "== REMOVING ONE TAKES THE FILE WITH IT =="
GONE="$UPLOADS/reviews/$(basename "$U4")"
check "the file exists first" "yes" "$([ -f "$GONE" ] && echo yes || echo no)"
EDIT=$(post PUT $API/reviews/$RID_REVIEW "{\"rating\":4,\"body\":\"Still very happy with this plant indeed.\",\"images\":[\"$U1\",\"$U2\",\"$U3\"]}")
check "three remain"        "3" \
  "$(echo "$EDIT" | python -c "import json,sys;print(len(json.load(sys.stdin)['images']))")"
check "…in the database"    "3" "$(Q "SELECT COUNT(*) FROM review_image WHERE review_id=$RID_REVIEW;")"
check "the dropped file is deleted" "no" "$([ -f "$GONE" ] && echo yes || echo no)"
check "a kept file is not"  "yes" "$([ -f "$UPLOADS/reviews/$(basename "$U1")" ] && echo yes || echo no)"

echo
echo "== SOMEBODY ELSE'S REVIEW =="
check "cannot edit it"   404 \
  "$(json "{\"rating\":1,\"body\":\"Trying to change another customer's review here.\",\"images\":[]}"; \
     code -X PUT $API/reviews/$RID_REVIEW -H "Authorization: Bearer $TOK2" \
       -H 'Content-Type: application/json' --data-binary @"$BODY")"
check "cannot delete it" 404 \
  "$(code -X DELETE $API/reviews/$RID_REVIEW -H "Authorization: Bearer $TOK2")"

echo
echo "== THE ADMIN CAN SEE THEM =="
ATOK=$(curl -s -m 20 -X POST $API/admin/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq_ token)
ADMIN=$(curl -s -m 30 -H "Authorization: Bearer $ATOK" "$API/admin/reviews?size=100")
check "the row carries the photographs" "3" \
  "$(echo "$ADMIN" | python -c "
import json,sys
rows=[r for r in json.load(sys.stdin)['content'] if r['id']==$RID_REVIEW]
print(len(rows[0]['images']) if rows else 'no row')")"

echo
echo "== DELETING THE REVIEW CLEANS UP =="
F1="$UPLOADS/reviews/$(basename "$U1")"
F3="$UPLOADS/reviews/$(basename "$U3")"
curl -s -m 30 -X DELETE $API/reviews/$RID_REVIEW -H "Authorization: Bearer $TOK" >/dev/null
check "the review is gone"    "0" "$(Q "SELECT COUNT(*) FROM review WHERE id=$RID_REVIEW;")"
check "its image rows cascade" "0" "$(Q "SELECT COUNT(*) FROM review_image WHERE review_id=$RID_REVIEW;")"
check "and the files with them" "no" \
  "$([ -f "$F1" ] || [ -f "$F3" ] && echo yes || echo no)"
check "the rating is recomputed" "" "$(Q "SELECT IFNULL(rating,'') FROM plant WHERE slug='$SLUG';")"

echo
echo "== ADMIN DELETION CLEANS UP TOO =="
U6=$(up "$TOK" "leaf1.png" | jq_ url)
SECOND=$(post POST $API/reviews/$SLUG "{\"rating\":4,\"title\":\"Second time round\",\"body\":\"Writing a fresh review so the admin has something to remove here.\",\"images\":[\"$U6\"]}")
SID=$(echo "$SECOND" | jq_ id)
F6="$UPLOADS/reviews/$(basename "$U6")"
check "the file is on disk"  "yes" "$([ -f "$F6" ] && echo yes || echo no)"
curl -s -m 30 -X DELETE "$API/admin/reviews/$SID" -H "Authorization: Bearer $ATOK" >/dev/null
check "the admin removed it" "0"  "$(Q "SELECT COUNT(*) FROM review WHERE id=$SID;")"
check "the file went as well" "no" "$([ -f "$F6" ] && echo yes || echo no)"

# ---- tidy up --------------------------------------------------------------
rm -rf "$WORK" "$BODY"

# Teardown. Runs at the end as well as the start, so a finished run leaves
# the database exactly as it found it.
purge_test_accounts "img%@example.com"
restore_plant peace-lily
assert_clean "img%@example.com"
rm -f "$BODY"


echo
echo "  $pass passed, $fail failed"
[ "$fail" = "0" ]
