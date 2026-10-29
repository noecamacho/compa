"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/monito/Avatar";
import { Icon } from "@/components/icons";
import { apiCall } from "@/lib/api/client";
import { Notifications, type NotificationsT, type NotificationT } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { freshNotifications, notificationHref, notificationText } from "@/lib/notifications/present";
import { syncPush } from "@/lib/push/client";
import type { UserEventName } from "@/lib/realtime";
import { browserSupabase } from "@/lib/supabase-browser";
import { usePoll } from "@/lib/use-poll";

// "realtime": joined `user:<id>`, polling only as a slow safety net. "polling": Realtime is down or blocked (API spec §8).
export type LiveMode = "polling" | "realtime";

type Listener = (event: UserEventName) => void;

type LiveNotificationsValue = {
  data: NotificationsT | null;
  mode: LiveMode;
  subscribe: (listener: Listener) => () => void;
};

const LiveContext = createContext<LiveNotificationsValue | null>(null);

const FAST_POLL_MS = 3000;
const SAFETY_POLL_MS = 30_000;
const TOAST_MS = 6000;
const DROPPED = new Set(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"]);
const USER_EVENTS: ReadonlySet<string> = new Set(["request.received", "request.accepted", "invitee.connected", "badge.earned", "notifications.seen"] satisfies UserEventName[]);
const isUserEvent = (event: string): event is UserEventName => USER_EVENTS.has(event);

// Fetches /api/notifications; a newer call always wins over an older one that answers late.
function useNotificationsFeed() {
  const [data, setData] = useState<NotificationsT | null>(null);
  const [toast, setToast] = useState<NotificationT | null>(null);
  const known = useRef<Set<string> | null>(null);
  const latest = useRef(0);
  const firstLoad = useRef<Promise<void> | null>(null);
  const load = useCallback(async () => {
    const call = ++latest.current;
    const next = await apiCall("GET", "/api/notifications", Notifications);
    if (call !== latest.current) return;
    const [fresh] = freshNotifications(next.notifications, known.current);
    known.current = new Set(next.notifications.map((item) => item.id));
    setData(next);
    if (fresh) setToast(fresh);
  }, []);
  // Every refresh waits for the first load, so an early Realtime poke cannot overtake it and swallow its own toast.
  const refresh = useCallback(async () => {
    if (firstLoad.current) {
      await firstLoad.current.catch(() => undefined);
      return load();
    }
    firstLoad.current = load();
    await firstLoad.current.catch((error: unknown) => {
      firstLoad.current = null;
      throw error;
    });
  }, [load]);
  return { data, toast, setToast, refresh };
}

// Joins the person's private channel; every message is only a poke to refetch, so a missed one costs nothing.
function useUserChannel(userId: string, onEvent: (event: UserEventName) => void): LiveMode {
  const [mode, setMode] = useState<LiveMode>("polling");
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });
  useEffect(() => {
    const supabase = browserSupabase();
    if (!supabase) return;
    const channel = supabase.channel(`user:${userId}`, { config: { private: true } });
    channel.on("broadcast", { event: "*" }, ({ event }: { event: string }) => {
      if (isUserEvent(event)) handler.current(event);
    });
    let active = true;
    void supabase.realtime.setAuth().then(() => {
      // Unmounted while the token loaded: joining now would leave an orphan channel that delivers twice.
      if (!active) return;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") setMode("realtime");
        if (DROPPED.has(status)) setMode("polling");
      });
    });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);
  return mode;
}

// App-wide notifications (T-080, T-081): one feed for the bell, the incoming cards and the toast, kept fresh by the
// private Realtime channel and by polling when Realtime is unavailable.
export function LiveNotifications({ userId, locale, children }: { userId: string; locale: Locale; children: ReactNode }) {
  const { data, toast, setToast, refresh } = useNotificationsFeed();
  const listeners = useRef(new Set<Listener>());
  const onEvent = useCallback(
    (event: UserEventName) => {
      void refresh().catch(() => undefined);
      listeners.current.forEach((listener) => listener(event));
    },
    [refresh],
  );
  const mode = useUserChannel(userId, onEvent);
  usePoll(refresh, mode === "realtime" ? SAFETY_POLL_MS : FAST_POLL_MS);
  // On mount, on every (re)join and on every screen change: catch up, and drop a request this person just answered
  // (answering broadcasts nothing to the one who answers).
  const pathname = usePathname();
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh, mode, pathname]);
  useEffect(() => {
    void syncPush(locale).catch(() => undefined);
  }, [locale]);
  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => void listeners.current.delete(listener);
  }, []);
  const closeToast = useCallback(() => setToast(null), [setToast]);
  const value = useMemo(() => ({ data, mode, subscribe }), [data, mode, subscribe]);
  return (
    <LiveContext.Provider value={value}>
      {children}
      <span hidden data-testid="live-notifications" data-mode={mode} data-ready={data !== null} />
      {toast && <NotificationToast key={toast.id} item={toast} locale={locale} onClose={closeToast} />}
    </LiveContext.Provider>
  );
}

export const useLiveNotifications = (): LiveNotificationsValue | null => useContext(LiveContext);

// Runs `listener` on every message on my channel, e.g. to re-render a screen the moment its request is answered.
export function useUserEvent(listener: Listener): void {
  const live = useLiveNotifications();
  const latest = useRef(listener);
  useEffect(() => {
    latest.current = listener;
  });
  const subscribe = live?.subscribe;
  useEffect(() => subscribe?.((event) => latest.current(event)), [subscribe]);
}

function ToastIcon({ item }: { item: NotificationT }) {
  if (item.kind === "badge_earned") return <Icon name="trophy" size={24} />;
  return <Avatar person={{ name: item.person.name, look: item.person.avatar }} size={36} />;
}

function NotificationToast({ item, locale, onClose }: { item: NotificationT; locale: Locale; onClose: () => void }) {
  const pathname = usePathname();
  const all = copyFor(locale);
  const copy = all.notifications;
  useEffect(() => {
    const timer = setTimeout(onClose, TOAST_MS);
    return () => clearTimeout(timer);
  }, [onClose]);
  // The list itself is on screen; a toast on top would repeat it.
  if (pathname === "/notifications") return null;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(12px,env(safe-area-inset-top))] z-50 flex justify-center px-4 lg:top-auto lg:bottom-6 lg:justify-end lg:px-8">
      <div className="animate-rise pointer-events-auto flex w-full max-w-[420px] items-center gap-3 rounded-[18px] bg-gum-soft px-[14px] py-[10px] border-ink shadow-hard-3">
        <Link href={notificationHref(item)} onClick={onClose} data-testid="notification-toast" className="flex min-w-0 flex-1 items-center gap-3">
          <ToastIcon item={item} />
          <span className="font-display text-[15px] leading-tight font-bold">{notificationText(item, copy, all.badgeNames)}</span>
        </Link>
        <button type="button" onClick={onClose} aria-label={copy.dismiss} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white border-ink pressable">
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
}
