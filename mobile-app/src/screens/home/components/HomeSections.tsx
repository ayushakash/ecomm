import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from '../../../components/ui';
import { colors, palette, radii, SCREEN_PADDING, shadows, spacing } from '../../../theme';
import { useTranslation } from 'react-i18next';


/** home:trust.<key> value + <key>Label, translated at render. */
const TRUST = [
  { key: 'years', color: colors.text },
  { key: 'onTime', color: palette.emerald600 },
  { key: 'genuine', color: colors.text },
] as const;

/** Web Home trust strip under the hero. */
export function TrustStrip() {
  const { t } = useTranslation('home');
  return (
    <View style={styles.trust}>
      {TRUST.map((item) => (
        <View key={item.key} style={styles.trustTile}>
          <Text variant="h3" weight="extrabold" style={{ color: item.color }}>
            {t(`trust.${item.key}`)}
          </Text>
          <Text variant="micro" color="textSecondary" align="center">
            {t(`trust.${item.key}Label`)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export interface PromoRowProps {
  onCalculator: () => void;
  onWhatsApp: () => void;
  onCall: () => void;
}

/** Calculator entry card + bulk-order WhatsApp / call CTA (web floating "Bulk Order" button). */
export function PromoRow({ onCalculator, onWhatsApp, onCall }: PromoRowProps) {
  const { t } = useTranslation('home');
  return (
    <View style={styles.promos}>
      <Pressable
        onPress={onCalculator}
        accessibilityRole="button"
        accessibilityLabel={t('promo.calcA11y')}
        style={({ pressed }) => [styles.calcCard, pressed && styles.pressed]}
      >
        <View style={styles.calcIcon}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={26} color={colors.brand} />
        </View>
        <View style={styles.flex}>
          <Text variant="title" weight="extrabold">
            {t('promo.calcTitle')}
          </Text>
          <Text variant="caption" color="textSecondary">
            {t('promo.calcBody')}
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color="textMuted" />
      </Pressable>

      <LinearGradient colors={[palette.slate800, palette.slate700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bulkCard}>
        <View style={styles.bulkHead}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={26} color={colors.secondary} />
          <View style={styles.flex}>
            <Text variant="title" weight="extrabold" color="textInverse">
              {t('promo.bulkTitle')}
            </Text>
            <Text variant="caption" style={styles.bulkSub}>
              {t('promo.bulkBody')}
            </Text>
          </View>
        </View>
        <View style={styles.bulkActions}>
          <Button title="WhatsApp" variant="whatsapp" size="sm" leftIcon="logo-whatsapp" onPress={onWhatsApp} style={styles.flex} />
          <Button title={t('promo.callToOrder')} variant="secondary" size="sm" leftIcon="call" onPress={onCall} style={styles.flex} />
        </View>
      </LinearGradient>
    </View>
  );
}

export interface SelectLocationBannerProps {
  detecting: boolean;
  onDetect: () => void;
  onAddAddress: () => void;
}

/** Logged-in user with neither an address nor a city (web Home "Select Your Delivery Location"). */
export function SelectLocationBanner({ detecting, onDetect, onAddAddress }: SelectLocationBannerProps) {
  const { t } = useTranslation('home');
  return (
    <LinearGradient colors={[palette.slate600, palette.slate800]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.selectBanner}>
      <View style={styles.selectHead}>
        <View style={styles.selectIcon}>
          <Icon name="location" size={22} color="textInverse" />
        </View>
        <View style={styles.flex}>
          <Text variant="title" weight="bold" color="textInverse">
            {t('selectBanner.title')}
          </Text>
          <Text variant="caption" style={styles.bulkSub}>
            {t('selectBanner.body')}
          </Text>
        </View>
      </View>
      <View style={styles.bulkActions}>
        <Button
          title={detecting ? t('selectBanner.detecting') : t('selectBanner.useCurrent')}
          variant="outline"
          size="sm"
          leftIcon="locate"
          loading={detecting}
          onPress={onDetect}
          style={styles.flex}
        />
        <Button title={t('selectBanner.addAddress')} variant="secondary" size="sm" onPress={onAddAddress} style={styles.flex} />
      </View>
    </LinearGradient>
  );
}

export interface NoMerchantsBannerProps {
  place: string;
  canSwitch: boolean;
  onPress: () => void;
}

/** Selected address has no serving merchants (web Home yellow notice). */
export function NoMerchantsBanner({ place, canSwitch, onPress }: NoMerchantsBannerProps) {
  const { t } = useTranslation('home');
  return (
    <View style={styles.warn}>
      <Icon name="location" size={22} color="secondaryDark" />
      <View style={styles.flex}>
        <Text variant="label" weight="bold">
          {t('noMerchants.title', { place })}
        </Text>
        <Text variant="caption" color="textSecondary">
          {t('noMerchants.body')}
        </Text>
      </View>
      <Button title={canSwitch ? t('common:actions.change') : t('noMerchants.addNew')} variant="secondary" size="sm" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.85 },
  trust: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: SCREEN_PADDING },
  trustTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
  },
  promos: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md },
  calcCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  calcIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulkCard: { borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  bulkHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bulkSub: { color: 'rgba(255,255,255,0.72)' },
  bulkActions: { flexDirection: 'row', gap: spacing.sm },
  selectBanner: { marginHorizontal: SCREEN_PADDING, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md },
  selectHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selectIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: {
    marginHorizontal: SCREEN_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.amber200,
  },
});
