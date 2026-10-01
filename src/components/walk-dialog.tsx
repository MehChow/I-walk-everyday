import { Button, Column, Host, ScrollView, Text as NativeText } from '@expo/ui';
import { AlertDialog } from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactNode } from 'react';
import { theme as t } from '../theme';

export function WalkDialog({ title, children, icon, confirmLabel, onConfirm, onDismiss, onSecondary, busy = false, disabled = false, dismissLabel = 'Cancel', confirmVariant = 'text' }: {
  title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void;
  icon?: ReactNode;
  onDismiss: () => void; busy?: boolean; disabled?: boolean; dismissLabel?: string;
  onSecondary?: () => void; confirmVariant?: 'text' | 'filled';
}) {
  return <Host colorScheme="dark" seedColor={t.colors.accent} matchContents>
    <AlertDialog colors={{ containerColor: t.colors.surface, titleContentColor: t.colors.text, textContentColor: t.colors.muted }}
      onDismissRequest={() => { if (!busy) onDismiss(); }} properties={{ dismissOnBackPress: !busy, dismissOnClickOutside: !busy }}>
      {icon && <AlertDialog.Icon>{icon}</AlertDialog.Icon>}
      <AlertDialog.Title><NativeText textStyle={{ fontSize: t.type.heading, fontWeight: '600', color: t.colors.text, textAlign: icon ? 'center' : 'left' }}>{title}</NativeText></AlertDialog.Title>
      <AlertDialog.Text>
        <ScrollView>
          <Column spacing={t.spacing.md} modifiers={[fillMaxWidth()]}>{children}</Column>
        </ScrollView>
      </AlertDialog.Text>
      <AlertDialog.ConfirmButton><Button label={confirmLabel} disabled={busy || disabled} variant={confirmVariant} onPress={onConfirm} modifiers={[defaultMinSize({ minHeight: t.touch, minWidth: t.layout.dialogActionMinWidth })]} /></AlertDialog.ConfirmButton>
      <AlertDialog.DismissButton><Button label={dismissLabel} disabled={busy} variant="text" onPress={onSecondary ?? onDismiss} modifiers={[defaultMinSize({ minHeight: t.touch })]} /></AlertDialog.DismissButton>
    </AlertDialog>
  </Host>;
}
