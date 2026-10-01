import { Host } from '@expo/ui';
import { Icon } from '@expo/ui/jetpack-compose';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import FakeWalk from '../../modules/fake-walk';
import { theme as t } from '../theme';
import { useWalk } from '../walk/use-walk';
import { ActionButton, icons } from '../components/native-controls';

export default function History() {
  const walk = useWalk();
  return <ScrollView contentContainerStyle={s.content}>
    <Text style={s.body}>Your recent walks, all in one place. Saved walks add steps to Health Connect.</Text>
    {walk.error && <Text style={s.error}>{walk.error}</Text>}
    {!walk.overview ? <Text style={s.body}>Loading your walks…</Text>
      : walk.overview.history.length === 0 ? <Text style={s.title}>Your first walk is waiting.</Text>
      : walk.overview.history.map((session) => {
        const saved = session.status === 'completed';
        const cancelled = session.status === 'cancelled';
        const tint = saved ? t.colors.accent : t.colors.danger;
        const background = saved ? t.colors.accentBackground : t.colors.dangerBackground;
        return <View key={session.id} style={s.item}>
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={[s.title, s.steps]}>{session.steps.toLocaleString()} steps</Text>
            <Text style={s.date}>{new Date(session.startedAt).toLocaleString([], { hourCycle: 'h23' })}</Text>
          </View>
          <View style={[s.indicator, { backgroundColor: background }]} accessible accessibilityRole="image" accessibilityLabel={saved ? 'Saved' : cancelled ? 'Cancelled' : 'Failed to save'}>
            <Host colorScheme="dark" seedColor={t.colors.accent} style={{ width: t.spacing.lg, height: t.spacing.lg }}>
              <Icon source={saved ? icons.check : icons.close} size={t.spacing.lg} tint={tint} />
            </Host>
          </View>
        </View>
        {session.status === 'failed' &&
          <ActionButton label={walk.overview?.active ? 'Finish your current walk first' : 'Retry saving'} variant="outlined"
            disabled={walk.busy || !!walk.overview?.active || !walk.permissions?.stepsGranted || !walk.permissions?.notificationsGranted}
            onPress={() => { void walk.act(() => FakeWalk.retrySave(session.id)); }} />
        }
      </View>;
      })}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { width: '100%', maxWidth: t.layout.maxWidth + t.spacing.md * 2, alignSelf: 'center', padding: t.spacing.md, gap: t.spacing.md, paddingBottom: t.spacing.xxl },
  title: { color: t.colors.text, fontSize: t.type.heading, fontWeight: '600' },
  steps: { color: t.colors.accent },
  body: { color: t.colors.muted, fontSize: t.type.body, lineHeight: 24 },
  date: { color: t.colors.muted, fontSize: t.type.caption },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  summary: { flex: 1, gap: t.spacing.xs },
  indicator: { width: t.spacing.xxl, height: t.spacing.xxl, borderRadius: t.radius.full, alignItems: 'center', justifyContent: 'center' },
  error: { color: t.colors.danger, fontSize: t.type.body },
  item: { gap: t.spacing.sm, borderWidth: 1, borderColor: t.colors.line, backgroundColor: t.colors.surface, padding: t.spacing.md, borderRadius: t.radius.md },
});
