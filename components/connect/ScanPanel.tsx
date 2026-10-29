"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Muted } from "@/components/ui/Text";
import { apiCall } from "@/lib/api/client";
import { UserProfile, type CardT } from "@/lib/api/schemas";
import { connect as copy } from "@/lib/copy/es";
import { slugify } from "@/lib/slug";
import { HIT_AREA } from "@/components/ui/hit-area";

// Minimal typing for the Barcode Detection API (Chrome, Android); Safari has none (ARCHITECTURE.md ADR-004).
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;
const detectorConstructor = (): DetectorConstructor | null =>
  "BarcodeDetector" in globalThis ? (globalThis as unknown as { BarcodeDetector: DetectorConstructor }).BarcodeDetector : null;

// A personal QR encodes <origin>/u/<handle>.
export const handleFromQr = (raw: string): string | null => raw.match(/\/u\/([a-z0-9-]{2,32})(?:[/?#]|$)/)?.[1] ?? null;

function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>, onHandle: (handle: string) => void) {
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
          const codes = await detector.detect(video).catch(() => []);
          const handle = codes.map((code) => handleFromQr(code.rawValue)).find(Boolean);
          if (handle) onHandle(handle);
        }, 500);
      })
      .catch(() => setAvailable(false));
    return () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [videoRef, onHandle]);
  return available;
}

const CORNER = "absolute h-[34px] w-[34px] border-mint";

// Camera viewfinder with mint corners; a detected person appears in the row at the bottom (V2Conectar "Escanear").
export function ScanPanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [found, setFound] = useState<CardT | null>(null);
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);

  async function lookUp(handle: string) {
    try {
      const profile = await apiCall("GET", `/api/users/${handle}`, UserProfile);
      setFound(profile.card);
      setNotFound(false);
    } catch {
      setNotFound(true);
    }
  }

  const available = useCamera(videoRef, (handle) => {
    if (!found) void lookUp(handle);
  });

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const handle = slugify(query);
    if (handle.length >= 2) void lookUp(handle);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[360px] overflow-hidden rounded-[28px] bg-ink border-ink" style={{ boxShadow: "4px 4px 0 #6F6A7E" }}>
        <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <span className="absolute top-[14px] right-0 left-0 text-center text-[12px] font-extrabold tracking-[1.2px] text-paper uppercase">
          {available ? copy.aim : copy.cameraUnavailable}
        </span>
        {/* A fixed 205×220 frame, centered, so the corners stay square however wide the viewfinder gets. */}
        <span aria-hidden="true" className="absolute top-12 left-1/2 h-[220px] w-[205px] -translate-x-1/2">
          <span className={`${CORNER} top-0 left-0 rounded-tl-[12px] border-t-4 border-l-4`} />
          <span className={`${CORNER} top-0 right-0 rounded-tr-[12px] border-t-4 border-r-4`} />
          <span className={`${CORNER} bottom-0 left-0 rounded-bl-[12px] border-b-4 border-l-4`} />
          <span className={`${CORNER} right-0 bottom-0 rounded-br-[12px] border-r-4 border-b-4`} />
          {/* The scan line sweeps between the corners while the camera is up; it holds still when the camera is not. */}
          <span
            className={`absolute top-[108px] right-[14px] left-[14px] h-1 rounded-[2px] bg-mint ${available ? "animate-scan" : ""}`}
            style={{ boxShadow: "0 0 12px rgba(107,228,163,0.8)" }}
          />
        </span>
        {found && (
          <div className="animate-rise absolute right-3 bottom-3 left-3 flex items-center gap-3 rounded-[18px] bg-white px-[14px] py-[10px] border-ink shadow-hard-3">
            <Avatar person={avatarOf(found)} size={42} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-extrabold">{found.name}</span>
              <Muted className="text-[12px] font-bold">{[found.headline, found.company].filter(Boolean).join(" · ")}</Muted>
            </span>
            <Link
              href={`/connect/${found.handle}`}
              className={`${HIT_AREA} inline-flex h-[34px] shrink-0 items-center justify-center rounded-chip bg-mint px-3 font-display text-[13px] font-bold whitespace-nowrap border-ink shadow-hard-2 pressable`}
            >
              {copy.connectButton}
            </Link>
          </div>
        )}
      </div>
      <form onSubmit={search} className="relative">
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
          className="box-border block h-12 w-full rounded-[14px] bg-white pr-[14px] pl-11 font-body text-[15px] font-bold text-ink outline-none placeholder:text-muted border-ink transition-shadow duration-200 focus:shadow-[0_0_0_4px_#6BE4A3]"
        />
      </form>
      {notFound && <Muted className="text-center text-[12px] font-extrabold">{copy.notFound}</Muted>}
    </div>
  );
}
