import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { deletePushSubscription, savePushSubscription } from "@/lib/server/push";

export const POST = defineRoute(routes.savePushSubscription, savePushSubscription);
export const DELETE = defineRoute(routes.deletePushSubscription, deletePushSubscription);
