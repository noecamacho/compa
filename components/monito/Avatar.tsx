import { GRID_HEIGHT, GRID_WIDTH } from "@/lib/monito/grid";
import { DEFAULT_LOOK, type MonitoLook } from "@/lib/monito/look";
import { SAMPLE_PEOPLE, circleColorFor, type SampleId } from "@/lib/monito/sample-people";
import { Monito } from "./Monito";

type Person = { name: string; look?: MonitoLook | null; bg?: string };

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

type Resolved = { name: string; look: MonitoLook; bg: string };

function resolve(who: SampleId | undefined, person: Person | undefined): Resolved {
  if (who) return SAMPLE_PEOPLE[who];
  const name = person?.name ?? "Monito";
  return { name, look: person?.look ?? DEFAULT_LOOK, bg: person?.bg ?? circleColorFor(name) };
}

// Ported from design/compa-v2/componentes/Avatar.dc.html: the head is centred in a circle that crops the body.
export function Avatar({ who, person, size = 40, px = 0, shadow = 0, className }: Props) {
  const { name, look, bg } = resolve(who, person);
  if (px > 0) return <Monito look={look} px={px} label={name} className={className} />;
  const cellPx = Math.round((size / 15) * 10) / 10;
  const bodyWidth = GRID_WIDTH * cellPx;
  const bodyHeight = GRID_HEIGHT * cellPx;
  const x = Math.round((size - 5 - bodyWidth) / 2);
  const y = Math.round(size * 0.08 - 2.5);
  return (
    <span className={`relative block shrink-0 ${className ?? ""}`} style={{ width: size, height: size }}>
      <span
        className="absolute inset-0 box-border block overflow-hidden rounded-full border-ink"
        style={{ background: bg, boxShadow: shadow ? `${shadow}px ${shadow}px 0 #1E1B2E` : "none" }}
      >
        <span className="absolute block" style={{ left: x, top: y, width: bodyWidth, height: bodyHeight }}>
          <Monito look={look} px={cellPx} label={name} />
        </span>
      </span>
    </span>
  );
}
