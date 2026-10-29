import { BadgeGrid, type BadgeView } from "@/components/badges/BadgeGrid";
import { Header } from "@/components/ui/Header";
import { Screen } from "@/components/ui/Screen";
import { Muted, ProgressBar } from "@/components/ui/Text";
import { BadgeList, UserProfile, type BadgeListT } from "@/lib/api/schemas";
import { apiGetOrNull, apiGetSafe } from "@/lib/api/server-fetch";
import { BADGE_IDS, BADGE_LIST, isSecret } from "@/lib/badges/catalog";
import { badges as copy } from "@/lib/copy/es";

type Props = { searchParams: Promise<{ of?: string }> };

const HANDLE = /^[a-z0-9-]{2,32}$/;

const mine = (list: BadgeListT): BadgeView[] =>
  list.badges.map((status) => ({ id: status.id, earned: status.earnedAt !== null, note: status.earnedNote, progress: status.earnedAt ? null : status.progress }));

// Another person's shelf: the API shares which badges they earned, not how far they are on the rest.
const theirs = (earned: readonly string[]): BadgeView[] =>
  BADGE_LIST.map((badge) => ({ id: badge.id, earned: earned.includes(badge.id), note: null, progress: null }));

async function loadBadges(of: string | undefined): Promise<BadgeView[]> {
  if (of && HANDLE.test(of)) {
    const profile = await apiGetOrNull(`/api/users/${of}`, UserProfile);
    return theirs(profile?.badges ?? []);
  }
  const list = await apiGetSafe("/api/badges", BadgeList);
  return list ? mine(list) : theirs([]);
}

// 10 Insignias. `?of=<handle>` shows another person's shelf (from 08) and returns there.
export default async function BadgesPage({ searchParams }: Props) {
  const { of } = await searchParams;
  const badges = await loadBadges(of);
  const earned = badges.filter((badge) => badge.earned).length;
  const close = badges.filter((badge) => !badge.earned && badge.progress && badge.progress.current / badge.progress.total >= 0.6).length;
  const secret = badges.filter((badge) => !badge.earned && isSecret(badge.id)).length;
  return (
    <Screen className="pb-0">
      <Header back={of ? `/people/${of}` : "/me"} title={copy.title} />
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[17px] font-semibold">{copy.earned(earned, BADGE_IDS.length)}</span>
          <Muted className="text-[12px] font-extrabold">{copy.summary(close, secret)}</Muted>
        </div>
        <ProgressBar value={earned} max={BADGE_IDS.length} label={copy.barLabel} />
      </div>
      <BadgeGrid badges={badges} />
    </Screen>
  );
}
