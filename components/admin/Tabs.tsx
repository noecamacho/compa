import { FilterTabs, type FilterOption } from "./AdminParts";

type Props = { label: string; tabs: FilterOption[]; active: string };

// Page tabs as links (`?tab=`), so a tab is shareable and back works (spec §5.3). Link tabs are navigation, so `nav` +
// `aria-current`, not role="tablist". Sticky under the phone top bar (56 px) and at the top from md; scrolls sideways
// when the labels and counts ("People 340") don't fit.
export function Tabs({ label, tabs, active }: Props) {
  return (
    <div className="sticky top-14 z-20 -mx-4 bg-paper/95 px-4 py-2 md:top-0 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8 2xl:-mx-12 2xl:px-12">
      <FilterTabs label={label} options={tabs} active={active} />
    </div>
  );
}
