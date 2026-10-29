import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { myInvites } from "@/lib/server/invites";

export const GET = defineRoute(routes.myInvites, myInvites);
