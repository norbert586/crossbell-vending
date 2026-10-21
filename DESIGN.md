---
name: Crossbell Vending
description: Local managed vending with a crest-derived identity and a dark trading-card extension.
colors:
  accent: "#c49350"
  accent-dim: "#96692f"
  accent-hover: "#ae7f3c"
  indigo: "#2a2a5c"
  indigo-2: "#3b3b75"
  lavender: "#cdd1ff"
  lavender-tint: "#e6e8ff"
  ink: "#141420"
  paper: "#f6f7ff"
  line: "#cfd0e4"
  muted: "#4f5168"
  white: "#ffffff"
  lineup: "#1b1b30"
typography:
  display:
    fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(3rem, 5.7vw, 5.65rem)"
    fontWeight: 700
    lineHeight: 0.97
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif'
    fontSize: "clamp(2.2rem, 4vw, 3.4rem)"
    fontWeight: 600
    lineHeight: 1.04
  title:
    fontFamily: '"Barlow Condensed", ui-sans-serif, system-ui, sans-serif'
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.1
  body:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: "1rem"
  label:
    fontFamily: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
    fontSize: ".9rem"
    fontWeight: 600
    lineHeight: 1.4
  utility:
    fontFamily: '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    fontSize: ".875rem"
    fontWeight: 600
rounded:
  square: "0"
  action: "3px"
  foil: "16px"
  stage: "14px"
spacing:
  compact: ".5rem"
  inline: "1rem"
  mobile-gutter: "1.25rem"
  content-gap: "2rem"
  desktop-gutter: "2rem"
  section-mobile: "3.25rem"
  section: "4.5rem"
  split-gap: "5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: ".9rem 1.35rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-outline:
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: ".5rem 1rem"
  button-outline-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  text-link:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  text-link-dark:
    textColor: "{colors.paper}"
    typography: "{typography.label}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: ".625rem .75rem"
  navigation:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
  card-stage:
    textColor: "{colors.paper}"
    rounded: "{rounded.stage}"
  model-card:
    backgroundColor: "{colors.lineup}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
---

# Design System: Crossbell Vending

## Overview

**Creative North Star: "The Crossbell Crest"**

A direct local-service identity built from Crossbell’s existing crest, gold, lavender, and indigo. Condensed display type gives short statements presence; practical body type and generous separation keep the offer easy to scan for prospective host businesses.

The trading-card treatment extends that identity through dark surfaces, actual machine photography, and a restrained foil frame. It is a premium product expression within Crossbell, not a new brand. This document records the built system; no approved visual comp was supplied.

**Key Characteristics:**
- Crest-derived color and locally bundled typography.
- Strong condensed headings with plain, readable service copy.
- Ruled lists and tonal sections rather than a page full of raised cards.
- Actual installation and supplier imagery with clear captions.
- Gold actions and visible keyboard focus on both light and dark surfaces.

## Colors

Warm crest gold provides the action color; cool lavender and indigo support both paper and dark presentations. Frontmatter values are normative.

### Primary
- **Crest Gold** (`accent`): primary actions, selected navigation rules, and foil accents.
- **Deep Gold** (`accent-dim`): supporting arrows, step numbers, and light-surface hover text.
- **Action Gold** (`accent-hover`): filled-action hover state.

### Secondary
- **Crest Indigo** (`indigo`): major service surfaces, dark closing sections, and focus on light backgrounds.
- **Layered Indigo** (`indigo-2`): dark dividers, product-stage depth, and foil transitions.
- **Crest Lavender** (`lavender`): supporting copy on dark surfaces, selected text, and the header rule.
- **Pale Lavender** (`lavender-tint`): local-service and contact sections, mobile navigation selection.

### Neutral
- **Ink** (`ink`): default text and trading-card background.
- **Cool Paper** (`paper`): page background and principal dark-surface text.
- **White** (`white`): navigation and form panels.
- **Soft Rule** (`line`): light-surface dividers and field strokes.
- **Muted Ink** (`muted`): secondary copy on light surfaces.
- **Lineup Backing** (`lineup`): the trading-card lineup section and repeated machine figures; currently a local literal rather than a global custom property.

**The Crest Continuity Rule.** Extend the existing gold, lavender, indigo, ink, and paper relationships when adding a surface. Supplier-photo mint backgrounds and example wraps belong to the photography, not the brand palette.

## Typography

Display uses Barlow Condensed at semibold and bold weights. Body and controls use IBM Plex Sans. IBM Plex Mono is reserved for utility details such as the phone number. All are existing local Fontsource imports.

- **Display:** homepage headline uses the frontmatter display role; below the main split breakpoint it changes to `clamp(3rem, 10vw, 5rem)`. The trading-card headline uses `clamp(2.7rem, 4.8vw, 4.8rem)`, bold weight, and a tight line height (`.98`).
- **Headline:** the shared section role uses balanced lines and compact leading.
- **Title:** model titles use the frontmatter title role; service-row titles are slightly smaller (`1.8rem`).
- **Body:** default copy is regular weight. Marketing paragraphs commonly use relaxed leading (`1.6–1.75`), with local measures around `41–46ch`; FAQ answers extend to `60–65ch`.
- **Label:** actions use semibold body type. Supporting formats, qualifications, and captions are smaller contextual text, not a separate display style.

**The Two-Voice Rule.** Use condensed type for headings and body type for explanations and controls. Keep mono for utility information.

## Layout

The shared marketing shell is centered with a maximum width (`1120px`), desktop side padding, and smaller mobile gutters. Shared sections use the frontmatter section spacing. Major content splits typically have generous gaps (`5rem`); the card feature uses a closer split (`4rem`).

The homepage hero is an edge-to-edge indigo/photo split. Below `900px`, major splits become one column, the product visual centers, and actions wrap. Steps and the trading-card model grid become one column below `600px`; the card lineup otherwise uses two columns. Hardware photographs use contain sizing; the real installation photo uses cover cropping.

The header has its own incumbent responsive thresholds: navigation becomes the native disclosure menu below `1280px`, its action appears from `768px`, and shell padding expands from `640px`. The fixed mobile contact bar is cleared with body padding through `720px`, including safe-area space.

## Elevation & Depth

The system is primarily flat: section color, thin rules, and typography establish hierarchy. Depth is concentrated in the dark product stage and the mobile menu rather than every content block.

- **Product frame:** diffuse black shadow (`0 24px 60px rgb(0 0 0 / .25)`) under the foil surround.
- **Mobile navigation:** soft dropdown shadow (`0 16px 36px rgba(20,20,32,0.16)`).
- **Product stage:** an indigo-to-ink radial gradient sits inside the narrow crest-colored foil border.

## Shapes

Most content panels, ruled rows, fields, and existing header/form actions are square. Shared marketing actions and the product seal have modest corners. The foil frame and inner stage use larger nested corners, distinguishing the machine showcase without changing the rest of the site.

Keep images proportional. Preserve source photography, example wraps, and their embedded colors rather than treating them as UI decoration.

## Components

### Buttons and links
Primary marketing actions are solid gold with ink text, a minimum height (`48px`), and a short background transition (`180ms ease-out`). Existing header/form actions use square corners and a slightly denser minimum height (`44px`). The feedback action has an ink outline and inverts on hover.

Text links have a gold underline, visible offset (`5px`), and a minimum height (`44px`); dark variants use paper text. On hover the underline takes the text color. Decorative arrows accompany explicit text labels.

### Navigation
The white sticky header uses the existing crest, a lavender lower rule, and a gold rule under the current page. The mobile menu uses semantic `details/summary`, a bordered white dropdown, and a pale-lavender selected/open state.

### Fields
Visible labels sit above square paper-colored inputs with soft strokes. Main inquiry fields use larger body text (`1.0625rem`), comfortable padding, and indigo focus treatment. The existing compact feedback form has white fields. Retain native form semantics.

### Lists, model cards, and disclosures
Service rows are divided by thin rules. Hover adds a heading underline and a small arrow translation (`4px`). Model cards are open compositions on lineup backing: large contained machine photo, title, two facts, then a native dimensions disclosure. FAQs use native disclosures and ruled separation; the shared light FAQ rotates its inline plus icon when open.

### Trading-card showcase
The reusable card feature pairs copy with an actual VTM machine in a narrow gradient frame (`2px`). The image remains a square, contained photograph; the caption identifies example wraps and products. The seal is a small dark bordered caption inside the frame.

A foil sweep and gentle image scale (`1.015`) run only on hover-capable devices with no reduced-motion preference. The sweep lasts `1100ms`; image easing lasts `700ms`, both using `cubic-bezier(.16,1,.3,1)`. There is no continuous foil animation.

**The Motion Restraint Rule.** Keep foil as a hover response. Honor reduced motion: the built global override minimizes animation and transitions, disables smooth scrolling, and the machine image explicitly removes its transition.

### Focus
The default visible focus is an indigo outline (`3px`) with a small offset (`2px`). Dark surfaces switch the outline to gold. Preserve focus visibility when adding a control or interactive surface.

## Do's and Don'ts

### Do:
- **Do** reuse the crest palette, existing fonts, shared shell, and gold primary actions.
- **Do** use real photography and identify supplier examples clearly.
- **Do** preserve contained hardware images, visible focus, native disclosures, and reduced-motion behavior.
- **Do** use the dark trading-card treatment as an extension of Crossbell’s identity.

### Don't:
- **Don't** replace the brand palette with mint or colors embedded in supplier wraps.
- **Don't** turn the foil treatment into continuous ambient animation.
- **Don't** spread the showcase’s large rounded frame and shadow across ordinary ruled content.
- **Don't** imply that supplier example photography documents a Crossbell installation.
