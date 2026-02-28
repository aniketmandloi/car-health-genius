import http from "k6/http";
import { check } from "k6";

const ingestUrl = __ENV.PERF_INGEST_URL;
const historyUrl = __ENV.PERF_HISTORY_URL;
const recommendUrl = __ENV.PERF_RECOMMEND_URL;
const authHeader = __ENV.PERF_AUTH_HEADER;
const ingestBody = __ENV.PERF_INGEST_BODY;
const recommendBody = __ENV.PERF_RECOMMEND_BODY;

export const perfTargetsConfigured = Boolean(
  ingestUrl && historyUrl && recommendUrl && authHeader && ingestBody && recommendBody,
);

function headers(contentType) {
  const result = {
    Authorization: authHeader,
  };

  if (contentType) {
    result["Content-Type"] = contentType;
  }

  return result;
}

function assertSuccess(response, endpoint) {
  check(
    response,
    {
      [`${endpoint} responds 2xx`]: (res) => res.status >= 200 && res.status < 300,
    },
    { endpoint },
  );
}

export function runPerfIteration() {
  if (!perfTargetsConfigured) {
    return;
  }

  const ingestResponse = http.post(ingestUrl, ingestBody, {
    headers: headers("application/json"),
    tags: { endpoint: "ingest" },
  });
  assertSuccess(ingestResponse, "ingest");

  const historyResponse = http.get(historyUrl, {
    headers: headers(),
    tags: { endpoint: "history" },
  });
  assertSuccess(historyResponse, "history");

  const recommendResponse = http.post(recommendUrl, recommendBody, {
    headers: headers("application/json"),
    tags: { endpoint: "recommend" },
  });
  assertSuccess(recommendResponse, "recommend");
}
