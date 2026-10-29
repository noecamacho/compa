import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { listNotifications } from "@/lib/server/notifications";

export const GET = defineRoute(routes.listNotifications, listNotifications);
