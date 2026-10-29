import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { createEvent, listAdminEvents } from "@/lib/server/admin-events";

export const GET = defineRoute(routes.listAdminEvents, listAdminEvents);
export const POST = defineRoute(routes.createEvent, createEvent);
