import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { transcribe } from "@/lib/server/summaries";

export const maxDuration = 30;

export const POST = defineRoute(routes.transcribe, transcribe);
