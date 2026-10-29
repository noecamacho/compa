import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { getEvent } from "@/lib/server/events";

export const GET = defineRoute(routes.getEvent, getEvent);
