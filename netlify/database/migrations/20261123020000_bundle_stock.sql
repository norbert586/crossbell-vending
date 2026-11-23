-- One-time initial allocation for the previously disabled bundle SKU.
-- Do not reset stock in any scope that already has a bundle order.
UPDATE checkout_stock AS s SET remaining = 5
WHERE s.sku = 'booster-bundle' AND s.remaining = 0
  AND (s.scope = 'production' OR s.scope LIKE 'sandbox-%')
  AND NOT EXISTS (
    SELECT 1 FROM checkout_orders AS o
    WHERE o.scope = s.scope
      AND o.data->'quote' @> '{"items":[{"sku":"booster-bundle"}]}'::jsonb
  );
