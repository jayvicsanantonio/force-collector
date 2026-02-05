import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { cx } from "../utils/cx";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: ReactNode;
};

export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const { accentBorderClass, accentSoftBgClass, accentTextClass } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      className={cx(
        "flex-row items-center gap-2 rounded-full border px-3 py-1.5",
        selected ? accentSoftBgClass : "bg-raised-surface/60",
        selected ? accentBorderClass : "border-hud-line/60"
      )}
    >
      {icon}
      <Text
        className={cx(
          "text-[10px] font-space-semibold uppercase tracking-widest",
          selected ? accentTextClass : "text-secondary-text"
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

