import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { markNotificationsSeen } from "@/lib/server/notifications";

export const POST = defineRoute(routes.markNotificationsSeen, markNotificationsSeen);
