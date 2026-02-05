import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";

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
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    backgroundColor: "#0b0f16",
  },
  title: {
    color: "#e6f0ff",
    fontSize: 24,
    fontWeight: "700",
  },
  description: {
    color: "#91a4c7",
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  content: {
    marginTop: 24,
  },
});
