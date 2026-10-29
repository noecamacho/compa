import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { declineConnection } from "@/lib/server/connections";

export const POST = defineRoute(routes.declineConnection, declineConnection);
