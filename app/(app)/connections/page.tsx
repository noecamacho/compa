import { ConnectionList as List } from "@/components/connections/ConnectionList";
import { Screen } from "@/components/ui/Screen";
import { ConnectionList, Me } from "@/lib/api/schemas";
import { apiGet } from "@/lib/api/server-fetch";

// 07 Conexiones: everyone I connected with, searchable, filtered by type, narrowed to the current event with its chip.
export default async function ConnectionsPage() {
  const [me, list] = await Promise.all([apiGet("/api/me", Me), apiGet("/api/connections", ConnectionList)]);
  // The chip filters by event slug; the current event's slug is the one its accepted meetings carry.
  const slug = list.people.flatMap((entry) => entry.meetings).find((meeting) => me.currentEvent && meeting.event.name === me.currentEvent.name)?.event.slug;
  const event = me.currentEvent ? { slug: slug ?? "", name: me.currentEvent.name } : null;
  return (
    <Screen dock>
      <List people={list.people} event={event} />
    </Screen>
  );
}
