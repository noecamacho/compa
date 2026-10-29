import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { getConnection } from "@/lib/server/connection-detail";

export const GET = defineRoute(routes.getConnection, getConnection);
