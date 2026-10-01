import { db } from './db';
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
        db.prepare("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1, updated_at = ? WHERE id = ?")
          .run(new Date().toISOString(), subRow.id);
        db.prepare("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?").run(subRow.business_id);
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
          db.prepare("UPDATE subscriptions SET status = 'PAST_DUE', updated_at = ? WHERE id = ?")
            .run(new Date().toISOString(), subRow.id);
        } catch {}
      } else {
        // Passed grace period -> EXPIRED
        status = 'EXPIRED';
        isReadOnly = true;
        try {
          db.prepare("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1, updated_at = ? WHERE id = ?")
            .run(new Date().toISOString(), subRow.id);
          db.prepare("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?").run(subRow.business_id);
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
        db.prepare("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1, updated_at = ? WHERE id = ?")
          .run(new Date().toISOString(), subRow.id);
        db.prepare("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?").run(subRow.business_id);
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
 * Fetch raw active subscription row with joined plan
 */
export function getActiveSubscriptionRow(businessId: string): any {
  return db.prepare(`
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
  `).get(businessId);
}

/**
 * Single Source of Truth: Check if a business has entitlement for a specific feature
 */
export function checkFeatureEntitlement(businessId: string, feature: FeatureKey): EntitlementCheckResult {
  const bizRow = db.prepare('SELECT status FROM businesses WHERE id = ?').get(businessId) as any;
  if (!bizRow) {
    return {
      allowed: false,
      reason: 'Bisnis tidak ditemukan.',
      feature,
      planCode: 'UNKNOWN',
      planName: 'Unknown',
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

  const subRow = getActiveSubscriptionRow(businessId);
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

/**
 * Single Source of Truth: Enforce Plan Resource Quotas & Limits
 */
export function checkResourceLimit(
  businessId: string,
  resource: 'users' | 'products' | 'raw_materials' | 'boms' | 'batches'
): LimitCheckResult {
  const subRow = getActiveSubscriptionRow(businessId);
  const planCode = subRow?.plan_code || 'STARTER';

  let limits: PlanLimits = {
    maxUsers: 5,
    maxProducts: 100,
    maxRawMaterials: 50,
    maxBoms: 50,
    maxBatchesMonthly: 100,
  };

  try {
    if (subRow?.limits_json) {
      limits = JSON.parse(subRow.limits_json);
    }
  } catch {}

  let current = 0;
  let max = 0;

  switch (resource) {
    case 'users':
      current = (db.prepare('SELECT COUNT(*) as count FROM users WHERE business_id = ? AND active = 1').get(businessId) as any).count;
      max = limits.maxUsers;
      break;
    case 'products':
      current = (db.prepare('SELECT COUNT(*) as count FROM products WHERE business_id = ?').get(businessId) as any).count;
      max = limits.maxProducts;
      break;
    case 'raw_materials':
      current = (db.prepare('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?').get(businessId) as any).count;
      max = limits.maxRawMaterials;
      break;
    case 'boms':
      current = (db.prepare('SELECT COUNT(*) as count FROM boms WHERE business_id = ?').get(businessId) as any).count;
      max = limits.maxBoms;
      break;
    case 'batches': {
      const monthPrefix = new Date().toISOString().substring(0, 7);
      current = (db.prepare("SELECT COUNT(*) as count FROM production_batches WHERE business_id = ? AND (date LIKE ? OR id LIKE ?)").get(businessId, `${monthPrefix}%`, `%${monthPrefix}%`) as any).count;
      max = limits.maxBatchesMonthly;
      break;
    }
  }

  const allowed = current < max;
  const message = allowed
    ? undefined
    : `Batas kuota ${resource} untuk paket ${subRow?.plan_name || planCode} telah tercapai (${current}/${max}). Silakan upgrade paket langganan Anda.`;

  return {
    allowed,
    resource,
    current,
    max,
    planCode,
    message,
  };
}

/**
 * Validate Downgrade: Ensures existing data volume does not silently get orphaned when downgrading
 */
export function validatePlanChangeSafety(businessId: string, targetPlanCode: string): { safe: boolean; errors: string[] } {
  const targetPlan = db.prepare('SELECT * FROM plans WHERE code = ? AND is_active = 1').get(targetPlanCode) as any;
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

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE business_id = ? AND active = 1').get(businessId) as any).c;
  if (userCount > targetLimits.maxUsers) {
    errors.push(`Jumlah staf aktif (${userCount}) melebihi kuota paket target (${targetLimits.maxUsers} akun).`);
  }

  const prodCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE business_id = ?').get(businessId) as any).c;
  if (prodCount > targetLimits.maxProducts) {
    errors.push(`Jumlah SKU produk (${prodCount}) melebihi kuota paket target (${targetLimits.maxProducts} SKU).`);
  }

  const rmCount = (db.prepare('SELECT COUNT(*) as c FROM raw_materials WHERE business_id = ?').get(businessId) as any).c;
  if (rmCount > targetLimits.maxRawMaterials) {
    errors.push(`Jumlah bahan baku (${rmCount}) melebihi kuota paket target (${targetLimits.maxRawMaterials} bahan).`);
  }

  const bomCount = (db.prepare('SELECT COUNT(*) as c FROM boms WHERE business_id = ?').get(businessId) as any).c;
  if (bomCount > targetLimits.maxBoms) {
    errors.push(`Jumlah resep BOM (${bomCount}) melebihi kuota paket target (${targetLimits.maxBoms} BOM).`);
  }

  return {
    safe: errors.length === 0,
    errors,
  };
}

/**
 * Generate full entitlement summary for API sync to frontend
 */
export function getBusinessEntitlementSummary(businessId: string): BusinessEntitlementSummary | null {
  const bizRow = db.prepare('SELECT id, name, status, plan FROM businesses WHERE id = ?').get(businessId) as any;
  if (!bizRow) return null;

  const subRow = getActiveSubscriptionRow(businessId);
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

  const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE business_id = ? AND active = 1').get(businessId) as any).c;
  const productsCount = (db.prepare('SELECT COUNT(*) as c FROM products WHERE business_id = ?').get(businessId) as any).c;
  const rawMaterialsCount = (db.prepare('SELECT COUNT(*) as c FROM raw_materials WHERE business_id = ?').get(businessId) as any).c;
  const bomsCount = (db.prepare('SELECT COUNT(*) as c FROM boms WHERE business_id = ?').get(businessId) as any).c;
  const monthPrefix = new Date().toISOString().substring(0, 7);
  const batchesCount = (db.prepare("SELECT COUNT(*) as c FROM production_batches WHERE business_id = ? AND (date LIKE ? OR id LIKE ?)").get(businessId, `${monthPrefix}%`, `%${monthPrefix}%`) as any).c;

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
        current: rawMaterialsCount,
        max: planLimits.maxRawMaterials,
        percentage: Math.min(100, Math.round((rawMaterialsCount / planLimits.maxRawMaterials) * 100)),
      },
      boms: {
        current: bomsCount,
        max: planLimits.maxBoms,
        percentage: Math.min(100, Math.round((bomsCount / planLimits.maxBoms) * 100)),
      },
      batchesMonthly: {
        current: batchesCount,
        max: planLimits.maxBatchesMonthly,
        percentage: Math.min(100, Math.round((batchesCount / planLimits.maxBatchesMonthly) * 100)),
      },
    },
  };
}
