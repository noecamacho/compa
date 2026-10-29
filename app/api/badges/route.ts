import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { listBadges } from "@/lib/server/badges";

export const GET = defineRoute(routes.listBadges, listBadges);
