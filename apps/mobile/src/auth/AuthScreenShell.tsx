import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "../components/ScreenHeader";

type AuthScreenShellProps = {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
};

export function AuthScreenShell({
  title,
  subtitle,
  footer,
  children,
}: PropsWithChildren<AuthScreenShellProps>) {
  return (
    <View className="flex-1 bg-void">
      <ScreenHeader title={title} subtitle="Force Collector" />
      <ScrollView className="flex-1" contentContainerStyle={styles.content}>
        {subtitle ? (
          <Text className="text-sm font-space-medium text-secondary-text">
            {subtitle}
          </Text>
        ) : null}
        <View className="mt-6 gap-4">{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(30,58,138,0.6)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#0f172a",
  },
});
