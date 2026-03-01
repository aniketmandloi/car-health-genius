import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Card, Spinner } from "heroui-native";
import { useState } from "react";
import {
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Container } from "@/components/container";
import { queryClient, trpc } from "@/utils/trpc";

function IssueStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    open: "#2563eb",
    in_progress: "#ca8a04",
    resolved: "#16a34a",
    closed: "#6b7280",
  };
  return (
    <Text
      style={{
        color: colorMap[status] ?? colorMap.open,
        fontSize: 11,
        fontWeight: "600",
      }}
    >
      {status.replace("_", " ")}
    </Text>
  );
}

export default function SupportScreen() {
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [includeBundle, setIncludeBundle] = useState(false);
  const [consentBundle, setConsentBundle] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const issuesQuery = useQuery(trpc.support.listMyIssues.queryOptions());
  const priorityQuery = useQuery(
    trpc.billing.getSupportPriority.queryOptions(),
  );

  const createMutation = useMutation(
    trpc.support.createIssue.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.support.listMyIssues.queryFilter(),
        );
        setSummary("");
        setDetails("");
        setIncludeBundle(false);
        setConsentBundle(false);
        setSubmitSuccess(true);
      },
    }),
  );

  const isPriorityUser = priorityQuery.data?.priorityTier === "priority";

  function handleSubmit() {
    setSubmitSuccess(false);
    createMutation.mutate({
      issueSummary: summary.trim(),
      issueDetails: details.trim() || undefined,
      includeDiagnosticBundle: includeBundle,
      consentDiagnosticBundle: consentBundle,
    });
  }

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-foreground text-2xl font-bold">Support</Text>
            <Text className="text-muted mt-1 text-xs">
              Submit and track support requests.
            </Text>
          </View>
          {isPriorityUser && (
            <View className="rounded-full bg-primary px-3 py-1">
              <Text className="text-white text-xs font-semibold">
                Pro Priority
              </Text>
            </View>
          )}
        </View>

        {/* SLA info */}
        {priorityQuery.data && (
          <View className="rounded-lg border px-3 py-2">
            <Text className="text-muted text-xs">
              Tier:{" "}
              <Text className="text-foreground font-semibold capitalize">
                {priorityQuery.data.priorityTier}
              </Text>
              {" · "}SLA: {priorityQuery.data.slaTargetMinutes} min
            </Text>
          </View>
        )}

        {/* New Issue Form */}
        <Card className="p-4 gap-3">
          <Text className="text-foreground font-semibold text-base">
            New Issue
          </Text>

          <View>
            <Text className="text-muted text-xs mb-1">Summary *</Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder="Brief description"
              maxLength={240}
              className="rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
              placeholderTextColor="#888"
            />
          </View>

          <View>
            <Text className="text-muted text-xs mb-1">Details (optional)</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Steps to reproduce, additional context..."
              maxLength={4000}
              multiline
              numberOfLines={4}
              className="rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
              placeholderTextColor="#888"
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Diagnostic Bundle */}
          <View className="flex-row items-center justify-between">
            <Text className="text-muted text-sm flex-1 mr-2">
              Attach diagnostic data
            </Text>
            <Switch
              value={includeBundle}
              onValueChange={(v) => {
                setIncludeBundle(v);
                if (!v) setConsentBundle(false);
              }}
            />
          </View>

          {includeBundle && (
            <TouchableOpacity
              onPress={() => setConsentBundle((v) => !v)}
              className="flex-row items-start gap-2 rounded border border-amber-300 bg-amber-50 p-3"
            >
              <View
                className={`mt-0.5 h-4 w-4 shrink-0 rounded border ${consentBundle ? "bg-primary border-primary" : "border-muted"}`}
              />
              <Text className="text-xs flex-1" style={{ color: "#92400e" }}>
                I consent to sharing my recent diagnostic event data (DTC codes,
                severity, timestamps) with the support team to resolve my issue.
              </Text>
            </TouchableOpacity>
          )}

          {createMutation.error && (
            <Text className="text-xs text-red-500">
              {createMutation.error.message}
            </Text>
          )}
          {submitSuccess && (
            <Text className="text-xs text-green-600">
              Issue submitted successfully. We&apos;ll be in touch soon.
            </Text>
          )}

          <Button
            onPress={handleSubmit}
            isDisabled={
              createMutation.isPending ||
              !summary.trim() ||
              (includeBundle && !consentBundle)
            }
          >
            {createMutation.isPending ? "Submitting..." : "Submit Issue"}
          </Button>
        </Card>

        {/* Existing Issues */}
        <Text className="text-foreground font-semibold text-base">
          My Issues
        </Text>

        {issuesQuery.isLoading ? (
          <View className="items-center py-8">
            <Spinner />
          </View>
        ) : (issuesQuery.data?.length ?? 0) === 0 ? (
          <Text className="text-muted text-sm">No issues submitted yet.</Text>
        ) : (
          <View className="gap-2">
            {issuesQuery.data!.map((issue) => (
              <Card key={issue.id} className="p-3">
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-medium">
                      {issue.issueSummary}
                    </Text>
                    {issue.issueDetails && (
                      <Text
                        className="text-muted text-xs mt-0.5"
                        numberOfLines={2}
                      >
                        {issue.issueDetails}
                      </Text>
                    )}
                    <Text className="text-muted text-xs mt-1">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <IssueStatusBadge status={issue.status} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Container>
  );
}
