import "server-only";
import * as adminEventRoute from "@/app/api/admin/events/[slug]/route";
import * as adminEventsRoute from "@/app/api/admin/events/route";
import * as adminStatsRoute from "@/app/api/admin/stats/route";
import * as attendeesRoute from "@/app/api/admin/events/[slug]/attendees/route";
import * as organizersRoute from "@/app/api/admin/events/[slug]/organizers/route";
import * as testUsersRoute from "@/app/api/admin/test-users/route";
import * as adminUsersRoute from "@/app/api/admin/users/route";
import * as badgesRoute from "@/app/api/badges/route";
import * as connectionRoute from "@/app/api/connections/[id]/route";
import * as connectionsRoute from "@/app/api/connections/route";
import * as eventRoute from "@/app/api/e/[code]/route";
import * as leaderboardRoute from "@/app/api/e/[code]/leaderboard/route";
import * as liveRecentRoute from "@/app/api/e/[code]/live/recent/route";
import * as liveRoute from "@/app/api/e/[code]/live/route";
import * as claimInviteRoute from "@/app/api/invites/[code]/claim/route";
import * as myInvitesRoute from "@/app/api/invites/me/route";
import * as meRoute from "@/app/api/me/route";
import * as seenRoute from "@/app/api/notifications/seen/route";
import * as notificationsRoute from "@/app/api/notifications/route";
import * as userRoute from "@/app/api/users/[handle]/route";
import type { RouteHandler } from "../api/define-route";
import * as routes from "../api/routes";
import { matchPath, type PathParams } from "../api/match-path";
import type { AnyRouteSpec } from "../api/route-spec";

type Entry = { spec: AnyRouteSpec; handler: RouteHandler };

// The routes Server Components read. They run the exported route handler in this process instead of over HTTP, so a
// page render never waits on a second request to the same overloaded instances (conference-scale finding 5).
const ENTRIES: readonly Entry[] = [
  { spec: routes.getMe, handler: meRoute.GET },
  { spec: routes.listConnections, handler: connectionsRoute.GET },
  { spec: routes.getConnection, handler: connectionRoute.GET },
  { spec: routes.getUser, handler: userRoute.GET },
  { spec: routes.listNotifications, handler: notificationsRoute.GET },
  { spec: routes.markNotificationsSeen, handler: seenRoute.POST },
  { spec: routes.listBadges, handler: badgesRoute.GET },
  { spec: routes.getEvent, handler: eventRoute.GET },
  { spec: routes.liveSnapshot, handler: liveRoute.GET },
  { spec: routes.liveRecent, handler: liveRecentRoute.GET },
  { spec: routes.leaderboard, handler: leaderboardRoute.GET },
  { spec: routes.myInvites, handler: myInvitesRoute.GET },
  { spec: routes.claimInvite, handler: claimInviteRoute.POST },
  { spec: routes.searchUsers, handler: adminUsersRoute.GET },
  { spec: routes.listTestUsers, handler: testUsersRoute.GET },
  { spec: routes.listAdminEvents, handler: adminEventsRoute.GET },
  { spec: routes.getAdminEvent, handler: adminEventRoute.GET },
  { spec: routes.listAttendees, handler: attendeesRoute.GET },
  { spec: routes.listOrganizers, handler: organizersRoute.GET },
  { spec: routes.adminStats, handler: adminStatsRoute.GET },
];

export function findInProcessRoute(method: string, pathname: string): { handler: RouteHandler; params: PathParams } | null {
  for (const { spec, handler } of ENTRIES) {
    if (spec.method !== method.toLowerCase()) continue;
    const params = matchPath(spec.path, pathname);
    if (params) return { handler, params };
  }
  return null;
}
