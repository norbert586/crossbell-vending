# Shipping research and parcel planning — November 23, 2026

Origin authorized by owner: 13023 Azure Dr, Shelby Township, MI 48315, US. Pickup locations remain unchanged. Coverage is the contiguous 48 states, residential/business street addresses only. No PO boxes or military addresses. Owner replaced ALL flat shipping rates with live ground-carrier options, cheapest highlighted; pickup stays free.

## Product evidence

All dimensions below are inches; weights are ounces. These are published product/retail-package measurements, not measured Crossbell outbound parcels. Source URLs and limitations are retained per SKU in `server/checkout/shipping-profiles.json`.

| Item | Published dimensions | Published weight | Planning weight |
|---|---|---|---|
| 30th Celebration ETB | 7.25 × 6.40 × 3.35 (Micro Center) | 25.28 (GameStop indexed 1.58lb; detail page unavailable) | 26 |
| 30th Celebration pack | Not reliably established | 25g / 0.88 (Invicta) | 1 |
| Riftbound Unleashed sleeved pack | 6.8 × 3.8 × 0.3 (official UVS sell sheet) | 0.8 (official 0.05lb) | 1 |
| Ascended Heroes loose pack | Approx. 4.7 × 2.6 × 0.2 (Rocket City Toys) | Approx. 0.8 / 23g | 1 |
| Prismatic Evolutions pack | 6.81 × 2.99 × 0.12 (Invicta; could include sleeve) | 22g / 0.78 | 1 |
| Candidate 30th six-pack bundle | 4.68 × 2.93 × 2.00 (Micro Center) | 5.12 (GameStop indexed 0.32lb) | 6; blocked pending identity |
| Candidate Delta Reign ETB | 7.25 × 6.40 × 3.35 (Micro Center) | Target estimated ship weight 1.53lb / 24.48 | 26; blocked pending identity |

Loose/sleeved packaging differs. The pack planner uses a conservative 6.9 × 3.8 × 0.3 envelope, not a claim that all packs have this size. Rejected treating distributor display weights as individual-pack weights, conflicting bundle listings, and product dimensions as finished parcel dimensions.

## How the draft calculation works

`estimateParcel` sums item planning weights, stacks conservative product envelopes, allows cushioning space, chooses a proposed carton that fits, and adds carton/cushioning/tape weight. It rounds total physical weight up to a whole ounce. Carrier-specific rounding and dimensional weight belong to the connected carrier rating service, not a hardcoded universal divisor.

Proposed outer cartons/packing weights (unverified): 9×6×2 / 3oz; 9×6×4 / 6oz; 10×10×6 / 10oz; 10×10×10 / 12oz; 12×12×16 / 18oz. Actual boxes and their internal clearance must match before these profiles are used for billing.

Examples: one loose pack → 9×6×2 at 4oz; one 30th ETB → 10×10×6 at 36oz (2.25lb); two ETBs → 10×10×10 at 64oz (4lb). These are planning estimates, NOT carrier quotes or guarantees. Mixed carts include all product weight; oversized carts fail rather than silently underquote. Unknown bundle/Delta identities remain blocked.

## Remaining work

- Match proposed cartons with actual available packaging and weigh representative packed shipments to calibrate allowances. Research cannot establish the weight of Crossbell's own box and padding.
- Connect a real rate-provider account. Send origin, validated destination, all parcel dimensions/weights, and account-eligible ground services; show total customer-payable rates and label the cheapest. A sandbox example rate must not be presented as live postage.
- Revalidate selected rate server-side when the cart/address changes and before creating payment. No free-shipping fallback when a rate request fails.
- Finish US street-address/ZIP validation and destination-based tax handling before expanding the existing MI-only checkout validation. The approved coverage is recorded, not yet enabled.
- Quotes and labels need the same actual parcel, carrier/service and account. Label purchasing and tracking remain separate work.
- Shipping remains disabled; parcel planner returns readyForLiveRates:false. Production remains gated on owner go.

Rate API reference: https://docs.easypost.com/docs/parcels — dimensions in inches and weights in ounces; example API only, no provider account selected or connected.
