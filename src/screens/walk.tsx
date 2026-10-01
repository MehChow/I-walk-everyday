import { BottomSheet, Button, Column, Host, Row, ScrollView as NativeScrollView, Text as NativeText, TextInput, useNativeState } from '@expo/ui';
import { fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FakeWalk from '../../modules/fake-walk';
import { theme as t } from '../theme';
import { parseStepTarget, simulatedSteps, walkDuration } from '../walk/core';
import { useWalk } from '../walk/use-walk';

function duration(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}
function time(ms: number) { return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

export function WalkScreen() {
  const walk = useWalk();
  const { fontScale } = useWindowDimensions();
  const Presets = fontScale > 1.3 ? Column : Row;
  const input = useNativeState('5000');
  const [entry, setEntry] = useState('5000');
  const [confirm, setConfirm] = useState(false);
  const [estimatedFinish, setEstimatedFinish] = useState(0);
  const target = parseStepTarget(entry);
  const session = walk.overview?.active;
  const latest = walk.overview?.latest;
  const ready = walk.permissions?.healthAvailable && walk.permissions.stepsGranted && walk.permissions.notificationsGranted;
  const generated = session ? simulatedSteps(session.steps, session.elapsedMs) : 0;
  const remaining = session ? Math.max(0, walkDuration(session.steps) - session.elapsedMs) : 0;
  const waiting = session && remaining === 0;
  const publishing = session?.status === 'publishing';

  const select = (steps: number) => { input.set(String(steps)); setEntry(String(steps)); };
  const start = async () => {
    if (target === null) return;
    const success = await walk.act(() => FakeWalk.startWalk(target));
    if (success) setConfirm(false);
  };
  const cancel = () => {
    if (!session) return;
    Alert.alert('Cancel this walk?', 'No steps will be saved to Health Connect.', [
      { text: 'Keep walking', style: 'cancel' },
      { text: 'Cancel walk', style: 'destructive', onPress: () => { void walk.act(() => FakeWalk.cancelWalk(session.id)); } },
    ]);
  };

  return <SafeAreaView style={s.screen}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.brand}>I WALK EVERYDAY</Text>
        <Host colorScheme="dark" seedColor={t.colors.accent} matchContents>
          <Button label="History" variant="text" onPress={() => router.push('/history')} />
        </Host>
      </View>
      <Text style={s.title}>{session ? 'A walk in motion.' : 'Your next daily walk.'}</Text>
      <Text style={s.body}>Synthetic steps. A little time. One simple goal.</Text>

      {!walk.overview && <Text style={s.body}>Getting your walks ready…</Text>}
      {walk.error && <View style={s.notice} accessibilityLiveRegion="polite">
        <Text style={s.error}>{walk.error}</Text>
        <Host colorScheme="dark" seedColor={t.colors.accent} matchContents>
          <Button label="Refresh" variant="text" onPress={() => { void walk.refresh(); }} />
        </Host>
      </View>}

      {walk.permissions && !ready && <View style={s.notice}>
        <Text style={s.heading}>Ready when you are</Text>
        <Text style={s.body}>{walk.permissions.healthAvailable
          ? 'Allow step saving and completion reminders before starting a walk.'
          : 'Health Connect is unavailable. This app needs Android 14 or later with Health Connect enabled.'}</Text>
        <View style={s.line}><Text style={s.body}>Health Connect</Text><Text style={s.status}>{walk.permissions.stepsGranted ? 'Allowed' : 'Required'}</Text></View>
        <View style={s.line}><Text style={s.body}>Completion reminders</Text><Text style={s.status}>{walk.permissions.notificationsGranted ? 'Allowed' : 'Required'}</Text></View>
        <Host colorScheme="dark" seedColor={t.colors.accent} matchContents={{ vertical: true }} style={s.native}>
          <Column spacing={t.spacing.sm}>
            <Button label={walk.busy ? 'Please wait…' : 'Enable permissions'} style={s.nativeButton} modifiers={[fillMaxWidth()]}
              disabled={walk.busy || !walk.permissions.healthAvailable} onPress={() => { void walk.act(() => FakeWalk.requestPermissions()); }} />
            <Button label="Health Connect settings" variant="text" onPress={() => { void walk.act(() => FakeWalk.openSettings('health')); }} />
            <Button label="Notification settings" variant="text" onPress={() => { void walk.act(() => FakeWalk.openSettings('notifications')); }} />
          </Column>
        </Host>
      </View>}

      {session ? <>
        <View style={s.hero}>
          <Text style={s.eyebrow}>SIMULATED PROGRESS</Text>
          <Text style={s.number}>{generated.toLocaleString()}</Text>
          <Text style={s.body}>of {session.steps.toLocaleString()} steps</Text>
          <View style={s.track} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: session.steps, now: generated }}>
            <View style={[s.fill, { width: `${generated / session.steps * 100}%` }]} />
          </View>
          <Text style={s.heading}>{publishing ? 'Saving your walk…' : waiting ? 'Waiting to save' : `${duration(remaining)} to go`}</Text>
          <Text style={s.body}>{waiting
            ? 'Your simulation is finished. We’ll remind you once the steps are saved.'
            : `${(session.steps - generated).toLocaleString()} steps remaining · Estimated finish ${time(session.finishAt)}`}</Text>
          {session.errorMessage && <Text style={s.body}>{session.errorMessage}</Text>}
        </View>
        <Text style={s.body}>You can lock your phone or close the app. Your steps will be saved when this walk finishes.</Text>
        <Host colorScheme="dark" seedColor={t.colors.accent} matchContents={{ vertical: true }} style={s.native}>
          <Button label={publishing ? 'Saving — please wait' : 'Cancel walk'} variant="outlined" style={s.nativeButton} modifiers={[fillMaxWidth()]}
            disabled={walk.busy || publishing} onPress={cancel} />
        </Host>
      </> : walk.overview && <>
        <View style={s.hero}>
          <Text style={s.eyebrow}>CHOOSE YOUR STEP GOAL</Text>
          <Host colorScheme="dark" seedColor={t.colors.accent} matchContents={{ vertical: true }} style={s.native}>
            <Column spacing={t.spacing.md}>
              <NativeText textStyle={{ color: t.colors.muted, fontSize: t.type.caption }}>Step count</NativeText>
              <TextInput value={input} onChangeText={setEntry} keyboardType="number-pad" maxLength={5}
                selectTextOnFocus textAlign="center" textStyle={{ color: t.colors.text, fontSize: t.type.number, fontWeight: '600' }}
                testID="step-target" modifiers={[fillMaxWidth(), semantics({ contentDescription: 'Step count, from 50 to 10,000' })]} />
              <Presets spacing={t.spacing.sm}>
                {[1000, 5000, 10000].map((steps) => <Button key={steps} label={steps.toLocaleString()}
                  variant={target === steps ? 'filled' : 'outlined'} onPress={() => select(steps)} />)}
              </Presets>
            </Column>
          </Host>
          <Text style={target === null ? s.error : s.body}>{target === null ? 'Enter a whole number from 50 to 10,000.' : `${duration(walkDuration(target))} at a gentle, fixed pace`}</Text>
        </View>
        <Host colorScheme="dark" seedColor={t.colors.accent} matchContents={{ vertical: true }} style={s.native}>
          <Button label="Start a walk" style={s.nativeButton} modifiers={[fillMaxWidth()]} disabled={!ready || target === null || walk.busy}
            onPress={() => { setEstimatedFinish(Date.now() + walkDuration(target ?? 0)); setConfirm(true); }} />
        </Host>
        <Text style={s.body}>Steps are added to Health Connect only when the walk is complete.</Text>
      </>}

      {!session && latest && <View style={s.result}>
        <Text style={s.eyebrow}>LAST WALK</Text>
        <Text style={s.heading}>{latest.steps.toLocaleString()} steps · {latest.status === 'completed' ? 'Saved' : latest.status === 'failed' ? 'Not saved' : 'Cancelled'}</Text>
        <Text style={s.body}>{latest.status === 'completed'
          ? `Saved to Health Connect${latest.notification !== 'sent' ? ' · Reminder unavailable' : ''}`
          : latest.errorMessage ?? 'No steps were added.'}</Text>
        {latest.status === 'failed' && <Host colorScheme="dark" seedColor={t.colors.accent} matchContents>
          <Button label="Retry saving" variant="outlined" disabled={!ready || walk.busy} onPress={() => { void walk.act(() => FakeWalk.retrySave(latest.id)); }} />
        </Host>}
      </View>}
      <Text style={s.footer}>An experiment in simulated walking.{ '\n' }Health Connect records are marked as manual entries.</Text>
    </ScrollView>

    <Host colorScheme="dark" seedColor={t.colors.accent} matchContents>
      <BottomSheet isPresented={confirm} onDismiss={() => { if (!walk.busy) setConfirm(false); }} shouldDismissOnBackPress={!walk.busy} shouldDismissOnClickOutside={!walk.busy} snapPoints={['full']} containerColor={t.colors.surface} contentPadding={t.spacing.lg}>
        <NativeScrollView>
        <Column spacing={t.spacing.lg} modifiers={[fillMaxWidth()]}>
          <NativeText textStyle={{ fontSize: t.type.heading, fontWeight: '600', color: t.colors.text }}>Ready for your walk?</NativeText>
          <NativeText textStyle={{ fontSize: t.type.number, color: t.colors.accent }}>{(target ?? 0).toLocaleString()}</NativeText>
          <NativeText textStyle={{ color: t.colors.muted, fontSize: t.type.body }}>{`${duration(walkDuration(target ?? 0))} · Estimated finish ${time(estimatedFinish)}`}</NativeText>
          <NativeText textStyle={{ color: t.colors.text, fontSize: t.type.body }}>You can close the app. We’ll notify you after your steps are saved.</NativeText>
          {walk.error && <NativeText textStyle={{ color: t.colors.danger }}>{walk.error}</NativeText>}
          <Button label={walk.busy ? 'Starting…' : 'Confirm and walk'} style={s.nativeButton} modifiers={[fillMaxWidth()]} disabled={walk.busy || !ready || target === null} onPress={() => { void start(); }} />
          <Button label="Not yet" variant="text" disabled={walk.busy} onPress={() => setConfirm(false)} />
        </Column>
        </NativeScrollView>
      </BottomSheet>
    </Host>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: { padding: t.spacing.lg, gap: t.spacing.lg, paddingBottom: t.spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  brand: { color: t.colors.accent, fontSize: t.type.caption, fontWeight: '700', letterSpacing: 2 },
  title: { color: t.colors.text, fontSize: t.type.title, fontWeight: '600' },
  heading: { color: t.colors.text, fontSize: t.type.heading, fontWeight: '600' },
  body: { color: t.colors.muted, fontSize: t.type.body, lineHeight: 24 },
  eyebrow: { color: t.colors.muted, fontSize: t.type.caption, fontWeight: '600', letterSpacing: 1.5 },
  number: { color: t.colors.accent, fontSize: t.type.number, fontWeight: '600', fontVariant: ['tabular-nums'] },
  hero: { backgroundColor: t.colors.surface, borderRadius: t.radius.lg, padding: t.spacing.lg, gap: t.spacing.lg },
  native: { width: '100%' },
  nativeButton: { paddingVertical: t.spacing.sm },
  notice: { padding: t.spacing.md, gap: t.spacing.md, borderWidth: 1, borderColor: t.colors.line, borderRadius: t.radius.md },
  error: { color: t.colors.danger, fontSize: t.type.body },
  line: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: t.spacing.sm },
  status: { color: t.colors.accent, fontSize: t.type.body },
  track: { height: t.spacing.sm, backgroundColor: t.colors.line, borderRadius: t.radius.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: t.colors.accent },
  result: { borderTopWidth: 1, borderTopColor: t.colors.line, paddingTop: t.spacing.lg, gap: t.spacing.sm },
  footer: { color: t.colors.muted, fontSize: t.type.caption, lineHeight: 20 },
});
