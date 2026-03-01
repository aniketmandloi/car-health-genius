import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { authClient } from "@/lib/auth-client";

// This route generates a printable HTML health report for the given vehicle.
// It fetches report data from the tRPC API and returns downloadable HTML.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  const { vehicleId: vehicleIdStr } = await params;
  const vehicleId = parseInt(vehicleIdStr, 10);

  if (isNaN(vehicleId) || vehicleId <= 0) {
    return new NextResponse("Invalid vehicle ID", { status: 400 });
  }

  const reqHeaders = await headers();
  const session = await authClient.getSession({
    fetchOptions: { headers: reqHeaders, throw: true },
  });

  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Forward cookies so tRPC server can authenticate the request
  const cookie = reqHeaders.get("cookie") ?? "";
  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL ??
    process.env.SERVER_URL ??
    "http://localhost:3001";

  const trpcUrl = `${serverUrl}/trpc/reports.generateVehicleHealthReport?input=${encodeURIComponent(JSON.stringify({ vehicleId }))}`;

  let report: Record<string, unknown>;
  try {
    const resp = await fetch(trpcUrl, {
      headers: { cookie, "content-type": "application/json" },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return new NextResponse(`Report generation failed: ${text}`, {
        status: 400,
      });
    }

    const json = (await resp.json()) as {
      result?: { data?: unknown };
      error?: { message?: string };
    };

    if (json.error) {
      return new NextResponse(
        json.error.message ?? "Report generation failed",
        { status: 400 },
      );
    }

    report = (json.result?.data ?? json) as Record<string, unknown>;
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Failed to fetch report data";
    return new NextResponse(msg, { status: 500 });
  }

  const html = buildReportHtml(report);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="vehicle-health-report-${vehicleId}.html"`,
    },
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "#dc2626";
    case "high":
      return "#ea580c";
    case "medium":
      return "#d97706";
    case "low":
      return "#2563eb";
    default:
      return "#6b7280";
  }
}

function triageColor(triageClass: string | null): string {
  switch (triageClass) {
    case "safe":
      return "#16a34a";
    case "service_soon":
      return "#d97706";
    case "service_now":
      return "#dc2626";
    default:
      return "#6b7280";
  }
}

function buildReportHtml(report: Record<string, unknown>): string {
  const vehicle = (report.vehicle as Record<string, unknown>) ?? {};
  const recentEvents = (report.recentEvents as unknown[]) ?? [];
  const activeRecommendations =
    (report.activeRecommendations as unknown[]) ?? [];
  const latestEstimates = (report.latestEstimates as unknown[]) ?? [];
  const maintenanceItems = (report.maintenanceItems as unknown[]) ?? [];
  const generatedAt =
    (report.generatedAt as string) ?? new Date().toISOString();
  const disclaimer = (report.disclaimer as string) ?? "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Vehicle Health Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111; background: #fff; padding: 32px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 16px; font-weight: 600; margin: 24px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th { text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; padding: 6px 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    .badge { display: inline-block; border-radius: 9999px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
    .rec-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
    .disclaimer { border: 1px dashed #e5e7eb; border-radius: 6px; padding: 12px; margin-top: 32px; font-size: 12px; color: #6b7280; }
    .print-btn { display: block; margin: 0 0 24px; padding: 8px 16px; background: #111; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    @media print { .print-btn { display: none; } }
  </style>
</head>
<body>
  <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  <h1>Vehicle Health Report</h1>
  <p class="meta">
    ${vehicle.make} ${vehicle.model} ${vehicle.modelYear}${vehicle.vin ? ` &middot; VIN: ${vehicle.vin}` : ""}
    ${vehicle.mileage ? ` &middot; ${Number(vehicle.mileage).toLocaleString()} mi` : ""}
    <br/>Generated: ${new Date(generatedAt).toLocaleString()}
  </p>

  <h2>Recent Diagnostic Events (${recentEvents.length})</h2>
  ${
    recentEvents.length === 0
      ? "<p style='color:#6b7280;font-size:13px'>No diagnostic events recorded.</p>"
      : `<table><thead><tr><th>DTC Code</th><th>Severity</th><th>Source</th><th>Date</th></tr></thead><tbody>
      ${recentEvents
        .map((e: unknown) => {
          const ev = e as Record<string, unknown>;
          return `<tr>
          <td style="font-family:monospace;font-weight:700">${ev.dtcCode}</td>
          <td><span class="badge" style="background:${severityColor(String(ev.severity))}20;color:${severityColor(String(ev.severity))}">${ev.severity}</span></td>
          <td>${ev.source}</td>
          <td>${formatDate(ev.occurredAt as string)}</td>
        </tr>`;
        })
        .join("")}
    </tbody></table>`
  }

  <h2>AI Recommendations (${activeRecommendations.length})</h2>
  ${
    activeRecommendations.length === 0
      ? "<p style='color:#6b7280;font-size:13px'>No active recommendations.</p>"
      : activeRecommendations
          .map((r: unknown) => {
            const rec = r as Record<string, unknown>;
            return `<div class="rec-card">
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">
            ${rec.title}
            <span class="badge" style="margin-left:8px;background:${triageColor(rec.triageClass as string | null)}20;color:${triageColor(rec.triageClass as string | null)}">${String(rec.triageClass ?? "unknown").replace("_", " ")}</span>
          </div>
          <div style="color:#4b5563;font-size:13px;margin-bottom:6px">${rec.rationale}</div>
          <div style="font-size:12px;color:#6b7280">Confidence: ${rec.confidence}% &middot; Urgency: ${rec.urgency}</div>
        </div>`;
          })
          .join("")
  }

  <h2>Cost Estimates (${latestEstimates.length})</h2>
  ${
    latestEstimates.length === 0
      ? "<p style='color:#6b7280;font-size:13px'>No cost estimates generated yet.</p>"
      : `<table><thead><tr><th>Event ID</th><th>Region</th><th>Estimated Range</th></tr></thead><tbody>
      ${latestEstimates
        .map((e: unknown) => {
          const est = e as Record<string, unknown>;
          return `<tr>
          <td>#${est.diagnosticEventId}</td>
          <td>${est.region}</td>
          <td>${formatCents(Number(est.totalLowCents))} – ${formatCents(Number(est.totalHighCents))}</td>
        </tr>`;
        })
        .join("")}
    </tbody></table>
    <p style="font-size:11px;color:#6b7280;margin-top:4px">Estimates are approximate. CMP-003 disclosure applies.</p>`
  }

  <h2>Maintenance Schedule (${maintenanceItems.length})</h2>
  ${
    maintenanceItems.length === 0
      ? "<p style='color:#6b7280;font-size:13px'>No maintenance items scheduled.</p>"
      : `<table><thead><tr><th>Service</th><th>Status</th><th>Due Date</th><th>Due Mileage</th></tr></thead><tbody>
      ${maintenanceItems
        .map((m: unknown) => {
          const item = m as Record<string, unknown>;
          return `<tr>
          <td>${item.serviceType}</td>
          <td>${item.status}</td>
          <td>${formatDate(item.dueDate as string)}</td>
          <td>${item.dueMileage ? Number(item.dueMileage).toLocaleString() + " mi" : "—"}</td>
        </tr>`;
        })
        .join("")}
    </tbody></table>`
  }

  <div class="disclaimer">
    <strong>Disclaimer (CMP-003)</strong><br/>${disclaimer}
  </div>
</body>
</html>`;
}
