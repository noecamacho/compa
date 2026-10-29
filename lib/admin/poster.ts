// Confetti for the admin QR poster (components/admin/QrPoster.tsx). No Math.random: the server and the browser must
// render the same stage, so pieces are spread by the golden ratio and every value is a pure function of the index.
export type ConfettiPiece = {
  left: number; // % of the stage width
  size: number; // vmin
  color: string;
  round: boolean;
  duration: number; // s for one fall
  delay: number; // negative s, so the sky is already full on the first frame
  sway: number; // vmin of sideways drift over one fall
  spin: number; // deg over one fall
};

const COLORS = ["#6BE4A3", "#6CC4FF", "#FF8FAB", "#FFD93D", "#FF6B4A"] as const;
const GOLDEN = 0.618033988749895;

const fraction = (value: number) => value - Math.floor(value);
const round2 = (value: number) => Math.round(value * 100) / 100;

export function confettiPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, index) => {
    const spread = fraction((index + 1) * GOLDEN);
    const jitter = fraction((index + 1) * GOLDEN * GOLDEN * 7);
    const duration = round2(8 + jitter * 6);
    return {
      left: round2(spread * 100),
      size: round2(1 + jitter * 1.4),
      color: COLORS[index % COLORS.length] as string,
      round: index % 3 === 0,
      duration,
      delay: -round2(spread * duration),
      sway: round2((jitter - 0.5) * 16),
      spin: index % 2 === 0 ? 540 : -540,
    };
  });
}
