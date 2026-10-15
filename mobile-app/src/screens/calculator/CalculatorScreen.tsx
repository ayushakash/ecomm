import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { TFunction } from 'i18next';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, Chip, Input, QuantityStepper, Screen, ScreenHeader, Text } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAvailableCities, useCityPrices } from '../../hooks/queries';
import type { RootStackScreenProps } from '../../navigation/types';
import { calculatorLeadAPI, getErrorMessage } from '../../services/api';
import { colors, radii, SCREEN_PADDING, spacing } from '../../theme';
import { areSameCities } from '../../utils/cityName';
import { toast } from '../../utils/toast';
import {
  calculateMaterials,
  DEFAULT_PRICES,
  fallbackMaterials,
  formatNumber,
  formatRupees,
  pricesFromCityData,
  type CalculationResult,
  type FoundationMaterials,
  type MaterialPrices,
} from './calculatorMath';
import { CityPickerSheet } from './components/CityPickerSheet';
import { LayoutGrid } from './components/LayoutGrid';
import { LeadSheet } from './components/LeadSheet';
import { MaterialSection, type MaterialRow } from './components/MaterialSection';
import { shareEstimatePdf } from './estimatePdf';
import { useOrderMaterials } from './useOrderMaterials';

type PricingMode = 'market' | 'custom';
type PriceKey = keyof MaterialPrices;
type PriceText = Record<PriceKey, string>;

const toPriceText = (p: MaterialPrices): PriceText => ({
  priceCement: String(p.priceCement),
  priceSteel: String(p.priceSteel),
  priceSand: String(p.priceSand),
  priceAgg: String(p.priceAgg),
  priceBricks: String(p.priceBricks),
});

const PRICE_FIELDS: { key: PriceKey; material: string; unit: string; wide?: boolean }[] = [
  { key: 'priceCement', material: 'cement', unit: 'bag' },
  { key: 'priceSteel', material: 'steel', unit: 'kg' },
  { key: 'priceSand', material: 'sand', unit: 'cu.ft' },
  { key: 'priceAgg', material: 'aggregate', unit: 'cu.ft' },
  { key: 'priceBricks', material: 'bricks', unit: '1000 nos', wide: true },
];

/** Rows shared by the structure and foundation sections (bricks only in structure). */
function materialRows(
  m: FoundationMaterials & { bricks?: CalculationResult['bricks'] },
  detailed: boolean,
  t: TFunction<'calculator'>,
): MaterialRow[] {
  const rows: MaterialRow[] = [
    { key: 'cement', name: t('materials.cement'), icon: 'sack', line: m.cement, unitLabel: 'bags (50kg)', priceUnit: 'bag' },
    {
      key: 'steel',
      name: detailed ? t('materials.steelTmt') : t('materials.steel'),
      icon: 'pillar', line: m.steel, unitLabel: 'kg', priceUnit: 'kg' },
    {
      key: 'sand',
      name: detailed ? t('materials.sandMSand') : t('materials.sand'),
      icon: 'grain', line: m.sand, unitLabel: 'cu.ft', priceUnit: 'cu.ft' },
    {
      key: 'aggregate',
      name: detailed ? t('materials.aggregate20mm') : t('materials.aggregate'),
      icon: 'dots-hexagon',
      line: m.aggregate,
      unitLabel: 'cu.ft',
      priceUnit: 'cu.ft',
    },
  ];
  if (m.bricks) rows.push({
      key: 'bricks',
      name: t('materials.bricks'),
      icon: 'wall',
      line: m.bricks,
      unitLabel: 'nos',
      priceUnit: t('units.brick'),
    });
  return rows;
}

export default function CalculatorScreen({ navigation }: RootStackScreenProps<'Calculator'>) {
  const { t } = useTranslation('calculator');
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentCity } = useLocation();
  const scrollRef = useRef<ScrollView>(null);
  const resultsY = useRef(0);

  // Form
  const [length, setLength] = useState('');
  const [breadth, setBreadth] = useState('');
  const [area, setArea] = useState('');
  const [floors, setFloors] = useState(1);
  const [includeFooting, setIncludeFooting] = useState(false);
  const [prices, setPrices] = useState<PriceText>(() => toPriceText(DEFAULT_PRICES));

  const [results, setResults] = useState<CalculationResult | null>(null);
  const [calcCount, setCalcCount] = useState(0);

  // City & pricing
  const { data: cities = [], isLoading: citiesLoading } = useAvailableCities();
  const [selectedCity, setSelectedCity] = useState('');
  const [pricingMode, setPricingMode] = useState<PricingMode>('market');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const cityPricesQuery = useCityPrices(selectedCity, pricingMode === 'market');
  const cityPrices = pricingMode === 'market' && cityPricesQuery.data?.prices ? cityPricesQuery.data : null;
  const hasLivePrices = !!cityPrices?.prices && Object.values(cityPrices.prices).some((v) => v.isLive);

  const [leadOpen, setLeadOpen] = useState(false);
  const { orderMaterials, ordering } = useOrderMaterials();

  // Default pricing city: the user's current city when serviceable, else the first available (web).
  useEffect(() => {
    if (selectedCity || cities.length === 0) return;
    const match = currentCity ? cities.find((c) => areSameCities(c.city, currentCity)) : undefined;
    setSelectedCity((match ?? cities[0]).city);
  }, [cities, currentCity, selectedCity]);

  // Market mode: load the city's average prices into the form; tell the user about standard-rate fallbacks.
  const toastedFor = useRef('');
  const cityPricesData = cityPricesQuery.data;
  useEffect(() => {
    if (pricingMode !== 'market' || !cityPricesData?.success || !cityPricesData.prices) return;
    setPrices(toPriceText(pricesFromCityData(cityPricesData.prices)));
    const key = `${cityPricesData.city}|${cityPricesQuery.dataUpdatedAt}`;
    if (toastedFor.current === key) return;
    toastedFor.current = key;
    const fallback = fallbackMaterials(cityPricesData.prices);
    if (fallback.length === Object.keys(cityPricesData.prices).length) {
      toast.info(t('toasts.noLivePrices', { city: selectedCity }), t('toasts.usingStandardRates'));
    } else if (fallback.length > 0) {
      toast.info(
        t('toasts.someStandardRates'),
        t('toasts.noLocalData', { materials: fallback.map((m) => t(`materials.${m}`)).join(', ') }),
      );
    }
  }, [pricingMode, cityPricesData, cityPricesQuery.dataUpdatedAt, selectedCity, t]);

  const onCalculate = () => {
    const outcome = calculateMaterials({
      length,
      breadth,
      area,
      floors: String(floors),
      includeFooting,
      priceCement: Number(prices.priceCement),
      priceSteel: Number(prices.priceSteel),
      priceSand: Number(prices.priceSand),
      priceAgg: Number(prices.priceAgg),
      priceBricks: Number(prices.priceBricks),
    });
    if (!outcome.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      toast.error(outcome.error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setResults(outcome.result);
    setCalcCount((n) => n + 1);
    setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(resultsY.current - spacing.md, 0), animated: true }), 120);
  };

  const onLeadSubmit = async ({ name, phone }: { name: string; phone: string }) => {
    if (!results) return;
    // Persist the lead without blocking the PDF, but never swallow a failure: it is a lost sales lead.
    calculatorLeadAPI
      .create({
        name,
        phone,
        city: selectedCity || '',
        area: results.area,
        floors: results.floors,
        totalCost: results.structureMaterials.totalCost,
        priceMode: pricingMode,
        materials: results.structureMaterials,
      })
      .catch((err: unknown) => console.warn('Calculator lead capture failed:', getErrorMessage(err)));
    try {
      await shareEstimatePdf({ name, phone, city: selectedCity, pricingMode, cityPrices, results });
      setLeadOpen(false);
      toast.success(t('toasts.pdfReady'));
    } catch (err) {
      toast.error(t('toasts.pdfFailed'), getErrorMessage(err, t('toasts.tryAgain')));
    }
  };

  const structureRows = useMemo(
    () => (results ? materialRows(results.structureMaterials, true, t) : []),
    [results, t],
  );
  const foundationRows = useMemo(
    () => (results?.foundationMaterials ? materialRows(results.foundationMaterials, false, t) : []),
    [results, t],
  );

  return (
    <Screen>
      <ScreenHeader title={t('header.title')} subtitle={t('header.subtitle')} icon="calculator-outline" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        {/* City + pricing mode */}
        <Card style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            {citiesLoading || cities.length === 0 ? (
              <Chip label={citiesLoading ? t('pricing.detectingCity') : t('pricing.noCities')} icon="location-outline" />
            ) : (
              <Chip label={selectedCity} icon="location-outline" dropdown onPress={() => setCityPickerOpen(true)} />
            )}
            {pricingMode === 'market' &&
              (cityPricesQuery.isFetching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : cityPrices ? (
                <Badge
                  label={hasLivePrices ? t('pricing.livePrices') : t('pricing.estPrices')}
                  tone={hasLivePrices ? 'success' : 'warning'}
                  icon={hasLivePrices ? 'pulse' : 'time-outline'}
                />
              ) : null)}
          </View>
          <View style={styles.segment} accessibilityRole="tablist">
            {(['market', 'custom'] as const).map((mode) => {
              const active = pricingMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setPricingMode(mode);
                  }}
                  style={[styles.segmentItem, active && styles.segmentActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text variant="label" color={active ? 'onPrimary' : 'textSecondary'}>
                    {mode === 'market' ? t('pricing.modeMarket') : t('pricing.modeCustom')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {pricingMode === 'market' && (
            <View style={styles.rates}>
              {PRICE_FIELDS.map((f) => (
                <View key={f.key} style={styles.rate}>
                  <Text variant="micro" color="textMuted">
                    {t(`materials.${f.material}`)}
                  </Text>
                  <Text variant="label">
                    {formatRupees(Number(prices[f.key]) || 0)}
                    <Text variant="micro" color="textMuted">
                      /{f.unit}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Inputs */}
        <Card style={styles.formCard}>
          <Text variant="micro" color="textMuted" style={styles.overline}>
            {t('form.lengthBreadth')}
          </Text>
          <View style={styles.twoCol}>
            <Input
              label={t('form.length')}
              value={length}
              onChangeText={setLength}
              placeholder={t('form.examplePlaceholder', { value: 40 })}
              keyboardType="decimal-pad"
              containerStyle={styles.flex}
            />
            <Input
              label={t('form.breadth')}
              value={breadth}
              onChangeText={setBreadth}
              placeholder={t('form.examplePlaceholder', { value: 30 })}
              keyboardType="decimal-pad"
              containerStyle={styles.flex}
            />
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <View style={styles.orPill}>
              <Text variant="micro" color="textMuted">
                {t('form.or')}
              </Text>
            </View>
            <View style={styles.orLine} />
          </View>

          <Input
            label={t('form.area')}
            value={area}
            onChangeText={setArea}
            placeholder={t('form.examplePlaceholder', { value: 1200 })}
            keyboardType="decimal-pad"
          />

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={styles.flex}>
              <Text variant="title">{t('form.floors')}</Text>
              <Text variant="caption" color="textSecondary">
                {t('form.floorsHint')}
              </Text>
            </View>
            <QuantityStepper
              value={floors}
              onChange={setFloors}
              min={1}
              max={10}
              tone="outline"
              style={styles.floorStepper}
            />
          </View>
          <View style={styles.optionRow}>
            <View style={styles.flex}>
              <Text variant="title">{t('form.includeFooting')}</Text>
              <Text variant="caption" color="textSecondary">
                {t('form.includeFootingHint')}
              </Text>
            </View>
            <Switch
              value={includeFooting}
              onValueChange={setIncludeFooting}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              accessibilityLabel={t('form.includeFooting')}
            />
          </View>

          {pricingMode === 'custom' && (
            <Animated.View entering={FadeInDown.duration(220)}>
              <View style={styles.divider} />
              <Text variant="micro" color="textMuted" style={styles.overline}>
                {t('form.materialPrices')}
              </Text>
              <View style={styles.priceGrid}>
                {PRICE_FIELDS.map((f) => (
                  <Input
                    key={f.key}
                    label={t('form.priceLabel', { name: t(`materials.${f.material}`), unit: f.unit })}
                    value={prices[f.key]}
                    onChangeText={(text) => setPrices((p) => ({ ...p, [f.key]: text }))}
                    placeholder={String(DEFAULT_PRICES[f.key])}
                    keyboardType="decimal-pad"
                    containerStyle={f.wide ? styles.priceWide : styles.priceHalf}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          <Button
            title={results ? t('form.recalculate') : t('form.calculate')}
            leftIcon="calculator-outline"
            size="lg"
            fullWidth
            onPress={onCalculate}
            style={styles.calcBtn}
          />
        </Card>

        {/* Results */}
        {results && (
          <Animated.View
            key={calcCount}
            entering={FadeInDown.duration(320)}
            onLayout={(e) => {
              resultsY.current = e.nativeEvent.layout.y;
            }}
            style={styles.results}
          >
            <Card>
              <Text variant="h3" style={styles.cardTitle}>
                {t('results.layoutTitle')}
              </Text>
              <LayoutGrid params={results.gridParams} />
            </Card>

            <Card>
              <Text variant="h3" style={styles.cardTitle}>
                {t('results.estimatesTitle')}
              </Text>
              <View style={styles.stats}>
                {[
                  {
                    key: 'dimensions',
                    label: t('results.dimensions'),
                    value: t('results.dimensionsValue', { length: results.length, breadth: results.breadth }),
                  },
                  { key: 'area', label: t('results.area'), value: t('results.areaValue', { area: formatNumber(results.area) }) },
                  { key: 'floors', label: t('results.floors'), value: String(results.floors) },
                  {
                    key: 'columns',
                    label: t('results.columns'),
                    value: `${results.columns} (${results.colsX} × ${results.colsY})`,
                  },
                ].map((s) => (
                  <View key={s.key} style={styles.stat}>
                    <Text variant="micro" color="textMuted">
                      {s.label.toUpperCase()}
                    </Text>
                    <Text variant="title">{s.value}</Text>
                  </View>
                ))}
              </View>
              {results.assumedSquare && (
                <View style={styles.assumed}>
                  <MaterialCommunityIcons name="information-outline" size={14} color={colors.primary} />
                  <Text variant="caption" color="primary">
                    {t('results.assumedSquare')}
                  </Text>
                </View>
              )}

              <View style={styles.sections}>
                <MaterialSection
                  title={t('results.structureTitle')}
                  tone="structure"
                  rows={structureRows}
                  subtotalLabel={t('results.structureSubtotal')}
                  subtotal={results.structureMaterials.totalCost}
                />
                {results.foundationMaterials && (
                  <MaterialSection
                    title={t('results.foundationTitle')}
                    tone="foundation"
                    rows={foundationRows}
                    subtotalLabel={t('results.foundationSubtotal')}
                    subtotal={results.foundationMaterials.totalCost}
                  />
                )}
                <View style={styles.total}>
                  <Text variant="h3">{t('results.totalCost')}</Text>
                  <Text variant="h1" color="successDark">
                    {formatRupees(results.totalCost)}
                  </Text>
                </View>
              </View>

              <Button
                title={t('results.downloadReport')}
                variant="success"
                leftIcon="download-outline"
                fullWidth
                onPress={() => setLeadOpen(true)}
                style={styles.downloadBtn}
              />
              <View style={styles.note}>
                <Text variant="caption" color="primary">
                  <Text variant="caption" color="primary" weight="bold">
                    {t('results.noteLabel')}{' '}
                  </Text>
                  {t('results.noteBody', { city: selectedCity || t('results.localMarket') })}
                </Text>
              </View>
            </Card>
          </Animated.View>
        )}

        {/* CTA */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cta}
        >
          <MaterialCommunityIcons name="truck-delivery-outline" size={28} color={colors.secondary} />
          <Text variant="h2" color="onPrimary" align="center">
            {t('cta.title')}
          </Text>
          <Text variant="bodySm" color="primarySoft" align="center">
            {selectedCity ? t('cta.subtitleCity', { city: selectedCity }) : t('cta.subtitle')}
          </Text>
          <View style={styles.ctaButtons}>
            {results && (
              <Button
                title={ordering ? t('cta.ordering') : t('cta.order')}
                variant="secondary"
                leftIcon="cart-outline"
                loading={ordering}
                disabled={ordering}
                fullWidth
                onPress={() => orderMaterials(results)}
              />
            )}
            <Button
              title={t('cta.browse')}
              variant="outline"
              fullWidth
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab', params: {} })}
            />
          </View>
          {results && (
            <Text variant="caption" color="primarySoft" align="center">
              {t('cta.reviewHint')}
            </Text>
          )}
        </LinearGradient>
      </ScrollView>

      <CityPickerSheet
        visible={cityPickerOpen}
        onClose={() => setCityPickerOpen(false)}
        cities={cities}
        selected={selectedCity}
        onSelect={setSelectedCity}
      />
      <LeadSheet
        visible={leadOpen}
        onClose={() => setLeadOpen(false)}
        onSubmit={onLeadSubmit}
        defaultName={user?.name}
        defaultPhone={user?.phone}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SCREEN_PADDING, gap: spacing.lg },
  flex: { flex: 1 },
  pricingCard: { gap: spacing.md, padding: spacing.lg },
  pricingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xxs,
  },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.primary },
  rates: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  rate: { width: '33.33%', gap: spacing.xxs },
  formCard: { padding: spacing.lg, gap: spacing.md },
  overline: { letterSpacing: 0.8 },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  orPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  floorStepper: { width: 128, flexGrow: 0 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  priceHalf: { width: '48%' },
  priceWide: { width: '100%' },
  calcBtn: { marginTop: spacing.sm },
  results: { gap: spacing.lg },
  cardTitle: { marginBottom: spacing.md },
  stats: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.md, rowGap: spacing.md },
  stat: { width: '50%', gap: spacing.xxs },
  assumed: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  sections: { gap: spacing.md, marginTop: spacing.lg },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  downloadBtn: { marginTop: spacing.lg },
  note: { marginTop: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radii.md, padding: spacing.md },
  cta: { borderRadius: radii.xl, padding: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  ctaButtons: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm },
});
