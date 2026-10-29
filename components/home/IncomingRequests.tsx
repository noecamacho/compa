"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import { useLiveNotifications, useUserEvent } from "@/components/notifications/LiveNotifications";
import { apiCall } from "@/lib/api/client";
import { ConnectionList, type ConnectionListT } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import { firstName } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { useCopy } from "@/components/LocaleProvider";
import { usePoll } from "@/lib/use-poll";

type Incoming = ConnectionListT["incoming"];

// With my private Realtime channel joined, a request arrives as a poke and polling is only a safety net; without it,
// polling every 3 s is the fast path (conference-scale finding 3: about 4 calls a minute per phone instead of 40).
const POLL_MS = 3000;
const SAFETY_POLL_MS = 30_000;

// Polls my connections so a request shows up seconds after someone scans me (docs/api-quickstart.md),
// and refetches at once when my private Realtime channel announces one (T-081).
export function useIncomingRequests(initial: Incoming): Incoming {
  const [incoming, setIncoming] = useState(initial);
  const live = useLiveNotifications();
  const refresh = useCallback(
    async (signal?: AbortSignal) => setIncoming((await apiCall("GET", "/api/connections", ConnectionList, undefined, { signal })).incoming),
    [],
  );
  usePoll(refresh, live?.mode === "realtime" ? SAFETY_POLL_MS : POLL_MS);
  useUserEvent((event) => {
    if (event === "request.received") void refresh().catch(() => undefined);
  });
  return incoming;
}

// The unseen count from the app-wide live feed (components/notifications/LiveNotifications.tsx); the server's until then.
export function AlertsBell({ initial, locale }: { initial: number; locale: Locale }) {
  const count = useLiveNotifications()?.data?.unseenCount ?? initial;
  const copy = copyFor(locale).notifications;
  return (
    <Link href="/notifications" aria-label={copy.bellLabel(count)} className="relative box-border flex h-11 w-11 items-center justify-center rounded-[14px] bg-white border-ink shadow-hard-3 pressable">
      <Icon name="bell" />
      {count > 0 && (
        <span aria-hidden="true" className="animate-pop-in absolute top-[-9px] right-[-9px] flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-coral px-1 font-display text-[11px] font-bold border-ink">
          {count}
        </span>
      )}
    </Link>
  );
}

// One card per pending request, newest first (V2Solicitud entry point; README "Avisos").
export function IncomingRequests({ initial }: { initial: Incoming }) {
  const incoming = useIncomingRequests(initial);
  const { tour } = useCopy();
  if (incoming.length === 0) return null;
  return (
    <div className="flex flex-col gap-[10px] md:grid md:grid-cols-2">
      {incoming.map((request, index) => (
        <Card
          key={request.connectionId}
          href={`/requests/${request.connectionId}`}
          tone="gum-soft"
          size="sm"
          className="animate-rise flex items-center gap-3 px-[14px] py-[10px]"
          style={{ animationDelay: `${index * 0.06}s` }}
        >
          <span className="animate-wiggle block">
            <Avatar person={avatarOf(request.from)} size={46} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <span className="font-display text-[16px] leading-[1.15] font-bold">{tour.incoming.title(firstName(request.from.name))}</span>
            <Muted className="text-[12px] font-bold">{tour.incoming.hint}</Muted>
          </span>
          <span className="inline-flex h-[34px] items-center rounded-chip bg-mint px-3 font-display text-[13px] font-bold border-ink shadow-hard-2">{tour.incoming.view}</span>
        </Card>
      ))}
    </div>
  );
}
