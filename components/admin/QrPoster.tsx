import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Monito } from "@/components/monito/Monito";
import { confettiPieces, type ConfettiPiece } from "@/lib/admin/poster";
import { copyFor, type Dictionary } from "@/lib/copy";
import { landing } from "@/lib/copy/es";
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

// The full-screen QR promo for a projector, a TV or a phone held up at the door (DESIGN.md "Admin QR poster"). The QR is
// sized from --qr (vmin-style, as large as the screen allows) and nothing ever moves, covers or scales it: the motion
// is confetti behind the content, a ring behind the QR card, the language swap and the ticker.
export function QrPoster({ locale, name, slug, joinUrl, svg }: Props) {
  const t = posterCopy(locale);
  return (
    <main
      aria-label={t.stage(name)}
      className="paper-dots relative flex min-h-dvh flex-col overflow-hidden text-ink [--qr:min(78vw,44dvh)] landscape:[--qr:min(60dvh,40vw)]"
    >
      <Confetti />
      <div className="relative z-20 flex justify-end gap-2 px-4 pt-3 [:fullscreen_&]:hidden">
        <FullscreenButton label={t.fullscreen} className={CONTROL} />
        <Link href={`/admin/events/${slug}`} className={CONTROL}>
          {t.back}
        </Link>
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-[max(14px,3vmin)] px-4 py-[max(12px,2.5vmin)] landscape:flex-row landscape:gap-[6vmin] landscape:px-[5vmin]">
        <section className="flex min-w-0 flex-col items-center gap-[max(10px,2vmin)] text-center landscape:flex-1 landscape:items-start landscape:text-left">
          <Image src="/brand/compa-logo.png" width={925} height={1024} alt={landing.brand} priority className="h-[clamp(60px,14vmin,480px)] w-auto" />
          <h1 className="m-0 font-display text-[clamp(18px,3.4vmin,120px)] leading-[1.1] font-bold [overflow-wrap:anywhere]">{name}</h1>
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

// With motion both languages share one grid cell and cross-fade; reduced motion stacks them, both always readable.
function CallToAction({ lang, copy }: { lang: Locale; copy: PosterCopy }) {
  const [before, word, after] = copy.title;
  // Half the 10 s loop behind, inline so the animation shorthand cannot reset it.
  const offset: CSSProperties | undefined = lang === "en" ? { animationDelay: "-5s" } : undefined;
  return (
    <p
      lang={lang}
      className="m-0 flex flex-col items-center gap-[max(6px,1.2vmin)] font-display font-bold landscape:items-start motion-safe:animate-poster-swap motion-safe:[grid-area:1/1] motion-reduce:not-first:mt-[max(10px,2vmin)]"
      style={offset}
    >
      <span className="text-[clamp(28px,6.6vmin,240px)] leading-[1.02] motion-reduce:text-[clamp(24px,5.2vmin,190px)]">
        {before}{" "}
        <mark className="rounded-[0.18em] bg-mint px-[0.12em] text-ink box-decoration-clone">{word}</mark> {after}
      </span>
      <span className="flex flex-wrap items-center justify-center gap-[0.4em] text-[clamp(22px,4.6vmin,170px)] leading-[1.05] landscape:justify-start motion-reduce:text-[clamp(20px,3.8vmin,140px)]">
        {copy.prize}
        <span className="animate-wiggle inline-block rounded-[0.3em] bg-coral px-[0.35em] py-[0.08em]" style={EDGE}>
          {copy.free}
        </span>
      </span>
    </p>
  );
}

function QrCard({ label, svg, joinUrl }: { label: string; svg: string; joinUrl: string }) {
  return (
    <div className="relative m-[max(12px,2.2vmin)] shrink-0">
      <span aria-hidden="true" className="poster-halo absolute -inset-[max(10px,1.8vmin)] rounded-[max(26px,4.4vmin)]" />
      <figure className="relative m-0 flex flex-col items-center rounded-[max(18px,3vmin)] bg-white p-[max(4px,0.6vmin)] pb-[max(10px,1.6vmin)]" style={EDGE}>
        <div role="img" aria-label={label} className="size-(--qr) [&>svg]:block [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <figcaption className="flex max-w-(--qr) flex-col items-center gap-[0.2em] px-2 text-center">
          <span className="font-display text-[clamp(18px,3vmin,110px)] leading-[1.1] font-bold">
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
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
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
        <Monito look={SAMPLE_PEOPLE[who].look} label={SAMPLE_PEOPLE[who].name} className="h-[clamp(40px,7vmin,250px)] w-auto" />
      </span>
      <span className="font-display text-[clamp(20px,3.6vmin,130px)] leading-none font-bold whitespace-nowrap">{word}</span>
    </span>
  );
}
