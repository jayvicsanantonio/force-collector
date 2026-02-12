import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";
import { track } from "../../../src/observability";
import { useLocalSearchParams } from "expo-router";

export default function FigureDetailsScreen() {
  const params = useLocalSearchParams<{
    figureId?: string;
    userFigureId?: string;
    source?: string;
  }>();
  const target =
    params.userFigureId ?? params.figureId ?? undefined;

  useEffect(() => {
    track("figure_details_viewed");
  }, []);

  return (
    <PlaceholderScreen
      title="Figure Details & Lore"
      description={
        target
          ? `Opened from ${params.source ?? "notification"} for ${target}.`
          : "Placeholder for figure details, lore, and actions."
      }
    >
      <Pressable
        style={styles.button}
        onPress={() => track("figure_status_changed")}
      >
        <Text style={styles.buttonText}>Change Status</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("figure_edit_opened")}
      >
        <Text style={styles.buttonText}>Edit Figure Details</Text>
      </Pressable>
      <Pressable
        style={styles.button}
        onPress={() => track("figure_shared")}
      >
        <Text style={styles.buttonText}>Share Figure</Text>
      </Pressable>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1c2a3d",
    borderWidth: 1,
    borderColor: "#2f4566",
  },
  buttonText: {
    color: "#e6f0ff",
    fontSize: 14,
    fontWeight: "600",
  },
});
