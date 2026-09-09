import { createAppDb, resolveDatabasePath } from "./client";
import { seedDatabase } from "./seed";

const databasePath = resolveDatabasePath();
const { db } = createAppDb(databasePath);
seedDatabase(db);
console.log(`Seeded trial booking data at ${databasePath}.`);
