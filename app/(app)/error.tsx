"use client";

import { Icon } from "@/components/icons";
import { Monito } from "@/components/monito/Monito";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Muted } from "@/components/ui/Text";
import { screenState as copy } from "@/lib/copy/es";
import { withDefaults } from "@/lib/monito/look";

const LOOK = withDefaults({});

type Props = { error: Error & { digest?: string }; retry: () => void };

// Any attendee screen whose data failed to load: say what happened and offer a retry, never a blank page.
export default function AppError({ retry }: Props) {
  return (
    <Screen width="focus" className="justify-center">
      <Card className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <span className="flex h-[120px] w-[104px] items-end justify-center rounded-button bg-coral-soft pb-[6px] border-ink" style={{ transform: "rotate(-3deg)" }}>
          <Monito look={LOOK} px={5} />
        </span>
        <div role="alert" className="flex flex-col items-center gap-2">
          <h1 className="m-0 font-display text-[24px] leading-[1.1] font-bold">{copy.errorTitle}</h1>
          <Muted className="max-w-[340px] text-[14px] leading-[1.4] font-bold">{copy.errorBody}</Muted>
        </div>
        <div className="flex w-full flex-col gap-[10px] pt-1">
          <Button variant="primary" onClick={retry}>
            <Icon name="refresh" size={18} strokeWidth={2.8} />
            {copy.retry}
          </Button>
          <ButtonLink href="/home" height={46}>
            {copy.goHome}
          </ButtonLink>
        </div>
      </Card>
    </Screen>
  );
}
