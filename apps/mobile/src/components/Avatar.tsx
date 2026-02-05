import { Text, View } from "react-native";
import { cx } from "../utils/cx";

type AvatarProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function Avatar({ label = "FC", size = "md" }: AvatarProps) {
  return (
    <View
      className={cx(
        "items-center justify-center rounded-full border border-hud-line/70 bg-raised-surface",
        sizeClasses[size]
      )}
    >
      <Text className="text-xs font-space-bold uppercase tracking-widest text-nav-tint">
        {label}
      </Text>
    </View>
  );
}

