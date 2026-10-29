import { defineRoute } from "@/lib/api/define-route";
import * as routes from "@/lib/api/routes";

// Mock-only until the V2 points model lands; real mode answers 501 not_implemented.
export const POST = defineRoute(routes.claimInvite);
