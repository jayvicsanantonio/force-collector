import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { cx } from "../utils/cx";

type BadgeTone =
  | "owned"
  | "wishlist"
  | "exclusive"
  | "in-stock"
  | "limited"
  | "neutral";

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  iconName?: keyof typeof MaterialIcons.glyphMap;
};

const toneConfig: Record<
  BadgeTone,
  {
    icon: keyof typeof MaterialIcons.glyphMap;
    className: string;
    textClassName: string;
    iconColor: string;
  }
> = {
  owned: {
    icon: "verified",
    className: "bg-bright-cyan/15",
    textClassName: "text-bright-cyan",
    iconColor: "#22d3ee",
  },
  wishlist: {
    icon: "favorite-border",
    className: "bg-action-blue/15",
    textClassName: "text-action-blue",
    iconColor: "#3b82f6",
  },
  exclusive: {
    icon: "star-border",
    className: "bg-laser-cyan/15",
    textClassName: "text-laser-cyan",
    iconColor: "#00e5ff",
  },
  "in-stock": {
    icon: "inventory-2",
    className: "bg-electric-cyan/15",
    textClassName: "text-electric-cyan",
    iconColor: "#06b6d4",
  },
  limited: {
    icon: "bolt",
    className: "bg-royal-blue/15",
    textClassName: "text-royal-blue",
    iconColor: "#2563eb",
  },
  neutral: {
    icon: "info-outline",
    className: "bg-raised-surface/60",
    textClassName: "text-secondary-text",
    iconColor: "#94a3b8",
  },
};

export function Badge({ label, tone = "neutral", iconName }: BadgeProps) {
  const { accentBorderClass } = useTheme();
  const config = toneConfig[tone];
  const icon = iconName ?? config.icon;

  return (
    <View
      className={cx(
        "flex-row items-center gap-1 rounded-full border px-2.5 py-1",
        accentBorderClass,
        config.className
      )}
      accessibilityLabel={`${label} badge`}
    >
      <MaterialIcons name={icon} size={12} color={config.iconColor} />
      <Text
        className={cx(
          "text-[10px] font-space-semibold uppercase tracking-widest",
          config.textClassName
        )}
      >
        {label}
      </Text>
    </View>
  );
}
