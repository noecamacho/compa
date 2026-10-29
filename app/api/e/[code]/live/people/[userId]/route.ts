import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { livePerson } from "@/lib/server/live";

export const GET = defineRoute(routes.livePerson, livePerson);
