import { createHash } from "node:crypto";

import { db } from "@car-health-genius/db";
import { modelRegistry } from "@car-health-genius/db/schema/modelRegistry";
import { modelTrace } from "@car-health-genius/db/schema/modelTrace";
import { promptTemplate } from "@car-health-genius/db/schema/promptTemplate";
import { and, eq } from "drizzle-orm";

import type { PolicyResult } from "./policy.service";

type JsonRecord = Record<string, unknown>;

export type ModelTraceInput = {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  diagnosticEventId?: number;
  recommendationId?: number;
  generatorType: "rules" | "hybrid";
  model: {
    provider: string;
    modelId: string;
    modelVersion: string;
  };
  prompt: {
    templateKey: string;
    templateVersion: string;
    templateBody?: string;
  };
  inputPayload: JsonRecord;
  outputSummary: string;
  policyResult: Pick<PolicyResult, "blocked" | "blockedReasons" | "fallbackApplied">;
  metadata?: JsonRecord;
};

function toHash(payload: JsonRecord): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function ensureModelRegistry(args: {
  provider: string;
  modelId: string;
  modelVersion: string;
}): Promise<number> {
  const [upserted] = await db
    .insert(modelRegistry)
    .values({
      provider: args.provider,
      modelId: args.modelId,
      modelVersion: args.modelVersion,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [modelRegistry.provider, modelRegistry.modelId, modelRegistry.modelVersion],
      set: {
        status: "active",
      },
    })
    .returning({ id: modelRegistry.id });

  if (upserted) {
    return upserted.id;
  }

  const [existing] = await db
    .select({ id: modelRegistry.id })
    .from(modelRegistry)
    .where(
      and(
        eq(modelRegistry.provider, args.provider),
        eq(modelRegistry.modelId, args.modelId),
        eq(modelRegistry.modelVersion, args.modelVersion),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error("Unable to resolve model registry record");
  }

  return existing.id;
}

async function ensurePromptTemplate(args: {
  templateKey: string;
  templateVersion: string;
  templateBody?: string;
}): Promise<number> {
  const templateHash = createHash("sha256")
    .update(`${args.templateKey}:${args.templateVersion}:${args.templateBody ?? ""}`)
    .digest("hex");

  const [upserted] = await db
    .insert(promptTemplate)
    .values({
      templateKey: args.templateKey,
      templateVersion: args.templateVersion,
      templateHash,
      templateBody: args.templateBody,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [promptTemplate.templateKey, promptTemplate.templateVersion],
      set: {
        templateHash,
        templateBody: args.templateBody,
        status: "active",
      },
    })
    .returning({ id: promptTemplate.id });

  if (upserted) {
    return upserted.id;
  }

  const [existing] = await db
    .select({ id: promptTemplate.id })
    .from(promptTemplate)
    .where(
      and(
        eq(promptTemplate.templateKey, args.templateKey),
        eq(promptTemplate.templateVersion, args.templateVersion),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new Error("Unable to resolve prompt template record");
  }

  return existing.id;
}

export async function recordModelTrace(input: ModelTraceInput) {
  const [modelId, templateId] = await Promise.all([
    ensureModelRegistry(input.model),
    ensurePromptTemplate(input.prompt),
  ]);

  const [created] = await db
    .insert(modelTrace)
    .values({
      requestId: input.requestId,
      correlationId: input.correlationId,
      userId: input.userId,
      diagnosticEventId: input.diagnosticEventId,
      recommendationId: input.recommendationId,
      modelRegistryId: modelId,
      promptTemplateId: templateId,
      generatorType: input.generatorType,
      inputHash: toHash(input.inputPayload),
      outputSummary: input.outputSummary,
      policyBlocked: input.policyResult.blocked,
      policyReasons: input.policyResult.blockedReasons,
      fallbackApplied: input.policyResult.fallbackApplied,
      metadata: input.metadata,
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create model trace record");
  }

  return created;
}
