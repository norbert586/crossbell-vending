// Trims the white margin off every `<slug>-front.jpg` in src/assets/machines/
// and writes the result to src/assets/machines/cut/<slug>.jpg.
//
// The cut photos are what MachineLineup.astro and the smart market bay on
// /services/ draw to scale: with the margin gone, an image's aspect ratio is
// the cabinet's real width-to-height ratio, so sizing each one by its real
// width lines every machine up at the same inches-per-pixel.
//
// Run after adding or replacing a front photo:  node scripts/cut-machine-photos.mjs
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = path.resolve("src/assets/machines");
const out = path.join(dir, "cut");
await mkdir(out, { recursive: true });

for (const file of await readdir(dir)) {
  const match = file.match(/^(.+)-front\.jpg$/);
  if (!match) continue;
  const dest = path.join(out, `${match[1]}.jpg`);
  const info = await sharp(path.join(dir, file))
    .trim({ background: "#ffffff", threshold: 22 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(dest);
  console.log(`${match[1]}: ${info.width}x${info.height}`);
}
