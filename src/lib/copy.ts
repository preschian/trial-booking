import type { BookingStatus } from "../db/schema";
import type { BookingError } from "./booking";

export const errorCopy: Record<BookingError, string> = {
  unauthenticated: "Choose a parent profile before booking.",
  forbidden: "That child is not on this parent profile.",
  not_found: "We could not find that booking or class.",
  duplicate: "This child already has a confirmed seat in that class.",
  class_full: "That class has no remaining seats.",
  not_pending: "This booking is not waiting for payment.",
  invalid_input: "Check the selected child and class, then try again.",
};

export const statusCopy: Record<BookingStatus, { title: string; body: string }> =
  {
    pending_payment: {
      title: "Waiting for payment",
      body: "The seat is not held yet. Completing payment will claim a confirmed spot if one is still open.",
    },
    confirmed: {
      title: "Booking confirmed",
      body: "This child is on the class roster.",
    },
    payment_failed: {
      title: "Payment failed",
      body: "No seat was taken. You can start the booking again from the class list.",
    },
    seat_unavailable: {
      title: "Seat taken",
      body: "Payment succeeded, but another family claimed the last seat first. This child is not on the roster. Treat this as a refund in a real payments flow.",
    },
    cancelled: {
      title: "Cancelled",
      body: "This booking is no longer active.",
    },
  };

const classTimeFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function formatClassTime(iso: string) {
  return classTimeFormatter.format(new Date(iso));
}
