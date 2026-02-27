import { Alert, Pressable, Text, View } from "react-native";
import PlaceholderScreen from "../../../src/PlaceholderScreen";

export default function DataExportScreen() {
  const handleUnavailable = () => {
    Alert.alert(
      "Data tools coming soon",
      "Export and import tools will be available in a future update."
    );
  };

  return (
    <PlaceholderScreen
      title="Data Export"
      description="Backup and restore your collection data."
    >
      <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
        <Text className="text-sm font-space-semibold text-frost-text">
          Export Collection
        </Text>
        <Text className="mt-2 text-xs text-secondary-text">
          Download a CSV or JSON snapshot of your collection for safekeeping.
        </Text>
        <Pressable
          onPress={handleUnavailable}
          className="mt-4 rounded-xl border border-hud-line/60 bg-profile-panel px-4 py-3"
        >
          <Text className="text-center text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Request Export
          </Text>
        </Pressable>
      </View>
      <View className="rounded-2xl border border-hud-line/60 bg-hud-surface p-4">
        <Text className="text-sm font-space-semibold text-frost-text">
          Import Collection
        </Text>
        <Text className="mt-2 text-xs text-secondary-text">
          Restore collection data from a compatible CSV or JSON file.
        </Text>
        <Pressable
          onPress={handleUnavailable}
          className="mt-4 rounded-xl border border-hud-line/60 bg-profile-panel px-4 py-3"
        >
          <Text className="text-center text-xs font-space-semibold uppercase tracking-widest text-secondary-text">
            Start Import
          </Text>
        </Pressable>
      </View>
    </PlaceholderScreen>
  );
}
