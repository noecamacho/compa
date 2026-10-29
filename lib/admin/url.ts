// URL state of the admin lists (spec §6.1): filters, sort, page and tab live in searchParams so back, refresh and share work.
export type UrlParams = Record<string, string | undefined>;

// Builds `path?…` from the current params plus a patch. Empty values and values equal to `defaults` are dropped, page 1
// included, and `page` resets whenever anything other than `page` changes (a new filter starts on page 1).
export function hrefWith(path: string, current: UrlParams, patch: UrlParams, defaults: UrlParams = {}): string {
  const changesMore = Object.entries(patch).some(([key, value]) => key !== "page" && value !== current[key]);
  const reset = changesMore && !("page" in patch) ? { page: undefined } : {};
  const merged: UrlParams = { ...current, ...patch, ...reset };
  const kept = Object.entries(merged).filter((entry): entry is [string, string] => isKept(entry, defaults));
  const query = new URLSearchParams(kept).toString();
  return query ? `${path}?${query}` : path;
}

const isKept = ([key, value]: [string, string | undefined], defaults: UrlParams): boolean =>
  value !== undefined && value !== "" && value !== defaults[key] && !(key === "page" && value === "1");
