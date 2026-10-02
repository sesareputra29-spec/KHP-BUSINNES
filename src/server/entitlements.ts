import { dbAdapter } from './db';
import { FeatureKey, SaaSSubscriptionStatus, PlanLimits } from '../types';

export interface SubscriptionLifecycleState {
  status: SaaSSubscriptionStatus;
  isReadOnly: boolean;
  inGracePeriod: boolean;
  gracePeriodEndsAt?: string;
  daysRemaining: number;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  feature?: FeatureKey;
  planCode: string;
  planName: string;
  subscriptionStatus: SaaSSubscriptionStatus;
  isReadOnly: boolean;
}

export interface LimitCheckResult {
  allowed: boolean;
  resource: 'users' | 'products' | 'raw_materials' | 'boms' | 'batches';
  current: number;
  max: number;
  planCode: string;
  message?: string;
}

export interface BusinessEntitlementSummary {
  businessId: string;
  businessName: string;
  businessStatus: string;
  plan: {
    id: string;
    code: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
  };
  subscription: {
    id: string;
    status: SaaSSubscriptionStatus;
    billingCycle: 'MONTHLY' | 'YEARLY';
    startDate: string;
    endDate: string;
    trialStart?: string;
    trialEnd?: string;
    paymentReference?: string;
    isReadOnly: boolean;
    inGracePeriod: boolean;
    gracePeriodEndsAt?: string;
    daysRemaining: number;
  };
  features: Record<FeatureKey, boolean>;
  usage: {
    users: { current: number; max: number; percentage: number };
    products: { current: number; max: number; percentage: number };
    rawMaterials: { current: number; max: number; percentage: number };
    boms: { current: number; max: number; percentage: number };
    batchesMonthly: { current: number; max: number; percentage: number };
  };
}

const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 Days Grace Period for PAST_DUE

/**
 * Single Source of Truth: Evaluates lifecycle state of a subscription record
 */
export function evaluateSubscriptionLifecycle(subRow: any): SubscriptionLifecycleState {
  const now = Date.now();
  let status = String(subRow.status || 'TRIAL').toUpperCase() as SaaSSubscriptionStatus;
  let isReadOnly = Boolean(subRow.is_read_only);
  let inGracePeriod = false;
  let gracePeriodEndsAt: string | undefined;

  let expirationTargetTime = subRow.end_date ? new Date(subRow.end_date).getTime() : now;
  if (status === 'TRIAL' && subRow.trial_end) {
    expirationTargetTime = new Date(subRow.trial_end).getTime();
  }

  const msRemaining = expirationTargetTime - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

  // 1. TRIAL Evaluation
  if (status === 'TRIAL') {
    if (now > expirationTargetTime) {
      status = 'EXPIRED';
      isReadOnly = true;
      try {
        dbAdapter.execute("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1, updated_at = ? WHERE id = ?", [new Date().toISOString(), subRow.id]).catch(() => {});
        dbAdapter.execute("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?", [subRow.business_id]).catch(() => {});
      } catch {}
    }
  }

  // 2. ACTIVE Evaluation
  else if (status === 'ACTIVE') {
    if (now > expirationTargetTime) {
      const graceEnd = expirationTargetTime + GRACE_PERIOD_MS;
      gracePeriodEndsAt = new Date(graceEnd).toISOString();

      if (now <= graceEnd) {
        // Enters PAST_DUE (Grace period)
        status = 'PAST_DUE';
        inGracePeriod = true;
        isReadOnly = false; // Grace period allows operations with warnings
        try {
          dbAdapter.execute("UPDATE subscriptions SET status = 'PAST_DUE', updated_at = ? WHERE id = ?", [new Date().toISOString(), subRow.id]).catch(() => {});
        } catch {}
      } else {
        // Passed grace period -> EXPIRED
        status = 'EXPIRED';
        isReadOnly = true;
        try {
          dbAdapter.execute("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1, updated_at = ? WHERE id = ?", [new Date().toISOString(), subRow.id]).catch(() => {});
          dbAdapter.execute("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?", [subRow.business_id]).catch(() => {});
        } catch {}
      }
    }
  }

  // 3. PAST_DUE Evaluation
  else if (status === 'PAST_DUE') {
    const graceEnd = expirationTargetTime + GRACE_PERIOD_MS;
    gracePeriodEndsAt = new Date(graceEnd).toISOString();

    if (now > graceEnd) {
      status = 'EXPIRED';
      isReadOnly = true;
      try {
        dbAdapter.execute("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1, updated_at = ? WHERE id = ?", [new Date().toISOString(), subRow.id]).catch(() => {});
        dbAdapter.execute("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?", [subRow.business_id]).catch(() => {});
      } catch {}
    } else {
      inGracePeriod = true;
      isReadOnly = false;
    }
  }

  // 4. CANCELLED Evaluation
  else if (status === 'CANCELLED') {
    if (now > expirationTargetTime) {
      isReadOnly = true;
    }
  }

  // 5. EXPIRED
  else if (status === 'EXPIRED') {
    isReadOnly = true;
  }

  return {
    status,
    isReadOnly,
    inGracePeriod,
    gracePeriodEndsAt,
    daysRemaining,
  };
}

/**
 * Fetch raw active subscription row with joined plan (Unified PostgreSQL / SQLite)
 */
export async function getActiveSubscriptionRowAsync(businessId: string): Promise<any> {
  return dbAdapter.queryOne(`
    SELECT
      s.*,
      p.code as plan_code,
      p.name as plan_name,
      p.price_monthly,
      p.price_yearly,
      p.features_json,
      p.limits_json
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.created_at DESC
    LIMIT 1
  `, [businessId]);
}
export const getActiveSubscriptionRow = getActiveSubscriptionRowAsync;

/**
 * Single Source of Truth: Check if a business has entitlement for a specific feature
 */
export async function checkFeatureEntitlementAsync(
  businessId: string,
  feature: FeatureKey
): Promise<EntitlementCheckResult> {
  const bizRow = await dbAdapter.queryOne('SELECT status FROM businesses WHERE id = ?', [businessId]);
  if (!bizRow) {
    return {
      allowed: false,
      reason: 'Bisnis tidak ditemukan.',
      feature,
      planCode: 'NONE',
      planName: 'Tidak Diketahui',
      subscriptionStatus: 'EXPIRED',
      isReadOnly: true,
    };
  }

  if (String(bizRow.status).toUpperCase() === 'SUSPENDED') {
    return {
      allowed: false,
      reason: 'Bisnis Anda sedang ditangguhkan (SUSPENDED).',
      feature,
      planCode: 'SUSPENDED',
      planName: 'Suspended',
      subscriptionStatus: 'SUSPENDED',
      isReadOnly: true,
    };
  }

  const subRow = await getActiveSubscriptionRowAsync(businessId);
  if (!subRow) {
    return {
      allowed: false,
      reason: 'Tidak ada langganan aktif.',
      feature,
      planCode: 'FREE',
      planName: 'Free Tier',
      subscriptionStatus: 'EXPIRED',
      isReadOnly: true,
    };
  }

  const lifecycle = evaluateSubscriptionLifecycle(subRow);
  let features: FeatureKey[] = [];
  try {
    if (subRow.features_json) features = JSON.parse(subRow.features_json);
  } catch {}

  const hasFeature = features.includes(feature);
  if (!hasFeature) {
    return {
      allowed: false,
      reason: `Fitur '${feature}' tidak tersedia pada paket ${subRow.plan_name}. Silakan upgrade ke paket yang lebih tinggi.`,
      feature,
      planCode: subRow.plan_code,
      planName: subRow.plan_name,
      subscriptionStatus: lifecycle.status,
      isReadOnly: lifecycle.isReadOnly,
    };
  }

  return {
    allowed: true,
    feature,
    planCode: subRow.plan_code,
    planName: subRow.plan_name,
    subscriptionStatus: lifecycle.status,
    isReadOnly: lifecycle.isReadOnly,
  };
}
export const checkFeatureEntitlement = checkFeatureEntitlementAsync;

export async function checkResourceLimitAsync(
  businessId: string,
  resource: 'users' | 'products' | 'raw_materials' | 'boms' | 'batches',
  existingLimits?: PlanLimits,
  existingPlanCode?: string
): Promise<LimitCheckResult> {
  let limits: PlanLimits = existingLimits || {
    maxUsers: 5,
    maxProducts: 100,
    maxRawMaterials: 50,
    maxBoms: 50,
    maxBatchesMonthly: 100,
  };
  let planCode = existingPlanCode || 'STARTER';
  let planName = 'Starter';

  if (!existingLimits) {
    const subRow = await getActiveSubscriptionRowAsync(businessId);
    if (subRow) {
      planCode = subRow.plan_code || 'STARTER';
      planName = subRow.plan_name || 'Starter';
      if (subRow.limits_json) {
        try {
          limits = JSON.parse(subRow.limits_json);
        } catch {}
      }
    }
  }

  let current = 0;
  let max = 0;

  switch (resource) {
    case 'users': {
      const row = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE business_id = ? AND (active = 1 OR active = TRUE)', [businessId]);
      current = Number(row?.count || 0);
      max = limits.maxUsers;
      break;
    }
    case 'products': {
      const row = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [businessId]);
      current = Number(row?.count || 0);
      max = limits.maxProducts;
      break;
    }
    case 'raw_materials': {
      const row = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?', [businessId]);
      current = Number(row?.count || 0);
      max = limits.maxRawMaterials;
      break;
    }
    case 'boms': {
      const row = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM boms WHERE business_id = ?', [businessId]);
      current = Number(row?.count || 0);
      max = limits.maxBoms;
      break;
    }
    case 'batches': {
      const monthPrefix = new Date().toISOString().substring(0, 7);
      const row = await dbAdapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM production_batches WHERE business_id = ? AND (date LIKE ? OR id LIKE ?)", [businessId, `${monthPrefix}%`, `%${monthPrefix}%`]);
      current = Number(row?.count || 0);
      max = limits.maxBatchesMonthly;
      break;
    }
  }

  const allowed = current < max;
  const message = allowed
    ? undefined
    : `Batas kuota ${resource} untuk paket ${planName || planCode} telah tercapai (${current}/${max}). Silakan upgrade paket langganan Anda.`;

  return {
    allowed,
    resource,
    current,
    max,
    planCode,
    message,
  };
}
export const checkResourceLimit = checkResourceLimitAsync;

export async function getBusinessEntitlementSummaryAsync(businessId: string): Promise<BusinessEntitlementSummary | null> {
  const bizRow = await dbAdapter.queryOne('SELECT id, name, status, plan FROM businesses WHERE id = ?', [businessId]);
  if (!bizRow) return null;

  const subRow = await getActiveSubscriptionRowAsync(businessId);
  if (!subRow) return null;

  const lifecycle = evaluateSubscriptionLifecycle(subRow);

  let planFeatures: FeatureKey[] = [];
  let planLimits: PlanLimits = {
    maxUsers: 5,
    maxProducts: 100,
    maxRawMaterials: 50,
    maxBoms: 50,
    maxBatchesMonthly: 100,
  };

  try {
    if (subRow.features_json) planFeatures = JSON.parse(subRow.features_json);
    if (subRow.limits_json) planLimits = JSON.parse(subRow.limits_json);
  } catch {}

  const ALL_FEATURES: FeatureKey[] = [
    'HPP',
    'BOM',
    'PRODUKSI',
    'INVENTORY',
    'SUPPLIER',
    'PELANGGAN',
    'PURCHASE',
    'PROFITABILITY',
    'REPORT',
    'EXPORT',
    'MULTI_USER',
    'ADVANCED_REPORT',
    'API',
    'AUDIT_LOG',
  ];

  const featuresMap: Record<FeatureKey, boolean> = {} as any;
  for (const f of ALL_FEATURES) {
    featuresMap[f] = planFeatures.includes(f);
  }

  const uRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM users WHERE business_id = ? AND (active = 1 OR active = TRUE)', [businessId]);
  const pRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM products WHERE business_id = ?', [businessId]);
  const rmRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM raw_materials WHERE business_id = ?', [businessId]);
  const bRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM boms WHERE business_id = ?', [businessId]);

  const monthPrefix = new Date().toISOString().substring(0, 7);
  const btRes = await dbAdapter.queryOne<{ c: number }>("SELECT COUNT(*) as c FROM production_batches WHERE business_id = ? AND (date LIKE ? OR id LIKE ?)", [businessId, `${monthPrefix}%`, `%${monthPrefix}%`]);

  const usersCount = Number(uRes?.c || 0);
  const productsCount = Number(pRes?.c || 0);
  const materialsCount = Number(rmRes?.c || 0);
  const bomsCount = Number(bRes?.c || 0);
  const batchesThisMonth = Number(btRes?.c || 0);

  return {
    businessId: bizRow.id,
    businessName: bizRow.name,
    businessStatus: bizRow.status,
    plan: {
      id: subRow.plan_id,
      code: subRow.plan_code,
      name: subRow.plan_name,
      priceMonthly: subRow.price_monthly,
      priceYearly: subRow.price_yearly,
    },
    subscription: {
      id: subRow.id,
      status: lifecycle.status,
      billingCycle: subRow.billing_cycle,
      startDate: subRow.start_date,
      endDate: subRow.end_date,
      trialStart: subRow.trial_start,
      trialEnd: subRow.trial_end,
      paymentReference: subRow.payment_reference,
      isReadOnly: lifecycle.isReadOnly,
      inGracePeriod: lifecycle.inGracePeriod,
      gracePeriodEndsAt: lifecycle.gracePeriodEndsAt,
      daysRemaining: lifecycle.daysRemaining,
    },
    features: featuresMap,
    usage: {
      users: {
        current: usersCount,
        max: planLimits.maxUsers,
        percentage: Math.min(100, Math.round((usersCount / planLimits.maxUsers) * 100)),
      },
      products: {
        current: productsCount,
        max: planLimits.maxProducts,
        percentage: Math.min(100, Math.round((productsCount / planLimits.maxProducts) * 100)),
      },
      rawMaterials: {
        current: materialsCount,
        max: planLimits.maxRawMaterials,
        percentage: Math.min(100, Math.round((materialsCount / planLimits.maxRawMaterials) * 100)),
      },
      boms: {
        current: bomsCount,
        max: planLimits.maxBoms,
        percentage: Math.min(100, Math.round((bomsCount / planLimits.maxBoms) * 100)),
      },
      batchesMonthly: {
        current: batchesThisMonth,
        max: planLimits.maxBatchesMonthly,
        percentage: Math.min(100, Math.round((batchesThisMonth / planLimits.maxBatchesMonthly) * 100)),
      },
    },
  };
}

export async function validatePlanChangeSafetyAsync(businessId: string, targetPlanCode: string): Promise<{ safe: boolean; errors: string[] }> {
  const targetPlan = await dbAdapter.queryOne('SELECT * FROM plans WHERE code = ? AND (is_active = 1 OR is_active = TRUE)', [targetPlanCode]);
  if (!targetPlan) {
    return { safe: false, errors: [`Paket target ${targetPlanCode} tidak ditemukan.`] };
  }

  let targetLimits: PlanLimits = {
    maxUsers: 5,
    maxProducts: 100,
    maxRawMaterials: 50,
    maxBoms: 50,
    maxBatchesMonthly: 100,
  };

  try {
    if (targetPlan.limits_json) targetLimits = JSON.parse(targetPlan.limits_json);
  } catch {}

  const errors: string[] = [];

  const uRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM users WHERE business_id = ? AND (active = 1 OR active = TRUE)', [businessId]);
  const userCount = Number(uRes?.c || 0);
  if (userCount > targetLimits.maxUsers) {
    errors.push(`Jumlah staf aktif (${userCount}) melebihi kuota paket target (${targetLimits.maxUsers} akun).`);
  }

  const pRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM products WHERE business_id = ?', [businessId]);
  const prodCount = Number(pRes?.c || 0);
  if (prodCount > targetLimits.maxProducts) {
    errors.push(`Jumlah SKU produk (${prodCount}) melebihi kuota paket target (${targetLimits.maxProducts} SKU).`);
  }

  const rmRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM raw_materials WHERE business_id = ?', [businessId]);
  const rmCount = Number(rmRes?.c || 0);
  if (rmCount > targetLimits.maxRawMaterials) {
    errors.push(`Jumlah bahan baku (${rmCount}) melebihi kuota paket target (${targetLimits.maxRawMaterials} bahan).`);
  }

  const bRes = await dbAdapter.queryOne<{ c: number }>('SELECT COUNT(*) as c FROM boms WHERE business_id = ?', [businessId]);
  const bomCount = Number(bRes?.c || 0);
  if (bomCount > targetLimits.maxBoms) {
    errors.push(`Jumlah resep BOM (${bomCount}) melebihi kuota paket target (${targetLimits.maxBoms} BOM).`);
  }

  return {
    safe: errors.length === 0,
    errors,
  };
}

export const getBusinessEntitlementSummary = getBusinessEntitlementSummaryAsync;
export const validatePlanChangeSafety = validatePlanChangeSafetyAsync;
