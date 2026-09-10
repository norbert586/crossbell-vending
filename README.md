# Crossbell Vending — marketing site

Static brochure site (Astro + Tailwind CSS v4 + TypeScript) for Crossbell Vending: one home page
plus a contact page. No CMS, no database, no client-side framework.

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
service-area cities, business hours, location types in the contact form dropdown — and every
page updates. You should not need to touch phone numbers or city names anywhere else in the
codebase.

**TODO before launch:** the site currently uses `crossbellvending@gmail.com`. A domain address
(e.g. `info@crossbellvending.com`) reads as more established — set one up and swap it into
`site.ts` when ready. Also confirm the business hours in `site.ts` (`hours` field) — they're a
placeholder (Mon–Fri, 8–5) used in the LocalBusiness schema.

## Swapping in real photos

The site ships with two labeled placeholder slots (dashed border, camera icon) instead of stock
photography — an honest placeholder beats a fake stock photo. Replace them with real images in
`src/components/PhotoPlaceholder.astro` usages (in `src/pages/index.astro`), or point them at
real files in `public/images/` and swap the placeholder markup for an `<img>` tag.

**Shot list:**

| Shot | Where it's used | What to shoot | Orientation / aspect ratio |
|---|---|---|---|
| 01 | Hero (top of home page) | The installed cooler in a real break room. Three-quarter angle so both the front door and one side are visible; make sure the screen/card-reader area is lit and in focus. | Portrait, **4:5** |
| 02 | "Why us" section | A technician mid-restock — hand on the door or loading a shelf. Shows the service side of the business, not just the machine. | Portrait, **3:4** |

Shoot in landscape if that's easier and crop to the target aspect ratio afterward — the aspect
ratio matters more than the original orientation. Export as WebP or well-compressed JPEG; the
layout expects the image to fill its slot (`object-fit: cover`), so don't worry about matching
the exact pixel dimensions as long as the aspect ratio is close.

## Where form submissions land

Both forms (the business walkthrough request and the "already have a cooler" feedback form) use
**Netlify Forms** — no backend code, no database. Once the site is deployed on Netlify:

1. Submissions appear under **Site settings → Forms** in the Netlify dashboard, split into
   `business-inquiry` and `location-feedback`.
2. To get emailed on every submission: **Forms → Form notifications → Add notification → Email
   notification**, and enter the address from `site.ts`.
3. Both forms include a honeypot field (hidden from real visitors, invisible bait for bots) —
   Netlify silently discards anything that fills it in.

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
- Accessibility: skip-to-content link, visible focus rings (amber, 3px), semantic landmarks,
  native `<details>` for the FAQ (works without JavaScript, announced correctly by screen
  readers), labeled form fields.
