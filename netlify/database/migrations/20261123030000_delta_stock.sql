-- One-time initial allocation for the previously disabled delta-reign SKU.
-- Do not reset stock in any scope that already has a delta-reign order.
UPDATE checkout_stock AS s SET remaining = 3
WHERE s.sku = 'booster-delta-reign' AND s.remaining = 0
  AND (s.scope = 'production' OR s.scope LIKE 'sandbox-%')
  AND NOT EXISTS (
    SELECT 1 FROM checkout_orders AS o
    WHERE o.scope = s.scope
      AND o.data @> '{"items":[{"sku":"booster-delta-reign"}]}'::jsonb
  );
