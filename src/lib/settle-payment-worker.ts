import { openAppDb } from "../db/client";
import type { PaymentResult } from "../db/schema";
import { settlePayment } from "./booking";

const raw = process.argv[2];
if (!raw) {
  console.error("Missing settle payload.");
  process.exit(1);
}

const input = JSON.parse(raw) as {
  dbPath: string;
  parentId: number;
  bookingId: number;
  result: PaymentResult;
};

const { sqlite, db } = openAppDb(input.dbPath);

try {
  const result = settlePayment(db, {
    parentId: input.parentId,
    bookingId: input.bookingId,
    result: input.result,
  });
  process.stdout.write(JSON.stringify(result));
} finally {
  sqlite.close();
}
