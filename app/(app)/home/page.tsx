import Link from "next/link";
import { Suspense } from "react";
import { AlertsBell, IncomingRequests } from "@/components/home/IncomingRequests";
import { InviteCard } from "@/components/home/InviteCard";
import { LiveCard } from "@/components/home/LiveCard";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Tour } from "@/components/tour/Tour";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, EventDoor, Invites, LiveRecent, Me, Notifications, type ConnectionListT, type EventDoorT, type LiveRecentT } from "@/lib/api/schemas";
import { apiGet, apiGetSafe } from "@/lib/api/server-fetch";
import { copyFor, type Dictionary } from "@/lib/copy";
import { firstName } from "@/lib/format";
import { requestLocale } from "@/lib/server/locale";
import type { MonitoLook } from "@/lib/monito/look";
import { StickyBar } from "@/components/ui/StickyBar";

type Props = { searchParams: Promise<{ demo?: string }> };

const NO_CONNECTIONS: ConnectionListT = { incoming: [], people: [], totals: { points: 0, connections: 0, people: 0 } };

type Live = { recent: LiveRecentT; event: EventDoorT };

// The live card needs the current event; its code comes from /api/me (API spec A10). It reads the door (counters) and
// the newest pairs, never the full big-screen snapshot. A failure hides the card, not the whole screen.
async function loadLive(code: string | undefined): Promise<Live | null> {
  if (!code) return null;
  const [recent, event] = await Promise.all([apiGetSafe(`/api/e/${code}/live/recent`, LiveRecent), apiGetSafe(`/api/e/${code}`, EventDoor)]);
  return recent && event ? { recent, event } : null;
}

function NoEventCard({ home }: { home: Dictionary["home"] }) {
  return (
    <Card tone="sky-soft" className="flex flex-col gap-1 px-4 py-[14px]">
      <span className="font-display text-[20px] leading-[1.1] font-bold">{home.noEventTitle}</span>
      <span className="text-[13px] font-extrabold">{home.noEventHint}</span>
    </Card>
  );
}

// 03 Inicio and 03b InicioVacio: one page, the empty branch when the person has no connections yet.
export default async function HomePage({ searchParams }: Props) {
  const { demo } = await searchParams;
  // `?demo=empty` previews the first-night state in mock mode.
  const me = await apiGet("/api/me", Me, demo === "empty" ? { mockExample: "empty" } : {});
  const [live, listOrNull, invites, notificationList, locale] = await Promise.all([
    loadLive(me.currentEvent?.code),
    apiGetSafe("/api/connections", ConnectionList),
    apiGetSafe("/api/invites/me", Invites),
    apiGetSafe("/api/notifications", Notifications),
    requestLocale(),
  ]);
  const { home, tour } = copyFor(locale);
  const list = listOrNull ?? NO_CONNECTIONS;
  const demoEmpty = demo === "empty";
  const empty = demoEmpty || list.totals.connections === 0;
  const looks = new Map<string, MonitoLook | undefined>(list.people.map((entry) => [entry.person.id, entry.person.avatar]));
  // Only the mock preview blanks real data; a first-night person (no connections yet) still sees requests and invitees.
  const incoming = demoEmpty ? [] : list.incoming;
  return (
    <Screen dock>
      <StickyBar className="flex items-center justify-between">
        <Link href="/me" className="flex items-center gap-3 tappable">
          <Avatar person={avatarOf(me)} size={46} shadow={3} />
          <h1 className="m-0 font-display text-[24px] leading-none font-bold">{home.hello(firstName(me.name))}</h1>
        </Link>
        <AlertsBell initial={notificationList?.unseenCount ?? 0} locale={locale} />
      </StickyBar>

      <IncomingRequests initial={incoming} />

      {/* Phone: one column. From 834: the live card on the left, Conectar (grown into a tall tile) and the invite on the right. */}
      <div className="flex flex-col gap-[14px] md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-stretch lg:gap-5">
        <div data-tour="live">
          {live ? <LiveCard recent={live.recent} event={live.event} me={me} looks={looks} empty={empty} /> : <NoEventCard home={home} />}
        </div>

        <div className="flex flex-col gap-[14px] lg:gap-5">
          <div data-tour="connect" className="md:flex-1">
            <Card
              href="/connect"
              tone="mint"
              className="relative flex items-center gap-[14px] px-4 py-[14px] md:h-full md:min-h-[180px] md:flex-col md:items-start md:justify-end md:gap-3 md:p-5"
            >
              {empty && (
                <Pill tone="sun" rotate={4} className="absolute top-[-14px] right-[14px]" aria-hidden="true">
                  {home.startHere}
                </Pill>
              )}
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-button bg-white border-ink shadow-hard-2 md:h-[72px] md:w-[72px]"
                style={{ transform: "rotate(-5deg)" }}
              >
                <Icon name="qr" size={30} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px] md:flex-none">
                <span className="font-display text-[24px] leading-[1.05] font-bold md:text-[30px]">{home.connect}</span>
                <span className="text-[13px] font-extrabold md:text-[14px]">{empty ? home.connectHintEmpty : home.connectHint}</span>
              </span>
              <span className="flex md:absolute md:top-5 md:right-5">
                <Icon name="chevronRight" size={20} strokeWidth={3} />
              </span>
            </Card>
          </div>

          {invites && (
            <div data-tour="invite">
              <InviteCard invites={demoEmpty ? { ...invites, invitees: [] } : invites} />
            </div>
          )}
        </div>
      </div>

      <Suspense>
        <Tour id="home" steps={tour.home} />
      </Suspense>
    </Screen>
  );
}
