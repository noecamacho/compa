"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Avatar } from "@/components/monito/Avatar";
import { Pill } from "@/components/ui/Pill";
import { welcome } from "@/lib/copy/es";

type Mode = "create" | "signIn";

const DESTINATION: Record<Mode, string> = { create: "/onboarding/profile", signIn: "/home" };

const linkedinHref = (mode: Mode, mock: boolean) =>
  mock ? DESTINATION[mode] : `/auth/linkedin?next=${encodeURIComponent(DESTINATION[mode])}`;

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="relative flex h-10 w-[46px] items-center justify-center gap-2 rounded-[17px] bg-sun border-ink shadow-hard-3"
        style={{ transform: "rotate(-6deg)" }}
      >
        <span className="h-[10px] w-[7px] rounded-[4px] bg-ink" />
        <span className="h-[10px] w-[7px] rounded-[4px] bg-ink" />
        <span
          className="absolute bottom-[-10px] left-[10px] h-3 w-3 bg-sun"
          style={{ borderLeft: "2.5px solid #1E1B2E", borderBottom: "2.5px solid #1E1B2E", transform: "skewX(20deg)" }}
        />
      </span>
      <span className="font-display text-[30px] leading-none font-bold tracking-[-0.5px]">{welcome.brand}</span>
    </div>
  );
}

function Scene() {
  return (
    <div aria-hidden="true" className="relative mt-[22px] h-[250px]">
      <span className="absolute top-[108px] right-[46px] left-[46px]" style={{ borderTop: "3px dashed #1E1B2E" }} />
      <span className="absolute top-9 left-4" style={{ transform: "rotate(-5deg)" }}>
        <Avatar who="DR" px={6} />
      </span>
      <span className="absolute top-9 right-4" style={{ transform: "rotate(5deg) scaleX(-1)" }}>
        <Avatar who="VO" px={6} />
      </span>
      <span className="absolute top-[22px] left-1/2" style={{ transform: "translateX(-50%) rotate(6deg)" }}>
        <Pill tone="sun" height={42} className="rounded-[12px] px-[14px] text-[20px] shadow-hard-3">
          <Icon name="bolt" size={16} />
          +50
        </Pill>
      </span>
      <span className="absolute top-[184px] left-1/2" style={{ transform: "translateX(-50%) rotate(-3deg)" }}>
        <Pill kind="text" height={34} className="rounded-[12px] px-3">
          {welcome.sampleTopic}
        </Pill>
      </span>
    </div>
  );
}

export function Welcome({ mock, error }: { mock: boolean; error: boolean }) {
  const [mode, setMode] = useState<Mode>("create");
  const create = mode === "create";
  return (
    <main className="paper-dots relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col px-6 pt-14 pb-[34px]">
      <Logo />
      <Scene />
      <h1 className="mt-[10px] font-display text-[34px] leading-[1.05] font-bold tracking-[-0.5px]">
        {welcome.title[0]}
        <br />
        {welcome.title[1]}
      </h1>
      <ol className="mt-[22px] flex list-none flex-col gap-3 p-0">
        {welcome.steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 text-[15px] leading-[1.3] font-bold">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-display text-[13px] font-bold border-ink">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
      <div className="mt-auto flex flex-col gap-3">
        {error && <span className="text-center text-[12px] font-extrabold text-coral">{welcome.signInError}</span>}
        <div role="group" aria-label={welcome.modeLabel} className="grid grid-cols-2 gap-1 rounded-button bg-white p-1 border-ink shadow-hard-3">
          {(["create", "signIn"] as const).map((option) => {
            const on = option === mode;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(option)}
                className="h-10 cursor-pointer rounded-chip border-0 font-display text-[15px] font-bold"
                style={{ background: on ? "#1E1B2E" : "transparent", color: on ? "#FFF6E5" : "#1E1B2E" }}
              >
                {option === "create" ? welcome.create : welcome.signIn}
              </button>
            );
          })}
        </div>
        <Link
          href={linkedinHref(mode, mock)}
          className="flex h-14 items-center justify-center gap-[10px] rounded-button bg-linkedin px-5 font-display text-[17px] font-bold whitespace-nowrap text-white border-ink shadow-hard-4"
        >
          <Icon name="link" size={20} />
          {create ? welcome.ctaCreate : welcome.ctaSignIn}
        </Link>
        <span className="self-center text-center text-[12px] leading-[1.4] font-extrabold text-muted">
          {create ? welcome.noteCreate : welcome.noteSignIn}
        </span>
      </div>
    </main>
  );
}
