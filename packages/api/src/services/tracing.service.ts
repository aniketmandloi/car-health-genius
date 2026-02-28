import { SpanStatusCode, type Attributes, type Span, trace } from "@opentelemetry/api";

type PrimitiveAttribute = string | number | boolean;

type AttributeBag = Record<string, PrimitiveAttribute | undefined>;

const tracer = trace.getTracer("car-health-genius.api");

function sanitizeAttributes(input: AttributeBag): Attributes {
  const output: Attributes = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "Unknown error";
}

export async function withActiveSpan<T>(
  name: string,
  attributes: AttributeBag,
  work: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(
    name,
    {
      attributes: sanitizeAttributes(attributes),
    },
    async (span: Span) => {
      try {
        const result = await work();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: readErrorMessage(error),
        });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

export function readActiveTraceContext(): { traceId?: string; spanId?: string } {
  const span = trace.getActiveSpan();
  if (!span) {
    return {};
  }

  const context = span.spanContext();
  return {
    traceId: context.traceId,
    spanId: context.spanId,
  };
}
