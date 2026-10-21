import mini from "../assets/cards/mini-tcg.jpg";
import slimWall from "../assets/cards/slim-wall-tcg.jpg";
import megaWall from "../assets/cards/mega-wall-tcg.jpg";
import slimTower from "../assets/cards/slim-tower-tcg.jpg";

// Manufacturer specifications, checked 2026-10-21. Capacity is the standard
// booster-pack configuration, not a promise for every product mix.
export const cardMachines = [
  {
    slug: "vtm-mini-tcg", name: "Mini TCG", image: mini,
    format: "Compact wall mount", capacity: 120, aisles: 8, screen: 21.5,
    width: 21.6, height: 33.3, depth: 8.7,
    fit: "A small wall, a big first impression. A compact starting point for a family venue or waiting area.",
    source: "https://vtmvending.com/products/the-mini-tcg-compact-vending-kiosk-for-cards",
  },
  {
    slug: "vtm-slim-wall-tcg", name: "Slim Wall TCG", image: slimWall,
    format: "Slim wall mount", capacity: 160, aisles: 10, screen: 32,
    width: 23.6, height: 40.5, depth: 10.2,
    fit: "More selection and a larger touchscreen, with a slim cabinet that keeps floor space open.",
    source: "https://vtmvending.com/products/slim-wall-tcg-vending",
  },
  {
    slug: "vtm-mega-wall-tcg", name: "Mega Wall 2.0 TCG", image: megaWall,
    format: "Higher-capacity wall mount", capacity: 240, aisles: 15, screen: 32,
    width: 23.6, height: 40.5, depth: 14,
    fit: "More room for a varied pack selection at a busy arcade, rink, or bowling center.",
    source: "https://vtmvending.com/products/mega-wall-card-vending-machine",
  },
  {
    slug: "vtm-slim-tower-tcg", name: "Slim Tower 2.0 TCG", image: slimTower,
    format: "Freestanding tower", capacity: 456, aisles: 24, screen: 43,
    width: 33.5, height: 72.8, depth: 23.2,
    fit: "A full-height destination with the largest selection, suited to venues with steady foot traffic.",
    source: "https://vtmvending.com/products/slim-pack-tower-2-0-trading-card-vending-machine",
  },
] as const;

export const cardInquiry = (slug?: string) =>
  `/contact/?service=card-machine${slug ? `&machine=${encodeURIComponent(slug)}` : ""}`;
