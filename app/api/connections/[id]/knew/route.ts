import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { setKnew } from "@/lib/server/connections";

export const PATCH = defineRoute(routes.setKnew, setKnew);
