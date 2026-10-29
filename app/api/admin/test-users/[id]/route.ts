import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { deleteTestUser } from "@/lib/server/test-users";

export const DELETE = defineRoute(routes.deleteTestUser, deleteTestUser);
