# Screen 2 — Home `/me` (p. 5)

## Content

- Large QR code encoding `https://<domain>/c/<handle>`, with the handle and code below it.
- An `@` search box to connect with someone (P1, see [mvp-scope](../mvp-scope.md)).
- Own counter: connections and points.

## Acceptance criteria (p. 5)

- The QR scans with the native iPhone and Android camera and opens the correct URL.
- The screen loads in under 1 s on 4G.

The domain is a placeholder in the plan; see [open-questions](../open-questions.md). QR generation uses the `qrcode` library; scanning uses the native camera, no in-app scanner ([architecture-stack](../architecture-stack.md), p. 8).
