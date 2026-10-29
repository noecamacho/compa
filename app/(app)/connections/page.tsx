import { ConnectionList as List } from "@/components/connections/ConnectionList";
import { IncomingRequests } from "@/components/home/IncomingRequests";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";

type Props = { searchParams: Promise<{ demo?: string }> };

// 07 Conexiones: everyone I connected with, searchable, filtered by type, narrowed to the current event with its chip.
// `?demo=empty` previews the first-night state in mock mode, like Home.
export default async function ConnectionsPage({ searchParams }: Props) {
  const { demo } = await searchParams;
  const [me, list] = await Promise.all([apiGet("/api/me", Me), apiGet("/api/connections", ConnectionList)]);
  const people = demo === "empty" ? [] : list.people;
  return (
    <Screen dock>
      <List
        people={people}
        eventName={me.currentEvent?.name ?? null}
        // Requests waiting for my answer come first (A7); polled so new ones appear within seconds.
        requests={<IncomingRequests initial={demo === "empty" ? [] : list.incoming} />}
      />
    </Screen>
  );
}
