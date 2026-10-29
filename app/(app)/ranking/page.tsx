import { RankingView } from "@/components/ranking/RankingView";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, Leaderboard, Me, type LeaderboardT } from "@/lib/api/schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";
import { common, ranking as copy } from "@/lib/copy/es";
import type { MonitoLook } from "@/lib/monito/look";

const EMPTY_BOARD: LeaderboardT = { rows: [] };

// Outside an event (or before it is seeded) the ranking renders empty instead of crashing (gap analysis P0-4).
async function boardFor(slug: string | null, scope: "event" | "lifetime"): Promise<LeaderboardT> {
  if (!slug) return EMPTY_BOARD;
  const options = scope === "lifetime" ? { mockExample: "lifetime" } : {};
  return (await apiGetOrNull(`/api/events/${slug}/leaderboard?scope=${scope}`, Leaderboard, options)) ?? EMPTY_BOARD;
}

// 11 Ranking: both scopes are loaded up front so the toggle is instant.
export default async function RankingPage() {
  const me = await apiGet("/api/me", Me);
  const slug = me.currentEvent?.slug ?? (process.env.API_MODE === "mock" ? "founders-fest" : null);
  const [event, lifetime, list] = await Promise.all([boardFor(slug, "event"), boardFor(slug, "lifetime"), apiGet("/api/connections", ConnectionList)]);
  // Monito looks and handles come from my connections; strangers on the podium show the default monito.
  const looks: Record<string, MonitoLook | undefined> = { [me.id]: me.avatar };
  const handles: Record<string, string> = { [me.id]: me.handle };
  for (const entry of list.people) {
    looks[entry.person.id] = entry.person.avatar;
    handles[entry.person.id] = entry.person.handle;
  }
  return (
    <Screen gap={12} className="pb-6">
      <Header
        back="/home"
        title={copy.title}
        titleSize={22}
        right={
          <Pill tone="coral" height={30} shadow={false} className="rounded-[10px]">
            <span className="h-[7px] w-[7px] rounded-full bg-white" style={{ border: "1.5px solid #1E1B2E" }} />
            {common.liveShort}
          </Pill>
        }
      />
      <RankingView me={me} boards={{ event, lifetime }} looks={looks} handles={handles} />
    </Screen>
  );
}
