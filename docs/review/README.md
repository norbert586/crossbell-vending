# Homepage and TCG review

Reviewed 2026-10-21 against the production build. Screenshots are actual local browser captures, not design mockups:

- `homepage-desktop.png`: new homepage opening at 1440px.
- `card-feature-desktop.png`: prominent dark card feature within the homepage.
- `card-mobile.png`: dedicated card page opening at 390px.

## Verification

- `npm run check`: 0 errors, warnings, or hints.
- `npm run build`: 11 static pages generated, including `/trading-card-vending/` and its sitemap entry.
- `git diff --check`: clean.
- Static HTML audit: 282 internal links and anchors across 11 pages; unique IDs, one H1 per page, UTF-8 copy, image files and alt attributes checked.
- Actual built attribution script executed in a Node VM with a minimal document fixture: four model-specific inquiries preserve their service, machine slug, and correctly named message; QR source, medium, campaign, and landing page survive navigation; existing cooler naming, resident QR routing, unknown-service fallback, and storage-disabled handling pass.
- Browser: model dimensions expand, including through native controls with JavaScript disabled; the mobile menu opens by keyboard and navigates to the card page with the correct current-page indicator.
- Desktop and phone captures reviewed; horizontal overflow checks pass at 320, 390, 768, 1024, and 1440px. Page images loaded successfully.
- Reduced-motion mode checked; the foil interaction is enabled only for hover-capable devices with no reduced-motion preference.
- Independent finish review: `ship`, no material fixes identified at the supplied screenshot/source scope. This is not a full accessibility certification.

No real form was submitted. Netlify form delivery requires a deployed environment and is not established by these local checks. Production was not merged or deployed as part of preparing the PR.

Supplier image provenance and specification sources are in `src/assets/cards/SOURCES.md`. Original manufacturer images remain unedited; the image tool rejected background extraction, so no generated cutouts are used.
