"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "@/components/brand/Logo";
import { useCopy } from "@/components/LocaleProvider";
import { markSeen } from "@/components/tour/Tour";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { ConnectionRequest } from "@/lib/api/schemas";
import { ScaledFrame } from "./ScaledFrame";

export type DemoLinks = {
  // The phone's page for each guide step, in order.
  phone: readonly string[];
  screen: string;
  console: string;
  // The person the guide connects the visitor with (steps 4 and 5 show that connection).
  target: { handle: string; topics: string[] };
};

const STEP_MS = 6_500;
// Steps whose phone page is the visitor's connection, so it must exist first.
const NEEDS_LINK = new Set([3, 4]);
// The guide replaces the app's own tours, which would cover the small phone.
const TOURS = ["home", "connect", "register", "ranking", "me"];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const LINK_CLASS =
  "box-border inline-flex h-11 items-center justify-center rounded-chip bg-white px-3 font-display text-[14px] font-bold whitespace-nowrap text-ink border-ink shadow-hard-2 pressable";

// /demo: the big screen and the phone side by side, driven by a six-step guide that plays on its own or by hand.
export function DemoStage({ links }: { links: DemoLinks }) {
  const { demo: copy } = useCopy();
  const total = copy.steps.length;
  const [step, setStep] = useState(0);
  // Plays on its own unless the system asks for less motion; Play and Pause override it.
  const reduced = useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const [chosen, setPlaying] = useState<boolean | null>(null);
  const playing = chosen ?? !reduced;
  const [failed, setFailed] = useState(false);
  const linked = useRef(false);

  useEffect(() => {
    TOURS.forEach(markSeen);
    const pauseWhenHidden = () => document.hidden && setPlaying(false);
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  // The visitor's connection with the target; a repeat answers the same connection, so this is safe to retry.
  const ensureLink = useCallback(async (): Promise<boolean> => {
    if (linked.current) return true;
    try {
      await apiCall("POST", "/api/connections", ConnectionRequest, { toHandle: links.target.handle, knew: false, screenConsent: true, topics: links.target.topics });
      linked.current = true;
      return true;
    } catch {
      return false;
    }
  }, [links.target]);

  const go = useCallback(
    async (next: number) => {
      const index = (next + total) % total;
      const ready = !NEEDS_LINK.has(index) || (await ensureLink());
      setFailed(!ready);
      if (!ready) return setPlaying(false);
      setStep(index);
    },
    [ensureLink, total],
  );

  // Each step restarts the clock, so a step picked by hand also gets its full time.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => void go(step + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, step, go]);

  async function startOver() {
    await apiCall("POST", "/api/auth/signout", NoBody).catch(() => undefined);
    window.location.reload();
  }

  const current = copy.steps[step];

  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-10 sm:px-8 md:gap-5 md:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Logo />
          <Pill tone="sun" rotate={-2}>
            {copy.notice}
          </Pill>
        </div>
        <nav className="flex flex-wrap gap-2">
          <a href={links.screen} target="_blank" rel="noopener" className={LINK_CLASS}>
            {copy.openScreen}
          </a>
          <a href={links.phone[0]} target="_blank" rel="noopener" className={LINK_CLASS}>
            {copy.openPhone}
          </a>
          <a href={links.console} target="_blank" rel="noopener" className={LINK_CLASS}>
            {copy.openConsole}
          </a>
          <button type="button" onClick={() => void startOver()} className={`${LINK_CLASS} cursor-pointer bg-coral-soft`}>
            {copy.startOver}
          </button>
        </nav>
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-display text-[clamp(28px,6vw,46px)] leading-[1.05] font-bold tracking-[-0.5px] text-balance">{copy.title}</h1>
        <p className="m-0 max-w-[62ch] text-[15px] leading-[1.45] font-bold text-muted sm:text-[17px]">{copy.lead}</p>
      </div>

      <Card className="flex flex-col gap-4 p-3 sm:p-5">
        <ol aria-label={copy.stepsLabel} className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-6">
          {copy.steps.map((item, index) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => void go(index)}
                aria-current={index === step ? "step" : undefined}
                className="box-border flex h-full min-h-11 w-full cursor-pointer items-center gap-1 rounded-[12px] bg-white px-[10px] py-2 text-left text-[14px] leading-[1.2] font-bold text-ink border-ink aria-[current=step]:bg-mint aria-[current=step]:shadow-hard-3"
              >
                <span className="font-display">{index + 1}.</span> {item.label}
              </button>
            </li>
          ))}
        </ol>

        <div className="grid items-start gap-[18px] lg:grid-cols-[minmax(0,2.15fr)_minmax(190px,0.8fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="rounded-[18px] bg-ink p-[10px] pb-[14px] shadow-[5px_5px_0_rgba(30,27,46,0.35)]">
              <ScaledFrame src={links.screen} title={copy.screenTitle} width={1920} height={1080} className="rounded-[10px] bg-paper" />
            </div>
            <p aria-live="polite" className="m-0 text-[16px] leading-[1.45] font-bold">
              <span className="font-display">{copy.stepOf(step + 1, total)}</span> {current?.text}
            </p>
            {failed && (
              <p role="alert" className="m-0 text-[14px] font-extrabold text-coral">
                {copy.connectFailed}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button variant="primary" height={46} className="col-span-2 sm:w-auto" onClick={() => setPlaying(!playing)}>
                {playing ? copy.pause : copy.play}
              </Button>
              <Button height={46} className="sm:w-auto" onClick={() => void go(step - 1)}>
                {copy.previous}
              </Button>
              <Button height={46} className="sm:w-auto" onClick={() => void go(step + 1)}>
                {copy.next}
              </Button>
            </div>
            {reduced && <p className="m-0 text-[13px] font-bold text-muted">{copy.reducedMotion}</p>}
          </div>

          <div className="mx-auto w-full max-w-[250px] overflow-hidden rounded-[34px] border-[5px] border-solid border-ink bg-paper shadow-[5px_5px_0_rgba(30,27,46,0.35)] lg:max-w-none">
            <ScaledFrame src={links.phone[step] ?? links.phone[0] ?? "/home"} title={copy.phoneTitle} width={390} height={844} />
          </div>
        </div>
      </Card>
    </div>
  );
}
