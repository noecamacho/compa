import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { removeAttendee } from "@/lib/server/admin-people";

export const DELETE = defineRoute(routes.removeAttendee, removeAttendee);
