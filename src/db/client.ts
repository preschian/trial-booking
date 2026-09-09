import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export const defaultDatabasePath = path.join(
  process.cwd(),
  "data",
  "trial-booking.db",
);

export function createAppDb(databasePath = defaultDatabasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  return { sqlite, db };
}

export type AppDb = ReturnType<typeof createAppDb>["db"];
