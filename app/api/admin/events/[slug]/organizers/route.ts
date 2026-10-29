import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { listOrganizers, setOrganizer } from "@/lib/server/admin-people";

export const GET = defineRoute(routes.listOrganizers, listOrganizers);
export const POST = defineRoute(routes.setOrganizer, setOrganizer);
