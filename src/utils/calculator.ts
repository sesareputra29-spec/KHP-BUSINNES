import {
  BillOfMaterial,
  BomIngredient,
  DirectLaborCost,
  OverheadCost,
  PackagingCost,
  CostingMethod,
} from '../types';

export const formatRupiah = (val: number | undefined | null): string => {
  if (val === undefined || val === null || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(val);
};

export const formatNumber = (val: number | undefined | null, decimals = 0): string => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(val);
};

export const formatPercent = (val: number | undefined | null, decimals = 1): string => {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${val.toFixed(decimals)}%`;
};

/**
 * Calculates raw material ingredient cost considering shrinkage
 */
export const calculateIngredientCost = (
  quantity: number,
  unitCost: number,
  shrinkagePct: number = 0
): { grossQuantity: number; totalCost: number } => {
  const shrinkFactor = 1 + (shrinkagePct || 0) / 100;
  const grossQuantity = (quantity || 0) * shrinkFactor;
  const totalCost = grossQuantity * (unitCost || 0);
  return { grossQuantity, totalCost };
};

/**
 * Calculates direct labor cost
 */
export const calculateLaborCost = (
  numWorkers: number,
  hourlyRate: number,
  hoursWorked: number
): number => {
  return (numWorkers || 0) * (hourlyRate || 0) * (hoursWorked || 0);
};

/**
 * Complete BOM cost summary
 */
export const calculateBomTotals = (
  ingredients: BomIngredient[],
  laborCosts: DirectLaborCost[],
  overheadCosts: OverheadCost[],
  packagingCosts: PackagingCost[],
  batchYield: number,
  costingMethod: CostingMethod = 'FULL_COSTING'
) => {
  const totalMaterialCost = ingredients.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalLaborCost = laborCosts.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  
  const totalVariableOverheadCost = overheadCosts
    .filter((item) => item.isVariable)
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalFixedOverheadCost = overheadCosts
    .filter((item) => !item.isVariable)
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalPackagingCost = packagingCosts.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  // Full Costing: Material + Labor + Variable Overhead + Fixed Overhead + Packaging
  // Variable Costing: Material + Labor + Variable Overhead + Packaging (Excludes Fixed Overhead)
  const totalBatchCost =
    costingMethod === 'FULL_COSTING'
      ? totalMaterialCost + totalLaborCost + totalVariableOverheadCost + totalFixedOverheadCost + totalPackagingCost
      : totalMaterialCost + totalLaborCost + totalVariableOverheadCost + totalPackagingCost;

  const validYield = batchYield > 0 ? batchYield : 1;
  const hppPerUnit = totalBatchCost / validYield;

  return {
    totalMaterialCost,
    totalLaborCost,
    totalVariableOverheadCost,
    totalFixedOverheadCost,
    totalPackagingCost,
    totalBatchCost,
    hppPerUnit,
  };
};

/**
 * Calculates selling price recommendations based on cost and target margin
 */
export const calculatePricesFromHpp = (hppPerUnit: number, targetMarginPct: number) => {
  const validHpp = Math.max(0, hppPerUnit);
  const marginDecimal = (targetMarginPct || 0) / 100;
  
  // Margin on Sales: Selling Price = HPP / (1 - Margin%)
  const sellingPriceMargin = marginDecimal < 1 && marginDecimal >= 0
    ? validHpp / (1 - marginDecimal)
    : validHpp * 1.5;

  // Markup on Cost: Selling Price = HPP * (1 + Markup%)
  const sellingPriceMarkup = validHpp * (1 + marginDecimal);

  // Suggested rounded price (to nearest 500 or 1000 IDR)
  const roundToNearest500 = (num: number) => Math.ceil(num / 500) * 500;

  return {
    costBasedPrice: roundToNearest500(sellingPriceMarkup),
    marginBasedPrice: roundToNearest500(sellingPriceMargin),
    nominalProfit: roundToNearest500(sellingPriceMargin) - validHpp,
    nominalMarkup: roundToNearest500(sellingPriceMarkup) - validHpp,
  };
};

/**
 * Channel price breakdown with platform commissions and net profit
 */
export interface ChannelBreakdown {
  channelName: string;
  recommendedPrice: number;
  commissionPct: number;
  platformFeeAmount: number;
  extraPackagingFee: number;
  netRevenue: number;
  hppPerUnit: number;
  netProfit: number;
  netMarginPct: number;
}

export const calculateMultiChannelPricing = (
  hppPerUnit: number,
  baseRetailPrice: number
): ChannelBreakdown[] => {
  const validHpp = Math.max(1, hppPerUnit);
  const basePrice = Math.max(validHpp * 1.1, baseRetailPrice);

  const channels = [
    {
      channelName: 'Offline / Toko Fisik',
      priceMultiplier: 1.0,
      commissionPct: 0,
      extraPackaging: 500, // paper bag
    },
    {
      channelName: 'Marketplace (Shopee / Tokped)',
      priceMultiplier: 1.12, // slightly higher to absorb 6.5% - 8% fee
      commissionPct: 7.5,
      extraPackaging: 1200, // bubble wrap + polymailer
    },
    {
      channelName: 'Online Delivery (GrabFood / GoFood)',
      priceMultiplier: 1.25, // absorb 20% platform cut
      commissionPct: 20.0,
      extraPackaging: 1500, // leakproof seal + thermal paper bag
    },
    {
      channelName: 'Grosir / Distributor (Min 50 Pcs)',
      priceMultiplier: 0.82, // discounted for bulk volume
      commissionPct: 0,
      extraPackaging: 200,
    },
    {
      channelName: 'Reseller / Dropshipper',
      priceMultiplier: 0.90, // 10% discount
      commissionPct: 0,
      extraPackaging: 800,
    },
  ];

  return channels.map((ch) => {
    const rawPrice = basePrice * ch.priceMultiplier;
    const roundedPrice = Math.ceil(rawPrice / 500) * 500;
    const platformFeeAmount = (roundedPrice * ch.commissionPct) / 100;
    const netRevenue = roundedPrice - platformFeeAmount - ch.extraPackaging;
    const netProfit = netRevenue - validHpp;
    const netMarginPct = (netProfit / (netRevenue || 1)) * 100;

    return {
      channelName: ch.channelName,
      recommendedPrice: roundedPrice,
      commissionPct: ch.commissionPct,
      platformFeeAmount,
      extraPackagingFee: ch.extraPackaging,
      netRevenue,
      hppPerUnit: validHpp,
      netProfit,
      netMarginPct,
    };
  });
};

/**
 * Break-Even Point (BEP) calculation
 */
export const calculateBEP = (
  fixedCostsTotal: number,
  sellingPricePerUnit: number,
  variableCostPerUnit: number,
  currentSalesVolume: number = 0
) => {
  const contributionMarginPerUnit = sellingPricePerUnit - variableCostPerUnit;
  const contributionMarginRatio = sellingPricePerUnit > 0
    ? contributionMarginPerUnit / sellingPricePerUnit
    : 0;

  const bepUnits = contributionMarginPerUnit > 0
    ? Math.ceil(fixedCostsTotal / contributionMarginPerUnit)
    : 0;

  const bepRupiah = contributionMarginRatio > 0
    ? Math.ceil(fixedCostsTotal / contributionMarginRatio)
    : 0;

  const targetSalesRevenue = currentSalesVolume * sellingPricePerUnit;
  const marginOfSafetyPct = targetSalesRevenue > 0 && targetSalesRevenue >= bepRupiah
    ? ((targetSalesRevenue - bepRupiah) / targetSalesRevenue) * 100
    : 0;

  return {
    contributionMarginPerUnit,
    contributionMarginRatio,
    bepUnits,
    bepRupiah,
    marginOfSafetyPct,
  };
};

/**
 * Sensitivity Analysis Matrix generator
 * Varying Selling Price (-10%, -5%, 0%, +5%, +10%)
 * vs Sales Volume (-20%, -10%, 0%, +10%, +20%)
 */
export interface SensitivityCell {
  priceDelta: number;
  volumeDelta: number;
  price: number;
  volume: number;
  revenue: number;
  totalCost: number;
  netProfit: number;
}

export const generateSensitivityMatrix = (
  basePrice: number,
  baseVolume: number,
  variableCostPerUnit: number,
  fixedCosts: number
): { priceDeltas: number[]; volumeDeltas: number[]; matrix: SensitivityCell[][] } => {
  const priceDeltas = [-10, -5, 0, 5, 10];
  const volumeDeltas = [-20, -10, 0, 10, 20];

  const matrix: SensitivityCell[][] = volumeDeltas.map((vDelta) => {
    return priceDeltas.map((pDelta) => {
      const price = basePrice * (1 + pDelta / 100);
      const volume = Math.round(baseVolume * (1 + vDelta / 100));
      const revenue = price * volume;
      const totalCost = fixedCosts + variableCostPerUnit * volume;
      const netProfit = revenue - totalCost;

      return {
        priceDelta: pDelta,
        volumeDelta: vDelta,
        price,
        volume,
        revenue,
        totalCost,
        netProfit,
      };
    });
  });

  return { priceDeltas, volumeDeltas, matrix };
};
