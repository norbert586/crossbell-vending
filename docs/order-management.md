# Order management — staging implementation

Approved 2026-11-23: private dashboard, full access for crossbellvending@gmail.com, naratiu@mtu.edu, alexma93ama@gmail.com. Individual Google identities only. Staff marks pickup complete; no customer code or confirmation required. Manual pickup scheduling. Manual refunds/voids in Authorize.net. Labels in UPS/FedEx; tracking manually recorded; shipping email only on carrier handoff. Dedicated online allocation. One-way Inventory 2.0 reporting.

## Routes and configuration
- `/admin/orders/` contains only the UI shell; all customer data requires an authenticated server session.
- `/api/admin-auth/start` and `/api/admin-auth/callback`: Google authorization code + PKCE, state, nonce; Google library verifies ID token; exact server allowlist; signed Secure/HttpOnly/SameSite cookies, eight-hour sessions.
- Mutation endpoints require session, exact origin and CSRF token. All order actions use row locks, expected operation versions, and audit records. No payment credentials are exposed.
- Configure a Google Web OAuth client. Authorized redirects must include `https://deploy-preview-17--inspiring-kitsune-85ad70.netlify.app/api/admin-auth/callback` and, only for launch, `https://crossbellvending.com/api/admin-auth/callback`. In Google consent testing, add the three approved accounts as test users. Workspace account policy may require domain-admin permission.
- Netlify Functions environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_SESSION_SECRET` (random >=32 characters, different between production/preview). Do not put these values in git or logs. OAuth setup has NOT been completed or verified.

## Orders and stock
Latest 200 orders in UI/CSV. Stock adjustments are relative changes with a reason and expected available quantity, never an unguarded reset. Moving stock to a machine requires reducing online availability first. Existing stock and order history are retained.
Manual payment reconciliation fetches provider transaction details and accepts only original void or linked full refund. Partial refunds require separate future support and are deliberately rejected. Fulfilled damaged-item refunds do not put stock back. Cancellation stock restoration happens once, inside the same DB transaction as the operation and audit update.

## Notifications and reminders
Ready, shipped, cancellation, reversal, day-12 pickup reminder and day-14 internal alert templates/queue are implemented. Hold age starts at payment confirmation. Day 12 is an implementation default for the approved pre-expiry reminder. No automatic cancellation or refund. Sender delivery is pending the deferred email connection; UI clearly labels events queued, not sent. Order confirmations retain the existing payment outbox. All sends must later use contact@crossbellvending.com.
Hourly scheduled function is gated by production context plus `ORDER_MAINTENANCE_ENABLED=true`. Preview schedules do not run; authenticated manual reminder check is available. Notifications still require a delivery worker before launch.

## Inventory 2.0
Dedicated `Online Orders` tab (sheetId 11232026) in existing workbook `1bbibthmPEUoyjhhfUZSKr0uBjMEzbnbbkIXMuHZ5Vrs`. No modifications to master stock or P&L formulas. Exports omit customer names/email/address. Projection includes all orders, gross subtotal/shipping/tax/total plus payment/fulfillment/reversal states; gross totals are not net revenue.
`INVENTORY_SERVICE_ACCOUNT_JSON` is a server-only service-account credential with Sheets API access; share only this workbook with its client_email. `INVENTORY_SYNC_ENABLED=true` enables production-only export. Preview cannot write to real workbook. Connection is not configured. RAW writes prevent formula injection; repeated sync overwrites the dedicated projection instead of duplicating orders. An advisory lock serializes exports. Existing workbook tabs are untouched. Future growth beyond tab capacity requires expanding its grid; failures are reported, not silently truncated.

## Validation and limits
Unit tests cover authentication allowlist, tamper/expiry/context rejection, CSRF, lifecycle rules, provider reversal matching, reminders, CSV safety. Deployed validation extends real DB tests with concurrent ready actions, idempotent reminders, stock-transfer races, and duplicate void restock. Synthetic provider responses are used for reversal concurrency testing; real gateway end-to-end tests remain separate.
Production remains gated. Google login, sender delivery and service-account sharing are launch blockers. UI renders should be verified after connection with a real allowed account; no authentication bypass is provided.
