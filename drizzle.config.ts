import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  // Migrations are DDL; use the direct or session-pooler URL (port 5432) when the transaction pooler rejects them.
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
