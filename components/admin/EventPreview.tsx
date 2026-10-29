import { Card } from "@/components/ui/Card";
import { Muted, SectionLabel } from "@/components/ui/Text";
import type { Dictionary } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { StatusPill, TestPill } from "./StatusPill";
import type { FormState } from "./eventFormState";

type Props = { locale: Locale; copy: Dictionary["admin"]; state: FormState };

// "YYYY-MM-DDTHH:mm" is already wall-clock time in the event's zone, so it is formatted as-is (UTC) to avoid any shift.
const format = (locale: Locale, local: string, options: Intl.DateTimeFormatOptions) => {
  const date = new Date(`${local}:00Z`);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(locale === "es" ? "es-MX" : "en-US", { ...options, timeZone: "UTC" }).format(date);
};

// Live preview of the event as the form is filled, so the desktop layout reads as form | result.
export function EventPreview({ locale, copy, state }: Props) {
  const day = format(locale, state.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const hours = [format(locale, state.startsAt, { hour: "numeric", minute: "2-digit" }), format(locale, state.endsAt, { hour: "numeric", minute: "2-digit" })].filter(Boolean).join("–");
  const place = [state.details.venueName, state.details.city].map((part) => part.trim()).filter(Boolean).join(", ");
  return (
    <Card tone="sky-soft" className="flex flex-col gap-3 px-5 py-5" ariaLabel={copy.ui.form.previewTitle}>
      <SectionLabel>{copy.ui.form.previewTitle}</SectionLabel>
      <span className="flex flex-wrap gap-2">
        <StatusPill status={state.status} copy={copy} />
        {state.isTest && <TestPill label={copy.events.test} />}
      </span>
      <p className="m-0 font-display text-[24px] leading-[1.1] font-bold [overflow-wrap:anywhere]">{state.name.trim() || copy.ui.form.previewUntitled}</p>
      <p className="m-0 text-[14px] font-extrabold">{[day, hours].filter(Boolean).join(" · ")}</p>
      {place && <p className="m-0 text-[14px] font-bold">{place}</p>}
      {state.description.trim() && <p className="m-0 text-[13px] leading-[1.4] font-bold break-words text-ink/80">{state.description.trim()}</p>}
      <div className="dashed-ink flex flex-col gap-1 pt-3">
        <Muted className="text-[12px] font-extrabold">{copy.ui.form.previewLink}</Muted>
        <code className="text-[13px] font-extrabold break-all">{state.slug ? `/admin/events/${state.slug}` : copy.ui.form.previewEmptyLink}</code>
      </div>
    </Card>
  );
}
