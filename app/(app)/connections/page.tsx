import { ConnectionList as List } from "@/components/connections/ConnectionList";
import { IncomingRequests } from "@/components/home/IncomingRequests";
import { Icon } from "@/components/icons";
import { Chip } from "@/components/ui/Chip";
import { IconButton } from "@/components/ui/IconButton";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";
import { requestCopy } from "@/lib/server/locale";
import { StickyBar } from "@/components/ui/StickyBar";

type Props = { searchParams: Promise<{ demo?: string }> };

// 07 Conexiones: everyone I connected with, filtered by type, scoped to the current event chip.
// `?demo=empty` previews the first-night state in mock mode, like Home.
export default async function ConnectionsPage({ searchParams }: Props) {
  const copy = (await requestCopy()).copy.connections;
  const { demo } = await searchParams;
  const [me, list] = await Promise.all([apiGet("/api/me", Me), apiGet("/api/connections", ConnectionList)]);
  const people = demo === "empty" ? [] : list.people;
  return (
    <Screen dock>
      <StickyBar className="flex items-center justify-between">
        <h1 className="m-0 font-display text-[28px] leading-[1.1] font-bold">{copy.title}</h1>
        <IconButton label={copy.search}>
          <Icon name="search" size={20} />
        </IconButton>
      </StickyBar>
      {me.currentEvent && (
        <Chip className="self-start px-3 text-[13px]">
          <Icon name="calendar" size={15} />
          {me.currentEvent.name}
          <Icon name="chevronDown" size={14} strokeWidth={3} />
        </Chip>
      )}
      {/* Requests waiting for my answer come first (A7); polled so new ones appear within seconds. */}
      <IncomingRequests initial={demo === "empty" ? [] : list.incoming} />
      <List people={people} />
    </Screen>
  );
}
