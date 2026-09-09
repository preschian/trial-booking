import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parents } from "@/db/schema";

const PARENT_COOKIE = "demo_parent_id";

export async function requireAuth() {
  const jar = await cookies();
  const parentId = Number(jar.get(PARENT_COOKIE)?.value);

  if (!Number.isInteger(parentId) || parentId <= 0) {
    return null;
  }

  return (
    db.select().from(parents).where(eq(parents.id, parentId)).get() ?? null
  );
}

export async function setDemoParent(parentId: number) {
  const parent = db
    .select()
    .from(parents)
    .where(eq(parents.id, parentId))
    .get();

  if (!parent) {
    return null;
  }

  const jar = await cookies();
  jar.set(PARENT_COOKIE, String(parent.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return parent;
}
