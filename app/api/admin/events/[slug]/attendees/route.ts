import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { addAttendee, listAttendees } from "@/lib/server/admin-people";

export const GET = defineRoute(routes.listAttendees, listAttendees);
export const POST = defineRoute(routes.addAttendee, addAttendee);
