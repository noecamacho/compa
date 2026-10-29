"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Muted } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { UserProfile, UserSearch, type CardT } from "@/lib/api/schemas";
import { connect as copy } from "@/lib/copy/es";

// Minimal typing for the Barcode Detection API (Chrome, Android); Safari has none (ARCHITECTURE.md ADR-004).
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
const detectorConstructor = (): DetectorConstructor | null =>
  "BarcodeDetector" in globalThis ? (globalThis as unknown as { BarcodeDetector: DetectorConstructor }).BarcodeDetector : null;

// A personal QR encodes <origin>/u/<handle>.
export const handleFromQr = (raw: string): string | null => raw.match(/\/u\/([a-z0-9-]{2,32})(?:[/?#]|$)/)?.[1] ?? null;

type Scan = { kind: "handle"; handle: string } | { kind: "invalid" };

const scanOf = (codes: { rawValue: string }[]): Scan | null => {
  if (codes.length === 0) return null;
  const handle = codes.map((code) => handleFromQr(code.rawValue)).find(Boolean);
  return handle ? { kind: "handle", handle } : { kind: "invalid" };
};

function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>, onScan: (scan: Scan) => void) {
  const [available, setAvailable] = useState(true);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) return setAvailable(false);
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const Detector = detectorConstructor();
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((media) => {
        stream = media;
        video.srcObject = media;
        return video.play();
      })
      .then(() => {
        if (!Detector) return;
        const detector = new Detector({ formats: ["qr_code"] });
        timer = setInterval(async () => {
          const scan = scanOf(await detector.detect(video).catch(() => []));
          if (scan) onScan(scan);
        }, 500);
      })
      .catch(() => setAvailable(false));
    return () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [videoRef, onScan]);
  return available;
}

const CORNER = "absolute h-[34px] w-[34px] border-mint";

type Notice = "notFound" | "invalidQr" | null;

const subtitle = (card: CardT) => [card.headline, card.company].filter(Boolean).join(" · ");

function PersonRow({ card, className }: { card: CardT; className: string }) {
  return (
    <div className={className}>
      <Avatar person={avatarOf(card)} size={42} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-extrabold">{card.name}</span>
        <Muted className="truncate text-[12px] font-bold">{subtitle(card)}</Muted>
      </span>
      <Link
        href={`/connect/${card.handle}`}
        aria-label={`${copy.connectButton} con ${card.name}`}
        className="hit-44 inline-flex h-[34px] shrink-0 items-center justify-center rounded-chip bg-mint px-3 font-display text-[13px] font-bold whitespace-nowrap border-ink shadow-hard-2 pressable"
      >
        {copy.connectButton}
      </Link>
    </div>
  );
}

// Camera viewfinder with mint corners; a scanned person appears in the row at the bottom (V2Conectar "Escanear").
// Searching by name lists the matching people under the field, each with its own Conectar.
export function ScanPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanned, setScanned] = useState<CardT | null>(null);
  const [results, setResults] = useState<CardT[]>([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [searching, setSearching] = useState(false);

  async function lookUp(handle: string) {
    try {
      const profile = await apiCall("GET", `/api/users/${handle}`, UserProfile);
      setScanned(profile.card);
      setNotice(null);
    } catch {
      setNotice("notFound");
    }
  }

  const available = useCamera(videoRef, (scan) => {
    if (scan.kind === "invalid") return setNotice("invalidQr");
    if (!scanned) void lookUp(scan.handle);
  });

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 2) return;
    setSearching(true);
    try {
      const found = await apiCall("GET", `/api/users?q=${encodeURIComponent(text)}`, UserSearch);
      setResults(found.people);
      setNotice(found.people.length ? null : "notFound");
    } catch {
      setResults([]);
      setNotice("notFound");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[360px] overflow-hidden rounded-[28px] bg-ink border-ink" style={{ boxShadow: "4px 4px 0 #6F6A7E" }}>
        <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <span role="status" className="absolute top-[14px] right-0 left-0 text-center text-[12px] font-extrabold tracking-[1.2px] text-paper uppercase">
          {available ? copy.aim : copy.cameraUnavailable}
        </span>
        <span className={`${CORNER} top-12 left-[72px] rounded-tl-[12px] border-t-4 border-l-4`} />
        <span className={`${CORNER} top-12 right-[72px] rounded-tr-[12px] border-t-4 border-r-4`} />
        <span className={`${CORNER} top-[234px] left-[72px] rounded-bl-[12px] border-b-4 border-l-4`} />
        <span className={`${CORNER} top-[234px] right-[72px] rounded-br-[12px] border-r-4 border-b-4`} />
        {/* The scan line sweeps between the corners while the camera is up; it holds still when the camera is not. */}
        <span
          aria-hidden="true"
          className={`absolute top-[156px] right-[86px] left-[86px] h-1 rounded-[2px] bg-mint ${available ? "animate-scan" : ""}`}
          style={{ boxShadow: "0 0 12px rgba(107,228,163,0.8)" }}
        />
        {scanned && <PersonRow card={scanned} className="animate-rise absolute right-3 bottom-3 left-3 flex items-center gap-3 rounded-[18px] bg-white px-[14px] py-[10px] border-ink shadow-hard-3" />}
      </div>
      <form onSubmit={search} className="relative" role="search">
        <label htmlFor="search-handle" className="sr-only">
          {copy.searchLabel}
        </label>
        <Icon name="search" size={20} className="absolute top-[14px] left-[14px] text-muted" />
        <input
          id="search-handle"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          enterKeyHint="search"
          aria-busy={searching}
          className="box-border block h-12 w-full rounded-[14px] bg-white pr-[14px] pl-11 font-body text-[15px] font-bold text-ink outline-none placeholder:text-muted border-ink transition-shadow duration-200 focus:shadow-[0_0_0_4px_#6BE4A3]"
        />
      </form>
      {results.length > 0 && (
        <ul aria-label={copy.searchLabel} className="m-0 flex list-none flex-col gap-2 p-0">
          {results.map((card) => (
            <li key={card.id}>
              <PersonRow card={card} className="animate-rise flex items-center gap-3 rounded-[18px] bg-white px-[14px] py-[10px] border-ink shadow-hard-3" />
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <span role="alert" className="text-center text-[12px] font-extrabold text-muted">
          {notice === "notFound" ? copy.notFound : copy.invalidQr}
        </span>
      )}
    </div>
  );
}
