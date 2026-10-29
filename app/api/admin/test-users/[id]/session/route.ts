import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { createTestSession } from "@/lib/server/test-users";

export const POST = defineRoute(routes.createTestSession, createTestSession);
