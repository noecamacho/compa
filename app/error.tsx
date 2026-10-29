"use client";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { Muted } from "@/components/ui/Text";
import { useCopy } from "@/components/LocaleProvider";

type Props = { error: Error & { digest?: string }; retry: () => void };

// Any page outside the signed-in app (landing, event door, sign-in) that failed: say so and offer a retry.
// The digest matches the server log line, so a person can quote it to the organizers.
export default function RootError({ error, retry }: Props) {
  const copy = useCopy().screenState;
  return (
    <Screen width="focus" className="justify-center">
      <Card className="flex flex-col items-center gap-3 px-5 py-6 text-center">
        <div role="alert" className="flex flex-col items-center gap-2">
          <h1 className="m-0 font-display text-[24px] leading-[1.1] font-bold">{copy.errorTitle}</h1>
          <Muted className="max-w-[340px] text-[14px] leading-[1.4] font-bold">{copy.errorBody}</Muted>
          {error.digest ? <Muted className="text-[12px]">Ref: {error.digest}</Muted> : null}
        </div>
        <div className="flex w-full flex-col gap-[10px] pt-1">
          <Button variant="primary" onClick={retry}>
            {copy.retry}
          </Button>
          <ButtonLink href="/" height={46}>
            {copy.goHome}
          </ButtonLink>
        </div>
      </Card>
    </Screen>
  );
}
