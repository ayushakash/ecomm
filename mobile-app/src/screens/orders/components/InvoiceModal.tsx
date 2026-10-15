import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Button, ScreenHeader, Text } from '../../../components/ui';
import { colors, SCREEN_PADDING, spacing } from '../../../theme';
import type { Order } from '../../../types/models';
import { toast } from '../../../utils/toast';
import { buildInvoiceHtml } from './invoiceHtml';

export interface InvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  order: Order;
}

/** GST invoice preview (GSTInvoicePreview.js) with Print and Share-as-PDF via expo-print / expo-sharing. */
export function InvoiceModal({ visible, onClose, order }: InvoiceModalProps) {
  const { t } = useTranslation('orders');
  const insets = useSafeAreaInsets();
  const html = useMemo(() => (visible ? buildInvoiceHtml(order) : ''), [visible, order]);
  const [busy, setBusy] = useState<'print' | 'share' | null>(null);

  const print = async () => {
    setBusy('print');
    try {
      await Print.printAsync({ html });
    } catch {
      toast.error(t('invoice.printError'));
    } finally {
      setBusy(null);
    }
  };

  const share = async () => {
    setBusy('share');
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (!(await Sharing.isAvailableAsync())) {
        toast.error(t('invoice.shareUnavailable'));
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: t('invoice.dialogTitle', { number: order.orderNumber }),
      });
    } catch {
      toast.error(t('invoice.pdfError'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <ScreenHeader
          compact
          title={t('invoice.title')}
          subtitle={`#${order.orderNumber}`}
          back={onClose}
          backIcon="close"
          safeTop={Platform.OS !== 'ios'}
        />
        {Platform.OS === 'web' ? (
          <View style={styles.center}>
            <Text color="textSecondary" align="center">
              {t('invoice.webNotice')}
            </Text>
          </View>
        ) : (
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={styles.web}
            startInLoadingState
            renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
          />
        )}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Button
            title={t('invoice.print')}
            variant="outline"
            leftIcon="print-outline"
            onPress={print}
            loading={busy === 'print'}
            disabled={busy !== null}
            style={styles.flex}
          />
          <Button
            title={t('invoice.share')}
            variant="primary"
            leftIcon="share-outline"
            onPress={share}
            loading={busy === 'share'}
            disabled={busy !== null || Platform.OS === 'web'}
            style={styles.flex}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  web: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SCREEN_PADDING },
  flex: { flex: 1 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
