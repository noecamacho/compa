import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { adminStats } from "@/lib/server/admin-stats";

export const GET = defineRoute(routes.adminStats, adminStats);
