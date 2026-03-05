"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export function DataManagementSection() {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const exportMutation = useMutation(
    trpc.account.exportData.mutationOptions({
      onSuccess: (data) => {
        // Trigger download
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `car-health-genius-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess(true);
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.account.deleteAccount.mutationOptions({
      onSuccess: () => {
        // Redirect to home after deletion
        window.location.href = "/";
      },
    }),
  );

  return (
    <>
      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Your Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download a copy of all your data including vehicles, diagnostic
            events, maintenance records, estimates, and support issues.
          </p>
          {exportSuccess && (
            <p className="text-sm text-primary">
              Export downloaded successfully.
            </p>
          )}
          {exportMutation.error && (
            <p className="text-sm text-destructive">
              {exportMutation.error.message}
            </p>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportMutation.mutate(undefined as never)}
            disabled={exportMutation.isPending}
          >
            {exportMutation.isPending
              ? "Preparing export..."
              : "Download My Data"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Delete Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          {!showDeleteForm ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteForm(true)}
            >
              Delete My Account
            </Button>
          ) : (
            <div className="space-y-3 rounded-xl border border-destructive/40 p-4">
              <p className="text-sm font-medium">
                Type{" "}
                <span className="font-mono font-bold">DELETE MY ACCOUNT</span>{" "}
                to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full rounded-lg border border-input/85 bg-card px-3 py-2 text-sm font-mono shadow-sm"
              />
              {deleteMutation.error && (
                <p className="text-sm text-destructive">
                  {deleteMutation.error.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={
                    deleteConfirm !== "DELETE MY ACCOUNT" ||
                    deleteMutation.isPending
                  }
                  onClick={() =>
                    deleteMutation.mutate({ confirmPhrase: deleteConfirm })
                  }
                >
                  {deleteMutation.isPending
                    ? "Deleting..."
                    : "Confirm Deletion"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteForm(false);
                    setDeleteConfirm("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
