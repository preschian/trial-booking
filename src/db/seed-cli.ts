import { createAppDb } from "./client";
import { seedDatabase } from "./seed";

const { db } = createAppDb();
seedDatabase(db);
console.log("Seeded trial booking data.");
