import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type Props = {
  // Unique on the page; also names the CSS anchor, so use letters, digits and hyphens (`menu-${event.id}`).
  id: string;
  // Carries the entity: "More actions for Founders Fest" (repeated buttons, spec §6.4).
  label: string;
  children: ReactNode;
  icon?: IconName;
  className?: string;
};

// A ⋯ menu on the native `popover` attribute: light dismiss, Esc and focus return need no JS state (spec §5.1), so it
// works in server components. A full-width bottom sheet below 768 px; from md it hangs under its button where CSS anchor
// positioning exists (flipping up near the bottom), and falls back to the browser's centered popover elsewhere.
export function RowMenu({ id, label, children, icon = "more", className }: Props) {
  const anchor = { "--anchor": `--${id}` } as CSSProperties;
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={label}
        title={label}
        style={anchor}
        className={`relative z-10 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[12px] text-ink [anchor-name:var(--anchor)] hover:bg-sun-soft ${className ?? ""}`}
      >
        <Icon name={icon} size={22} />
      </button>
      <div
        id={id}
        popover="auto"
        aria-label={label}
        style={anchor}
        className="fixed inset-x-0 top-auto bottom-0 m-0 box-border w-full max-w-none rounded-t-card bg-white p-2 pb-[max(8px,env(safe-area-inset-bottom))] text-ink border-ink shadow-hard-4 backdrop:bg-ink/30 md:w-max md:max-w-[320px] md:min-w-[220px] md:rounded-[16px] md:inset-0 md:m-auto md:h-fit md:pb-2 md:backdrop:bg-transparent md:supports-[anchor-name:--a]:inset-auto md:supports-[anchor-name:--a]:m-0 md:supports-[anchor-name:--a]:mt-1 md:supports-[anchor-name:--a]:[position-anchor:var(--anchor)] md:supports-[anchor-name:--a]:[position-area:bottom_span-left] md:supports-[anchor-name:--a]:[position-try-fallbacks:flip-block]"
      >
        <ul className="m-0 flex list-none flex-col p-0">{children}</ul>
      </div>
    </>
  );
}

const ITEM =
  "box-border flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2 text-left font-body text-[15px] font-extrabold text-ink no-underline hover:bg-sun-soft focus-visible:bg-sun-soft disabled:cursor-default disabled:opacity-60";

type ItemBase = { children: ReactNode; icon?: IconName; danger?: boolean };
type LinkItem = ItemBase & { href: string; external?: boolean; download?: string };
// Buttons close the menu (popovertarget hide) and run `onClick`; only client components can pass one.
type ButtonItem = ItemBase & { menuId: string; onClick: () => void; disabled?: boolean };

export function RowMenuItem(props: LinkItem | ButtonItem) {
  const className = `${ITEM} ${props.danger ? "hover:bg-coral-soft focus-visible:bg-coral-soft" : ""}`;
  const body = (
    <>
      {props.icon && <Icon name={props.icon} size={20} />}
      <span className="min-w-0 flex-1">{props.children}</span>
      {"external" in props && props.external && <Icon name="external" size={16} />}
    </>
  );
  if ("menuId" in props) {
    return (
      <li>
        <button type="button" popoverTarget={props.menuId} popoverTargetAction="hide" onClick={props.onClick} disabled={props.disabled} className={className}>
          {body}
        </button>
      </li>
    );
  }
  return <li>{linkFor(props, className, body)}</li>;
}

// Data URIs and other origins are plain anchors; app routes go through next/link.
function linkFor({ href, external, download }: LinkItem, className: string, body: ReactNode) {
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{body}</a>;
  if (download !== undefined) return <a href={href} download={download} className={className}>{body}</a>;
  return <Link href={href} className={className}>{body}</Link>;
}

export const RowMenuSeparator = () => <li role="separator" className="dashed-ink mx-2 my-1" />;
