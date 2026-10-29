import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { endAdminEvent } from "@/lib/server/admin-events";

export const POST = defineRoute(routes.endAdminEvent, endAdminEvent);
