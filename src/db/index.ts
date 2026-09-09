import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DATABASE_PATH =
  process.env.DATABASE_PATH ??
  path.join(process.cwd(), "data", "trial-booking.db");

function createDb() {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

  const sqlite = new Database(DATABASE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  return drizzle({ client: sqlite, schema });
}

const globalForDb = globalThis as unknown as {
  db?: ReturnType<typeof createDb>;
};

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

export { DATABASE_PATH };
