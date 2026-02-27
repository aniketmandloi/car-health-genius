import { z } from "zod";

import { protectedProcedure, router } from "../index";
import { resolveSupportPriority } from "../services/supportPriority.service";

const supportPayloadOutputSchema = z.object({
  issueSummary: z.string(),
  issueDetails: z.string().nullable(),
  includeDiagnosticBundle: z.boolean(),
  requesterUserId: z.string(),
  priorityTier: z.enum(["priority", "standard"]),
  priorityReason: z.string(),
  slaTargetMinutes: z.number().int().positive(),
  generatedAt: z.string(),
});

export const supportRouter = router({
  buildPayload: protectedProcedure
    .input(
      z.object({
        issueSummary: z.string().trim().min(1).max(240),
        issueDetails: z.string().trim().max(4000).optional(),
        includeDiagnosticBundle: z.boolean().default(false),
      }),
    )
    .output(supportPayloadOutputSchema)
    .query(async ({ ctx, input }) => {
      const priority = await resolveSupportPriority(ctx.session.user.id);

      return {
        issueSummary: input.issueSummary,
        issueDetails: input.issueDetails ?? null,
        includeDiagnosticBundle: input.includeDiagnosticBundle,
        requesterUserId: ctx.session.user.id,
        priorityTier: priority.priorityTier,
        priorityReason: priority.priorityReason,
        slaTargetMinutes: priority.slaTargetMinutes,
        generatedAt: new Date().toISOString(),
      };
    }),
});
