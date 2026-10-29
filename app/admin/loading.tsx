import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { adminCopy } from "@/lib/server/admin-page";

// Skeleton in the shape of the console's content: header row, then rows. Honest and layout-stable, no fake progress.
export default async function AdminLoading() {
  const { copy } = await adminCopy();
  return (
    <AdminShell copy={copy}>
      <div role="status" aria-live="polite" className="flex flex-col gap-5">
        <span className="sr-only">{copy.ui.loading}</span>
        <div aria-hidden className="h-10 w-48 animate-pulse rounded-[12px] bg-ink/10" />
        <Card className="flex flex-col gap-4 px-4 py-4" ariaLabel={copy.ui.loading}>
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="h-5 w-1/3 animate-pulse rounded-[8px] bg-ink/10" />
              <div className="hidden h-5 w-1/4 animate-pulse rounded-[8px] bg-ink/10 md:block" />
              <div className="ml-auto h-5 w-20 animate-pulse rounded-[8px] bg-ink/10" />
            </div>
          ))}
        </Card>
      </div>
    </AdminShell>
  );
}
