// Roles and flags of the admin console (data model M20). Pure, shared by the schema, the API schemas and the UI.
export const USER_ROLES = ["user", "super_admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EVENT_STATUSES = ["draft", "live", "ended", "archived"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const ORGANIZER_ROLES = ["owner", "organizer", "staff"] as const;
export type OrganizerRole = (typeof ORGANIZER_ROLES)[number];

export const isSuperAdmin = (person: { role: UserRole } | null | undefined): boolean => person?.role === "super_admin";

// Test people never appear at, or join, an event that is not itself a test event (M20).
export const canAttend = (person: { isTest: boolean }, event: { isTest: boolean }): boolean => event.isTest || !person.isTest;

// Outside an event nobody is checked in, so the pair itself must be all test or all real.
export const canConnectOutsideEvent = (a: { isTest: boolean }, b: { isTest: boolean }): boolean => a.isTest === b.isTest;

export function visibleAtEvent<T extends { isTest: boolean }>(event: { isTest: boolean }, people: readonly T[]): T[] {
  return people.filter((person) => canAttend(person, event));
}
