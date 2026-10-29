"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { TestSession, TestUserList, type TestUserT } from "@/lib/api/admin-schemas";
import { apiCall } from "@/lib/api/client";
import { NoBody } from "@/lib/api/route-spec";
import { copyFor } from "@/lib/copy";
import type { Locale } from "@/lib/i18n";
import { EmptyState } from "./AdminParts";
import { Notice } from "./Notice";
import { TestUserGenerator, type GeneratorInput, type TestEvent } from "./TestUserGenerator";
import { TestUserTable } from "./TestUserTable";
import { useAdminAction } from "./useAdminAction";

type Props = {
  locale: Locale;
  users: TestUserT[];
  testEvents: TestEvent[];
  me: { id: string; handle: string };
  // From the request, so server and client agree on "2 hours ago".
  now: string;
  handlePrefix: string | undefined;
};

const PATH = "/admin/test-users";

// Create, sign in as and delete test users (API spec A11, spec §5.5). Signing in replaces this browser's admin session.
// ≥1280: generator (sticky) | list. Below: generator above the list.
export function TestUsersPanel({ locale, users, testEvents, me, now, handlePrefix }: Props) {
  const copy = copyFor(locale).admin;
  const tests = copy.tests;
  const router = useRouter();
  const { busy, error, notice, run, runMany, dialog } = useAdminAction(tests.failed);
  const deleteErrors = { cannot_delete_self: tests.cannotDeleteSelf };
  const deleteOne = (user: TestUserT) => apiCall("DELETE", `/api/admin/test-users/${user.id}`, NoBody);

  const create = ({ count, preset, checkInTo }: GeneratorInput) =>
    run(() => apiCall("POST", "/api/admin/test-users", TestUserList, { count, preset, ...(checkInTo ? { checkInTo } : {}) }), { done: copy.ui.done.testCreated(count) });

  async function signInAs(user: TestUserT) {
    const { title, confirm } = copy.ui.dialogs.signIn;
    const ok = await run(() => apiCall("POST", `/api/admin/test-users/${user.id}/session`, TestSession), {
      confirm: { title: title(user.name), body: tests.signInWarning(me.handle), confirmLabel: confirm, cancelLabel: copy.ui.cancel },
    });
    if (ok) router.push("/home");
  }

  const remove = (user: TestUserT) =>
    run(() => deleteOne(user), {
      confirm: { title: copy.ui.dialogs.deleteTest.title(user.name), body: tests.deleteConfirm, confirmLabel: copy.ui.dialogs.deleteTest.confirm, cancelLabel: copy.ui.cancel, danger: true },
      done: copy.ui.dialogs.deleteTest.done,
      errors: deleteErrors,
    });

  const removeMany = (picked: TestUserT[]) =>
    runMany(picked, deleteOne, {
      confirm: { title: tests.bulkDeleteTitle(picked.length), body: tests.bulkDeleteBody(picked.map((user) => user.name)), confirmLabel: tests.deleteN(picked.length), cancelLabel: copy.ui.cancel, danger: true },
      done: (ok) => tests.bulkDone(ok.length),
      failed: (failed) => tests.bulkFailed(failed.map((user) => user.name)),
    });

  return (
    <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[360px_minmax(0,1fr)] xl:items-start xl:gap-6">
      <TestUserGenerator copy={copy} testEvents={testEvents} busy={busy} startOpen={users.length === 0 && !handlePrefix} onCreate={create} />
      <div className="flex min-w-0 flex-col gap-4">
        <PrefixFilter copy={copy} handlePrefix={handlePrefix} count={users.length} />
        <Notice tone="error" className="contents">{error}</Notice>
        <Notice tone="success" className="contents">{notice}</Notice>
        {users.length === 0 && <NoTestUsers copy={copy} handlePrefix={handlePrefix} />}
        {users.length > 0 && (
          <TestUserTable copy={copy} locale={locale} users={users} meId={me.id} now={now} busy={busy} onSignIn={signInAs} onDelete={remove} onDeleteMany={removeMany} />
        )}
      </div>
      {dialog}
    </div>
  );
}

type FilterProps = { copy: ReturnType<typeof copyFor>["admin"]; handlePrefix: string | undefined; count: number };

// Narrow to one run's users (`?handlePrefix=k3p9`) before cleaning up. A plain GET form; the pattern mirrors the API's.
function PrefixFilter({ copy, handlePrefix, count }: FilterProps) {
  const tests = copy.tests;
  return (
    <form method="get" action={PATH} role="search" className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
      <div className="relative min-w-0 md:flex-1">
        <label htmlFor="handle-prefix" className="sr-only">
          {tests.handlePrefix}
        </label>
        <input
          id="handle-prefix"
          name="handlePrefix"
          type="search"
          defaultValue={handlePrefix ?? ""}
          placeholder={tests.handlePrefix}
          title={tests.handlePrefixHint}
          pattern="[a-z0-9\-]{1,32}"
          maxLength={32}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          className="box-border block h-11 w-full rounded-[12px] bg-white pr-12 pl-3 font-body text-[16px] font-bold text-ink outline-none border-ink transition-shadow duration-200 placeholder:text-muted focus:shadow-[0_0_0_4px_#6BE4A3] md:text-[14px]"
        />
        <button type="submit" aria-label={tests.handlePrefix} title={tests.handlePrefix} className="absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-r-[12px] text-ink hover:bg-sun-soft">
          <Icon name="search" size={20} />
        </button>
      </div>
      <p role="status" className="m-0 text-[13px] font-extrabold whitespace-nowrap text-muted tabular-nums">
        {tests.shown(count)}
      </p>
    </form>
  );
}

function NoTestUsers({ copy, handlePrefix }: Omit<FilterProps, "count">) {
  if (!handlePrefix) return <EmptyState title={copy.tests.empty} body={copy.tests.intro} />;
  return (
    <EmptyState
      title={copy.tests.noMatchPrefix(handlePrefix)}
      action={
        <Link href={PATH} className="inline-flex min-h-11 items-center text-[14px] font-extrabold underline">
          {copy.ui.list.clearFilters}
        </Link>
      }
    />
  );
}
