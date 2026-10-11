// Renders public/email/pack.jpg, the still of the Crossbell Pack that the
// resident welcome email shows above its "Open your pack" button.
//
// Taken from the real /pack/ page rather than drawn separately, so the email
// and the page can never disagree about what the pack looks like. Rerun after
// changing the pack's artwork in src/pages/pack.astro.
//
//   npm run build && npx astro preview      # in one terminal
//   node email/build-pack-preview.mjs       # in another
//
// Playwright is not a project dependency. Install it on the side if node
// cannot resolve it: npm install --no-save playwright
import { chromium } from "playwright";

const url = process.env.PACK_URL ?? "http://localhost:4321/pack/";
const out = new URL("../public/email/pack.jpg", import.meta.url).pathname;

// Same white as the email section the image sits on, so the edge disappears.
const band = "#ffffff";
const pad = 28; // room for the drop shadow

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.addStyleTag({ content: `body { background: ${band} !important; }` });
const box = await page.locator("[data-pack]").boundingBox();
if (!box) throw new Error(`No pack on ${url}`);
await page.screenshot({
  path: out,
  type: "jpeg",
  quality: 82,
  clip: { x: box.x - pad, y: box.y - pad / 2, width: box.width + pad * 2, height: box.height + pad * 1.5 },
});
await browser.close();
console.log(`wrote ${out}`);
