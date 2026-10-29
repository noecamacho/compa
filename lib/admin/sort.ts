// Default sort direction for every admin list (events, people, attendees): names A to Z, everything else newest
// or largest first. Pure, so the API and the console's sortable headers agree.
export type SortDir = "asc" | "desc";

export const sortDirection = (sort: string, dir?: SortDir): SortDir => dir ?? (sort === "name" ? "asc" : "desc");
