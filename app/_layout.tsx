import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { ModeProvider } from '@/context/ModeContext';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ModeProvider>
      <Stack screenOptions={{ headerShown: false, orientation: 'portrait' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="cloud-gamepad" />
        <Stack.Screen name="pc-gamepad" />
        <Stack.Screen name="gamepad" options={{ orientation: 'landscape' }} />
      </Stack>
      <StatusBar style="auto" />
    </ModeProvider>
  );
}
