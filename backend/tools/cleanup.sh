#!/usr/bin/env bash

purge_test_accounts() {
  local pat="$1"
  [ -n "$pat" ] || return 0

  Q "UPDATE plant p
       JOIN (SELECT oi.plant_id AS pid, SUM(oi.quantity) AS qty
               FROM order_item oi
               JOIN orders o   ON o.id = oi.order_id
               JOIN app_user u ON u.id = o.user_id
              WHERE u.email LIKE '$pat'
                AND o.status IN ('PAID','PAID_SHORT')
              GROUP BY oi.plant_id) t ON t.pid = p.id
        SET p.stock = p.stock + t.qty;" >/dev/null 2>&1

  Q "DELETE ri FROM review_image ri
       JOIN review r ON r.id = ri.review_id
       JOIN app_user u ON u.id = r.user_id WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE i FROM invoice i
       JOIN orders o ON o.id = i.order_id
       JOIN app_user u ON u.id = o.user_id WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE p FROM payment p
       JOIN orders o ON o.id = p.order_id
       JOIN app_user u ON u.id = o.user_id WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE oi FROM order_item oi
       JOIN orders o ON o.id = oi.order_id
       JOIN app_user u ON u.id = o.user_id WHERE u.email LIKE '$pat';" >/dev/null 2>&1

  Q "DELETE cr FROM coupon_redemption cr JOIN app_user u ON u.id = cr.user_id WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE r  FROM review r            JOIN app_user u ON u.id = r.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE o  FROM orders o            JOIN app_user u ON u.id = o.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE n  FROM notification n       JOIN app_user u ON u.id = n.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE a  FROM address a            JOIN app_user u ON u.id = a.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE w  FROM wishlist_item w      JOIN app_user u ON u.id = w.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE c  FROM cart_item c          JOIN app_user u ON u.id = c.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE pr FROM password_reset pr    JOIN app_user u ON u.id = pr.user_id WHERE u.email LIKE '$pat';" >/dev/null 2>&1
  Q "DELETE s  FROM admin_session s      JOIN app_user u ON u.id = s.user_id  WHERE u.email LIKE '$pat';" >/dev/null 2>&1

  Q "DELETE FROM app_user WHERE email LIKE '$pat';" >/dev/null 2>&1
}

restore_plant() {
  Q "UPDATE plant SET rating = NULL, review_count = 0 WHERE slug = '$1';" >/dev/null 2>&1
}

assert_clean() {
  local pat="$1"
  local left
  left=$(Q "SELECT COUNT(*) FROM app_user WHERE email LIKE '$pat';")
  if [ "$left" != "0" ]; then
    echo "  WARNING: $left test account(s) survived teardown — cleanup.sh needs a new table"
  fi
}
