import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { getAdminEvent, patchAdminEvent } from "@/lib/server/admin-events";

export const GET = defineRoute(routes.getAdminEvent, getAdminEvent);
export const PATCH = defineRoute(routes.patchAdminEvent, patchAdminEvent);
