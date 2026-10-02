import crypto from 'node:crypto';
import { dbAdapter } from './db';

export type SecurityAuditAction =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_change'
  | 'password_reset_request'
  | 'password_reset_success'
  | 'role_change'
  | 'invitation_sent'
  | 'invitation_revoked'
  | 'invitation_accepted'
  | 'user_deletion'
  | 'business_switch'
  | 'subscription_change'
  | 'payment_status'
  | 'admin_action';

export type SecurityAuditCategory = 'AUTH' | 'RBAC' | 'BILLING' | 'TENANT' | 'SECURITY' | 'ADMIN';
export type SecurityAuditResult = 'SUCCESS' | 'FAILURE' | 'BLOCKED';

export interface SecurityAuditEvent {
  action: SecurityAuditAction;
  category: SecurityAuditCategory;
  result: SecurityAuditResult;
  businessId?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  metadata?: Record<string, any>;
}

export interface ActivityLogEvent {
  businessId: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

/**
 * Sanitizes IP Address to protect privacy while preserving forensic utility
 */
function sanitizeIp(ip?: string): string {
  if (!ip) return '127.0.0.1';
  // Handle IPv6 localhost or standard IP addresses
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  return ip.replace(/^::ffff:/, '').substring(0, 45);
}

/**
 * Sanitizes User Agent string (truncates long strings, strips non-ASCII)
 */
function sanitizeUserAgent(ua?: string): string {
  if (!ua) return 'Unknown Client';
  return ua.replace(/[^\x20-\x7E]/g, '').substring(0, 200);
}

/**
 * Dedicated Security & Admin Audit Logger
 * Strictly separated from operational business activity logs
 */
export function logSecurityAudit(event: SecurityAuditEvent): void {
  try {
    const id = `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const cleanIp = sanitizeIp(event.ipAddress);
    const cleanUa = sanitizeUserAgent(event.userAgent);

    const secParams = [
      id,
      event.businessId || null,
      event.userId || null,
      event.userName || null,
      event.userEmail || null,
      event.userRole || null,
      event.action,
      event.category,
      event.result,
      cleanIp,
      cleanUa,
      event.details || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      timestamp,
    ];

    dbAdapter.execute(`
      INSERT INTO security_audit_logs (
        id, business_id, user_id, user_name, user_email, user_role,
        action, category, result, ip_address, user_agent, details, metadata_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, secParams).catch((err) => {
      console.error('[SecurityAudit] Failed to persist security audit record:', err.message);
    });

    // Also mirror to legacy admin_audit_logs if it affects administrative entities
    if (event.category === 'ADMIN' || event.category === 'TENANT' || event.category === 'BILLING') {
      try {
        const admParams = [
          id,
          event.userId || 'system',
          event.userName || 'System / Security Engine',
          event.userRole || 'SYSTEM',
          event.businessId || null,
          event.action.toUpperCase(),
          event.category,
          event.metadata?.targetId || event.businessId || 'global',
          timestamp,
          event.metadata ? JSON.stringify(event.metadata) : null,
        ];
        dbAdapter.execute(`
          INSERT INTO admin_audit_logs (
            id, actor_user_id, actor_name, actor_role, business_id, action, target_type, target_id, timestamp, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, admParams).catch(() => {});
      } catch {}
    }
  } catch (err) {
    console.error('[SecurityAudit] Failed to persist security audit record:', err);
  }
}

/**
 * Business Activity Logger (Recipes, Batches, Inventory, Master Data)
 */
export function logBusinessActivity(event: ActivityLogEvent): void {
  try {
    const id = `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();
    const cleanIp = sanitizeIp(event.ipAddress);

    const logRecord = {
      id,
      businessId: event.businessId,
      tenantId: event.businessId,
      userId: event.userId,
      userName: event.userName,
      action: event.action,
      type: event.action,
      module: event.module,
      details: event.details,
      timestamp,
      ipAddress: cleanIp,
      metadata: event.metadata || null,
    };

    dbAdapter.execute(`
      INSERT INTO activity_logs (id, business_id, user_id, action, module, timestamp, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      event.businessId,
      event.userId,
      event.action,
      event.module,
      timestamp,
      JSON.stringify(logRecord),
    ]).catch((err) => {
      console.error('[ActivityLog] Failed to persist business activity record:', err.message);
    });
  } catch (err) {
    console.error('[ActivityLog] Failed to persist business activity record:', err);
  }
}

/**
 * Super Admin Action Logger
 */
export function logAdminAudit(
  actorUserId: string,
  actorName: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId?: string,
  businessId?: string,
  metadata?: Record<string, any>
): void {
  try {
    const id = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const admParams = [
      id,
      actorUserId,
      actorName,
      actorRole,
      businessId || null,
      action,
      targetType,
      targetId || 'global',
      timestamp,
      metadata ? JSON.stringify(metadata) : null,
    ];

    dbAdapter.execute(`
      INSERT INTO admin_audit_logs (
        id, actor_user_id, actor_name, actor_role, business_id, action, target_type, target_id, timestamp, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, admParams).catch((err) => {
      console.error('[AdminAudit] Failed to record log:', err.message);
    });

    // Also record in security_audit_logs for single comprehensive view
    logSecurityAudit({
      action: 'admin_action',
      category: 'ADMIN',
      result: 'SUCCESS',
      businessId: businessId || undefined,
      userId: actorUserId,
      userName: actorName,
      userRole: actorRole,
      details: `Super Admin action "${action}" performed on ${targetType} (${targetId || 'global'}).`,
      metadata,
    });
  } catch (err) {
    console.error('[AdminAuditLog] Failed to persist admin audit record:', err);
  }
}

