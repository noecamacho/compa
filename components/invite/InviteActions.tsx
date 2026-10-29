"use client";

import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useCopy } from "@/components/LocaleProvider";
import { HIT_AREA } from "@/components/ui/hit-area";

type Props = { url: string; eventName: string | null };

const VIA: { key: "whatsapp" | "instagram" | "more"; color: string; icon: IconName }[] = [
  { key: "whatsapp", color: "#DDF8EA", icon: "whatsapp" },
  { key: "instagram", color: "#FFE3EA", icon: "instagram" },
  { key: "more", color: "#DDF1FF", icon: "share" },
];

// Copy the link or share it; Instagram has no share URL, so it copies and opens the app's share sheet.
export function InviteActions({ url, eventName }: Props) {
  const copy = useCopy().invite;
  const [copied, setCopied] = useState(false);
  const shown = useRef<HTMLSpanElement>(null);

  async function copyLink() {
    const done = await navigator.clipboard?.writeText(url).then(() => true, () => false);
    if (!done) return selectLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Clipboard denied or missing: select the link so it can be copied by hand (DESIGN.md, 12 Invitar).
  function selectLink() {
    if (shown.current) window.getSelection()?.selectAllChildren(shown.current);
  }

  async function share(key: (typeof VIA)[number]["key"]) {
    const text = copy.shareText(url, eventName);
    if (key === "whatsapp") return window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    if (navigator.share) return navigator.share({ text, url }).catch(() => undefined);
    return copyLink();
  }

  return (
    <>
      <div className="flex h-[46px] items-center gap-[10px] rounded-[14px] bg-paper px-3 border-ink">
        <span ref={shown} className="flex-1 truncate text-[14px] font-extrabold">{url.replace(/^https?:\/\//, "")}</span>
        <button
          type="button"
          onClick={copyLink}
          className={`${HIT_AREA} h-[30px] cursor-pointer rounded-[10px] px-[10px] font-display text-[12px] font-bold text-ink border-ink tappable`}
          style={{ background: copied ? "#6BE4A3" : "#FFFFFF" }}
        >
          {copied ? copy.copied : copy.copy}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-[10px]">
        {VIA.map((via) => (
          <button
            key={via.key}
            type="button"
            onClick={() => share(via.key)}
            className="flex min-w-0 cursor-pointer flex-col items-center gap-[6px] rounded-[14px] px-[6px] py-[10px] font-body text-[12px] font-extrabold text-ink border-ink shadow-hard-2 pressable"
            style={{ background: via.color }}
          >
            <Icon name={via.icon} size={18} />
            {copy[via.key]}
          </button>
        ))}
      </div>
    </>
  );
}
