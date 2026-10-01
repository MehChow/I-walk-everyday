import { Column, Row, Text as NativeText } from '@expo/ui';
import { Icon } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, weight } from '@expo/ui/jetpack-compose/modifiers';
import { icons } from './native-controls';
import { WalkDialog } from './walk-dialog';
import { theme as t } from '../theme';
import { timeUsed } from '../walk/format';
import type { WalkResult } from '../walk/walk-result';

export function WalkResultDialog({ result, onDone, onHistory }: {
  result: WalkResult; onDone: () => void; onHistory: () => void;
}) {
  const saved = result.status === 'completed';
  const color = saved ? t.colors.accent : t.colors.danger;
  return <WalkDialog title={saved ? 'Walk complete' : 'Couldn’t save yet'} confirmLabel="Done" confirmVariant="filled"
    icon={<Icon source={saved ? icons.check : icons.close} size={t.result.icon} tint={color} />}
    dismissLabel="View history" onConfirm={onDone} onDismiss={onDone} onSecondary={onHistory}>
    <Column alignment="center" spacing={t.spacing.xs} modifiers={[fillMaxWidth()]}>
      <NativeText textStyle={{ color: t.colors.text, fontSize: t.result.number, fontWeight: '600', textAlign: 'center' }}>{result.steps.toLocaleString()}</NativeText>
      <NativeText textStyle={{ color, fontSize: t.type.body }}>{saved ? 'steps saved' : 'step goal'}</NativeText>
    </Column>
    <NativeText modifiers={[fillMaxWidth()]} textStyle={{ color: t.colors.muted, fontSize: t.type.body, lineHeight: t.spacing.lg, textAlign: 'center' }}>{saved
      ? 'Saved to Health Connect.'
      : 'No steps were saved. You can retry from History.'}</NativeText>
    <Row spacing={t.spacing.md} modifiers={[fillMaxWidth()]}
      style={{ backgroundColor: saved ? t.colors.accentBackground : t.colors.dangerBackground, borderRadius: t.radius.md, padding: t.spacing.md }}>
      <Column spacing={t.spacing.xs} modifiers={[weight(1)]}>
        <NativeText textStyle={{ color: t.colors.muted, fontSize: t.type.caption }}>Time used</NativeText>
        <NativeText textStyle={{ color: t.colors.text, fontSize: t.type.body, fontWeight: '600' }}>{timeUsed(result.elapsedMs)}</NativeText>
      </Column>
      <Column alignment="end" spacing={t.spacing.xs} modifiers={[weight(1)]}>
        <NativeText textStyle={{ color: t.colors.muted, fontSize: t.type.caption }}>Status</NativeText>
        <NativeText textStyle={{ color, fontSize: t.type.body, fontWeight: '600' }}>{saved ? 'Saved' : 'Not saved'}</NativeText>
      </Column>
    </Row>
  </WalkDialog>;
}
