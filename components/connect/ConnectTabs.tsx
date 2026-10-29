"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/Segmented";
import { Muted } from "@/components/ui/Text";
import { Tour } from "@/components/tour/Tour";
import type { MeT } from "@/lib/api/schemas";
import { connect as copy, tour } from "@/lib/copy/es";
import { ScanPanel } from "./ScanPanel";

type Tab = "qr" | "scan";

type Props = { me: MeT; qrSvg: string };

// 04 Conectar: "Mi QR" (show it) and "Escanear" (camera plus search by name). The dock stays at the bottom.
export function ConnectTabs({ me, qrSvg }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const tab: Tab = params.get("tab") === "scan" ? "scan" : "qr";
  const setTab = (next: Tab) => router.replace(next === "qr" ? "/connect" : "/connect?tab=scan");
  return (
    <Screen dock>
      <div className="flex h-11 items-center justify-between">
        <h1 className="m-0 font-display text-[28px] leading-[1.1] font-bold">{copy.title}</h1>
        <Link
          href="/invite"
          className="inline-flex h-[34px] items-center gap-[6px] rounded-chip bg-sun-soft px-3 text-[13px] font-extrabold whitespace-nowrap border-ink shadow-hard-2"
        >
          <Icon name="plus" size={14} strokeWidth={3} />
          {copy.invite}
        </Link>
      </div>
      <div data-tour="mode">
        <Segmented
          label={copy.modeLabel}
          value={tab}
          onChange={setTab}
          options={[
            { value: "qr", label: copy.myQr },
            { value: "scan", label: copy.scan },
          ]}
        />
      </div>
      {tab === "qr" ? (
        <div className="flex flex-col items-center gap-3">
          <Card size="sm" className="flex w-[315px] items-center gap-3 px-[14px] py-[10px]">
            <Avatar person={avatarOf(me)} size={46} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-[18px] leading-[1.2] font-bold">{me.name}</span>
              <Muted className="text-[13px] font-bold">{[me.headline, me.company, me.city?.split(",")[0]].filter(Boolean).join(" · ")}</Muted>
            </span>
          </Card>
          <Card className="flex flex-col items-center rounded-[28px] p-[18px]" data-tour="qr">
            <div
              role="img"
              aria-label={copy.qrLabel(me.name)}
              className="h-[274px] w-[274px] [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </Card>
          <Muted className="text-[13px] font-bold">{copy.showIt}</Muted>
        </div>
      ) : (
        <ScanPanel />
      )}
      <Tour id="connect" steps={tour.connect} />
    </Screen>
  );
}
