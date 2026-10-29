import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { acceptConnection } from "@/lib/server/connections";

export const POST = defineRoute(routes.acceptConnection, acceptConnection);
