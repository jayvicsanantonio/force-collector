import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { cx } from "../utils/cx";

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  variant?: "default" | "blur";
};

export function ScreenHeader({
  title,
  subtitle,
  rightSlot,
  variant = "blur",
}: ScreenHeaderProps) {
  const { accentTextClass } = useTheme();
  return (
    <SafeAreaView edges={["top"]} className="bg-void">
      {variant === "blur" ? (
        <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-space-bold uppercase tracking-wide text-frost-text">
                {title}
              </Text>
              {subtitle ? (
                <Text
                  className={cx(
                    "text-xs font-space-medium uppercase tracking-widest",
                    accentTextClass
                  )}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {rightSlot ? <View className="pt-1">{rightSlot}</View> : null}
          </View>
        </BlurView>
      ) : (
        <View className="border-b border-hud-line/60 bg-void px-4 py-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-lg font-space-bold uppercase tracking-wide text-frost-text">
                {title}
              </Text>
              {subtitle ? (
                <Text
                  className={cx(
                    "text-xs font-space-medium uppercase tracking-widest",
                    accentTextClass
                  )}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {rightSlot ? <View className="pt-1">{rightSlot}</View> : null}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(30,58,138,0.6)",
    backgroundColor: "rgba(2,6,23,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});
