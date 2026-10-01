import { Column, Host, Text as NativeText, TextInput, useNativeState } from '@expo/ui';
import { Button as FilledGoal, OutlinedButton as OutlinedGoal } from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth, semantics } from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import FakeWalk from '../../modules/fake-walk';
import { ActionButton, IconControl } from '../components/native-controls';
import { WalkDialog } from '../components/walk-dialog';
import { theme as t } from '../theme';
import { MAX_STEPS, MIN_STEPS, simulatedSteps, walkDuration } from '../walk/core';
import { duration, finishTime } from '../walk/format';
import { PRESET_GOALS, type GoalChoice } from '../walk/goal-preferences';
import { useGoalPreferences } from '../walk/use-goal-preferences';
import { useWalk } from '../walk/use-walk';

const stepRange = `${MIN_STEPS}–${MAX_STEPS.toLocaleString()}`;

function CustomGoalDialog({ initial, onSave, onDismiss }: { initial: number; onSave: (entry: string) => boolean; onDismiss: () => void }) {
  const input = useNativeState(String(initial));
  const [entry, setEntry] = useState(String(initial));
  const [invalid, setInvalid] = useState(false);
  const apply = () => { if (onSave(entry)) onDismiss(); else setInvalid(true); };
  return <WalkDialog title="Your step goal" confirmLabel="Apply" onConfirm={apply} onDismiss={onDismiss}>
    <NativeText textStyle={{ color: t.colors.muted, fontSize: t.type.body }}>{`Choose ${stepRange} steps.`}</NativeText>
    <TextInput value={input} onChangeText={(value) => { setEntry(value); setInvalid(false); }} autoFocus
      keyboardType="number-pad" maxLength={String(MAX_STEPS).length} selectTextOnFocus returnKeyType="done" onSubmitEditing={apply}
      textStyle={{ color: t.colors.text, fontSize: t.type.title }}
      modifiers={[fillMaxWidth(), semantics({ contentDescription: `Custom steps, ${MIN_STEPS} to ${MAX_STEPS.toLocaleString()}` })]} testID="custom-step-input" />
    {invalid && <NativeText textStyle={{ color: t.colors.danger, fontSize: t.type.body }}>{`Enter a whole number from ${MIN_STEPS} to ${MAX_STEPS.toLocaleString()}.`}</NativeText>}
  </WalkDialog>;
}

export function WalkScreen() {
  const walk = useWalk();
  const goal = useGoalPreferences();
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compact = height - insets.top - insets.bottom < t.layout.compactHeight || fontScale > 1.3;
  const pagePadding = compact ? t.spacing.md : t.spacing.lg;
  const contentWidth = Math.min(width - pagePadding * 2, t.layout.maxWidth);
  const columns = width < t.layout.narrowWidth || fontScale > 1.3 ? 2 : 3;
  const tileWidth = (contentWidth - t.spacing.sm * (columns - 1)) / columns;
  // Numeric option labels are constrained chrome; cap their visual scale after reflow.
  const optionFont = t.home.goalLabel * Math.min(fontScale, 1.3) / fontScale;
  const [dialog, setDialog] = useState<'custom' | 'start' | 'error' | null>(null);
  const [estimatedFinish, setEstimatedFinish] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const [lastResult, setLastResult] = useState(walk.result);
  if (walk.result && walk.result !== lastResult) {
    setLastResult(walk.result);
    setDialog(null);
  }
  const session = walk.overview?.active;
  const generated = session ? simulatedSteps(session.steps, session.elapsedMs) : 0;
  const remaining = session ? Math.max(0, walkDuration(session.steps) - session.elapsedMs) : 0;
  const publishing = session?.status === 'publishing';
  const waiting = !!session && remaining === 0 && !publishing;
  const target = session?.steps ?? goal.target;
  const heroPadding = compact ? t.spacing.sm : t.spacing.lg;
  const heroGap = t.spacing.xs;
  const compactSummary = compact && !session;
  const numberSize = heroHeight ? Math.min(compact ? t.home.compactNumber : t.home.number,
    Math.max(20, (compactSummary
      ? heroHeight - heroPadding * 2 - t.type.caption * 1.3 * 1.3 - heroGap
      : heroHeight - t.touch - t.type.body * 1.3 * 1.3 * 2 - heroPadding * 2 - heroGap * 3 - t.spacing.md - (session ? t.spacing.lg + t.spacing.sm : 0)) / t.home.numberLineHeight)) : t.home.number;

  const cancel = () => {
    if (!session) return;
    Alert.alert('Cancel this walk?', 'No steps will be saved.', [
      { text: 'Keep walking', style: 'cancel' },
      { text: 'Cancel walk', style: 'destructive', onPress: () => { void walk.act(() => FakeWalk.cancelWalk(session.id)); } },
    ]);
  };
  const select = (choice: GoalChoice) => {
    if (choice === 'custom' && goal.customSteps === null) setDialog('custom');
    else goal.select(choice);
  };

  return <SafeAreaView style={s.screen}>
    <View style={[s.content, { maxWidth: t.layout.maxWidth + pagePadding * 2, paddingHorizontal: pagePadding, gap: compact ? t.spacing.sm : t.spacing.lg, filter: dialog ? [{ blur: t.effects.dialogBlur }] : [] }]}
      accessibilityElementsHidden={!!dialog} importantForAccessibility={dialog ? 'no-hide-descendants' : 'auto'}>
      <View style={s.header}>
        <Text style={s.brand} maxFontSizeMultiplier={1.3}>I WALK EVERYDAY</Text>
        <IconControl name="history" label="History" onPress={() => router.push('/history')} />
      </View>

      <View style={s.intro}>
        <Text style={[s.introTitle, { fontSize: compact ? t.type.heading : t.home.introTitle }]}>{session ? 'Walk in progress' : 'Your next walk'}</Text>
        <Text style={[s.guidance, { fontSize: compact ? t.type.caption : t.type.body }]}>{session ? 'You can leave the app. Steps save when this walk ends.' : compact ? 'Steps save when your walk ends.' : 'Steps save to Health Connect when your walk ends.'}</Text>
      </View>

      <View onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)} style={s.hero}>
      {compactSummary ? <View style={[s.summary, s.compactSummary, { paddingVertical: heroPadding }]}>
        <View style={s.compactMetric}>
          <Text style={[s.number, { fontSize: numberSize, lineHeight: numberSize * t.home.numberLineHeight }]} maxFontSizeMultiplier={1}
            adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.5} accessibilityLabel={`${target} steps`}>
            {target.toLocaleString()}
          </Text>
          <Text style={s.compactLabel} maxFontSizeMultiplier={1.3}>steps</Text>
        </View>
        <View style={s.compactEstimate}>
          <Text style={s.compactLabel} maxFontSizeMultiplier={1.3}>Est. time</Text>
          <Text style={s.estimateValue} maxFontSizeMultiplier={1.3}>{duration(walkDuration(target))}</Text>
        </View>
        {goal.selected === 'custom' && <IconControl name="edit" label="Edit custom steps" onPress={() => setDialog('custom')} />}
      </View> : <View style={[s.summary, { paddingVertical: heroPadding, gap: heroGap }]}>
        <View style={s.heroLabel}>
          <Text style={s.label} maxFontSizeMultiplier={1.3}>{session ? `Simulated · ${target.toLocaleString()} step goal` : goal.selected === 'custom' ? 'Custom step goal' : 'Step goal'}</Text>
          {!session && goal.selected === 'custom' && <View style={s.edit}><IconControl name="edit" label="Edit custom steps" onPress={() => setDialog('custom')} /></View>}
        </View>
        <Text style={[s.number, { fontSize: numberSize, lineHeight: numberSize * t.home.numberLineHeight }]} maxFontSizeMultiplier={1}
          adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.5}
          accessibilityLabel={`${session ? generated : target} ${session ? `simulated steps of ${target}` : 'steps'}`}>
          {(session ? generated : target).toLocaleString()}
        </Text>
        <Text style={s.unit} maxFontSizeMultiplier={1.3}>{session ? 'simulated steps' : 'steps'}</Text>
        <Text style={s.duration} maxFontSizeMultiplier={1.3}>{session ? publishing ? 'Saving…' : waiting ? 'Waiting to save' : `${duration(remaining)} remaining` : `Estimated time: ${duration(walkDuration(target))}`}</Text>
        {session && <View style={s.track} accessible accessibilityRole="progressbar"
          accessibilityLabel="Simulated walk progress" accessibilityValue={{ min: 0, max: target, now: generated }}>
          <View style={[s.fill, { width: `${generated / target * 100}%` }]} />
        </View>}
      </View>}
      </View>

      {!session && <View style={s.goals}>
        <View style={s.goalHeading}>
          <Text style={s.sectionTitle}>Choose your steps</Text>
          <Text style={s.goalHint}>{`Custom goal: ${stepRange} steps.`}</Text>
        </View>
        <View style={s.grid}>
        {([...PRESET_GOALS.map((steps) => String(steps) as GoalChoice), 'custom'] as GoalChoice[]).map((choice) => {
          const selected = goal.selected === choice;
          const custom = choice === 'custom';
          const label = custom ? goal.customSteps?.toLocaleString() ?? 'Custom' : Number(choice).toLocaleString();
          const GoalButton = selected ? FilledGoal : OutlinedGoal;
          return <Host key={choice} colorScheme="dark" seedColor={t.colors.accent} matchContents={{ vertical: true }} style={{ width: tileWidth }}>
            <GoalButton onClick={() => select(choice)} enabled={!walk.busy}
              contentPadding={{ start: t.spacing.sm, end: t.spacing.sm, top: t.spacing.xs, bottom: t.spacing.xs }}
              modifiers={[fillMaxWidth(), defaultMinSize({ minHeight: compact ? t.touch : t.home.goalHeight }), semantics({ contentDescription: `${custom ? 'Custom goal' : 'Goal'}, ${label}${selected ? ', selected' : ''}` })]}
              >
              <Column alignment="center" spacing={t.spacing.xs}>
                <NativeText textStyle={{ color: selected ? t.colors.onAccent : t.colors.text, fontSize: optionFont, fontWeight: '600' }}>{label}</NativeText>
                {custom && goal.customSteps !== null && <NativeText textStyle={{ color: selected ? t.colors.onAccent : t.colors.muted, fontSize: t.type.caption * Math.min(fontScale, 1.3) / fontScale }}>Custom</NativeText>}
              </Column>
            </GoalButton>
          </Host>;
        })}
        </View>
      </View>}

      <View style={s.bottom}>
        {walk.error && <View style={s.feedback} accessibilityLiveRegion="polite">
          {walk.error && <Pressable accessibilityRole="button" onPress={() => setDialog('error')} style={s.feedbackAction}><Text style={s.error}>Something went wrong · Details</Text></Pressable>}
        </View>}
        <ActionButton label={session ? publishing ? 'Saving — please wait' : 'Cancel walk' : 'Start a walk'}
          variant={session ? 'outlined' : 'filled'} disabled={walk.busy || publishing}
          onPress={() => { if (session) cancel(); else { setEstimatedFinish(Date.now() + walkDuration(goal.target)); setDialog('start'); } }} />
      </View>
    </View>

    {walk.gate === 'ready' && !walk.result && dialog === 'custom' && <CustomGoalDialog initial={goal.customSteps ?? goal.target} onSave={goal.saveCustom} onDismiss={() => setDialog(null)} />}
    {walk.gate === 'ready' && !walk.result && dialog === 'start' && <WalkDialog title="Start this walk?" confirmLabel={walk.busy ? 'Starting…' : 'Start walk'} busy={walk.busy}
      onDismiss={() => setDialog(null)} onConfirm={() => { void walk.act(() => FakeWalk.startWalk(goal.target)).then((success) => { if (success) setDialog(null); }); }}>
      <NativeText textStyle={{ color: t.colors.accent, fontSize: t.type.title, fontWeight: '600' }}>{`${goal.target.toLocaleString()} steps`}</NativeText>
      <NativeText textStyle={{ color: t.colors.muted, fontSize: t.type.body }}>{`${duration(walkDuration(goal.target))} · Finish around ${finishTime(estimatedFinish)}`}</NativeText>
      <NativeText textStyle={{ color: t.colors.text, fontSize: t.type.body }}>You can close the app. Steps are saved when the walk completes.</NativeText>
      {walk.error && <NativeText textStyle={{ color: t.colors.danger, fontSize: t.type.body }}>{walk.error}</NativeText>}
    </WalkDialog>}
    {walk.gate === 'ready' && !walk.result && dialog === 'error' && <WalkDialog title="Couldn’t complete that action" confirmLabel="Retry refresh" dismissLabel="Close"
      onDismiss={() => { walk.dismissError(); setDialog(null); }} onConfirm={() => { walk.dismissError(); setDialog(null); void walk.refresh(); }}>
      <NativeText textStyle={{ color: t.colors.text, fontSize: t.type.body }}>{walk.error ?? ''}</NativeText>
    </WalkDialog>}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.colors.background, experimental_backgroundImage: t.gradients.hero },
  content: { flex: 1, width: '100%', alignSelf: 'center', paddingBottom: t.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.touch },
  brand: { color: t.colors.accent, fontSize: t.type.caption, fontWeight: '700', letterSpacing: 1.5 },
  intro: { gap: t.spacing.sm },
  introTitle: { color: t.colors.text, fontWeight: '600' },
  guidance: { color: t.colors.muted, lineHeight: t.spacing.lg },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summary: { width: '100%', alignItems: 'center', backgroundColor: t.colors.goalSurface, borderWidth: 1, borderColor: t.colors.line, borderRadius: t.radius.lg, paddingHorizontal: t.spacing.md },
  compactSummary: { flexDirection: 'row', gap: t.spacing.sm },
  compactMetric: { flex: 1, minWidth: 0, alignItems: 'center', gap: t.spacing.xs },
  compactEstimate: { flex: 1, minWidth: 0, gap: t.spacing.xs },
  compactLabel: { color: t.colors.muted, fontSize: t.type.caption },
  estimateValue: { color: t.colors.accent, fontSize: t.type.body, fontWeight: '600' },
  heroLabel: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: t.touch },
  edit: { position: 'absolute', right: 0 },
  label: { color: t.colors.muted, fontSize: t.type.caption },
  number: { color: t.colors.text, fontWeight: '600', fontVariant: ['tabular-nums'], textAlign: 'center', width: '100%' },
  unit: { color: t.colors.muted, fontSize: t.type.body, textAlign: 'center' },
  duration: { color: t.colors.accent, fontSize: t.type.body, textAlign: 'center', marginTop: t.spacing.md },
  goals: { gap: t.spacing.md },
  goalHeading: { gap: t.spacing.xs },
  sectionTitle: { color: t.colors.text, fontSize: t.type.body, fontWeight: '600' },
  goalHint: { color: t.colors.muted, fontSize: t.type.caption },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  bottom: { gap: t.spacing.sm },
  feedback: { justifyContent: 'center', alignItems: 'center' },
  feedbackAction: { minHeight: t.touch, justifyContent: 'center' },
  error: { color: t.colors.danger, fontSize: t.type.caption, textAlign: 'center' },
  track: { height: t.spacing.sm, width: '90%', marginTop: t.spacing.md, backgroundColor: t.colors.line, borderRadius: t.radius.full, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: t.colors.accent },
});
