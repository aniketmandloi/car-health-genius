import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { SectionHeader } from "@/components/ui/section-header";
import { AppTextInput } from "@/components/ui/text-input";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAppTheme } from "@/contexts/app-theme-context";
import { TYPO } from "@/lib/design";
import { queryClient, trpc } from "@/utils/trpc";

function IssueStatusBadge({ status }: { status: string }) {
  const color =
    status === "resolved"
      ? "success"
      : status === "in_progress"
        ? "warning"
        : status === "closed"
          ? "default"
          : "info";

  return (
    <Chip color={color} size="sm" dot>
      {status.replace("_", " ")}
    </Chip>
  );
}

function statusBorderColor(status: string, colors: any): string {
  switch (status) {
    case "resolved":
      return colors.success;
    case "in_progress":
      return colors.warning;
    case "closed":
      return colors.textSubtle;
    default:
      return colors.info;
  }
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

  const handleRefresh = useCallback(() => {
    issuesQuery.refetch();
  }, [issuesQuery]);

  return (
    <Container
      refreshing={issuesQuery.isFetching}
      onRefresh={handleRefresh}
      className="px-4 pt-2"
    >
      <View className="gap-5">
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <View className="flex-row items-start justify-between">
            <View>
              <Text style={{ ...TYPO.h1, color: colors.text }}>Support</Text>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                Submit and track support requests.
              </Text>
            </View>
            {isPriorityUser && (
              <Chip color="info" dot>
                Pro Priority
              </Chip>
            )}
          </View>
        </Animated.View>

        {/* SLA info */}
        {priorityQuery.data && (
          <Animated.View entering={FadeInDown.duration(300).delay(50)}>
            <Card variant="default">
              <View className="flex-row items-center gap-2">
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={colors.primary}
                />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Tier:{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {priorityQuery.data.priorityTier}
                  </Text>
                  {" · "}SLA: {priorityQuery.data.slaTargetMinutes} min
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* New Issue Form */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <Card variant="outlined">
            <SectionHeader title="New Issue" icon="create" />

            <View className="gap-3">
              <AppTextInput
                label="Summary *"
                value={summary}
                onChangeText={setSummary}
                placeholder="Brief description"
                maxLength={240}
              />

              <AppTextInput
                label="Details (optional)"
                value={details}
                onChangeText={setDetails}
                placeholder="Steps to reproduce, additional context..."
                maxLength={4000}
                multiline
                numberOfLines={4}
              />

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
                  trackColor={{ true: colors.primary, false: colors.track }}
                />
              </View>

              {includeBundle && (
                <TouchableOpacity
                  onPress={() => setConsentBundle((v) => !v)}
                  className="flex-row items-start gap-2 rounded-xl p-3"
                  style={{
                    borderWidth: 1,
                    borderColor: `${colors.warning}44`,
                    backgroundColor: `${colors.warning}12`,
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
                  <Text
                    style={{ color: colors.warning, fontSize: 12, flex: 1 }}
                  >
                    I consent to sharing my recent diagnostic event data (DTC
                    codes, severity, timestamps) with the support team to
                    resolve my issue.
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
                isLoading={createMutation.isPending}
              >
                Submit Issue
              </Button>
            </View>
          </Card>
        </Animated.View>

        {/* Existing Issues */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)}>
          <SectionHeader title="My Issues" icon="list" />

          {issuesQuery.isLoading ? (
            <SkeletonCard />
          ) : (issuesQuery.data?.length ?? 0) === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              No issues submitted yet.
            </Text>
          ) : (
            <View className="gap-2">
              {issuesQuery.data!.map((issue, i) => (
                <Animated.View
                  key={issue.id}
                  entering={FadeInDown.duration(300).delay(200 + i * 40)}
                >
                  <Card
                    variant="default"
                    noPadding
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: statusBorderColor(
                        issue.status,
                        colors,
                      ),
                    }}
                  >
                    <View style={{ padding: 14 }}>
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <Text
                            style={{
                              color: colors.text,
                              fontSize: 13,
                              fontWeight: "600",
                            }}
                          >
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
                    </View>
                  </Card>
                </Animated.View>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    </Container>
  );
}
