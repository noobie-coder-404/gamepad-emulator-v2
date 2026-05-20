import { Stack } from 'expo-router';

export default function CloudGamepadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, orientation: 'portrait' }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
