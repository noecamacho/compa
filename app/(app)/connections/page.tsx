import { notFound } from "next/navigation";
import { ConnectionList as List } from "@/components/connections/ConnectionList";
import { IncomingRequests } from "@/components/home/IncomingRequests";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, HandleSchema, Me, UserProfile } from "@/lib/api/schemas";
import { apiGet, apiGetOrNull } from "@/lib/api/server-fetch";

type Props = { searchParams: Promise<{ demo?: string; mutual?: string }> };

// 07 Conexiones: everyone I connected with, searchable, filtered by type, narrowed to the current event with its chip.
// `?demo=empty` previews the first-night state in mock mode, like Home.
export default async function ConnectionsPage({ searchParams }: Props) {
  const { demo, mutual } = await searchParams;
  const handle = HandleSchema.optional().safeParse(mutual);
  if (!handle.success) notFound();
  const [me, list, profile] = await Promise.all([
    apiGet("/api/me", Me),
    apiGet("/api/connections", ConnectionList),
    handle.data ? apiGetOrNull(`/api/users/${handle.data}`, UserProfile) : null,
  ]);
  if (handle.data && !profile) notFound();
  const people = demo === "empty" ? [] : list.people;
  return (
    <Screen dock>
      <List
        key={handle.data ?? "all"}
        people={people}
        eventName={me.currentEvent?.name ?? null}
        mutual={profile ? { name: profile.card.name, ids: (profile.relationship?.mutual ?? []).map((person) => person.id) } : undefined}
        // Requests waiting for my answer come first (A7); polled so new ones appear within seconds.
        requests={profile ? undefined : <IncomingRequests initial={demo === "empty" ? [] : list.incoming} />}
      />
    </Screen>
  );
}
