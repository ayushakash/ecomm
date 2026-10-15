import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, Button, Input } from '../../../components/ui';
import { spacing } from '../../../theme';
import { toast } from '../../../utils/toast';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Resolves once the PDF is shared; the sheet resets on success. */
  onSubmit: (lead: { name: string; phone: string }) => Promise<void>;
  /** Prefill (logged-in user's name / phone) applied each time the sheet opens. */
  defaultName?: string;
  defaultPhone?: string;
}

/** Lead capture before the estimate download (web "Download Your Estimate" modal). */
export function LeadSheet({ visible, onClose, onSubmit, defaultName = '', defaultPhone = '' }: Props) {
  const { t } = useTranslation('calculator');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName((current) => current || defaultName);
    setPhone((current) => current || defaultPhone.replace(/\D/g, '').slice(-10));
  }, [visible, defaultName, defaultPhone]);

  const close = () => {
    setName('');
    setPhone('');
    onClose();
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !phone) {
      toast.error(t('lead.nameAndPhoneRequired'));
      return;
    }
    if (phone.length < 10) {
      toast.error(t('lead.invalidPhone'));
      return;
    }
    setBusy(true);
    try {
      await onSubmit({ name: trimmed, phone });
      setName('');
      setPhone('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      title={t('lead.title')}
      subtitle={t('lead.subtitle')}
      footer={
        <View style={styles.footer}>
          <Button title={t('lead.cancel')} variant="outline" onPress={close} style={styles.flex} disabled={busy} />
          <Button title={t('lead.download')} variant="success" leftIcon="download-outline" onPress={submit} loading={busy} style={styles.flex} />
        </View>
      }
    >
      <View style={styles.form}>
        <Input
          label={t('lead.nameLabel')}
          value={name}
          onChangeText={setName}
          placeholder={t('lead.namePlaceholder')}
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />
        <Input
          label={t('lead.phoneLabel')}
          prefix="+91"
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
          placeholder={t('lead.phonePlaceholder')}
          keyboardType="number-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={10}
          onSubmitEditing={submit}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg, paddingBottom: spacing.md },
  footer: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
