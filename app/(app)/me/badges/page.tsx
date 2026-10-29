import { BadgeGrid } from "@/components/badges/BadgeGrid";
import { Header } from "@/components/ui/Header";
import { Screen } from "@/components/ui/Screen";
import { Muted, ProgressBar } from "@/components/ui/Text";
import { BadgeList } from "@/lib/api/schemas";
import { apiGetSafe } from "@/lib/api/server-fetch";
import { BADGE_IDS, isSecret } from "@/lib/badges/catalog";
import { badges as copy } from "@/lib/copy/es";

type Props = { searchParams: Promise<{ of?: string }> };

// 10 Insignias. `?of=<handle>` comes from another person's shelf and only changes the back link for now.
export default async function BadgesPage({ searchParams }: Props) {
  const { of } = await searchParams;
  const list = (await apiGetSafe("/api/badges", BadgeList)) ?? { badges: [], earned: 0, total: BADGE_IDS.length };
  const close = list.badges.filter((status) => !status.earnedAt && status.progress && status.progress.current / status.progress.total >= 0.6).length;
  const secret = list.badges.filter((status) => !status.earnedAt && isSecret(status.id)).length;
  return (
    <Screen>
      <Header back={of ? `/people/${of}` : "/me"} title={copy.title} />
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[17px] font-semibold">{copy.earned(list.earned, list.total)}</span>
          <Muted className="text-[12px] font-extrabold">{copy.summary(close, secret)}</Muted>
        </div>
        <ProgressBar value={list.earned} max={list.total} label={copy.barLabel} />
      </div>
      <BadgeGrid badges={list.badges} />
    </Screen>
  );
}
