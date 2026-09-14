// Draws a smart cooler to its real proportions.
//
// We don't have studio photography of every unit in the fleet, and stock
// photos of the wrong machine are worse than no photo. These are line
// drawings built straight from the width/height in src/data/machines.ts, so a
// Compact next to a Double is honestly to scale.
//
// The returned markup has no <svg> wrapper: the caller supplies the viewBox
// (a card) or a <g transform> (the scale strip), and the coordinate space is
// always inches × 10, origin at the cabinet's top-left corner.

type Tone = "cool" | "frozen" | "dual";

type Drawable = {
  width: number;
  height: number;
  shelves: number;
  doors: 1 | 2;
  tone: Tone;
};

const GLASS: Record<Tone | "ambient", string> = {
  cool: "#dfe3ff",
  frozen: "#cfe7f7",
  dual: "#dfe3ff",
  ambient: "#f0ecdf",
};

// Product colours, cycled deterministically so every build draws the same unit.
const PRODUCT = ["#c49350", "#8f94d8", "#5d6bbd", "#b7443c", "#3f8a6a", "#d8d2c0"];

function pane(x: number, y: number, w: number, h: number, shelves: number, tone: Tone | "ambient", seed: number) {
  const parts = [
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="4" fill="${GLASS[tone]}"/>`,
  ];

  const slot = h / shelves;
  const unit = 26; // 2.0" bottle plus a 0.6" gap
  const perShelf = Math.max(2, Math.floor((w - 14) / unit));
  const bottleH = Math.min(slot * 0.6, 48);
  const bottleW = unit - 6;
  const inset = (w - perShelf * unit + 6) / 2;

  for (let i = 0; i < shelves; i++) {
    const shelfY = y + (i + 1) * slot;
    for (let j = 0; j < perShelf; j++) {
      const fill = PRODUCT[(seed + i * 3 + j * 2) % PRODUCT.length];
      const bx = x + inset + j * unit;
      const by = shelfY - bottleH - 3;
      parts.push(
        `<rect x="${r(bx)}" y="${r(by)}" width="${r(bottleW)}" height="${r(bottleH)}" rx="3" fill="${fill}" opacity="0.95"/>`,
      );
    }
    // The shelf itself, drawn last so product sits behind its front lip.
    parts.push(
      `<rect x="${r(x + 3)}" y="${r(shelfY - 3)}" width="${r(w - 6)}" height="3" fill="#141420" opacity="0.34"/>`,
    );
  }

  if (tone === "frozen") {
    // Frost along the top of the glass — the quickest read that this one is a
    // freezer and not another cooler.
    for (let i = 0; i < 5; i++) {
      const fx = x + 10 + ((w - 20) / 5) * (i + 0.5);
      parts.push(
        `<ellipse cx="${r(fx)}" cy="${r(y + 12 + (i % 2) * 9)}" rx="${r(w / 11)}" ry="9" fill="#ffffff" opacity="0.75"/>`,
      );
    }
  }

  // A single soft highlight, so the pane reads as glass rather than a hole.
  parts.push(
    `<path d="M ${r(x + w * 0.12)} ${r(y)} L ${r(x + w * 0.34)} ${r(y)} L ${r(x + w * 0.12)} ${r(y + h)} L ${r(x)} ${r(y + h)} L ${r(x)} ${r(y + h * 0.72)} Z" fill="#ffffff" opacity="0.16"/>`,
  );
  parts.push(
    `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" rx="4" fill="none" stroke="#141420" stroke-width="3" opacity="0.55"/>`,
  );

  return parts.join("");
}

/** Inner SVG markup for one cabinet, in a (width × 10) by (height × 10) box. */
export function cabinetMarkup(m: Drawable): string {
  const W = m.width * 10;
  const H = m.height * 10;

  const frame = 13;
  const headerH = H * 0.085;
  const plinthH = H * 0.045;
  const glassY = headerH + 8;
  const glassH = H - plinthH - 8 - glassY;

  const out: string[] = [
    // Cabinet shell
    `<rect x="0" y="0" width="${r(W)}" height="${r(H)}" rx="7" fill="#1b1b2c"/>`,
    // Header band
    `<rect x="0" y="0" width="${r(W)}" height="${r(headerH)}" rx="7" fill="#2a2a5c"/>`,
    `<rect x="0" y="${r(headerH - 7)}" width="${r(W)}" height="7" fill="#2a2a5c"/>`,
    // Brand mark on the header: the crest's crossed bar, abstracted
    `<rect x="${r(frame + 4)}" y="${r(headerH / 2 - 6)}" width="${r(Math.min(64, W * 0.3))}" height="12" rx="3" fill="#c49350"/>`,
    // Card reader
    `<rect x="${r(W - frame - 34)}" y="${r(headerH / 2 - 11)}" width="26" height="22" rx="4" fill="#0d0d18"/>`,
    `<circle cx="${r(W - frame - 21)}" cy="${r(headerH / 2)}" r="4.5" fill="#c49350"/>`,
  ];

  if (m.doors === 1) {
    out.push(pane(frame, glassY, W - frame * 2, glassH, m.shelves, m.tone, 0));
  } else {
    // Two doors, twelve shelves — six a side. On the dual-zone unit the right
    // pane is the ambient half.
    const stile = 9;
    const paneW = (W - frame * 2 - stile) / 2;
    const perSide = Math.max(1, Math.round(m.shelves / 2));
    out.push(pane(frame, glassY, paneW, glassH, perSide, m.tone === "dual" ? "cool" : m.tone, 0));
    out.push(
      pane(frame + paneW + stile, glassY, paneW, glassH, perSide, m.tone === "dual" ? "ambient" : m.tone, 3),
    );
    out.push(
      `<rect x="${r(frame + paneW)}" y="${r(glassY)}" width="${stile}" height="${r(glassH)}" fill="#1b1b2c"/>`,
    );
  }

  out.push(
    // Plinth and feet
    `<rect x="0" y="${r(H - plinthH)}" width="${r(W)}" height="${r(plinthH)}" fill="#0d0d18"/>`,
    `<rect x="0" y="${r(H - plinthH)}" width="${r(W)}" height="2" fill="#c49350" opacity="0.5"/>`,
  );

  return out.join("");
}

/** Two decimals is plenty; it keeps the emitted HTML small. */
function r(n: number): number {
  return Math.round(n * 100) / 100;
}
