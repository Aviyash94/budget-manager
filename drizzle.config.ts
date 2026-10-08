import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "turso",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./local.db",
    // An empty value (common in .env files) counts as "not set"; drizzle-kit rejects "".
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  },
});
