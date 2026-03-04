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

const signInSchema = z.object({
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

function SignIn() {
  const passwordInputRef = useRef<TextInput>(null);
  const { colors } = useAppTheme();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signIn.email(
        {
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            Toast.show({
              type: "error",
              text1: error.error?.message || "Failed to sign in",
            });
          },
          onSuccess() {
            formApi.reset();
            Toast.show({
              type: "success",
              text1: "Signed in successfully",
            });
            queryClient.refetchQueries();
          },
        },
      );
    },
  });

  return (
    <View className="gap-3">
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
                <form.Field name="email">
                  {(field) => (
                    <AppTextInput
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
                      autoComplete="password"
                      textContentType="password"
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
                  style={{ marginTop: 4 }}
                >
                  Sign In
                </Button>
              </View>
            </>
          );
        }}
      </form.Subscribe>
    </View>
  );
}

export { SignIn };
