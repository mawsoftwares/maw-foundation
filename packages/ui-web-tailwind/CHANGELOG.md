# @mawsoftwares/ui-web-tailwind

## 0.1.1

### Patch Changes

- a020328: Tailwind kit parity fixes. `Icon` now knows `building-2` (it rendered as raw text, e.g. the Clients sidebar item). `theme.css` adds a minimal `button` reset in the `base` layer, so DataTable sort headers and the other utility-styled buttons no longer show the browser's default border/background in apps that load Tailwind without preflight.

## 0.1.0

### Minor Changes

- 639d135: First public release of the Tailwind + shadcn-style UI kit (`tailwindKit`, components and `theme.css`). Install it with `setUIKit(tailwindKit)` from `@mawsoftwares/ui-contract`; requires a single shared `@mawsoftwares/ui-contract` copy with `@mawsoftwares/ui-web`.
