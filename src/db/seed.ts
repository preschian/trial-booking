import { count, eq } from "drizzle-orm";
import type { AppDb } from "./client";
import {
  bookings,
  parents,
  paymentAttempts,
  students,
  trialClasses,
} from "./schema";

const SEED_PARENT_EMAIL = "maya.chen@example.com";

function utcDaysFromNow(days: number, hours = 16) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hours, 0, 0, 0);
  return date.toISOString();
}

export function seedIfEmpty(db: AppDb) {
  const existing = db
    .select({ value: count() })
    .from(parents)
    .get();

  if ((existing?.value ?? 0) > 0) {
    return;
  }

  seedDatabase(db);
}

export function seedDatabase(db: AppDb) {
  db.delete(paymentAttempts).run();
  db.delete(bookings).run();
  db.delete(students).run();
  db.delete(parents).run();
  db.delete(trialClasses).run();

  const [maya, jordan, priya, ben, elena] = db
    .insert(parents)
    .values([
      { name: "Maya Chen", email: SEED_PARENT_EMAIL },
      { name: "Jordan Hale", email: "jordan.hale@example.com" },
      { name: "Priya Shah", email: "priya.shah@example.com" },
      { name: "Ben Ortiz", email: "ben.ortiz@example.com" },
      { name: "Elena Rossi", email: "elena.rossi@example.com" },
    ])
    .returning()
    .all();

  if (!maya || !jordan || !priya || !ben || !elena) {
    throw new Error("Failed to seed parents.");
  }

  const [leo, nora, sam, aria, milo, luca] = db
    .insert(students)
    .values([
      { parentId: maya.id, name: "Leo Chen" },
      { parentId: maya.id, name: "Nora Chen" },
      { parentId: jordan.id, name: "Sam Hale" },
      { parentId: priya.id, name: "Aria Shah" },
      { parentId: ben.id, name: "Milo Ortiz" },
      { parentId: elena.id, name: "Luca Rossi" },
    ])
    .returning()
    .all();

  if (!leo || !nora || !sam || !aria || !milo || !luca) {
    throw new Error("Failed to seed students.");
  }

  const [fractions, forces, algebra] = db
    .insert(trialClasses)
    .values([
      {
        title: "Fractions Lab",
        startsAt: utcDaysFromNow(7),
        capacity: 4,
      },
      {
        title: "Forces and Motion",
        startsAt: utcDaysFromNow(8),
        capacity: 4,
      },
      {
        title: "Algebra Foundations",
        startsAt: utcDaysFromNow(9, 15),
        capacity: 4,
      },
    ])
    .returning()
    .all();

  if (!fractions || !forces || !algebra) {
    throw new Error("Failed to seed classes.");
  }

  db.insert(bookings)
    .values([
      { studentId: aria.id, classId: forces.id, status: "confirmed" },
      { studentId: milo.id, classId: forces.id, status: "confirmed" },
      { studentId: luca.id, classId: forces.id, status: "confirmed" },
      { studentId: leo.id, classId: algebra.id, status: "confirmed" },
      {
        studentId: nora.id,
        classId: fractions.id,
        status: "payment_failed",
      },
    ])
    .run();

  const noraFractions = db
    .select()
    .from(bookings)
    .where(eq(bookings.studentId, nora.id))
    .get();

  if (noraFractions) {
    db.insert(paymentAttempts)
      .values({ bookingId: noraFractions.id, result: "failure" })
      .run();
  }

  return {
    parents: { maya, jordan, priya, ben, elena },
    students: { leo, nora, sam, aria, milo, luca },
    classes: { fractions, forces, algebra },
  };
}
