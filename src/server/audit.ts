import crypto from 'node:crypto';
import { db } from './db';

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

    db.prepare(`
      INSERT INTO security_audit_logs (
        id, business_id, user_id, user_name, user_email, user_role,
        action, category, result, ip_address, user_agent, details, metadata_json, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
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
      timestamp
    );

    // Also mirror to legacy admin_audit_logs if it affects administrative entities
    if (event.category === 'ADMIN' || event.category === 'TENANT' || event.category === 'BILLING') {
      try {
        db.prepare(`
          INSERT INTO admin_audit_logs (
            id, actor_user_id, actor_name, actor_role, business_id, action, target_type, target_id, timestamp, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          event.userId || 'system',
          event.userName || 'System / Security Engine',
          event.userRole || 'SYSTEM',
          event.businessId || null,
          event.action.toUpperCase(),
          event.category,
          event.metadata?.targetId || event.businessId || 'global',
          timestamp,
          event.metadata ? JSON.stringify(event.metadata) : null
        );
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

    db.prepare(`
      INSERT INTO activity_logs (id, business_id, user_id, action, module, timestamp, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      event.businessId,
      event.userId,
      event.action,
      event.module,
      timestamp,
      JSON.stringify(logRecord)
    );
  } catch (err) {
    console.error('[ActivityLog] Failed to persist business activity record:', err);
  }
}
