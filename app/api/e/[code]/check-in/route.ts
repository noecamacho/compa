import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { checkIn } from "@/lib/server/events";

export const POST = defineRoute(routes.checkIn, checkIn);
