import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { signOut } from "@/lib/server/auth-routes";

export const POST = defineRoute(routes.signOut, signOut);
