import { db } from "@car-health-genius/db";
import { user } from "@car-health-genius/db/schema/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { exportUserData } from "../services/dataExport.service";

export const accountRouter = router({
  exportData: protectedProcedure
    .output(
      z.object({
        exportedAt: z.string(),
        vehicles: z.array(z.record(z.string(), z.unknown())),
        diagnosticEvents: z.array(z.record(z.string(), z.unknown())),
        maintenanceItems: z.array(z.record(z.string(), z.unknown())),
        estimates: z.array(z.record(z.string(), z.unknown())),
        repairOutcomes: z.array(z.record(z.string(), z.unknown())),
        feedback: z.array(z.record(z.string(), z.unknown())),
        supportIssues: z.array(z.record(z.string(), z.unknown())),
      }),
    )
    .mutation(async ({ ctx }) => {
      return exportUserData(ctx.session.user.id);
    }),

  deleteAccount: protectedProcedure
    .input(
      z.object({
        confirmPhrase: z.string().refine((v) => v === "DELETE MY ACCOUNT", {
          message: 'You must type "DELETE MY ACCOUNT" to confirm',
        }),
      }),
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx }) => {
      // Delete the user row — all related data cascades via FK ON DELETE CASCADE
      await db.delete(user).where(eq(user.id, ctx.session.user.id));
      return { success: true };
    }),
});
