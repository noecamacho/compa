// Shared frame for the event entry screens (door, join, not found).
// Phones: content fills the screen and the actions sit at the bottom, in the thumb zone, clear of the home indicator.
// Tablets and desktops: no thumb zone, so content and actions stay together as one centered group (proximity).
export const EVENT_MAIN =
  "paper-dots flex min-h-svh w-full flex-col items-center overflow-x-clip px-[max(18px,env(safe-area-inset-left))] pt-[max(20px,env(safe-area-inset-top))] pb-[max(20px,env(safe-area-inset-bottom))] sm:px-8 md:py-10";

export const EVENT_STACK = "flex flex-1 flex-col justify-between gap-6 md:justify-center md:gap-8";
