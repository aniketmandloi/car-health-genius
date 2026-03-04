import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import Toast from "react-native-toast-message";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import z from "zod";

import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Use at least 8 characters"),
});

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === "string") {
    return error;
  }

  if (Array.isArray(error)) {
    for (const issue of error) {
      const message = getErrorMessage(issue);
      if (message) {
        return message;
      }
    }
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return null;
}

export function SignUp() {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { colors } = useAppTheme();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signUp.email(
        {
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            Toast.show({
              type: "error",
              text1: error.error?.message || "Failed to sign up",
            });
          },
          onSuccess() {
            formApi.reset();
            Toast.show({
              type: "success",
              text1: "Account created successfully",
            });
            queryClient.refetchQueries();
          },
        },
      );
    },
  });

  return (
    <View className="gap-3">
      <Text className="text-foreground text-lg font-semibold">
        Create Account
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        Build your garage profile and unlock personalized diagnostics.
      </Text>

      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: getErrorMessage(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => {
          const formError = validationError;

          return (
            <>
              {formError ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: `${colors.danger}55`,
                    backgroundColor: `${colors.danger}14`,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: colors.danger, fontSize: 12 }}>
                    {formError}
                  </Text>
                </View>
              ) : null}

              <View className="gap-3">
                <form.Field name="name">
                  {(field) => (
                    <View className="gap-1.5">
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Name
                      </Text>
                      <TextInput
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChangeText={field.handleChange}
                        placeholder="John Doe"
                        placeholderTextColor={colors.textSubtle}
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          emailInputRef.current?.focus();
                        }}
                        style={{
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          color: colors.text,
                          fontSize: 15,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      />
                    </View>
                  )}
                </form.Field>

                <form.Field name="email">
                  {(field) => (
                    <View className="gap-1.5">
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Email
                      </Text>
                      <TextInput
                        ref={emailInputRef}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChangeText={field.handleChange}
                        placeholder="email@example.com"
                        placeholderTextColor={colors.textSubtle}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        textContentType="emailAddress"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => {
                          passwordInputRef.current?.focus();
                        }}
                        style={{
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          color: colors.text,
                          fontSize: 15,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      />
                    </View>
                  )}
                </form.Field>

                <form.Field name="password">
                  {(field) => (
                    <View className="gap-1.5">
                      <Text
                        style={{
                          color: colors.textMuted,
                          fontSize: 12,
                          fontWeight: "600",
                        }}
                      >
                        Password
                      </Text>
                      <TextInput
                        ref={passwordInputRef}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChangeText={field.handleChange}
                        placeholder="••••••••"
                        placeholderTextColor={colors.textSubtle}
                        secureTextEntry
                        autoComplete="new-password"
                        textContentType="newPassword"
                        returnKeyType="go"
                        onSubmitEditing={form.handleSubmit}
                        style={{
                          backgroundColor: colors.input,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          color: colors.text,
                          fontSize: 15,
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                        }}
                      />
                    </View>
                  )}
                </form.Field>

                <Pressable
                  onPress={form.handleSubmit}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    marginTop: 4,
                    borderRadius: 12,
                    backgroundColor: colors.primary,
                    opacity: isSubmitting ? 0.7 : pressed ? 0.9 : 1,
                    paddingVertical: 12,
                    alignItems: "center",
                    shadowColor: colors.primary,
                    shadowOpacity: 0.28,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 6,
                  })}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.textOnPrimary} />
                  ) : (
                    <Text
                      style={{
                        color: colors.textOnPrimary,
                        fontSize: 15,
                        fontWeight: "700",
                      }}
                    >
                      Create Account
                    </Text>
                  )}
                </Pressable>
              </View>
            </>
          );
        }}
      </form.Subscribe>
    </View>
  );
}
