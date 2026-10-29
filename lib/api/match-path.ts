export type PathParams = Record<string, string>;

const decoded = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

// `/api/e/{code}/live` against `/api/e/k7m2/live` → { code: "k7m2" }; null when the shape differs or a segment is
// malformed (`100%`), so the caller falls back to HTTP and its 404.
export function matchPath(pattern: string, pathname: string): PathParams | null {
  const want = pattern.split("/");
  const got = pathname.split("/");
  if (want.length !== got.length) return null;
  const params: PathParams = {};
  for (const [index, part] of want.entries()) {
    const value = got[index] ?? "";
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    if (!name && part !== value) return null;
    if (!name) continue;
    const param = decoded(value);
    if (param === null) return null;
    params[name] = param;
  }
  return params;
}
