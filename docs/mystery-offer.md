# Mystery QR offer

Print `public/mystery-qr.svg` on the advertisement with a white quiet zone intact. It links to https://crossbellvending.com/mystery/. The page shares the existing layout, fonts, crest and palette; it is not linked in navigation and is excluded from the sitemap with a noindex directive. A shared URL can still be opened without scanning: this is discovery, not access control.

## Activate

Set `src/data/mysteryOffer.ts` only after creating and testing the matching coupon in the online store:
- discountLabel: approved amount or percentage
- code: real checkout coupon
- startsAt and endsAt: fixed ISO dates with explicit timezone offsets
- storeUrl: verified HTTPS shop destination
- terms: eligible products, minimum purchase, exclusions, usage limits
- enabled: true after checkout verification

Rebuild/deploy after changing configuration. Checkout must enforce deadlines, eligibility and redemption limits on its server. This static page's browser-clock check is display behavior only; it is not coupon validation. The page intentionally shows a coming-soon state until all required configuration is present. Expired offers hide the code and store CTA. No customer tracking or browser storage is added.
