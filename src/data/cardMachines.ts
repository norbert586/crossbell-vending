import wall from "../assets/cards/youmi-ym101.webp";
import tower from "../assets/cards/youmi-ym102.webp";

// Supplier screenshots supplied and model mapping confirmed by Crossbell, 2026-10-27.
// Dimensions are listing values; do not infer wall-only mounting geometry from the render.
export const cardMachines = [
  {
    slug: "youmi-ym101", name: "Youmi YM101", image: wall,
    format: "Compact wall-mounted machine", capacity: "135 items (supplier-listed)", screen: 32,
    width: 23.6, height: 66.1, depth: 13.4, weight: 95, power: 50,
    metric: "60 W × 34 D × 168 H cm",
    fit: "A wall-mounted trading-card experience with a portrait touchscreen and illuminated pickup hatch.",
    placement: "Supplier-listed overall dimensions. Wall-only cabinet dimensions, mounting load and service clearances are confirmed during site planning.",
    connectivity: "4G / Wi-Fi",
  },
  {
    slug: "youmi-ym102", name: "Youmi YM102", image: tower,
    format: "Freestanding machine", capacity: "Confirmed for your product mix", screen: 32,
    width: 23.6, height: 66.1, depth: 13.4, weight: 100, power: 50,
    metric: "60 W × 34 D × 168 H cm",
    fit: "A full-height red-and-white Poké Ball design that gives collectors a dedicated destination in your venue.",
    placement: "Freestanding placement. Allow space for access and service; final installation clearances are confirmed during the site visit.",
    connectivity: "Remote monitoring",
  },
] as const;

export const cardInquiry = (slug?: string) =>
  `/contact/?service=card-machine${slug ? `&machine=${encodeURIComponent(slug)}` : ""}`;
