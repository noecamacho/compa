import type { ReactNode, SVGProps } from "react";

// 24×24 stroke icons copied from the design mocks (design/compa-v2/pantallas). `filled` icons use fill instead of stroke.
const ICONS = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  qr: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <path d="M14 14h3v3h-3zM18 18h3v3h-3zM18 14h3M14 18v3" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="3" />
      <path d="M21 20c0-2.5-1.7-4.6-4-5.4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  back: <path d="M15 6l-6 6 6 6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M6 12.5l4 4L18 8" />,
  plus: <path d="M12 5v14M5 12h14" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
    </>
  ),
  mic: (
    <>
      <path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  refresh: <path d="M4 11a8 8 0 0 1 13.7-5.3L20 8M20 4v4h-4M20 13a8 8 0 0 1-13.7 5.3L4 16M4 20v-4h4" />,
  userPlus: (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M3 20c0-3.6 3-6.5 7-6.5 1.4 0 2.6.3 3.7.9M18 14v6M15 17h6" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  share: <path d="M12 15V3M7 8l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" />,
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
      <circle cx="15.5" cy="8.5" r="1.3" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="1.3" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z" />
      <path d="M14 6l3 3" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" fill="#FFD93D" />
      <path d="M8 21h8M12 17v4M7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3" />
    </>
  ),
  cap: (
    <>
      <path d="M4 14c0-4.4 3.6-8 8-8s8 3.6 8 8v1H4z" />
      <path d="M4 15h17l-1 3H5z" />
    </>
  ),
  linkedin: <path d="M3 9h4v12H3zM5 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM11 21v-7a3 3 0 0 1 6 0v7M11 9v12" />,
  instagram: <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM17.5 6.5h.01" />,
  whatsapp: <path d="M21 12a9 9 0 0 1-13.3 7.9L3 21l1.1-4.7A9 9 0 1 1 21 12z" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  // Filled icons
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  heart: <path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

const FILLED: ReadonlySet<IconName> = new Set<IconName>(["bolt", "heart"]);

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & { name: IconName; size?: number; strokeWidth?: number };

export function Icon({ name, size = 22, strokeWidth = 2.6, ...rest }: Props) {
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={filled ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {ICONS[name]}
    </svg>
  );
}
