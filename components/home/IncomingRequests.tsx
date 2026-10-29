"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Muted } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { ConnectionList, Notifications, type ConnectionListT } from "@/lib/api/schemas";
import { copyFor } from "@/lib/copy";
import { firstName } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { tour } from "@/lib/copy/es";

type Incoming = ConnectionListT["incoming"];

const POLL_MS = 3000;

// Polls my connections so a request shows up seconds after someone scans me (docs/api-quickstart.md: poll every 3 s).
export function useIncomingRequests(initial: Incoming): Incoming {
  const [incoming, setIncoming] = useState(initial);
  useEffect(() => {
    let active = true;
    const tick = async () => {
      const list = await apiCall("GET", "/api/connections", ConnectionList).catch(() => null);
      if (active && list) setIncoming(list.incoming);
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return incoming;
}

export function AlertsBell({ initial, locale }: { initial: number; locale: Locale }) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    let active = true;
    const tick = async () => {
      const result = await apiCall("GET", "/api/notifications", Notifications).catch(() => null);
      if (active && result) setCount(result.unseenCount);
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
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
