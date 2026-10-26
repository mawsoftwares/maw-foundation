---
"@mawsoftwares/ui-web": minor
---

Add `useUrlSyncedPage` (plus `pageFromPathname`, `pathnameForPage`, `stripBase`) to keep the browser address bar in step with the active page: pushes the page's URL on change, restores the page from the URL on load, and follows back/forward. Honours a deploy base path. Additive; existing exports are unchanged.
