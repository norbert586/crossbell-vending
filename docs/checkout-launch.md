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

## November 23 owner updates

Contact address confirmed as sender, reply-to and internal alert recipient: contact@crossbellvending.com. Owner will connect email later.

30th ETB now $109.99; 30th pack $10.99; booster bundle $55; Riftbound pack $8.99; Delta Reign $70.99; Prismatic Evolutions pack $13.99. New bundle and Delta Reign entries are visible but blocked until exact product and stock are confirmed. Ascended Heroes is retained pending clarification, not silently removed. Existing stock is not reset.

Ground shipping is requested: $5 for individual bundles; $8.50 for orders larger than one ETB. Single-ETB orders, loose packs, mixed/multiple-bundle orders, per-order versus per-item charges, and destination coverage still need confirmation. Rates are recorded but shipping remains disabled until these rules are resolved.

Real Netlify Database validation passed 4 checks on prior draft d9e1db6c: last-unit race (12 requests, one reservation), duplicate reservation, atomic multi-product rollback, and exactly two email outbox jobs. This does not validate payment reversals, abandoned reservation release, or actual email delivery.

## Shipping decision superseding flat rates

Owner approved contiguous 48-state street-address delivery, live ground-carrier rate options with cheapest highlighted, and free pickup. Origin is 13023 Azure Dr, Shelby Township, MI 48315. The $5/$8.50 proposal is withdrawn. See shipping-research.md and server/checkout/shipping-profiles.json for researched product measurements and explicitly estimated parcel allowances. Rate-provider connection, actual packaging calibration, destination tax rules, and broader address validation remain pending; shipping is not enabled.

## Bundle confirmation — 2026-11-23
User confirmed the 30th Celebration six-pack Booster Bundle: $55 each, five sealed bundles allocated for online sale. Catalogue enabled in staging; production remains gated. One-time migration seeds existing zero-stock bundle rows only where no bundle orders exist; new scopes use initialStock=5. No loose-pack inventory is changed.

## Delta Reign confirmation — 2026-11-23
User confirmed three Delta Reign Elite Trainer Boxes at $70.99 each for online sale. Enabled in staging only. One-time allocation migration updates existing zero-stock rows only where no Delta Reign orders exist; new scopes use initialStock=3.

## Ascended Heroes paused — 2026-11-23
Removed from the staged catalogue and checkout selector at user request. Server quotes reject the disabled SKU, including old cart links. Existing stock and order records retained. Production unchanged.

## Dispatch timing — 2026-11-23
User confirmed dispatch within 3 business days. Carrier transit time is additional; do not present this as delivery within 3 days. Shipping integration remains pending and production is unchanged.
