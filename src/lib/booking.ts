import { and, count, eq, inArray } from "drizzle-orm";
import type { AppDb } from "../db/client";
import {
  bookings,
  paymentAttempts,
  students,
  trialClasses,
  type BookingStatus,
  type PaymentResult,
} from "../db/schema";

export type BookingError =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "duplicate"
  | "class_full"
  | "not_pending"
  | "invalid_input";

export type StartBookingResult =
  | { ok: true; bookingId: number }
  | { ok: false; error: BookingError };

export type SettlePaymentResult =
  | { ok: true; status: BookingStatus }
  | { ok: false; error: BookingError };

const resumableStatuses = [
  "payment_failed",
  "seat_unavailable",
  "cancelled",
] as const;

function now(): string {
  return new Date().toISOString();
}

function isUniqueConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return false;
  }

  return (
    error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    error.code === "SQLITE_CONSTRAINT"
  );
}

function getStudentForParent(
  db: AppDb,
  studentId: number,
  parentId: number,
) {
  return db
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.parentId, parentId)))
    .get();
}

function confirmedCount(db: AppDb, classId: number): number {
  const row = db
    .select({ value: count() })
    .from(bookings)
    .where(
      and(eq(bookings.classId, classId), eq(bookings.status, "confirmed")),
    )
    .get();

  return row?.value ?? 0;
}

function bookingForStudentAndClass(
  db: AppDb,
  studentId: number,
  classId: number,
) {
  return db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.studentId, studentId), eq(bookings.classId, classId)),
    )
    .get();
}

function resultForExisting(
  existing: { id: number; status: BookingStatus },
): StartBookingResult {
  if (existing.status === "confirmed") {
    return { ok: false, error: "duplicate" };
  }

  if (existing.status === "pending_payment") {
    return { ok: true, bookingId: existing.id };
  }

  return { ok: false, error: "invalid_input" };
}

export function startTrialBooking(
  db: AppDb,
  input: { parentId: number; studentId: number; classId: number },
): StartBookingResult {
  return db.transaction(
    (tx) => {
      const store = tx as unknown as AppDb;
      const student = getStudentForParent(
        store,
        input.studentId,
        input.parentId,
      );
      if (!student) {
        return { ok: false, error: "forbidden" };
      }

      const trialClass = store
        .select()
        .from(trialClasses)
        .where(eq(trialClasses.id, input.classId))
        .get();

      if (!trialClass) {
        return { ok: false, error: "not_found" };
      }

      const existing = bookingForStudentAndClass(
        store,
        input.studentId,
        input.classId,
      );

      if (existing?.status === "confirmed") {
        return { ok: false, error: "duplicate" };
      }

      if (existing?.status === "pending_payment") {
        return { ok: true, bookingId: existing.id };
      }

      if (confirmedCount(store, input.classId) >= trialClass.capacity) {
        return { ok: false, error: "class_full" };
      }

      if (existing) {
        const resumed = store
          .update(bookings)
          .set({ status: "pending_payment", updatedAt: now() })
          .where(
            and(
              eq(bookings.id, existing.id),
              inArray(bookings.status, [...resumableStatuses]),
            ),
          )
          .run();

        if (resumed.changes === 0) {
          const latest = bookingForStudentAndClass(
            store,
            input.studentId,
            input.classId,
          );
          if (!latest) {
            return { ok: false, error: "not_found" };
          }
          return resultForExisting(latest);
        }

        return { ok: true, bookingId: existing.id };
      }

      try {
        const created = store
          .insert(bookings)
          .values({
            studentId: input.studentId,
            classId: input.classId,
            status: "pending_payment",
          })
          .returning()
          .get();

        if (!created) {
          return { ok: false, error: "invalid_input" };
        }

        return { ok: true, bookingId: created.id };
      } catch (error) {
        if (!isUniqueConflict(error)) {
          throw error;
        }

        const latest = bookingForStudentAndClass(
          store,
          input.studentId,
          input.classId,
        );
        if (!latest) {
          return { ok: false, error: "invalid_input" };
        }
        return resultForExisting(latest);
      }
    },
    { behavior: "immediate" },
  );
}

export function settlePayment(
  db: AppDb,
  input: { parentId: number; bookingId: number; result: PaymentResult },
): SettlePaymentResult {
  return db.transaction(
    (tx) => {
      const store = tx as unknown as AppDb;
      const booking = store
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .get();

      if (!booking) {
        return { ok: false, error: "not_found" };
      }

      const student = getStudentForParent(
        store,
        booking.studentId,
        input.parentId,
      );
      if (!student) {
        return { ok: false, error: "forbidden" };
      }

      if (booking.status !== "pending_payment") {
        return { ok: false, error: "not_pending" };
      }

      store
        .insert(paymentAttempts)
        .values({ bookingId: booking.id, result: input.result })
        .run();

      if (input.result === "failure") {
        const failed = store
          .update(bookings)
          .set({ status: "payment_failed", updatedAt: now() })
          .where(
            and(
              eq(bookings.id, booking.id),
              eq(bookings.status, "pending_payment"),
            ),
          )
          .run();

        if (failed.changes === 0) {
          return { ok: false, error: "not_pending" };
        }

        return { ok: true, status: "payment_failed" };
      }

      const trialClass = store
        .select()
        .from(trialClasses)
        .where(eq(trialClasses.id, booking.classId))
        .get();

      if (!trialClass) {
        return { ok: false, error: "not_found" };
      }

      const taken = confirmedCount(store, booking.classId);
      const nextStatus: BookingStatus =
        taken >= trialClass.capacity ? "seat_unavailable" : "confirmed";

      const updated = store
        .update(bookings)
        .set({ status: nextStatus, updatedAt: now() })
        .where(
          and(
            eq(bookings.id, booking.id),
            eq(bookings.status, "pending_payment"),
          ),
        )
        .run();

      if (updated.changes === 0) {
        return { ok: false, error: "not_pending" };
      }

      return { ok: true, status: nextStatus };
    },
    { behavior: "immediate" },
  );
}
