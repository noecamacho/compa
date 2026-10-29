import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { searchUsers } from "@/lib/server/profile";

export const GET = defineRoute(routes.searchUsers, searchUsers);
