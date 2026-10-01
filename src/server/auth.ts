import { Request, Response, NextFunction } from 'express';
import { db, hashPasswordServer, generateSaltServer, verifyPasswordServer } from './db';
import crypto from 'node:crypto';
import { UserProfile, FeatureKey, SaaSSubscriptionStatus, PlanLimits } from '../types';

export interface AuthContext {
  token: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserProfile['role'];
  userAvatar: string;
  userPhone: string;
  businessId: string;
  businessName: string;
  businessPlan: string;
  isSuperAdmin?: boolean;
}

export interface ActiveSubscriptionContext {
  id: string;
  businessId: string;
  planId: string;
  planCode: string;
  planName: string;
  status: SaaSSubscriptionStatus;
  isReadOnly: boolean;
  features: FeatureKey[];
  limits: PlanLimits;
  trialEnd?: string;
  endDate: string;
}

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      businessId?: string;
      subscription?: ActiveSubscriptionContext;
    }
  }
}

export function createSession(userId: string, businessId: string, durationDays = 7): string {
  const token = `sess_${Date.now().toString(36)}_${crypto.randomBytes(16).toString('hex')}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, user_id, business_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userId, businessId, createdAt, expiresAt);

  return token;
}

export function invalidateSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token otentikasi tidak ditemukan. Harap masuk terlebih dahulu.',
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token otentikasi kosong.',
    });
  }

  const row = db.prepare(`
    SELECT
      s.token,
      s.user_id,
      s.business_id,
      s.expires_at,
      u.name as user_name,
      u.email as user_email,
      u.username,
      u.role as user_role,
      u.active as user_active,
      u.data_json as user_data,
      b.name as business_name,
      b.plan as business_plan,
      b.status as business_status
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    JOIN businesses b ON s.business_id = b.id
    WHERE s.token = ?
  `).get(token) as any;

  if (!row) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Sesi tidak valid atau telah berakhir.',
    });
  }

  // Check expiration
  if (new Date(row.expires_at) <= new Date()) {
    invalidateSession(token);
    return res.status(401).json({
      error: 'SessionExpired',
      message: 'Sesi login telah kedaluwarsa. Silakan masuk kembali.',
    });
  }

  // Check user active
  if (!row.user_active) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Akun Anda telah dinonaktifkan oleh administrator.',
    });
  }

  const userObj = row.user_data ? JSON.parse(row.user_data) : {};

  req.auth = {
    token: row.token,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    userRole: row.user_role,
    userAvatar: userObj.avatar || '',
    userPhone: userObj.phone || '',
    businessId: row.business_id,
    businessName: row.business_name,
    businessPlan: row.business_plan,
    isSuperAdmin: row.user_role === 'SUPER_ADMIN',
  };
  req.businessId = row.business_id;

  next();
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Otentikasi diperlukan.' });
  }

  if (req.auth.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN_SUPER_ADMIN_ONLY',
      message: 'Akses ditolak: Portal Super Admin hanya dapat diakses oleh Administrator Platform SaaS.',
    });
  }

  next();
}

export function enforceSubscriptionAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Otentikasi diperlukan.' });
  }

  // Super Admin is exempt from individual business subscription gating
  if (req.auth.userRole === 'SUPER_ADMIN') {
    return next();
  }

  const bizId = req.businessId;
  if (!bizId) {
    return res.status(400).json({ error: 'BadRequest', message: 'Business ID tidak valid.' });
  }

  // 1. Check business status
  const bizRow = db.prepare('SELECT status, data_json FROM businesses WHERE id = ?').get(bizId) as any;
  if (!bizRow) {
    return res.status(404).json({ error: 'NotFound', message: 'Data bisnis tidak ditemukan.' });
  }

  const bizStatus = String(bizRow.status).toUpperCase();
  if (bizStatus === 'SUSPENDED') {
    return res.status(403).json({
      error: 'BUSINESS_SUSPENDED',
      message: 'Akun bisnis Anda telah dinonaktifkan / disuspensi oleh Administrator Platform.',
    });
  }

  // 2. Fetch active subscription with plan features and limits
  let subRow = db.prepare(`
    SELECT
      s.*,
      p.code as plan_code,
      p.name as plan_name,
      p.features_json,
      p.limits_json
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.created_at DESC
    LIMIT 1
  `).get(bizId) as any;

  // Fallback: If no subscription record exists yet, create trial subscription on STARTER
  if (!subRow) {
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const subId = `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO subscriptions (
        id, business_id, plan_id, status, billing_cycle,
        start_date, end_date, trial_start, trial_end, is_read_only, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(subId, bizId, 'plan_starter', 'TRIAL', 'MONTHLY', now.toISOString(), trialEnd, now.toISOString(), trialEnd, 0, 'Auto-provisioned trial', now.toISOString(), now.toISOString());

    subRow = db.prepare(`
      SELECT s.*, p.code as plan_code, p.name as plan_name, p.features_json, p.limits_json
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.id = ?
    `).get(subId) as any;
  }

  let subStatus = String(subRow.status).toUpperCase();
  let isReadOnly = Boolean(subRow.is_read_only);

  // 3. Check trial expiration
  if (subStatus === 'TRIAL' && subRow.trial_end) {
    const trialEndTime = new Date(subRow.trial_end).getTime();
    if (Date.now() > trialEndTime) {
      subStatus = 'EXPIRED';
      isReadOnly = true;
      db.prepare("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = 1 WHERE id = ?").run(subRow.id);
      db.prepare("UPDATE businesses SET status = 'EXPIRED' WHERE id = ?").run(bizId);
    }
  }

  // 4. Graceful Expiration & Read-Only enforcement:
  // If subscription is EXPIRED, CANCELLED, or is_read_only is 1:
  // Block any state mutations (POST, PUT, DELETE), but allow GET so users can still read and export their data!
  if ((subStatus === 'EXPIRED' || subStatus === 'CANCELLED' || isReadOnly) && req.method !== 'GET') {
    return res.status(403).json({
      error: 'SUBSCRIPTION_EXPIRED_READ_ONLY',
      status: subStatus,
      isReadOnly: true,
      message: 'Masa aktif langganan atau trial bisnis Anda telah berakhir (Mode Baca-Saja). Anda tetap dapat melihat data, namun penambahan dan perubahan data dinonaktifkan.',
    });
  }

  let features: FeatureKey[] = [];
  let limits: PlanLimits = {
    maxUsers: 5,
    maxProducts: 100,
    maxRawMaterials: 50,
    maxBoms: 50,
    maxBatchesMonthly: 100,
  };

  try {
    if (subRow.features_json) features = JSON.parse(subRow.features_json);
    if (subRow.limits_json) limits = JSON.parse(subRow.limits_json);
  } catch (e) {
    console.error('Error parsing plan features/limits json:', e);
  }

  req.subscription = {
    id: subRow.id,
    businessId: bizId,
    planId: subRow.plan_id,
    planCode: subRow.plan_code,
    planName: subRow.plan_name,
    status: subStatus as SaaSSubscriptionStatus,
    isReadOnly,
    features,
    limits,
    trialEnd: subRow.trial_end,
    endDate: subRow.end_date,
  };

  next();
}

export function requireFeature(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Super Admin has all features
    if (req.auth?.userRole === 'SUPER_ADMIN') {
      return next();
    }

    if (!req.subscription) {
      return next();
    }

    if (!req.subscription.features.includes(feature)) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        feature,
        currentPlan: req.subscription.planCode,
        message: `Fitur '${feature}' tidak tersedia pada paket Anda (${req.subscription.planName}). Silakan hubungi Super Admin untuk meningkatkan paket Anda.`,
      });
    }

    next();
  };
}

export type RbacAction = 'view' | 'create' | 'edit' | 'delete' | 'export';

export function requireRole(allowedRoles: Array<UserProfile['role']>, action: RbacAction = 'view') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Otentikasi diperlukan.' });
    }

    const role = req.auth.userRole;

    // SUPER_ADMIN, Administrator, & Manager/Owner have full access
    if (role === 'SUPER_ADMIN' || role === 'Administrator' || role === 'Manager / Owner') {
      return next();
    }

    // Viewer can only perform 'view' and 'export' actions
    if (role === 'Viewer' && action !== 'view' && action !== 'export') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Akses ditolak: Akun Viewer hanya memiliki hak baca (view-only).',
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Akses ditolak: Peran '${role}' tidak diizinkan mengakses modul ini.`,
      });
    }

    // Disallow delete for non-administrators
    if (action === 'delete' && (role as string) !== 'Administrator' && (role as string) !== 'Manager / Owner') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Akses ditolak: Peran '${role}' tidak memiliki izin untuk menghapus data.`,
      });
    }

    next();
  };
}

export function logAudit(
  businessId: string,
  userId: string,
  userName: string,
  action: string,
  module: string,
  details: string,
  ipAddress = '127.0.0.1'
) {
  try {
    const id = `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const item = {
      id,
      businessId,
      tenantId: businessId,
      userId,
      userName,
      action,
      type: action,
      module,
      details,
      timestamp,
      ipAddress,
    };

    db.prepare(`
      INSERT INTO activity_logs (id, business_id, user_id, action, module, timestamp, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, businessId, userId, action, module, timestamp, JSON.stringify(item));
  } catch (err) {
    console.error('[AuditLog] Failed to write log:', err);
  }
}
