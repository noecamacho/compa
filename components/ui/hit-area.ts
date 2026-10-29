// Grows the tappable area of a compact control (34 px chips, 32 px swatches) to at least 44×44 without changing how it
// looks: an invisible ::after centered on the control. The control must not itself be absolutely positioned.
export const HIT_AREA =
  "relative after:absolute after:top-1/2 after:left-1/2 after:h-[max(100%,44px)] after:w-[max(100%,44px)] after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']";
