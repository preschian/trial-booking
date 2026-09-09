import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { PayForm } from "@/app/bookings/[id]/pay-form";
import { SiteHeader } from "@/app/site-header";
import { formatClassTime, statusCopy } from "@/lib/copy";
import {
  getBookingForParent,
  listParents,
  listPaymentAttempts,
} from "@/lib/queries";
import { requireAuth } from "@/lib/session";

export const metadata: Metadata = {
  title: "Booking status",
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookingId = Number(id);
  const parent = await requireAuth();
  const parents = listParents(db);

  if (!parent || !Number.isInteger(bookingId) || bookingId <= 0) {
    notFound();
  }

  const detail = getBookingForParent(db, bookingId, parent.id);
  if (!detail) {
    notFound();
  }

  const attempts = listPaymentAttempts(db, bookingId);
  const copy = statusCopy[detail.booking.status];
  const canPay = detail.booking.status === "pending_payment";

  return (
    <>
      <SiteHeader parents={parents} currentParentId={parent.id} />
      <main className="page">
        <p className="eyebrow">
          <Link href="/">Back to classes</Link>
        </p>
        <h1>{copy.title}</h1>
        <p>{copy.body}</p>

        <dl className="facts">
          <div>
            <dt>Child</dt>
            <dd>{detail.student.name}</dd>
          </div>
          <div>
            <dt>Class</dt>
            <dd>
              {detail.trialClass.title}
              <span>{formatClassTime(detail.trialClass.startsAt)}</span>
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{detail.booking.status.replaceAll("_", " ")}</dd>
          </div>
        </dl>

        {canPay ? <PayForm bookingId={bookingId} /> : null}

        {attempts.length > 0 ? (
          <section className="attempts">
            <h2>Payment attempts</h2>
            <ul>
              {attempts.map((attempt) => (
                <li key={attempt.id}>
                  {attempt.result} · {attempt.createdAt}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}
