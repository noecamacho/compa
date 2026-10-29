import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { patchVisibility } from "@/lib/server/profile";

export const PATCH = defineRoute(routes.patchVisibility, patchVisibility);
