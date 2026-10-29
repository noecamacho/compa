import Link from "next/link";
import { Suspense } from "react";
import { AlertsBell, IncomingRequests } from "@/components/home/IncomingRequests";
import { InviteCard } from "@/components/home/InviteCard";
import { LiveCard, OutsideEventCard } from "@/components/home/LiveCard";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { Tour } from "@/components/tour/Tour";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, Event, Invites, LiveSnapshot, Me } from "@/lib/api/schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";
import { home, tour } from "@/lib/copy/es";
import { firstName } from "@/lib/format";
import type { MonitoLook } from "@/lib/monito/look";

type Props = { searchParams: Promise<{ demo?: string }> };

// Live data is optional: outside an event (or before the event exists) the page still renders (gap analysis U7).
async function liveFor(slug: string | null) {
  if (!slug) return { snapshot: null, event: null };
  const [snapshot, event] = await Promise.all([apiGetOrNull(`/api/events/${slug}/live`, LiveSnapshot), apiGetOrNull(`/api/events/${slug}`, Event)]);
  return { snapshot, event };
}

// 03 Inicio and 03b InicioVacio: one page, the empty branch when the person has no connections yet.
export default async function HomePage({ searchParams }: Props) {
  const { demo } = await searchParams;
  // `?demo=empty` previews the first-night state in mock mode.
  const me = await apiGet("/api/me", Me, demo === "empty" ? { mockExample: "empty" } : {});
  const slug = me.currentEvent?.slug ?? (process.env.API_MODE === "mock" ? "founders-fest" : null);
  const [{ snapshot, event }, list, invites] = await Promise.all([
    liveFor(slug),
    apiGet("/api/connections", ConnectionList),
    apiGetOrNull("/api/invites/me", Invites),
  ]);
  const empty = demo === "empty" || list.totals.connections === 0;
  const looks = new Map<string, MonitoLook | undefined>(list.people.map((entry) => [entry.person.id, entry.person.avatar]));
  const incoming = empty ? [] : list.incoming;
  return (
    <Screen dock>
      <div className="flex h-[46px] items-center justify-between">
        <Link href="/me" className="flex items-center gap-3">
          <Avatar person={{ name: me.name, look: me.avatar }} size={46} shadow={3} />
          <span className="font-display text-[24px] leading-none font-bold">{home.hello(firstName(me.name))}</span>
        </Link>
        <AlertsBell initial={incoming} />
      </div>

      <IncomingRequests initial={incoming} />

      <div data-tour="live">
        {snapshot && event ? <LiveCard snapshot={snapshot} me={me} endsAt={event.endsAt} looks={looks} empty={empty} /> : <OutsideEventCard />}
      </div>

      <div data-tour="connect">
        <Card href="/connect" tone="mint" className="relative flex items-center gap-[14px] px-4 py-[14px]">
          {empty && (
            <Pill tone="sun" rotate={4} className="absolute top-[-14px] right-[14px]" aria-hidden="true">
              {home.startHere}
            </Pill>
          )}
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-button bg-white border-ink shadow-hard-2" style={{ transform: "rotate(-5deg)" }}>
            <Icon name="qr" size={30} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="font-display text-[24px] leading-[1.05] font-bold">{home.connect}</span>
            <span className="text-[13px] font-extrabold">{empty ? home.connectHintEmpty : home.connectHint}</span>
          </span>
          <Icon name="chevronRight" size={20} strokeWidth={3} />
        </Card>
      </div>

      {invites && (
        <div data-tour="invite">
          <InviteCard invites={empty ? { ...invites, invitees: [] } : invites} />
        </div>
      )}

      <Suspense>
        <Tour id="home" steps={tour.home} />
      </Suspense>
    </Screen>
  );
}
