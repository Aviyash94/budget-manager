import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export function createDb(url: string, authToken?: string) {
  return drizzle(createClient({ url, authToken }), { schema });
}

export type Db = ReturnType<typeof createDb>;

let cached: Db | undefined;

/** Local dev uses a `file:` URL; production uses Turso (libsql://) with an auth token. */
export function getDb(): Db {
  cached ??= createDb(
    process.env.DATABASE_URL ?? "file:./local.db",
    process.env.TURSO_AUTH_TOKEN || undefined,
  );
  return cached;
}
