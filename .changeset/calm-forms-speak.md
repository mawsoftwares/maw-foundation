---
'@mawsoftwares/api-client': patch
---

`getApiErrorMessage` and `getApiErrorFields` now understand the plain `{ status, message, body }` error that RTK Query's `.unwrap()` rejects with, so server messages and `details.field` reach forms instead of the generic fallback.
