import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { createConnection, listConnections } from "@/lib/server/connections";

export const GET = defineRoute(routes.listConnections, listConnections);
export const POST = defineRoute(routes.createConnection, createConnection);
