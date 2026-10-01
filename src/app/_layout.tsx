import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';
import { Appearance } from 'react-native';

Appearance.setColorScheme('dark');

export default function Layout() {
  return <>
    <StatusBar style="light" />
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      contentStyle: { backgroundColor: theme.colors.background },
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="history" options={{ title: 'Your walks' }} />
    </Stack>
  </>;
}
