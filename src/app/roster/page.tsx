import type { Metadata } from "next";
import { db } from "@/db";
import { SiteHeader } from "@/app/site-header";
import { formatClassTime } from "@/lib/copy";
import { listParents, listRoster } from "@/lib/queries";
import { requireAuth } from "@/lib/session";

export const metadata: Metadata = {
  title: "Class roster",
};

export default async function RosterPage() {
  const parent = await requireAuth();
  const parents = listParents(db);
  const roster = listRoster(db);

  return (
    <>
      <SiteHeader
        parents={parents}
        currentParentId={parent?.id ?? null}
      />
      <main className="page">
        <section className="intro">
          <p className="eyebrow">Teachers</p>
          <h1>Trial class roster</h1>
          <p>
            Only confirmed bookings appear on the roster. Failed payments and
            lost last-seat races stay off this list.
          </p>
        </section>

        <div className="roster-grid">
          {roster.map((trialClass) => (
            <article key={trialClass.id} className="roster-card">
              <header>
                <h2>{trialClass.title}</h2>
                <p>{formatClassTime(trialClass.startsAt)}</p>
                <p>
                  {trialClass.confirmed.length} / {trialClass.capacity} confirmed
                </p>
              </header>
              {trialClass.confirmed.length === 0 ? (
                <p>No confirmed students yet.</p>
              ) : (
                <ul>
                  {trialClass.confirmed.map((row) => (
                    <li key={row.bookingId}>
                      <strong>{row.studentName}</strong>
                      <span>{row.parentName}</span>
                    </li>
                  ))}
                </ul>
              )}
              {trialClass.otherBookings.length > 0 ? (
                <footer>
                  <h3>Not on roster</h3>
                  <ul>
                    {trialClass.otherBookings.map((row) => (
                      <li key={row.bookingId}>
                        {row.studentName} · {row.status.replaceAll("_", " ")}
                      </li>
                    ))}
                  </ul>
                </footer>
              ) : null}
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
