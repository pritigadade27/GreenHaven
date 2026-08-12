#!/usr/bin/env bash
BR=http://127.0.0.1:10086/command
S=green-haven-qa
PW=$(grep '^ADMIN_PASSWORD=' "/c/Users/vnp12/Desktop/green haven/backend/.env" | cut -d= -f2- | tr -d '\r')
ADMIN_EMAIL=$(grep '^ADMIN_EMAIL=' "/c/Users/vnp12/Desktop/green haven/backend/.env" | cut -d= -f2- | tr -d '\r')

go() {
  curl -s -X POST $BR -H 'Content-Type: application/json' \
    -d "{\"action\":\"navigate\",\"args\":{\"url\":\"http://localhost:5173$1\"},\"session\":\"$S\"}" >/dev/null
  sleep "${2:-4}"
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

echo "== NO TRACE OF THE ADMIN ON THE PUBLIC SITE =="
go / 5
check "home has no /admin link" 0 "$(ev '[...document.querySelectorAll("a[href]")].filter(a=>a.getAttribute("href").includes("admin")).length')"
check "home body never says admin" "no" "$(ev 'document.body.innerText.toLowerCase().includes("admin") ? "yes" : "no"')"
go /contact 4
check "contact has no /admin link" 0 "$(ev '[...document.querySelectorAll("a[href]")].filter(a=>a.getAttribute("href").includes("admin")).length')"

echo "== SIGNED OUT: EVERY ADMIN ROUTE BOUNCES TO LOGIN =="
ev 'localStorage.removeItem("greenhaven.admin.token"); "cleared"' >/dev/null
for route in dashboard orders payments inventory users reviews activity; do
  go "/admin/$route" 4
  check "/admin/$route -> login" "/admin/login" "$(ev 'location.pathname')"
done

echo "== THE LOGIN SCREEN =="
go /admin/login 4
check "renders a staff sign-in" "yes" "$(ev 'document.body.innerText.includes("Staff sign-in") ? "yes":"no"')"
check "no customer navbar" 0 "$(ev 'document.querySelectorAll(".navbar").length')"
check "no customer footer" 0 "$(ev 'document.querySelectorAll(".footer, footer.footer").length')"
check "no link back into the shop chrome" 0 "$(ev '[...document.querySelectorAll("a[href]")].filter(a=>["/","/shop","/cart"].includes(a.getAttribute("href"))).length')"

echo "== SIGNING IN =="
ev "(async()=>{
  const r = await fetch('/api/admin/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email:'$ADMIN_EMAIL',password:'$PW'})});
  const d = await r.json();
  if (d.token) localStorage.setItem('greenhaven.admin.token', d.token);
  return d.token ? 'ok' : JSON.stringify(d);
})()" > /tmp/login.txt
check "token obtained" "ok" "$(cat /tmp/login.txt)"

go /admin/dashboard 6
check "dashboard reachable" "/admin/dashboard" "$(ev 'location.pathname')"
check "stat cards rendered" "yes" "$(ev 'document.querySelectorAll(".admin-card").length >= 12 ? "yes" : String(document.querySelectorAll(".admin-card").length)')"
check "products card shows 154" "yes" "$(ev 'document.body.innerText.includes("154") ? "yes":"no"')"
check "sidebar has every section" "Dashboard,Orders,Payments,Products,Inventory,Customers,Reviews,Discount codes,Activity log" "$(ev '[...document.querySelectorAll(".admin__nav a")].map(a=>a.innerText.trim()).join(",")')"

echo "== ALREADY SIGNED IN: /admin/login REDIRECTS =="
go /admin/login 5
check "bounced to the dashboard" "/admin/dashboard" "$(ev 'location.pathname')"

echo "== EVERY SCREEN LOADS =="
for route in orders payments inventory users reviews coupons activity; do
  go "/admin/$route" 5
  check "/admin/$route renders" "yes" \
    "$(ev 'document.querySelector(".admin-table, .admin-empty") ? "yes" : "no"')"
done

echo "== ADMIN 404 =="
go /admin/nonsense-page 5
check "custom admin 404" "yes" "$(ev 'document.body.innerText.includes("No such page") ? "yes":"no"')"
check "still inside the dashboard shell" "yes" "$(ev 'document.querySelector(".admin__nav") ? "yes":"no"')"

echo "== NO HORIZONTAL SCROLL =="
go /admin/orders 5
check "orders page fits" "yes" "$(ev '(document.documentElement.scrollWidth - window.innerWidth) <= 0 ? "yes":"no"')"

echo "== LOGOUT KILLS THE SESSION AND THE BACK BUTTON =="
TOK=$(ev 'localStorage.getItem("greenhaven.admin.token") || ""')
check "a live token was captured" "yes" "$([ -n "$TOK" ] && echo yes || echo no)"
ev "(async()=>{await fetch('/api/admin/auth/logout',{method:'POST',headers:{Authorization:'Bearer $TOK'}}); return 'sent';})()" >/dev/null
sleep 2
check "the old token is dead server-side" 403 \
  "$(curl -s -o /dev/null -m 20 -w '%{http_code}' http://localhost:8080/api/admin/stats -H "Authorization: Bearer $TOK")"
ev 'localStorage.removeItem("greenhaven.admin.token"); "cleared"' >/dev/null
go /admin/dashboard 5
check "back to a protected page bounces to login" "/admin/login" "$(ev 'location.pathname')"

echo
echo "  $pass passed, $fail failed"
