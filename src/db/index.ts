import "server-only";

import { createAppDb, defaultDatabasePath } from "./client";
import { seedIfEmpty } from "./seed";

const DATABASE_PATH = process.env.DATABASE_PATH ?? defaultDatabasePath;

function getAppDb() {
  const appDb = createAppDb(DATABASE_PATH);
  seedIfEmpty(appDb.db);
  return appDb;
}

const globalForDb = globalThis as unknown as {
  appDb?: ReturnType<typeof getAppDb>;
};

const appDb = globalForDb.appDb ?? getAppDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.appDb = appDb;
}

export const db = appDb.db;
export { DATABASE_PATH };
