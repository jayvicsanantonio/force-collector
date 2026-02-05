import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "./components/ScreenHeader";

interface PlaceholderScreenProps {
  title: string;
  description?: string;
}

export default function PlaceholderScreen({
  title,
  description,
  children,
}: PropsWithChildren<PlaceholderScreenProps>) {
  return (
    <View className="flex-1 bg-void">
      <ScreenHeader title={title} subtitle="Force Collector" />
      <ScrollView className="flex-1" contentContainerStyle={styles.content}>
        {description ? (
          <Text className="mb-6 text-sm font-space-medium text-secondary-text">
            {description}
          </Text>
        ) : null}
        <View className="gap-4">{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
});
