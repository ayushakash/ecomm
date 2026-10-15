import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Icon, Input, Text } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { colors, radii, spacing } from '../../../theme';
import { toast } from '../../../utils/toast';

const CONFIRM_WORD = 'DELETE';

/** Keys under account:delete.items. */
const WHAT_IS_DELETED = ['profile', 'addresses', 'reviews'] as const;

/** Permanent account deletion (Google Play requirement). Mirrors web /delete-account. */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation('account');
  const { deleteAccount } = useAuth();
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setTyped('');
      setError(null);
    }
  }, [visible]);

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    const res = await deleteAccount();
    setDeleting(false);
    if (res.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onClose();
      toast.success(t('delete.success'), t('delete.successSub'));
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(res.error);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('menu.deleteAccount')}
      subtitle={t('delete.subtitle')}
      footer={
        <Button
          title={t('delete.button')}
          variant="danger"
          leftIcon="trash-outline"
          fullWidth
          loading={deleting}
          disabled={typed.trim().toUpperCase() !== CONFIRM_WORD}
          onPress={confirm}
        />
      }
    >
      <View style={styles.body}>
        <View style={styles.warning}>
          <Icon name="warning-outline" size={20} color="danger" />
          <Text variant="bodySm" color="danger" weight="semibold" style={styles.flex}>
            {t('delete.warning')}
          </Text>
        </View>

        <Text variant="title">{t('delete.whatTitle')}</Text>
        {WHAT_IS_DELETED.map((line) => (
          <View key={line} style={styles.row}>
            <Icon name="close-circle-outline" size={18} color="textSecondary" />
            <Text variant="bodySm" color="textSecondary" style={styles.flex}>
              {t(`delete.items.${line}`)}
            </Text>
          </View>
        ))}
        <View style={styles.row}>
          <Icon name="document-text-outline" size={18} color="textSecondary" />
          <Text variant="bodySm" color="textSecondary" style={styles.flex}>
            {t('delete.invoicesKept')}
          </Text>
        </View>

        <Input
          label={t('delete.typeToConfirm', { word: CONFIRM_WORD })}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRM_WORD}
        />

        {!!error && (
          <View style={styles.error}>
            <Icon name="alert-circle-outline" size={18} color="danger" />
            <Text variant="bodySm" color="danger" style={styles.flex}>
              {error}
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { gap: spacing.md },
  warning: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#FEF2F2',
    alignItems: 'flex-start',
  },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  error: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'flex-start',
  },
});
