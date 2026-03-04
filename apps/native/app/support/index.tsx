import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAppTheme } from "@/contexts/app-theme-context";
import { queryClient, trpc } from "@/utils/trpc";

function IssueStatusBadge({ status }: { status: string }) {
  const { colors } = useAppTheme();
  const color =
    status === "resolved"
      ? colors.success
      : status === "in_progress"
        ? colors.warning
        : status === "closed"
          ? colors.textSubtle
          : colors.info;

  return (
    <View
      style={{ backgroundColor: `${color}20` }}
      className="rounded-full px-2 py-0.5"
    >
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>
        {status.replace("_", " ")}
      </Text>
    </View>
  );
}

export default function SupportScreen() {
  const { colors } = useAppTheme();
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

  const inputClass =
    "rounded-xl border border-surface-border bg-surface-input px-3 py-2.5 text-sm text-foreground";

  return (
    <Container>
      <ScrollView contentContainerClassName="p-4 gap-4">
        {/* Header */}
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-foreground text-2xl font-bold">Support</Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}
            >
              Submit and track support requests.
            </Text>
          </View>
          {isPriorityUser && (
            <View
              style={{ backgroundColor: colors.primarySoft }}
              className="rounded-full px-3 py-1"
            >
              <Text
                style={{
                  color: colors.primary,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Pro Priority
              </Text>
            </View>
          )}
        </View>

        {/* SLA info */}
        {priorityQuery.data && (
          <View
            className="rounded-xl px-3 py-2"
            style={{ borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Tier:{" "}
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {priorityQuery.data.priorityTier}
              </Text>
              {" · "}SLA: {priorityQuery.data.slaTargetMinutes} min
            </Text>
          </View>
        )}

        {/* New Issue Form */}
        <Card className="p-4 gap-3 rounded-2xl border border-surface-border">
          <Text className="text-foreground font-bold text-base">New Issue</Text>

          <View>
            <Text
              style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}
            >
              Summary *
            </Text>
            <TextInput
              value={summary}
              onChangeText={setSummary}
              placeholder="Brief description"
              maxLength={240}
              className={inputClass}
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <View>
            <Text
              style={{ color: colors.textMuted, fontSize: 12, marginBottom: 4 }}
            >
              Details (optional)
            </Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Steps to reproduce, additional context..."
              maxLength={4000}
              multiline
              numberOfLines={4}
              className={inputClass}
              placeholderTextColor={colors.textSubtle}
              style={{ textAlignVertical: "top" }}
            />
          </View>

          {/* Diagnostic Bundle */}
          <View className="flex-row items-center justify-between">
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 13,
                flex: 1,
                marginRight: 8,
              }}
            >
              Attach diagnostic data
            </Text>
            <Switch
              value={includeBundle}
              onValueChange={(v) => {
                setIncludeBundle(v);
                if (!v) setConsentBundle(false);
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {includeBundle && (
            <TouchableOpacity
              onPress={() => setConsentBundle((v) => !v)}
              className="flex-row items-start gap-2 rounded-xl p-3"
              style={{
                borderWidth: 1,
                borderColor: `${colors.warning}66`,
                backgroundColor: `${colors.warning}14`,
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  marginTop: 2,
                  backgroundColor: consentBundle
                    ? colors.primary
                    : "transparent",
                  borderWidth: 1,
                  borderColor: consentBundle
                    ? colors.primary
                    : colors.textSubtle,
                }}
              />
              <Text style={{ color: colors.warning, fontSize: 12, flex: 1 }}>
                I consent to sharing my recent diagnostic event data (DTC codes,
                severity, timestamps) with the support team to resolve my issue.
              </Text>
            </TouchableOpacity>
          )}

          {createMutation.error && (
            <Text style={{ color: colors.danger, fontSize: 12 }}>
              {createMutation.error.message}
            </Text>
          )}
          {submitSuccess && (
            <Text style={{ color: colors.success, fontSize: 12 }}>
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
        <Text className="text-foreground font-bold text-base">My Issues</Text>

        {issuesQuery.isLoading ? (
          <View className="items-center py-8">
            <Spinner />
          </View>
        ) : (issuesQuery.data?.length ?? 0) === 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>
            No issues submitted yet.
          </Text>
        ) : (
          <View className="gap-2">
            {issuesQuery.data!.map((issue) => (
              <Card
                key={issue.id}
                className="p-3 rounded-2xl border border-surface-border"
              >
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="text-foreground text-sm font-medium">
                      {issue.issueSummary}
                    </Text>
                    {issue.issueDetails && (
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                        numberOfLines={2}
                      >
                        {issue.issueDetails}
                      </Text>
                    )}
                    <Text
                      style={{
                        color: colors.textSubtle,
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
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
