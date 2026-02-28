import { env } from "@car-health-genius/env/server";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";

type OtelState = {
  enabled: boolean;
  shutdown: () => Promise<void>;
};

const disabledState: OtelState = {
  enabled: false,
  shutdown: async () => undefined,
};

let sdk: NodeSDK | null = null;
let started = false;

export async function initializeOtel(): Promise<OtelState> {
  if (!env.OTEL_ENABLED) {
    return disabledState;
  }

  if (sdk && started) {
    return {
      enabled: true,
      shutdown: async () => {
        if (!sdk) {
          return;
        }
        await sdk.shutdown();
        sdk = null;
        started = false;
      },
    };
  }

  const traceExporter = new OTLPTraceExporter(
    env.OTEL_EXPORTER_OTLP_ENDPOINT
      ? {
          url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        }
      : undefined,
  );

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
    }),
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  try {
    await sdk.start();
    started = true;
    console.info(
      JSON.stringify({
        level: "info",
        event: "otel.initialized",
        serviceName: env.OTEL_SERVICE_NAME,
        endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "default",
      }),
    );

    return {
      enabled: true,
      shutdown: async () => {
        if (!sdk) {
          return;
        }
        await sdk.shutdown();
        sdk = null;
        started = false;
      },
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "otel.init_failed",
        error: error instanceof Error ? error.message : "unknown",
      }),
    );

    sdk = null;
    started = false;
    return disabledState;
  }
}
