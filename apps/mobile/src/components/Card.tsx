import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { cx } from "../utils/cx";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className }: CardProps) {
  return (
    <View
      className={cx(
        "rounded-2xl border border-hud-line/60 bg-hud-surface p-4",
        className
      )}
    >
      {children}
    </View>
  );
}

