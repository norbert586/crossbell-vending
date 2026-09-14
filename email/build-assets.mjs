// Regenerates the hosted images the email pamphlet points at.
//
// Why these are copies and not the site's own images: pages go through Astro's
// <Image>, which emits content-hashed filenames (/_astro/02-machine.CxK8.webp)
// that change on every build and are WebP, which Outlook cannot display. An
// email that is pasted once and forwarded for months needs URLs that never move
// and a format every client renders, so public/email/ holds plain JPEG/PNG at
// fixed paths, served straight from the domain.
//
// Run from the repo root after changing any source photo:
//   node email/build-assets.mjs
//
// sharp is not a project dependency (Astro pulls its own copy in). Install it
// on the side if node cannot resolve it: npm install --no-save sharp
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const photos = new URL("../src/assets/photos/", import.meta.url);
const brand = new URL("../public/brand/", import.meta.url);
const out = new URL("../public/email/", import.meta.url);

await mkdir(out, { recursive: true });

const jpeg = { quality: 78, mozjpeg: true };
const dest = (name) => new URL(name, out).pathname;
const photo = (name) => new URL(name, photos).pathname;

// Retina-sized: every image is displayed at half these widths in the email, so
// it stays sharp on phones without pushing the message over Gmail's 102 KB
// clipping threshold (that limit counts markup, not remote images).
const work = [
  // Header crest. Stays PNG because it is transparent; palette-quantized, which
  // costs nothing visible on flat vector artwork and drops it from 89 KB to 33.
  () => sharp(new URL("crossbell-crest.png", brand).pathname).resize(240).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(dest("crest.png")),

  // Hero. Square source cropped to a 10:7 banner that keeps the whole cooler.
  () => sharp(photo("02-machine.jpg")).extract({ left: 0, top: 200, width: 2000, height: 1400 }).resize(1200).jpeg(jpeg).toFile(dest("cooler-hero.jpg")),

  // The machine, portrait, next to the spec list.
  () => sharp(photo("01-machine.jpg")).resize(640).jpeg(jpeg).toFile(dest("machine.jpg")),

  // Product lineups. Sources are PNGs on transparent/white; flattened to white
  // so they sit on the white card cleanly and weigh a fraction as JPEG.
  //
  // Letterboxed onto a fixed 4:3 white canvas rather than resized to a common
  // width. The sources have six different aspect ratios, and an email card grid
  // cannot equalize row heights the way the site's CSS grid does -- without a
  // shared ratio the captions in a row land at different heights and the grid
  // reads as ragged. 4:3 matches the white box the site shows them in.
  ...[
    ["04-colddrinks.png", "drinks.jpg"],
    ["05-energysports.png", "energy.jpg"],
    ["06-snacks.png", "snacks.jpg"],
    ["07-healthy.png", "healthy.jpg"],
    ["08-protein.png", "protein.jpg"],
    ["09-premiumluxury.png", "premium.jpg"],
  ].map(([src, name]) => () =>
    sharp(photo(src))
      .flatten({ background: "#ffffff" })
      .resize(532, 392, { fit: "contain", background: "#ffffff" })
      .extend({ top: 14, bottom: 14, left: 14, right: 14, background: "#ffffff" })
      .jpeg(jpeg)
      .toFile(dest(name)),
  ),
];

for (const task of work) {
  const info = await task();
  console.log(`${info.format} ${info.width}x${info.height} ${(info.size / 1024).toFixed(0)} KB`);
}
