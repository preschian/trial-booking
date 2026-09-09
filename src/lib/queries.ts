import { and, count, desc, eq } from "drizzle-orm";
import type { AppDb } from "../db/client";
import {
  bookings,
  parents,
  paymentAttempts,
  students,
  trialClasses,
} from "../db/schema";

export function listParents(db: AppDb) {
  return db.select().from(parents).all();
}

export function listStudentsForParent(db: AppDb, parentId: number) {
  return db
    .select()
    .from(students)
    .where(eq(students.parentId, parentId))
    .all();
}

export function listClassesWithAvailability(db: AppDb) {
  const classes = db.select().from(trialClasses).all();

  return classes.map((trialClass) => {
    const confirmed = db
      .select({ value: count() })
      .from(bookings)
      .where(
        and(
          eq(bookings.classId, trialClass.id),
          eq(bookings.status, "confirmed"),
        ),
      )
      .get();

    const seatsTaken = confirmed?.value ?? 0;

    return {
      ...trialClass,
      seatsTaken,
      seatsRemaining: Math.max(trialClass.capacity - seatsTaken, 0),
    };
  });
}

export function getBookingForParent(
  db: AppDb,
  bookingId: number,
  parentId: number,
) {
  const row = db
    .select({
      booking: bookings,
      student: students,
      trialClass: trialClasses,
    })
    .from(bookings)
    .innerJoin(students, eq(bookings.studentId, students.id))
    .innerJoin(trialClasses, eq(bookings.classId, trialClasses.id))
    .where(eq(bookings.id, bookingId))
    .get();

  if (!row || row.student.parentId !== parentId) {
    return null;
  }

  return row;
}

export function listPaymentAttempts(db: AppDb, bookingId: number) {
  return db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.bookingId, bookingId))
    .orderBy(desc(paymentAttempts.id))
    .all();
}

export function listRoster(db: AppDb) {
  const classes = listClassesWithAvailability(db);

  return classes.map((trialClass) => {
    const roster = db
      .select({
        bookingId: bookings.id,
        studentName: students.name,
        parentName: parents.name,
        status: bookings.status,
      })
      .from(bookings)
      .innerJoin(students, eq(bookings.studentId, students.id))
      .innerJoin(parents, eq(students.parentId, parents.id))
      .where(eq(bookings.classId, trialClass.id))
      .all();

    return {
      ...trialClass,
      confirmed: roster.filter((row) => row.status === "confirmed"),
      otherBookings: roster.filter((row) => row.status !== "confirmed"),
    };
  });
}
