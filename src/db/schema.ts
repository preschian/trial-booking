import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const bookingStatuses = [
  "pending_payment",
  "confirmed",
  "payment_failed",
  "seat_unavailable",
  "cancelled",
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export const paymentResults = ["success", "failure"] as const;
export type PaymentResult = (typeof paymentResults)[number];

export const parents = sqliteTable("parents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
});

export const students = sqliteTable("students", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id")
    .notNull()
    .references(() => parents.id),
  name: text("name").notNull(),
});

export const trialClasses = sqliteTable("trial_classes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  startsAt: text("starts_at").notNull(),
  capacity: integer("capacity").notNull().default(4),
});

export const bookings = sqliteTable(
  "bookings",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    classId: integer("class_id")
      .notNull()
      .references(() => trialClasses.id),
    status: text("status", { enum: bookingStatuses })
      .notNull()
      .default("pending_payment"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("bookings_student_class_unique").on(
      table.studentId,
      table.classId,
    ),
  ],
);

export const paymentAttempts = sqliteTable("payment_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookings.id),
  result: text("result", { enum: paymentResults }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
