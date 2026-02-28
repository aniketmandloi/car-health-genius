import { sleep } from "k6";

import { perfTargetsConfigured, runPerfIteration } from "./common.js";

export const options = perfTargetsConfigured
  ? {
      vus: 10,
      duration: "5m",
      thresholds: {
        "checks{endpoint:ingest}": ["rate>0.99"],
        "http_req_duration{endpoint:history}": ["p(95)<500"],
        "http_req_duration{endpoint:recommend}": ["p(95)<4000"],
      },
    }
  : {
      vus: 1,
      iterations: 1,
    };

export default function () {
  runPerfIteration();
  sleep(0.5);
}
