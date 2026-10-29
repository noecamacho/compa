// Human API reference: Scalar, pinned, loaded from jsDelivr; it reads /api/openapi.json.
const SCALAR = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.74.0";

const HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>COMPA API</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="${SCALAR}"></script>
    <script>Scalar.createApiReference("#app", { url: "/api/openapi.json", hideClientButton: false });</script>
  </body>
</html>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
