import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from '../../../components/ui';
import { colors, palette, radii, SCREEN_PADDING, shadows, spacing } from '../../../theme';

const TRUST = [
  { value: '25+', label: 'Years in\nbusiness', color: colors.text },
  { value: 'On-time', label: 'Own-fleet\ndelivery', color: palette.emerald600 },
  { value: '100%', label: 'Genuine\nbrands', color: colors.text },
] as const;

/** Web Home trust strip under the hero. */
export function TrustStrip() {
  return (
    <View style={styles.trust}>
      {TRUST.map((t) => (
        <View key={t.value} style={styles.trustTile}>
          <Text variant="h3" weight="extrabold" style={{ color: t.color }}>
            {t.value}
          </Text>
          <Text variant="micro" color="textSecondary" align="center">
            {t.label}
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
  return (
    <View style={styles.promos}>
      <Pressable
        onPress={onCalculator}
        accessibilityRole="button"
        accessibilityLabel="Open material calculator"
        style={({ pressed }) => [styles.calcCard, pressed && styles.pressed]}
      >
        <View style={styles.calcIcon}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={26} color={colors.brand} />
        </View>
        <View style={styles.flex}>
          <Text variant="title" weight="extrabold">
            Material calculator
          </Text>
          <Text variant="caption" color="textSecondary">
            Estimate cement, sand, bricks & steel for your project — then add it all to cart.
          </Text>
        </View>
        <Icon name="chevron-forward" size={18} color="textMuted" />
      </Pressable>

      <LinearGradient colors={[palette.slate800, palette.slate700]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bulkCard}>
        <View style={styles.bulkHead}>
          <MaterialCommunityIcons name="truck-delivery-outline" size={26} color={colors.secondary} />
          <View style={styles.flex}>
            <Text variant="title" weight="extrabold" color="textInverse">
              Bulk order? Get best rates
            </Text>
            <Text variant="caption" style={styles.bulkSub}>
              Site-wise pricing for builders & contractors
            </Text>
          </View>
        </View>
        <View style={styles.bulkActions}>
          <Button title="WhatsApp" variant="whatsapp" size="sm" leftIcon="logo-whatsapp" onPress={onWhatsApp} style={styles.flex} />
          <Button title="Call to order" variant="secondary" size="sm" leftIcon="call" onPress={onCall} style={styles.flex} />
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
  return (
    <LinearGradient colors={[palette.slate600, palette.slate800]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.selectBanner}>
      <View style={styles.selectHead}>
        <View style={styles.selectIcon}>
          <Icon name="location" size={22} color="textInverse" />
        </View>
        <View style={styles.flex}>
          <Text variant="title" weight="bold" color="textInverse">
            Select your delivery location
          </Text>
          <Text variant="caption" style={styles.bulkSub}>
            Add an address to see products available in your area
          </Text>
        </View>
      </View>
      <View style={styles.bulkActions}>
        <Button
          title={detecting ? 'Detecting...' : 'Use current location'}
          variant="outline"
          size="sm"
          leftIcon="locate"
          loading={detecting}
          onPress={onDetect}
          style={styles.flex}
        />
        <Button title="Add address" variant="secondary" size="sm" onPress={onAddAddress} style={styles.flex} />
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
  return (
    <View style={styles.warn}>
      <Icon name="location" size={22} color="secondaryDark" />
      <View style={styles.flex}>
        <Text variant="label" weight="bold">
          No merchants available in {place}
        </Text>
        <Text variant="caption" color="textSecondary">
          Try selecting a different delivery address or check back later
        </Text>
      </View>
      <Button title={canSwitch ? 'Change' : 'Add new'} variant="secondary" size="sm" onPress={onPress} />
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
