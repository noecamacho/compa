// Writes openapi.json at the repository root so agents can read the contract without a server.
import { buildOpenApiDocument } from "../lib/api/openapi";

const path = new URL("../openapi.json", import.meta.url);
await Bun.write(path, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`wrote ${path.pathname}`);
