"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCopy } from "@/components/LocaleProvider";
import { HIT_AREA } from "@/components/ui/hit-area";
import { apiCall } from "@/lib/api/client";
import { Me } from "@/lib/api/schemas";

type Props = { shown: boolean };

// Wear or put away the golden cap everywhere (photo overlay and monito); the stored photo and monito never change.
export function CapToggle({ shown }: Props) {
  const copy = useCopy().invite;
  const router = useRouter();
  const [on, setOn] = useState(shown);

  function toggle() {
    const next = !on;
    setOn(next);
    void apiCall("PATCH", "/api/me", Me, { showAccessories: next }).then(
      () => router.refresh(),
      () => setOn(!next),
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className={`${HIT_AREA} flex cursor-pointer items-center gap-[10px] self-start text-left text-[13px] font-extrabold text-ink`}
    >
      <span className="relative h-[26px] w-[46px] shrink-0 rounded-full border-ink transition-colors duration-200" style={{ background: on ? "#6BE4A3" : "#FFFFFF" }}>
        <span
          className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-ink transition-[left] duration-200"
          style={{ left: on ? 22 : 3 }}
        />
      </span>
      {copy.showCap}
    </button>
  );
}
