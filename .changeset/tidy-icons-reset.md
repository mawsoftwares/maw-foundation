---
"@mawsoftwares/ui-web-tailwind": patch
---

Tailwind kit parity fixes. `Icon` now knows `building-2` (it rendered as raw text, e.g. the Clients sidebar item). `theme.css` adds a minimal `button` reset in the `base` layer, so DataTable sort headers and the other utility-styled buttons no longer show the browser's default border/background in apps that load Tailwind without preflight.
