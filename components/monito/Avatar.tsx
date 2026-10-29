import { effectiveAvatarMode, type AvatarMode } from "@/lib/avatar-mode";
import { GRID_HEIGHT, GRID_WIDTH } from "@/lib/monito/grid";
import { DEFAULT_LOOK, type MonitoLook } from "@/lib/monito/look";
import { SAMPLE_PEOPLE, circleColorFor, type SampleId } from "@/lib/monito/sample-people";
import { Monito } from "./Monito";
import { Photo } from "./Photo";

type Person = { name: string; look?: MonitoLook | null; bg?: string; photoUrl?: string | null; avatarMode?: AvatarMode };

// Anything with a card's picture fields: Card, Me, leaderboard rows.
type Pictured = { name: string; avatar?: MonitoLook; photoUrl?: string | null; avatarMode?: AvatarMode };

export const avatarOf = (who: Pictured): Person => ({ name: who.name, look: who.avatar, photoUrl: who.photoUrl, avatarMode: who.avatarMode });

type Props = {
  // A sample person (gallery, mocks) or a real one.
  who?: SampleId;
  person?: Person;
  // Round head of `size` px; or full body with `px` per cell.
  size?: number;
  px?: number;
  shadow?: number;
  className?: string;
};

type Resolved = { name: string; look: MonitoLook; bg: string; photo: string | null };

function resolve(who: SampleId | undefined, person: Person | undefined): Resolved {
  if (who) return { ...SAMPLE_PEOPLE[who], photo: null };
  const name = person?.name ?? "Monito";
  const photo = effectiveAvatarMode(person?.avatarMode, person?.photoUrl) === "photo" ? (person?.photoUrl ?? null) : null;
  return { name, look: person?.look ?? DEFAULT_LOOK, bg: person?.bg ?? circleColorFor(name), photo };
}

const ring = (shadow: number) => ({ boxShadow: shadow ? `${shadow}px ${shadow}px 0 #1E1B2E` : "none" });

// Ported from design/compa-v2/componentes/Avatar.dc.html: the head is centred in a circle that crops the body.
export function Avatar({ who, person, size = 40, px = 0, shadow = 0, className }: Props) {
  const { name, look, bg, photo } = resolve(who, person);
  if (photo) {
    const fallback = <Avatar person={{ name, look, bg }} size={size} px={px} shadow={shadow} className={className} />;
    return <Photo src={photo} name={name} size={px > 0 ? GRID_WIDTH * px : size} shadow={px > 0 ? 4 : shadow} className={className} fallback={fallback} />;
  }
  if (px > 0) return <Monito look={look} px={px} label={name} className={className} />;
  const cellPx = Math.round((size / 15) * 10) / 10;
  const bodyWidth = GRID_WIDTH * cellPx;
  const bodyHeight = GRID_HEIGHT * cellPx;
  const x = Math.round((size - 5 - bodyWidth) / 2);
  const y = Math.round(size * 0.08 - 2.5);
  return (
    <span className={`relative block shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      <span className="absolute inset-0 box-border block overflow-hidden rounded-full border-ink" style={{ background: bg, ...ring(shadow) }}>
        <span className="absolute block" style={{ left: x, top: y, width: bodyWidth, height: bodyHeight }}>
          <Monito look={look} px={cellPx} label={name} />
        </span>
      </span>
    </span>
  );
}
