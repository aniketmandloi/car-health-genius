import { type InferInsertModel } from "drizzle-orm";

import { db } from "../index";
import { auditLog } from "../schema/auditLog";

type CreateAuditLogInput = Omit<InferInsertModel<typeof auditLog>, "id" | "createdAt">;

export async function appendAuditLog(input: CreateAuditLogInput) {
  const [created] = await db.insert(auditLog).values(input).returning();
  return created;
}
