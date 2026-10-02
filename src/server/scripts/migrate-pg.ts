import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { generateSaltServer, hashPasswordServer } from '../db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const POSTGRES_TABLES = [
  'businesses',
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
  'plans',
  'subscriptions',
  'invitations',
  'admin_audit_logs',
  'password_reset_tokens',
  'invoices',
  'payment_transactions',
  'webhook_events',
  'security_audit_logs',
  'error_logs',
  'system_backups',
] as const;

export async function runPostgreSqlMigration(databaseUrl?: string): Promise<{
  success: boolean;
  message: string;
  tableCount: number;
  tables: string[];
}> {
  const connectionString = databaseUrl || process.env.DATABASE_URL;

  if (!connectionString) {
    console.log('[PostgreSQL Migration] DATABASE_URL tidak terdefinisi.');
    console.log('[PostgreSQL Migration] Lewati migrasi PostgreSQL (Aplikasi akan menggunakan SQLite lokal untuk development).');
    return {
      success: true,
      message: 'DATABASE_URL tidak diset. Dilewati secara aman.',
      tableCount: 0,
      tables: [],
    };
  }

  // Parse host safely without logging credentials
  let safeHostDisplay = 'Cloud PostgreSQL';
  try {
    const urlObj = new URL(connectionString.replace(/^postgresql:\/\//, 'http://'));
    safeHostDisplay = `${urlObj.hostname}:${urlObj.port || '5432'}${urlObj.pathname}`;
  } catch {
    safeHostDisplay = 'Configured Database Endpoint';
  }

  console.log('[PostgreSQL Migration] Memulai migrasi DDL PostgreSQL...');
  console.log(`[PostgreSQL Migration] Target Endpoint: ${safeHostDisplay}`);

  // Create serverless-compatible connection pool
  const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 2, // Conservative pool limit for migration runner
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 10000,
  });

  let client;
  try {
    client = await pool.connect();
    const schemaPath = path.resolve(__dirname, '..', 'postgres-schema.sql');
    const ddlSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[PostgreSQL Migration] Mengeksekusi DDL & Schema Plans...');
    await client.query('BEGIN');
    await client.query(ddlSql);

    // Dynamic Idempotent Super Admin Seeding using Environment Variables
    const superAdminEmail = (process.env.SUPERADMIN_EMAIL || 'superadmin@hppsaas.com').trim().toLowerCase();
    const existingSuperAdmin = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1',
      [superAdminEmail]
    );

    if (existingSuperAdmin.rows.length === 0) {
      const superAdminPassword =
        process.env.SUPERADMIN_PASSWORD ||
        (process.env.NODE_ENV === 'production'
          ? generateSaltServer(16)
          : 'SuperAdmin123!');
      const salt = generateSaltServer();
      const pwdHash = hashPasswordServer(superAdminPassword, salt);
      const now = new Date().toISOString();
      const userJson = {
        id: 'usr_superadmin',
        businessId: 'platform',
        tenantId: 'platform',
        name: 'Platform Super Admin',
        username: superAdminEmail.split('@')[0],
        email: superAdminEmail,
        role: 'SUPER_ADMIN',
        active: true,
      };

      await client.query(
        `INSERT INTO users (
          id, business_id, name, username, email, password_hash, salt, role, active, email_verified, last_login, created_at, data_json
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (id) DO NOTHING`,
        [
          'usr_superadmin',
          'platform',
          'Platform Super Admin',
          superAdminEmail.split('@')[0],
          superAdminEmail,
          pwdHash,
          salt,
          'SUPER_ADMIN',
          true,
          true,
          now,
          now,
          JSON.stringify(userJson),
        ]
      );
      console.log(`[PostgreSQL Migration] Akun Super Admin diinisialisasi untuk email: ${superAdminEmail}`);
    }

    await client.query('COMMIT');
    console.log('[PostgreSQL Migration] DDL & Seed berhasil diaplikasikan secara transaksional.');

    // Verify all tables exist in information_schema
    const res = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const existingTables = res.rows.map((r: { table_name: string }) => r.table_name);
    console.log(`[PostgreSQL Migration] Total tabel terverifikasi di schema public: ${existingTables.length}`);

    for (const tbl of POSTGRES_TABLES) {
      if (!existingTables.includes(tbl)) {
        console.warn(`[PostgreSQL Migration] Peringatan: Tabel ${tbl} belum ditemukan di schema public.`);
      }
    }

    return {
      success: true,
      message: `Migrasi PostgreSQL sukses. ${existingTables.length} tabel terverifikasi.`,
      tableCount: existingTables.length,
      tables: existingTables,
    };
  } catch (err: any) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('[PostgreSQL Migration] Gagal menjalankan migrasi:', err.message);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Auto-run if executed directly via CLI (e.g. npm run db:migrate)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPostgreSqlMigration()
    .then((res) => {
      console.log('[PostgreSQL Migration Result]', res.message);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[PostgreSQL Migration Error]', err.message);
      process.exit(1);
    });
}
