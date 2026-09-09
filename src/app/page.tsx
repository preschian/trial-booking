import type { Metadata } from "next";
import { db } from "@/db";
import { BookForm } from "@/app/book-form";
import { SiteHeader } from "@/app/site-header";
import { errorMessageForQuery, formatClassTime } from "@/lib/copy";
import { listClassesWithAvailability, listParents, listStudentsForParent } from "@/lib/queries";
import { requireAuth } from "@/lib/session";

export const metadata: Metadata = {
  title: "Book a trial",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, parent] = await Promise.all([searchParams, requireAuth()]);
  const parents = listParents(db);
  const students = parent ? listStudentsForParent(db, parent.id) : [];
  const classes = listClassesWithAvailability(db).map((trialClass) => ({
    id: trialClass.id,
    title: trialClass.title,
    startsLabel: formatClassTime(trialClass.startsAt),
    seatsRemaining: trialClass.seatsRemaining,
    capacity: trialClass.capacity,
    hasStarted: trialClass.hasStarted,
  }));

  const queryError = errorMessageForQuery(params.error);

  return (
    <>
      <SiteHeader
        parents={parents}
        currentParentId={parent?.id ?? null}
      />
      <main className="page">
        <section className="intro">
          <p className="eyebrow">Live science and math</p>
          <h1>Book a trial class</h1>
          <p>
            Choose a child, pick a class, then complete a mock payment. A
            confirmed seat is claimed only after a successful payment, and never
            beyond four students.
          </p>
        </section>

        {queryError ? (
          <p className="banner" role="alert">
            {queryError}
          </p>
        ) : null}

        {parent ? (
          <BookForm students={students} classes={classes} />
        ) : (
          <p className="banner">
            Switch to a parent profile in the header to start a booking. Maya
            Chen and Jordan Hale are the two families for the last-seat
            demonstration.
          </p>
        )}
      </main>
    </>
  );
}
