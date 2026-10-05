# Color

Source: `src/tokens/color.ts`. Two layers:

- `colorPrimitives` — the raw palette, transcribed from a W3C
  design-tokens export of the "Ives" Figma file's global color variables
  (`ives-global-colors.json` — not read at build time).
- `color` — the semantic layer components should actually use, ported
  from `Color-Tokens/Light.tokens.json` and `Color-Tokens/Dark.tokens.json`
  (Figma's Light/Dark modes for the same semantic collection). This is a
  full light/dark theme, not a single flat palette — see "Theming" below.

If the palette changes in Figma, re-export and update `color.ts` by hand.

## Primitives (avoid referencing directly in components)

`colorPrimitives.brand` holds the three hues Ives is actually built from,
each a 50–900 scale:

| Family                        | Role      | Anchor step           |
| ----------------------------- | --------- | --------------------- |
| `brand.ivesBlue`              | Primary   | `900` (`#0E5271`)     |
| `brand.brownBearTracks`       | Secondary | `700` (`#530E00`)     |
| `brand.beebeLake`             | Analogous | `800` (`#0E715F`)     |
| `brand.white` / `brand.black` | —         | `#FFFFFF` / `#121212` |

`brand.white`/`brand.black` are nested under `brand` (not top-level
`white`/`black`) on purpose — that avoids silently overriding Tailwind's
own `white`/`black` utilities for `ives/tailwind` consumers, since Ives'
black isn't pure black.

The rest are generic/utility scales (also 50–900) that ship alongside the
brand hues, for status colors, charts, and anything that isn't the brand
itself:

- `darkBlue` (analogous), `violet` (triadic), `pink` (triadic) — extended
  brand-adjacent hues
- `gray` — the single neutral scale
- `green`, `blue`, `yellow`, `red` — status/utility hues

`colorPrimitives.category` is a set of flat, single-value swatches (not
scales) for chart/data categories: `lightGreen`, `darkGreen`, `neonGreen`,
`successGreen`, `limeGreen`, `brown`, `beige`, `red`, `orange`.

Reach for a primitive only when building a new semantic token, not inside
component code — that's what keeps re-theming a one-file change. (The
[Loader](../components/loader.md)'s gradient is the one exception: it's a
decorative brand-colored SVG gradient with no matching semantic concept,
so it reads `colorPrimitives.brand.ivesBlue` directly.)

### Transparency

Figma also exports a large "Transparent" tree (every primitive at various
named alphas, e.g. "Transparent/Brand/Ives Blue/a24"). None of that is
transcribed as static values — every entry there is mathematically just a
primitive above at a reduced alpha, so `color.ts` exports a `withAlpha()`
helper instead:

```ts
import { colorPrimitives, withAlpha } from "ives";

withAlpha(colorPrimitives.brand.ivesBlue[900], 24); // "#0E527140" — same as
// Figma's "Transparent/Brand/Ives Blue/a24"
```

`alphaPercent` is 0–100, matching Figma's own `aNN` naming, so translating
a Figma "Transparent/…/aNN" reference is a direct 1:1 call. The semantic
layer's own translucent tokens (below) are built the same way.

## Semantic tokens (use these in components)

`color` is organized by **what's being colored**, then **intent**, then a
small fixed set of **levels**. The level names mean the same thing in every
group, so once you know the vocabulary you can guess any token:

| Level                           | Where          | Meaning                                                     |
| ------------------------------- | -------------- | ----------------------------------------------------------- |
| `fill` / `fillHover`            | `background.*` | Solid intent fill — a solid badge, chip, or indicator       |
| `subtle` / `subtleHover`        | `background.*` | Soft tinted fill — an alert, soft badge, selected row       |
| `onFill` / `onSubtle`           | `foreground.*` | Text/icon color to put **on top of** those two fills        |
| `default` / `secondary`         | `foreground.*` | Intent-colored text/icons at two strengths                  |
| `default` / `subtle` / `strong` | `border`       | Neutral border weights                                      |
| `solid` / `soft` / `ghost`      | `button.*`     | Button variants, with `onSolid` / `onSoft` for their labels |

### Groups

**`background`** — neutral surfaces come first, as a layer stack: `canvas`
(page) → `surface` (cards, sheets; plus `surfaceHover`, `surfaceSecondary`
for a secondary panel) → `overlay` / `overlayHover` / `overlayPressed`
(translucent tints that sit on any surface — use these for hover and
pressed states instead of picking a separate hover color per surface).
Then one sub-group per intent — `neutral`, `brand`, `success`, `warning`,
`danger` (`fill`, `fillHover`, `subtle`, `subtleHover`) and `info`
(`subtle`, `subtleHover` only — info never appears as a solid fill). Plus
`disabled`.

**`foreground`** — text and icons share one set. `default` / `secondary` /
`tertiary` is the neutral text hierarchy, plus `disabled`, `onDisabled`
(on a disabled fill), and `onOverlay` (on a scrim). Then per intent —
`neutral`, `brand`, `success`, `warning`, `danger` — `default`,
`secondary`, `onFill`, `onSubtle`; `info` has `default` only.

**`border`** — `default` / `subtle` / `strong`, `divider` (translucent, works
on any surface), `disabled`, then per intent (`neutral`, `brand`, `info`,
`success`, `warning`, `danger`) `default` / `subtle`.

**`button`** — the one component with its own fills, because they're
translucent "glass" rather than the solid `background.*` fills. `primary`,
`neutral`, `success`, `warning`, `danger`, each with `solid` / `soft` /
`ghost` and `onSolid` / `onSoft`. A ghost button's label is
`foreground.<intent>.default`; a disabled button is `background.disabled`

- `foreground.onDisabled`.

**`chart`** — `category1` … `category9`, categorical series colors.

**`measurement`** — `background` / `foreground` / `border` for the
measurement / annotation tool.

Every leaf is `{ light: "#hex", dark: "#hex" }` — e.g.:

```ts
color.background.brand.fill;
// { light: "#1A81A4", dark: "#197092" }

color.foreground.danger.onFill;
// { light: "#FEEBEE", dark: "#FEEBEE" }
```

### Theming

**Don't read `.light`/`.dark` directly in a component** — that bakes in
one mode. Use the generated CSS variable or Tailwind class instead, both
of which switch automatically with `[data-theme]` / `prefers-color-scheme`:

```css
@import "ives/css";

.card {
  background: var(--color-background-surface);
  color: var(--color-foreground-default);
  border: 1px solid var(--color-border-default);
}
```

```tsx
// tailwind.config.ts extends ives/tailwind, so:
<div className="bg-background-surface text-foreground-default" />
```

To opt an app into an explicit theme rather than following the OS, set
`data-theme="light"` or `data-theme="dark"` on `<html>` (or another
ancestor) — `ives/css` reacts to both that attribute and
`prefers-color-scheme` automatically, with the attribute taking priority.

## Tokens used

- [Loader](../components/loader.md) uses `colorPrimitives.brand.ivesBlue`
  directly (a decorative gradient, not a semantic color).
