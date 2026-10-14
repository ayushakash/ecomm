import React, { useEffect, useState } from 'react';
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
      toast.error('Please enter your name and phone number');
      return;
    }
    if (phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
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
      title="Download your estimate"
      subtitle="Enter your details to get the PDF report"
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="outline" onPress={close} style={styles.flex} disabled={busy} />
          <Button title="Download" variant="success" leftIcon="download-outline" onPress={submit} loading={busy} style={styles.flex} />
        </View>
      }
    >
      <View style={styles.form}>
        <Input
          label="Your name *"
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          autoFocus
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
        />
        <Input
          label="Phone number *"
          prefix="+91"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
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
