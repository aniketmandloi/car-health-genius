"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, trpc } from "@/utils/trpc";

type SeverityClass = "safe" | "service_soon" | "service_now";
type Driveability = "drivable" | "limited" | "do_not_drive";

const DEFAULT_FORM = {
  dtcCode: "",
  category: "powertrain",
  defaultSeverityClass: "service_soon" as SeverityClass,
  driveability: "drivable" as Driveability,
  summaryTemplate: "",
  rationaleTemplate: "",
  safetyCritical: false,
  diyAllowed: false,
};

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const msg = (error as { message?: unknown }).message;
  return typeof msg === "string" && msg.length > 0 ? msg : "Request failed";
}

export default function DtcKnowledgeClient() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);

  const list = useQuery(
    trpc.admin.listDtcKnowledge.queryOptions({ limit: 500 }),
  );

  const upsertMutation = useMutation(
    trpc.admin.upsertDtcKnowledge.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        setShowForm(false);
        setForm(DEFAULT_FORM);
        await queryClient.invalidateQueries(
          trpc.admin.listDtcKnowledge.queryFilter(),
        );
      },
      onError: (error) => {
        setMutationError(readErrorMessage(error));
      },
    }),
  );

  const filtered = (list.data ?? []).filter(
    (row) =>
      search.trim().length === 0 ||
      row.dtcCode.toLowerCase().includes(search.toLowerCase()) ||
      row.category.toLowerCase().includes(search.toLowerCase()),
  );

  function handleEdit(row: (typeof filtered)[number]) {
    setForm({
      dtcCode: row.dtcCode,
      category: row.category,
      defaultSeverityClass: row.defaultSeverityClass,
      driveability: row.driveability,
      summaryTemplate: row.summaryTemplate,
      rationaleTemplate: row.rationaleTemplate ?? "",
      safetyCritical: row.safetyCritical,
      diyAllowed: row.diyAllowed,
    });
    setShowForm(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    upsertMutation.mutate({
      dtcCode: form.dtcCode,
      category: form.category,
      defaultSeverityClass: form.defaultSeverityClass,
      driveability: form.driveability,
      summaryTemplate: form.summaryTemplate,
      rationaleTemplate:
        form.rationaleTemplate.trim().length > 0
          ? form.rationaleTemplate
          : undefined,
      safetyCritical: form.safetyCritical,
      diyAllowed: form.diyAllowed,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search by DTC code or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          size="sm"
          onClick={() => {
            setForm(DEFAULT_FORM);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ New Entry"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {form.dtcCode ? `Edit ${form.dtcCode}` : "New DTC Entry"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dtcCode">DTC Code *</Label>
                <Input
                  id="dtcCode"
                  value={form.dtcCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dtcCode: e.target.value }))
                  }
                  placeholder="P0420"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  placeholder="powertrain"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="severity">Severity</Label>
                <select
                  id="severity"
                  value={form.defaultSeverityClass}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultSeverityClass: e.target.value as SeverityClass,
                    }))
                  }
                  className="cb-input-like h-10 w-full text-sm"
                >
                  <option value="safe">Safe</option>
                  <option value="service_soon">Service Soon</option>
                  <option value="service_now">Service Now</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driveability">Driveability</Label>
                <select
                  id="driveability"
                  value={form.driveability}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      driveability: e.target.value as Driveability,
                    }))
                  }
                  className="cb-input-like h-10 w-full text-sm"
                >
                  <option value="drivable">Drivable</option>
                  <option value="limited">Limited</option>
                  <option value="do_not_drive">Do Not Drive</option>
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="summary">Summary Template *</Label>
                <textarea
                  id="summary"
                  value={form.summaryTemplate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, summaryTemplate: e.target.value }))
                  }
                  rows={3}
                  required
                  className="cb-textarea"
                  placeholder="Catalytic converter efficiency below threshold..."
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="rationale">Rationale Template</Label>
                <textarea
                  id="rationale"
                  value={form.rationaleTemplate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      rationaleTemplate: e.target.value,
                    }))
                  }
                  rows={2}
                  className="cb-textarea"
                  placeholder="Optional rationale template..."
                />
              </div>
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.safetyCritical}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        safetyCritical: e.target.checked,
                      }))
                    }
                  />
                  Safety Critical
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.diyAllowed}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, diyAllowed: e.target.checked }))
                    }
                  />
                  DIY Allowed
                </label>
              </div>
              {mutationError && (
                <p className="text-xs text-destructive sm:col-span-2">
                  {mutationError}
                </p>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={upsertMutation.isPending}
                >
                  {upsertMutation.isPending ? "Saving..." : "Save Entry"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {list.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/70" />
          ))}
        </div>
      ) : (
        <div className="cb-table-shell">
          <table className="cb-table">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-medium">DTC Code</th>
                <th className="px-3 py-2 text-left font-medium">Category</th>
                <th className="px-3 py-2 text-left font-medium">Severity</th>
                <th className="px-3 py-2 text-left font-medium">
                  Driveability
                </th>
                <th className="px-3 py-2 text-left font-medium">Safety</th>
                <th className="px-3 py-2 text-left font-medium">DIY</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2 font-mono font-bold">
                      {row.dtcCode}
                    </td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 capitalize">
                      {row.defaultSeverityClass.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 capitalize">
                      {row.driveability.replace(/_/g, " ")}
                    </td>
                    <td className="px-3 py-2">
                      {row.safetyCritical ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2">
                      {row.diyAllowed ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
