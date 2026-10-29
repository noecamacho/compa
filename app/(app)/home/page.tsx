import Link from "next/link";
import { InviteCard } from "@/components/home/InviteCard";
import { LiveCard } from "@/components/home/LiveCard";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Pill } from "@/components/ui/Pill";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, EventDoor, Invites, LiveSnapshot, Me, type ConnectionListT, type EventDoorT, type LiveSnapshotT } from "@/lib/api/schemas";
import { apiGet, apiGetSafe } from "@/lib/api/server-fetch";
import { home } from "@/lib/copy/es";
import { firstName } from "@/lib/format";
import type { MonitoLook } from "@/lib/monito/look";

type Props = { searchParams: Promise<{ demo?: string }> };

const NO_CONNECTIONS: ConnectionListT = { incoming: [], people: [], totals: { points: 0, connections: 0, people: 0 } };

type Live = { snapshot: LiveSnapshotT; event: EventDoorT };

// The live card needs the current event; its code comes from /api/me (API spec A10).
async function loadLive(code: string | undefined): Promise<Live | null> {
  if (!code) return null;
  const [snapshot, event] = await Promise.all([apiGetSafe(`/api/e/${code}/live`, LiveSnapshot), apiGetSafe(`/api/e/${code}`, EventDoor)]);
  return snapshot && event ? { snapshot, event } : null;
}

function NoEventCard() {
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
  // Only /api/me is critical; every other section renders empty when its call fails.
  const [live, listOrNull, invites] = await Promise.all([
    loadLive(me.currentEvent?.code),
    apiGetSafe("/api/connections", ConnectionList),
    apiGetSafe("/api/invites/me", Invites),
  ]);
  const list = listOrNull ?? NO_CONNECTIONS;
  const empty = demo === "empty" || list.totals.connections === 0;
  const looks = new Map<string, MonitoLook | undefined>(list.people.map((entry) => [entry.person.id, entry.person.avatar]));
  const alerts = list.incoming.length;
  return (
    <Screen dock>
      <div className="flex h-[46px] items-center justify-between">
        <Link href="/me" className="flex items-center gap-3">
          <Avatar person={{ name: me.name, look: me.avatar }} size={46} shadow={3} />
          <span className="font-display text-[24px] leading-none font-bold">{home.hello(firstName(me.name))}</span>
        </Link>
        <IconButton label={home.alerts(empty ? 0 : alerts)} className="relative">
          <Icon name="bell" />
          {!empty && alerts > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-[-9px] right-[-9px] flex h-[22px] w-[22px] items-center justify-center rounded-full bg-coral font-display text-[11px] font-bold border-ink"
            >
              {alerts}
            </span>
          )}
        </IconButton>
      </div>

      {live ? <LiveCard snapshot={live.snapshot} me={me} endsAt={live.event.endsAt} looks={looks} empty={empty} /> : <NoEventCard />}

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

      {invites && <InviteCard invites={empty ? { ...invites, invitees: [] } : invites} />}
    </Screen>
  );
}
