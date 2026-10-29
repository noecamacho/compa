import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";
import { claimInvite } from "@/lib/server/invites";

export const POST = defineRoute(routes.claimInvite, claimInvite);
