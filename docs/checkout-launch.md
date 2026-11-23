# Checkout staging and launch gate

Production deployment is NOT authorized until the owner says **go**. This branch is a draft, not launch-ready. Payment creation is deliberately blocked while the existing database and email service are identified and integrated.

## Confirmed requirements

- Five approved catalogue products, prices, and initial quantities are in `server/checkout/production-catalogue.json`. These quantities are seed instructions, not verified live database balances.
- Free pickup: 8891 Christopher St, Washington, MI 48094 outside business hours; United Wholesale Mortgage campus parking lot during business hours.
- UPS shipping coming soon; shipping checkout disabled. Michigan sales tax: 6%.
- Approved: Netlify Database for stock/orders; Blobs only for files. The Blobs stock prototype has been removed.
- Customer confirmations: From/Reply-To contact@crossbellvending.com. Internal alerts: contact@crossbellvending.com. Mailbox provider and transport authorization pending.
- Reject sold-out items and excessive quantities before payment. If payment succeeds without fulfillable inventory, automatically void an unsettled transaction or refund a settled transaction. Durable retries, transaction verification, and idempotency must be implemented before enabling this.

## Validation status

- Current unit suite: 17 tests (the 2 obsolete Blobs stock tests were removed). Includes signatures, approved and rejected payment reconciliation, duplicate submissions, ambiguous provider timeout, context routing, pricing, and pricing.
- A preview-only, once-per-deploy `/api/checkout-validation` test runs 12 concurrent last-unit reservations using the actual Netlify Database adapter, checks rollback, duplicates and transactional email-outbox insertion. Its deployed result is still pending; do not report a real-store pass until it runs.
- Actual sandbox approved/declined/timeout/refund/void journeys, real database last-unit race, email delivery, and requested confirmation/sold-out screenshots remain pending.
- Context determines the API endpoint; CHECKOUT_MODE is only an activation guard. Unknown contexts fail closed.
- Intended production webhook: https://crossbellvending.com/api/payment-webhook . Raw request bytes are HMAC-SHA512 verified before reconciliation; provider transaction details are independently fetched and matched against order/invoice, amount, type and status. Actual production webhook registration and delivery must still be checked.

## Go-live checklist

- [x] Storage choice approved: Netlify Database.
- [ ] Verify the deployed preview database and its isolation from production.
- [ ] Implement transactional stock reservation, unique order/payment identities, reservation lifecycle, reversal workflow and notification outbox.
- [ ] Confirm email sender/provider and internal recipient; verify both deliveries.
- [ ] Run the full suite and real-store last-unit race test; document actual outcomes.
- [ ] Complete sandbox hosted-payment, declined, duplicate, timeout, void and refund journeys.
- [ ] Capture all requested preview screenshots from real sandbox states.
- [ ] Verify Netlify production/nonproduction secret scoping without displaying values.
- [ ] Verify production webhook registration, domain, signature and event subscriptions without charging.
- [ ] Scan source, generated assets and accessible logs for secret leakage using redacted results.
- [ ] Record the currently published Netlify deploy ID and permalink before release.
- [ ] Owner reviews preview and says go.
- [ ] Deploy only the reviewed commit; conduct one owner-operated live $1 purchase and void. Do not introduce a public arbitrary-price checkout.

## Rollback plan

1. Pause new checkout sessions immediately if payment, inventory or notification safety fails.
2. Republish the exact pre-release Netlify production deploy recorded above. Its ID is not yet verified; do not substitute a Git commit for a Netlify deploy ID.
3. Keep the order database, webhook processing and reversal records intact. Republishing code does not reverse charges or restore stock.
4. Reconcile all in-flight sessions, received payments and stock reservations before reopening. Avoid destructive database rollback.
5. The last known main Git commit is 4e6c8cf; this is reference information only, not a verified rollback deploy.

## Open risks

Database integration, real concurrency verification, automatic reversals and durable retries, notification delivery, abandoned reservations, production webhook configuration, secret/log audit, and exact rollback deploy remain unresolved. Do not enable payment creation or merge this draft until these are resolved.
