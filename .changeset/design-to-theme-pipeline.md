---
'@mawsoftwares/theme': minor
'@mawsoftwares/ui-web': minor
---

Design → Theme pipeline. `@mawsoftwares/theme` gains `designToTheme()` (adapter → normalized design → analysis → theme),
`validateTheme()` (accessibility, mismatches, confidence), `extendTheme()`/`createThemeRegistry()` for base + client overrides,
responsive and provenance tokens, component state tokens, and `theme.json`/`theme.css`/`theme.ts` export. `parseDesignMarkdown`
accepts `{ adapt: false }` (default unchanged). `@mawsoftwares/ui-web` themes Button (secondary/outline/link variants, per-variant
sizing), Input, Card (variants), Badge, Tabs, Modal, Table, Form controls; adds `ClientThemeProvider`, `BrandProvider`'s `themes`
prop, and `ThemeProbes`. Existing themes render as before unless they define the new tokens.
