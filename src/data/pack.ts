// The Crossbell Pack (/pack/) — the one card inside it, and what replaces it.
//
// This is the only file to touch when the reveal changes. The page renders
// both cards; a small inline script shows `card` until the end of its
// `ends` day (local time) and `afterCard` from then on, so a stale offer never
// keeps showing after the promotion is over, even if nobody redeploys.
//
// Keep the card honest: it is a launch offer anyone at the location gets,
// not a prize. No "you won", no odds, no rarity.
export const pack = {
  // Where the "Request a product" button sends people: the feedback form on
  // /contact/, opened and prefilled for this location (Attribution.astro).
  location: { slug: "kirkway", name: "Kirkway" },

  card: {
    eyebrow: "Kirkway · Launch week",
    price: "$2",
    product: "Celsius",
    detail: "Any Celsius in the Kirkway cooler, all week.",
    // ISO dates, inclusive. Printed on the card and used for the swap.
    starts: "2026-10-19",
    ends: "2026-10-25",
    fineprint: "While supplies last. Price shows at checkout — nothing to claim or redeem.",
  },

  // Shown once the offer has ended. Swap in the next promotion here when
  // there is one.
  afterCard: {
    eyebrow: "Kirkway · Your pick",
    headline: "What should come next?",
    detail: "Have a drink, snack, or essential you'd like to see in the cooler? Tell us and we'll look at stocking it.",
  },
} as const;
