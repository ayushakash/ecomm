import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const PRICE_FIELDS: { key: PriceKey; name: string; unit: string; wide?: boolean }[] = [
  { key: 'priceCement', name: 'Cement', unit: 'bag' },
  { key: 'priceSteel', name: 'Steel', unit: 'kg' },
  { key: 'priceSand', name: 'Sand', unit: 'cu.ft' },
  { key: 'priceAgg', name: 'Aggregate', unit: 'cu.ft' },
  { key: 'priceBricks', name: 'Bricks', unit: '1000 nos', wide: true },
];

/** Rows shared by the structure and foundation sections (bricks only in structure). */
function materialRows(m: FoundationMaterials & { bricks?: CalculationResult['bricks'] }, detailed: boolean): MaterialRow[] {
  const rows: MaterialRow[] = [
    { name: 'Cement', icon: 'sack', line: m.cement, unitLabel: 'bags (50kg)', priceUnit: 'bag' },
    { name: detailed ? 'Steel (TMT Bars)' : 'Steel', icon: 'pillar', line: m.steel, unitLabel: 'kg', priceUnit: 'kg' },
    { name: detailed ? 'Sand (M-Sand)' : 'Sand', icon: 'grain', line: m.sand, unitLabel: 'cu.ft', priceUnit: 'cu.ft' },
    {
      name: detailed ? 'Aggregate (20mm)' : 'Aggregate',
      icon: 'dots-hexagon',
      line: m.aggregate,
      unitLabel: 'cu.ft',
      priceUnit: 'cu.ft',
    },
  ];
  if (m.bricks) rows.push({ name: 'Bricks', icon: 'wall', line: m.bricks, unitLabel: 'nos', priceUnit: 'brick' });
  return rows;
}

export default function CalculatorScreen({ navigation }: RootStackScreenProps<'Calculator'>) {
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
      toast.info(`No live prices found for ${selectedCity}`, 'Using standard rates.');
    } else if (fallback.length > 0) {
      toast.info('Some prices use standard rates', `No local data: ${fallback.join(', ')}`);
    }
  }, [pricingMode, cityPricesData, cityPricesQuery.dataUpdatedAt, selectedCity]);

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
      toast.success('PDF report ready');
    } catch (err) {
      toast.error("Couldn't create the PDF", getErrorMessage(err, 'Please try again.'));
    }
  };

  const structureRows = useMemo(() => (results ? materialRows(results.structureMaterials, true) : []), [results]);
  const foundationRows = useMemo(
    () => (results?.foundationMaterials ? materialRows(results.foundationMaterials, false) : []),
    [results],
  );

  return (
    <Screen>
      <ScreenHeader title="Material calculator" subtitle="Cement, steel, sand & bricks estimate" icon="calculator-outline" />
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
              <Chip label={citiesLoading ? 'Detecting city…' : 'No cities'} icon="location-outline" />
            ) : (
              <Chip label={selectedCity} icon="location-outline" dropdown onPress={() => setCityPickerOpen(true)} />
            )}
            {pricingMode === 'market' &&
              (cityPricesQuery.isFetching ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : cityPrices ? (
                <Badge
                  label={hasLivePrices ? 'Live prices' : 'Est. prices'}
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
                    {mode === 'market' ? 'Market price' : 'Custom'}
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
                    {f.name}
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
            LENGTH & BREADTH
          </Text>
          <View style={styles.twoCol}>
            <Input
              label="Length (ft)"
              value={length}
              onChangeText={setLength}
              placeholder="e.g. 40"
              keyboardType="decimal-pad"
              containerStyle={styles.flex}
            />
            <Input
              label="Breadth (ft)"
              value={breadth}
              onChangeText={setBreadth}
              placeholder="e.g. 30"
              keyboardType="decimal-pad"
              containerStyle={styles.flex}
            />
          </View>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <View style={styles.orPill}>
              <Text variant="micro" color="textMuted">
                OR
              </Text>
            </View>
            <View style={styles.orLine} />
          </View>

          <Input
            label="Total built-up area (sq.ft)"
            value={area}
            onChangeText={setArea}
            placeholder="e.g. 1200"
            keyboardType="decimal-pad"
          />

          <View style={styles.divider} />

          <View style={styles.optionRow}>
            <View style={styles.flex}>
              <Text variant="title">Number of floors</Text>
              <Text variant="caption" color="textSecondary">
                Up to 10
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
              <Text variant="title">Include footing</Text>
              <Text variant="caption" color="textSecondary">
                Adds foundation materials per column
              </Text>
            </View>
            <Switch
              value={includeFooting}
              onValueChange={setIncludeFooting}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.surface}
              accessibilityLabel="Include footing"
            />
          </View>

          {pricingMode === 'custom' && (
            <Animated.View entering={FadeInDown.duration(220)}>
              <View style={styles.divider} />
              <Text variant="micro" color="textMuted" style={styles.overline}>
                MATERIAL PRICES
              </Text>
              <View style={styles.priceGrid}>
                {PRICE_FIELDS.map((f) => (
                  <Input
                    key={f.key}
                    label={`${f.name} (₹/${f.unit})`}
                    value={prices[f.key]}
                    onChangeText={(t) => setPrices((p) => ({ ...p, [f.key]: t }))}
                    placeholder={String(DEFAULT_PRICES[f.key])}
                    keyboardType="decimal-pad"
                    containerStyle={f.wide ? styles.priceWide : styles.priceHalf}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          <Button
            title={results ? 'Recalculate' : 'Calculate materials'}
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
                Layout visualization
              </Text>
              <LayoutGrid params={results.gridParams} />
            </Card>

            <Card>
              <Text variant="h3" style={styles.cardTitle}>
                Material estimates
              </Text>
              <View style={styles.stats}>
                {[
                  { label: 'Dimensions', value: `${results.length} × ${results.breadth} ft` },
                  { label: 'Area', value: `${formatNumber(results.area)} sq.ft` },
                  { label: 'Floors', value: String(results.floors) },
                  { label: 'Columns', value: `${results.columns} (${results.colsX} × ${results.colsY})` },
                ].map((s) => (
                  <View key={s.label} style={styles.stat}>
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
                    Square footprint assumed from area
                  </Text>
                </View>
              )}

              <View style={styles.sections}>
                <MaterialSection
                  title="Structure materials"
                  tone="structure"
                  rows={structureRows}
                  subtotalLabel="Structure subtotal"
                  subtotal={results.structureMaterials.totalCost}
                />
                {results.foundationMaterials && (
                  <MaterialSection
                    title="Foundation materials"
                    tone="foundation"
                    rows={foundationRows}
                    subtotalLabel="Foundation subtotal"
                    subtotal={results.foundationMaterials.totalCost}
                  />
                )}
                <View style={styles.total}>
                  <Text variant="h3">Total estimated cost</Text>
                  <Text variant="h1" color="successDark">
                    {formatRupees(results.totalCost)}
                  </Text>
                </View>
              </View>

              <Button
                title="Download report"
                variant="success"
                leftIcon="download-outline"
                fullWidth
                onPress={() => setLeadOpen(true)}
                style={styles.downloadBtn}
              />
              <View style={styles.note}>
                <Text variant="caption" color="primary">
                  <Text variant="caption" color="primary" weight="bold">
                    Note:{' '}
                  </Text>
                  These are approximate estimates. Actual requirements may vary based on design, wastage, and site
                  conditions. Prices shown are indicative for the {selectedCity || 'local'} market.
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
            Ready to buy construction materials?
          </Text>
          <Text variant="bodySm" color="primarySoft" align="center">
            Get quality materials delivered to your site{selectedCity ? ` in ${selectedCity}` : ''}
          </Text>
          <View style={styles.ctaButtons}>
            {results && (
              <Button
                title={ordering ? 'Adding to cart…' : 'Order these materials'}
                variant="secondary"
                leftIcon="cart-outline"
                loading={ordering}
                disabled={ordering}
                fullWidth
                onPress={() => orderMaterials(results)}
              />
            )}
            <Button
              title="Browse products"
              variant="outline"
              fullWidth
              onPress={() => navigation.navigate('MainTabs', { screen: 'ProductsTab', params: {} })}
            />
          </View>
          {results && (
            <Text variant="caption" color="primarySoft" align="center">
              Quantities are estimates from your calculation — review them in the cart before checkout.
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
