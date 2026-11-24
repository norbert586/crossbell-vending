CREATE UNIQUE INDEX checkout_one_payment_identity
ON checkout_orders(scope,(data->>'transactionId'))
WHERE data ? 'transactionId';
