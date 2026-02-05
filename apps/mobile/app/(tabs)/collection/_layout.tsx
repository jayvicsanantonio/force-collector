import { Stack } from "expo-router";

export default function CollectionLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Collection" }} />
      <Stack.Screen name="details" options={{ title: "Figure Details" }} />
    </Stack>
  );
}
