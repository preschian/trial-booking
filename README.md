# Meridian Trial Booking

A small Next.js app for booking live science and math trial classes. Parents pick a child and a class, complete a mock payment, and teachers see only confirmed students on the roster.

Trial classes are capped at **4 confirmed students**.

## How to run

Prerequisites: Node.js 22+ and [pnpm](https://pnpm.io/) 12.

```bash
pnpm install
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
pnpm test            # booking invariants
pnpm exec react-doctor --yes --scope full
```

The SQLite file lives at `data/trial-booking.db` and is created on first run. `pnpm db:seed` resets the synthetic dataset.

## What I built

- Parent booking flow: choose a demo parent, select a child and class, then mock-pay
- Booking status after payment, including last-seat loss
- Teacher roster of confirmed students
- Tests for duplicates, payment failure, overbooking the last seat, and ownership

## Time spent

About 3.5 hours.

## Assumptions

- This is a demo, not production auth. The header parent switcher is a stand-in for a logged-in parent.
- Mock payment is an explicit succeed/fail button. There is no card processor.
- `pending_payment` does **not** hold a seat. Selection can race; confirmation cannot.
- A successful payment that loses the last seat is recorded as `seat_unavailable` and treated as a refund, not as a roster seat.
- One booking row per child+class. A failed payment can be retried on the same row.

## Seed data

After `pnpm db:seed`:

| Class | Setup |
| --- | --- |
| Fractions Lab | Seats open. Nora Chen has a `payment_failed` row (retry from the book form). |
| Forces and Motion | 3 confirmed students, 1 seat left. Use Maya Chen (Nora) and Jordan Hale (Sam) for the last-seat race. |
| Algebra Foundations | Leo Chen is already confirmed. Booking Leo again is the duplicate case. |

## Backend design

### Data model

SQLite via Drizzle:

- `parents`, `students`
- `trial_classes` (`capacity` default 4)
- `bookings` (`pending_payment`, `confirmed`, `payment_failed`, `seat_unavailable`, `cancelled`)
- `payment_attempts` (`success` or `failure`)

Unique index on `bookings (student_id, class_id)`.

### Key functions

- `startTrialBooking` — create or resume a pending booking
- `settlePayment` — record the payment attempt, then confirm or reject the seat
- Server actions: `switchParentAction`, `startBookingAction`, `settlePaymentAction`
- Roster reads: `listRoster` on `/roster`

### Duplicate bookings

The unique index allows only one row per child and class. `startTrialBooking` also rejects a second attempt when the existing row is already `confirmed`. A `payment_failed` or `seat_unavailable` row can be moved back to `pending_payment`.

### Payment failure

`settlePayment` writes `payment_attempts.result = failure` and sets the booking to `payment_failed` in the same transaction. Confirmed count is unchanged, so the child never appears on the roster.

### Last-seat race

Pending bookings do not consume capacity, so two parents can both reach payment when one seat remains.

Confirmation uses a SQLite `BEGIN IMMEDIATE` transaction:

1. Re-read the pending booking
2. Count `confirmed` rows for that class
3. If `confirmed >= capacity`, set `seat_unavailable`
4. Otherwise set `confirmed`

Writers take the write lock at the start of the transaction, so the confirmed count cannot change under the check. At most one of those payments becomes a roster seat.

**Why this approach:** it matches the required scenario (both users can select the last slot), stays correct on a single SQLite file, and is easy to test. Postgres `SELECT FOR UPDATE` would be the production analog.

**Tradeoffs:** there is no time-limited hold, so a pending parent can lose the seat after paying. That is honest for a mock payment and avoids over-holding inventory. SQLite serializes writers, which is enough here and weaker than row-level locking at scale.

### Where checks live

| Check | UI | Backend | Database | Job |
| --- | --- | --- | --- | --- |
| Remaining seats | display only; full classes disabled | yes, at confirm | no | no |
| Duplicate child+class | error copy | yes | unique index | no |
| Parent owns child | hidden by the form | yes | no | no |
| Payment failure stays off roster | status page | yes | status value | no |
| Last seat | copy on the 1-seat class | `BEGIN IMMEDIATE` | write lock | no |

No background jobs. Holds, expiry, and refunds were left out on purpose.

## What I deliberately cut

- Real payments, webhooks, and refunds
- Login, email, and notifications
- Seat holds with a timeout
- Regular (non-trial) enrollment
- Admin editing, waitlists, and cancellations as a user flow

## What I would monitor after release

- Confirmed count vs capacity per class (should never exceed 4)
- Rate of `seat_unavailable` after successful payment
- Rate of `payment_failed`
- Unique-constraint failures on `bookings (student_id, class_id)`

## What I would do next with more time

- Replace SQLite with Postgres and `SELECT FOR UPDATE` (or an atomic `UPDATE ... WHERE seats_taken < 4`)
- Optional short-lived hold at checkout, with a worker to expire abandoned pending rows
- Idempotent payment intents so retries cannot double-confirm
- Structured logs around every status transition
