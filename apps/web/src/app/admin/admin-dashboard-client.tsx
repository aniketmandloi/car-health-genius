"use client";

import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function AdminDashboardClient() {
  const funnel = useQuery(
    trpc.admin.monetizationDailyFunnel.queryOptions({ days: 14 }),
  );
  const auditLogs = useQuery(
    trpc.admin.listAuditLogs.queryOptions({ limit: 20 }),
  );
  const modelTraces = useQuery(
    trpc.admin.listModelTraces.queryOptions({ limit: 20 }),
  );

  return (
    <div className="space-y-8">
      {/* Monetization Funnel */}
      <section>
        <h2 className="mb-3 text-base font-semibold">
          Monetization Funnel (14 days)
        </h2>
        {funnel.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : funnel.isError ? (
          <p className="text-sm text-red-500">Failed to load funnel data.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Day</th>
                  <th className="px-3 py-2 text-right font-medium">
                    Paywall Views
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Upgrade Starts
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    Upgrade Success
                  </th>
                  <th className="px-3 py-2 text-right font-medium">Churn</th>
                </tr>
              </thead>
              <tbody>
                {(funnel.data ?? [])
                  .slice()
                  .reverse()
                  .map((row) => (
                    <tr
                      key={row.day}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-1.5 font-mono">{row.day}</td>
                      <td className="px-3 py-1.5 text-right">
                        {row.paywallView}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {row.upgradeStart}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {row.upgradeSuccess}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        {row.subscriptionChurn}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Model Traces */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Recent AI Model Traces</h2>
        {modelTraces.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : modelTraces.isError ? (
          <p className="text-sm text-red-500">Failed to load model traces.</p>
        ) : (modelTraces.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No model traces recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {modelTraces.data!.map((trace) => (
              <Card key={trace.id}>
                <CardContent className="grid grid-cols-2 gap-2 py-3 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">Generator</span>
                    <p className="font-medium">{trace.generatorType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Blocked</span>
                    <p
                      className={
                        trace.policyBlocked
                          ? "font-medium text-red-600"
                          : "font-medium"
                      }
                    >
                      {trace.policyBlocked ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fallback</span>
                    <p className="font-medium">
                      {trace.fallbackApplied ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="font-medium">{formatDate(trace.createdAt)}</p>
                  </div>
                  {trace.outputSummary && (
                    <div className="col-span-2 sm:col-span-4">
                      <span className="text-muted-foreground">Output</span>
                      <p className="line-clamp-2 text-muted-foreground">
                        {trace.outputSummary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Audit Logs */}
      <section>
        <h2 className="mb-3 text-base font-semibold">Recent Audit Logs</h2>
        {auditLogs.isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : auditLogs.isError ? (
          <p className="text-sm text-red-500">Failed to load audit logs.</p>
        ) : (auditLogs.data?.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No audit events recorded yet.
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium">Action</th>
                  <th className="px-3 py-2 text-left font-medium">Target</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.data!.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-1.5 font-mono">{log.action}</td>
                    <td className="px-3 py-1.5">
                      {log.targetType}#{log.targetId}
                    </td>
                    <td className="px-3 py-1.5">{log.actorRole}</td>
                    <td className="px-3 py-1.5">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
