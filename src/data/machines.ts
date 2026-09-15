// Single source of truth for the machine lineup shown on /machines/.
//
// Numbers come from the manufacturer's published spec tables, cross-checked
// against the operator's own spec sheet where the manufacturer's pages
// disagreed with each other (they do — the same model is listed with two or
// three different capacities depending on which page you read). Capacity is
// the manufacturer's "units of beverages" figure: roughly how many bottles and
// cans fit when the machine is stocked with drinks only. Snacks and fresh food
// take more room per item, so a mixed load holds fewer pieces. Always shown
// with a "~" and never promised as exact.
//
// To add a machine: drop `<slug>-front.jpg` (and optionally `<slug>-angle.jpg`)
// into src/assets/machines/, import them below, and add a row. The page groups
// rows by `type`, in the order of `machineTypes`.
import type { ImageMetadata } from "astro";

import mini360Front from "../assets/machines/mini-360-front.jpg";
import plus440Front from "../assets/machines/plus-440-front.jpg";
import plus440Angle from "../assets/machines/plus-440-angle.jpg";
import pro542Front from "../assets/machines/pro-542-front.jpg";
import pro542Angle from "../assets/machines/pro-542-angle.jpg";
import max620Front from "../assets/machines/max-620-front.jpg";
import max620Angle from "../assets/machines/max-620-angle.jpg";
import ultra1200Front from "../assets/machines/ultra-1200-front.jpg";
import ultra1200Angle from "../assets/machines/ultra-1200-angle.jpg";
import freezer550Front from "../assets/machines/freezer-550-front.jpg";

export type MachineType = "single-door" | "double-door" | "freezer";

export interface Machine {
  /** URL-safe id: used for the card anchor, the deep link, and the `machine` form field. */
  slug: string;
  name: string;
  type: MachineType;
  /** One line under the name on the collapsed card. */
  tagline: string;
  /** Short paragraph in the expanded panel. */
  blurb: string;
  /** Exterior W × D × H, inches. */
  footprint: { w: number; d: number; h: number };
  weightLb: number;
  /** Rough drinks-only count from the manufacturer; rendered with "~". */
  holds: number;
  /** Plain-English shelf layout. */
  shelves: string;
  temperature: string;
  door: string;
  /** Site types this size suits. Shown on the card as "Best for". */
  bestFor: string;
  front: ImageMetadata;
  /** Optional three-quarter view for the expanded panel. Omit and the panel shows the front photo alone. */
  angle?: ImageMetadata;
}

export const machineTypes: { id: MachineType; label: string; heading: string; description: string }[] = [
  {
    id: "single-door",
    label: "Single-door coolers",
    heading: "Single-door coolers",
    description:
      "Four widths of the same idea: a glass-door cooler that reads what left the shelf and charges for exactly that. Pick by how much floor you have and how many people walk past it.",
  },
  {
    id: "double-door",
    label: "Double-door cooler",
    heading: "Double-door cooler",
    description: "Twice the shelf, one checkout. For sites where a single door would be empty by Wednesday.",
  },
  {
    id: "freezer",
    label: "Freezer",
    heading: "Freezer",
    description: "Ice cream and frozen meals, or flip it to cooler mode and run it like the rest of the line.",
  },
];

export const machines: Machine[] = [
  {
    slug: "mini-360",
    name: "Mini 360",
    type: "single-door",
    tagline: "Fits where a household fridge fits.",
    blurb:
      "The smallest machine in the line and the one that fits the most rooms. Six shelves of cold drinks and snacks in a footprint the size of a kitchen refrigerator.",
    footprint: { w: 22.8, d: 26, h: 76 },
    weightLb: 190,
    holds: 216,
    shelves: "6 — five for bottles, one for cans",
    temperature: "32–50°F",
    door: "Single glass door",
    bestFor: "Small break rooms, offices, waiting areas",
    front: mini360Front,
  },
  {
    slug: "plus-440",
    name: "Plus 440",
    type: "single-door",
    tagline: "Four more inches, a third more shelf.",
    blurb:
      "Four inches wider than the Mini, with two shelves of cans instead of one — about a third more drinks in nearly the same footprint.",
    footprint: { w: 26.8, d: 26, h: 77.5 },
    weightLb: 190,
    holds: 288,
    shelves: "6 — four for bottles, two for cans",
    temperature: "32–50°F",
    door: "Single glass door",
    bestFor: "Mid-size break rooms, gyms, auto shops",
    front: plus440Front,
    angle: plus440Angle,
  },
  {
    slug: "pro-542",
    name: "Pro 542",
    type: "single-door",
    tagline: "Wider, taller, built for a busier room.",
    blurb:
      "The middle of the line: wider and taller than the Plus, with room to run a full mix of drinks, snacks, and fresh food without crowding the shelves.",
    footprint: { w: 29.5, d: 25.6, h: 79.5 },
    weightLb: 270,
    holds: 324,
    shelves: "6 — five for bottles, one for cans",
    temperature: "32–50°F",
    door: "Single glass door",
    bestFor: "Larger offices, gyms, light industrial break rooms",
    front: pro542Front,
    angle: pro542Angle,
  },
  {
    slug: "max-620",
    name: "Max 620",
    type: "single-door",
    tagline: "The widest single door in the line.",
    blurb:
      "Two and a half feet wide behind a single door. For the site that has the floor space and the foot traffic to use it, without going to two doors.",
    footprint: { w: 31.5, d: 26, h: 79.5 },
    weightLb: 243,
    holds: 270,
    shelves: "6 — five for bottles, one for cans",
    temperature: "32–50°F",
    door: "Single glass door",
    bestFor: "Busy shop floors, warehouses, schools",
    front: max620Front,
    angle: max620Angle,
  },
  {
    slug: "ultra-1200",
    name: "Ultra 1200",
    type: "double-door",
    tagline: "Two doors, one checkout.",
    blurb:
      "Twelve shelves across two glass doors, all running through the same tap-and-go checkout. Enough capacity to carry a full mix of drinks, snacks, and fresh food for a site that never really closes.",
    footprint: { w: 53.9, d: 28, h: 79.5 },
    weightLb: 379,
    holds: 648,
    shelves: "12 across two doors",
    temperature: "32–50°F",
    door: "Double glass door",
    bestFor: "High-traffic sites, apartment communities, multi-shift plants",
    front: ultra1200Front,
    angle: ultra1200Angle,
  },
  {
    slug: "freezer-550",
    name: "Freezer 550",
    type: "freezer",
    tagline: "Ice cream and frozen meals, or a cooler — your call.",
    blurb:
      "Runs as a true freezer for ice cream, frozen entrées, and frozen treats, or switches to cooler mode for drinks and fresh food. The same grab-and-go checkout either way.",
    footprint: { w: 27.6, d: 35.8, h: 80.4 },
    weightLb: 330,
    holds: 336,
    shelves: "6 — five for bottles, one for cans",
    temperature: "Freezer mode −8 to −1°F, or cooler mode 32–50°F",
    door: "Single glass door",
    bestFor: "Sites that want frozen meals or treats on hand",
    front: freezer550Front,
  },
];

/** The lineup's smallest and largest widths, for range copy on the home page. */
export const machineWidthRange = {
  min: Math.min(...machines.map((m) => m.footprint.w)),
  max: Math.max(...machines.map((m) => m.footprint.w)),
};

/** Shared across every machine; lives here so it is written once. */
export const machineCommon = {
  power: "One standard wall outlet. The electricity is on us.",
  payment: "Tap, swipe, Apple Pay, Google Pay.",
  madeBy: "HAHA Vending",
};

export function formatFootprint(f: Machine["footprint"]): string {
  return `${f.w}" W × ${f.d}" D × ${f.h}" H`;
}
