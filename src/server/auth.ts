import { Request, Response, NextFunction } from 'express';
import { db, hashPasswordServer, generateSaltServer, verifyPasswordServer, dbQueryOne, dbExecute, isUsingPostgres } from './db';
import crypto from 'node:crypto';
import { UserProfile, FeatureKey, SaaSSubscriptionStatus, PlanLimits } from '../types';
import {
  evaluateSubscriptionLifecycle,
  checkFeatureEntitlement,
  checkResourceLimit,
} from './entitlements';

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
  inGracePeriod?: boolean;
  gracePeriodEndsAt?: string;
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

export async function createSession(userId: string, businessId: string, durationDays = 7): Promise<string> {
  // Cryptographically secure 32-byte session token
  const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  if (isUsingPostgres()) {
    await dbExecute(
      'INSERT INTO sessions (token, user_id, business_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
      [token, userId, businessId, createdAt, expiresAt]
    );
  }
  db.prepare(`
    INSERT INTO sessions (token, user_id, business_id, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userId, businessId, createdAt, expiresAt);

  return token;
}

export async function invalidateSession(token: string): Promise<void> {
  if (isUsingPostgres()) {
    await dbExecute('DELETE FROM sessions WHERE token = ?', [token]);
  }
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
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

  try {
    let row: any = null;
    if (isUsingPostgres()) {
      row = await dbQueryOne(`
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
      `, [token]);
    } else {
      row = db.prepare(`
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
    }

    if (!row) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Sesi tidak valid atau telah berakhir.',
      });
    }

    // Check expiration
    if (new Date(row.expires_at) <= new Date()) {
      await invalidateSession(token);
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

    // Check business suspended
    if (row.business_status === 'suspended' && row.user_role !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'BusinessSuspended',
        message: 'Akses ditolak: Akun bisnis ini sedang ditangguhkan. Silakan hubungi Administrator.',
      });
    }

    const userObj = typeof row.user_data === 'string' ? JSON.parse(row.user_data) : (row.user_data || {});

    // =========================================================================
    // MULTI-TENANT ISOLATION: USER → MEMBERSHIP → BUSINESS → RESOURCE
    // Never blindly trust businessId provided by frontend headers or queries.
    // =========================================================================
    const requestedBusinessId = (req.headers['x-business-id'] as string) || (req.query.businessId as string);

    let activeBusinessId = row.business_id;
    let activeBusinessName = row.business_name;
    let activeBusinessPlan = row.business_plan;
    let activeUserRole = row.user_role;

    if (requestedBusinessId && requestedBusinessId !== row.business_id) {
      if (row.user_role === 'SUPER_ADMIN') {
        // Super Admin has platform-level oversight
        let targetBiz: any = null;
        if (isUsingPostgres()) {
          targetBiz = await dbQueryOne('SELECT id, name, plan, status FROM businesses WHERE id = ?', [requestedBusinessId]);
        } else {
          targetBiz = db.prepare('SELECT id, name, plan, status FROM businesses WHERE id = ?').get(requestedBusinessId) as any;
        }
        if (!targetBiz) {
          return res.status(404).json({ error: 'NotFound', message: 'Bisnis target tidak ditemukan.' });
        }
        activeBusinessId = targetBiz.id;
        activeBusinessName = targetBiz.name;
        activeBusinessPlan = targetBiz.plan;
      } else {
        // Regular user: Server-side validation of active membership in requested business
        let membership: any = null;
        if (isUsingPostgres()) {
          membership = await dbQueryOne(`
            SELECT u.id, u.role, u.active, b.name as business_name, b.plan as business_plan, b.status as business_status
            FROM users u
            JOIN businesses b ON u.business_id = b.id
            WHERE u.business_id = ? AND LOWER(u.email) = ? AND (u.active = 1 OR u.active = true)
          `, [requestedBusinessId, row.user_email.toLowerCase()]);
        } else {
          membership = db.prepare(`
            SELECT u.id, u.role, u.active, b.name as business_name, b.plan as business_plan, b.status as business_status
            FROM users u
            JOIN businesses b ON u.business_id = b.id
            WHERE u.business_id = ? AND LOWER(u.email) = ? AND u.active = 1
          `).get(requestedBusinessId, row.user_email.toLowerCase()) as any;
        }

        if (!membership) {
          // User A -> Business B: DITOLAK (Strict isolation)
          return res.status(403).json({
            error: 'TenantAccessDenied',
            message: 'Akses ditolak: Anda tidak memiliki keanggotaan (membership) aktif pada bisnis ini.',
          });
        }

        if (membership.business_status === 'suspended') {
          return res.status(403).json({
            error: 'BusinessSuspended',
            message: 'Akses ditolak: Bisnis yang diminta sedang ditangguhkan.',
          });
        }

        activeBusinessId = requestedBusinessId;
        activeBusinessName = membership.business_name;
        activeBusinessPlan = membership.business_plan;
        activeUserRole = membership.role;
      }
    }

    req.auth = {
      token: row.token,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userRole: activeUserRole,
      userAvatar: userObj.avatar || '',
      userPhone: userObj.phone || '',
      businessId: activeBusinessId,
      businessName: activeBusinessName,
      businessPlan: activeBusinessPlan,
      isSuperAdmin: row.user_role === 'SUPER_ADMIN',
    };
    req.businessId = activeBusinessId;

    next();
  } catch (err: any) {
    console.error('[Auth Error Details]', { message: err.message, stack: err.stack });
    return res.status(500).json({
      error: 'ServerError',
      message: 'Terjadi kesalahan sistem saat memverifikasi otentikasi.',
    });
  }
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

  // 3. Centralized Lifecycle Evaluation (TRIAL, ACTIVE, PAST_DUE, EXPIRED, CANCELLED, SUSPENDED)
  const lifecycle = evaluateSubscriptionLifecycle(subRow);

  // 4. Graceful Expiration & Read-Only enforcement:
  // If subscription is EXPIRED, CANCELLED, or isReadOnly is true:
  // Block any state mutations (POST, PUT, DELETE), but allow GET so users can always read and export their data!
  if ((lifecycle.status === 'EXPIRED' || lifecycle.status === 'CANCELLED' || lifecycle.isReadOnly) && req.method !== 'GET') {
    return res.status(403).json({
      error: 'SUBSCRIPTION_EXPIRED_READ_ONLY',
      status: lifecycle.status,
      isReadOnly: true,
      message: 'Masa aktif langganan atau trial bisnis Anda telah berakhir (Mode Baca-Saja). Anda tetap dapat melihat dan mengekspor data, namun penambahan dan perubahan data dinonaktifkan.',
    });
  }

  // Grace Period Warning header for frontend notifications
  if (lifecycle.inGracePeriod) {
    res.setHeader('X-Subscription-Past-Due', 'true');
    if (lifecycle.gracePeriodEndsAt) {
      res.setHeader('X-Subscription-Grace-End', lifecycle.gracePeriodEndsAt);
    }
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
    status: lifecycle.status,
    isReadOnly: lifecycle.isReadOnly,
    inGracePeriod: lifecycle.inGracePeriod,
    gracePeriodEndsAt: lifecycle.gracePeriodEndsAt,
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

    const bizId = req.businessId;
    if (!bizId) {
      return res.status(400).json({ error: 'BadRequest', message: 'Business ID tidak valid.' });
    }

    const check = checkFeatureEntitlement(bizId, feature);
    if (!check.allowed) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        feature,
        currentPlan: check.planCode,
        message: check.reason || `Fitur '${feature}' tidak tersedia pada paket Anda (${check.planName}). Silakan tingkatkan paket Anda.`,
      });
    }

    next();
  };
}

export function requireResourceLimit(resource: 'users' | 'products' | 'raw_materials' | 'boms' | 'batches') {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.auth?.userRole === 'SUPER_ADMIN') {
      return next();
    }

    const bizId = req.businessId;
    if (!bizId) return next();

    const limitCheck = checkResourceLimit(bizId, resource);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'PLAN_LIMIT_REACHED',
        resource,
        current: limitCheck.current,
        max: limitCheck.max,
        currentPlan: limitCheck.planCode,
        message: limitCheck.message,
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

    // Platform Super Admin has oversight
    if (role === 'SUPER_ADMIN') {
      return next();
    }

    // Role-Based Access Validation against allowedRoles matrix
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Akses ditolak: Peran '${role}' tidak memiliki hak akses untuk modul atau tindakan ini.`,
      });
    }

    // Viewer role can strictly only perform 'view' or 'export' actions
    if (role === 'Viewer' && action !== 'view' && action !== 'export') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Akses ditolak: Akun Viewer hanya memiliki izin baca (view-only).',
      });
    }

    // Disallow delete for non-administrators
    if (action === 'delete' && role !== 'Administrator' && role !== 'Manager / Owner') {
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

export { logAdminAudit } from './audit';

