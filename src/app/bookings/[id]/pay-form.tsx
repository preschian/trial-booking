"use client";

import { useActionState } from "react";
import { settlePaymentAction } from "@/app/actions";

const initialState = { error: null as string | null };

export function PayForm({ bookingId }: { bookingId: number }) {
  const [state, action, pending] = useActionState(
    settlePaymentAction,
    initialState,
  );

  return (
    <form action={action} className="pay-actions">
      <input type="hidden" name="bookingId" value={bookingId} />
      {state.error ? (
        <p className="banner" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        name="result"
        value="success"
        className="button"
        disabled={pending}
      >
        {pending ? "Recording payment…" : "Pay successfully"}
      </button>
      <button
        type="submit"
        name="result"
        value="failure"
        className="button button-secondary"
        disabled={pending}
      >
        Simulate payment failure
      </button>
    </form>
  );
}
