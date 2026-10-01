import { Button, Host, Text as NativeText } from '@expo/ui';
import { Icon, IconButton } from '@expo/ui/jetpack-compose';
import { defaultMinSize, fillMaxWidth, semantics, size } from '@expo/ui/jetpack-compose/modifiers';
import type { ImageSourcePropType } from 'react-native';
import { theme as t } from '../theme';

export const icons = {
  history: require('../../assets/icons/history.xml') as ImageSourcePropType,
  edit: require('../../assets/icons/edit.xml') as ImageSourcePropType,
  walk: require('../../assets/icons/walk.xml') as ImageSourcePropType,
  check: require('../../assets/icons/check.xml') as ImageSourcePropType,
  close: require('../../assets/icons/close.xml') as ImageSourcePropType,
};

export function IconControl({ name, label, onPress, disabled = false }: {
  name: keyof typeof icons; label: string; onPress: () => void; disabled?: boolean;
}) {
  return <Host colorScheme="dark" seedColor={t.colors.accent} style={{ width: t.touch, height: t.touch }}>
    <IconButton enabled={!disabled} onClick={onPress} modifiers={[size(t.touch, t.touch), semantics({ contentDescription: label })]}>
      <Icon source={icons[name]} size={24} tint={t.colors.accent} />
    </IconButton>
  </Host>;
}

export function ActionButton({ label, onPress, disabled = false, variant = 'filled' }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
}) {
  return <Host colorScheme="dark" seedColor={t.colors.accent} matchContents={{ vertical: true }} style={{ width: '100%' }}>
    <Button disabled={disabled} variant={variant} onPress={onPress} modifiers={[fillMaxWidth(), defaultMinSize({ minHeight: t.touch })]}
      style={{ paddingVertical: t.spacing.xs }}>
      <NativeText textStyle={{ fontSize: t.type.body, fontWeight: '600', color: variant === 'filled' ? t.colors.onAccent : t.colors.accent }}>{label}</NativeText>
    </Button>
  </Host>;
}
