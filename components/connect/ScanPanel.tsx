"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Avatar, avatarOf } from "@/components/monito/Avatar";
import { Muted } from "@/components/ui/Text";
import { ApiClientError, apiCall } from "@/lib/api/client";
import { useCopy } from "@/components/LocaleProvider";
import { errorText } from "@/lib/api/error-text";
import { PeopleSearch, UserProfile, type CardT } from "@/lib/api/schemas";
import { slugify } from "@/lib/slug";
import { HIT_AREA } from "@/components/ui/hit-area";

// Minimal typing for the Barcode Detection API (Chrome, Android). Safari and Firefox have none, so jsQR decodes
// frames there instead (ARCHITECTURE.md ADR-004); it is loaded only on those browsers.
type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorConstructor = { new (options: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };
const detectorConstructor = (): DetectorConstructor | null =>
  "BarcodeDetector" in globalThis ? (globalThis as unknown as { BarcodeDetector: DetectorConstructor }).BarcodeDetector : null;

// Reads every QR in the current video frame.
type Decode = (video: HTMLVideoElement) => Promise<string[]>;

const SCAN_MS = 300;
const RETRY_LOOKUP_MS = 3000;
// jsQR works on a downscaled frame: fast on an old iPhone and still sharp enough for a QR filling the frame.
const SCAN_WIDTH = 640;

// A personal QR encodes <origin>/u/<handle>.
export const handleFromQr = (raw: string): string | null => raw.match(/\/u\/([a-z0-9-]{2,32})(?:[/?#]|$)/)?.[1] ?? null;

export type CameraStatus = "starting" | "scanning" | "denied" | "no_camera" | "unsupported" | "no_decoder" | "failed";

// getUserMedia rejects with a DOMException whose name says why.
export function cameraStatusFor(errorName: string): CameraStatus {
  if (errorName === "NotAllowedError" || errorName === "SecurityError") return "denied";
  if (errorName === "NotFoundError" || errorName === "OverconstrainedError") return "no_camera";
  return "failed";
}

async function nativeDecoder(): Promise<Decode | null> {
  const Native = detectorConstructor();
  if (!Native) return null;
  const formats = (await Native.getSupportedFormats?.().catch(() => [])) ?? ["qr_code"];
  if (!formats.includes("qr_code")) return null;
  const detector = new Native({ formats: ["qr_code"] });
  return async (video) => (await detector.detect(video)).map((code) => code.rawValue);
}

async function jsDecoder(): Promise<Decode> {
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  return async (video) => {
    if (!context || !video.videoWidth) return [];
    const scale = Math.min(1, SCAN_WIDTH / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
    return code ? [code.data] : [];
  };
}

const errorName = (error: unknown): string => (error instanceof Error ? error.name : "");

// onScan lives in a ref so a re-render (every keystroke in the search box) never restarts the camera.
// It gets the handle of a personal QR, or null for a QR that is not one.
function useCamera(videoRef: React.RefObject<HTMLVideoElement | null>, onScan: (handle: string | null) => void): CameraStatus {
  const [status, setStatus] = useState<CameraStatus>("starting");
  const scanRef = useRef(onScan);
  useEffect(() => {
    scanRef.current = onScan;
  });
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !navigator.mediaDevices?.getUserMedia) return setStatus("unsupported");
    let active = true;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // One decode at a time: the next frame is read only after the previous one settles.
    const scan = async (decode: Decode) => {
      const codes = await decode(video).catch(() => []);
      if (!active) return;
      if (codes.length > 0) scanRef.current(codes.map(handleFromQr).find(Boolean) ?? null);
      timer = setTimeout(() => void scan(decode), SCAN_MS);
    };
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (error) {
        return setStatus(cameraStatusFor(errorName(error)));
      }
      if (!active) return stream.getTracks().forEach((track) => track.stop());
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const decode = await nativeDecoder().then((native) => native ?? jsDecoder()).catch(() => null);
      if (!active) return;
      if (!decode) return setStatus("no_decoder");
      setStatus("scanning");
      void scan(decode);
    };
    void start();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [videoRef]);
  return status;
}

const CORNER = "absolute h-[34px] w-[34px] border-mint";

function PersonRow({ card, className }: { card: CardT; className: string }) {
  const copy = useCopy().connect;
  return (
    <div className={`${className} flex items-center gap-3 rounded-[18px] bg-white px-[14px] py-[10px] border-ink shadow-hard-3`}>
      <Avatar person={avatarOf(card)} size={42} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-extrabold">{card.name}</span>
        <Muted className="truncate text-[12px] font-bold">{[card.headline, card.company].filter(Boolean).join(" · ")}</Muted>
      </span>
      <Link
        href={`/connect/${card.handle}`}
        aria-label={`${copy.connectButton}: ${card.name}`}
        className={`${HIT_AREA} inline-flex h-[34px] shrink-0 items-center justify-center rounded-chip bg-mint px-3 font-display text-[13px] font-bold whitespace-nowrap border-ink shadow-hard-2 pressable`}
      >
        {copy.connectButton}
      </Link>
    </div>
  );
}

// Camera viewfinder with mint corners; a detected person appears in the row at the bottom (V2Conectar "Escanear").
// Searching by name lists the matching people under the field, each with its own Conectar.
export function ScanPanel() {
  const all = useCopy();
  const copy = all.connect;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [found, setFound] = useState<CardT | null>(null);
  const [results, setResults] = useState<CardT[]>([]);
  const [query, setQuery] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  // One lookup per handle: the camera reads the same QR several times a second.
  const lastHandle = useRef<string | null>(null);

  async function lookUp(handle: string) {
    try {
      const profile = await apiCall("GET", `/api/users/${handle}`, UserProfile);
      setFound(profile.card);
      setLookupError(null);
    } catch (caught) {
      const missing = caught instanceof ApiClientError && caught.status === 404;
      setLookupError(missing ? copy.notFound : errorText(all, caught));
      // A network failure may pass: let the same QR be read again in a moment.
      if (!missing) setTimeout(() => (lastHandle.current = null), RETRY_LOOKUP_MS);
    }
  }

  const status = useCamera(videoRef, (handle) => {
    if (!handle) return found ? undefined : setLookupError(copy.invalidQr);
    if (found || lastHandle.current === handle) return;
    lastHandle.current = handle;
    void lookUp(handle);
  });
  const available = status === "starting" || status === "scanning";

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (text.length < 2) return;
    try {
      const { people } = await apiCall("GET", `/api/users?q=${encodeURIComponent(text)}`, PeopleSearch);
      setResults(people);
      // Search covers your current event only; a typed handle still finds anyone, as before.
      const handle = slugify(text);
      setLookupError(people.length === 0 && !handle ? copy.notFound : null);
      if (people.length === 0 && handle) void lookUp(handle);
    } catch (caught) {
      setResults([]);
      setLookupError(errorText(all, caught));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-[360px] overflow-hidden rounded-[28px] bg-ink border-ink" style={{ boxShadow: "4px 4px 0 #6F6A7E" }}>
        <video ref={videoRef} muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-80" />
        {/* A camera problem is a sentence to read, not a label: no caps, so the longer hint stays legible. */}
        <span role="status" className={`absolute top-[14px] right-0 left-0 px-4 text-center font-extrabold text-paper ${available ? "text-[12px] tracking-[1.2px] uppercase" : "text-[13px] leading-[1.35]"}`}>
          {copy.camera[status]}
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
        {found && <PersonRow card={found} className="animate-rise absolute right-3 bottom-3 left-3" />}
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
      {results.length > 0 && (
        <ul aria-label={copy.searchLabel} className="m-0 flex list-none flex-col gap-2 p-0">
          {results.map((card) => (
            <li key={card.id}>
              <PersonRow card={card} className="animate-rise" />
            </li>
          ))}
        </ul>
      )}
      {lookupError && (
        <span role="alert" className="text-center text-[12px] font-extrabold text-muted">
          {lookupError}
        </span>
      )}
    </div>
  );
}
