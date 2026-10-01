import { Button, Host } from '@expo/ui';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import FakeWalk from '../../modules/fake-walk';
import { theme as t } from '../theme';
import { useWalk } from '../walk/use-walk';

export default function History() {
  const walk = useWalk();
  return <ScrollView contentContainerStyle={s.content}>
    <Text style={s.body}>Your latest 30 walks. Only saved walks add steps to Health Connect.</Text>
    {walk.error && <Text style={s.error}>{walk.error}</Text>}
    {!walk.overview ? <Text style={s.body}>Loading your walks…</Text>
      : walk.overview.history.length === 0 ? <Text style={s.title}>Your first walk is waiting.</Text>
      : walk.overview.history.map((session) => <View key={session.id} style={s.item}>
        <Text style={s.title}>{session.steps.toLocaleString()} steps</Text>
        <Text style={s.body}>{new Date(session.startedAt).toLocaleString()}</Text>
        <Text style={[s.status, session.status === 'failed' && s.error]}>{session.status === 'completed' ? 'Saved to Health Connect' : session.status === 'cancelled' ? 'Cancelled · No steps saved' : 'Not saved'}</Text>
        {session.errorMessage && <Text style={s.body}>{session.errorMessage}</Text>}
        {session.status === 'completed' && session.notification !== 'sent' && <Text style={s.body}>Completion reminder was unavailable.</Text>}
        {session.status === 'failed' && <Host colorScheme="dark" seedColor={t.colors.accent} matchContents>
          <Button label={walk.overview?.active ? 'Finish your current walk first' : 'Retry saving'} variant="outlined"
            disabled={walk.busy || !!walk.overview?.active || !walk.permissions?.stepsGranted || !walk.permissions?.notificationsGranted}
            onPress={() => { void walk.act(() => FakeWalk.retrySave(session.id)); }} />
        </Host>}
      </View>)}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: t.spacing.lg, gap: t.spacing.lg, paddingBottom: t.spacing.xxl },
  title: { color: t.colors.text, fontSize: t.type.heading, fontWeight: '600' },
  body: { color: t.colors.muted, fontSize: t.type.body, lineHeight: 24 },
  status: { color: t.colors.accent, fontSize: t.type.body },
  error: { color: t.colors.danger, fontSize: t.type.body },
  item: { gap: t.spacing.sm, borderBottomWidth: 1, borderBottomColor: t.colors.line, paddingBottom: t.spacing.lg },
});
