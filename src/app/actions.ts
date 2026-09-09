"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { settlePayment, startTrialBooking } from "@/lib/booking";
import { errorCopy } from "@/lib/copy";
import { requireAuth, setDemoParent } from "@/lib/session";

function parseId(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function switchParentAction(formData: FormData) {
  const parentId = parseId(formData.get("parentId"));
  if (!parentId) {
    redirect("/?error=invalid_input");
  }

  const parent = await setDemoParent(parentId);
  if (!parent) {
    redirect("/?error=not_found");
  }

  revalidatePath("/");
  redirect("/");
}

export async function startBookingAction(
  _prevState: { error: string | null },
  formData: FormData,
) {
  const parent = await requireAuth();
  if (!parent) {
    return { error: errorCopy.unauthenticated };
  }

  const studentId = parseId(formData.get("studentId"));
  const classId = parseId(formData.get("classId"));
  if (!studentId || !classId) {
    return { error: errorCopy.invalid_input };
  }

  const result = startTrialBooking(db, {
    parentId: parent.id,
    studentId,
    classId,
  });

  if (!result.ok) {
    return { error: errorCopy[result.error] };
  }

  revalidatePath("/");
  revalidatePath("/roster");
  redirect(`/bookings/${result.bookingId}`);
}

export async function settlePaymentAction(
  _prevState: { error: string | null },
  formData: FormData,
) {
  const parent = await requireAuth();
  if (!parent) {
    return { error: errorCopy.unauthenticated };
  }

  const bookingId = parseId(formData.get("bookingId"));
  const resultValue = formData.get("result");
  if (!bookingId || (resultValue !== "success" && resultValue !== "failure")) {
    return { error: errorCopy.invalid_input };
  }

  const result = settlePayment(db, {
    parentId: parent.id,
    bookingId,
    result: resultValue,
  });

  if (!result.ok) {
    return { error: errorCopy[result.error] };
  }

  revalidatePath(`/bookings/${bookingId}`);
  revalidatePath("/roster");
  revalidatePath("/");
  return { error: null };
}
