import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { liveSnapshot } from "@/lib/server/live";

export const GET = defineRoute(routes.liveSnapshot, liveSnapshot);
