# Crossbell checkout — local review

Status: implemented locally; not pushed, not deployed, and no Authorize.net calls made. Branch: `preview/premium-checkout`.

## Review

Run `npm install`, then `npm run dev`. Open `/checkout-review/` to switch between desktop and 390px mobile frames. `/checkout/` is the checkout itself. The page defaults to design-preview mode and never creates an order in this mode. The displayed $11.99 pack price is illustrative, based on the owner's proposal; tax and fulfillment are explicitly pending. Existing catalogue/navigation remains unchanged until approval. The UI demonstrates one product; the backend accepts validated multi-line carts.

## Implemented backend

- `POST /api/checkout`: actions `quote` and `create`.
- `GET /api/checkout?action=config`: public sandbox policy.
- `GET /api/checkout?action=status&id=...`: bearer-protected, minimal order status.
- `POST /api/payment-webhook`: verifies the raw body HMAC, then retrieves transaction details independently from Authorize.net.
- Integer-cent server pricing, product allowlist, quantity limits, validated buyer/address fields and an order amount cap.
- Authorize.net Accept Hosted redirect, sandbox endpoints only, billing/card-code required, eCheck disabled.
- Durable sandbox orders in Netlify Blobs, strong reads, atomic creation and compare-and-swap payment updates. Same idempotency key reuses the same active payment session; changed cart data is rejected.
- Verified invoice, amount, transaction type and captured/settled status required before marking paid. Browser return URL cannot mark payment paid. Duplicate notification processing is idempotent. A second payment on an already-paid order is rejected for manual review.
- Preview credentials are read only on the server. No keys, passwords or card details are in this code.
- Production context is rejected unconditionally. This is an initial sandbox implementation, not a production commerce system.

## After the owner approves sandbox deployment

1. Push this review branch and create a PR targeting the Netlify-connected repository. Do not merge to main.
2. Confirm the project builds this repository and creates a Deploy Preview; enable Netlify Blobs in that environment if needed. The existing three AUTHNET variables must be available to Functions in Deploy Previews.
3. Add `CHECKOUT_MODE=sandbox` in the same context.
4. Add `CHECKOUT_POLICY_JSON` with explicitly approved **sandbox test fixtures**. Example below is NOT a real shipping or tax policy:

```json
{"products":{"celebration-pack":{"name":"30th Celebration","priceCents":1199,"maxQuantity":10}},"shippingCents":500,"taxBps":600,"shippingTaxable":true}
```

`shippingCents`, `taxBps` and `shippingTaxable` must be chosen for testing before activation. The client switches to a test-payment button only when the server returns sandbox mode. The server also requires Netlify's `CONTEXT=deploy-preview`; a production deployment cannot charge through these handlers.

5. Redeploy the preview. Register its exact HTTPS `/api/payment-webhook` URL in the Authorize.net sandbox for `net.authorize.payment.authcapture.created`. Use the generated sandbox signature key. Keep the endpoint aligned with the current review's store namespace.
6. Test approved, declined, invalid, abandoned, duplicate-submit and duplicate-webhook cases with official sandbox test cards. Verify the provider transaction matches the recorded order. Test return-page pending confirmation and eventual verified confirmation.
7. Test provider and storage failure handling. Confirm credentials never appear in responses, browser assets or logs.

## Still required before real sales

- Final product catalogue, prices and available inventory. Current maxQuantity is a per-order safety limit, NOT an inventory reservation system. No stock is deducted or reserved.
- Approved shipping area, rates, carriers and tax calculation. This sandbox accepts Michigan addresses only; this is a technical test boundary, not a finalized service promise.
- Exact pickup address, eligibility/access hours, release process and notifications at the Kirkway business center.
- Transactional inventory reservation and reconciliation, order management, verified refunds/voids, email delivery, shipping labels and fulfillment tracking.
- Abuse prevention/rate limits, order-data retention and deletion, monitoring, abandoned-session recovery, reconciliation for missed webhooks and payment-provider outage recovery.
- Replace shared sandbox credentials before broader testing; store replacements only in Netlify secrets. Provision separate live credentials only in a future production release.

## Validation

`npm run test:checkout`: server pricing tampering, duplicate/invalid items, shipping validation, production guard, raw-body signatures, replay/idempotency, concurrent submissions, gateway failures, payment amount/status matching, duplicate payments and sandbox endpoint selection.

`npm run check` and `npm run build`: Astro/TypeScript and full site build.

Provider/storage behavior is unit-tested with fakes. Real Netlify Functions, Blobs persistence and Authorize.net end-to-end execution remain untested until sandbox approval. Visual review covers local desktop and mobile-frame layouts, shipping fields, quantity totals and the non-submitting next-step dialog.

## References

- https://developer.authorize.net/api/reference/features/accept-hosted.html
- https://developer.authorize.net/api/reference/features/webhooks.html
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
