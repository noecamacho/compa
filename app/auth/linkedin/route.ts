import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { authLinkedin } from "@/lib/server/auth-routes";

export const GET = defineRoute(routes.authLinkedin, authLinkedin);
