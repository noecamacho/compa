import Link from "next/link";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Muted } from "@/components/ui/Text";
import { PushToggle } from "@/components/notifications/PushToggle";
import { RefreshOnNotification } from "@/components/notifications/RefreshOnNotification";
import { Notifications as NotificationsSchema, type NotificationT } from "@/lib/api/schemas";
import { apiGet, apiPostQuietly } from "@/lib/api/server-fetch";
import { copyFor, formatTime } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { notificationHref, notificationText } from "@/lib/notifications/present";
import { requestLocale } from "@/lib/server/locale";

function NotificationIcon({ item }: { item: NotificationT }) {
  if (item.kind === "badge_earned") return <Icon name="trophy" size={24} />;
  return <Avatar person={{ name: item.person.name, look: item.person.avatar }} size={42} />;
}

function NotificationCard({ item, locale, all }: { item: NotificationT; locale: Locale; all: ReturnType<typeof copyFor> }) {
  const copy = all.notifications;
  return (
    <Card href={notificationHref(item)} tone={item.unseen ? "gum-soft" : "white"} size="sm" className="flex items-center gap-3 px-[14px] py-3">
      <NotificationIcon item={item} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-[15px] leading-tight font-bold">{notificationText(item, copy, all.badgeNames)}</span>
        <Muted className="text-[12px] font-bold">{formatTime(locale, item.createdAt)}</Muted>
      </span>
      {item.unseen && <span aria-label={copy.newLabel} className="h-3 w-3 shrink-0 rounded-full border-ink bg-coral" />}
    </Card>
  );
}

export default async function NotificationsPage() {
  const [locale, result] = await Promise.all([requestLocale(), apiGet("/api/notifications", NotificationsSchema)]);
  if (result.notifications[0]) {
    await apiPostQuietly("/api/notifications/seen", { seenThrough: result.notifications[0].createdAt });
  }
  const all = copyFor(locale);
  const copy = all.notifications;
  return (
    <Screen dock>
      <div className="flex items-center gap-3">
        <Link href="/home" aria-label={copy.home} className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white border-ink shadow-hard-3 pressable">
          <Icon name="back" />
        </Link>
        <h1 className="m-0 font-display text-[28px] leading-none font-bold">{copy.title}</h1>
      </div>
      <RefreshOnNotification />
      <PushToggle locale={locale} />
      {result.notifications.length === 0 ? (
        <Card tone="sky-soft" className="flex flex-col gap-1 px-4 py-[14px]">
          <span className="font-display text-[20px] leading-tight font-bold">{copy.emptyTitle}</span>
          <span className="text-[13px] font-extrabold">{copy.emptyHint}</span>
        </Card>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {result.notifications.map((item) => <NotificationCard key={item.id} item={item} locale={locale} all={all} />)}
        </div>
      )}
    </Screen>
  );
}
