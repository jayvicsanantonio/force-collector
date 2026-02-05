import { Stack } from "expo-router";

export default function SearchLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Scanner" }} />
      <Stack.Screen name="results" options={{ title: "Scan Results" }} />
      <Stack.Screen name="manual" options={{ title: "Manual Lookup" }} />
    </Stack>
  );
}
