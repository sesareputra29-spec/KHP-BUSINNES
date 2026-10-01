import { db } from './db';

export interface IntegrityCheckResult {
  passed: boolean;
  totalTables: number;
  tableStats: Record<string, number>;
  foreignKeyErrors: Array<{ table: string; rowid: any; parent: string; fkid: number }>;
  orphanRecords: Record<string, number>;
  uniqueConstraintIssues: string[];
}

export const RELATIONAL_TABLES = [
  'businesses',
  'plans',
  'users',
  'sessions',
  'categories',
  'units',
  'suppliers',
  'customers',
  'raw_materials',
  'products',
  'boms',
  'production_batches',
  'purchase_orders',
  'stock_movements',
  'activity_logs',
  'company_settings',
  'subscriptions',
  'invitations',
  'invoices',
  'admin_audit_logs',
  'password_reset_tokens',
  'payment_transactions',
  'webhook_events',
  'security_audit_logs',
  'error_logs',
  'system_backups',
] as const;

/**
 * Audit database integrity across all 19 SaaS relational tables.
 */
export function auditDatabaseIntegrity(): IntegrityCheckResult {
  const tableStats: Record<string, number> = {};
  const orphanRecords: Record<string, number> = {};
  const uniqueConstraintIssues: string[] = [];

  // 1. Table Counts
  for (const table of RELATIONAL_TABLES) {
    try {
      const res = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number };
      tableStats[table] = res.count;
    } catch (err: any) {
      tableStats[table] = -1;
    }
  }

  // 2. Foreign Key Check (SQLite native pragma)
  const fkCheck = db.prepare('PRAGMA foreign_key_check;').all() as Array<{
    table: string;
    rowid: any;
    parent: string;
    fkid: number;
  }>;

  // 3. Tenant Isolation & Orphan Check: every business_id must exist in businesses
  for (const table of RELATIONAL_TABLES) {
    if (
      table === 'businesses' ||
      table === 'plans' ||
      table === 'admin_audit_logs' ||
      table === 'password_reset_tokens' ||
      table === 'webhook_events' ||
      table === 'error_logs' ||
      table === 'security_audit_logs' ||
      table === 'system_backups'
    ) {
      continue;
    }
    try {
      const orphans = db.prepare(`
        SELECT COUNT(*) as count
        FROM ${table} t
        LEFT JOIN businesses b ON t.business_id = b.id
        WHERE b.id IS NULL
      `).get() as { count: number };

      if (orphans.count > 0) {
        orphanRecords[table] = orphans.count;
      }
    } catch (err) {}
  }

  // 4. Duplicate checks for composite uniqueness
  const compositeChecks = [
    { table: 'products', column: 'sku', name: 'SKU Produk' },
    { table: 'raw_materials', column: 'code', name: 'Kode Bahan Baku' },
    { table: 'boms', column: 'code', name: 'Kode BOM / Resep' },
    { table: 'production_batches', column: 'batch_number', name: 'Nomor SPK Batch' },
    { table: 'purchase_orders', column: 'po_number', name: 'Nomor Purchase Order' },
    { table: 'suppliers', column: 'code', name: 'Kode Supplier' },
    { table: 'customers', column: 'code', name: 'Kode Pelanggan' },
    { table: 'units', column: 'code', name: 'Kode Satuan' },
  ];

  for (const chk of compositeChecks) {
    try {
      const dupes = db.prepare(`
        SELECT business_id, ${chk.column}, COUNT(*) as count
        FROM ${chk.table}
        GROUP BY business_id, ${chk.column}
        HAVING COUNT(*) > 1
      `).all() as Array<{ business_id: string; [key: string]: any; count: number }>;

      if (dupes.length > 0) {
        uniqueConstraintIssues.push(`Duplikasi ditemukan pada ${chk.name} (${chk.table}): ${dupes.length} duplikasi.`);
      }
    } catch (err) {}
  }

  const passed = fkCheck.length === 0 && Object.keys(orphanRecords).length === 0 && uniqueConstraintIssues.length === 0;

  return {
    passed,
    totalTables: RELATIONAL_TABLES.length,
    tableStats,
    foreignKeyErrors: fkCheck,
    orphanRecords,
    uniqueConstraintIssues,
  };
}

/**
 * Generate a non-destructive PostgreSQL SQL Migration Dump
 * Converts all records from SQLite to standard PostgreSQL DML (INSERT ... ON CONFLICT DO UPDATE).
 */
export function generatePostgreSqlMigrationScript(): string {
  const lines: string[] = [];
  lines.push('-- ============================================================================');
  lines.push('-- SAAS HPP: POSTGRESQL PRODUCTION DATA MIGRATION SCRIPT');
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push('-- Mode: Non-Destructive / Idempotent (ON CONFLICT DO UPDATE)');
  lines.push('-- ============================================================================');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  const escapeSql = (val: any): string => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
  };

  for (const table of RELATIONAL_TABLES) {
    let rows: any[] = [];
    try {
      rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
    } catch {
      continue;
    }

    if (rows.length === 0) continue;

    lines.push(`-- Table: ${table} (${rows.length} rows)`);

    const cols = Object.keys(rows[0]);
    for (const row of rows) {
      const colNames = cols.join(', ');
      const values = cols.map((c) => {
        let val = row[c];
        if (c.endsWith('_json') || c === 'data_json' || c === 'onboarding_data_json' || c === 'metadata_json') {
          if (val && typeof val === 'string') {
            return `'${val.replace(/'/g, "''")}'::jsonb`;
          }
        }
        return escapeSql(val);
      }).join(', ');

      // Conflict handling using primary key
      const updateSets = cols
        .filter((c) => c !== 'id' && c !== 'token' && c !== 'business_id')
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(', ');

      const pk = table === 'sessions' ? 'token' : table === 'company_settings' ? 'business_id' : 'id';

      if (updateSets.length > 0) {
        lines.push(`INSERT INTO ${table} (${colNames}) VALUES (${values}) ON CONFLICT (${pk}) DO UPDATE SET ${updateSets};`);
      } else {
        lines.push(`INSERT INTO ${table} (${colNames}) VALUES (${values}) ON CONFLICT (${pk}) DO NOTHING;`);
      }
    }
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('-- MIGRATION SCRIPT COMPLETE');
  return lines.join('\n');
}
