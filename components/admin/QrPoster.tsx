import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Monito } from "@/components/monito/Monito";
import { confettiPieces, type ConfettiPiece } from "@/lib/admin/poster";
import { copyFor, type Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { SAMPLE_IDS, SAMPLE_PEOPLE } from "@/lib/monito/sample-people";
import { FullscreenButton } from "./FullscreenButton";

type PosterCopy = Dictionary["admin"]["ui"]["poster"];

type Props = { locale: Locale; name: string; slug: string; joinUrl: string; svg: string };

// The poster speaks both languages whatever the admin's locale: the room is mixed.
const LANGS = ["es", "en"] as const;
const posterCopy = (lang: Locale): PosterCopy => copyFor(lang).admin.ui.poster;
const CONFETTI = confettiPieces(28);

// Border and hard shadow scaled to the screen, so the frame reads the same on a phone and on a 4K TV.
const INK_LINE = "max(2.5px, 0.45vmin) solid #1E1B2E";
const EDGE: CSSProperties = { border: INK_LINE, boxShadow: "max(4px, 0.9vmin) max(4px, 0.9vmin) 0 #1E1B2E" };

const CONTROL =
  "box-border inline-flex h-11 items-center rounded-button bg-white px-3 text-[13px] font-extrabold text-ink no-underline border-ink shadow-hard-2 pressable";

// The full-screen QR promo for a projector, a TV, an iPad or a phone held up at the door (DESIGN.md "Admin QR poster").
// One screen, no scroll: --logo, --cta and --qr size the hero logo, the caption and the QR from the viewport, stacked in
// portrait and side by side in landscape (the px terms keep short phones, Safari bars included, on one screen). Nothing ever moves, covers or scales the QR: the motion is confetti behind
// the content, a ring behind the QR card, the bobbing logo, the language swap, the sticker and the ticker.
export function QrPoster({ locale, name, slug, joinUrl, svg }: Props) {
  const t = posterCopy(locale);
  return (
    <main
      aria-label={t.stage(name)}
      className="paper-dots relative flex min-h-dvh flex-col overflow-hidden text-ink [--cta:min(7.4vw,3.7dvh)] [--logo:min(14dvh,36vw)] [--qr:min(80vw,37dvh,calc(100dvh_-_420px))] landscape:[--cta:min(7.4vmin,3.8vw)] landscape:[--logo:min(34vmin,30vw)] landscape:[--qr:min(42vw,calc(100dvh_-_60px_-_max(176px,30vmin)))]"
    >
      <Confetti />
      <div className="relative z-20 flex justify-end gap-2 px-4 pt-3 [:fullscreen_&]:hidden">
        <FullscreenButton label={t.fullscreen} className={CONTROL} />
        <Link href={`/admin/events/${slug}`} className={CONTROL}>
          {t.back}
        </Link>
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-evenly px-4 py-[max(6px,1.2vmin)] landscape:flex-row landscape:justify-center landscape:gap-[6vmin] landscape:px-[5vmin]">
        <section className="flex min-w-0 flex-col items-center gap-[max(6px,1.6vmin)] text-center landscape:max-w-[min(50vw,110vmin)] landscape:items-start landscape:text-left">
          <span className="block animate-bob">
            <Image src="/brand/compa-logo.png" width={925} height={1024} alt={copyFor(locale).landing.brand} priority className="block h-(--logo) w-auto" />
          </span>
          <h1 className="m-0 font-display text-[clamp(14px,2.4vmin,90px)] leading-[1.1] font-bold text-muted [overflow-wrap:anywhere]">{name}</h1>
          <div className="grid w-full">
            {LANGS.map((lang) => (
              <CallToAction key={lang} lang={lang} copy={posterCopy(lang)} />
            ))}
          </div>
        </section>
        <QrCard label={copyFor(locale).admin.detail.qrLabel(name)} svg={svg} joinUrl={joinUrl} />
      </div>
      <Ticker />
    </main>
  );
}

// The owner's caption, word for word, in one paragraph per language: the highlight in mint, "free" on a wiggling
// sticker. With motion both languages share one grid cell and cross-fade; reduced motion stacks them, smaller.
function CallToAction({ lang, copy }: { lang: Locale; copy: PosterCopy }) {
  const [lead, highlight, prize, free] = copy.cta;
  // Half the 10 s loop behind, inline so the animation shorthand cannot reset it.
  const offset: CSSProperties | undefined = lang === "en" ? { animationDelay: "-5s" } : undefined;
  return (
    <p
      lang={lang}
      className="m-0 font-display text-(length:--cta) leading-[1.12] font-bold text-balance [overflow-wrap:anywhere] motion-safe:animate-poster-swap motion-safe:[grid-area:1/1] motion-reduce:text-[length:calc(var(--cta)*0.72)] motion-reduce:not-first:mt-[max(6px,1.2vmin)]"
      style={offset}
    >
      {lead} <mark className="rounded-[0.18em] bg-mint px-[0.12em] text-ink box-decoration-clone">{highlight}</mark> {prize}{" "}
      <span className="my-[0.1em] inline-block animate-wiggle rounded-[0.3em] bg-coral px-[0.35em] py-[0.04em] whitespace-nowrap" style={EDGE}>
        {free}
      </span>
    </p>
  );
}

function QrCard({ label, svg, joinUrl }: { label: string; svg: string; joinUrl: string }) {
  return (
    <div className="relative m-[max(12px,2.2vmin)] shrink-0">
      <span aria-hidden="true" className="poster-halo absolute -inset-[max(10px,1.8vmin)] rounded-[max(26px,4.4vmin)]" />
      <figure className="relative m-0 flex flex-col items-center overflow-hidden rounded-[max(18px,3vmin)] bg-white p-[max(4px,0.6vmin)] pb-[max(10px,1.6vmin)]" style={EDGE}>
        <div role="img" aria-label={label} className="size-(--qr) [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <figcaption className="flex max-w-(--qr) flex-col items-center gap-[0.2em] px-2 text-center">
          <span className="font-display text-[min(clamp(18px,3vmin,110px),calc(var(--qr)*0.06))] leading-[1.1] font-bold">
            {LANGS.map((lang, index) => (
              <span key={lang} lang={lang}>
                {index > 0 && " · "}
                {posterCopy(lang).scan}
              </span>
            ))}
          </span>
          <code className="font-mono text-[clamp(13px,2vmin,72px)] font-bold [overflow-wrap:anywhere]">{joinUrl.replace(/^https?:\/\//, "")}</code>
        </figcaption>
      </figure>
    </div>
  );
}

const confettiStyle = (piece: ConfettiPiece): CSSProperties =>
  ({
    left: `${piece.left}%`,
    width: `max(7px, ${piece.size}vmin)`,
    height: piece.round ? `max(7px, ${piece.size}vmin)` : `max(4px, ${piece.size * 0.45}vmin)`,
    background: piece.color,
    borderRadius: piece.round ? "50%" : "2px",
    boxShadow: "0 0 0 max(1.5px, 0.22vmin) #1E1B2E",
    animationDuration: `${piece.duration}s`,
    animationDelay: `${piece.delay}s`,
    "--sway": `${piece.sway}vmin`,
    "--spin": `${piece.spin}deg`,
  }) as CSSProperties;

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-70 motion-reduce:hidden">
      {CONFETTI.map((piece) => (
        <span key={piece.left} className="animate-fall absolute top-0 block" style={confettiStyle(piece)} />
      ))}
    </div>
  );
}

// Each run holds the words twice so one run is wider than any screen up to 4:1; the track holds two runs and slides
// by one, so the loop has no seam.
function tickerItems() {
  const en = posterCopy("en").ticker;
  const words = posterCopy("es").ticker.flatMap((word, index) => [word, en[index] ?? word]);
  return [...words, ...words].map((word, index) => ({ word, who: SAMPLE_IDS[index % SAMPLE_IDS.length] ?? "DR", delay: (index % 4) * 0.4 }));
}

function Ticker() {
  const items = tickerItems();
  return (
    <div aria-hidden="true" className="relative z-10 overflow-hidden bg-sun py-[max(8px,1.2vmin)]" style={{ borderTop: INK_LINE }}>
      <div className="animate-marquee flex w-max">
        {[0, 1].map((run) => (
          <div key={run} className="flex shrink-0 items-center gap-[max(18px,3.4vmin)] pr-[max(18px,3.4vmin)]">
            {items.map(({ word, who, delay }, index) => (
              <TickerItem key={index} word={word} who={who} delay={delay} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TickerItem({ word, who, delay }: { word: string; who: (typeof SAMPLE_IDS)[number]; delay: number }) {
  return (
    <span className="flex items-center gap-[max(10px,2vmin)]">
      <span className="animate-bob block" style={{ animationDelay: `${delay}s` }}>
        <Monito look={SAMPLE_PEOPLE[who].look} label={SAMPLE_PEOPLE[who].name} className="h-[clamp(36px,7vmin,250px)] w-auto" />
      </span>
      <span className="font-display text-[clamp(20px,3.6vmin,130px)] leading-none font-bold whitespace-nowrap">{word}</span>
    </span>
  );
}
