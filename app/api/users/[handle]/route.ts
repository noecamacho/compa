import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { getUser } from "@/lib/server/profile";

export const GET = defineRoute(routes.getUser, getUser);
