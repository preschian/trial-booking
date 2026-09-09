# AI usage

## Which AI tools I used

Cursor CLI with Grok 4.6 for the implementation. Codex with Astra for a later audit of that work. Chrome DevTools MCP for browser checks, and React Doctor for the health scan.

## What I used AI for

- Scaffolding the Next.js + Drizzle + SQLite project
- Drafting the booking transaction and seed dataset
- Building the small booking/roster UI
- First-pass README structure
- Running and fixing tests, the doctor scan, and the browser flow
- An audit pass on the finished slice, then applying only the findings that held up

I steered the work around the take-home invariants: duplicate bookings, payment failure, and the last-seat race. The model did not invent a second product besides trial booking.

## One place AI helped me move faster

The Drizzle schema, seed rows, and `node:test` cases for the four required edge cases came together quickly. That left time to make confirmation atomic (`BEGIN IMMEDIATE`) instead of polishing extra screens.

## One place I disagreed with, corrected, or rejected AI output

The first stack suggestion included Drizzle `1.0.0-rc`. I stayed on `drizzle-orm@0.45.2` (npm `latest`) so the take-home does not depend on a release candidate. I also rejected holding a seat at selection time, because that would prevent two parents from reaching payment on the last seat. The audit findings were checked against the code before changing anything: the concurrent retry overwrite, unique-insert crash, inherited `?error=` keys, and test gaps were real and got fixed. Optional schema CHECK constraints were left out.

## What I would change about this AI workflow

I would write the booking state machine and race invariant first, as a short spec, then ask the model to implement against it. That would have reduced back-and-forth on whether `pending_payment` should consume capacity.

## How I verified the final implementation

- `pnpm check` for tests, lint, and TypeScript
- `pnpm exec react-doctor --yes --scope full` to a 100 score
- Chrome DevTools MCP: parent switch, book, pay success/fail, roster, last-seat path, and `?error=__proto__` no longer 500
