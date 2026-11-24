-- Additive only: preserve every applied migration checksum.
CREATE TABLE checkout_payment_reversals (
  scope text NOT NULL,
  transaction_id text NOT NULL,
  order_key text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitting','uncertain','confirmed','review')),
  reversal_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(scope,transaction_id),
  FOREIGN KEY(scope,order_key) REFERENCES checkout_orders(scope,order_key)
);
