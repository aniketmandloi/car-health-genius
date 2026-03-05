import { Ionicons } from "@expo/vector-icons";
import { forwardRef, useState } from "react";
import {
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
} from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";

type AppTextInputProps = Omit<RNTextInputProps, "style"> & {
  label?: string;
  error?: string | null;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  containerClassName?: string;
};

export const AppTextInput = forwardRef<RNTextInput, AppTextInputProps>(
  function AppTextInput(
    { label, error, leftIcon, rightIcon, containerClassName, ...inputProps },
    ref,
  ) {
    const { colors } = useAppTheme();
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? colors.danger
      : focused
        ? colors.primary
        : colors.border;

    return (
      <View className={containerClassName} style={{ gap: 7 }}>
        {label ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "600" }}>
            {label}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.input,
            borderColor,
            borderWidth: focused ? 1.5 : 1,
            borderRadius: 14,
            paddingHorizontal: 14,
            minHeight: inputProps.multiline ? 108 : 50,
            shadowColor: colors.primary,
            shadowOpacity: focused ? 0.12 : 0,
            shadowRadius: focused ? 14 : 0,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          {leftIcon ? (
            <Ionicons
              name={leftIcon}
              size={18}
              color={focused ? colors.primary : colors.textSubtle}
              style={{ marginRight: 9 }}
            />
          ) : null}

          <RNTextInput
            ref={ref}
            placeholderTextColor={colors.textSubtle}
            {...inputProps}
            onFocus={(e) => {
              setFocused(true);
              inputProps.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              inputProps.onBlur?.(e);
            }}
            style={{
              flex: 1,
              color: colors.text,
              fontSize: 16,
              fontWeight: "500",
              paddingVertical: inputProps.multiline ? 12 : 10,
              ...(inputProps.multiline
                ? { textAlignVertical: "top" as const }
                : null),
            }}
          />

          {rightIcon ? (
            <Ionicons
              name={rightIcon}
              size={18}
              color={focused ? colors.primary : colors.textSubtle}
              style={{ marginLeft: 9 }}
            />
          ) : null}
        </View>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>
            {error}
          </Text>
        ) : null}
      </View>
    );
  },
);
