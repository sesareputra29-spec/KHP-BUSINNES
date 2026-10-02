import { Router, Request, Response } from 'express';
import { dbAdapter, hashPasswordServer, generateSaltServer, verifyPasswordServer, logAdminAudit, dbQuery, dbQueryOne, dbExecute, isUsingPostgres } from './db';
import {
  authenticate,
  requireRole,
  logAudit,
  createSession,
  invalidateSession,
  requireSuperAdmin,
  enforceSubscriptionAccess,
  requireFeature,
  requireResourceLimit,
} from './auth';
import { auditDatabaseIntegrity, generatePostgreSqlMigrationScript } from './database-migrator';
import { getBusinessEntitlementSummaryAsync, validatePlanChangeSafetyAsync } from './entitlements';
import { paymentService } from './payment/payment-service';
import { emailService } from './email/email-service';
import { backupService } from './backup/backup-service';
import { logSecurityAudit, logBusinessActivity } from './audit';
import { recordError, getRecentErrors } from './error-handler';
import {
  requireCronSecret,
  runSubscriptionLifecycleJob,
  runRetentionCleanupJob,
  runAutomatedBackupJob,
} from './cron/cron-handler';
import crypto from 'node:crypto';
import { mockTenants } from '../data/mockData';
import { FeatureKey } from '../types';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & BUSINESS SESSIONS
// ==========================================

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email/username dan password wajib diisi.' });
    }

    const trimmed = String(identifier).trim().toLowerCase();
    const userRow = await dbAdapter.auth.findUserByIdentifier(trimmed);

    if (!userRow) {
      logSecurityAudit({
        action: 'login_failure',
        category: 'AUTH',
        result: 'FAILURE',
        details: `Percobaan login gagal untuk identifier: ${trimmed}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Email/username atau kata sandi tidak cocok.' });
    }

    if (!userRow.active) {
      logSecurityAudit({
        action: 'login_failure',
        category: 'AUTH',
        result: 'BLOCKED',
        businessId: userRow.business_id,
        userId: userRow.id,
        userName: userRow.name,
        userEmail: userRow.email,
        userRole: userRow.role,
        details: 'Percobaan login ditolak karena akun telah dinonaktifkan.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return res.status(403).json({ error: 'AccountDisabled', message: 'Akun ini telah dinonaktifkan. Hubungi administrator.' });
    }

    const isValid = verifyPasswordServer(password, userRow.salt, userRow.password_hash);
    if (!isValid) {
      logSecurityAudit({
        action: 'login_failure',
        category: 'AUTH',
        result: 'FAILURE',
        businessId: userRow.business_id,
        userId: userRow.id,
        userName: userRow.name,
        userEmail: userRow.email,
        userRole: userRow.role,
        details: 'Kata sandi tidak cocok.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return res.status(401).json({ error: 'InvalidCredentials', message: 'Email/username atau kata sandi tidak cocok.' });
    }

    // Update last login
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    await dbAdapter.auth.updateLastLogin(userRow.id, nowStr);

    // Create session in PostgreSQL (production) or SQLite (dev)
    const token = await createSession(userRow.id, userRow.business_id);

    // Log Security Audit
    logSecurityAudit({
      action: 'login_success',
      category: 'AUTH',
      result: 'SUCCESS',
      businessId: userRow.business_id,
      userId: userRow.id,
      userName: userRow.name,
      userEmail: userRow.email,
      userRole: userRow.role,
      details: `Pengguna ${userRow.name} (${userRow.role}) berhasil masuk ke sistem.`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    // Log business activity
    logAudit(
      userRow.business_id,
      userRow.id,
      userRow.name,
      'Login',
      'Autentikasi',
      `Pengguna ${userRow.name} (${userRow.role}) berhasil masuk ke sistem.`,
      req.ip || '127.0.0.1'
    );

    const userObj = typeof userRow.data_json === 'string' ? JSON.parse(userRow.data_json) : (userRow.data_json || {});
    userObj.lastLogin = nowStr;

    return res.json({
      success: true,
      token,
      user: userObj,
      isSuperAdmin: userRow.role === 'SUPER_ADMIN',
      business: {
        id: userRow.business_id,
        name: userRow.business_name,
        plan: userRow.business_plan,
        status: userRow.business_status,
      },
    });
  } catch (err: any) {
    console.error('[Login Error]', { message: err.message });
    const rec = recordError(err, req);
    return res.status(500).json({
      error: 'ServerError',
      errorId: rec.errorId,
      message: 'Terjadi kesalahan internal server saat login. Kode insiden: ' + rec.errorId,
    });
  }
});

// ============================================================================
// 1. PUBLIC & AUTHENTICATION ENDPOINTS
// ============================================================================

// Public Plan & Pricing endpoint
apiRouter.get('/public/plans', async (req: Request, res: Response) => {
  try {
    const plans = await dbAdapter.query(`
      SELECT
        id, code, name, description, price_monthly, price_yearly,
        billing_period, trial_days, is_active, features_json, limits_json
      FROM plans
      WHERE is_active = true OR is_active = 1
      ORDER BY price_monthly ASC
    `);

    const formatted = plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      priceMonthly: Number(p.price_monthly),
      priceYearly: Number(p.price_yearly),
      billingPeriod: p.billing_period,
      trialDays: p.trial_days,
      features: typeof p.features_json === 'string' ? JSON.parse(p.features_json) : (p.features_json || []),
      limits: typeof p.limits_json === 'string' ? JSON.parse(p.limits_json) : (p.limits_json || []),
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: 'Gagal memuat paket SaaS publik.' });
  }
});

apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, businessName, businessType, phone } = req.body;

    // Minimum field validation (Requirement 9)
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'BadRequest', message: 'Harap isi nama lengkap, email, dan kata sandi.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'BadRequest', message: 'Kata sandi minimal 6 karakter.' });
    }

    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ error: 'BadRequest', message: 'Konfirmasi kata sandi tidak cocok.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ error: 'BadRequest', message: 'Format alamat email tidak valid.' });
    }

    // Check if email already used
    const existing = await dbAdapter.auth.findUserByIdentifier(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: 'Alamat email sudah terdaftar di sistem. Silakan gunakan email lain atau login.' });
    }

    const businessId = `biz_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const userId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer(password, salt);
    const createdAt = new Date().toISOString();

    const actualBizName = businessName && businessName.trim() ? businessName.trim() : `Bisnis ${name.trim()}`;
    const actualBizType = businessType && businessType.trim() ? businessType.trim() : 'F&B / Kuliner';

    const logoText = actualBizName
      .split(' ')
      .slice(0, 3)
      .map((w: string) => w[0]?.toUpperCase())
      .join('') || 'BIZ';

    const businessObj = {
      id: businessId,
      name: actualBizName,
      code: logoText,
      industry: actualBizType,
      businessType: actualBizType,
      plan: 'STARTER',
      logoText,
      skuCount: 0,
      maxSku: 100,
      status: 'active',
      email: cleanEmail,
      phone: phone || '',
      currency: 'IDR',
      onboardingStatus: 'IN_PROGRESS',
      onboardingStep: 1,
      createdAt,
    };

    const userObj = {
      id: userId,
      businessId,
      tenantId: businessId,
      name: name.trim(),
      username: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'Manager / Owner',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      phone: phone || '',
      active: true,
      createdAt,
      lastLogin: null,
    };

    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const subId = `sub_${businessId}`;

    const initialSettings = {
      companyName: actualBizName,
      businessType: actualBizType,
      address: '',
      phone: phone || '',
      email: cleanEmail,
      taxId: '',
      defaultCurrency: 'IDR (Rp)',
      costingMethod: 'FULL_COSTING',
      defaultMarginPct: 35,
      maxShrinkageTolerancePct: 5,
      enableOverheads: true,
      enableLaborTracking: true,
      currency: 'IDR (Rp)',
      defaultCostingMethod: 'FULL_COSTING',
      hppRounding: 100,
      defaultShrinkagePct: 3,
      defaultMarginTargetPct: 35,
      hourlyLaborRateStandard: 25000,
    };

    const defaultUnits = [
      { id: `u_${businessId}_1`, code: 'kg', name: 'Kilogram', businessId, tenantId: businessId },
      { id: `u_${businessId}_2`, code: 'gr', name: 'Gram', businessId, tenantId: businessId },
      { id: `u_${businessId}_3`, code: 'pcs', name: 'Pieces / Buah', businessId, tenantId: businessId },
      { id: `u_${businessId}_4`, code: 'l', name: 'Liter', businessId, tenantId: businessId },
      { id: `u_${businessId}_5`, code: 'ml', name: 'Mililiter', businessId, tenantId: businessId },
      { id: `u_${businessId}_6`, code: 'box', name: 'Box / Kotak', businessId, tenantId: businessId },
      { id: `u_${businessId}_7`, code: 'btl', name: 'Botol', businessId, tenantId: businessId },
      { id: `u_${businessId}_8`, code: 'dus', name: 'Dus', businessId, tenantId: businessId },
    ];

    // 1. Insert Business
    await dbAdapter.insert('businesses', {
      id: businessId,
      name: actualBizName,
      code: logoText,
      industry: actualBizType,
      plan: 'STARTER',
      logo_text: logoText,
      status: 'active',
      currency: 'IDR',
      business_type: actualBizType,
      onboarding_status: 'IN_PROGRESS',
      onboarding_step: 1,
      created_at: createdAt,
      data_json: JSON.stringify(businessObj),
    });

    // 2. Insert User
    await dbAdapter.insert('users', {
      id: userId,
      business_id: businessId,
      name: name.trim(),
      username: userObj.username,
      email: cleanEmail,
      password_hash: pwdHash,
      salt: salt,
      role: 'Manager / Owner',
      active: true,
      email_verified: true,
      last_login: userObj.lastLogin,
      created_at: createdAt,
      data_json: JSON.stringify(userObj),
    });

    // 3. Provision 14-Day Trial Subscription
    const starterPlan = await dbAdapter.queryOne('SELECT id FROM plans WHERE code = ?', ['STARTER']);
    const planId = starterPlan?.id || 'plan_starter';

    await dbAdapter.insert('subscriptions', {
      id: subId,
      business_id: businessId,
      plan_id: planId,
      status: 'TRIAL',
      billing_cycle: 'MONTHLY',
      start_date: trialStart.toISOString(),
      end_date: trialEnd.toISOString(),
      trial_start: trialStart.toISOString(),
      trial_end: trialEnd.toISOString(),
      is_read_only: false,
      notes: 'Uji coba gratis 14 hari paket Starter UMKM',
      created_at: createdAt,
      updated_at: createdAt,
    }, 'ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, end_date = EXCLUDED.end_date, updated_at = EXCLUDED.updated_at');

    // 4. Company Settings
    await dbAdapter.insert('company_settings', {
      business_id: businessId,
      company_name: actualBizName,
      data_json: JSON.stringify(initialSettings),
    }, 'ON CONFLICT (business_id) DO UPDATE SET company_name = EXCLUDED.company_name, data_json = EXCLUDED.data_json');

    // 5. Units
    for (const u of defaultUnits) {
      await dbAdapter.insert('units', {
        id: u.id,
        business_id: businessId,
        name: u.name,
        code: u.code,
        data_json: JSON.stringify(u),
      });
    }

    const token = await createSession(userId, businessId);

    logAudit(
      businessId,
      userId,
      name,
      'Registrasi Pelanggan',
      'Autentikasi',
      `Pelanggan baru ${name} mendaftarkan bisnis "${actualBizName}" dengan masa Trial 14 hari.`,
      req.ip || '127.0.0.1'
    );

    // Non-blocking dispatch of Email Verification
    const verifyToken = crypto.randomBytes(24).toString('hex');
    const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email?token=${verifyToken}&email=${encodeURIComponent(cleanEmail)}`;
    emailService.sendEmailVerification(cleanEmail, {
      name: name.trim(),
      verifyUrl,
      token: verifyToken,
    }).catch((err) => console.error('[Register] Email verification dispatch failed silently:', err));

    return res.status(201).json({
      success: true,
      token,
      user: userObj,
      business: businessObj,
      needsOnboarding: true,
      message: 'Registrasi akun berhasil! Selamat datang di Kalkulator HPP SaaS.',
    });
  } catch (err: any) {
    console.error('[API /auth/register] Error:', err);
    return res.status(500).json({ error: 'ServerError', message: 'Gagal melakukan registrasi: ' + (err.message || 'Error internal') });
  }
});

// Forgot Password endpoint (Requirement 26 & 28)
apiRouter.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Alamat email wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await dbAdapter.auth.findUserByIdentifier(cleanEmail);

    if (!user) {
      // Return identical response to prevent user enumeration
      return res.json({
        success: true,
        message: 'Jika alamat email terdaftar, petunjuk pemulihan kata sandi telah dikirimkan ke email Anda.',
      });
    }

    // Invalidate any previous unused tokens for this user
    await dbAdapter.execute('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0', [user.id]);

    // Cryptographically secure temporary token with 15-minute expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await dbAdapter.auth.createResetToken(user.id, token, expiresAt);

    // Security Hardening: Never return the token in the API response
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Security/DevOnly] Password reset token generated for ${cleanEmail}: ${token} (expires in 15m)`);
    }

    // Non-blocking email dispatch
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
    emailService.sendForgotPassword(cleanEmail, {
      name: user.name,
      resetUrl,
      expiresInMinutes: 15,
    }).catch((err) => console.error('[ForgotPassword] Email dispatch failed silently:', err));

    logSecurityAudit({
      action: 'password_reset_request',
      category: 'AUTH',
      result: 'SUCCESS',
      userId: user.id,
      userName: user.name,
      userEmail: cleanEmail,
      details: `Permintaan token reset kata sandi diajukan untuk ${cleanEmail}.`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    return res.json({
      success: true,
      message: 'Jika alamat email terdaftar, petunjuk pemulihan kata sandi telah dikirimkan ke email Anda.',
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal memproses permohonan reset kata sandi.' });
  }
});

// Reset Password endpoint (Requirement 26 & 28)
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'BadRequest', message: 'Token dan kata sandi baru (minimal 8 karakter) diperlukan.' });
    }

    const tokenRow = await dbAdapter.auth.getResetToken(token);

    if (!tokenRow) {
      logSecurityAudit({
        action: 'password_reset_success',
        category: 'AUTH',
        result: 'FAILURE',
        details: 'Percobaan reset kata sandi dengan token tidak valid.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return res.status(404).json({ error: 'NotFound', message: 'Token reset kata sandi tidak valid atau tidak ditemukan.' });
    }

    if (tokenRow.used === 1 || tokenRow.used === true) {
      logSecurityAudit({
        action: 'password_reset_success',
        category: 'AUTH',
        result: 'BLOCKED',
        userId: tokenRow.user_id,
        details: 'Percobaan menggunakan kembali token reset yang sudah used (single-use violation).',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return res.status(400).json({ error: 'BadRequest', message: 'Token reset kata sandi sudah pernah digunakan (single-use).' });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      logSecurityAudit({
        action: 'password_reset_success',
        category: 'AUTH',
        result: 'FAILURE',
        userId: tokenRow.user_id,
        details: 'Percobaan reset kata sandi dengan token kedaluwarsa.',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      });
      return res.status(400).json({ error: 'BadRequest', message: 'Token reset kata sandi telah kedaluwarsa. Silakan ajukan permohonan baru.' });
    }

    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer(newPassword, salt);

    // Update password, mark token as used, and invalidate any previous active sessions for security
    await dbAdapter.auth.updateUserPassword(tokenRow.user_id, pwdHash, salt);
    await dbAdapter.auth.markResetTokenUsed(tokenRow.id);
    await dbAdapter.auth.invalidateUserSessions(tokenRow.user_id);

    // Non-blocking password reset confirmation email
    const userRow = await dbAdapter.auth.findUserById(tokenRow.user_id);
    if (userRow && userRow.email) {
      emailService.sendPasswordResetSuccess(userRow.email, {
        name: userRow.name,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
        loginUrl: `${req.protocol}://${req.get('host')}/login`,
      }).catch((err) => console.error('[ResetPassword] Confirmation email failed silently:', err));
    }

    logSecurityAudit({
      action: 'password_reset_success',
      category: 'AUTH',
      result: 'SUCCESS',
      userId: tokenRow.user_id,
      userName: userRow?.name,
      userEmail: userRow?.email,
      details: 'Kata sandi berhasil diatur ulang menggunakan token pemulihan.',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });

    return res.json({
      success: true,
      message: 'Kata sandi Anda berhasil diperbarui! Silakan masuk dengan kata sandi baru.',
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal mengatur ulang kata sandi.' });
  }
});

apiRouter.post('/auth/logout', authenticate, async (req: Request, res: Response) => {
  if (req.auth) {
    await invalidateSession(req.auth.token);
    logSecurityAudit({
      action: 'logout',
      category: 'AUTH',
      result: 'SUCCESS',
      businessId: req.auth.businessId,
      userId: req.auth.userId,
      userName: req.auth.userName,
      userEmail: req.auth.userEmail,
      userRole: req.auth.userRole,
      details: 'Pengguna berhasil keluar dari aplikasi.',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
    logAudit(req.auth.businessId, req.auth.userId, req.auth.userName, 'Logout', 'Autentikasi', 'Pengguna keluar dari sistem.');
  }
  return res.json({ success: true, message: 'Berhasil keluar.' });
});

apiRouter.get('/auth/me', authenticate, async (req: Request, res: Response) => {
  const userRow = await dbAdapter.queryOne('SELECT * FROM users WHERE id = ?', [req.auth!.userId]);
  const bizRow = await dbAdapter.queryOne('SELECT * FROM businesses WHERE id = ?', [req.auth!.businessId]);

  if (!userRow || !bizRow) {
    return res.status(404).json({ error: 'NotFound', message: 'Data pengguna atau bisnis tidak ditemukan.' });
  }

  const subRow = await dbAdapter.queryOne(`
    SELECT s.*, p.code as plan_code, p.name as plan_name, p.features_json, p.limits_json
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.created_at DESC
    LIMIT 1
  `, [req.auth!.businessId]);

  const userObj = typeof userRow.data_json === 'string' ? JSON.parse(userRow.data_json) : (userRow.data_json || {});
  userObj.role = userRow.role;

  const bizObj = typeof bizRow.data_json === 'string' ? JSON.parse(bizRow.data_json) : (bizRow.data_json || {});

  return res.json({
    user: userObj,
    business: bizObj,
    subscription: subRow || null,
    isSuperAdmin: userRow.role === 'SUPER_ADMIN',
  });
});

apiRouter.post('/auth/switch-tenant', authenticate, async (req: Request, res: Response) => {
  const { targetBusinessId } = req.body;
  if (!targetBusinessId) {
    return res.status(400).json({ error: 'BadRequest', message: 'Target Business ID wajib disertakan.' });
  }

  const bizRow = await dbAdapter.queryOne('SELECT * FROM businesses WHERE id = ?', [targetBusinessId]);
  if (!bizRow) {
    return res.status(404).json({ error: 'NotFound', message: 'Bisnis target tidak ditemukan.' });
  }

  // Security Hardening: Authorization validation on server
  // Only SUPER_ADMIN or users who have an active account in the target business can switch
  let targetUserRow: any = null;
  if (req.auth!.userRole === 'SUPER_ADMIN') {
    targetUserRow = await dbAdapter.queryOne("SELECT * FROM users WHERE business_id = ? ORDER BY CASE WHEN role = 'Administrator' THEN 1 ELSE 2 END LIMIT 1", [targetBusinessId]) ||
      await dbAdapter.queryOne('SELECT * FROM users WHERE id = ?', [req.auth!.userId]);
  } else {
    targetUserRow = await dbAdapter.queryOne('SELECT * FROM users WHERE business_id = ? AND LOWER(email) = ? AND (active = 1 OR active = TRUE)', [targetBusinessId, req.auth!.userEmail.toLowerCase()]);
  }

  if (!targetUserRow) {
    logSecurityAudit({
      action: 'business_switch',
      category: 'TENANT',
      result: 'BLOCKED',
      businessId: targetBusinessId,
      userId: req.auth!.userId,
      userName: req.auth!.userName,
      userEmail: req.auth!.userEmail,
      details: `Percobaan beralih ke bisnis tidak sah: ${targetBusinessId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Akses ditolak: Anda tidak memiliki akun aktif pada bisnis target.',
    });
  }

  // Invalidate old session, create new session for target business
  await invalidateSession(req.auth!.token);
  const newToken = await createSession(targetUserRow.id, targetBusinessId);

  logSecurityAudit({
    action: 'business_switch',
    category: 'TENANT',
    result: 'SUCCESS',
    businessId: targetBusinessId,
    userId: targetUserRow.id,
    userName: targetUserRow.name,
    userEmail: req.auth!.userEmail,
    userRole: targetUserRow.role,
    details: `Pengguna beralih ruang kerja ke ${bizRow.name} (${targetBusinessId}).`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
  });

  logAudit(
    targetBusinessId,
    targetUserRow.id,
    targetUserRow.name,
    'Switch Tenant',
    'Sistem',
    `Beralih ruang kerja ke ${bizRow.name}.`
  );

  const targetUserObj = typeof targetUserRow.data_json === 'string' ? JSON.parse(targetUserRow.data_json) : (targetUserRow.data_json || {});
  const targetBizObj = typeof bizRow.data_json === 'string' ? JSON.parse(bizRow.data_json) : (bizRow.data_json || {});

  return res.json({
    success: true,
    token: newToken,
    user: targetUserObj,
    business: targetBizObj,
  });
});

// ==========================================
// 2. BUSINESS / TENANT DIRECTORY
// ==========================================

apiRouter.get('/business/current', authenticate, async (req: Request, res: Response) => {
  const row = await dbAdapter.queryOne('SELECT data_json FROM businesses WHERE id = ?', [req.businessId!]);
  if (!row) return res.status(404).json({ error: 'NotFound' });
  const bizObj = typeof row.data_json === 'string' ? JSON.parse(row.data_json) : (row.data_json || {});
  return res.json(bizObj);
});

apiRouter.get('/business/all', authenticate, async (req: Request, res: Response) => {
  // Security Hardening: Super Admin can see all businesses; regular users only see businesses they belong to
  if (req.auth?.userRole === 'SUPER_ADMIN') {
    const rows = await dbAdapter.query('SELECT data_json FROM businesses ORDER BY created_at ASC');
    return res.json(rows.map((r) => (typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json)));
  }

  const rows = await dbAdapter.query(`
    SELECT DISTINCT b.data_json
    FROM businesses b
    JOIN users u ON u.business_id = b.id
    WHERE LOWER(u.email) = ? AND (u.active = 1 OR u.active = TRUE)
    ORDER BY b.created_at ASC
  `, [req.auth!.userEmail.toLowerCase()]);

  return res.json(rows.map((r) => (typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json)));
});

// ==========================================
// 3. USERS MANAGEMENT (SCOPED TO BUSINESS)
// ==========================================

apiRouter.get('/users', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'view'), async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM users WHERE business_id = ? ORDER BY created_at ASC', [req.businessId!]);
  const users = rows.map((r) => (typeof r.data_json === 'string' ? JSON.parse(r.data_json) : r.data_json));
  return res.json(users);
});

apiRouter.post('/users', authenticate, enforceSubscriptionAccess, requireResourceLimit('users'), requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  try {
    const { name, email, role, phone, active = true, avatar, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Nama dan email wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const finalPassword = (password && typeof password === 'string' && password.length >= 8)
      ? password
      : crypto.randomBytes(6).toString('hex') + 'A1!';

    // Role Escalation Check: Business users CANNOT assign SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && req.auth?.userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Akses ditolak: Hanya Platform Super Admin yang berhak memberikan role SUPER_ADMIN.',
      });
    }

    // Check Plan Limits for users
    if (req.subscription?.limits) {
      const countRes = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE business_id = ? AND (active = 1 OR active = TRUE)', [req.businessId!]);
      const activeUserCount = Number(countRes?.count || 0);
      if (activeUserCount >= req.subscription.limits.maxUsers) {
        return res.status(403).json({
          error: 'LIMIT_EXCEEDED',
          resource: 'users',
          max: req.subscription.limits.maxUsers,
          current: activeUserCount,
          message: `Batas kuota pengguna (${req.subscription.limits.maxUsers} user) untuk paket Anda telah tercapai. Upgrade paket untuk menambah lebih banyak pengguna.`,
        });
      }
    }

    const existing = await dbAdapter.auth.findUserByIdentifier(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: 'Email sudah digunakan oleh akun lain.' });
    }

    const id = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer(finalPassword, salt);
    const createdAt = new Date().toISOString();

    const userObj = {
      id,
      businessId: req.businessId!,
      tenantId: req.businessId!,
      name: name.trim(),
      username: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: role || 'Cost Accountant',
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      phone: phone || '',
      active: active !== false,
      createdAt,
      lastLogin: null,
    };

    await dbAdapter.insert('users', {
      id,
      business_id: req.businessId!,
      name: userObj.name,
      username: userObj.username,
      email: cleanEmail,
      password_hash: pwdHash,
      salt: salt,
      role: userObj.role,
      active: userObj.active,
      email_verified: true,
      last_login: null,
      created_at: createdAt,
      data_json: JSON.stringify(userObj),
    });

    logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Tambah User', 'Pengguna', `Menambahkan pengguna baru ${userObj.name} (${userObj.role}).`);

    return res.status(201).json(userObj);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.put('/users/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json, salt FROM users WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: 'Pengguna tidak ditemukan dalam bisnis ini.' });
  }

  // Role Escalation Check
  if (req.body.role === 'SUPER_ADMIN' && req.auth?.userRole !== 'SUPER_ADMIN') {
    return res.status(403).json({
      error: 'ROLE_ESCALATION_FORBIDDEN',
      message: 'Akses ditolak: Hanya Platform Super Admin yang berhak memberikan role SUPER_ADMIN.',
    });
  }

  const currentObj = typeof existing.data_json === 'string' ? JSON.parse(existing.data_json) : (existing.data_json || {});
  const updated = {
    ...currentObj,
    ...req.body,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
  };

  if (req.body.newPassword) {
    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer(req.body.newPassword, salt);
    await dbAdapter.execute('UPDATE users SET password_hash = ?, salt = ? WHERE id = ? AND business_id = ?', [pwdHash, salt, id, req.businessId!]);
    logSecurityAudit({
      action: 'password_change',
      category: 'AUTH',
      result: 'SUCCESS',
      businessId: req.businessId!,
      userId: req.auth!.userId,
      userName: req.auth!.userName,
      details: `Mengubah kata sandi untuk pengguna ${updated.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  if (req.body.role && req.body.role !== currentObj.role) {
    logSecurityAudit({
      action: 'role_change',
      category: 'RBAC',
      result: 'SUCCESS',
      businessId: req.businessId!,
      userId: req.auth!.userId,
      userName: req.auth!.userName,
      userEmail: req.auth!.userEmail,
      userRole: req.auth!.userRole,
      details: `Mengubah peran (role) pengguna ${updated.name} dari ${currentObj.role} menjadi ${updated.role}`,
      metadata: { targetUserId: id, oldRole: currentObj.role, newRole: updated.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] as string,
    });
  }

  const activeVal = updated.active !== false;
  await dbAdapter.execute(
    'UPDATE users SET name = ?, role = ?, active = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.name, updated.role, isUsingPostgres() ? activeVal : (activeVal ? 1 : 0), JSON.stringify(updated), id, req.businessId!]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Ubah User', 'Pengguna', `Memperbarui data pengguna ${updated.name}.`);

  return res.json(updated);
});

apiRouter.delete('/users/:id', authenticate, requireRole(['Administrator'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  if (id === req.auth!.userId) {
    return res.status(400).json({ error: 'BadRequest', message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
  }

  const resRun = await dbAdapter.execute('DELETE FROM users WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) {
    return res.status(404).json({ error: 'NotFound', message: 'Pengguna tidak ditemukan dalam bisnis ini.' });
  }

  logSecurityAudit({
    action: 'user_deletion',
    category: 'RBAC',
    result: 'SUCCESS',
    businessId: req.businessId!,
    userId: req.auth!.userId,
    userName: req.auth!.userName,
    userEmail: req.auth!.userEmail,
    userRole: req.auth!.userRole,
    details: `Menghapus akun pengguna target: ${id}`,
    metadata: { targetUserId: id },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] as string,
  });

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Hapus User', 'Pengguna', `Menghapus pengguna ID: ${id}`);
  return res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
});

// ==========================================
// 4. PRODUCTS (ISOLATED TO BUSINESS)
// ==========================================

apiRouter.get('/products', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM products WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/products', authenticate, enforceSubscriptionAccess, requireResourceLimit('products'), requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'create'), async (req: Request, res: Response) => {
  try {
    // Check product quota limit for plan
    if (req.subscription?.limits) {
      const prodCountRow = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [req.businessId!]);
      const prodCount = Number(prodCountRow?.count || 0);
      if (prodCount >= req.subscription.limits.maxProducts) {
        return res.status(403).json({
          error: 'LIMIT_EXCEEDED',
          resource: 'products',
          max: req.subscription.limits.maxProducts,
          current: prodCount,
          message: `Batas kuota produk (${req.subscription.limits.maxProducts} SKU) untuk paket Anda telah tercapai. Upgrade paket untuk menambah lebih banyak produk.`,
        });
      }
    }

    const product = req.body;
    const id = product.id || `prod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const item = {
      ...product,
      id,
      businessId: req.businessId!,
      tenantId: req.businessId!,
    };

    await dbAdapter.execute(`
      INSERT INTO products (id, business_id, sku, name, category_id, status, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, req.businessId!, item.sku || 'SKU', item.name, item.categoryId || '', item.status || 'Aktif', JSON.stringify(item)]);

    logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Tambah Produk', 'Master Data', `Menambahkan produk ${item.name} (${item.sku}).`);

    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.put('/products/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM products WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: 'Produk tidak ditemukan dalam bisnis ini.' });
  }

  const current = JSON.parse(existing.data_json);
  const updated = {
    ...current,
    ...req.body,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
  };

  await dbAdapter.execute(`
    UPDATE products
    SET sku = ?, name = ?, category_id = ?, status = ?, data_json = ?
    WHERE id = ? AND business_id = ?
  `, [updated.sku, updated.name, updated.categoryId || '', updated.status || 'Aktif', JSON.stringify(updated), id, req.businessId!]);

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Ubah Produk', 'Master Data', `Memperbarui data produk ${updated.name}.`);

  return res.json(updated);
});

apiRouter.delete('/products/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM products WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) {
    return res.status(404).json({ error: 'NotFound', message: 'Produk tidak ditemukan.' });
  }

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Hapus Produk', 'Master Data', `Menghapus produk ID: ${id}`);
  return res.json({ success: true });
});

// ==========================================
// 5. RAW MATERIALS (ISOLATED TO BUSINESS)
// ==========================================

apiRouter.get('/raw-materials', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM raw_materials WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/raw-materials', authenticate, enforceSubscriptionAccess, requireResourceLimit('raw_materials'), requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant', 'Inventory Staff'], 'create'), async (req: Request, res: Response) => {
  try {
    // Check raw materials quota limit for plan
    if (req.subscription?.limits) {
      const matCountRow = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?', [req.businessId!]);
      const matCount = Number(matCountRow?.count || 0);
      if (matCount >= req.subscription.limits.maxRawMaterials) {
        return res.status(403).json({
          error: 'LIMIT_EXCEEDED',
          resource: 'raw_materials',
          max: req.subscription.limits.maxRawMaterials,
          current: matCount,
          message: `Batas kuota bahan baku (${req.subscription.limits.maxRawMaterials} item) untuk paket Anda telah tercapai. Upgrade paket untuk menambah lebih banyak bahan.`,
        });
      }
    }

    const mat = req.body;
    const id = mat.id || `mat_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const item = {
      ...mat,
      id,
      businessId: req.businessId!,
      tenantId: req.businessId!,
      lastUpdated: new Date().toISOString(),
    };

    await dbAdapter.execute(`
      INSERT INTO raw_materials (id, business_id, code, name, category_id, status, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, req.businessId!, item.code || 'BB', item.name, item.categoryId || '', item.status || 'Aktif', JSON.stringify(item)]);

    logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Tambah Bahan', 'Bahan Baku', `Menambahkan bahan baku ${item.name}.`);

    return res.status(201).json(item);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.put('/raw-materials/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant', 'Inventory Staff'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM raw_materials WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) {
    return res.status(404).json({ error: 'NotFound', message: 'Bahan baku tidak ditemukan.' });
  }

  const current = JSON.parse(existing.data_json);
  const updated = {
    ...current,
    ...req.body,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
    lastUpdated: new Date().toISOString(),
  };

  await dbAdapter.execute(`
    UPDATE raw_materials
    SET code = ?, name = ?, category_id = ?, status = ?, data_json = ?
    WHERE id = ? AND business_id = ?
  `, [updated.code, updated.name, updated.categoryId || '', updated.status || 'Aktif', JSON.stringify(updated), id, req.businessId!]);

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Ubah Bahan', 'Bahan Baku', `Memperbarui bahan baku ${updated.name}.`);

  return res.json(updated);
});

apiRouter.delete('/raw-materials/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM raw_materials WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) {
    return res.status(404).json({ error: 'NotFound' });
  }

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Hapus Bahan', 'Bahan Baku', `Menghapus bahan ID: ${id}`);
  return res.json({ success: true });
});

// ==========================================
// 6. SUPPLIERS
// ==========================================

apiRouter.get('/suppliers', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM suppliers WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/suppliers', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner', 'Inventory Staff'], 'create'), async (req: Request, res: Response) => {
  const sup = req.body;
  const id = sup.id || `sup_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...sup, id, businessId: req.businessId!, tenantId: req.businessId! };

  await dbAdapter.execute(
    'INSERT INTO suppliers (id, business_id, code, name, status, data_json) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.code || 'SUP', item.name, item.status || 'Aktif', JSON.stringify(item)]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Tambah Supplier', 'Supplier', `Menambahkan supplier ${item.name}.`);
  return res.status(201).json(item);
});

apiRouter.put('/suppliers/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner', 'Inventory Staff'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM suppliers WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound' });

  const updated = { ...JSON.parse(existing.data_json), ...req.body, id, businessId: req.businessId!, tenantId: req.businessId! };
  await dbAdapter.execute(
    'UPDATE suppliers SET code = ?, name = ?, status = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.code, updated.name, updated.status || 'Aktif', JSON.stringify(updated), id, req.businessId!]
  );

  return res.json(updated);
});

apiRouter.delete('/suppliers/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM suppliers WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound' });
  return res.json({ success: true });
});

// ==========================================
// 6B. CUSTOMERS / PELANGGAN (ISOLATED TO BUSINESS)
// ==========================================

apiRouter.get('/customers', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM customers WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/customers', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'create'), async (req: Request, res: Response) => {
  const cust = req.body;
  const id = cust.id || `cust_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...cust, id, businessId: req.businessId!, tenantId: req.businessId! };

  await dbAdapter.execute(
    'INSERT INTO customers (id, business_id, code, name, status, data_json) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.code || 'CUST', item.name, item.status || 'Aktif', JSON.stringify(item)]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Tambah Pelanggan', 'Pelanggan', `Menambahkan pelanggan ${item.name}.`);
  return res.status(201).json(item);
});

apiRouter.put('/customers/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM customers WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Pelanggan tidak ditemukan dalam bisnis ini.' });

  const updated = { ...JSON.parse(existing.data_json), ...req.body, id, businessId: req.businessId!, tenantId: req.businessId! };
  await dbAdapter.execute(
    'UPDATE customers SET code = ?, name = ?, status = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.code, updated.name, updated.status || 'Aktif', JSON.stringify(updated), id, req.businessId!]
  );

  return res.json(updated);
});

apiRouter.delete('/customers/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM customers WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound', message: 'Pelanggan tidak ditemukan dalam bisnis ini.' });
  return res.json({ success: true });
});

// ==========================================
// 7. CATEGORIES & UNITS
// ==========================================

apiRouter.get('/categories', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM categories WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/categories', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  const cat = req.body;
  const id = cat.id || `cat_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...cat, id, businessId: req.businessId!, tenantId: req.businessId! };

  await dbAdapter.execute(
    'INSERT INTO categories (id, business_id, name, code, type, data_json) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.name, item.code, item.type, JSON.stringify(item)]
  );

  return res.status(201).json(item);
});

apiRouter.put('/categories/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM categories WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound' });

  const updated = { ...JSON.parse(existing.data_json), ...req.body, id, businessId: req.businessId!, tenantId: req.businessId! };
  await dbAdapter.execute(
    'UPDATE categories SET name = ?, code = ?, type = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.name, updated.code, updated.type, JSON.stringify(updated), id, req.businessId!]
  );

  return res.json(updated);
});

apiRouter.delete('/categories/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM categories WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound' });
  return res.json({ success: true });
});

apiRouter.get('/units', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM units WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/units', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  const unit = req.body;
  const id = unit.id || `u_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...unit, id, businessId: req.businessId!, tenantId: req.businessId! };

  await dbAdapter.execute(
    'INSERT INTO units (id, business_id, name, code, data_json) VALUES (?, ?, ?, ?, ?)',
    [id, req.businessId!, item.name, item.code, JSON.stringify(item)]
  );

  return res.status(201).json(item);
});

apiRouter.put('/units/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM units WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound' });

  const updated = { ...JSON.parse(existing.data_json), ...req.body, id, businessId: req.businessId!, tenantId: req.businessId! };
  await dbAdapter.execute(
    'UPDATE units SET name = ?, code = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.name, updated.code, JSON.stringify(updated), id, req.businessId!]
  );

  return res.json(updated);
});

apiRouter.delete('/units/:id', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM units WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound' });
  return res.json({ success: true });
});

// ==========================================
// 8. BILL OF MATERIALS (BOM / RESEP)
// ==========================================

apiRouter.get('/boms', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant', 'Staff', 'Viewer'], 'view'), async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM boms WHERE business_id = ?', [req.businessId!]);
  return res.json(rows.map((r: any) => JSON.parse(r.data_json)));
});

apiRouter.post('/boms', authenticate, enforceSubscriptionAccess, requireResourceLimit('boms'), requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'create'), async (req: Request, res: Response) => {
  const bom = req.body;
  const id = bom.id || `bom_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const item = {
    ...bom,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
    createdAt: now,
    updatedAt: now,
  };

  await dbAdapter.execute(
    'INSERT INTO boms (id, business_id, code, product_id, product_name, data_json) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.code || 'BOM', item.productId, item.productName, JSON.stringify(item)]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Tambah BOM', 'Resep & BOM', `Membuat formula BOM ${item.productName} (${item.code}).`);
  return res.status(201).json(item);
});

apiRouter.put('/boms/:id', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM boms WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound' });

  const updated = {
    ...JSON.parse(existing.data_json),
    ...req.body,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
    updatedAt: new Date().toISOString(),
  };

  await dbAdapter.execute(
    'UPDATE boms SET code = ?, product_id = ?, product_name = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.code, updated.productId, updated.productName, JSON.stringify(updated), id, req.businessId!]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Ubah BOM', 'Resep & BOM', `Memperbarui formula BOM ${updated.productName}.`);
  return res.json(updated);
});

apiRouter.delete('/boms/:id', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM boms WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound' });

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Hapus BOM', 'Resep & BOM', `Menghapus formula BOM ID: ${id}`);
  return res.json({ success: true });
});

// ==========================================
// 9. PRODUCTION BATCHES
// ==========================================

apiRouter.get('/production/batches', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM production_batches WHERE business_id = ?', [req.businessId!]);
  const batches = rows.map((r: any) => JSON.parse(r.data_json));
  batches.sort((a: any, b: any) => (b.date || b.startDate || '').localeCompare(a.date || a.startDate || ''));
  return res.json(batches);
});

apiRouter.post('/production/batches', authenticate, enforceSubscriptionAccess, requireResourceLimit('batches'), requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant', 'Staff'], 'create'), async (req: Request, res: Response) => {
  const batch = req.body;
  const id = batch.id || `prd_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = {
    ...batch,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
  };

  const dateVal = item.date || item.startDate || new Date().toISOString().substring(0, 10);
  await dbAdapter.execute(
    'INSERT INTO production_batches (id, business_id, batch_number, bom_id, product_id, status, date, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.batchNumber, item.bomId, item.productId, item.status, dateVal, JSON.stringify(item)]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Terbit SPK', 'Produksi', `Menerbitkan batch produksi ${item.batchNumber} (${item.productName}).`);
  return res.status(201).json(item);
});

apiRouter.put('/production/batches/:id', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant', 'Staff'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM production_batches WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound' });

  const updated = {
    ...JSON.parse(existing.data_json),
    ...req.body,
    id,
    businessId: req.businessId!,
    tenantId: req.businessId!,
  };

  await dbAdapter.execute(
    'UPDATE production_batches SET batch_number = ?, status = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [updated.batchNumber, updated.status, JSON.stringify(updated), id, req.businessId!]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Update SPK', 'Produksi', `Memperbarui status batch produksi ${updated.batchNumber} menjadi ${updated.status}.`);
  return res.json(updated);
});

apiRouter.delete('/production/batches/:id', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM production_batches WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound', message: 'Batch produksi tidak ditemukan dalam bisnis ini.' });

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Hapus SPK', 'Produksi', `Menghapus batch produksi ID: ${id}`);
  return res.json({ success: true });
});

// ==========================================
// 10. PURCHASES & INVENTORY
// ==========================================

apiRouter.get('/purchases/orders', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM purchase_orders WHERE business_id = ?', [req.businessId!]);
  const orders = rows.map((r: any) => JSON.parse(r.data_json));
  orders.sort((a: any, b: any) => (b.orderDate || '').localeCompare(a.orderDate || ''));
  return res.json(orders);
});

apiRouter.post('/purchases/orders', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Inventory Staff'], 'create'), async (req: Request, res: Response) => {
  const po = req.body;
  const id = po.id || `po_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...po, id, businessId: req.businessId!, tenantId: req.businessId! };

  const orderDateVal = item.orderDate || item.date || new Date().toISOString().substring(0, 10);
  await dbAdapter.execute(
    'INSERT INTO purchase_orders (id, business_id, po_number, supplier_id, status, order_date, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.poNumber, item.supplierId, item.status, orderDateVal, JSON.stringify(item)]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Buat PO', 'Pembelian', `Menerbitkan PO ${item.poNumber} ke supplier ${item.supplierName}.`);
  return res.status(201).json(item);
});

apiRouter.put('/purchases/orders/:id/status', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Inventory Staff'], 'edit'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const existing = await dbAdapter.queryOne('SELECT data_json FROM purchase_orders WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (!existing) return res.status(404).json({ error: 'NotFound' });

  const updated = { ...JSON.parse(existing.data_json), status };
  if (status === 'Diterima' && !updated.receivedDate) {
    updated.receivedDate = new Date().toISOString().substring(0, 10);
  }

  await dbAdapter.execute(
    'UPDATE purchase_orders SET status = ?, data_json = ? WHERE id = ? AND business_id = ?',
    [status, JSON.stringify(updated), id, req.businessId!]
  );

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Status PO', 'Pembelian', `Mengubah status PO ${updated.poNumber} menjadi ${status}.`);
  return res.json(updated);
});

apiRouter.delete('/purchases/orders/:id', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM purchase_orders WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound', message: 'Purchase Order tidak ditemukan dalam bisnis ini.' });

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Hapus PO', 'Pembelian', `Menghapus purchase order ID: ${id}`);
  return res.json({ success: true });
});

apiRouter.get('/inventory/movements', authenticate, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM stock_movements WHERE business_id = ?', [req.businessId!]);
  const movements = rows.map((r: any) => JSON.parse(r.data_json));
  movements.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
  return res.json(movements);
});

apiRouter.post('/inventory/movements', authenticate, requireRole(['Administrator', 'Manager / Owner', 'Inventory Staff', 'Staff'], 'create'), async (req: Request, res: Response) => {
  const mv = req.body;
  const id = mv.id || `sm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const item = { ...mv, id, businessId: req.businessId!, tenantId: req.businessId! };

  await dbAdapter.execute(
    'INSERT INTO stock_movements (id, business_id, item_id, type, date, data_json) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.businessId!, item.itemId, item.type, item.date, JSON.stringify(item)]
  );

  return res.status(201).json(item);
});

// ==========================================
// 11. ACTIVITY LOGS & COMPANY SETTINGS
// ==========================================

apiRouter.get('/activity-logs', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'view'), async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT data_json FROM activity_logs WHERE business_id = ?', [req.businessId!]);
  const logs = rows.map((r: any) => JSON.parse(r.data_json));
  logs.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  return res.json(logs.slice(0, 100));
});

apiRouter.post('/activity-logs', authenticate, (req: Request, res: Response) => {
  const { action, module, details } = req.body;
  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, action, module, details, req.ip || '127.0.0.1');
  return res.json({ success: true });
});

apiRouter.get('/settings/company', authenticate, async (req: Request, res: Response) => {
  const row = await dbAdapter.queryOne('SELECT data_json FROM company_settings WHERE business_id = ?', [req.businessId!]);
  if (!row) {
    return res.json({ companyName: 'Bisnis Saya', costingMethod: 'FULL_COSTING' });
  }
  return res.json(JSON.parse(row.data_json));
});

apiRouter.put('/settings/company', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'edit'), async (req: Request, res: Response) => {
  const existing = await dbAdapter.queryOne('SELECT data_json FROM company_settings WHERE business_id = ?', [req.businessId!]);
  const current = existing ? JSON.parse(existing.data_json) : {};
  const updated = { ...current, ...req.body };

  await dbAdapter.execute(`
    INSERT INTO company_settings (business_id, company_name, data_json)
    VALUES (?, ?, ?)
    ON CONFLICT(business_id) DO UPDATE SET
      company_name = excluded.company_name,
      data_json = excluded.data_json
  `, [req.businessId!, updated.companyName || 'Perusahaan', JSON.stringify(updated)]);

  logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Pengaturan', 'Sistem', 'Memperbarui parameter konfigurasi perusahaan dan akuntansi HPP.');

  return res.json(updated);
});

// ==========================================
// 12. SYSTEM BACKUP, RESTORE & EXPORT
// ==========================================

apiRouter.get('/system/export-json', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'export'), async (req: Request, res: Response) => {
  const bId = req.businessId!;
  const getRows = async (table: string) => {
    const rows = await dbAdapter.query(`SELECT data_json FROM ${table} WHERE business_id = ?`, [bId]);
    return rows.map((r: any) => JSON.parse(r.data_json));
  };

  const bizRow = await dbAdapter.queryOne('SELECT data_json FROM businesses WHERE id = ?', [bId]);
  const settingsRow = await dbAdapter.queryOne('SELECT data_json FROM company_settings WHERE business_id = ?', [bId]);

  const exportPayload = {
    version: '2.0.0-saas-sql',
    exportDate: new Date().toISOString(),
    business: bizRow ? JSON.parse(bizRow.data_json) : null,
    companySettings: settingsRow ? JSON.parse(settingsRow.data_json) : null,
    categories: await getRows('categories'),
    units: await getRows('units'),
    suppliers: await getRows('suppliers'),
    rawMaterials: await getRows('raw_materials'),
    products: await getRows('products'),
    boms: await getRows('boms'),
    batches: await getRows('production_batches'),
    purchaseOrders: await getRows('purchase_orders'),
    stockMovements: await getRows('stock_movements'),
  };

  logAudit(bId, req.auth!.userId, req.auth!.userName, 'Ekspor Database', 'Sistem', 'Mengekspor seluruh arsip basis data bisnis ke format JSON.');

  return res.json(exportPayload);
});

apiRouter.get('/system/db-audit', authenticate, requireRole(['Administrator'], 'view'), async (req: Request, res: Response) => {
  const auditResult = await auditDatabaseIntegrity();
  return res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    audit: auditResult,
  });
});

apiRouter.get('/system/postgres-migration-sql', authenticate, requireRole(['Administrator'], 'export'), async (req: Request, res: Response) => {
  const sqlDump = await generatePostgreSqlMigrationScript();
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="hpp_saas_postgres_migration.sql"');
  return res.send(sqlDump);
});

apiRouter.post('/system/import-json', authenticate, requireRole(['Administrator'], 'create'), async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'BadRequest', message: 'Payload data JSON tidak valid.' });
    }

    const bId = req.businessId!;

    // Import with dbAdapter transaction
    await dbAdapter.transaction(async (tx) => {
      if (Array.isArray(data.products)) {
        await tx.execute('DELETE FROM products WHERE business_id = ?', [bId]);
        for (const p of data.products) {
          await tx.execute(
            'INSERT INTO products (id, business_id, sku, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [p.id, bId, p.sku || 'SKU', p.name, p.categoryId || '', p.status || 'Aktif', JSON.stringify({ ...p, businessId: bId, tenantId: bId })]
          );
        }
      }

      if (Array.isArray(data.rawMaterials)) {
        await tx.execute('DELETE FROM raw_materials WHERE business_id = ?', [bId]);
        for (const m of data.rawMaterials) {
          await tx.execute(
            'INSERT INTO raw_materials (id, business_id, code, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [m.id, bId, m.code || 'BB', m.name, m.categoryId || '', m.status || 'Aktif', JSON.stringify({ ...m, businessId: bId, tenantId: bId })]
          );
        }
      }

      if (Array.isArray(data.boms)) {
        await tx.execute('DELETE FROM boms WHERE business_id = ?', [bId]);
        for (const b of data.boms) {
          await tx.execute(
            'INSERT INTO boms (id, business_id, code, product_id, product_name, data_json) VALUES (?, ?, ?, ?, ?, ?)',
            [b.id, bId, b.code || 'BOM', b.productId, b.productName, JSON.stringify({ ...b, businessId: bId, tenantId: bId })]
          );
        }
      }
    });

    logAudit(bId, req.auth!.userId, req.auth!.userName, 'Impor Database', 'Sistem', 'Mengimpor pemulihan basis data JSON.');
    return res.json({ success: true, message: 'Data berhasil diimpor ke basis data server.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: 'Gagal mengimpor database: ' + err.message });
  }
});

// ==========================================
// 13. SUPER ADMIN PLATFORM ROUTES (/api/admin/*)
// ==========================================

apiRouter.get('/admin/overview', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const allBusinesses = await dbAdapter.query("SELECT * FROM businesses WHERE id != 'platform'");
    const totalBusinesses = allBusinesses.length;
    let activeBusinesses = 0;
    let trialBusinesses = 0;
    let suspendedBusinesses = 0;
    let expiredBusinesses = 0;

    const now = Date.now();
    const sevenDaysAhead = now + 7 * 24 * 60 * 60 * 1000;
    let trialsEndingSoon = 0;
    let activeSubscriptions = 0;
    let subscriptionsEndingSoon = 0;

    const allSubs = await dbAdapter.query('SELECT * FROM subscriptions');
    for (const sub of allSubs) {
      const status = String(sub.status).toUpperCase();
      if (status === 'ACTIVE') activeSubscriptions++;
      if (status === 'TRIAL') trialBusinesses++;
      if (status === 'SUSPENDED') suspendedBusinesses++;
      if (status === 'EXPIRED') expiredBusinesses++;

      if (sub.trial_end) {
        const tEnd = new Date(sub.trial_end).getTime();
        if (tEnd > now && tEnd <= sevenDaysAhead) trialsEndingSoon++;
      }
      if (sub.end_date) {
        const eDate = new Date(sub.end_date).getTime();
        if (eDate > now && eDate <= sevenDaysAhead && status === 'ACTIVE') subscriptionsEndingSoon++;
      }
    }

    for (const b of allBusinesses) {
      const st = String(b.status).toUpperCase();
      if (st === 'ACTIVE') activeBusinesses++;
      else if (st === 'SUSPENDED') suspendedBusinesses++;
      else if (st === 'EXPIRED') expiredBusinesses++;
    }

    const countRow = await dbAdapter.queryOne<{ count: number }>("SELECT COUNT(*) as count FROM users WHERE business_id != 'platform'");
    const totalUsers = Number(countRow?.count || 0);

    return res.json({
      totalBusinesses,
      activeBusinesses,
      trialBusinesses,
      suspendedBusinesses,
      expiredBusinesses,
      totalUsers,
      newBusinessesThisMonth: totalBusinesses,
      trialsEndingSoon,
      activeSubscriptions,
      subscriptionsEndingSoon,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.get('/admin/businesses', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await dbAdapter.query(`
      SELECT
        b.id,
        b.name,
        b.code,
        b.industry,
        b.plan,
        b.logo_text,
        b.status,
        b.business_type,
        b.onboarding_status,
        b.onboarding_step,
        b.currency,
        b.created_at,
        b.data_json,
        s.id as subscription_id,
        s.plan_id,
        s.status as subscription_status,
        s.start_date,
        s.end_date,
        s.trial_start,
        s.trial_end,
        s.is_read_only,
        p.code as plan_code,
        p.name as plan_name,
        (SELECT COUNT(*) FROM users u WHERE u.business_id = b.id) as user_count,
        (SELECT COUNT(*) FROM products pr WHERE pr.business_id = b.id) as product_count
      FROM businesses b
      LEFT JOIN subscriptions s ON s.business_id = b.id
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE b.id != 'platform'
      ORDER BY b.created_at DESC
    `);

    const list = rows.map((r: any) => {
      let raw: any = {};
      try { raw = JSON.parse(r.data_json); } catch {}
      return {
        ...raw,
        id: r.id,
        name: r.name,
        industry: r.industry,
        status: r.status,
        plan: r.plan_name || r.plan || 'Starter',
        planId: r.plan_id || 'plan_starter',
        planCode: r.plan_code || 'STARTER',
        businessType: r.business_type || r.industry || 'F&B / Kuliner',
        onboardingStatus: r.onboarding_status || 'NOT_STARTED',
        onboardingStep: r.onboarding_step || 1,
        userCount: r.user_count,
        productCount: r.product_count,
        subscription: r.subscription_id ? {
          id: r.subscription_id,
          businessId: r.id,
          planId: r.plan_id,
          planCode: r.plan_code,
          planName: r.plan_name,
          status: r.subscription_status,
          startDate: r.start_date,
          endDate: r.end_date,
          trialStart: r.trial_start,
          trialEnd: r.trial_end,
          isReadOnly: Boolean(r.is_read_only),
        } : null,
      };
    });

    return res.json(list);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.post('/admin/businesses', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, industry, planId = 'plan_starter', ownerName, ownerEmail, ownerPhone, status = 'ACTIVE', ownerPassword } = req.body;
    if (!name || !ownerName || !ownerEmail) {
      return res.status(400).json({ error: 'BadRequest', message: 'Nama bisnis, nama pemilik, dan email wajib diisi.' });
    }

    const cleanEmail = String(ownerEmail).trim().toLowerCase();
    const existingUser = await dbAdapter.auth.findUserByIdentifier(cleanEmail);
    if (existingUser) {
      return res.status(409).json({ error: 'Conflict', message: 'Email pemilik sudah terdaftar di sistem.' });
    }

    const businessId = `biz_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const ownerId = `usr_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
    const salt = generateSaltServer();
    const initialPwd = (ownerPassword && typeof ownerPassword === 'string' && ownerPassword.length >= 8)
      ? ownerPassword
      : crypto.randomBytes(6).toString('hex') + 'A1!';
    const pwdHash = hashPasswordServer(initialPwd, salt);
    const now = new Date().toISOString();

    const planRow = await dbAdapter.queryOne('SELECT * FROM plans WHERE id = ? OR code = ?', [planId, planId]);
    const resolvedPlanId = planRow ? planRow.id : 'plan_starter';
    const planName = planRow ? planRow.name : 'Starter UMKM';

    const logoText = name.split(' ').slice(0, 3).map((w: string) => w[0]?.toUpperCase()).join('') || 'BIZ';

    const bizObj = {
      id: businessId,
      name,
      code: logoText,
      industry: industry || 'Manufaktur & Produksi',
      plan: planName,
      planId: resolvedPlanId,
      ownerName,
      ownerEmail: cleanEmail,
      logoText,
      skuCount: 0,
      maxSku: 100,
      status,
      email: cleanEmail,
      phone: ownerPhone || '',
      currency: 'IDR',
      createdAt: now,
    };

    await dbAdapter.insert('businesses', {
      id: businessId,
      name,
      code: logoText,
      industry: bizObj.industry,
      plan: planName,
      logo_text: logoText,
      status,
      currency: 'IDR',
      business_type: bizObj.industry,
      onboarding_status: 'COMPLETED',
      onboarding_step: 4,
      created_at: now,
      data_json: JSON.stringify(bizObj),
    });

    const userObj = {
      id: ownerId,
      businessId,
      tenantId: businessId,
      name: ownerName,
      username: cleanEmail.split('@')[0],
      email: cleanEmail,
      role: 'Administrator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      phone: ownerPhone || '',
      active: true,
      createdAt: now,
      lastLogin: null,
    };

    await dbAdapter.insert('users', {
      id: ownerId,
      business_id: businessId,
      name: ownerName,
      username: userObj.username,
      email: cleanEmail,
      password_hash: pwdHash,
      salt: salt,
      role: 'Administrator',
      active: true,
      email_verified: true,
      last_login: null,
      created_at: now,
      data_json: JSON.stringify(userObj),
    });

    // Create Subscription
    const subId = `sub_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const trialDays = planRow ? planRow.trial_days : 14;
    const trialEnd = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
    const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const subStatus = status === 'TRIAL' ? 'TRIAL' : 'ACTIVE';
    await dbAdapter.insert('subscriptions', {
      id: subId,
      business_id: businessId,
      plan_id: resolvedPlanId,
      status: subStatus,
      billing_cycle: 'MONTHLY',
      start_date: now,
      end_date: subStatus === 'TRIAL' ? trialEnd : oneYearLater,
      trial_start: subStatus === 'TRIAL' ? now : null,
      trial_end: subStatus === 'TRIAL' ? trialEnd : null,
      is_read_only: false,
      notes: `Dibuat oleh Super Admin`,
      created_at: now,
      updated_at: now,
    });

    // Default company settings
    const initialSettings = {
      companyName: name,
      businessType: bizObj.industry,
      address: '',
      phone: ownerPhone || '',
      email: cleanEmail,
      taxId: '',
      defaultCurrency: 'IDR (Rp)',
      costingMethod: 'FULL_COSTING',
      defaultMarginPct: 35,
      maxShrinkageTolerancePct: 5,
      enableOverheads: true,
      enableLaborTracking: true,
      currency: 'IDR (Rp)',
      defaultCostingMethod: 'FULL_COSTING',
      hppRounding: 100,
      defaultShrinkagePct: 3,
      defaultMarginTargetPct: 35,
      hourlyLaborRateStandard: 25000,
    };
    await dbAdapter.insert('company_settings', {
      business_id: businessId,
      company_name: name,
      data_json: JSON.stringify(initialSettings),
    }, 'ON CONFLICT (business_id) DO UPDATE SET company_name = EXCLUDED.company_name, data_json = EXCLUDED.data_json');

    // Default units
    const defaultUnits = [
      { id: `u_${businessId}_1`, code: 'kg', name: 'Kilogram', businessId, tenantId: businessId },
      { id: `u_${businessId}_2`, code: 'gr', name: 'Gram', businessId, tenantId: businessId },
      { id: `u_${businessId}_3`, code: 'pcs', name: 'Pieces / Buah', businessId, tenantId: businessId },
      { id: `u_${businessId}_4`, code: 'l', name: 'Liter', businessId, tenantId: businessId },
      { id: `u_${businessId}_5`, code: 'ml', name: 'Mililiter', businessId, tenantId: businessId },
      { id: `u_${businessId}_6`, code: 'box', name: 'Box / Kotak', businessId, tenantId: businessId },
      { id: `u_${businessId}_7`, code: 'btl', name: 'Botol', businessId, tenantId: businessId },
      { id: `u_${businessId}_8`, code: 'dus', name: 'Dus', businessId, tenantId: businessId },
    ];
    for (const u of defaultUnits) {
      await dbAdapter.insert('units', {
        id: u.id,
        business_id: businessId,
        name: u.name,
        code: u.code,
        data_json: JSON.stringify(u),
      });
    }

    logAdminAudit(
      req.auth!.userId,
      req.auth!.userName,
      req.auth!.userRole,
      'CREATE_BUSINESS',
      'BUSINESS',
      businessId,
      businessId,
      { name, plan: planName, ownerEmail: cleanEmail }
    );

    return res.status(201).json({
      success: true,
      business: bizObj,
      owner: userObj,
      message: `Bisnis "${name}" dan akun owner berhasil dibuat.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.get('/admin/businesses/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const bizRow = await dbAdapter.queryOne('SELECT * FROM businesses WHERE id = ?', [id]);
  if (!bizRow) return res.status(404).json({ error: 'NotFound', message: 'Bisnis tidak ditemukan.' });

  const subRow = await dbAdapter.queryOne(`
    SELECT s.*, p.code as plan_code, p.name as plan_name, p.features_json, p.limits_json
    FROM subscriptions s
    JOIN plans p ON s.plan_id = p.id
    WHERE s.business_id = ?
    ORDER BY s.created_at DESC LIMIT 1
  `, [id]);

  const userRows = await dbAdapter.query('SELECT data_json FROM users WHERE business_id = ? ORDER BY created_at ASC', [id]);
  const users = userRows.map((u: any) => JSON.parse(u.data_json));
  const productCountRes = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [id]);
  const materialCountRes = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?', [id]);
  const bomCountRes = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM boms WHERE business_id = ?', [id]);
  const productCount = Number(productCountRes?.count || 0);
  const materialCount = Number(materialCountRes?.count || 0);
  const bomCount = Number(bomCountRes?.count || 0);

  // Invoices & Transactions
  const invoiceRows = await dbAdapter.query('SELECT * FROM invoices WHERE business_id = ? ORDER BY created_at DESC LIMIT 20', [id]);
  const invoices = invoiceRows.map((r: any) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    planName: r.plan_name,
    amount: r.amount,
    currency: r.currency,
    status: r.status,
    billingCycle: r.billing_cycle,
    paymentMethod: r.payment_method,
    paidAt: r.paid_at,
    createdAt: r.created_at,
  }));

  const payments = await dbAdapter.query(`
    SELECT pt.*, inv.invoice_number
    FROM payment_transactions pt
    LEFT JOIN invoices inv ON pt.invoice_id = inv.id
    WHERE pt.business_id = ?
    ORDER BY pt.created_at DESC LIMIT 20
  `, [id]);

  // Last business activity
  const activityRows = await dbAdapter.query('SELECT * FROM activity_logs WHERE business_id = ? ORDER BY timestamp DESC LIMIT 5', [id]);
  const recentActivities = activityRows.map((r: any) => {
    try { return JSON.parse(r.data_json); } catch { return r; }
  });

  const lastActivity = recentActivities[0] || null;

  return res.json({
    business: JSON.parse(bizRow.data_json),
    subscription: subRow ? {
      ...subRow,
      features: JSON.parse(subRow.features_json || '[]'),
      limits: JSON.parse(subRow.limits_json || '{}'),
    } : null,
    users,
    invoices,
    payments,
    recentActivities,
    lastActivity,
    quotas: {
      products: productCount,
      rawMaterials: materialCount,
      boms: bomCount,
      users: users.length,
    },
  });
});

apiRouter.post('/admin/businesses/:id/suspend', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason = 'Penangguhan administratif oleh Super Admin' } = req.body;

  const existing = await dbAdapter.queryOne('SELECT data_json FROM businesses WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Bisnis tidak ditemukan.' });

  const currentObj = JSON.parse(existing.data_json);
  const updatedObj = { ...currentObj, status: 'SUSPENDED', suspendReason: reason, suspendedAt: new Date().toISOString() };
  const readOnlyVal = isUsingPostgres() ? true : 1;

  await dbAdapter.execute("UPDATE businesses SET status = 'SUSPENDED', data_json = ? WHERE id = ?", [JSON.stringify(updatedObj), id]);
  await dbAdapter.execute("UPDATE subscriptions SET status = 'SUSPENDED', is_read_only = ? WHERE business_id = ?", [readOnlyVal, id]);

  logAdminAudit(
    req.auth!.userId,
    req.auth!.userName,
    req.auth!.userRole,
    'SUSPEND_BUSINESS',
    'BUSINESS',
    id,
    id,
    { reason, previousStatus: currentObj.status }
  );

  return res.json({ success: true, message: `Bisnis ${currentObj.name} berhasil ditangguhkan (SUSPENDED).`, business: updatedObj });
});

apiRouter.post('/admin/businesses/:id/activate', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  const existing = await dbAdapter.queryOne('SELECT data_json FROM businesses WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Bisnis tidak ditemukan.' });

  const currentObj = JSON.parse(existing.data_json);
  const updatedObj = { ...currentObj, status: 'ACTIVE', suspendReason: undefined, reactivatedAt: new Date().toISOString() };
  const readOnlyZero = isUsingPostgres() ? false : 0;

  await dbAdapter.execute("UPDATE businesses SET status = 'ACTIVE', data_json = ? WHERE id = ?", [JSON.stringify(updatedObj), id]);
  await dbAdapter.execute("UPDATE subscriptions SET status = 'ACTIVE', is_read_only = ? WHERE business_id = ?", [readOnlyZero, id]);

  logAdminAudit(
    req.auth!.userId,
    req.auth!.userName,
    req.auth!.userRole,
    'ACTIVATE_BUSINESS',
    'BUSINESS',
    id,
    id,
    { previousStatus: currentObj.status }
  );

  return res.json({ success: true, message: `Bisnis ${currentObj.name} berhasil diaktifkan kembali (ACTIVE).`, business: updatedObj });
});

apiRouter.post('/admin/businesses/:id/archive', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { confirmationCode } = req.body;

  const existing = await dbAdapter.queryOne('SELECT data_json, name FROM businesses WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Bisnis tidak ditemukan.' });

  const cleanName = existing.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (confirmationCode !== `ARCHIVE-${cleanName}`) {
    return res.status(400).json({
      error: 'CONFIRMATION_CODE_MISMATCH',
      message: `Kode konfirmasi tidak valid. Masukkan "ARCHIVE-${cleanName}" untuk mengarsipkan bisnis ini.`,
    });
  }

  const currentObj = JSON.parse(existing.data_json);
  const updatedObj = { ...currentObj, status: 'ARCHIVED', archivedAt: new Date().toISOString() };
  const readOnlyVal = isUsingPostgres() ? true : 1;

  await dbAdapter.execute("UPDATE businesses SET status = 'ARCHIVED', data_json = ? WHERE id = ?", [JSON.stringify(updatedObj), id]);
  await dbAdapter.execute("UPDATE subscriptions SET status = 'EXPIRED', is_read_only = ? WHERE business_id = ?", [readOnlyVal, id]);

  logAdminAudit(
    req.auth!.userId,
    req.auth!.userName,
    req.auth!.userRole,
    'ARCHIVE_BUSINESS',
    'BUSINESS',
    id,
    id,
    { name: existing.name }
  );

  return res.json({ success: true, message: `Bisnis ${existing.name} berhasil diarsipkan secara aman tanpa menghapus riwayat audit.`, business: updatedObj });
});

apiRouter.get('/admin/invoices', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query(`
    SELECT
      inv.*,
      b.name as business_name,
      p.code as plan_code
    FROM invoices inv
    JOIN businesses b ON inv.business_id = b.id
    LEFT JOIN plans p ON inv.plan_id = p.id
    ORDER BY inv.created_at DESC
    LIMIT 200
  `);

  return res.json(rows);
});

apiRouter.get('/admin/payments', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query(`
    SELECT
      pt.*,
      b.name as business_name,
      inv.invoice_number,
      inv.plan_name
    FROM payment_transactions pt
    JOIN businesses b ON pt.business_id = b.id
    LEFT JOIN invoices inv ON pt.invoice_id = inv.id
    ORDER BY pt.created_at DESC
    LIMIT 200
  `);

  return res.json(rows);
});

apiRouter.put('/admin/businesses/:id/status', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, accessMode, isReadOnly } = req.body;

  const existing = await dbAdapter.queryOne('SELECT data_json FROM businesses WHERE id = ?', [id]);
  if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Bisnis tidak ditemukan.' });

  const currentObj = JSON.parse(existing.data_json);
  const updatedObj = { ...currentObj, status, accessMode: accessMode || currentObj.accessMode || 'ACTIVE' };

  await dbAdapter.execute('UPDATE businesses SET status = ?, data_json = ? WHERE id = ?', [status, JSON.stringify(updatedObj), id]);

  if (isReadOnly !== undefined || status === 'EXPIRED') {
    const isRo = isReadOnly !== undefined ? Boolean(isReadOnly) : (status === 'EXPIRED');
    const readOnlyVal = isUsingPostgres() ? isRo : (isRo ? 1 : 0);
    await dbAdapter.execute('UPDATE subscriptions SET is_read_only = ? WHERE business_id = ?', [readOnlyVal, id]);
  }

  logAdminAudit(
    req.auth!.userId,
    req.auth!.userName,
    req.auth!.userRole,
    'UPDATE_BUSINESS_STATUS',
    'BUSINESS',
    id,
    id,
    { status, accessMode, isReadOnly }
  );

  return res.json({ success: true, business: updatedObj });
});

apiRouter.put('/admin/businesses/:id/subscription', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { planId, status, extendDays, isReadOnly, notes } = req.body;

  const subRow = await dbAdapter.queryOne('SELECT * FROM subscriptions WHERE business_id = ? ORDER BY created_at DESC LIMIT 1', [id]);
  if (!subRow) return res.status(404).json({ error: 'NotFound', message: 'Langganan bisnis tidak ditemukan.' });

  const now = new Date();
  let endDate = subRow.end_date;
  let trialEnd = subRow.trial_end;

  if (extendDays && typeof extendDays === 'number') {
    const baseTime = new Date(endDate || now).getTime();
    endDate = new Date(baseTime + extendDays * 24 * 60 * 60 * 1000).toISOString();
    if (trialEnd) {
      const trialBase = new Date(trialEnd).getTime();
      trialEnd = new Date(trialBase + extendDays * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  const newPlanId = planId || subRow.plan_id;
  const newStatus = status || subRow.status;
  const isRo = isReadOnly !== undefined ? Boolean(isReadOnly) : Boolean(subRow.is_read_only);
  const newReadOnly = isUsingPostgres() ? isRo : (isRo ? 1 : 0);

  await dbAdapter.execute(`
    UPDATE subscriptions
    SET plan_id = ?, status = ?, end_date = ?, trial_end = ?, is_read_only = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `, [
    newPlanId,
    newStatus,
    endDate,
    trialEnd,
    newReadOnly,
    notes || subRow.notes || '',
    now.toISOString(),
    subRow.id
  ]);

  // Sync plan name onto business row
  const planRow = await dbAdapter.queryOne('SELECT name FROM plans WHERE id = ?', [newPlanId]);
  if (planRow) {
    const bizRow = await dbAdapter.queryOne('SELECT data_json FROM businesses WHERE id = ?', [id]);
    if (bizRow) {
      const bObj = JSON.parse(bizRow.data_json);
      bObj.plan = planRow.name;
      bObj.planId = newPlanId;
      await dbAdapter.execute('UPDATE businesses SET plan = ?, data_json = ? WHERE id = ?', [planRow.name, JSON.stringify(bObj), id]);
    }
  }

  logAdminAudit(
    req.auth!.userId,
    req.auth!.userName,
    req.auth!.userRole,
    'UPDATE_SUBSCRIPTION',
    'SUBSCRIPTION',
    subRow.id,
    id,
    { planId: newPlanId, status: newStatus, extendDays, isReadOnly: newReadOnly }
  );

  return res.json({ success: true, message: 'Langganan berhasil diperbarui.' });
});

// Plans Management
apiRouter.get('/admin/plans', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT * FROM plans ORDER BY price_monthly ASC');
  const list = rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    priceMonthly: r.price_monthly,
    priceYearly: r.price_yearly,
    billingPeriod: r.billing_period,
    trialDays: r.trial_days,
    isActive: Boolean(r.is_active),
    features: JSON.parse(r.features_json),
    limits: JSON.parse(r.limits_json),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
  return res.json(list);
});

apiRouter.post('/admin/plans', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { code, name, description, priceMonthly, priceYearly, trialDays, features, limits } = req.body;
    const id = `plan_${String(code).toLowerCase()}`;
    const now = new Date().toISOString();
    const isActiveVal = isUsingPostgres() ? true : 1;

    await dbAdapter.execute(`
      INSERT INTO plans (
        id, code, name, description, price_monthly, price_yearly,
        billing_period, trial_days, is_active, features_json, limits_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      code,
      name,
      description || '',
      priceMonthly || 0,
      priceYearly || 0,
      'MONTHLY',
      trialDays || 14,
      isActiveVal,
      JSON.stringify(features || []),
      JSON.stringify(limits || {}),
      now,
      now
    ]);

    logAdminAudit(req.auth!.userId, req.auth!.userName, req.auth!.userRole, 'CREATE_PLAN', 'PLAN', id, undefined, { code, name });

    return res.status(201).json({ success: true, id });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.put('/admin/plans/:id', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, priceMonthly, priceYearly, trialDays, isActive, features, limits } = req.body;
    const existing = await dbAdapter.queryOne('SELECT * FROM plans WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ error: 'NotFound', message: 'Paket tidak ditemukan.' });

    const now = new Date().toISOString();
    const updatedFeatures = features ? JSON.stringify(features) : existing.features_json;
    const updatedLimits = limits ? JSON.stringify(limits) : existing.limits_json;
    let isActiveVal = existing.is_active;
    if (isActive !== undefined) {
      isActiveVal = isUsingPostgres() ? Boolean(isActive) : (isActive ? 1 : 0);
    }

    await dbAdapter.execute(`
      UPDATE plans
      SET name = ?, description = ?, price_monthly = ?, price_yearly = ?,
          trial_days = ?, is_active = ?, features_json = ?, limits_json = ?, updated_at = ?
      WHERE id = ?
    `, [
      name !== undefined ? name : existing.name,
      description !== undefined ? description : existing.description,
      priceMonthly !== undefined ? priceMonthly : existing.price_monthly,
      priceYearly !== undefined ? priceYearly : existing.price_yearly,
      trialDays !== undefined ? trialDays : existing.trial_days,
      isActiveVal,
      updatedFeatures,
      updatedLimits,
      now,
      id
    ]);

    logAdminAudit(req.auth!.userId, req.auth!.userName, req.auth!.userRole, 'UPDATE_PLAN', 'PLAN', id, undefined, { name, priceMonthly, priceYearly });

    return res.json({ success: true, message: 'Paket berhasil diperbarui.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.get('/admin/subscriptions', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query(`
    SELECT
      s.*,
      b.name as business_name,
      p.code as plan_code,
      p.name as plan_name
    FROM subscriptions s
    JOIN businesses b ON s.business_id = b.id
    JOIN plans p ON s.plan_id = p.id
    ORDER BY s.created_at DESC
  `);

  return res.json(rows);
});

apiRouter.get('/admin/audit-logs', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  const rows = await dbAdapter.query(`
    SELECT
      a.*,
      b.name as business_name
    FROM admin_audit_logs a
    LEFT JOIN businesses b ON a.business_id = b.id
    ORDER BY a.timestamp DESC
    LIMIT 200
  `);

  return res.json(rows.map((r: any) => ({
    id: r.id,
    actorUserId: r.actor_user_id,
    actorName: r.actor_name,
    actorRole: r.actor_role,
    businessId: r.business_id,
    businessName: r.business_name,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    timestamp: r.timestamp,
    metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null,
    ...r,
  })));
});

apiRouter.post('/admin/reset-user-password', authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId) return res.status(400).json({ error: 'BadRequest', message: 'User ID wajib diisi.' });
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'BadRequest', message: 'Password baru wajib diisi dan minimal 8 karakter.' });
    }

    const user = await dbAdapter.auth.findUserById(userId);
    if (!user) return res.status(404).json({ error: 'NotFound', message: 'Pengguna tidak ditemukan.' });

    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer(newPassword, salt);
    await dbAdapter.auth.updateUserPassword(userId, pwdHash, salt);

    // Security Hardening: Invalidate all active sessions for the user upon administrative password reset
    await dbAdapter.auth.invalidateUserSessions(userId);

    logAdminAudit(
      req.auth!.userId,
      req.auth!.userName,
      req.auth!.userRole,
      'RESET_USER_PASSWORD',
      'USER',
      userId,
      user.business_id,
      { userEmail: user.email, userName: user.name }
    );

    return res.json({ success: true, message: `Password pengguna ${user.name} berhasil direset dan seluruh sesi aktif telah dibatalkan.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ==========================================
// 14. BUSINESS SUBSCRIPTION & ENTITLEMENTS
// ==========================================

apiRouter.get('/subscription/current', authenticate, enforceSubscriptionAccess, async (req: Request, res: Response) => {
  const bizId = req.businessId!;
  const sub = req.subscription;

  const [userRes, prodRes, matRes, bomRes] = await Promise.all([
    dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE business_id = ? AND active = 1', [bizId]),
    dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [bizId]),
    dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?', [bizId]),
    dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM boms WHERE business_id = ?', [bizId]),
  ]);

  const userCount = Number(userRes?.count || 0);
  const productCount = Number(prodRes?.count || 0);
  const materialCount = Number(matRes?.count || 0);
  const bomCount = Number(bomRes?.count || 0);

  return res.json({
    subscription: sub,
    usage: {
      users: { current: userCount, max: sub?.limits.maxUsers || 5 },
      products: { current: productCount, max: sub?.limits.maxProducts || 100 },
      rawMaterials: { current: materialCount, max: sub?.limits.maxRawMaterials || 50 },
      boms: { current: bomCount, max: sub?.limits.maxBoms || 50 },
    },
  });
});

apiRouter.post('/users/invite', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email) return res.status(400).json({ error: 'BadRequest', message: 'Email wajib diisi.' });

    // Prevent role escalation
    if (role === 'SUPER_ADMIN' && req.auth?.userRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'ROLE_ESCALATION_FORBIDDEN',
        message: 'Akses ditolak: Hanya Platform Super Admin yang berhak memberikan role SUPER_ADMIN.',
      });
    }

    // Check Multi-User Feature & User Quota
    if (!req.subscription?.features.includes('MULTI_USER')) {
      return res.status(403).json({
        error: 'FEATURE_NOT_AVAILABLE',
        feature: 'MULTI_USER',
        message: 'Paket Anda tidak mendukung fitur multi-pengguna. Silakan tingkatkan ke paket PRO atau BUSINESS.',
      });
    }

    const countRes = await dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users WHERE business_id = ? AND (active = 1 OR active = TRUE)', [req.businessId!]);
    const currentUsers = Number(countRes?.count || 0);
    if (req.subscription?.limits && currentUsers >= req.subscription.limits.maxUsers) {
      return res.status(403).json({
        error: 'LIMIT_EXCEEDED',
        resource: 'users',
        max: req.subscription.limits.maxUsers,
        message: `Batas kuota pengguna (${req.subscription.limits.maxUsers} user) telah tercapai.`,
      });
    }

    const id = `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const token = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await dbAdapter.execute(`
      INSERT INTO invitations (id, business_id, email, role, invited_by, token, status, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, req.businessId!, email, role || 'Cost Accountant', req.auth!.userName, token, 'PENDING', expiresAt, now]);

    logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Undang User', 'Pengguna', `Mengirim undangan pengguna ke ${email} (${role}).`);

    // Non-blocking team invitation email dispatch
    const inviteUrl = `${req.protocol}://${req.get('host')}/accept-invite?token=${token}`;
    emailService.sendTeamInvitation(email, {
      inviteeEmail: email,
      inviterName: req.auth!.userName,
      businessName: req.auth!.businessName,
      role: role || 'Cost Accountant',
      inviteUrl,
      expiresAt: expiresAt.substring(0, 10),
    }).catch((err) => console.error('[Invite] Email dispatch failed silently:', err));

    return res.status(201).json({
      success: true,
      invitation: { id, email, role, token, expiresAt, status: 'PENDING' },
      message: `Undangan berhasil diterbitkan untuk ${email}.`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

apiRouter.get('/users/invitations', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'view'), async (req: Request, res: Response) => {
  const rows = await dbAdapter.query('SELECT * FROM invitations WHERE business_id = ? ORDER BY created_at DESC', [req.businessId!]);
  return res.json(rows);
});

apiRouter.delete('/users/invitations/:id', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'delete'), async (req: Request, res: Response) => {
  const { id } = req.params;
  const resRun = await dbAdapter.execute('DELETE FROM invitations WHERE id = ? AND business_id = ?', [id, req.businessId!]);
  if (resRun.rowCount === 0) return res.status(404).json({ error: 'NotFound', message: 'Undangan tidak ditemukan dalam bisnis ini.' });
  return res.json({ success: true, message: 'Undangan berhasil dibatalkan.' });
});

// Feature entitlement test endpoint for ADVANCED_REPORT
apiRouter.get('/analysis/advanced-profitability', authenticate, enforceSubscriptionAccess, requireRole(['Administrator', 'Manager / Owner', 'Cost Accountant'], 'view'), requireFeature('ADVANCED_REPORT'), (req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    message: 'Akses fitur Analisis Profitabilitas Lanjutan & BEP Multivariat berhasil diotorisasi oleh backend.',
    entitlement: 'ADVANCED_REPORT',
    plan: req.subscription?.planCode,
  });
});

// ============================================================================
// 12. ONBOARDING & SETUP WIZARD ENDPOINTS (Requirements 10, 11, 12, 13, 14, 16)
// ============================================================================

// Create / Setup Business Profile in Onboarding (Requirement 10 & 11)
apiRouter.post('/onboarding/create-business', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'edit'), async (req: Request, res: Response) => {
  try {
    const { name, ownerName, businessType = 'F&B / Kuliner', phone = '', address = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'BadRequest', message: 'Nama bisnis wajib diisi.' });
    }

    const bizRow = await dbAdapter.queryOne('SELECT id, data_json FROM businesses WHERE id = ?', [req.businessId!]);
    if (!bizRow) {
      return res.status(404).json({ error: 'NotFound', message: 'Data bisnis tidak ditemukan.' });
    }

    const currentObj = JSON.parse(bizRow.data_json);
    const logoText = name
      .split(' ')
      .slice(0, 3)
      .map((w: string) => w[0]?.toUpperCase())
      .join('') || 'BIZ';

    const updatedObj = {
      ...currentObj,
      name: name.trim(),
      code: logoText,
      industry: businessType,
      businessType,
      phone: phone || currentObj.phone || '',
      address: address || currentObj.address || '',
      ownerName: ownerName || req.auth!.userName,
      onboardingStatus: 'IN_PROGRESS',
      onboardingStep: 2,
      updatedAt: new Date().toISOString(),
    };

    await dbAdapter.execute(`
      UPDATE businesses
      SET name = ?, code = ?, industry = ?, business_type = ?, onboarding_status = 'IN_PROGRESS', onboarding_step = 2, data_json = ?
      WHERE id = ?
    `, [name.trim(), logoText, businessType, businessType, JSON.stringify(updatedObj), req.businessId!]);

    // Also update company_settings
    const setRow = await dbAdapter.queryOne('SELECT data_json FROM company_settings WHERE business_id = ?', [req.businessId!]);
    if (setRow) {
      const setObj = JSON.parse(setRow.data_json);
      setObj.companyName = name.trim();
      setObj.businessType = businessType;
      setObj.address = address;
      setObj.phone = phone;
      await dbAdapter.execute('UPDATE company_settings SET company_name = ?, data_json = ? WHERE business_id = ?', [name.trim(), JSON.stringify(setObj), req.businessId!]);
    }

    logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Setup Bisnis', 'Onboarding', `Mengatur profil bisnis "${name}" (Jenis: ${businessType}).`);

    return res.json({
      success: true,
      business: updatedObj,
      message: 'Profil bisnis berhasil diperbarui.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Get Onboarding Status & Progress (Requirement 12 & 13)
apiRouter.get('/onboarding/status', authenticate, async (req: Request, res: Response) => {
  try {
    const bizRow = await dbAdapter.queryOne(`
      SELECT id, name, business_type, onboarding_status, onboarding_step, onboarding_data_json, data_json
      FROM businesses
      WHERE id = ?
    `, [req.businessId!]);

    if (!bizRow) {
      return res.status(404).json({ error: 'NotFound', message: 'Bisnis tidak ditemukan.' });
    }

    // Count existing setup data
    const [pRes, rmRes, bRes, uRes] = await Promise.all([
      dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM products WHERE business_id = ?', [req.businessId!]),
      dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM raw_materials WHERE business_id = ?', [req.businessId!]),
      dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM boms WHERE business_id = ?', [req.businessId!]),
      dbAdapter.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM units WHERE business_id = ?', [req.businessId!]),
    ]);

    const productCount = Number(pRes?.count || 0);
    const rawMaterialCount = Number(rmRes?.count || 0);
    const bomCount = Number(bRes?.count || 0);
    const unitCount = Number(uRes?.count || 0);

    return res.json({
      businessId: bizRow.id,
      businessName: bizRow.name,
      businessType: bizRow.business_type || 'F&B / Kuliner',
      status: bizRow.onboarding_status || 'NOT_STARTED',
      currentStep: bizRow.onboarding_step || 1,
      savedData: bizRow.onboarding_data_json ? JSON.parse(bizRow.onboarding_data_json) : null,
      counts: {
        products: productCount,
        rawMaterials: rawMaterialCount,
        boms: bomCount,
        units: unitCount,
      },
      firstValueReached: productCount >= 1 && rawMaterialCount >= 1 && bomCount >= 1,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Update Onboarding Progress (Requirement 13)
apiRouter.put('/onboarding/progress', authenticate, async (req: Request, res: Response) => {
  try {
    const { step, status = 'IN_PROGRESS', data } = req.body;

    const dataJson = data ? JSON.stringify(data) : null;
    await dbAdapter.execute(`
      UPDATE businesses
      SET onboarding_step = ?, onboarding_status = ?, onboarding_data_json = COALESCE(?, onboarding_data_json)
      WHERE id = ?
    `, [step || 1, status, dataJson, req.businessId!]);

    if (status === 'COMPLETED') {
      logAudit(req.businessId!, req.auth!.userId, req.auth!.userName, 'Selesai Onboarding', 'Onboarding', 'Bisnis telah menyelesaikan seluruh wizard orientasi data awal.');
    }

    return res.json({
      success: true,
      step,
      status,
      message: 'Kemajuan orientasi berhasil disimpan di server.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Seed Sample Starter Data for New Tenant (Requirement 14 & 20)
apiRouter.post('/onboarding/seed-sample-data', authenticate, async (req: Request, res: Response) => {
  try {
    const businessId = req.businessId!;

    // 1. Categories
    const cat1Id = `cat_${businessId}_1`;
    const cat2Id = `cat_${businessId}_2`;
    const catItem1 = { id: cat1Id, businessId, name: 'Bahan Baku Pokok', code: 'BBP', type: 'MATERIAL' };
    const catItem2 = { id: cat2Id, businessId, name: 'Roti & Bakery', code: 'BAK', type: 'PRODUCT' };

    // 2. Supplier
    const supId = `sup_${businessId}_1`;
    const supItem = {
      id: supId,
      businessId,
      code: 'SUP-001',
      name: 'CV Sukses Pangan Makmur',
      contactPerson: 'Bapak Hendra',
      phone: '0812-8899-7766',
      email: 'sales@suksespangan.co.id',
      address: 'Jl. Industri Boga No. 12, Jakarta',
      termOfPayment: 'Net 30',
      status: 'Aktif',
    };

    // 3. Raw Materials
    const mat1Id = `rm_${businessId}_1`;
    const mat2Id = `rm_${businessId}_2`;
    const mat3Id = `rm_${businessId}_3`;

    const mat1 = {
      id: mat1Id,
      businessId,
      code: 'RM-001',
      name: 'Tepung Terigu Protein Tinggi (Cakra)',
      categoryId: cat1Id,
      categoryName: 'Bahan Baku Pokok',
      unitId: 'kg',
      unitName: 'kg',
      supplierId: supId,
      supplierName: 'CV Sukses Pangan Makmur',
      minStock: 25,
      currentStock: 100,
      purchasePrice: 14500,
      shrinkageTolerancePct: 2,
      status: 'Aktif',
    };

    const mat2 = {
      id: mat2Id,
      businessId,
      code: 'RM-002',
      name: 'Butter Unsalted Premium (Elle & Vire)',
      categoryId: cat1Id,
      categoryName: 'Bahan Baku Pokok',
      unitId: 'kg',
      unitName: 'kg',
      supplierId: supId,
      supplierName: 'CV Sukses Pangan Makmur',
      minStock: 10,
      currentStock: 40,
      purchasePrice: 185000,
      shrinkageTolerancePct: 1,
      status: 'Aktif',
    };

    const mat3 = {
      id: mat3Id,
      businessId,
      code: 'RM-003',
      name: 'Gula Pasir Kristal Putih',
      categoryId: cat1Id,
      categoryName: 'Bahan Baku Pokok',
      unitId: 'kg',
      unitName: 'kg',
      supplierId: supId,
      supplierName: 'CV Sukses Pangan Makmur',
      minStock: 20,
      currentStock: 60,
      purchasePrice: 17500,
      shrinkageTolerancePct: 1,
      status: 'Aktif',
    };

    // 4. Products
    const prod1Id = `prd_${businessId}_1`;
    const prod2Id = `prd_${businessId}_2`;

    const prod1 = {
      id: prod1Id,
      businessId,
      sku: 'PRD-001',
      name: 'Artisan Butter Croissant',
      categoryId: cat2Id,
      categoryName: 'Roti & Bakery',
      unitId: 'pcs',
      unitName: 'pcs',
      minStock: 20,
      currentStock: 50,
      sellingPrice: 28000,
      estimatedHpp: 11500,
      marginTargetPct: 58,
      status: 'Aktif',
    };

    const prod2 = {
      id: prod2Id,
      businessId,
      sku: 'PRD-002',
      name: 'Classic Pain au Chocolat',
      categoryId: cat2Id,
      categoryName: 'Roti & Bakery',
      unitId: 'pcs',
      unitName: 'pcs',
      minStock: 15,
      currentStock: 35,
      sellingPrice: 32000,
      estimatedHpp: 13800,
      marginTargetPct: 56,
      status: 'Aktif',
    };

    // 5. BOM (Recipe) for Artisan Butter Croissant
    const bomId = `bom_${businessId}_1`;
    const bomItem = {
      id: bomId,
      businessId,
      code: 'BOM-001',
      name: 'Resep Standar Artisan Butter Croissant (Batch 20 Pcs)',
      productId: prod1Id,
      productName: 'Artisan Butter Croissant',
      productSku: 'PRD-001',
      outputQty: 20,
      outputUnit: 'pcs',
      status: 'Aktif',
      ingredients: [
        {
          materialId: mat1Id,
          materialCode: 'RM-001',
          materialName: 'Tepung Terigu Protein Tinggi (Cakra)',
          quantity: 1.0,
          unit: 'kg',
          costPerUnit: 14500,
          shrinkagePct: 2,
          subtotal: 14790,
        },
        {
          materialId: mat2Id,
          materialCode: 'RM-002',
          materialName: 'Butter Unsalted Premium (Elle & Vire)',
          quantity: 0.5,
          unit: 'kg',
          costPerUnit: 185000,
          shrinkagePct: 1,
          subtotal: 93425,
        },
        {
          materialId: mat3Id,
          materialCode: 'RM-003',
          materialName: 'Gula Pasir Kristal Putih',
          quantity: 0.15,
          unit: 'kg',
          costPerUnit: 17500,
          shrinkagePct: 1,
          subtotal: 2651,
        },
      ],
      totalRawMaterialCost: 110866,
      laborHours: 2.0,
      laborRatePerHour: 25000,
      totalLaborCost: 50000,
      overheadAllocation: 25000,
      totalCost: 185866,
      unitCost: 9293.3,
      notes: 'Waktu fermentasi dingin lamination 12 jam pada suhu 4°C untuk layering sempurna.',
    };

    await dbAdapter.transaction(async (trx) => {
      await trx.execute('INSERT OR REPLACE INTO categories (id, business_id, name, code, type, data_json) VALUES (?, ?, ?, ?, ?, ?)', [cat1Id, businessId, 'Bahan Baku Pokok', 'BBP', 'MATERIAL', JSON.stringify(catItem1)]);
      await trx.execute('INSERT OR REPLACE INTO categories (id, business_id, name, code, type, data_json) VALUES (?, ?, ?, ?, ?, ?)', [cat2Id, businessId, 'Roti & Bakery', 'BAK', 'PRODUCT', JSON.stringify(catItem2)]);

      await trx.execute('INSERT OR REPLACE INTO suppliers (id, business_id, code, name, status, data_json) VALUES (?, ?, ?, ?, ?, ?)', [supId, businessId, 'SUP-001', 'CV Sukses Pangan Makmur', 'Aktif', JSON.stringify(supItem)]);

      await trx.execute('INSERT OR REPLACE INTO raw_materials (id, business_id, code, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [mat1Id, businessId, mat1.code, mat1.name, cat1Id, 'Aktif', JSON.stringify(mat1)]);
      await trx.execute('INSERT OR REPLACE INTO raw_materials (id, business_id, code, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [mat2Id, businessId, mat2.code, mat2.name, cat1Id, 'Aktif', JSON.stringify(mat2)]);
      await trx.execute('INSERT OR REPLACE INTO raw_materials (id, business_id, code, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [mat3Id, businessId, mat3.code, mat3.name, cat1Id, 'Aktif', JSON.stringify(mat3)]);

      await trx.execute('INSERT OR REPLACE INTO products (id, business_id, sku, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [prod1Id, businessId, prod1.sku, prod1.name, cat2Id, 'Aktif', JSON.stringify(prod1)]);
      await trx.execute('INSERT OR REPLACE INTO products (id, business_id, sku, name, category_id, status, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)', [prod2Id, businessId, prod2.sku, prod2.name, cat2Id, 'Aktif', JSON.stringify(prod2)]);

      await trx.execute('INSERT OR REPLACE INTO boms (id, business_id, code, product_id, product_name, data_json) VALUES (?, ?, ?, ?, ?, ?)', [bomId, businessId, bomItem.code, prod1Id, bomItem.name, JSON.stringify(bomItem)]);

      await trx.execute(`
        UPDATE businesses
        SET onboarding_status = 'COMPLETED', onboarding_step = 7
        WHERE id = ?
      `, [businessId]);
    });

    logAudit(businessId, req.auth!.userId, req.auth!.userName, 'Seed Data Contoh', 'Onboarding', 'Menginisialisasi data contoh terisolasi (Bahan Baku, Produk, Supplier & Resep BOM Croissant).');

    return res.json({
      success: true,
      message: 'Data contoh terisolasi berhasil ditambahkan ke bisnis Anda!',
      counts: {
        rawMaterials: 3,
        products: 2,
        suppliers: 1,
        boms: 1,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// ============================================================================
// 13. BILLING, CHECKOUT & INVOICE ENDPOINTS (Requirements 10, 23 & Customer Journey)
// ============================================================================

// Simulated Subscription Checkout / Upgrade Plan (Requirement 2, 7, 23)
apiRouter.post('/billing/checkout', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  try {
    const { planCode = 'PRO', billingCycle = 'MONTHLY', paymentMethod = 'QRIS' } = req.body;

    const planRow = await dbAdapter.queryOne('SELECT * FROM plans WHERE code = ? AND is_active = 1', [planCode]);
    if (!planRow) {
      return res.status(404).json({ error: 'NotFound', message: `Paket ${planCode} tidak ditemukan atau belum aktif.` });
    }

    // Downgrade Safety Validation: Ensure existing data volume does not violate target limits
    const safetyCheck = await validatePlanChangeSafetyAsync(req.businessId!, planCode);
    if (!safetyCheck.safe) {
      return res.status(400).json({
        error: 'PLAN_DOWNGRADE_UNSAFE',
        message: 'Perubahan paket tidak dapat diproses karena volume data yang ada melebihi batas kuota paket tujuan.',
        details: safetyCheck.errors,
      });
    }

    const isYearly = billingCycle.toUpperCase() === 'YEARLY';
    const amount = isYearly ? planRow.price_yearly : planRow.price_monthly;
    const now = new Date();
    const durationDays = isYearly ? 365 : 30;
    const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    const invId = `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const invoiceNumber = `INV-${now.toISOString().substring(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const invoiceObj = {
      id: invId,
      businessId: req.businessId!,
      invoiceNumber,
      planId: planRow.id,
      planCode: planRow.code,
      planName: planRow.name,
      amount,
      currency: 'IDR',
      status: 'PAID',
      billingCycle: isYearly ? 'YEARLY' : 'MONTHLY',
      paymentMethod,
      paidAt: now.toISOString(),
      createdAt: now.toISOString(),
    };

    // Insert Invoice
    await dbAdapter.execute(`
      INSERT INTO invoices (id, business_id, invoice_number, plan_id, plan_name, amount, currency, status, billing_cycle, payment_method, paid_at, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invId,
      req.businessId!,
      invoiceNumber,
      planRow.id,
      planRow.name,
      amount,
      'IDR',
      'PAID',
      invoiceObj.billingCycle,
      paymentMethod,
      now.toISOString(),
      now.toISOString(),
      JSON.stringify(invoiceObj),
    ]);

    // Update Subscription in Database (with payment_reference)
    const subId = `sub_${req.businessId!}`;
    await dbAdapter.execute(`
      INSERT INTO subscriptions (
        id, business_id, plan_id, status, billing_cycle,
        start_date, end_date, trial_start, trial_end, is_read_only, payment_reference, notes, created_at, updated_at
      ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, NULL, NULL, 0, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        plan_id = excluded.plan_id,
        status = 'ACTIVE',
        billing_cycle = excluded.billing_cycle,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        is_read_only = 0,
        payment_reference = excluded.payment_reference,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `, [
      subId,
      req.businessId!,
      planRow.id,
      invoiceObj.billingCycle,
      now.toISOString(),
      endDate.toISOString(),
      invoiceNumber,
      `Aktivasi paket ${planRow.name} via ${paymentMethod}`,
      now.toISOString(),
      now.toISOString(),
    ]);

    // Update business plan string in businesses table
    await dbAdapter.execute('UPDATE businesses SET plan = ? WHERE id = ?', [planRow.code, req.businessId!]);

    logAdminAudit(
      req.auth!.userId,
      req.auth!.userName,
      req.auth!.userRole,
      'UPGRADE_SUBSCRIPTION',
      'SUBSCRIPTION',
      subId,
      req.businessId!,
      { planCode: planRow.code, amount, invoiceNumber, billingCycle }
    );

    logAudit(
      req.businessId!,
      req.auth!.userId,
      req.auth!.userName,
      'Pembayaran Langganan',
      'Billing',
      `Berhasil mengaktifkan langganan Paket ${planRow.name} (${invoiceNumber}) via ${paymentMethod}.`
    );

    return res.status(201).json({
      success: true,
      message: `Selamat! Bisnis Anda kini aktif berlangganan paket ${planRow.name}.`,
      invoice: invoiceObj,
      subscription: {
        status: 'ACTIVE',
        planCode: planRow.code,
        planName: planRow.name,
        endDate: endDate.toISOString(),
        paymentReference: invoiceNumber,
        isReadOnly: false,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Single Source of Truth Entitlement API (Requirement: whether business/user can use a feature)
apiRouter.get('/subscription/entitlements', authenticate, async (req: Request, res: Response) => {
  const summary = await getBusinessEntitlementSummaryAsync(req.businessId!);
  if (!summary) {
    return res.status(404).json({ error: 'NotFound', message: 'Data langganan bisnis tidak ditemukan.' });
  }
  return res.json(summary);
});

// Get Invoices History (Requirement 2 & Customer Journey)
apiRouter.get('/billing/invoices', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'view'), async (req: Request, res: Response) => {
  try {
    const rows = await dbAdapter.query(`
      SELECT *
      FROM invoices
      WHERE business_id = ?
      ORDER BY created_at DESC
    `, [req.businessId!]);

    const formatted = rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      planId: r.plan_id,
      planName: r.plan_name,
      amount: r.amount,
      currency: r.currency,
      status: r.status,
      billingCycle: r.billing_cycle,
      paymentMethod: r.payment_method,
      paidAt: r.paid_at,
      createdAt: r.created_at,
    }));

    return res.json(formatted);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Step 2 & 3: Initiate Payment Gateway Transaction
apiRouter.post('/billing/create-payment-intent', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  try {
    const { planCode = 'PRO', billingCycle = 'MONTHLY', paymentMethod = 'QRIS', customerEmail } = req.body;

    const safetyCheck = await validatePlanChangeSafetyAsync(req.businessId!, planCode);
    if (!safetyCheck.safe) {
      return res.status(400).json({
        error: 'PLAN_DOWNGRADE_UNSAFE',
        message: 'Perubahan paket tidak dapat diproses karena volume data yang ada melebihi batas kuota paket tujuan.',
        details: safetyCheck.errors,
      });
    }

    const session = await paymentService.createCheckoutSession({
      businessId: req.businessId!,
      businessName: req.auth!.businessName,
      planCode,
      billingCycle,
      paymentMethod,
      actorUserId: req.auth!.userId,
      actorUserName: req.auth!.userName,
      actorUserRole: req.auth!.userRole,
      customerEmail: customerEmail || req.auth!.userEmail,
    });

    return res.status(201).json({
      success: true,
      message: 'Sesi transaksi pembayaran berhasil diterbitkan.',
      ...session,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Step 4 & 5: Public Webhook Endpoint (Called by Payment Gateway)
apiRouter.post('/billing/webhook', async (req: Request, res: Response) => {
  try {
    const result = await paymentService.processWebhook(req.headers, req.body);
    if (!result.success) {
      return res.status(result.code).json(result);
    }
    return res.status(result.code).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'WEBHOOK_INTERNAL_ERROR',
      message: err.message,
    });
  }
});

// Simulation helper for sandbox testing
apiRouter.post('/billing/simulate-settlement', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.body;
    if (!invoiceNumber) {
      return res.status(400).json({ error: 'BadRequest', message: 'Nomor invoice wajib disertakan.' });
    }

    const result = await paymentService.simulatePaymentSettlement(invoiceNumber);
    return res.status(result.code).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Get Payment Transactions
apiRouter.get('/billing/transactions', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'view'), async (req: Request, res: Response) => {
  try {
    const rows = await dbAdapter.query(`
      SELECT pt.*, inv.invoice_number, inv.plan_name
      FROM payment_transactions pt
      JOIN invoices inv ON pt.invoice_id = inv.id
      WHERE pt.business_id = ?
      ORDER BY pt.created_at DESC
    `, [req.businessId!]);

    return res.json(rows);
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Trigger Subscription / Trial Reminder Email (Requirement 7)
apiRouter.post('/subscription/send-reminder', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'create'), async (req: Request, res: Response) => {
  try {
    const summary = await getBusinessEntitlementSummaryAsync(req.businessId!);
    if (!summary) {
      return res.status(404).json({ error: 'NotFound', message: 'Data langganan tidak ditemukan.' });
    }

    const ownerUser = await dbAdapter.queryOne("SELECT name, email FROM users WHERE business_id = ? AND role = 'Manager / Owner'", [req.businessId!]);
    const targetEmail = req.body.email || ownerUser?.email || req.auth!.userEmail;
    const targetName = ownerUser?.name || req.auth!.userName;

    const isTrial = summary.subscription.status === 'TRIAL';
    const expiryDate = (isTrial && summary.subscription.trialEnd ? summary.subscription.trialEnd : summary.subscription.endDate).substring(0, 10);

    const emailResult = await emailService.sendSubscriptionReminder(targetEmail, {
      customerName: targetName,
      businessName: summary.businessName,
      planName: summary.plan.name,
      daysRemaining: summary.subscription.daysRemaining,
      expiryDate,
      upgradeUrl: `${req.protocol}://${req.get('host')}/pricing`,
      isTrial,
    });

    return res.json({
      success: true,
      message: `Email pengingat langganan berhasil dikirimkan ke ${targetEmail}.`,
      dispatch: emailResult,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'ServerError', message: err.message });
  }
});

// Inspect Outgoing Emails (For Sandbox QA and Testing)
apiRouter.get('/system/email-outbox', authenticate, requireRole(['Administrator'], 'view'), (req: Request, res: Response) => {
  const outbox = emailService.getOutbox();
  return res.json({
    provider: emailService.getProviderName(),
    totalSent: outbox.length,
    outbox,
  });
});

// ============================================================================
// 15. AUDIT & ERROR MONITORING ENDPOINTS (PROMPT 08)
// ============================================================================

// 1. Get Security Audit Logs (Auth, RBAC, Billing, Tenant, Admin actions)
apiRouter.get('/audit/security-logs', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'view'), async (req: Request, res: Response) => {
  try {
    const isSuper = req.auth?.userRole === 'SUPER_ADMIN';
    const { action, category, result, limit = 100 } = req.query;

    let query = `
      SELECT s.*, b.name as business_name
      FROM security_audit_logs s
      LEFT JOIN businesses b ON s.business_id = b.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Tenant isolation: Regular admins only see their own business security logs
    if (!isSuper) {
      query += ` AND s.business_id = ?`;
      params.push(req.businessId!);
    }

    if (action) {
      query += ` AND s.action = ?`;
      params.push(action);
    }
    if (category) {
      query += ` AND s.category = ?`;
      params.push(category);
    }
    if (result) {
      query += ` AND s.result = ?`;
      params.push(result);
    }

    query += ` ORDER BY s.timestamp DESC LIMIT ?`;
    params.push(Math.min(Number(limit) || 100, 500));

    const rows = await dbAdapter.query(query, params);
    const formatted = rows.map((r) => ({
      id: r.id,
      businessId: r.business_id,
      businessName: r.business_name,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email,
      userRole: r.user_role,
      action: r.action,
      category: r.category,
      result: r.result,
      ipAddress: r.ip_address,
      userAgent: r.user_agent,
      details: r.details,
      metadata: r.metadata_json ? JSON.parse(r.metadata_json) : null,
      timestamp: r.timestamp,
    }));

    return res.json(formatted);
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal mengambil log audit keamanan.' });
  }
});

// 2. Get Business Activity Logs (BOM, Recipe, Products, Production, POs)
apiRouter.get('/audit/activity-logs', authenticate, requireRole(['Administrator', 'Manager / Owner'], 'view'), async (req: Request, res: Response) => {
  try {
    const rows = await dbAdapter.query(`
      SELECT *
      FROM activity_logs
      WHERE business_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `, [req.businessId!]);

    const logs = rows.map((r) => {
      try {
        return JSON.parse(r.data_json);
      } catch {
        return {
          id: r.id,
          businessId: r.business_id,
          userId: r.user_id,
          action: r.action,
          module: r.module,
          timestamp: r.timestamp,
        };
      }
    });

    return res.json(logs);
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal mengambil log aktivitas bisnis.' });
  }
});

// 3. Centralized Incident & Error Monitoring Logs
apiRouter.get('/system/error-logs', authenticate, requireRole(['Administrator'], 'view'), async (req: Request, res: Response) => {
  try {
    const isSuper = req.auth?.userRole === 'SUPER_ADMIN';
    const { errorId, statusCode, limit = 50 } = req.query;

    let query = `SELECT * FROM error_logs WHERE 1=1`;
    const params: any[] = [];

    if (!isSuper) {
      query += ` AND business_id = ?`;
      params.push(req.businessId!);
    }

    if (errorId) {
      query += ` AND error_id = ?`;
      params.push(errorId);
    }
    if (statusCode) {
      query += ` AND status_code = ?`;
      params.push(Number(statusCode));
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(Math.min(Number(limit) || 50, 200));

    const rows = await dbAdapter.query(query, params);
    return res.json(rows);
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal mengambil data monitoring error.' });
  }
});

// 4. Strict Immutability Protection: Audit logs CANNOT be deleted by regular users
apiRouter.all(['/audit/*', '/security-logs/*', '/activity-logs/*'], (req: Request, res: Response, next) => {
  if (req.method === 'DELETE') {
    return res.status(403).json({
      error: 'AUDIT_LOG_IMMUTABLE',
      message: 'Akses ditolak: Catatan audit log bersifat permanen (immutable) dan tidak dapat dihapus oleh pengguna biasa.',
    });
  }
  next();
});

// ============================================================================
// 16. BACKUP, RECOVERY & DISASTER RECOVERY ENDPOINTS (PROMPT 09)
// ============================================================================

// 1. Create a Backup Snapshot
apiRouter.post('/system/backup', authenticate, requireRole(['Administrator'], 'create'), async (req: Request, res: Response) => {
  try {
    const { scope = 'TENANT', retentionDays } = req.body;
    const isSuper = req.auth?.userRole === 'SUPER_ADMIN';

    if (scope === 'PLATFORM_FULL' && !isSuper) {
      return res.status(403).json({
        error: 'FORBIDDEN_SUPER_ADMIN_ONLY',
        message: 'Akses ditolak: Hanya Super Admin yang berhak membuat cadangan penuh platform (Full Platform Backup).',
      });
    }

    let backup: any;
    if (scope === 'PLATFORM_FULL') {
      backup = await backupService.createPlatformFullBackup(req.auth!.userName, 'MANUAL_ADMIN', retentionDays);
    } else {
      backup = await backupService.createTenantBackup(req.businessId!, req.auth!.userName, 'MANUAL_ADMIN', retentionDays);
    }

    return res.status(201).json({
      success: true,
      message: `Cadangan data (${backup.scope}) berhasil dibuat dan disimpan secara aman.`,
      backup,
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: err.message });
  }
});

// 2. List Available Backups
apiRouter.get('/system/backups', authenticate, requireRole(['Administrator'], 'view'), async (req: Request, res: Response) => {
  try {
    const isSuper = req.auth?.userRole === 'SUPER_ADMIN';
    const list = await backupService.getBackupList(req.businessId!, isSuper);
    return res.json(list);
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal mengambil daftar cadangan data.' });
  }
});

// 3. Cryptographically Verify Backup Integrity (SHA-256 Checksum & Structure)
apiRouter.post('/system/backup/:id/verify', authenticate, requireRole(['Administrator'], 'view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await backupService.verifyBackup(id);
    return res.json(result);
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal memverifikasi cadangan data.' });
  }
});

// 4. Restore Tenant Backup (Supports dryRun validation)
apiRouter.post('/system/backup/:id/restore', authenticate, requireRole(['Administrator'], 'create'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dryRun = false } = req.body;
    const isSuper = req.auth?.userRole === 'SUPER_ADMIN';

    // Verify backup exists and belongs to this tenant or isSuper
    const row = await dbAdapter.queryOne('SELECT * FROM system_backups WHERE id = ?', [id]);
    if (!row) {
      return res.status(404).json({ error: 'NotFound', message: 'Arsip backup tidak ditemukan.' });
    }

    if (!isSuper && row.business_id !== req.businessId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Akses ditolak: Anda tidak memiliki wewenang untuk memulihkan cadangan bisnis lain.' });
    }

    const restoreResult = await backupService.restoreTenantBackup(id, req.businessId!, dryRun, req.auth!.userName);

    if (!restoreResult.success) {
      return res.status(400).json(restoreResult);
    }

    return res.json({
      message: dryRun
        ? 'Simulasi pemulihan (Dry-Run) berhasil. Struktur dan checksum data valid 100%.'
        : 'Pemulihan data berhasil diterapkan ke basis data bisnis.',
      ...restoreResult,
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: err.message });
  }
});

// 5. Trigger Automated Retention Pruner
apiRouter.post('/system/backup/prune', authenticate, requireRole(['Administrator'], 'create'), async (req: Request, res: Response) => {
  try {
    const result = await backupService.pruneExpiredBackups();
    return res.json({
      success: true,
      message: `Proses rotasi retensi selesai. ${result.prunedCount} arsip kadaluarsa dibersihkan.`,
      ...result,
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal menjalankan pembersihan retensi.' });
  }
});

// 6. Disaster Recovery Status & Metrics
apiRouter.get('/system/disaster-recovery', authenticate, requireRole(['Administrator'], 'view'), async (req: Request, res: Response) => {
  try {
    const drStatus = await backupService.getDisasterRecoveryStatus();
    return res.json(drStatus);
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'ServerError', errorId: rec.errorId, message: 'Gagal mengambil metrik Disaster Recovery.' });
  }
});

// ============================================================================
// 17. VERCEL CRON & SCHEDULED BACKGROUND JOBS (PROMPT 14)
// ============================================================================

// 1. Cron Job: Subscription & Trial Expiry Lifecycle (Daily 01:00 UTC)
apiRouter.all(['/cron/subscription-lifecycle', '/cron/subscriptions'], requireCronSecret, async (req: Request, res: Response) => {
  try {
    const result = await runSubscriptionLifecycleJob();
    return res.json({
      success: true,
      job: 'subscription-lifecycle',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'CronExecutionFailed', errorId: rec.errorId, message: err.message });
  }
});

// 2. Cron Job: Ephemeral Data & Backup Retention Cleanup (Daily 02:00 UTC)
apiRouter.all(['/cron/cleanup-retention', '/cron/cleanup'], requireCronSecret, async (req: Request, res: Response) => {
  try {
    const result = await runRetentionCleanupJob();
    return res.json({
      success: true,
      job: 'cleanup-retention',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'CronExecutionFailed', errorId: rec.errorId, message: err.message });
  }
});

// 3. Cron Job: Automated Full Platform Backup Snapshot (Daily 03:00 UTC)
apiRouter.all(['/cron/automated-backup', '/cron/backup'], requireCronSecret, async (req: Request, res: Response) => {
  try {
    const result = await runAutomatedBackupJob();
    return res.json({
      success: true,
      job: 'automated-backup',
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    const rec = recordError(err, req);
    return res.status(500).json({ error: 'CronExecutionFailed', errorId: rec.errorId, message: err.message });
  }
});


