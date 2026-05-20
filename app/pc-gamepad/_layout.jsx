import { Stack } from 'expo-router';

export default function PcGamepadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: 'portrait' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="scanner" />
    </Stack>
  );
}
