"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient, trpc } from "@/utils/trpc";

type AdapterStatus = "active" | "archived" | "deprecated";

const DEFAULT_FORM = {
  vendor: "",
  model: "",
  slug: "",
  connectionType: "bluetooth",
  iosSupported: false,
  androidSupported: false,
  status: "active" as AdapterStatus,
  firmwareNotes: "",
};

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Request failed";
  const msg = (error as { message?: unknown }).message;
  return typeof msg === "string" && msg.length > 0 ? msg : "Request failed";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";
    case "deprecated":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function AdaptersClient() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [archiveReason, setArchiveReason] = useState<{
    id: number;
    reason: string;
  } | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const adapters = useQuery(trpc.admin.listAdapters.queryOptions());

  const createMutation = useMutation(
    trpc.admin.createAdapter.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        setShowForm(false);
        setForm(DEFAULT_FORM);
        setEditId(null);
        await queryClient.invalidateQueries(
          trpc.admin.listAdapters.queryFilter(),
        );
      },
      onError: (error) => setMutationError(readErrorMessage(error)),
    }),
  );

  const updateMutation = useMutation(
    trpc.admin.updateAdapter.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        setShowForm(false);
        setForm(DEFAULT_FORM);
        setEditId(null);
        await queryClient.invalidateQueries(
          trpc.admin.listAdapters.queryFilter(),
        );
      },
      onError: (error) => setMutationError(readErrorMessage(error)),
    }),
  );

  const archiveMutation = useMutation(
    trpc.admin.archiveAdapter.mutationOptions({
      onSuccess: async () => {
        setMutationError(null);
        setArchiveReason(null);
        await queryClient.invalidateQueries(
          trpc.admin.listAdapters.queryFilter(),
        );
      },
      onError: (error) => setMutationError(readErrorMessage(error)),
    }),
  );

  function handleEdit(row: NonNullable<typeof adapters.data>[number]) {
    setEditId(row.id);
    setForm({
      vendor: row.vendor,
      model: row.model,
      slug: row.slug,
      connectionType: row.connectionType,
      iosSupported: row.iosSupported,
      androidSupported: row.androidSupported,
      status: row.status,
      firmwareNotes: row.firmwareNotes ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (editId !== null) {
      updateMutation.mutate({
        adapterId: editId,
        vendor: form.vendor,
        model: form.model,
        slug: form.slug,
        connectionType: form.connectionType,
        iosSupported: form.iosSupported,
        androidSupported: form.androidSupported,
        status: form.status,
        firmwareNotes:
          form.firmwareNotes.trim().length > 0 ? form.firmwareNotes : undefined,
      });
    } else {
      createMutation.mutate({
        vendor: form.vendor,
        model: form.model,
        slug: form.slug,
        connectionType: form.connectionType,
        iosSupported: form.iosSupported,
        androidSupported: form.androidSupported,
        status: form.status,
        firmwareNotes:
          form.firmwareNotes.trim().length > 0 ? form.firmwareNotes : undefined,
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditId(null);
            setForm(DEFAULT_FORM);
            setShowForm(!showForm);
          }}
        >
          {showForm ? "Cancel" : "+ New Adapter"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editId ? "Edit Adapter" : "New Adapter"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Vendor *</Label>
                <Input
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value }))
                  }
                  placeholder="OBDLink"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Model *</Label>
                <Input
                  value={form.model}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, model: e.target.value }))
                  }
                  placeholder="MX+"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, slug: e.target.value }))
                  }
                  placeholder="obdlink-mx-plus"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Connection Type</Label>
                <Input
                  value={form.connectionType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, connectionType: e.target.value }))
                  }
                  placeholder="bluetooth"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as AdapterStatus,
                    }))
                  }
                  className="h-9 w-full rounded border bg-background px-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="deprecated">Deprecated</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Firmware Notes</Label>
                <Input
                  value={form.firmwareNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firmwareNotes: e.target.value }))
                  }
                  placeholder="Optional firmware notes"
                />
              </div>
              <div className="flex items-center gap-4 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.iosSupported}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iosSupported: e.target.checked }))
                    }
                  />
                  iOS Supported
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.androidSupported}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        androidSupported: e.target.checked,
                      }))
                    }
                  />
                  Android Supported
                </label>
              </div>
              {mutationError && (
                <p className="text-xs text-red-500 sm:col-span-2">
                  {mutationError}
                </p>
              )}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Saving..." : editId ? "Update" : "Create"}
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

      {adapters.isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Vendor</th>
                <th className="px-3 py-2 text-left font-medium">Model</th>
                <th className="px-3 py-2 text-left font-medium">Slug</th>
                <th className="px-3 py-2 text-left font-medium">Connection</th>
                <th className="px-3 py-2 text-left font-medium">iOS</th>
                <th className="px-3 py-2 text-left font-medium">Android</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(adapters.data ?? []).length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No adapters configured.
                  </td>
                </tr>
              ) : (
                (adapters.data ?? []).map((row) => (
                  <tr
                    key={row.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2">{row.vendor}</td>
                    <td className="px-3 py-2">{row.model}</td>
                    <td className="px-3 py-2 font-mono">{row.slug}</td>
                    <td className="px-3 py-2">{row.connectionType}</td>
                    <td className="px-3 py-2">
                      {row.iosSupported ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2">
                      {row.androidSupported ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(row)}
                          className="text-primary hover:underline"
                        >
                          Edit
                        </button>
                        {row.status !== "archived" && (
                          <>
                            {archiveReason?.id === row.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  placeholder="Reason..."
                                  value={archiveReason.reason}
                                  onChange={(e) =>
                                    setArchiveReason(
                                      (s) =>
                                        s && { ...s, reason: e.target.value },
                                    )
                                  }
                                  className="h-6 rounded border px-1 text-xs"
                                />
                                <button
                                  type="button"
                                  className="text-red-500 hover:underline"
                                  onClick={() =>
                                    archiveMutation.mutate({
                                      adapterId: row.id,
                                      reason: archiveReason.reason,
                                    })
                                  }
                                  disabled={
                                    archiveMutation.isPending ||
                                    archiveReason.reason.trim().length === 0
                                  }
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:underline"
                                  onClick={() => setArchiveReason(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setArchiveReason({ id: row.id, reason: "" })
                                }
                                className="text-muted-foreground hover:underline"
                              >
                                Archive
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
