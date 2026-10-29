import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { approveSummary } from "@/lib/server/summaries";

export const POST = defineRoute(routes.approveSummary, approveSummary);
