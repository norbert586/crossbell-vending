/** Activate only after the same code, eligibility and expiration exist in checkout. */
export const mysteryOffer = {
  enabled: false,
  headline: "A little mystery. A little extra.",
  discountLabel: "",
  code: "",
  startsAt: "", // ISO 8601 with timezone, e.g. 2026-11-01T00:00:00-04:00
  endsAt: "",   // A fixed deadline, never a resetting browser timer.
  storeUrl: "", // Verified HTTPS online store URL.
  terms: "",
};
