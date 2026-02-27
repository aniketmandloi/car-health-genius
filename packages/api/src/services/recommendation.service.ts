import type { DriveabilityClass, TriageClass, TriageDecision } from "./triage.service";
import { resolveTriageDecision } from "./triage.service";

export type RecommendationEvidence = {
  type: "dtc" | "knowledge_base" | "sensor";
  ref: string;
  summary: string;
};

export type GeneratedRecommendation = {
  recommendationType: string;
  urgency: TriageClass;
  confidence: number;
  title: string;
  rationale: string;
  details: Record<string, unknown>;
};

function logMetric(metric: string, value: number, metadata: Record<string, unknown>) {
  console.info(
    JSON.stringify({
      level: "info",
      event: "metric",
      metric,
      value,
      ...metadata,
    }),
  );
}

function clampConfidence(value: number): number {
  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return Math.round(value);
}

function titleForTriage(dtcCode: string, triageClass: TriageClass): string {
  if (triageClass === "service_now") {
    return `${dtcCode}: immediate professional inspection recommended`;
  }

  if (triageClass === "service_soon") {
    return `${dtcCode}: schedule service soon`;
  }

  return `${dtcCode}: monitor condition and continue driving`;
}

function recommendationTypeForDecision(decision: TriageDecision): string {
  if (decision.triageClass === "service_now") {
    return "service_shop";
  }

  if (decision.diyEligible) {
    return "diy";
  }

  if (decision.triageClass === "service_soon") {
    return "service_planned";
  }

  return "monitor";
}

function limitationsForDecision(triageClass: TriageClass): string[] {
  if (triageClass === "service_now") {
    return [
      "Guidance is informational and not a substitute for in-person inspection.",
      "Do not rely on this output as a warranty, legal, or safety guarantee.",
    ];
  }

  return [
    "Guidance is based on available DTC and sensor context and may be incomplete.",
    "Do not treat this output as a warranty, legal, or repair-outcome guarantee.",
  ];
}

function nextStepsForDecision(triageClass: TriageClass, driveability: DriveabilityClass): string[] {
  if (triageClass === "service_now") {
    return [
      driveability === "do_not_drive"
        ? "Avoid driving until the vehicle is inspected by a qualified technician."
        : "Limit driving and seek professional service as soon as possible.",
      "Document current symptoms and warning indicators for the repair shop.",
      "Do not clear the code before diagnostic inspection unless advised by a technician.",
    ];
  }

  if (triageClass === "service_soon") {
    return [
      "Schedule service in the near term and monitor for worsening symptoms.",
      "Capture additional scan data if new symptoms appear.",
      "If drivability degrades, treat this as service-now and seek immediate inspection.",
    ];
  }

  return [
    "Continue normal driving while monitoring for warning-light recurrence.",
    "Re-scan after one to two drive cycles.",
    "Escalate to service if symptoms worsen or additional codes appear.",
  ];
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function buildEvidence(
  event: {
    dtcCode: string;
    source: string;
    occurredAt: Date | string;
  },
  decision: TriageDecision,
): RecommendationEvidence[] {
  const evidence: RecommendationEvidence[] = [
    {
      type: "dtc",
      ref: event.dtcCode,
      summary: `DTC ${event.dtcCode} from ${event.source} at ${toIso(event.occurredAt)}`,
    },
  ];

  if (decision.knowledgeRef.matched && decision.knowledgeRef.id !== null) {
    evidence.push({
      type: "knowledge_base",
      ref: `dtc_knowledge:${decision.knowledgeRef.id}`,
      summary: `Matched knowledge source ${decision.knowledgeRef.source}:${decision.knowledgeRef.sourceVersion}`,
    });
  }

  if (decision.policyDecision.sensorEscalation) {
    evidence.push({
      type: "sensor",
      ref: "sensor_escalation",
      summary: decision.policyDecision.sensorReason ?? "Sensor thresholds triggered escalation",
    });
  }

  return evidence;
}

function rationaleForDecision(decision: TriageDecision): string {
  if (decision.triageClass === "service_now") {
    return `High-risk signal detected: ${decision.reason}. Seek professional service promptly.`;
  }

  if (decision.triageClass === "service_soon") {
    return `The issue is not currently critical but should be serviced soon: ${decision.reason}.`;
  }

  return `Current signals indicate low immediate risk: ${decision.reason}. Continue monitoring.`;
}

export async function generateRecommendationForDiagnosticEvent(
  event: Pick<
    {
      id: number;
      dtcCode: string;
      severity: string;
      freezeFrame: unknown;
      sensorSnapshot: unknown;
      occurredAt: Date | string;
      source: string;
    },
    "dtcCode" | "severity" | "freezeFrame" | "sensorSnapshot" | "occurredAt" | "source"
  > &
    Partial<Pick<{ id: number }, "id">>,
): Promise<GeneratedRecommendation> {
  const startedAt = Date.now();
  const triage = await resolveTriageDecision({
    dtcCode: event.dtcCode,
    severityHint: event.severity,
    freezeFrame: (event.freezeFrame as Record<string, unknown> | null) ?? null,
    sensorSnapshot: (event.sensorSnapshot as Record<string, unknown> | null) ?? null,
  });

  const confidence = clampConfidence((triage.confidence + (triage.knowledgeRef.matched ? 8 : 0)) / 1);
  const rationale = rationaleForDecision(triage);
  const title = titleForTriage(event.dtcCode, triage.triageClass);
  const evidence = buildEvidence(event, triage);

  logMetric("ai_explanation_requests_total", 1, {
    dtcCode: event.dtcCode,
    triageClass: triage.triageClass,
    knowledgeMatched: triage.knowledgeRef.matched,
  });
  logMetric("ai_explanation_latency_ms", Date.now() - startedAt, {
    dtcCode: event.dtcCode,
    triageClass: triage.triageClass,
  });

  return {
    recommendationType: recommendationTypeForDecision(triage),
    urgency: triage.triageClass,
    confidence,
    title,
    rationale,
    details: {
      summary: title,
      rationale,
      confidence,
      evidence,
      limitations: limitationsForDecision(triage.triageClass),
      nextSteps: nextStepsForDecision(triage.triageClass, triage.driveability),
      triage: {
        class: triage.triageClass,
        driveability: triage.driveability,
        diyEligible: triage.diyEligible,
      },
      policyDecision: triage.policyDecision,
      knowledgeRef: triage.knowledgeRef,
      generatedAt: new Date().toISOString(),
      generatorType: "rules",
      disclaimer: "Diagnostic guidance only. Not legal, warranty, or guaranteed repair advice.",
    },
  };
}
