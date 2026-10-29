import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { authCallback } from "@/lib/server/auth-routes";

export const GET = defineRoute(routes.authCallback, authCallback);
