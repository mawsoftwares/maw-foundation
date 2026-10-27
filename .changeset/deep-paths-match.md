---
"@mawsoftwares/ui-web": minor
---

URL sync now handles inner pages. `matchPagePath` / `pageFromPathname` resolve by longest menu-path prefix (`/users/42` -> `users` + `['42']`), and `useUrlSyncedPage` leaves an inner path alone while the page is unchanged and re-resolves a deep link once the menu tree loads. New helpers: `usePageSubPath(page, base, entries)` (read/write the inner path), `useSearchParams()` (read/update the query string) and `applySearchParams`. Behaviour change: changing page now drops the previous page's query string (it is kept only when replacing the root URL).
