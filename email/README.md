# Email pamphlet

A short follow-up email for prospective locations — the offer, a look at the machine and what
goes in it, and a way to reply. About two iPhone screens of scroll.

| File | What it is |
|---|---|
| `follow-up-pamphlet.html` | The template. Open it in a browser and copy from there — see below. |
| `welcome-residents.html` | Welcome email for residents of a new location. See [Resident welcome](#resident-welcome) at the end. |
| `build-assets.mjs` | Regenerates the hosted images in `public/email/` from the site photos. |
| `build-pack-preview.mjs` | Renders `public/email/pack.jpg`, the still of the Crossbell Pack, from the live `/promotions/` page. |

## Before the first send — deploy once

The email points at images on the live domain (`https://crossbellvending.com/email/…`). Those
files ship with the site, so **push to `main` and let Netlify deploy before you send the first
one.** Until that deploy lands, every image in the pamphlet is a broken icon.

Check it worked by opening <https://crossbellvending.com/email/cooler-hero.jpg> in a browser. If
you see the cooler, the pamphlet is ready to send.

Images cannot be embedded in the file instead: Gmail strips `data:` images on paste, and an
attached image would show as a paperclip rather than inline artwork. Remote URLs are the only
approach that survives being forwarded around a company for months, which is what a pamphlet is
for.

## Sending it

1. Open `follow-up-pamphlet.html` in a browser — double-click the file, no server needed.
2. Click once in the page, then **Ctrl+A / Cmd+A**, **Ctrl+C / Cmd+C**.
3. In Gmail, hit Compose and paste with **Ctrl+V / Cmd+V**. Formatting, images, colors, and links
   all come across. Do *not* paste the file's source code — Gmail would send it as visible text.
4. Replace the four placeholders below.
5. Send yourself a test first and open it on a phone before it goes to a prospect.

Subject lines that match the opening line:

- `Crossbell Vending — the details from today`
- `Following up: the smart cooler for [Company]`
- `As promised — what the cooler at [Company] would look like`

### Placeholders to replace

Every one is in square brackets, so searching the compose window for `[` finds them all.

| Placeholder | Where | Notes |
|---|---|---|
| `[First name]` | Opening line | |
| `[Company]` | Opening line, footer | Appears twice. |
| `[Your name]` | Signature | |
| `[Street address], [City], MI [ZIP]` | Footer | See below — do not send this one unfilled. |

**The footer address is not optional.** A commercial email needs a real physical mailing address
under CAN-SPAM, and the pamphlet is a commercial email. Use the business address or a PO box, and
once it is settled, edit the default straight into `follow-up-pamphlet.html` so nobody has to
remember it on every send.

The footer also carries the opt-out ("reply 'no thanks' and we will not follow up again"). Honor
it, and leave the line in.

## Keep it short

The length is the feature. A prospect decides in the first screen whether this is worth reading,
and everything past the second screen is read by nobody. What earned its place: the free offer itemized,
one photo of an installed cooler, the size and payment specs, a card pointing at the machine
lineup, three product shots, the service promises, and two ways to reply.

Everything else — how it works step by step, the full product range, placement types, the FAQ, the
service-area list — is on the site, one tap away through the buttons. Add a section back here and
something that is currently landing stops landing.

If Gmail ever shows *"[Message clipped]"* at the bottom, the message has grown past its ~102 KB
display limit. That is a signal it is too long, not a formatting bug.

## Attribution

The pamphlet links out three times: **See the full lineup** to `/machines/`, **Pick a time** to
`/contact/`, and the domain in the footer to the home page. All three carry
`?utm_source=email&utm_medium=pamphlet&utm_campaign=followup`, so a
form submission that starts from this email arrives labelled `email / pamphlet / followup` in
Netlify Forms. (`src/components/Attribution.astro` carries the tags from the landing page through
to the submission.) Change `utm_campaign` per push — `followup`, `springroute`, `chamber` — if you
want to tell batches apart. Do not use a `/q/` short link here: those exist to keep printed QR
codes scannable, and they tag traffic as `utm_medium=qr`.

## Changing the images

`public/email/` holds plain JPEG/PNG copies of the site photos at fixed paths. The site's own
images cannot be reused: Astro's `<Image>` emits content-hashed WebP filenames that change on
every build (a URL in an already-sent email would die at the next deploy) and Outlook cannot
render WebP at all.

All six product shots are generated; the pamphlet shows three (cold drinks, snacks, premium). To
show a different three — `energy.jpg`, `healthy.jpg`, `protein.jpg` are the others — edit the
three `<img src>` values and their labels and alt text in the "What goes in it" block.

After changing anything in `src/assets/photos/`, regenerate:

```bash
npm install --no-save sharp   # not a project dependency; Astro bundles its own
node email/build-assets.mjs
```

Then commit `public/email/` along with the photo change, and deploy before sending again.

## Editing the HTML

The constraints are listed in a comment at the top of `follow-up-pamphlet.html`. The short
version: tables for layout, every style inline, 600px wide, absolute image URLs. No `<style>`
block, no flexbox or grid, no background images, no web fonts, no JavaScript — each one is
dropped or ignored by a client that matters, and Gmail specifically discards `<style>` when HTML
is pasted into a compose window.

Three rules are worth keeping when you edit:

- **Body copy is 16px and high-contrast.** Every pairing in the file clears 5:1 — ink `#141420` on
  light, `#e6e8ff` on indigo, near-black on the gold band. The site's lighter tones (`#cdd1ff` on
  indigo, `#4f5168` on lavender) look right on a backlit web page and go thin in a mail client, so
  they are used for fine print only. If you add a section, pick from the pairings already here.
- **Every colored band sets `background-color` and `color` on the same cell.** That is what stops a
  dark-mode client from repainting one and leaving the other, which is how gold bands end up with
  white text on them.
- **Buttons stack, one fixed-width table each.** Two buttons side by side in one row get stretched
  by Gmail into a full-width cell and the label wraps a word per line. `width="240"` on the table,
  `display:block` on the `<a>`, `white-space:nowrap` on the label.

Colors and copy are lifted from the site (`src/styles/global.css` and `src/pages/index.astro`).
Change a claim on the site — the free offer, the 48-hour replacement, the 90-day terms — and change
it here too; this file does not read from `src/data/site.ts`. The lineup card says **six sizes**;
if `src/data/machines.ts` grows or shrinks, fix that number here by hand.

To preview a change, reopen the file in a browser. To see it the way a recipient will, paste it
into a Gmail draft and send it to yourself.

## Resident welcome

`welcome-residents.html` goes to the people who live or work where a cooler was just installed —
not to the host. It does two things: sends them to the **promotions page**
(<https://crossbellvending.com/promotions/>) — a tap-to-open Crossbell Pack with one card inside,
then whatever promotions are running below it — and gives them a way to ask for a product. Send it the same way as the pamphlet: open in a browser, copy, paste
into Gmail.

Subject: `Welcome, Kirkway — meet Crossbell`. Gmail uses the opening line as the inbox preview,
so there is no hidden preheader (one would survive the paste as visible text).

The email says there is a launch-week offer in the pack and deliberately does **not** say what it
is — that is the reason to tap. The card and the promotions list live in `src/data/promotions.ts`: price, product,
dates, fine print, promo images. Once the offer's last day has passed, the page shows the "What should come
next?" card instead, without a redeploy.

### Before sending

The Kirkway copy is filled in: the cooler is in the business center at 8891 Christopher Street,
and the footer carries the Crossbell Vending LLC address (13023 Azure Drive, Shelby Township) and
opt-out. Still check, each time:

| What | Where |
|---|---|
| Offer dates | `src/data/promotions.ts` (`starts`, `ends`). Deploy before sending. |
| "Coming soon" line | Keep anything not in the cooler on send day marked as coming soon. |
| The $2 price | Set it in the cooler's pricing for the offer dates — the page only announces it. |
| Recipients | Put residents in **Bcc**, never To or Cc, so nobody sees anyone else's address. |

Deploy first: `pack.jpg`, `kirkway-cooler.jpg` and the `/promotions/` page ship with the site, so check
<https://crossbellvending.com/email/pack.jpg> loads before the first send.

Opt-outs arrive as replies saying "unsubscribe". Keep a list and leave those people off the next
send.

### Another location

Copy the file, then change "Kirkway" (letterhead, greeting, the "Find it" block, the
`utm_campaign=kirkway` links, `loc=kirkway` on the request link, and the footer's "why you're
getting this" line) and swap in that location's cooler photo. The `loc` slug is what the
feedback form fills in as the location; use the same slug as that cooler's QR sticker. The pack
page itself is shared: its card and promotions are set up for one location at a time in
`src/data/promotions.ts`. Old `/pack/` links redirect to `/promotions/` (`netlify.toml`).

All links carry `utm_source=email&utm_medium=welcome&utm_campaign=<location>`, so requests that
start from this email show up as `email / welcome / kirkway` in Netlify Forms.
