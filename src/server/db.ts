import { DatabaseSync } from 'node:sqlite';
import { Pool } from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  mockTenants,
  mockUsers,
  mockCategories,
  mockUnits,
  mockSuppliers,
  mockRawMaterials,
  mockBOMs,
  mockProducts,
  mockProductionBatches,
  mockPurchaseOrders,
  mockStockMovements,
  mockActivityLogs,
  mockCompanySettings,
} from '../data/mockData';
import {
  mockCategoriesKaryaLogam,
  mockUnitsKaryaLogam,
  mockSuppliersKaryaLogam,
  mockRawMaterialsKaryaLogam,
  mockProductsKaryaLogam,
  mockBOMsKaryaLogam,
  mockBatchesKaryaLogam,
  mockPurchaseOrdersKaryaLogam,
  mockStockMovementsKaryaLogam,
  mockActivityLogsKaryaLogam,
  mockCompanySettingsKaryaLogam,
} from '../data/tenantSeedData';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

// ============================================================================
// 1. POSTGRESQL SERVERLESS CONNECTION POOL (SINGLETON)
// ============================================================================
let pgPoolInstance: Pool | null = null;

export function getPgPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!pgPoolInstance) {
    const connStr = process.env.DATABASE_URL;
    const isLocalhost = connStr.includes('localhost') || connStr.includes('127.0.0.1');
    pgPoolInstance = new Pool({
      connectionString: connStr,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
    });
    pgPoolInstance.on('error', (err) => {
      console.error('[PostgreSQL Pool Error]', err.message);
    });
  }
  return pgPoolInstance;
}

export function isUsingPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Convert SQLite '?' parameter placeholders to PostgreSQL '$1, $2, ...'
// and convert boolean comparisons for PostgreSQL BOOLEAN type compatibility
export function convertSqlForPg(sql: string): string {
  let paramIndex = 1;
  // Replace '?' that are not inside quotes
  let pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

  // Convert boolean literal checks so PostgreSQL does not error with "operator does not exist: boolean = integer"
  pgSql = pgSql
    .replace(/\bactive\s*=\s*1\b/gi, 'active = TRUE')
    .replace(/\bactive\s*=\s*0\b/gi, 'active = FALSE')
    .replace(/\bis_active\s*=\s*1\b/gi, 'is_active = TRUE')
    .replace(/\bis_active\s*=\s*0\b/gi, 'is_active = FALSE')
    .replace(/\bis_read_only\s*=\s*1\b/gi, 'is_read_only = TRUE')
    .replace(/\bis_read_only\s*=\s*0\b/gi, 'is_read_only = FALSE')
    .replace(/\bused\s*=\s*1\b/gi, 'used = TRUE')
    .replace(/\bused\s*=\s*0\b/gi, 'used = FALSE')
    .replace(/\bemail_verified\s*=\s*1\b/gi, 'email_verified = TRUE')
    .replace(/\bemail_verified\s*=\s*0\b/gi, 'email_verified = FALSE')
    .replace(/\bencrypted\s*=\s*1\b/gi, 'encrypted = TRUE')
    .replace(/\bencrypted\s*=\s*0\b/gi, 'encrypted = FALSE');

  // Handle SQLite INSERT OR REPLACE for PostgreSQL
  if (/^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+/i.test(pgSql)) {
    pgSql = pgSql.replace(/^\s*INSERT\s+OR\s+REPLACE\s+INTO\s+/i, 'INSERT INTO ');
    if (!/ON\s+CONFLICT/i.test(pgSql)) {
      if (/data_json/i.test(pgSql)) {
        pgSql += ' ON CONFLICT (id) DO UPDATE SET data_json = EXCLUDED.data_json';
      } else {
        pgSql += ' ON CONFLICT (id) DO NOTHING';
      }
    }
  }

  return pgSql;
}

// ============================================================================
// 2. SQLITE LOCAL / IN-MEMORY FALLBACK DRIVER
// ============================================================================
let sqliteDb: DatabaseSync;

if (hasDatabaseUrl) {
  // In PostgreSQL mode: use an ultra-fast in-memory SQLite instance for local caching & synchronous helper queries
  sqliteDb = new DatabaseSync(':memory:');
} else {
  // In Local Development mode: use persistent SQLite file on disk
  const DB_DIR = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  const DB_PATH = path.resolve(DB_DIR, 'hpp_saas.db');
  sqliteDb = new DatabaseSync(DB_PATH);
}

// Enable foreign keys and WAL mode
sqliteDb.exec('PRAGMA foreign_keys = ON;');
try {
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
} catch {}

// ============================================================================
// 3. ASYNC DATABASE ADAPTER (DIRECT POSTGRESQL IN PRODUCTION, SQLITE IN DEV)
// ============================================================================

export interface TrxExecutor {
  query: <R = any>(sql: string, params?: any[]) => Promise<R[]>;
  queryOne: <R = any>(sql: string, params?: any[]) => Promise<R | null>;
  execute: (sql: string, params?: any[]) => Promise<{ rowCount: number }>;
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pool.query(pgSql, params);
    return res.rows as T[];
  }
  const stmt = sqliteDb.prepare(sql);
  return stmt.all(...params) as T[];
}

export async function dbQueryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pool.query(pgSql, params);
    return (res.rows[0] as T) || null;
  }
  const stmt = sqliteDb.prepare(sql);
  const row = stmt.get(...params) as T;
  return row || null;
}

export async function dbExecute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
  const pool = getPgPool();
  if (pool) {
    const pgSql = convertSqlForPg(sql);
    const res = await pool.query(pgSql, params);
    return { rowCount: res.rowCount || 0 };
  }
  const stmt = sqliteDb.prepare(sql);
  const info: any = stmt.run(...params);
  const rowCount = typeof info?.changes === 'number' || typeof info?.changes === 'bigint' ? Number(info.changes) : 1;
  return { rowCount };
}

export async function dbTransaction<T>(
  callback: (executor: TrxExecutor) => Promise<T>
): Promise<T> {
  const pool = getPgPool();
  if (pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const executor: TrxExecutor = {
        query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
          const res = await client.query(convertSqlForPg(sql), params);
          return res.rows as R[];
        },
        queryOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
          const res = await client.query(convertSqlForPg(sql), params);
          return (res.rows[0] as R) || null;
        },
        execute: async (sql: string, params: any[] = []): Promise<{ rowCount: number }> => {
          const res = await client.query(convertSqlForPg(sql), params);
          return { rowCount: res.rowCount || 0 };
        },
      };
      const result = await callback(executor);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  // SQLite transaction for development
  sqliteDb.exec('BEGIN TRANSACTION;');
  try {
    const executor: TrxExecutor = {
      query: async <R = any>(sql: string, params: any[] = []): Promise<R[]> => {
        return sqliteDb.prepare(sql).all(...params) as R[];
      },
      queryOne: async <R = any>(sql: string, params: any[] = []): Promise<R | null> => {
        return (sqliteDb.prepare(sql).get(...params) as R) || null;
      },
      execute: async (sql: string, params: any[] = []): Promise<{ rowCount: number }> => {
        const info: any = sqliteDb.prepare(sql).run(...params);
        const rowCount = typeof info?.changes === 'number' || typeof info?.changes === 'bigint' ? Number(info.changes) : 1;
        return { rowCount };
      },
    };
    const result = await callback(executor);
    sqliteDb.exec('COMMIT;');
    return result;
  } catch (err) {
    sqliteDb.exec('ROLLBACK;');
    throw err;
  }
}

// ============================================================================
// UNIFIED PRODUCTION DATABASE ADAPTER
// ============================================================================
export const dbAdapter = {
  // Query One
  async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    return dbQueryOne<T>(sql, params);
  },

  // Query Many / All
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return dbQuery<T>(sql, params);
  },
  async queryMany<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return dbQuery<T>(sql, params);
  },

  // Execute (INSERT, UPDATE, DELETE)
  async execute(sql: string, params: any[] = []): Promise<{ rowCount: number }> {
    return dbExecute(sql, params);
  },

  // Transaction
  async transaction<T>(callback: (trx: TrxExecutor) => Promise<T>): Promise<T> {
    return dbTransaction<T>(callback);
  },

  // Generic Insert Helper
  async insert(table: string, data: Record<string, any>, onConflict?: string): Promise<{ rowCount: number }> {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map((k) => {
      const val = data[k];
      if (['active', 'is_active', 'is_read_only', 'email_verified', 'used', 'encrypted'].includes(k)) {
        if (isUsingPostgres()) {
          return Boolean(val);
        }
        return val ? 1 : 0;
      }
      return val;
    });

    let sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
    if (onConflict) {
      sql += ` ${onConflict}`;
    }
    return dbExecute(sql, values);
  },

  // Generic Update Helper
  async update(table: string, data: Record<string, any>, whereClause: string, whereParams: any[] = []): Promise<{ rowCount: number }> {
    const keys = Object.keys(data);
    const setClause = keys.map((k) => `${k} = ?`).join(', ');
    const values = keys.map((k) => {
      const val = data[k];
      if (['active', 'is_active', 'is_read_only', 'email_verified', 'used', 'encrypted'].includes(k)) {
        if (isUsingPostgres()) {
          return Boolean(val);
        }
        return val ? 1 : 0;
      }
      return val;
    });

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    return dbExecute(sql, [...values, ...whereParams]);
  },

  // Generic Delete Helper
  async delete(table: string, whereClause: string, whereParams: any[] = []): Promise<{ rowCount: number }> {
    const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
    return dbExecute(sql, whereParams);
  },

  // Session Domain Adapter
  session: {
    async create(userId: string, businessId: string, durationDays = 7): Promise<string> {
      const token = `sess_${crypto.randomBytes(32).toString('hex')}`;
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      await dbExecute(
        'INSERT INTO sessions (token, user_id, business_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)',
        [token, userId, businessId, createdAt, expiresAt]
      );
      return token;
    },

    async get(token: string): Promise<any> {
      return dbQueryOne(`
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
    },

    async invalidate(token: string): Promise<void> {
      await dbExecute('DELETE FROM sessions WHERE token = ?', [token]);
    },

    async cleanExpired(): Promise<number> {
      const now = new Date().toISOString();
      const res = await dbExecute('DELETE FROM sessions WHERE expires_at <= ?', [now]);
      return res.rowCount;
    },
  },

  // Authentication Domain Adapter
  auth: {
    async findUserByIdentifier(identifier: string): Promise<any> {
      const trimmed = String(identifier).trim().toLowerCase();
      return dbQueryOne(`
        SELECT u.*, b.name as business_name, b.plan as business_plan, b.status as business_status
        FROM users u
        JOIN businesses b ON u.business_id = b.id
        WHERE LOWER(u.email) = ? OR LOWER(u.username) = ?
      `, [trimmed, trimmed]);
    },

    async findUserById(userId: string): Promise<any> {
      return dbQueryOne('SELECT id, business_id, name, email, role, active, data_json FROM users WHERE id = ?', [userId]);
    },

    async verifyMembership(businessId: string, email: string): Promise<any> {
      const cleanEmail = String(email).trim().toLowerCase();
      return dbQueryOne(`
        SELECT u.id, u.role, u.active, b.name as business_name, b.plan as business_plan, b.status as business_status
        FROM users u
        JOIN businesses b ON u.business_id = b.id
        WHERE u.business_id = ? AND LOWER(u.email) = ? AND (u.active = TRUE OR u.active = 1)
      `, [businessId, cleanEmail]);
    },

    async updateLastLogin(userId: string, lastLogin?: string): Promise<void> {
      const ts = lastLogin || new Date().toISOString().replace('T', ' ').substring(0, 16);
      await dbExecute('UPDATE users SET last_login = ? WHERE id = ?', [ts, userId]);
    },

    async createResetToken(userId: string, token: string, expiresAt: string): Promise<void> {
      const id = `pwd_tok_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const now = new Date().toISOString();
      const usedVal = isUsingPostgres() ? false : 0;
      await dbExecute(
        'INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, token, expiresAt, usedVal, now]
      );
    },

    async getResetToken(token: string): Promise<any> {
      return dbQueryOne('SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?', [token]);
    },

    async markResetTokenUsed(tokenId: string): Promise<void> {
      const usedVal = isUsingPostgres() ? true : 1;
      await dbExecute('UPDATE password_reset_tokens SET used = ? WHERE id = ?', [usedVal, tokenId]);
    },

    async updateUserPassword(userId: string, passwordHash: string, salt: string): Promise<void> {
      await dbExecute('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?', [passwordHash, salt, userId]);
    },

    async invalidateUserSessions(userId: string): Promise<void> {
      await dbExecute('DELETE FROM sessions WHERE user_id = ?', [userId]);
    },
  },

  // Audit Domain Adapter
  audit: {
    async logSecurity(event: any): Promise<void> {
      const id = `sec_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const timestamp = new Date().toISOString();
      const ip = event.ipAddress || '127.0.0.1';
      const cleanIp = ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '').substring(0, 45);
      const cleanUa = (event.userAgent || 'Unknown Client').replace(/[^\x20-\x7E]/g, '').substring(0, 200);

      const params = [
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

      await dbExecute(`
        INSERT INTO security_audit_logs (
          id, business_id, user_id, user_name, user_email, user_role,
          action, category, result, ip_address, user_agent, details, metadata_json, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, params).catch((err) => {
        console.error('[SecurityAudit] Failed to persist log:', err.message);
      });
    },

    async logBusiness(event: any): Promise<void> {
      const id = `act_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const timestamp = new Date().toISOString();
      const ip = event.ipAddress || '127.0.0.1';
      const cleanIp = ip === '::1' || ip === '::ffff:127.0.0.1' ? '127.0.0.1' : ip.replace(/^::ffff:/, '').substring(0, 45);

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

      await dbExecute(`
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
        console.error('[ActivityLog] Failed to persist log:', err.message);
      });
    },

    async logAdmin(
      actorUserId: string,
      actorName: string,
      actorRole: string,
      action: string,
      targetType: string,
      targetId: string,
      businessId?: string,
      metadata?: Record<string, any>
    ): Promise<void> {
      const id = `adm_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const timestamp = new Date().toISOString();

      await dbExecute(`
        INSERT INTO admin_audit_logs (
          id, actor_user_id, actor_name, actor_role, business_id, action, target_type, target_id, timestamp, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
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
      ]).catch((err) => {
        console.error('[AdminAuditLog] Failed to persist log:', err.message);
      });
    },
  },
};

// ============================================================================
// 4. TRANSPARENT COMPATIBILITY PROXY FOR db.prepare(...)
// ============================================================================
export const db = {
  prepare(sql: string) {
    const stmt = sqliteDb.prepare(sql);
    return {
      get(...params: any[]) {
        return stmt.get(...params);
      },
      all(...params: any[]) {
        return stmt.all(...params);
      },
      run(...params: any[]) {
        return stmt.run(...params);
      },
    };
  },
  exec(sql: string) {
    sqliteDb.exec(sql);
  },
};

// ============================================================================
// 5. INITIALIZATION & SEED LOGIC
// ============================================================================
let isInitialized = false;

export function initDatabase() {
  if (isInitialized) return;
  isInitialized = true;

  // Initialize SQLite schema (for local dev or in-memory cache)
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      industry TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'Business Pro',
      logo_text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      currency TEXT NOT NULL DEFAULT 'IDR',
      business_type TEXT DEFAULT 'F&B / Kuliner',
      onboarding_status TEXT DEFAULT 'NOT_STARTED',
      onboarding_step INTEGER DEFAULT 1,
      onboarding_data_json TEXT,
      created_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      email_verified INTEGER DEFAULT 1,
      last_login TEXT,
      created_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_business ON sessions(business_id);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_categories_biz ON categories(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_biz_code ON categories(business_id, code, type);

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_units_biz ON units(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_units_biz_code ON units(business_id, code);

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktif',
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_suppliers_biz ON suppliers(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_biz_code ON suppliers(business_id, code);

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aktif',
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_biz_code ON customers(business_id, code);

    CREATE TABLE IF NOT EXISTS raw_materials (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      status TEXT NOT NULL DEFAULT 'Aktif',
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_raw_materials_biz ON raw_materials(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_materials_biz_code ON raw_materials(business_id, code);

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      category_id TEXT,
      status TEXT NOT NULL DEFAULT 'Aktif',
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_biz ON products(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_products_biz_sku ON products(business_id, sku);

    CREATE TABLE IF NOT EXISTS boms (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_boms_biz ON boms(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_boms_biz_code ON boms(business_id, code);

    CREATE TABLE IF NOT EXISTS production_batches (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      batch_number TEXT NOT NULL,
      bom_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      status TEXT NOT NULL,
      date TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_batches_biz ON production_batches(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_biz_num ON production_batches(business_id, batch_number);

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      po_number TEXT NOT NULL,
      supplier_id TEXT NOT NULL,
      status TEXT NOT NULL,
      order_date TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_po_biz ON purchase_orders(business_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_po_biz_num ON purchase_orders(business_id, po_number);

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_movements_biz ON stock_movements(business_id);

    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_biz ON activity_logs(business_id);

    CREATE TABLE IF NOT EXISTS company_settings (
      business_id TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price_monthly REAL NOT NULL DEFAULT 0,
      price_yearly REAL NOT NULL DEFAULT 0,
      billing_period TEXT NOT NULL DEFAULT 'MONTHLY',
      trial_days INTEGER NOT NULL DEFAULT 14,
      is_active INTEGER NOT NULL DEFAULT 1,
      features_json TEXT NOT NULL,
      limits_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      plan_id TEXT NOT NULL REFERENCES plans(id),
      status TEXT NOT NULL DEFAULT 'TRIAL',
      billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      trial_start TEXT,
      trial_end TEXT,
      is_read_only INTEGER NOT NULL DEFAULT 0,
      payment_reference TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_subs_biz ON subscriptions(business_id);
    CREATE INDEX IF NOT EXISTS idx_subs_plan ON subscriptions(plan_id);

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invitations_biz ON invitations(business_id);
    CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      business_id TEXT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_logs_biz ON admin_audit_logs(business_id);
    CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON admin_audit_logs(timestamp);

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pwd_tokens ON password_reset_tokens(token);

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      invoice_number TEXT NOT NULL UNIQUE,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      status TEXT NOT NULL,
      billing_cycle TEXT NOT NULL,
      payment_method TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      data_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_biz ON invoices(business_id);

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_tx_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'IDR',
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      payment_url TEXT,
      qr_code_data TEXT,
      virtual_account TEXT,
      metadata_json TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pay_tx_biz ON payment_transactions(business_id);
    CREATE INDEX IF NOT EXISTS idx_pay_tx_inv ON payment_transactions(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_pay_tx_provider ON payment_transactions(provider_tx_id);

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      status TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_ref ON webhook_events(reference_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_event ON webhook_events(provider, event_id);

    CREATE TABLE IF NOT EXISTS security_audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT,
      user_id TEXT,
      user_name TEXT,
      user_email TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      result TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      details TEXT,
      metadata_json TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sec_logs_biz ON security_audit_logs(business_id);
    CREATE INDEX IF NOT EXISTS idx_sec_logs_action ON security_audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_sec_logs_time ON security_audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sec_logs_user ON security_audit_logs(user_id);

    CREATE TABLE IF NOT EXISTS error_logs (
      id TEXT PRIMARY KEY,
      error_id TEXT NOT NULL UNIQUE,
      business_id TEXT,
      user_id TEXT,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      error_name TEXT NOT NULL,
      message TEXT NOT NULL,
      sanitized_message TEXT NOT NULL,
      stack_trace TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_err_logs_err_id ON error_logs(error_id);
    CREATE INDEX IF NOT EXISTS idx_err_logs_time ON error_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_err_logs_biz ON error_logs(business_id);

    CREATE TABLE IF NOT EXISTS system_backups (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      business_id TEXT,
      business_name TEXT,
      version TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      tables_json TEXT NOT NULL,
      record_counts_json TEXT NOT NULL,
      encrypted INTEGER NOT NULL DEFAULT 1,
      storage_location TEXT NOT NULL,
      retention_expires_at TEXT NOT NULL,
      triggered_by TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_backups_biz ON system_backups(business_id);
    CREATE INDEX IF NOT EXISTS idx_backups_time ON system_backups(timestamp);
    CREATE INDEX IF NOT EXISTS idx_backups_retention ON system_backups(retention_expires_at);
  `);

  if (!hasDatabaseUrl) {
    ensurePlatformAndPlansSeeded();
    seedIfEmpty();
  }
}

// Auto-initialize tables on module load
initDatabase();

export function logAdminAudit(
  actorUserId: string,
  actorName: string,
  actorRole: string,
  action: string,
  targetType: string,
  targetId: string,
  businessId?: string,
  metadata?: Record<string, any>
) {
  dbAdapter.audit.logAdmin(actorUserId, actorName, actorRole, action, targetType, targetId, businessId, metadata).catch((err) => {
    console.error('[AdminAudit] Failed to record log:', err);
  });
}

function ensurePlatformAndPlansSeeded() {
  // 1. Ensure 'platform' business exists for SUPER_ADMIN
  const platformBiz = sqliteDb.prepare('SELECT id FROM businesses WHERE id = ?').get('platform');
  if (!platformBiz) {
    const now = new Date().toISOString();
    const platformData = {
      id: 'platform',
      name: 'HPP SaaS Platform Admin',
      code: 'PLATFORM',
      industry: 'Cloud SaaS Management',
      plan: 'BUSINESS',
      logoText: 'SAAS',
      skuCount: 0,
      maxSku: 99999,
      status: 'active',
      currency: 'IDR',
      createdAt: now,
    };
    sqliteDb.prepare(`
      INSERT INTO businesses (id, name, code, industry, plan, logo_text, status, currency, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('platform', platformData.name, platformData.code, platformData.industry, 'BUSINESS', 'SAAS', 'active', 'IDR', now, JSON.stringify(platformData));
  }

  // 2. Ensure Super Admin user exists (Credentials configurable via environment variables)
  const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@hppsaas.com').trim().toLowerCase();
  const superAdminUser = sqliteDb.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(superAdminEmail);
  if (!superAdminUser) {
    const defaultDevPwd = process.env.NODE_ENV === 'production'
      ? crypto.randomBytes(16).toString('hex')
      : 'SuperAdmin123!';
    const superAdminPassword = process.env.SUPERADMIN_PASSWORD || defaultDevPwd;
    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer(superAdminPassword, salt);
    const now = new Date().toISOString();
    const userObj = {
      id: 'usr_superadmin',
      businessId: 'platform',
      tenantId: 'platform',
      name: 'Platform Super Admin',
      username: superAdminEmail.split('@')[0],
      email: superAdminEmail,
      role: 'SUPER_ADMIN',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      phone: '0811-0000-9999',
      active: true,
      createdAt: now,
      lastLogin: now.replace('T', ' ').substring(0, 16),
    };
    sqliteDb.prepare(`
      INSERT INTO users (id, business_id, name, username, email, password_hash, salt, role, active, last_login, created_at, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('usr_superadmin', 'platform', userObj.name, userObj.username, userObj.email, pwdHash, salt, 'SUPER_ADMIN', 1, userObj.lastLogin, now, JSON.stringify(userObj));
    console.log(`[Database] Seeded Platform Super Admin account for email: ${superAdminEmail}`);
  }

  // 3. Ensure SaaS Plans exist
  const planCount = (sqliteDb.prepare('SELECT COUNT(*) as count FROM plans').get() as { count: number }).count;
  if (planCount === 0) {
    const now = new Date().toISOString();
    const insertPlan = sqliteDb.prepare(`
      INSERT INTO plans (
        id, code, name, description, price_monthly, price_yearly,
        billing_period, trial_days, is_active, features_json, limits_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // FREE Plan
    insertPlan.run(
      'plan_free',
      'FREE',
      'Free Tier',
      'Paket gratis untuk perintis usaha & eksplorasi kalkulasi HPP dasar.',
      0,
      0,
      'MONTHLY',
      0,
      1,
      JSON.stringify(['HPP', 'BOM', 'REPORT']),
      JSON.stringify({
        maxUsers: 1,
        maxProducts: 5,
        maxRawMaterials: 10,
        maxBoms: 2,
        maxBatchesMonthly: 5,
      }),
      now,
      now
    );

    // STARTER Plan
    insertPlan.run(
      'plan_starter',
      'STARTER',
      'Starter UMKM',
      'Paket esensial untuk bisnis skala kecil yang butuh kontrol bahan baku & SPK.',
      149000,
      1490000,
      'MONTHLY',
      14,
      1,
      JSON.stringify(['HPP', 'BOM', 'PRODUKSI', 'INVENTORY', 'SUPPLIER', 'PURCHASE', 'REPORT', 'EXPORT']),
      JSON.stringify({
        maxUsers: 2,
        maxProducts: 100,
        maxRawMaterials: 50,
        maxBoms: 50,
        maxBatchesMonthly: 100,
      }),
      now,
      now
    );

    // PRO Plan
    insertPlan.run(
      'plan_pro',
      'PRO',
      'Business Pro',
      'Paket terlengkap untuk bisnis berkembang dengan tim produksi & analisis margin mendalam.',
      399000,
      3990000,
      'MONTHLY',
      14,
      1,
      JSON.stringify([
        'HPP',
        'BOM',
        'PRODUKSI',
        'INVENTORY',
        'SUPPLIER',
        'PURCHASE',
        'PROFITABILITY',
        'REPORT',
        'EXPORT',
        'MULTI_USER',
        'ADVANCED_REPORT',
        'AUDIT_LOG',
      ]),
      JSON.stringify({
        maxUsers: 10,
        maxProducts: 1000,
        maxRawMaterials: 500,
        maxBoms: 500,
        maxBatchesMonthly: 1000,
      }),
      now,
      now
    );

    // BUSINESS Plan
    insertPlan.run(
      'plan_business',
      'BUSINESS',
      'Enterprise Scale',
      'Solusi tanpa batas untuk industri manufaktur, multi-cabang & integrasi sistem.',
      899000,
      8990000,
      'MONTHLY',
      30,
      1,
      JSON.stringify([
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
      ]),
      JSON.stringify({
        maxUsers: 50,
        maxProducts: 10000,
        maxRawMaterials: 5000,
        maxBoms: 5000,
        maxBatchesMonthly: 10000,
      }),
      now,
      now
    );
  }

  // 4. Ensure Subscriptions for existing businesses
  const subCount = (sqliteDb.prepare('SELECT COUNT(*) as count FROM subscriptions').get() as { count: number }).count;
  if (subCount === 0) {
    const now = new Date();
    const nowIso = now.toISOString();
    const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const insertSub = sqliteDb.prepare(`
      INSERT INTO subscriptions (
        id, business_id, plan_id, status, billing_cycle,
        start_date, end_date, trial_start, trial_end, is_read_only, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // tenant-1: PT Boga Rasa Nusantara -> Active Business Pro Subscription
    const b1 = sqliteDb.prepare('SELECT id FROM businesses WHERE id = ?').get('tenant-1');
    if (b1) {
      insertSub.run(
        'sub_tenant_1',
        'tenant-1',
        'plan_pro',
        'ACTIVE',
        'YEARLY',
        nowIso,
        oneYearLater,
        null,
        null,
        0,
        'Paket Business Pro aktif tahunan',
        nowIso,
        nowIso
      );
    }

    // tenant-2: CV Karya Logam Mandiri -> Active 14-day Trial on Starter
    const b2 = sqliteDb.prepare('SELECT id FROM businesses WHERE id = ?').get('tenant-2');
    if (b2) {
      insertSub.run(
        'sub_tenant_2',
        'tenant-2',
        'plan_starter',
        'TRIAL',
        'MONTHLY',
        sevenDaysAgo,
        sevenDaysLater,
        sevenDaysAgo,
        sevenDaysLater,
        0,
        'Masa uji coba 14 hari paket Starter',
        sevenDaysAgo,
        nowIso
      );
    }
  }
}

export function hashPasswordServer(password: string, salt: string): string {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export function generateSaltServer(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

export function verifyPasswordServer(password: string, salt: string, expectedHash: string): boolean {
  const hash = hashPasswordServer(password, salt);
  return hash.toLowerCase() === expectedHash.toLowerCase();
}

function seedIfEmpty() {
  const countRow = sqliteDb.prepare('SELECT COUNT(*) as count FROM businesses').get() as { count: number };
  if (countRow && countRow.count > 0) {
    return;
  }

  console.log('[Database] Seeding initial multi-business data into SQLite relational database...');

  // 1. Businesses
  const insertBusiness = sqliteDb.prepare(`
    INSERT INTO businesses (id, name, code, industry, plan, logo_text, status, currency, created_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of mockTenants) {
    insertBusiness.run(
      b.id,
      b.name,
      b.code || b.logoText,
      b.industry,
      b.plan,
      b.logoText,
      b.status,
      b.currency || 'IDR',
      b.createdAt || new Date().toISOString(),
      JSON.stringify(b)
    );
  }

  // 2. Users
  const insertUser = sqliteDb.prepare(`
    INSERT INTO users (id, business_id, name, username, email, password_hash, salt, role, active, last_login, created_at, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of mockUsers) {
    const salt = generateSaltServer();
    const pwdHash = hashPasswordServer('Password123!', salt);
    const item = { ...u, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertUser.run(u.id, 'tenant-1', u.name, u.email.split('@')[0], u.email, pwdHash, salt, u.role, u.active ? 1 : 0, 1, (u as any).lastLogin || null, (u as any).createdAt || new Date().toISOString(), JSON.stringify(item));
  }

  const saltKarya = generateSaltServer();
  const pwdHashKarya = hashPasswordServer('Password123!', saltKarya);
  insertUser.run('usr_karya_owner', 'tenant-2', 'Hendra Gunawan', 'hendra_karya', 'hendra@karyalogam.com', pwdHashKarya, saltKarya, 'Manager / Owner', 1, null, new Date().toISOString(), JSON.stringify({
    id: 'usr_karya_owner',
    businessId: 'tenant-2',
    name: 'Hendra Gunawan',
    email: 'hendra@karyalogam.com',
    role: 'Manager / Owner',
    active: true,
  }));

  // 3. Categories
  const insertCat = sqliteDb.prepare(`
    INSERT INTO categories (id, business_id, name, code, type, data_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const c of mockCategories) {
    const item = { ...c, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertCat.run(c.id, 'tenant-1', c.name, c.code, c.type, JSON.stringify(item));
  }
  for (const c of mockCategoriesKaryaLogam) {
    const item = { ...c, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertCat.run(c.id, 'tenant-2', c.name, c.code, c.type, JSON.stringify(item));
  }

  // 4. Units
  const insertUnit = sqliteDb.prepare(`
    INSERT INTO units (id, business_id, name, code, data_json)
    VALUES (?, ?, ?, ?, ?)
  `);
  for (const u of mockUnits) {
    const item = { ...u, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertUnit.run(u.id, 'tenant-1', u.name, u.code, JSON.stringify(item));
  }
  for (const u of mockUnitsKaryaLogam) {
    const item = { ...u, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertUnit.run(u.id, 'tenant-2', u.name, u.code, JSON.stringify(item));
  }

  // 5. Suppliers
  const insertSup = sqliteDb.prepare(`
    INSERT INTO suppliers (id, business_id, code, name, status, data_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const s of mockSuppliers) {
    const item = { ...s, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertSup.run(s.id, 'tenant-1', s.code, s.name, s.status, JSON.stringify(item));
  }
  for (const s of mockSuppliersKaryaLogam) {
    const item = { ...s, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertSup.run(s.id, 'tenant-2', s.code, s.name, s.status, JSON.stringify(item));
  }

  // 6. Raw Materials
  const insertRM = sqliteDb.prepare(`
    INSERT INTO raw_materials (id, business_id, code, name, category_id, status, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const rm of mockRawMaterials) {
    const item = { ...rm, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertRM.run(rm.id, 'tenant-1', rm.code, rm.name, rm.categoryId, rm.status, JSON.stringify(item));
  }
  for (const rm of mockRawMaterialsKaryaLogam) {
    const item = { ...rm, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertRM.run(rm.id, 'tenant-2', rm.code, rm.name, rm.categoryId, rm.status, JSON.stringify(item));
  }

  // 7. Products
  const insertProd = sqliteDb.prepare(`
    INSERT INTO products (id, business_id, sku, name, category_id, status, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const p of mockProducts) {
    const item = { ...p, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertProd.run(p.id, 'tenant-1', p.sku, p.name, p.categoryId, p.status, JSON.stringify(item));
  }
  for (const p of mockProductsKaryaLogam) {
    const item = { ...p, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertProd.run(p.id, 'tenant-2', p.sku, p.name, p.categoryId, p.status, JSON.stringify(item));
  }

  // 8. BOMs
  const insertBOM = sqliteDb.prepare(`
    INSERT INTO boms (id, business_id, code, product_id, product_name, data_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const b of mockBOMs) {
    const item = { ...b, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertBOM.run(b.id, 'tenant-1', b.code, b.productId, b.productName, JSON.stringify(item));
  }
  for (const b of mockBOMsKaryaLogam) {
    const item = { ...b, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertBOM.run(b.id, 'tenant-2', b.code, b.productId, b.productName, JSON.stringify(item));
  }

  // 9. Production Batches
  const insertBatch = sqliteDb.prepare(`
    INSERT INTO production_batches (id, business_id, batch_number, bom_id, product_id, status, date, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const pb of mockProductionBatches) {
    const item = { ...pb, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertBatch.run(pb.id, 'tenant-1', pb.batchNumber, pb.bomId, pb.productId, pb.status, (pb as any).date || (pb as any).startDate || '', JSON.stringify(item));
  }
  for (const pb of mockBatchesKaryaLogam) {
    const item = { ...pb, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertBatch.run(pb.id, 'tenant-2', pb.batchNumber, pb.bomId, pb.productId, pb.status, (pb as any).date || (pb as any).startDate || '', JSON.stringify(item));
  }

  // 10. Purchase Orders
  const insertPO = sqliteDb.prepare(`
    INSERT INTO purchase_orders (id, business_id, po_number, supplier_id, status, order_date, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const po of mockPurchaseOrders) {
    const item = { ...po, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertPO.run(po.id, 'tenant-1', po.poNumber, po.supplierId, po.status, (po as any).orderDate || (po as any).date || '', JSON.stringify(item));
  }
  for (const po of mockPurchaseOrdersKaryaLogam) {
    const item = { ...po, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertPO.run(po.id, 'tenant-2', po.poNumber, po.supplierId, po.status, (po as any).orderDate || (po as any).date || '', JSON.stringify(item));
  }

  // 11. Stock Movements
  const insertMovement = sqliteDb.prepare(`
    INSERT INTO stock_movements (id, business_id, item_id, type, date, data_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const sm of mockStockMovements) {
    const item = { ...sm, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertMovement.run(sm.id, 'tenant-1', sm.itemId, sm.type, sm.date, JSON.stringify(item));
  }
  for (const sm of mockStockMovementsKaryaLogam) {
    const item = { ...sm, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertMovement.run(sm.id, 'tenant-2', sm.itemId, sm.type, sm.date, JSON.stringify(item));
  }

  // 12. Activity Logs
  const insertLog = sqliteDb.prepare(`
    INSERT INTO activity_logs (id, business_id, user_id, action, module, timestamp, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of mockActivityLogs) {
    const action = (l as any).action || (l as any).type || 'Aktivitas';
    const item = { ...l, action, businessId: 'tenant-1', tenantId: 'tenant-1' };
    insertLog.run(l.id, 'tenant-1', (l as any).userId || 'user-1', action, l.module || 'Sistem', l.timestamp || new Date().toISOString(), JSON.stringify(item));
  }
  for (const l of mockActivityLogsKaryaLogam) {
    const action = (l as any).action || (l as any).type || 'Aktivitas';
    const item = { ...l, action, businessId: 'tenant-2', tenantId: 'tenant-2' };
    insertLog.run(l.id, 'tenant-2', (l as any).userId || 'user-karya-1', action, l.module || 'Sistem', l.timestamp || new Date().toISOString(), JSON.stringify(item));
  }

  // 13. Company Settings
  const insertSettings = sqliteDb.prepare(`
    INSERT INTO company_settings (business_id, company_name, data_json)
    VALUES (?, ?, ?)
  `);
  const cName1 = (mockCompanySettings as any).companyName || mockTenants[0].name;
  const cName2 = (mockCompanySettingsKaryaLogam as any).companyName || mockTenants[1].name;
  insertSettings.run('tenant-1', cName1, JSON.stringify({ ...mockCompanySettings, companyName: cName1 }));
  insertSettings.run('tenant-2', cName2, JSON.stringify({ ...mockCompanySettingsKaryaLogam, companyName: cName2 }));

  console.log('[Database] Seeding finished successfully! All tables populated with foreign keys.');
}
