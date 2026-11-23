CREATE TABLE checkout_operations (
 scope text NOT NULL, order_key text NOT NULL,
 fulfillment_status text NOT NULL DEFAULT 'new', carrier text, tracking text,
 ready_at timestamptz, shipped_at timestamptz, collected_at timestamptz,
 cancelled_at timestamptz, reversal_id text,
 version bigint NOT NULL DEFAULT 1,
 PRIMARY KEY(scope,order_key),
 FOREIGN KEY(scope,order_key) REFERENCES checkout_orders(scope,order_key)
);
CREATE TABLE checkout_admin_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 scope text NOT NULL, actor text NOT NULL, action text NOT NULL,
 subject text NOT NULL, detail jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE checkout_admin_events (
 scope text NOT NULL, order_key text NOT NULL, kind text NOT NULL,
 audience text NOT NULL CHECK(audience IN ('customer','internal')),
 payload jsonb NOT NULL, status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(scope,order_key,kind,audience)
);
