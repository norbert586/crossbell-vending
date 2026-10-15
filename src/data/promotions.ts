// The promotions page (/promotions/) — the card inside the Crossbell Pack, and
// the promotions listed under it. This is the only file to touch when either
// changes.
//
// Dates are ISO (YYYY-MM-DD) and inclusive. The page renders everything; a
// small inline script hides what has ended (end of that day, visitor's local
// time), so a stale offer never keeps showing after it is over, even if
// nobody redeploys. Without JavaScript everything shows, dates printed.
//
// Keep it honest: offers anyone at the location gets, not prizes. No "you
// won", no odds, no rarity. Anything not yet in the cooler says so.
import type { ImageMetadata } from "astro";
import halloweenPokemon from "../assets/promos/kirkway-halloween-pokemon.jpg";

// Where "Request a product" and the promo buttons send people: the feedback
// form on /contact/, opened and prefilled for this location (Attribution.astro).
export const location = { slug: "kirkway", name: "Kirkway" };

export const pack = {
  card: {
    eyebrow: "Kirkway · Launch week",
    price: "$2",
    product: "Celsius",
    detail: "Any Celsius in the Kirkway cooler, all week.",
    starts: "2026-10-19",
    ends: "2026-10-25",
    fineprint: "While supplies last. Price shows at checkout. Nothing to claim or redeem.",
  },

  // Shown once the offer has ended. Swap in the next promotion here when
  // there is one.
  afterCard: {
    eyebrow: "Kirkway · Your pick",
    headline: "What should come next?",
    detail: "Have a drink, snack, or essential you'd like to see in the cooler? Tell us and we'll look at stocking it.",
  },
};

export interface Promotion {
  id: string;
  image: ImageMetadata;
  // The poster's own words are part of the image, so the alt text repeats
  // them for anyone who cannot see it.
  alt: string;
  label: string; // "Coming soon", "Now in the cooler", "This week only"
  title: string;
  caption: string;
  action: { text: string; href?: string }; // no href = the location's request form
  ends?: string;
}

// Shown in this order, first one largest.
export const promotions: Promotion[] = [
  {
    id: "halloween-pokemon",
    image: halloweenPokemon,
    alt: "Halloween at Crossbell: “A little treat. A new surprise. Pokémon cards coming soon.” Pitch Black, Chaos Rising, and Perfect Order Pokémon booster pack illustrations beside a carved, glowing pumpkin.",
    label: "Coming soon",
    title: "Pokémon cards are on the way.",
    caption: "Trading cards are coming to the Kirkway cooler soon. Tell us which sets you'd want and we'll take it into account when we stock them.",
    action: { text: "Tell us what you'd want" },
    ends: "2026-10-31",
  },
];
