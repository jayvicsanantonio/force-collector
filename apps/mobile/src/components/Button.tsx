import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { cx } from "../utils/cx";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
};

export function Button({
  label,
  variant = "primary",
  loading = false,
  disabled = false,
  onPress,
  icon,
}: ButtonProps) {
  const {
    accentBorderClass,
    accentBgClass,
    accentSoftBgClass,
    accentTextClass,
  } = useTheme();
  const isDisabled = disabled || loading;
  const variantClasses =
    variant === "primary"
      ? cx("bg-royal-blue", accentBorderClass, "border")
      : variant === "secondary"
        ? cx("bg-hud-surface", accentBorderClass, "border")
        : cx("bg-transparent", accentBorderClass, "border");
  const textClasses =
    variant === "ghost"
      ? cx(accentTextClass, "uppercase tracking-widest")
      : "text-frost-text uppercase tracking-widest";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={cx(
        "flex-row items-center justify-center gap-2 rounded-xl px-4 py-3",
        "shadow-lg",
        variant === "ghost" && accentSoftBgClass,
        isDisabled && "opacity-60",
        variantClasses
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#f8fafc" />
      ) : (
        icon
      )}
      <Text className={cx("text-xs font-space-semibold", textClasses)}>
        {label}
      </Text>
    </Pressable>
  );
}
