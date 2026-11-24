# Pickup-only MVP: release gate and runbook

Updated November 24, 2026. This document supersedes earlier staging checklists.

**Production is NOT authorized until the owner says “go”.** The current implementation hard-blocks production payment creation. Do not merge this branch or publish its deploy as production. The runnable MVP is the sandbox preview in draft PR #17.

- Preview: https://deploy-preview-17--inspiring-kitsune-85ad70.netlify.app/checkout/
- Draft PR: https://github.com/norbert586/crossbell-vending/pull/17
- Admin: preview `/admin/orders/` (Google connection is still pending).

## Approved scope

Six enabled products: 30th Celebration pack $10.99 (50 allocated), 30th ETB $109.99 (4), 30th six-pack bundle $55 (5), Riftbound pack $8.99 (10), Delta Reign ETB $70.99 (3), Prismatic Evolutions pack $13.99 (10). These are original allocations, not a promise of current available stock. Ascended Heroes is disabled while historical records remain intact.

Free pickup at 8891 Christopher St, Washington, MI 48094 outside business hours, or United Wholesale Mortgage campus parking lot during business hours. Coordinate with 586-907-1861. Michigan tax is calculated on the server at 6%. Shipping and automated email are deferred for this pickup-only sandbox MVP. No flat shipping fees are enabled. Future shipping requires actual carrier rates and calibrated packaging.

Customer and internal email address: contact@crossbellvending.com. Email jobs are queued transactionally but are not sent; the preview tells customers to save their confirmation. Google admin allowlist: crossbellvending@gmail.com, naratiu@mtu.edu, alexma93ama@gmail.com. No credentials belong in this document.

Cancellation before carrier handoff/pickup: manual review and full eligible refund, no fee. Label creation is not shipment. No returns; damaged/incorrect orders reported within 7 days with order number/photos and reviewed individually; no return shipment required. Review/initiate approved remedies within 3 business days. Pickup hold: 14 days, contact customer, then manual cancellation/refund if uncollected. See order-management.md for operational details.

## Payment and stock protections

Netlify Database (PostgreSQL via `@netlify/database`) stores stock, orders, operations, payment reversal intents and the email outbox. Blobs is for files only. Production scope is `production`; PR #17 uses `sandbox-17`. Validation races use disposable separate namespaces. Scope separation is implemented in database queries; it is not a claim that every Netlify context has a separately provisioned physical database.

Stock is reserved with conditional row updates inside a database transaction. Multi-item failures roll back the entire reservation. Stable order identities and version checks prevent duplicate decrements. Payment recording locks the order, binds a unique provider transaction ID and atomically inserts notification jobs. This prevents two simultaneous buyers from reserving the last unit. It cannot prevent physical stock being removed outside this system; staff must keep online allocation accurate.

Unpaid holds expire after 30 minutes, lazily when checkout receives traffic. Expiry and payment processing lock the same order. A late or second capture queues a durable reversal rather than fulfilling stock twice. Unsettled payments are voided; settled payments use a linked full refund. An uncertain provider response is retained for reconciliation and is never blindly retried. Unknown refund responses without a returned transaction ID still require manual provider review; this is an explicit launch blocker until an operator can reliably handle it.

Webhook: raw-body HMAC-SHA512 checked before processing; provider transaction fetched independently; invoice, transaction identity, USD currency, exact amount, type and successful status validated. Duplicate delivery is idempotent. Non-2xx failures permit provider retry. Production target is `https://crossbellvending.com/api/payment-webhook`; registration on the live merchant account has NOT been verified by the sandbox tests.

Endpoint selection is determined solely by Netlify deploy context; unknown contexts fail closed. The mode variable is an activation consistency check, not an endpoint override. Hosted payment keeps card entry at Authorize.net. Preview payment enablement requires the current deploy's sandbox validation and a verified signed webhook. A new deploy therefore requires a fresh validation run.

## Evidence and limits

Verified on sandbox commit 3ff68674dbc807d6b6ea722d878324e567a3773f before the confirmation-UX follow-up:

- 35 unit tests passed; Astro check and production build passed.
- 11 checks against actual Netlify PostgreSQL passed, including 12 concurrent requests for one unit (one winner), multi-item rollback, duplicate order/payment, outbox idempotency, stock transfers, reversal/restock idempotency, and payment-versus-expiry races.
- Actual sandbox authentication, hosted-session creation/reuse, approved payment, provider duplicate rejection, official decline trigger, verified void and stock restoration passed.
- Real signed webhook delivery reached the preview and was verified; the readiness flag was refreshed after asynchronous delivery.
- Refund/timeout logic is unit-tested; a provider-settled refund journey has NOT passed yet. Do not label mocked refund/timeout tests as real gateway evidence.
- Source/generated browser assets were checked for payment-secret exposure; only a known HMAC test fixture matched the signature-shaped scan. This is not an exhaustive git-history or provider-log audit.

The subsequent change adds a safe status refresh button, a longer verification window, a missing-session warning, and the server-recorded paid amount/tax to the confirmation. The draft PR contains the latest deploy and validation results. A hosted browser payment must be explicitly confirmed before its journey is marked passed.

## High-priority launch checklist

- [x] Implement actual database reservation, concurrency protection, expiry, identity checks and durable reversal intents.
- [x] Pass real-database concurrency and sandbox approval/decline/duplicate/void checks.
- [x] Verify real signed sandbox webhook delivery.
- [x] Preserve no-production/no-real-charge gate.
- [x] Add payment-status refresh and missing-session guidance.
- [x] Record exact production rollback target below.
- [ ] Complete hosted customer checkout and save confirmation evidence on the final preview.
- [ ] Complete one actual settled sandbox refund, verify linked transaction and ledger result.
- [ ] Connect and test approved-staff order access; establish manual reconciliation for uncertain refunds and daily pickup/order review. Email remains deferred, so operator visibility is essential before accepting real orders.
- [ ] Verify production secret context/scope without showing values; owner replaces previously exposed credentials through a secure channel before live use. No credential changes in this run.
- [ ] Verify live merchant USD/account mode and production webhook registration/signature configuration without charging. Review accessible production logs with redacted reporting.
- [ ] Reconfirm physical online allocations; back up stock/order data and record pending payment/reversal counts.
- [ ] Owner reviews final preview and says “go”. Then remove the explicit production block in a reviewed change, deploy that exact commit, and conduct an owner-operated $1 live purchase and void. A public arbitrary-price endpoint is prohibited.

## Rollback and incident plan

The currently published production deployment was verified in Netlify on November 24:

- Deploy ID: `6aebd111e3a61e9fdcf95dd1`
- Git commit: `4e6c8cffcaf5ac427fe8eed8c647d9d85d8b8904`
- Netlify: https://app.netlify.com/projects/inspiring-kitsune-85ad70/deploys/6aebd111e3a61e9fdcf95dd1
- Permalink: https://6aebd111e3a61e9fdcf95dd1--inspiring-kitsune-85ad70.netlify.app/

1. Stop new payment sessions first. Before any future launch, provide a production kill switch and verify it actually blocks create requests.
2. Republish the above deploy to restore the pre-checkout storefront. Reverify this target immediately before launch in case someone publishes another release.
3. The old deploy may not contain payment webhooks. Do not assume republishing keeps webhook processing alive: record in-flight sessions, preserve the payment-capable deployment, and manually reconcile provider transactions while recovery is arranged. Provider retries alone are not an operational recovery plan.
4. Never roll back/delete the order database or reverse stock from a code rollback. A rollback neither refunds payments nor cancels sessions already issued.
5. Reconcile every capture, void/refund and stock release exactly once before reopening. Retain audit history and unresolved reversal records. Do not repeatedly submit an uncertain refund.

## Deferred, not reopened in this run

Shipping carrier connections/rates, package calibration and interstate tax configuration; automated customer/internal email transport; Inventory 2.0 projection integration; visual redesign. These do not prevent sandbox pickup testing, but shipping must stay disabled and real-order operations must be workable before launch.
