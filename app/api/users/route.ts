import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { searchPeople } from "@/lib/server/people-search";

export const GET = defineRoute(routes.searchPeople, searchPeople);
