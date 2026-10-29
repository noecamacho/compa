import { BADGES, CATEGORY_STYLE, SHAPES, type BadgeId } from "@/lib/badges/catalog";

// "pending": still to earn but its art is shown (faded, with the lock); "locked": grey mystery, for secret badges.
export type BadgeState = "earned" | "pending" | "locked";

type Props = {
  id: BadgeId;
  size?: number;
  state?: BadgeState;
  withName?: boolean;
  tilted?: boolean;
  className?: string;
};

const LOCKED = { fill: "#EDE6D6", stroke: "#6F6A7E", iconFill: "#F4EEE2", iconDark: "#B9B1A2" } as const;

// Ribbon text shrinks with the name length (Insignia.dc.html `fs`).
const ribbonFontSize = (text: string): number => (text.length > 13 ? 10 : text.length > 10 ? 11.5 : 13);

const lockedFill = (fill: string | undefined, locked: boolean, dark = false): string => {
  if (!fill || fill === "none") return "none";
  if (!locked) return fill;
  return dark ? LOCKED.iconDark : LOCKED.iconFill;
};

// Ported from design/compa-v2/componentes/Insignia.dc.html: hard shadow, dashed inner outline, icon, lock, sparkle, ribbon.
export function Badge({ id, size = 120, state = "earned", withName = false, tilted = false, className }: Props) {
  const badge = BADGES[id];
  const style = CATEGORY_STYLE[badge.category];
  const locked = state === "locked";
  const earned = state === "earned";
  const shape = SHAPES[style.shape];
  const viewHeight = withName ? 156 : 130;
  const stroke = locked ? LOCKED.stroke : "#1E1B2E";
  const icon = badge.icon;
  const textFill = locked ? "#6F6A7E" : "#1E1B2E";
  const label = `${badge.name}${earned ? "" : ", por ganar"}`;
  return (
    <svg
      viewBox={`0 0 120 ${viewHeight}`}
      width={size}
      height={Math.round((size * viewHeight) / 120)}
      role="img"
      aria-label={label}
      className={className}
      style={{ display: "block", overflow: "visible", fontFamily: "var(--font-display)" }}
    >
      <g transform={tilted ? "rotate(-5 60 65)" : undefined}>
        <g opacity={state === "pending" ? 0.6 : 1}>
          {earned && <path d={shape} transform="translate(4,4)" fill="#1E1B2E" />}
          <path
            d={shape}
            fill={locked ? LOCKED.fill : style.fill}
            stroke={stroke}
            strokeWidth={4}
            strokeDasharray={earned ? undefined : "9 7"}
            strokeLinejoin="round"
          />
          <path
            d={shape}
            transform="translate(60,62) scale(0.84) translate(-60,-62)"
            fill="none"
            stroke={stroke}
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinejoin="round"
            opacity={0.7}
          />
          <g
            transform="translate(32,34)"
            fill="none"
            stroke={stroke}
            strokeWidth={4.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={locked ? 0.75 : 1}
          >
            {icon.a && <path d={icon.a} fill={lockedFill(icon.fa, locked)} />}
            {icon.b && <path d={icon.b} fill={lockedFill(icon.fb, locked)} />}
            {icon.c && <path d={icon.c} fill={lockedFill(icon.fc, locked)} />}
            {icon.d && <path d={icon.d} fill={lockedFill(icon.fd, locked, true)} stroke="none" />}
            {icon.text && (
              <text
                x={icon.text.x}
                y={icon.text.y}
                textAnchor="middle"
                fontWeight={700}
                fontSize={icon.text.size}
                fill={textFill}
                stroke="none"
              >
                {icon.text.value}
              </text>
            )}
          </g>
        </g>
        {!earned && (
          <g transform="translate(82,84)">
            <rect x={-13} y={-2} width={26} height={22} rx={6} fill="#FFFFFF" stroke="#1E1B2E" strokeWidth={3} />
            <path d="M-7 -2 V-8 a7 7 0 0 1 14 0 V-2" fill="none" stroke="#1E1B2E" strokeWidth={3} />
          </g>
        )}
        {earned && size >= 64 && (
          <path
            d="M94 18 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"
            fill="#FFFFFF"
            stroke="#1E1B2E"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )}
        {withName && (
          <g transform="translate(0,116)">
            <path d="M14 8 l-9 16 13 -1 5 12 11 -19z" fill="#FF6B4A" stroke="#1E1B2E" strokeWidth={3} strokeLinejoin="round" />
            <path d="M106 8 l9 16 -13 -1 -5 12 -11 -19z" fill="#FF6B4A" stroke="#1E1B2E" strokeWidth={3} strokeLinejoin="round" />
            <rect x={16} y={0} width={88} height={26} rx={7} fill={style.ribbon} stroke="#1E1B2E" strokeWidth={3} />
            <text
              x={60}
              y={18}
              textAnchor="middle"
              fontWeight={700}
              fontSize={ribbonFontSize(badge.shortName)}
              fill="#1E1B2E"
              letterSpacing={0.5}
            >
              {badge.shortName}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}
