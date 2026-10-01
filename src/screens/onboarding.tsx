import { Host } from '@expo/ui';
import { Icon } from '@expo/ui/jetpack-compose';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FakeWalk from '../../modules/fake-walk';
import { ActionButton, icons } from '../components/native-controls';
import { theme as t } from '../theme';
import { walkDuration } from '../walk/core';
import { duration } from '../walk/format';
import { useWalk } from '../walk/use-walk';

export function OnboardingScreen() {
  const walk = useWalk();
  const [attempted, setAttempted] = useState(false);
  const permissions = walk.permissions;
  const session = walk.overview?.active;
  const publishing = session?.status === 'publishing';
  const cancel = () => {
    if (!session) return;
    Alert.alert('Cancel this walk?', 'No steps will be saved.', [
      { text: 'Keep walking', style: 'cancel' },
      { text: 'Cancel walk', style: 'destructive', onPress: () => { void walk.act(() => FakeWalk.cancelWalk(session.id)); } },
    ]);
  };
  return <SafeAreaView style={s.screen}>
    <ScrollView contentContainerStyle={s.scroll}>
      <View style={s.content}>
        <Text style={s.brand}>I WALK EVERYDAY</Text>
        <View style={s.art} accessible={false} importantForAccessibility="no-hide-descendants">
          <Host colorScheme="dark" seedColor={t.colors.accent} style={{ width: 80, height: 80 }}>
            <Icon source={icons.walk} size={80} tint={t.colors.accent} />
          </Host>
        </View>
        <View style={s.intro}>
          <Text style={s.title}>Ready to walk.</Text>
          <Text style={s.body}>Save simulated steps as manual entries in Health Connect, with a reminder when your walk is saved.</Text>
        </View>
        <View style={s.permissions}>
          <View style={s.statusRow}><Text style={s.permissionName}>Health Connect</Text><Text style={s.status}>{permissions?.stepsGranted ? 'Allowed' : 'Required'}</Text></View>
          <View style={s.divider} />
          <View style={s.statusRow}><Text style={s.permissionName}>Reminders</Text><Text style={s.status}>{permissions?.notificationsGranted ? 'Allowed' : 'Required'}</Text></View>
        </View>
        {!permissions?.healthAvailable && <Text style={s.error}>Health Connect isn’t available. Enable it in Android settings to continue.</Text>}
        {walk.error && <Text style={s.error} accessibilityLiveRegion="polite">{walk.error}</Text>}
        <ActionButton label={walk.busy ? 'Waiting for permissions…' : 'Enable permissions'} disabled={walk.busy || !permissions?.healthAvailable}
          onPress={() => { setAttempted(true); void walk.act(() => FakeWalk.requestPermissions()); }} />
        {(attempted || !permissions?.healthAvailable) && <View style={s.settings}>
          {!permissions?.stepsGranted && <ActionButton label="Health Connect settings" variant="text" disabled={walk.busy}
            onPress={() => { void walk.act(() => FakeWalk.openSettings('health')); }} />}
          {!permissions?.notificationsGranted && <ActionButton label="Reminder settings" variant="text" disabled={walk.busy}
            onPress={() => { void walk.act(() => FakeWalk.openSettings('notifications')); }} />}
        </View>}
        {session && <View style={s.active}>
          <Text style={s.permissionName}>{publishing ? 'Saving your walk…' : 'Your walk is still running'}</Text>
          <Text style={s.body}>{publishing ? 'Please wait for saving to finish.' : 'Restore permissions before saving.'}</Text>
          {!publishing && <Text style={s.body}>{duration(Math.max(0, walkDuration(session.steps) - session.elapsedMs))} remaining</Text>}
          <ActionButton label={publishing ? 'Saving — please wait' : 'Cancel walk'} variant="outlined" disabled={walk.busy || publishing} onPress={cancel} />
        </View>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: t.spacing.lg },
  content: { width: '100%', maxWidth: t.layout.maxWidth, alignSelf: 'center', gap: t.spacing.lg },
  brand: { color: t.colors.accent, fontSize: t.type.caption, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  art: { width: 160, height: 160, alignSelf: 'center', borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center', experimental_backgroundImage: t.gradients.onboarding },
  intro: { gap: t.spacing.sm },
  title: { color: t.colors.text, fontSize: t.type.title, fontWeight: '600', textAlign: 'center' },
  body: { color: t.colors.muted, fontSize: t.type.body, lineHeight: t.spacing.lg, textAlign: 'center' },
  permissions: { padding: t.spacing.md, gap: t.spacing.md, backgroundColor: t.colors.surface, borderRadius: t.radius.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: t.spacing.sm },
  permissionName: { color: t.colors.text, fontSize: t.type.body, fontWeight: '600' },
  status: { color: t.colors.accent, fontSize: t.type.caption, fontWeight: '600' },
  divider: { height: 1, backgroundColor: t.colors.line },
  settings: { gap: t.spacing.xs },
  active: { paddingTop: t.spacing.md, borderTopWidth: 1, borderTopColor: t.colors.line, gap: t.spacing.sm },
  error: { color: t.colors.danger, fontSize: t.type.body, textAlign: 'center' },
});
