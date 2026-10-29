import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { authEmail } from "@/lib/server/auth-routes";

export const POST = defineRoute(routes.authEmail, authEmail);
