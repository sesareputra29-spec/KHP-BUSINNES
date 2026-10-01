import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { logSecurityAudit, logAdminAudit } from '../audit';
import { emailService } from '../email/email-service';
import { backupService } from '../backup/backup-service';
import { evaluateSubscriptionLifecycle } from '../entitlements';

/**
 * Middleware: Verifies Vercel Cron secret token
 * Vercel automatically sends `Authorization: Bearer <CRON_SECRET>` with each scheduled cron request.
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  const xCronSecret = req.headers['x-cron-secret'];

  // In production, CRON_SECRET is strictly required
  if (cronSecret) {
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    if (bearerToken !== cronSecret && xCronSecret !== cronSecret) {
      return res.status(401).json({
        error: 'CRON_UNAUTHORIZED',
        message: 'Akses ditolak: Kredensial Vercel Cron Secret tidak valid.',
      });
    }
  } else if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      error: 'CRON_MISCONFIGURED',
      message: 'CRON_SECRET belum dikonfigurasi di environment variables production.',
    });
  }

  next();
}

/**
 * Task 1: Subscription & Trial Expiry Lifecycle Monitor
 * Schedule: Daily at 01:00 UTC (0 1 * * *)
 * Idempotent: Checks expiry and sends reminders once per business per threshold.
 */
export async function runSubscriptionLifecycleJob(): Promise<{
  processedCount: number;
  expiredCount: number;
  remindersSent: number;
  details: any[];
}> {
  const now = new Date();
  const nowTime = now.getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const oneDayMs = 1 * 24 * 60 * 60 * 1000;

  const subs = db.prepare(`
    SELECT s.*, b.name as business_name, p.name as plan_name, p.code as plan_code
    FROM subscriptions s
    JOIN businesses b ON s.business_id = b.id
    JOIN plans p ON s.plan_id = p.id
    WHERE s.status IN ('ACTIVE', 'TRIAL')
    LIMIT 200
  `).all() as any[];

  let expiredCount = 0;
  let remindersSent = 0;
  const details: any[] = [];

  for (const sub of subs) {
    const lifecycle = evaluateSubscriptionLifecycle(sub);

    // 1. Expiration update
    if (lifecycle.isReadOnly && sub.is_read_only === 0) {
      db.prepare(`
        UPDATE subscriptions
        SET is_read_only = 1, status = ?, updated_at = ?
        WHERE id = ?
      `).run(lifecycle.status, now.toISOString(), sub.id);

      db.prepare('UPDATE businesses SET status = ? WHERE id = ?').run(lifecycle.status, sub.business_id);

      expiredCount++;
      details.push({
        businessId: sub.business_id,
        businessName: sub.business_name,
        action: 'EXPIRED_TRANSITION',
        newStatus: lifecycle.status,
      });

      logAdminAudit(
        'system_cron',
        'Vercel Cron Lifecycle Engine',
        'SYSTEM',
        'SUBSCRIPTION_EXPIRED',
        'SUBSCRIPTION',
        sub.id,
        sub.business_id,
        { previousStatus: sub.status, newStatus: lifecycle.status }
      );
    }

    // 2. Automated Idempotent Reminders (H-3 and H-1)
    const targetEndDateStr = sub.status === 'TRIAL' && sub.trial_end ? sub.trial_end : sub.end_date;
    if (targetEndDateStr && !lifecycle.isReadOnly) {
      const targetEndTime = new Date(targetEndDateStr).getTime();
      const diffMs = targetEndTime - nowTime;

      const isH3 = diffMs > 0 && diffMs <= threeDaysMs && diffMs > 2 * 24 * 60 * 60 * 1000;
      const isH1 = diffMs > 0 && diffMs <= oneDayMs;

      if (isH3 || isH1) {
        const reminderTag = isH1 ? 'REMINDER_H1' : 'REMINDER_H3';
        const todayDateStr = now.toISOString().substring(0, 10);

        // Check if reminder was already dispatched today to prevent duplicates
        const existingAudit = db.prepare(`
          SELECT id FROM admin_audit_logs
          WHERE business_id = ? AND action = ? AND timestamp LIKE ?
        `).get(sub.business_id, reminderTag, `${todayDateStr}%`);

        if (!existingAudit) {
          const ownerUser = db.prepare(`
            SELECT name, email FROM users
            WHERE business_id = ? AND role IN ('Administrator', 'Manager / Owner')
            ORDER BY CASE WHEN role = 'Administrator' THEN 1 ELSE 2 END
            LIMIT 1
          `).get(sub.business_id) as any;

          if (ownerUser && ownerUser.email) {
            const isTrial = sub.status === 'TRIAL';
            const daysRemaining = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

            await emailService.sendSubscriptionReminder(ownerUser.email, {
              customerName: ownerUser.name,
              businessName: sub.business_name,
              planName: sub.plan_name,
              daysRemaining,
              expiryDate: targetEndDateStr.substring(0, 10),
              upgradeUrl: `https://${process.env.APP_URL || 'app.kalkulatorhpp.com'}/pricing`,
              isTrial,
            });

            remindersSent++;
            details.push({
              businessId: sub.business_id,
              action: reminderTag,
              recipient: ownerUser.email,
              daysRemaining,
            });

            logAdminAudit(
              'system_cron',
              'Vercel Cron Lifecycle Engine',
              'SYSTEM',
              reminderTag,
              'SUBSCRIPTION',
              sub.id,
              sub.business_id,
              { recipient: ownerUser.email, daysRemaining, isTrial }
            );
          }
        }
      }
    }
  }

  return {
    processedCount: subs.length,
    expiredCount,
    remindersSent,
    details,
  };
}

/**
 * Task 2: Retention Pruning & Ephemeral Data Cleanup
 * Schedule: Daily at 02:00 UTC (0 2 * * *)
 * Idempotent: Deletes only expired records based on timestamp comparison.
 */
export async function runRetentionCleanupJob(): Promise<{
  prunedBackups: number;
  deletedSessions: number;
  deletedResetTokens: number;
}> {
  const nowIso = new Date().toISOString();

  // 1. Prune expired backups via backupService
  const backupResult = await backupService.pruneExpiredBackups();

  // 2. Cleanup expired session tokens (> 7 days old)
  const sessionRun = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso);

  // 3. Cleanup expired password reset tokens (> 15 minutes old)
  const tokenRun = db.prepare('DELETE FROM password_reset_tokens WHERE expires_at < ? OR used = 1').run(nowIso);

  logSecurityAudit({
    action: 'admin_action',
    category: 'ADMIN',
    result: 'SUCCESS',
    details: `Vercel Cron Retention Cleanup: ${backupResult.prunedCount} cadangan kadaluarsa dibersihkan, ${sessionRun.changes} sesi kadaluarsa dihapus, ${tokenRun.changes} token reset dihapus.`,
  });

  return {
    prunedBackups: backupResult.prunedCount,
    deletedSessions: Number(sessionRun.changes),
    deletedResetTokens: Number(tokenRun.changes),
  };
}

/**
 * Task 3: Automated Platform Full Backup Snapshot
 * Schedule: Daily at 03:00 UTC (0 3 * * *)
 * Idempotent: Skips if a daily backup was already created within the last 20 hours.
 */
export async function runAutomatedBackupJob(): Promise<{
  skipped: boolean;
  reason?: string;
  backup?: any;
}> {
  const twentyHoursAgo = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  // Check if an automated backup already exists in the last 20 hours
  const recentAutoBackup = db.prepare(`
    SELECT id, timestamp FROM system_backups
    WHERE scope = 'PLATFORM_FULL' AND trigger_type = 'AUTOMATED_CRON' AND timestamp > ?
    LIMIT 1
  `).get(twentyHoursAgo) as any;

  if (recentAutoBackup) {
    return {
      skipped: true,
      reason: `Cadangan otomatis harian sudah berhasil dibuat pada ${recentAutoBackup.timestamp}. Melewati eksekusi duplikat.`,
    };
  }

  const backup = await backupService.createPlatformFullBackup(
    'Vercel Cron Automation',
    'AUTOMATED_CRON',
    30 // 30-day retention
  );

  return {
    skipped: false,
    backup: {
      id: backup.id,
      timestamp: backup.timestamp,
      sizeBytes: backup.sizeBytes,
      checksumSha256: backup.checksumSha256,
      tables: backup.tablesIncluded || [],
    },
  };
}
