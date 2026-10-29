import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { liveRecent } from "@/lib/server/live-recent";

export const GET = defineRoute(routes.liveRecent, liveRecent);
