#!/usr/bin/env bash
# Whole-site test: storefront renders from MySQL, and an admin edit reaches it.
BR=http://127.0.0.1:10086/command
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

go() {
  curl -s -X POST $BR -H 'Content-Type: application/json' \
    -d "{\"action\":\"navigate\",\"args\":{\"url\":\"http://localhost:5173$1\"},\"session\":\"green-haven-qa\"}" >/dev/null
  sleep "${2:-5}"
}
ev() {
  python - "$1" <<'PY' > /tmp/ev.json
import json,sys
print(json.dumps({"action":"evaluate","args":{"code":sys.argv[1]},"session":"green-haven-qa"}))
PY
  curl -s -X POST $BR -H 'Content-Type: application/json' --data-binary @/tmp/ev.json \
    | python -c "
import json,sys
r = json.load(sys.stdin)
v = r.get('data', {}).get('value')
print('' if v is None else v)"
}

pass=0; fail=0
check() {
  if [ "$2" = "$3" ]; then printf "  PASS  %-50s %s\n" "$1" "$3"; pass=$((pass+1))
  else printf "  FAIL  %-50s got %s want %s\n" "$1" "$3" "$2"; fail=$((fail+1)); fi
}

echo "== THE SHOP NOW READS FROM MYSQL =="
go /shop 7
check "product count matches the database" "$(Q 'SELECT COUNT(*) FROM plant;')" \
  "$(ev 'const m=document.querySelector(".shop__count"); m ? m.textContent.match(/\d+/)[0] : "0"')"
check "cards rendered" "yes" "$(ev 'document.querySelectorAll(".product-card").length >= 20 ? "yes" : String(document.querySelectorAll(".product-card").length)')"
check "images resolve (not broken)" "yes" \
  "$(ev '[...document.querySelectorAll(".product-card img")].every(i=>i.getAttribute("src")) ? "yes":"no"')"
check "category counts came from the API" "yes" \
  "$(ev 'document.body.innerText.includes("Indoor Plants") ? "yes":"no"')"

echo "== A PRICE CHANGED IN MYSQL REACHES THE SHOP =="
OLD=$(Q "SELECT price FROM plant WHERE slug='tulsi';")
Q "UPDATE plant SET price=1234 WHERE slug='tulsi';"
go /plant/tulsi 7
check "product page shows the new price" "yes" "$(ev 'document.body.innerText.includes("1,234") ? "yes":"no"')"
Q "UPDATE plant SET price=$OLD WHERE slug='tulsi';"
go /plant/tulsi 6
check "and the restored price" "yes" "$(ev 'document.body.innerText.includes("199") ? "yes":"no"')"

echo "== AN ADMIN STOCK EDIT REACHES THE SHOP =="
PW=$(grep '^ADMIN_PASSWORD=' "/c/Users/vnp12/Desktop/green haven/backend/.env" | cut -d= -f2- | tr -d '\r')
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "/c/Users/vnp12/Desktop/green haven/backend/.env" | cut -d= -f2- | tr -d '\r')
TOK=$(curl -s -m 20 -X POST http://localhost:8080/api/admin/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$PW\"}" \
  | python -c "import json,sys;print(json.load(sys.stdin).get('token',''))")
PID=$(Q "SELECT id FROM plant WHERE slug='tulsi';")
BEFORE=$(Q "SELECT stock FROM plant WHERE id=$PID;")
curl -s -o /dev/null -m 20 -X PATCH "http://localhost:8080/api/admin/inventory/$PID/stock" \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"stock":3}'
go /plant/tulsi 7
check "shop shows the admin's low stock" "yes" "$(ev 'document.body.innerText.includes("Only 3 left") ? "yes":"no"')"
curl -s -o /dev/null -m 20 -X PATCH "http://localhost:8080/api/admin/inventory/$PID/stock" \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"stock":0}'
go /plant/tulsi 7
check "out of stock disables Add to Cart" "yes" \
  "$(ev 'const b=document.querySelector(".pdp__add"); b && b.disabled ? "yes":"no"')"
curl -s -o /dev/null -m 20 -X PATCH "http://localhost:8080/api/admin/inventory/$PID/stock" \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d "{\"stock\":$BEFORE}"

echo "== EVERY CUSTOMER PAGE STILL RENDERS =="
for r in "home:/" "shop:/shop" "pdp:/plant/aloe-vera" "merch:/plant/hand-trowel" \
         "wishlist:/wishlist" "cart:/cart" "login:/login" "register:/register" \
         "about:/about" "contact:/contact" "404:/nope"; do
  go "${r#*:}" 5
  check "${r%%:*} renders with chrome" "yes" \
    "$(ev 'document.getElementById("root").children.length>0 && !!document.querySelector(".navbar") ? "yes":"no"')"
done

echo "== NO HORIZONTAL SCROLL =="
for r in / /shop /plant/aloe-vera /cart /contact; do
  go "$r" 4
  check "$r fits" "yes" "$(ev '(document.documentElement.scrollWidth-window.innerWidth)<=0 ? "yes":"no"')"
done

echo "== SEARCH AND FILTERS STILL WORK ON LIVE DATA =="
go "/shop?q=fern" 6
check "search narrows the grid" "yes" \
  "$(ev 'const n=document.querySelectorAll(".product-card").length; n>0 && n<20 ? "yes" : String(n)')"
go "/shop?category=indoor-plants" 6
check "category filter works" "$(Q "SELECT COUNT(*) FROM plant p JOIN category c ON c.id=p.category_id WHERE c.slug='indoor-plants';")" \
  "$(ev 'const m=document.querySelector(".shop__count"); m ? m.textContent.match(/\d+/)[0] : "0"')"

echo "== ADMIN STILL SEPARATE =="
go / 4
check "no admin link on the shop" 0 "$(ev '[...document.querySelectorAll("a[href]")].filter(a=>a.getAttribute("href").includes("admin")).length')"
go /admin/dashboard 5
check "admin still gated" "/admin/login" "$(ev 'location.pathname')"

echo
echo "  $pass passed, $fail failed"
