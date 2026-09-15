# Crossbell Vending — marketing site

Static brochure site (Astro + Tailwind CSS v4 + TypeScript) for Crossbell Vending: a home page,
a machine lineup page, and a contact page. No CMS, no database, no client-side framework.

## Local development

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```

Requires Node 22+.

## Changing the phone number, email, or service area

Everything site-wide reads from **`src/data/site.ts`**. Edit the values there — phone, email,
service-area towns, business hours, location types in the contact form dropdown — and every
page updates. You should not need to touch phone numbers or town names anywhere else in the
codebase.

Each `serviceArea` entry carries a `name` plus a `lat`/`lon`. The name is what every page
prints; the coordinates place the town's dot on the service-area map
(`src/components/ServiceAreaMap.astro`), which projects real longitude and latitude at build
time. Adding a town with coordinates puts it on the map automatically. If two labels end up
overlapping, nudge them with the `labelAt` table at the top of that component — that table is
the only hand-tuned part of the map.

**TODO before launch:** the site currently uses `crossbellvending@gmail.com`. A domain address
(e.g. `info@crossbellvending.com`) reads as more established — set one up and swap it into
`site.ts` when ready. Also confirm the business hours in `site.ts` (`hours` field) — they're a
placeholder (Mon–Fri, 8–5) used in the LocalBusiness schema.

## Brand assets

The crest and the palette both come from the designer's vector file. Sources live in two places:

| File | Use |
|---|---|
| `src/assets/brand/crest.png` | Source for every on-site placement (header, footer, 404). Astro's `<Image>` resizes and converts it to WebP at build time — never link to this file directly. |
| `public/brand/crossbell-crest.svg` | Vector master, cropped to the artwork. Hand this to printers, embroiderers, and the Google Business Profile. Too heavy (~180 KB) to ship on every page. |
| `public/brand/crossbell-crest.png` | 2400px transparent raster for anything that won't take SVG. |
| `public/og.png` | 1200x630 social share card (texts, Facebook, LinkedIn). Regenerate if the tagline changes. |
| `public/favicon.ico`, `public/apple-touch-icon.png` | Simplified bell-and-cross mark. The full crest is illegible at 16px, so this is a deliberate simplification, not the logo. |

The original `.ai` is not in the repo. Keep it somewhere safe; the SVG here is derived from it.

**Colors** (`src/styles/global.css`, `@theme`): gold `#C49350` and lavender `#CDD1FF` are sampled from
the crest. Indigo `#2A2A5C` is lavender's dark end, used for the pricing section and footer. Lavender
is a *surface* color only — it fails contrast as text, so it is never used for type. `accent-dim` is
the darkest gold that passes AA for small text; `accent-hover` is the button hover shade.

## Swapping in real photos

Photos live in `src/assets/photos/` and go through Astro's `<Image>` component, which generates
responsive WebP variants at build time. Drop in a JPEG at 2000px+ on the long side and reference it
from the page; do not pre-resize.

**Shot list:**

| Shot | Where it's used | What to shoot | Status |
|---|---|---|---|
| Hero | Top of home page, right column | `02-machine.jpg` — two-door cooler in an office lobby. Square source; the layout crops it to portrait with `object-fit: cover`. | Placed. |
| The machine | "The machine" section | `01-machine.jpg` — a 3:4 crop of `01-hero.png` (single-door cooler in a hallway, 16:9). Re-crop with `sharp` if the source changes: `extract({ left: 300, top: 0, width: 1080, height: 1440 })`. | Placed. |
| Carousel | "What's inside" cards | `04-colddrinks.png` through `09-premiumluxury.png` — product lineups on white, shown uncropped inside a 4:3 white box. The card list (labels, blurbs, alt text) is the `inside` array at the top of `src/pages/index.astro`. To add a card, drop a PNG on white in `src/assets/photos/`, import it, and add a row. | Placed. |

When a real Crossbell placement is photographed, swap it in for the hero: a two-door unit in a
real break room, three-quarter angle, lights on, no other company's logo in frame.

Shoot in landscape if that's easier and crop afterward — the aspect ratio matters more than the
original orientation. The layout uses `object-fit: cover`, so exact pixel dimensions don't matter
as long as the ratio is close. Shoot with the lights on and no other company's logo in frame.

These photos feed the email pamphlet too. After swapping one, run `node email/build-assets.mjs`
to regenerate `public/email/` and commit it alongside — see [Email pamphlet](#email-pamphlet).

## The machine lineup (`/machines/`)

The lineup page is generated from **`src/data/machines.ts`** — one row per machine, grouped into
sections by `type` (single-door, double-door, freezer). Change a spec there and the card, the
expanded panel, and the "from X to Y wide" range on the home page all update.

**Photos** live in `src/assets/machines/` as `<slug>-front.jpg` (required) and `<slug>-angle.jpg`
(optional). The front shot is the card face; the panel shows both when the angle exists and just
the front when it doesn't. Machine on white, straight-on, 800px square minimum — larger is better
for the expanded view. Currently missing angle shots: `mini-360`, `freezer-550`.

**To add a machine:** drop the photo(s) in, import them at the top of `machines.ts`, add a row with
the same `type` as its section. No page code changes.

**Where the numbers came from.** The manufacturer publishes three different sets of figures
(store spec tables, homepage carousel, Amazon listings) that disagree with each other, and two
of the store pages are copy-pasted from another model. Dimensions and weights are from the store
spec tables; shelf layouts and the "~N drinks" capacities are from the homepage carousel, which is
the one set that matched the operator's own spec sheet. Capacity is a drinks-only count and is
always shown with a "~" — never promise it as exact.

**How the cards work.** Each card is a native `<details>` (like the FAQ), so it opens without
JavaScript and works on the keyboard and in screen readers. `name="machine"` makes them an
exclusive accordion in browsers that support it. The page script only adds motion: a FLIP slide
for the cards that get pushed around when one expands, and a fade on the panel. Reduced-motion
users get the plain open/close. `/machines/#pro-542` deep-links to an open card.

**Lead attribution.** "Ask about the Pro 542" links to `/contact/?machine=pro-542`.
`Attribution.astro` stamps the slug onto the hidden `machine` field of the business-inquiry form
(declared in `ContactSection.astro` so Netlify picks it up) and pre-fills the message with
"Interested in the Pro 542." so the visitor can see it carried over.

The manufacturer's name appears only in the "Made by" row of the expanded panel, nowhere else on
the site — deliberate.

## Where form submissions land

Both forms (the business walkthrough request and the "already have a cooler" feedback form) use
**Netlify Forms** — no backend code, no database. Nothing is emailed by the site itself; Netlify
receives the submission and (once configured) emails you.

**One-time setup in the Netlify dashboard — the forms do not work until this is done:**

1. **Site configuration → Forms → Enable form detection.** Netlify only scans the built HTML for
   forms when this is on. Without it, every submit returns a 404 (this is what "the send button
   goes to page not found" looks like).
2. **Deploys → Trigger deploy.** Detection only happens during a build, so redeploy after
   enabling it.
3. Submit a test through the live site. It should land on `/thanks/`, and the entry should
   appear under **Forms** in the dashboard, split into `business-inquiry` and `location-feedback`.
4. To get emailed on every submission: **Forms → Form notifications → Add notification → Email
   notification**, and enter the address from `site.ts` (`crossbellvending@gmail.com`).

Both forms include a honeypot field (hidden from real visitors, invisible bait for bots) —
Netlify silently discards anything that fills it in. After a successful submit, Netlify redirects
to `src/pages/thanks.astro` (set by the `action` attribute on each form).

Local `npm run preview` cannot accept form posts — there is no Netlify behind it — so always test
forms on the live site.

If you ever move off Netlify, the forms will need a different backend (e.g. Formspree) — update
the `data-netlify` / `netlify-honeypot` attributes and form `action` in
`src/components/ContactSection.astro`.

## Deploying

The site is **live at https://crossbellvending.com**, hosted on Netlify, with DNS fronted by
Cloudflare.

**How a change reaches production:**

1. Commit and push to `main`.
2. GitHub Actions (`.github/workflows/ci.yml`) runs `npm ci && npm run build` and checks that
   the expected pages were generated. This is a safety net, not the deploy.
3. Netlify builds from `main` and publishes to `crossbellvending.com`.

That is the whole flow — pushing to `main` is deploying. There is no manual step.

CI and Netlify are pinned to the same Node version (22) via `.github/workflows/ci.yml` and the
`NODE_VERSION` setting in `netlify.toml`. Keep them in sync with `engines` in `package.json`
so a green CI run means a green production build.

**Note:** CI does not gate the Netlify deploy — they run in parallel off the same push, so a
failing CI run will not stop a bad build from being attempted. To make the check blocking, add a
branch protection rule on `main` requiring the `Build` check, and work through pull requests
instead of pushing straight to `main`.

## Email pamphlet

[`email/follow-up-pamphlet.html`](email/) is a short follow-up email to send after a walkthrough
or a call: the free offer itemized, a look at the machine and what goes in it, and two ways to reply.
Open it in a browser, select all, copy, paste into a Gmail compose window, fill in the bracketed
placeholders, send.

It is deliberately about two phone screens long, and the rest of the pitch is a tap away on the
site. Resist growing it — the reason it gets read is that it ends.

Two things to know before the first send, both covered in [`email/README.md`](email/README.md):

- **It depends on a deploy.** The email's images are absolute `crossbellvending.com/email/…` URLs
  served out of `public/email/`, so the pamphlet only renders once that folder is live. The
  site's own images cannot be reused — Astro's `<Image>` emits content-hashed WebP that changes
  filename on every build and that Outlook cannot display.
- **The footer needs a real mailing address.** It ships with a `[Street address]` placeholder;
  a commercial email requires one under CAN-SPAM.

Copy in the pamphlet is duplicated from `src/pages/index.astro`, not imported from
`src/data/site.ts` — an email has no build step. Change a claim on the site (the free offer, the
48-hour replacement, the 90-day terms) and change it in the pamphlet too.

## QR codes and traffic attribution

Printed QR codes must point at a **short /q/ path**, never at a full `utm_` URL. Short URLs make
a less dense QR that scans faster on a curved cooler door in bad light, and because the /q/ rules
are 302 redirects (`netlify.toml`), the destination can be changed later without reprinting
anything already stuck to a machine.

### Marketing placements

`https://crossbellvending.com/q/<placement>` -> home page, tagged `utm_source=<placement>`,
`utm_medium=qr`. The path segment *becomes* the source, so a new placement needs no code change:

| Print this | Put it on |
|---|---|
| `crossbellvending.com/q/card` | Business cards |
| `crossbellvending.com/q/flyer` | Flyers and leave-behinds |
| `crossbellvending.com/q/van` | Vehicle decal |
| `crossbellvending.com/q/door` | Door hangers |
| `crossbellvending.com/q/sign` | Yard or window signs |

Any word works -- `/q/expo`, `/q/chamber`, `/q/postcard` -- and shows up under that name.

### Cooler stickers

`https://crossbellvending.com/q/cooler` -> contact page with the feedback form already open,
location blank for the person to fill in. This is the generic sticker to print in bulk before
machines have assigned location slugs. Print-ready art lives in [`qr/`](qr/).

Note this one is deliberately routed to the **contact page**, not the home page like the marketing
codes: someone standing at a machine wants to report a problem, not read the sales pitch.

### Per-cooler stickers

`https://crossbellvending.com/q/c/<location-slug>` -> contact page with the feedback form already
open and the location filled in, so the person at the machine does not have to type where they are.

Use this once machines have names. Use a lowercase, hyphenated slug: `/q/c/riverbend-fitness`, `/q/c/acme-auto-shop`. The exact slug
is recorded in the `location_code` field even if the visitor edits the visible location name.

### How the source reaches you

`utm_` params only exist in the URL of the page that was landed on -- a visitor who scans on the
home page and then clicks to /contact/ has lost them by submit time. `src/components/Attribution.astro`
solves this: it stores the attribution in `sessionStorage` on arrival and stamps it onto hidden
fields in both forms. **Every Netlify Forms submission now carries `source`, `medium`, `campaign`
and `landing_page`** (plus `location_code` on the feedback form), visible in the Netlify dashboard
and in notification emails.

Untagged visitors are still labelled: the referring hostname where there is one, otherwise
`direct`. Attribution is last-touch -- a fresh scan overrides an earlier one in the same session.

The hidden inputs are declared in `ContactSection.astro` markup on purpose. Netlify discovers a
form's fields by parsing the **built HTML**, so a field injected by JavaScript would be dropped.

No cookies and no third-party script are involved, so this needs no cookie banner.

### What this does not give you

This attributes **leads**, not pageviews -- you learn which QR produced a form submission, not how
many people scanned and left. The site has no analytics installed. See Notes if you want scan
counts too.

## Notes

- `astro.config.mjs` has `site` set to `https://crossbellvending.com` — required for the sitemap
  (`@astrojs/sitemap`) to generate correct URLs. Update it if the domain ever changes.
- `public/robots.txt` points at the generated sitemap.
- Accessibility: skip-to-content link, visible focus rings (indigo, 3px), semantic landmarks,
  native `<details>` for the FAQ (works without JavaScript, announced correctly by screen
  readers), labeled form fields.
