import type { z } from "zod";

export type RawSearchParams = Record<string, string | string[] | undefined>;

// Page-side parsing of searchParams that never throws on input (spec §7.3, edge case 1): each key is validated on its own
// and an invalid one (`?page=abc`, `?test=foo`, an 81-character `q`) falls back to its default instead of the error
// screen. Every key of the schema must be optional or have a default.
export function parsePageParams<S extends z.ZodObject>(schema: S, raw: RawSearchParams): z.output<S> {
  const cleaned = Object.fromEntries(Object.entries(schema.shape).map(([key, field]) => [key, validOrUndefined(field, first(raw[key]))]));
  return schema.parse(cleaned);
}

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

const validOrUndefined = (field: z.ZodType, value: string | undefined): string | undefined => (field.safeParse(value).success ? value : undefined);
