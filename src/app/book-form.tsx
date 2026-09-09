"use client";

import { useActionState } from "react";
import { startBookingAction } from "@/app/actions";

type StudentOption = { id: number; name: string };
type ClassOption = {
  id: number;
  title: string;
  startsLabel: string;
  seatsRemaining: number;
  capacity: number;
};

const initialState = { error: null as string | null };

export function BookForm({
  students,
  classes,
}: {
  students: StudentOption[];
  classes: ClassOption[];
}) {
  const [state, action, pending] = useActionState(
    startBookingAction,
    initialState,
  );

  return (
    <form action={action} className="stack">
      {state.error ? (
        <p className="banner" role="alert">
          {state.error}
        </p>
      ) : null}

      <label className="field">
        <span>Child</span>
        <select name="studentId" required defaultValue="">
          <option value="" disabled>
            Select a child
          </option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="class-list">
        <legend>Trial class</legend>
        {classes.map((trialClass) => {
          const full = trialClass.seatsRemaining === 0;
          return (
            <label
              key={trialClass.id}
              className={full ? "class-card is-full" : "class-card"}
            >
              <input
                type="radio"
                name="classId"
                value={trialClass.id}
                required
                disabled={full}
              />
              <span>
                <strong>{trialClass.title}</strong>
                <em>{trialClass.startsLabel}</em>
                <small>
                  {full
                    ? "Class is full"
                    : `${trialClass.seatsRemaining} of ${trialClass.capacity} seats open`}
                  {trialClass.seatsRemaining === 1
                    ? " · Last seat — payment claims it, not this selection"
                    : null}
                </small>
              </span>
            </label>
          );
        })}
      </fieldset>

      <button type="submit" className="button" disabled={pending}>
        {pending ? "Starting booking…" : "Continue to payment"}
      </button>
    </form>
  );
}
