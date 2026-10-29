import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { leaderboard } from "@/lib/server/live";

export const GET = defineRoute(routes.leaderboard, leaderboard);
