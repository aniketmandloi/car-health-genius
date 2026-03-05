import { useForm } from "@tanstack/react-form";
import { useRef } from "react";
import Toast from "react-native-toast-message";
import { Text, TextInput, View } from "react-native";
import z from "zod";

import { useAppTheme } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";
import { AppTextInput } from "@/components/ui/text-input";
import { Button } from "@/components/ui/button";

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
    <View className="gap-4">
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
                    borderColor: `${colors.danger}44`,
                    backgroundColor: `${colors.danger}10`,
                    borderRadius: 14,
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
                    <AppTextInput
                      label="Name"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => {
                        emailInputRef.current?.focus();
                      }}
                      leftIcon="person-outline"
                    />
                  )}
                </form.Field>

                <form.Field name="email">
                  {(field) => (
                    <AppTextInput
                      ref={emailInputRef}
                      label="Email"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => {
                        passwordInputRef.current?.focus();
                      }}
                      leftIcon="mail-outline"
                    />
                  )}
                </form.Field>

                <form.Field name="password">
                  {(field) => (
                    <AppTextInput
                      ref={passwordInputRef}
                      label="Password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      onSubmitEditing={form.handleSubmit}
                      leftIcon="lock-closed-outline"
                    />
                  )}
                </form.Field>

                <Button
                  onPress={form.handleSubmit}
                  isDisabled={isSubmitting}
                  isLoading={isSubmitting}
                  style={{ marginTop: 8 }}
                >
                  Create Account
                </Button>

                <Text style={{ color: colors.textSubtle, fontSize: 12, marginTop: 3 }}>
                  Create your account to save vehicle history, scans, and repair insights.
                </Text>
              </View>
            </>
          );
        }}
      </form.Subscribe>
    </View>
  );
}
