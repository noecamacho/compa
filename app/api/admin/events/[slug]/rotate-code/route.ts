import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { rotateEventCode } from "@/lib/server/admin-events";

export const POST = defineRoute(routes.rotateEventCode, rotateEventCode);
