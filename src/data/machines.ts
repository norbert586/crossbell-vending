// The fleet. One entry per unit we place.
//
// Specs were compiled from the manufacturer and distributor listings for the
// 24H Smart Vending / HAHA lineup. Measure a unit before quoting a tight
// doorway or alcove — door swing and levelling feet are not in these numbers.
//
// `kwhPerDay` drives the estimated power cost shown on /machines, using
// MI_KWH_RATE below. Update the rate when DTE/Consumers change theirs.

export const MI_KWH_RATE = 0.19; // $/kWh, typical Michigan small-commercial rate

export type Machine = {
  slug: string;
  name: string;
  model: string;
  tagline: string;
  blurb: string;
  bestFor: readonly string[];
  capacity: string;
  selection: string;
  shelves: number;
  doors: 1 | 2;
  /** Inches. Cabinet only — allow clearance for the door to swing. */
  width: number;
  depth: number;
  height: number;
  tempRange: string;
  kwhPerDay: number;
  weight: string;
  /** Drives the cabinet drawing: cold glass, freezer frost, or dual zone. */
  tone: "cool" | "frozen" | "dual";
  /** The one we place most often. */
  workhorse?: boolean;
};

export const machines = [
  {
    slug: "compact",
    name: "The Compact",
    model: "Mini 360",
    tagline: "Fits where a vending machine usually doesn't.",
    blurb:
      "Our smallest cabinet, and the one that solves the hardest problem: a break room with no spare wall. It takes up about as much floor as a household fridge and still runs the same tap-grab-go checkout as every other unit in the fleet.",
    bestFor: ["Small offices", "Waiting rooms", "Apartment lobbies", "Tight break rooms"],
    capacity: "About 245 bottles",
    selection: "Drinks, with room for a snack shelf",
    shelves: 5,
    doors: 1,
    width: 22.8,
    depth: 26,
    height: 76,
    tempRange: "33–50 °F",
    kwhPerDay: 2.0,
    weight: "About 190 lb",
    tone: "cool",
    workhorse: true,
  },
  {
    slug: "beverage",
    name: "The Beverage",
    model: "Plus 440",
    tagline: "Cold drinks, deep enough that you don't run dry.",
    blurb:
      "A wider cabinet built around drinks. Six adjustable shelves hold bottles, cans, and cartons side by side, so a shift change doesn't clear the shelf. This is the unit for a site where everybody reaches for the same thing at the same time.",
    bestFor: ["Gyms", "Warehouses", "Shop floors", "Shift-work sites"],
    capacity: "About 324 bottles",
    selection: "Drink-forward, snacks on the top shelf",
    shelves: 6,
    doors: 1,
    width: 27.2,
    depth: 27,
    height: 76.6,
    tempRange: "33–50 °F",
    kwhPerDay: 2.28,
    weight: "About 232 lb",
    tone: "cool",
  },
  {
    slug: "combo",
    name: "The Combo",
    model: "Pro 542",
    tagline: "Snacks and drinks without two machines in the room.",
    blurb:
      "Three shelves set up for snacks, three for drinks. People pick a sandwich and a bottle in one door-open and get charged once. When a site asks for \"the full break room\" and only has space for one cabinet, this is it.",
    bestFor: ["Break rooms", "Auto shops", "Offices", "Light industrial"],
    capacity: "About 378 items",
    selection: "Snacks and drinks in one cabinet",
    shelves: 6,
    doors: 1,
    width: 29.5,
    depth: 25.6,
    height: 79.5,
    tempRange: "33–50 °F",
    kwhPerDay: 2.65,
    weight: "About 270 lb",
    tone: "cool",
  },
  {
    slug: "frozen",
    name: "The Frozen",
    model: "Freezer 550",
    tagline: "Ice cream, frozen meals, and a real lunch option.",
    blurb:
      "A true freezer on the same checkout. It holds novelties and frozen entrées at well below zero, which turns a break room with a microwave into somewhere people can actually eat lunch instead of leaving the site for it.",
    bestFor: ["Plants with a microwave", "Gyms", "Apartment communities", "Summer-heavy sites"],
    capacity: "About 360 items",
    selection: "Frozen meals, novelties, and ice cream",
    shelves: 5,
    doors: 1,
    width: 29.5,
    depth: 25.6,
    height: 79.5,
    tempRange: "−15 to 10 °F",
    kwhPerDay: 6.2,
    weight: "About 298 lb",
    tone: "frozen",
  },
  {
    slug: "double",
    name: "The Double",
    model: "Ultra 1200",
    tagline: "A small store, for sites that empty a single cabinet.",
    blurb:
      "Two doors, twelve shelves, and two temperature zones — one side chilled, one side ambient. It is the answer when a single unit needs a mid-week top-up: high headcount, a 24-hour operation, or a lobby that has to serve a whole building.",
    bestFor: ["Large plants", "24-hour operations", "Hotels", "Multi-building campuses"],
    capacity: "About 864 bottles",
    selection: "Chilled and ambient, side by side",
    shelves: 12,
    doors: 2,
    width: 53.9,
    depth: 27.9,
    height: 79.5,
    tempRange: "33–50 °F chilled + ambient",
    kwhPerDay: 6.2,
    weight: "About 379 lb",
    tone: "dual",
  },
] as const satisfies readonly Machine[];

/** Rounded monthly power cost, for the "what it draws" line on each card. */
export function monthlyPower(kwhPerDay: number): string {
  const dollars = kwhPerDay * 30 * MI_KWH_RATE;
  return `About $${Math.round(dollars)} a month`;
}

export const tallest = Math.max(...machines.map((m) => m.height));
export const widest = Math.max(...machines.map((m) => m.width));
