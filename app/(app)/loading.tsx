import { Screen } from "@/components/ui/Screen";
import { requestCopy } from "@/lib/server/locale";

// A block of the skeleton: the card shape with its ink border at low contrast, pulsing (still when reduced motion is on).
const Block = ({ className }: { className: string }) => <span aria-hidden="true" className={`block animate-pulse rounded-card border-[2.5px] border-ink/10 bg-ink/5 ${className}`} />;

// Shown while any attendee screen loads: the shape of a screen (top bar, a big card, two smaller ones), so the
// layout does not jump when the data arrives. Same columns as the real screens from 834.
export default async function AppLoading() {
  const copy = (await requestCopy()).copy.screenState;
  return (
    <Screen dock>
      <div role="status" className="flex items-center gap-3">
        <Block className="h-[46px] w-[46px] rounded-full" />
        <Block className="h-6 w-40 rounded-[10px]" />
        <span className="sr-only">{copy.loading}</span>
      </div>
      <div className="flex flex-col gap-[14px] md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-5">
        <Block className="h-[300px]" />
        <div className="flex flex-col gap-[14px] lg:gap-5">
          <Block className="h-[86px] md:h-[180px]" />
          <Block className="h-[98px]" />
        </div>
      </div>
    </Screen>
  );
}
