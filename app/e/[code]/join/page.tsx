import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { JoinConsent } from "@/components/event/JoinConsent";
import { eventPath } from "@/lib/access-code";
import { currentMe } from "@/lib/server/current-event";
import { loadEventDoor } from "@/lib/server/event-door";
import { requestLocale } from "@/lib/server/locale";

type Props = { params: Promise<{ code: string }> };

// Where LinkedIn sign-in returns from the event door: the screen notice, then check-in, then the app home.
export default async function JoinEventPage({ params }: Props) {
  const { code } = await params;
  const [event, locale, me] = await Promise.all([loadEventDoor(code), requestLocale(), currentMe()]);
  if (!event) notFound();
  if (!me) redirect(`/auth/linkedin?next=${encodeURIComponent(`${eventPath(event.code)}/join`)}`);
  // Mock mode: everyone is Diego, already checked in; keep the screen reachable for the demo.
  if (me.currentEvent?.code === event.code && process.env.API_MODE !== "mock") redirect("/home");
  if (!event.isRunning) redirect(eventPath(event.code));
  return (
    <main lang={locale} className="paper-dots flex min-h-dvh w-full flex-col items-center px-[18px] pt-12 pb-8 sm:px-8">
      <div className="flex w-full max-w-[480px] flex-1 flex-col gap-6">
        <Logo />
        <JoinConsent code={event.code} eventName={event.name} person={{ name: me.name, look: me.avatar }} locale={locale} />
      </div>
    </main>
  );
}
