import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { draftSummary } from "@/lib/server/summaries";

export const maxDuration = 30;

export const POST = defineRoute(routes.draftSummary, draftSummary);
