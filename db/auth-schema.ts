import { pgSchema, uuid } from "drizzle-orm/pg-core";

// Supabase owns `auth.users`. This reference exists only for the foreign key from `users.auth_user_id`;
// it lives outside `db/schema.ts` so drizzle-kit never tries to create or alter it.
const auth = pgSchema("auth");

export const authUsers = auth.table("users", { id: uuid("id").primaryKey() });
