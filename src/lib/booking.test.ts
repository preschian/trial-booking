import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import { createAppDb } from "../db/client";
import { bookings, paymentAttempts } from "../db/schema";
import { seedDatabase } from "../db/seed";
import { settlePayment, startTrialBooking } from "./booking";
import { errorCopy, errorMessageForQuery } from "./copy";

const tempDir = mkdtempSync(path.join(tmpdir(), "trial-booking-"));
const dbPath = path.join(tempDir, "test.db");
const { db } = createAppDb(dbPath);

before(() => {
  seedDatabase(db);
});

after(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function confirmedForClass(classId: number) {
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.classId, classId))
    .all()
    .filter((row) => row.status === "confirmed").length;
}

test("seed includes available, last-seat, duplicate, and payment-failure cases", () => {
  const seeded = seedDatabase(db);

  const fractionsConfirmed = db
    .select()
    .from(bookings)
    .all()
    .filter(
      (row) =>
        row.classId === seeded.classes.fractions.id &&
        row.status === "confirmed",
    );
  const forcesConfirmed = db
    .select()
    .from(bookings)
    .all()
    .filter(
      (row) =>
        row.classId === seeded.classes.forces.id && row.status === "confirmed",
    );
  const leoAlgebra = db
    .select()
    .from(bookings)
    .all()
    .find(
      (row) =>
        row.studentId === seeded.students.leo.id &&
        row.classId === seeded.classes.algebra.id,
    );
  const noraFractions = db
    .select()
    .from(bookings)
    .all()
    .find(
      (row) =>
        row.studentId === seeded.students.nora.id &&
        row.classId === seeded.classes.fractions.id,
    );

  assert.equal(fractionsConfirmed.length, 0);
  assert.equal(forcesConfirmed.length, 3);
  assert.equal(leoAlgebra?.status, "confirmed");
  assert.equal(noraFractions?.status, "payment_failed");
});

test("rejects a duplicate confirmed booking for the same child and class", () => {
  const seeded = seedDatabase(db);
  const result = startTrialBooking(db, {
    parentId: seeded.parents.maya.id,
    studentId: seeded.students.leo.id,
    classId: seeded.classes.algebra.id,
  });

  assert.deepEqual(result, { ok: false, error: "duplicate" });
});

test("payment failure records an attempt and does not confirm a seat", () => {
  const seeded = seedDatabase(db);
  const started = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.sam.id,
    classId: seeded.classes.fractions.id,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const settled = settlePayment(db, {
    parentId: seeded.parents.jordan.id,
    bookingId: started.bookingId,
    result: "failure",
  });

  assert.deepEqual(settled, { ok: true, status: "payment_failed" });
  assert.equal(confirmedForClass(seeded.classes.fractions.id), 0);

  const attempts = db
    .select()
    .from(paymentAttempts)
    .where(eq(paymentAttempts.bookingId, started.bookingId))
    .all();
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.result, "failure");

  const booking = db
    .select()
    .from(bookings)
    .where(eq(bookings.id, started.bookingId))
    .get();
  assert.equal(booking?.status, "payment_failed");
});

test("the last remaining seat can be confirmed by only one paying parent", () => {
  const seeded = seedDatabase(db);

  const noraStart = startTrialBooking(db, {
    parentId: seeded.parents.maya.id,
    studentId: seeded.students.nora.id,
    classId: seeded.classes.forces.id,
  });
  const samStart = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.sam.id,
    classId: seeded.classes.forces.id,
  });

  assert.equal(noraStart.ok, true);
  assert.equal(samStart.ok, true);
  if (!noraStart.ok || !samStart.ok) return;

  const samPays = settlePayment(db, {
    parentId: seeded.parents.jordan.id,
    bookingId: samStart.bookingId,
    result: "success",
  });
  const noraPays = settlePayment(db, {
    parentId: seeded.parents.maya.id,
    bookingId: noraStart.bookingId,
    result: "success",
  });

  assert.deepEqual(samPays, { ok: true, status: "confirmed" });
  assert.deepEqual(noraPays, { ok: true, status: "seat_unavailable" });
  assert.equal(confirmedForClass(seeded.classes.forces.id), 4);
});

test("a parent cannot book a child that is not theirs", () => {
  const seeded = seedDatabase(db);
  const result = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.leo.id,
    classId: seeded.classes.fractions.id,
  });

  assert.deepEqual(result, { ok: false, error: "forbidden" });
});

test("a second payment on the same booking is rejected", () => {
  const seeded = seedDatabase(db);
  const started = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.sam.id,
    classId: seeded.classes.fractions.id,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const first = settlePayment(db, {
    parentId: seeded.parents.jordan.id,
    bookingId: started.bookingId,
    result: "success",
  });
  const second = settlePayment(db, {
    parentId: seeded.parents.jordan.id,
    bookingId: started.bookingId,
    result: "success",
  });

  assert.deepEqual(first, { ok: true, status: "confirmed" });
  assert.deepEqual(second, { ok: false, error: "not_pending" });
});

test("a parent cannot pay for another family's booking", () => {
  const seeded = seedDatabase(db);
  const started = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.sam.id,
    classId: seeded.classes.fractions.id,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const result = settlePayment(db, {
    parentId: seeded.parents.maya.id,
    bookingId: started.bookingId,
    result: "success",
  });

  assert.deepEqual(result, { ok: false, error: "forbidden" });
});

test("retrying after a confirmed payment cannot move the row back to pending", () => {
  const seeded = seedDatabase(db);
  const started = startTrialBooking(db, {
    parentId: seeded.parents.maya.id,
    studentId: seeded.students.nora.id,
    classId: seeded.classes.fractions.id,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const paid = settlePayment(db, {
    parentId: seeded.parents.maya.id,
    bookingId: started.bookingId,
    result: "success",
  });
  const retry = startTrialBooking(db, {
    parentId: seeded.parents.maya.id,
    studentId: seeded.students.nora.id,
    classId: seeded.classes.fractions.id,
  });

  const booking = db
    .select()
    .from(bookings)
    .where(eq(bookings.id, started.bookingId))
    .get();

  assert.deepEqual(paid, { ok: true, status: "confirmed" });
  assert.deepEqual(retry, { ok: false, error: "duplicate" });
  assert.equal(booking?.status, "confirmed");
});

test("starting the same booking twice returns the same pending row", () => {
  const seeded = seedDatabase(db);
  const first = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.sam.id,
    classId: seeded.classes.fractions.id,
  });
  const second = startTrialBooking(db, {
    parentId: seeded.parents.jordan.id,
    studentId: seeded.students.sam.id,
    classId: seeded.classes.fractions.id,
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.bookingId, second.bookingId);
});

test("unknown and inherited error query keys are ignored", () => {
  assert.equal(errorMessageForQuery(undefined), null);
  assert.equal(errorMessageForQuery("duplicate"), errorCopy.duplicate);
  assert.equal(errorMessageForQuery("__proto__"), null);
  assert.equal(errorMessageForQuery("toString"), null);
  assert.equal(errorMessageForQuery("constructor"), null);
});
