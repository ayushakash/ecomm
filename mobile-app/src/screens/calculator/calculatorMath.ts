/**
 * Pure construction-material estimator. Math is a 1:1 port of
 * client/src/pages/Calculator.js (calculateMaterials + MATERIAL_ORDER_CONFIG);
 * keep the two in sync when either changes.
 */
import i18n from '../../i18n';
import type { CityPriceMaterial, CityPricesResponse } from '../../types/models';

export const CUFT_TO_M3 = 0.0283168;

/** Indian construction thumb rules (web DEFAULTS). */
export const DEFAULTS = {
  columnSpacing: 12, // ft; residential thumb rule 10–14 ft
  cementBagsPerSqft: 0.45,
  steelKgPerSqft: 3.3,
  sandCuftPerSqft: 1.1,
  aggCuftPerSqft: 1.6,
  bricksPerSqft: 7.5, // 4" wall
  footingPerColumn: {
    cementBags: 4, // 3'x3'x3' footing
    steelKg: 50,
    sandCuft: 7.5,
    aggCuft: 14.5,
  },
} as const;

export interface MaterialPrices {
  priceCement: number; // ₹/bag
  priceSteel: number; // ₹/kg
  priceSand: number; // ₹/cu.ft
  priceAgg: number; // ₹/cu.ft
  priceBricks: number; // ₹/1000 nos
}

/** Standard rates (web formData defaults and server fallback defaults). */
export const DEFAULT_PRICES: MaterialPrices = {
  priceCement: 350,
  priceSteel: 72,
  priceSand: 40,
  priceAgg: 70,
  priceBricks: 10000,
};

/** Market prices from GET /analytics/city-prices, falling back per material like the web. */
export const pricesFromCityData = (prices: NonNullable<CityPricesResponse['prices']>): MaterialPrices => ({
  priceCement: prices.cement?.avg || DEFAULT_PRICES.priceCement,
  priceSteel: prices.steel?.avg || DEFAULT_PRICES.priceSteel,
  priceSand: prices.sand?.avg || DEFAULT_PRICES.priceSand,
  priceAgg: prices.aggregate?.avg || DEFAULT_PRICES.priceAgg,
  priceBricks: prices.bricks?.avg || DEFAULT_PRICES.priceBricks,
});

/** Materials priced from standard rates because the city has no live data for them. */
export const fallbackMaterials = (prices: NonNullable<CityPricesResponse['prices']>): CityPriceMaterial[] =>
  (Object.entries(prices) as [CityPriceMaterial, { isLive: boolean }][]).filter(([, v]) => !v.isLive).map(([k]) => k);

/** Round to 2 decimals (web `q`). */
export const q = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CalculatorInput extends MaterialPrices {
  /** Raw text fields, parsed with parseFloat/parseInt like the web form. */
  length: string;
  breadth: string;
  area: string;
  floors: string;
  includeFooting: boolean;
}

export type MaterialUnit = 'bags' | 'kg' | 'cu.ft' | 'nos';

export interface MaterialLine {
  quantity: number;
  unit: MaterialUnit;
  cost: number;
  pricePerUnit: number;
}

export interface FoundationMaterials {
  cement: MaterialLine;
  steel: MaterialLine;
  sand: MaterialLine;
  aggregate: MaterialLine;
  totalCost: number;
}

export interface StructureMaterials extends FoundationMaterials {
  bricks: MaterialLine;
}

export interface GridParams {
  length: number;
  breadth: number;
  colsX: number;
  colsY: number;
  spacing: number;
  assumedSquare: boolean;
}

export interface CalculationResult {
  length: number;
  breadth: number;
  area: number;
  floors: number;
  columns: number;
  colsX: number;
  colsY: number;
  spacing: number;
  assumedSquare: boolean;
  /** Totals = structure + foundation (used for ordering). */
  cement: MaterialLine;
  steel: MaterialLine;
  sand: MaterialLine;
  aggregate: MaterialLine;
  bricks: MaterialLine;
  totalCost: number;
  foundationMaterials: FoundationMaterials | null;
  structureMaterials: StructureMaterials;
  gridParams: GridParams;
}

export type CalculationOutcome = { ok: true; result: CalculationResult } | { ok: false; error: string };

export function calculateMaterials(input: CalculatorInput): CalculationOutcome {
  const { includeFooting } = input;
  // Web multiplies string prices directly (implicit Number coercion); Number() keeps costs identical.
  const priceCement = Number(input.priceCement) || 0;
  const priceSteel = Number(input.priceSteel) || 0;
  const priceSand = Number(input.priceSand) || 0;
  const priceAgg = Number(input.priceAgg) || 0;
  const priceBricks = Number(input.priceBricks) || 0;

  const areaNum = parseFloat(input.area) || 0;
  const floorsNum = parseInt(input.floors, 10) || 1;
  const spacingNum = DEFAULTS.columnSpacing;

  let length = parseFloat(input.length) || 0;
  let breadth = parseFloat(input.breadth) || 0;
  let assumedSquare = false;

  // No length/breadth: assume a square footprint from the area.
  if ((!length || !breadth) && areaNum) {
    length = breadth = Math.sqrt(areaNum);
    assumedSquare = true;
  } else if (!length || !breadth) {
    return { ok: false, error: i18n.t('calculator:errors.dimensionsRequired') };
  }

  const builtArea = length * breadth;

  // Column grid: ceil(dimension / spacing) + 1
  const colsX = Math.ceil(length / spacingNum) + 1;
  const colsY = Math.ceil(breadth / spacingNum) + 1;
  const totalColumns = colsX * colsY;

  const cementPerFloor = builtArea * DEFAULTS.cementBagsPerSqft;
  const steelPerFloor = builtArea * DEFAULTS.steelKgPerSqft;
  const sandPerFloor = builtArea * DEFAULTS.sandCuftPerSqft;
  const aggPerFloor = builtArea * DEFAULTS.aggCuftPerSqft;
  const bricksPerFloor = builtArea * DEFAULTS.bricksPerSqft;

  let totalCement = cementPerFloor * floorsNum;
  let totalSteel = steelPerFloor * floorsNum;
  let totalSand = sandPerFloor * floorsNum;
  let totalAgg = aggPerFloor * floorsNum;
  const totalBricks = bricksPerFloor * floorsNum;

  let foundationCement = 0;
  let foundationSteel = 0;
  let foundationSand = 0;
  let foundationAgg = 0;
  if (includeFooting) {
    foundationCement = totalColumns * DEFAULTS.footingPerColumn.cementBags;
    foundationSteel = totalColumns * DEFAULTS.footingPerColumn.steelKg;
    foundationSand = totalColumns * DEFAULTS.footingPerColumn.sandCuft;
    foundationAgg = totalColumns * DEFAULTS.footingPerColumn.aggCuft;
    totalCement += foundationCement;
    totalSteel += foundationSteel;
    totalSand += foundationSand;
    totalAgg += foundationAgg;
  }

  const cementCost = totalCement * priceCement;
  const steelCost = totalSteel * priceSteel;
  const sandCost = totalSand * priceSand;
  const aggCost = totalAgg * priceAgg;
  const bricksCost = (totalBricks / 1000) * priceBricks;
  const totalCost = cementCost + steelCost + sandCost + aggCost + bricksCost;

  const structureCement = cementPerFloor * floorsNum;
  const structureSteel = steelPerFloor * floorsNum;
  const structureSand = sandPerFloor * floorsNum;
  const structureAgg = aggPerFloor * floorsNum;
  const structureBricks = bricksPerFloor * floorsNum;

  const foundationCementCost = foundationCement * priceCement;
  const foundationSteelCost = foundationSteel * priceSteel;
  const foundationSandCost = foundationSand * priceSand;
  const foundationAggCost = foundationAgg * priceAgg;
  const foundationTotalCost = foundationCementCost + foundationSteelCost + foundationSandCost + foundationAggCost;

  const structureCementCost = structureCement * priceCement;
  const structureSteelCost = structureSteel * priceSteel;
  const structureSandCost = structureSand * priceSand;
  const structureAggCost = structureAgg * priceAgg;
  const structureBricksCost = (structureBricks / 1000) * priceBricks;
  const structureTotalCost =
    structureCementCost + structureSteelCost + structureSandCost + structureAggCost + structureBricksCost;

  const line = (quantity: number, unit: MaterialUnit, cost: number, pricePerUnit: number): MaterialLine => ({
    quantity: q(quantity),
    unit,
    cost: q(cost),
    pricePerUnit: q(pricePerUnit),
  });

  return {
    ok: true,
    result: {
      length: q(length),
      breadth: q(breadth),
      area: q(builtArea),
      floors: floorsNum,
      columns: totalColumns,
      colsX,
      colsY,
      spacing: spacingNum,
      assumedSquare,
      cement: line(totalCement, 'bags', cementCost, priceCement),
      steel: line(totalSteel, 'kg', steelCost, priceSteel),
      sand: line(totalSand, 'cu.ft', sandCost, priceSand),
      aggregate: line(totalAgg, 'cu.ft', aggCost, priceAgg),
      bricks: line(totalBricks, 'nos', bricksCost, priceBricks / 1000),
      totalCost: q(totalCost),
      foundationMaterials: includeFooting
        ? {
            cement: line(foundationCement, 'bags', foundationCementCost, priceCement),
            steel: line(foundationSteel, 'kg', foundationSteelCost, priceSteel),
            sand: line(foundationSand, 'cu.ft', foundationSandCost, priceSand),
            aggregate: line(foundationAgg, 'cu.ft', foundationAggCost, priceAgg),
            totalCost: q(foundationTotalCost),
          }
        : null,
      structureMaterials: {
        cement: line(structureCement, 'bags', structureCementCost, priceCement),
        steel: line(structureSteel, 'kg', structureSteelCost, priceSteel),
        sand: line(structureSand, 'cu.ft', structureSandCost, priceSand),
        aggregate: line(structureAgg, 'cu.ft', structureAggCost, priceAgg),
        bricks: line(structureBricks, 'nos', structureBricksCost, priceBricks / 1000),
        totalCost: q(structureTotalCost),
      },
      gridParams: { length, breadth, colsX, colsY, spacing: spacingNum, assumedSquare },
    },
  };
}

// ─── Ordering: calculator units → catalog units ──────────────────────────────

export type OrderMaterialKey = 'cement' | 'steel' | 'bricks' | 'sand' | 'aggregate';

export interface MaterialOrderConfig {
  /** `calculator:materials.*` key for the user-visible name. */
  labelKey: string;
  /** Catalog search keyword. */
  keyword: string;
  /** Calculator quantity (bags / kg / nos / cu.ft) → cart quantity in the product's unit. */
  toQty: (quantity: number, productUnit: string) => number;
}

/**
 * Calculator units rarely match how products are sold (bag / ton / cubic-meter /
 * piece), so convert and always ask the user to review quantities in the cart.
 * Iteration order matches the web (cement, steel, bricks, sand, aggregate).
 */
export const MATERIAL_ORDER_CONFIG: Record<OrderMaterialKey, MaterialOrderConfig> = {
  cement: { labelKey: 'materials.cement', keyword: 'cement', toQty: (qty) => Math.max(1, Math.ceil(qty)) }, // bags ≈ 'bag'
  steel: {
    labelKey: 'materials.steelOrder',
    keyword: 'tmt steel',
    toQty: (qty, unit) => (unit === 'ton' ? Math.max(1, Math.ceil(qty / 1000)) : Math.max(1, Math.ceil(qty))),
  },
  bricks: { labelKey: 'materials.bricks', keyword: 'brick', toQty: (qty) => Math.max(1, Math.ceil(qty)) }, // nos ≈ 'piece'
  sand: {
    labelKey: 'materials.sand',
    keyword: 'sand',
    toQty: (qty, unit) => {
      const m3 = qty * CUFT_TO_M3;
      if (unit === 'cubic-meter') return Math.max(1, Math.ceil(m3));
      if (unit === 'ton') return Math.max(1, Math.ceil(m3 * 1.6)); // ~1.6 t/m³
      return Math.max(1, Math.ceil(qty));
    },
  },
  aggregate: {
    labelKey: 'materials.aggregate',
    keyword: 'aggregate',
    toQty: (qty, unit) => {
      const m3 = qty * CUFT_TO_M3;
      if (unit === 'cubic-meter') return Math.max(1, Math.ceil(m3));
      if (unit === 'ton') return Math.max(1, Math.ceil(m3 * 1.5)); // ~1.5 t/m³
      return Math.max(1, Math.ceil(qty));
    },
  },
};

export const ORDER_MATERIAL_KEYS = Object.keys(MATERIAL_ORDER_CONFIG) as OrderMaterialKey[];

/** "1,25,000.5" — en-IN grouping, up to 2 decimals (web prints raw q() values). */
export const formatNumber = (n: number): string => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const formatRupees = (n: number): string => `₹${formatNumber(n)}`;
