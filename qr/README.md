# QR assets

Generated codes for print. Regenerate or add new ones rather than editing by hand.

| File | Use |
|---|---|
| `cooler-sticker.svg` | Ready-to-print 3in x 4in cooler sticker. Vector — scales to any size. The crest is embedded inline, so the file is self-contained. |
| `cooler-plain.svg` | The bare QR, no text. Drop into your own layout. |
| `cooler-plain.png` | 1200px raster of the bare QR, for anything that won't take SVG. |

All three encode **`https://crossbellvending.com/q/cooler`**, which redirects to the contact page
with the feedback form already open and `utm_source=cooler` recorded on the submission.

## Notes for print

- Error correction is level **H** (~30% of the code recoverable). A sticker on a cooler door gets
  scuffed, greasy and peeled at the corners, and the URL is short enough that the redundancy costs
  almost no density.
- The QR on the sticker prints at ~1.64in, about 0.93mm per module — comfortable for a phone at
  arm's length. **Do not shrink the sticker below about 2.5in wide**; under roughly 0.6mm per
  module, scanning starts to fail in poor light.
- Keep the white margin around the code. That quiet zone is part of the spec, not padding.
- Text is set in a Helvetica/Arial fallback stack. For commercial printing, open the SVG in a
  design tool and convert text to outlines, or reset it in the site's own faces (Barlow Condensed
  for the headline, IBM Plex Sans for body).
- Don't recolour the code to a light-on-dark or low-contrast scheme; many scanners assume dark
  modules on a light background.

## Per-location codes

Once machines are placed, each one can get its own code at
`https://crossbellvending.com/q/c/<location-slug>` (lowercase, hyphenated). Those prefill the
location for the person scanning and tag the submission with the exact slug, so feedback arrives
already attached to a specific machine. See the QR section of the root README.
