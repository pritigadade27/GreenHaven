-- Adds invoices and credit notes
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS invoice (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  number     VARCHAR(40)   NOT NULL,
  doc_type   VARCHAR(15)   NOT NULL,
  order_id   BIGINT        NOT NULL,
  amount     DECIMAL(10,2) NOT NULL,
  reason     VARCHAR(200),
  issued_at  DATETIME      NOT NULL,

  CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES orders (id),
  UNIQUE KEY uq_invoice_number (number),
  KEY idx_invoice_order (order_id, id),
  CONSTRAINT ck_invoice_type CHECK (doc_type IN ('INVOICE','CREDIT_NOTE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO invoice (number, doc_type, order_id, amount, issued_at)
SELECT o.invoice_number, 'INVOICE', o.id, o.total,
       COALESCE(o.placed_at, CURRENT_TIMESTAMP)
  FROM orders o
 WHERE o.invoice_number IS NOT NULL AND o.invoice_number <> '';
