-- Additive schema only. Preview database branches are isolated by Netlify.
CREATE TABLE checkout_scopes (
  scope text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE checkout_stock (
  scope text NOT NULL REFERENCES checkout_scopes(scope),
  sku text NOT NULL,
  remaining integer NOT NULL CHECK (remaining >= 0),
  PRIMARY KEY (scope, sku)
);
CREATE TABLE checkout_orders (
  scope text NOT NULL REFERENCES checkout_scopes(scope),
  order_key text NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, order_key)
);
CREATE TABLE checkout_email_outbox (
  scope text NOT NULL,
  order_key text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customer','internal')),
  sender text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','review')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope,order_key,audience),
  FOREIGN KEY (scope,order_key) REFERENCES checkout_orders(scope,order_key)
);
CREATE TABLE checkout_validation_runs (
  deploy_id text PRIMARY KEY,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
