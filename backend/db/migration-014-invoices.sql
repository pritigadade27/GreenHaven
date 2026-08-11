-- ===========================================================================
--  Green Haven — migration 014
--  A document ledger, so a cancellation can be recorded rather than erased
--
--  Until now the only record of an invoice was orders.invoice_number, which
--  says an invoice exists but not what it said or when it was issued — and
--  gives a cancelled paid order nowhere to record that the money is owed back.
--
--  An issued invoice is not editable. That is the whole point of one. So a
--  cancellation after payment does not rub out the invoice; it issues a CREDIT
--  NOTE that offsets it, and both documents stand. This table is where both
--  live.
--
--    mysql --default-character-set=utf8mb4 -u priti green_haven < migration-014-invoices.sql
-- ===========================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS invoice (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  number     VARCHAR(40)   NOT NULL,
  -- INVOICE is what was charged; CREDIT_NOTE is what is owed back.
  doc_type   VARCHAR(15)   NOT NULL,
  order_id   BIGINT        NOT NULL,
  -- Always positive. A credit note's sign is carried by its type, not by a
  -- negative number that could be summed by mistake.
  amount     DECIMAL(10,2) NOT NULL,
  reason     VARCHAR(200),
  issued_at  DATETIME      NOT NULL,

  CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES orders (id),
  UNIQUE KEY uq_invoice_number (number),
  KEY idx_invoice_order (order_id, id),
  CONSTRAINT ck_invoice_type CHECK (doc_type IN ('INVOICE','CREDIT_NOTE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every invoice already issued becomes a row, so the ledger is complete from
-- the first day rather than only covering orders placed after this migration.
-- INSERT IGNORE on the unique number makes this safe to run twice.
INSERT IGNORE INTO invoice (number, doc_type, order_id, amount, issued_at)
SELECT o.invoice_number, 'INVOICE', o.id, o.total,
       COALESCE(o.placed_at, CURRENT_TIMESTAMP)
  FROM orders o
 WHERE o.invoice_number IS NOT NULL AND o.invoice_number <> '';
