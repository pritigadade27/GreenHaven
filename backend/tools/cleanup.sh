#!/usr/bin/env bash
# Shared teardown for the test suites.
#
# Each suite used to write its own cleanup, and every one of them was
# incomplete. That mattered more than it sounds: the deletes ran as a single
# multi-statement call, so the first foreign-key failure aborted the rest —
# including the statement at the end that restored a product's rating. The
# visible result was a plant advertising 3.5 stars with no reviews beneath it.
#
# So: one ordered teardown, one statement per call, used by every suite.
#
#   . "$(dirname "$0")/cleanup.sh"
#   purge_test_accounts "rev%@example.com"
#   restore_plant snake-plant
#
# Expects Q() — the suite's own mysql helper — to already be defined.

# Deletes every trace of the matching accounts, children before parents.
#
# The order is the foreign-key order, and it is not negotiable: invoice points
# at orders, orders point at app_user, so an attempt to remove the customer
# first fails and leaves the whole lot behind.
purge_test_accounts() {
  local pat="$1"
  [ -n "$pat" ] || return 0

  # Give back the stock the test orders consumed, BEFORE the order lines are
  # deleted — afterwards there is no record of what was taken. Without this the
  # suites permanently eat the catalogue: repeated runs drove Snake Plant to
  # zero, and every later run then failed at checkout with "Only 0 left".
  #
  # Computed from the order lines themselves rather than from a stock level
  # captured at start-up, so an interrupted run cannot bake in a wrong figure.
  Q "UPDATE plant p
       JOIN (SELECT oi.plant_id AS pid, SUM(oi.quantity) AS qty
               FROM order_item oi
               JOIN orders o   ON o.id = oi.order_id
               JOIN app_user u ON u.id = o.user_id
              WHERE u.email LIKE '$pat'
                AND o.status IN ('PAID','PAID_SHORT')
              GROUP BY oi.plant_id) t ON t.pid = p.id
        SET p.stock = p.stock + t.qty;" >/dev/null 2>&1

  # Grandchildren of the order/review trees first.
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

  # Everything that points straight at the customer.
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

# Puts a product's rating back to "nobody has reviewed this".
#
# NULL and 0, never the value that happened to be there when the suite started.
# Capturing the current figure made the suites self-poisoning: an interrupted
# run left a rating behind, the next run adopted it as the baseline, and the
# fabricated number became permanent.
restore_plant() {
  Q "UPDATE plant SET rating = NULL, review_count = 0 WHERE slug = '$1';" >/dev/null 2>&1
}

# What a suite should be able to assert about itself when it finishes.
assert_clean() {
  local pat="$1"
  local left
  left=$(Q "SELECT COUNT(*) FROM app_user WHERE email LIKE '$pat';")
  if [ "$left" != "0" ]; then
    echo "  WARNING: $left test account(s) survived teardown — cleanup.sh needs a new table"
  fi
}
