import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { getMe, patchMe } from "@/lib/server/profile";

export const GET = defineRoute(routes.getMe, getMe);
export const PATCH = defineRoute(routes.patchMe, patchMe);
