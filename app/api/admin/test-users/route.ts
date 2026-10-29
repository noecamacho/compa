import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { createTestUsers, listTestUsers } from "@/lib/server/test-users";

export const GET = defineRoute(routes.listTestUsers, listTestUsers);
export const POST = defineRoute(routes.createTestUsers, createTestUsers);
