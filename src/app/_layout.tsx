import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { theme } from '../theme';
import { ActivityIndicator, Appearance, Text, View } from 'react-native';
import { WalkProvider, useWalk } from '../walk/use-walk';
import { ActionButton } from '../components/native-controls';
import { SafeAreaView } from 'react-native-safe-area-context';
import { permissionGate } from '../walk/permission-gate';
import { WalkResultDialog } from '../components/walk-result-dialog';

Appearance.setColorScheme('dark');

function GuardedStack() {
  const walk = useWalk();
  const checking = walk.gate === 'loading' || walk.gate === 'error';
  const showResult = walk.gate === 'ready' && !walk.busy && !!walk.result;
  const loading = <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.lg, gap: theme.spacing.lg }}>
      {walk.gate === 'loading' ? <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Checking permissions" /> : <>
        <Text style={{ color: theme.colors.text, fontSize: theme.type.body, textAlign: 'center' }}>{walk.loadError ?? 'Couldn’t check permissions.'}</Text>
        <ActionButton label="Retry" onPress={() => { void walk.refresh(); }} />
      </>}
    </View>
  </SafeAreaView>;
  if (!walk.permissions || !walk.overview) return loading;
  // Keep navigation mounted during foreground checks, with an opaque touch blocker.
  const routeGate = permissionGate(walk.permissions, 'verified');
  return <>
    <StatusBar style="light" />
    <View style={{ flex: 1, filter: showResult ? [{ blur: theme.effects.dialogBlur }] : [] }}
      accessibilityElementsHidden={checking || showResult} importantForAccessibility={checking || showResult ? 'no-hide-descendants' : 'auto'}>
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.colors.background },
      headerTintColor: theme.colors.text,
      contentStyle: { backgroundColor: theme.colors.background },
    }}>
      <Stack.Protected guard={routeGate === 'blocked'}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={routeGate === 'ready'}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="history" options={{ title: 'Your walks' }} />
      </Stack.Protected>
    </Stack>
    </View>
    {checking && <View style={{ position: 'absolute', inset: 0, backgroundColor: theme.colors.background }} accessibilityViewIsModal importantForAccessibility="yes">{loading}</View>}
    {showResult && walk.result && <WalkResultDialog result={walk.result} onDone={walk.dismissResult}
      onHistory={() => { walk.dismissResult(); router.navigate('/history'); }} />}
  </>;
}

export default function Layout() {
  return <WalkProvider><GuardedStack /></WalkProvider>;
}
