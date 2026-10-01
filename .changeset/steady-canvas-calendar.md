---
'@robot-admin/naive-ui-components': patch
---

Make image crop exports use one canvas snapshot, report failures, honor disabled state, and apply flips to the actual image. Make signature readonly mode effective, preserve imported/background images across redraws, and replace placeholder SVG output with a raster-backed SVG. Fix calendar local-date saving and reactive editable mode. Prevent stale QR renders, keep logo-bearing SVG exports consistent with previews, and relayout waterfall images by aspect ratio while suppressing duplicate infinite-load requests.
