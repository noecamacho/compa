import Link from "next/link";
import { formatCount } from "@/lib/admin/format";
import type { Locale } from "@/lib/i18n";

export type KpiTile = {
  key: string;
  label: string;
  // null renders "—" (stats failed or not loaded), never the error page (spec §5.1, edge case 32).
  value: number | null;
  sub?: string;
  // Applies the tile's filter, for example `/admin?phase=running`.
  href?: string;
  // A pulsing coral dot beside the value (running events).
  live?: boolean;
  // Responsive visibility, for example "hidden 2xl:flex" for the extra two tiles.
  className?: string;
};

type Props = { label: string; locale: Locale; tiles: KpiTile[] };

const TILE = "box-border flex min-h-[72px] min-w-0 flex-col justify-start gap-1 rounded-[18px] bg-white px-3 py-2 border-ink shadow-hard-3 min-[390px]:px-4 min-[390px]:py-3";

// Overview numbers above a list: 2×2 on a phone, 4 in a row from md, 6 at 2xl. Data comes in already fetched.
export function KpiStrip({ label, locale, tiles }: Props) {
  return (
    <section aria-label={label}>
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4 2xl:grid-cols-6">
        {tiles.map((tile) => (
          <li key={tile.key} className={`min-w-0 ${tile.className ?? "flex"}`}>
            <Tile tile={tile} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tile({ tile, locale }: { tile: KpiTile; locale: Locale }) {
  const body = (
    <>
      <span className="label-caps line-clamp-2 text-[12px]! tracking-[0.8px]! normal-case!">{tile.label}</span>
      <span className="flex items-center gap-2 font-display text-[22px] leading-none font-bold tabular-nums min-[390px]:text-[26px] md:text-[30px]">
        {tile.live && <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-coral motion-safe:animate-pulse" />}
        {formatCount(locale, tile.value)}
      </span>
      {tile.sub && <span className="truncate text-[12px] font-extrabold text-muted">{tile.sub}</span>}
    </>
  );
  if (!tile.href) return <div className={`${TILE} w-full`}>{body}</div>;
  return (
    <Link href={tile.href} className={`${TILE} w-full pressable hover:bg-sun-soft`}>
      {body}
    </Link>
  );
}
