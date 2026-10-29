"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { Dictionary } from "@/lib/copy";
import { TEST_PRESETS, type TestPreset } from "@/lib/testing/profiles";
import { AdminField, AdminInput } from "./AdminField";

export type TestEvent = { slug: string; name: string };
export type GeneratorInput = { count: number; preset: TestPreset; checkInTo: string };

type Props = { copy: Dictionary["admin"]; testEvents: TestEvent[]; busy: boolean; startOpen: boolean; onCreate: (input: GeneratorInput) => Promise<unknown> };

const MAX_COUNT = 50;
const isValidCount = (amount: number) => Number.isInteger(amount) && amount >= 1 && amount <= MAX_COUNT;

// The generator (spec §5.5). <768: a <details> ("Create test users"), open when the list is empty. 768–1279: one row
// above the table. ≥1280: a sticky card in the left column. From md the summary hides and `::details-content` is forced
// visible, so the same form serves every width without a JS width check.
export function TestUserGenerator({ copy, testEvents, busy, startOpen, onCreate }: Props) {
  const tests = copy.tests;
  const [count, setCount] = useState("3");
  const [preset, setPreset] = useState<TestPreset>("random");
  const [checkInTo, setCheckInTo] = useState(testEvents[0]?.slug ?? "");
  const [touched, setTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const amount = Number(count);
  const countError = touched && !isValidCount(amount) ? copy.ui.tests.countInvalid : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValidCount(amount)) return;
    setCreating(true);
    await onCreate({ count: amount, preset, checkInTo });
    setCreating(false);
  }

  return (
    <details
      open={startOpen}
      className="group box-border block rounded-card bg-white shadow-hard-4 border-ink xl:sticky xl:top-6 md:[&::details-content]:block md:[&::details-content]:[content-visibility:visible]"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 font-display text-[18px] font-bold md:hidden [&::-webkit-details-marker]:hidden">
        <Icon name="flask" size={22} />
        <span className="flex-1">{tests.generatorTitle}</span>
        <span aria-hidden className="-rotate-90 transition-transform group-open:rotate-90">
          <Icon name="back" size={20} />
        </span>
      </summary>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-3 px-4 pb-4 md:grid-cols-[110px_1fr_1fr] md:px-5 md:pt-4 lg:grid-cols-[120px_1fr_1fr_auto] xl:grid-cols-1 xl:gap-4 xl:p-5">
        <h2 className="m-0 hidden font-display text-[22px] leading-[1.15] font-bold xl:block">{tests.generatorTitle}</h2>
        <AdminInput id="test-count" label={tests.count} type="number" inputMode="numeric" min={1} max={MAX_COUNT} value={count} onChange={(e) => setCount(e.target.value)} onBlur={() => setTouched(true)} error={countError} hint={copy.ui.tests.countRange} />
        <AdminField id="test-preset" label={tests.preset}>
          {(aria, className) => (
            <select id="test-preset" value={preset} onChange={(e) => setPreset(e.target.value as TestPreset)} className={`${className} h-11`} {...aria}>
              {TEST_PRESETS.map((key) => (
                <option key={key} value={key}>
                  {tests.presets[key]}
                </option>
              ))}
            </select>
          )}
        </AdminField>
        <AdminField id="test-checkin" label={tests.checkInTo}>
          {(aria, className) => (
            <select id="test-checkin" value={checkInTo} onChange={(e) => setCheckInTo(e.target.value)} className={`${className} h-11`} {...aria}>
              <option value="">{tests.none}</option>
              {testEvents.map((event) => (
                <option key={event.slug} value={event.slug}>
                  {event.name}
                </option>
              ))}
            </select>
          )}
        </AdminField>
        <Button type="submit" variant="primary" height={48} disabled={busy} className="md:col-span-full md:w-auto! md:justify-self-start md:px-6 lg:col-span-1 lg:mt-[21px] xl:mt-0 xl:w-full!">
          {creating ? tests.creating : isValidCount(amount) ? tests.createN(amount) : tests.create}
        </Button>
        <p className="m-0 rounded-[12px] bg-sun-soft px-3 py-2 text-[13px] leading-[1.35] font-bold border-ink md:col-span-full xl:col-span-1">{tests.signInNote}</p>
      </form>
    </details>
  );
}
