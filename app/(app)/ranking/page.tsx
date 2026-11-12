import { RankingView } from "@/components/ranking/RankingView";
import { Header } from "@/components/ui/Header";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { Leaderboard, Me, type LeaderboardT } from "@/lib/api/schemas";
import { apiGet, apiGetSafe } from "@/lib/api/server-fetch";
import { requestCopy } from "@/lib/server/locale";

const NO_BOARD: LeaderboardT = { rows: [] };

// Boards are reached through the current event's access code (API spec A10); out of an event they are empty.
async function loadBoards(code: string | undefined): Promise<[LeaderboardT, LeaderboardT]> {
  if (!code) return [NO_BOARD, NO_BOARD];
  // A failed board renders empty instead of the error page.
  const [event, lifetime] = await Promise.all([
    apiGetSafe(`/api/e/${code}/leaderboard?scope=event`, Leaderboard),
    apiGetSafe(`/api/e/${code}/leaderboard?scope=lifetime`, Leaderboard, { mockExample: "lifetime" }),
  ]);
  return [event ?? NO_BOARD, lifetime ?? NO_BOARD];
}

// 11 Ranking: both scopes are loaded up front so the toggle is instant.
export default async function RankingPage() {
  const { common, ranking: copy } = (await requestCopy()).copy;
  const me = await apiGet("/api/me", Me);
  const [event, lifetime] = await loadBoards(me.currentEvent?.code);
  return (
    <Screen gap={12}>
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
      <RankingView me={me} boards={{ event, lifetime }} />
    </Screen>
  );
}
