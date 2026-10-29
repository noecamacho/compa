import { EventNotFound } from "@/components/event/EventNotFound";
import { requestLocale } from "@/lib/server/locale";

export default async function EventCodeNotFound() {
  return <EventNotFound locale={await requestLocale()} />;
}
