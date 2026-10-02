-- ============================================================================
-- POSTGRESQL PRODUCTION DDL SCHEMA & IDEMPOTENT MIGRATION
-- Application: Kalkulator HPP SaaS Fullstack Platform
-- Target: Neon, Supabase, Vercel Postgres, AWS RDS, Cloud SQL
-- Safety Guarantee: Non-Destructive, No DROP TABLE, 100% Idempotent
-- ============================================================================

-- 1. Businesses (Multi-tenant isolation root)
CREATE TABLE IF NOT EXISTS businesses (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64),
  industry VARCHAR(128) NOT NULL,
  plan VARCHAR(64) NOT NULL DEFAULT 'Business Pro',
  logo_text VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  currency VARCHAR(16) NOT NULL DEFAULT 'IDR',
  business_type VARCHAR(128) DEFAULT 'F&B / Kuliner',
  onboarding_status VARCHAR(64) DEFAULT 'NOT_STARTED',
  onboarding_step INTEGER DEFAULT 1,
  onboarding_data_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_json JSONB NOT NULL
);

-- 2. Users (Authentication & Tenant Staff)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(128) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role VARCHAR(64) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_business ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 3. Sessions (Serverless persistent auth tokens)
CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_business ON sessions(business_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 4. Categories (Product & Material Categorization)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_biz ON categories(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_biz_code ON categories(business_id, code, type);

-- 5. Units (Unit of Measure - UOM)
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_units_biz ON units(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_units_biz_code ON units(business_id, code);

-- 6. Suppliers (Vendor Master)
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Aktif',
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suppliers_biz ON suppliers(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_biz_code ON suppliers(business_id, code);

-- 6B. Customers (Pelanggan)
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Aktif',
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_biz ON customers(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_biz_code ON customers(business_id, code);

-- 7. Raw Materials (Master Bahan Baku)
CREATE TABLE IF NOT EXISTS raw_materials (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'Aktif',
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_raw_materials_biz ON raw_materials(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_raw_materials_biz_code ON raw_materials(business_id, code);

-- 8. Products (Master Produk Jadi & Katalog)
CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id VARCHAR(64),
  status VARCHAR(32) NOT NULL DEFAULT 'Aktif',
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_biz ON products(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_biz_sku ON products(business_id, sku);

-- 9. Bill of Materials (BOM / Recipe & Costing Formula)
CREATE TABLE IF NOT EXISTS boms (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boms_biz ON boms(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_boms_biz_code ON boms(business_id, code);

-- 10. Production Batches (Surat Perintah Kerja - SPK)
CREATE TABLE IF NOT EXISTS production_batches (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  batch_number VARCHAR(64) NOT NULL,
  bom_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  date VARCHAR(32),
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_batches_biz ON production_batches(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_batches_biz_num ON production_batches(business_id, batch_number);

-- 11. Purchase Orders (PO Pengadaan Bahan)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  po_number VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  order_date VARCHAR(32),
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_po_biz ON purchase_orders(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_po_biz_num ON purchase_orders(business_id, po_number);

-- 12. Stock Movements (Kartu Stok & Pergerakan Barang)
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  date VARCHAR(32) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_biz ON stock_movements(business_id);

-- 13. Activity Logs (Audit Trail Operasional Tenant)
CREATE TABLE IF NOT EXISTS activity_logs (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  module VARCHAR(128) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_biz ON activity_logs(business_id);

-- 14. Company Settings (Pengaturan Profil Usaha)
CREATE TABLE IF NOT EXISTS company_settings (
  business_id VARCHAR(64) PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  data_json JSONB NOT NULL
);

-- 15. SaaS Plans (Tiering Paket Komersial)
CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price_monthly NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(15,2) NOT NULL DEFAULT 0,
  billing_period VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
  trial_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  features_json JSONB NOT NULL,
  limits_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Subscriptions (Status Berlangganan Tenant)
CREATE TABLE IF NOT EXISTS subscriptions (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) NOT NULL REFERENCES plans(id),
  status VARCHAR(32) NOT NULL DEFAULT 'TRIAL',
  billing_cycle VARCHAR(32) NOT NULL DEFAULT 'MONTHLY',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  is_read_only BOOLEAN NOT NULL DEFAULT FALSE,
  payment_reference VARCHAR(128),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_biz ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subs_plan ON subscriptions(plan_id);

-- 17. Invitations (Undangan Staf/Tim)
CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(64) NOT NULL,
  invited_by VARCHAR(255) NOT NULL,
  token VARCHAR(128) UNIQUE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitations_biz ON invitations(business_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- 18. Admin Audit Logs (Log Khusus Super Admin & Platform)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_user_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  business_id VARCHAR(64),
  action VARCHAR(128) NOT NULL,
  target_type VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata_json JSONB
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_biz ON admin_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON admin_audit_logs(timestamp);

-- 19. Password Reset Tokens (Token Sekali Pakai)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pwd_tokens ON password_reset_tokens(token);

-- 20. Invoices (Faktur Penagihan Langganan)
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  plan_id VARCHAR(64) NOT NULL,
  plan_name VARCHAR(255) NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'IDR',
  status VARCHAR(32) NOT NULL,
  billing_cycle VARCHAR(32) NOT NULL,
  payment_method VARCHAR(64),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_json JSONB
);
CREATE INDEX IF NOT EXISTS idx_invoices_biz ON invoices(business_id);

-- 21. Payment Transactions (Log Transaksi Gateway)
CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id VARCHAR(64) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  provider VARCHAR(64) NOT NULL,
  provider_tx_id VARCHAR(128),
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'IDR',
  payment_method VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payment_url TEXT,
  qr_code_data TEXT,
  virtual_account VARCHAR(64),
  metadata_json JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pay_tx_biz ON payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_inv ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pay_tx_provider ON payment_transactions(provider_tx_id);

-- 22. Webhook Events (Idempotency and Audit Trail)
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(64) PRIMARY KEY,
  provider VARCHAR(64) NOT NULL,
  event_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  reference_id VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_ref ON webhook_events(reference_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_event ON webhook_events(provider, event_id);

-- 23. Security Audit Logs (Keamanan & Audit Sistem)
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE CASCADE,
  user_id VARCHAR(64),
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  user_role VARCHAR(64),
  action VARCHAR(64) NOT NULL,
  category VARCHAR(32) NOT NULL,
  result VARCHAR(32) NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  details TEXT,
  metadata_json JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sec_logs_biz ON security_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_sec_logs_action ON security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_sec_logs_time ON security_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sec_logs_user ON security_audit_logs(user_id);

-- 24. Centralized Error Logs (Monitoring Insiden Server)
CREATE TABLE IF NOT EXISTS error_logs (
  id VARCHAR(64) PRIMARY KEY,
  error_id VARCHAR(64) NOT NULL UNIQUE,
  business_id VARCHAR(64),
  user_id VARCHAR(64),
  path VARCHAR(255) NOT NULL,
  method VARCHAR(16) NOT NULL,
  status_code INT NOT NULL,
  error_name VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  sanitized_message TEXT NOT NULL,
  stack_trace TEXT,
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_err_logs_err_id ON error_logs(error_id);
CREATE INDEX IF NOT EXISTS idx_err_logs_time ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_err_logs_biz ON error_logs(business_id);

-- 25. System Backups (Automated & Manual Snapshots)
CREATE TABLE IF NOT EXISTS system_backups (
  id VARCHAR(64) PRIMARY KEY,
  scope VARCHAR(32) NOT NULL,
  business_id VARCHAR(64) REFERENCES businesses(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  version VARCHAR(32) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum_sha256 VARCHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL,
  tables_json JSONB NOT NULL,
  record_counts_json JSONB NOT NULL,
  encrypted INT NOT NULL DEFAULT 1,
  storage_location VARCHAR(255) NOT NULL,
  retention_expires_at TIMESTAMPTZ NOT NULL,
  triggered_by VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_backups_biz ON system_backups(business_id);
CREATE INDEX IF NOT EXISTS idx_backups_time ON system_backups(timestamp);
CREATE INDEX IF NOT EXISTS idx_backups_retention ON system_backups(retention_expires_at);

-- ============================================================================
-- IDEMPOTENT SEED DATA FOR STANDARD SAAS PLANS & PLATFORM BUSINESS
-- ============================================================================

-- Seed 1: Platform Business Root
INSERT INTO businesses (id, name, code, industry, plan, logo_text, status, currency, created_at, data_json)
VALUES (
  'platform',
  'HPP SaaS Platform Admin',
  'PLATFORM',
  'Cloud SaaS Management',
  'BUSINESS',
  'SAAS',
  'active',
  'IDR',
  NOW(),
  '{"id": "platform", "name": "HPP SaaS Platform Admin", "code": "PLATFORM", "industry": "Cloud SaaS Management", "plan": "BUSINESS", "logoText": "SAAS", "skuCount": 0, "maxSku": 99999, "status": "active", "currency": "IDR"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Seed 2: SaaS Plans
INSERT INTO plans (id, code, name, description, price_monthly, price_yearly, billing_period, trial_days, is_active, features_json, limits_json, created_at, updated_at)
VALUES
(
  'plan_free',
  'FREE',
  'Free Tier',
  'Paket gratis untuk perintis usaha & eksplorasi kalkulasi HPP dasar.',
  0,
  0,
  'MONTHLY',
  0,
  TRUE,
  '["HPP", "BOM", "REPORT"]'::jsonb,
  '{"maxUsers": 1, "maxProducts": 5, "maxRawMaterials": 10, "maxBoms": 2, "maxBatchesMonthly": 5}'::jsonb,
  NOW(),
  NOW()
),
(
  'plan_starter',
  'STARTER',
  'Starter UMKM',
  'Paket esensial untuk bisnis skala kecil yang butuh kontrol bahan baku & SPK.',
  149000,
  1490000,
  'MONTHLY',
  14,
  TRUE,
  '["HPP", "BOM", "PRODUKSI", "INVENTORY", "SUPPLIER", "PURCHASE", "REPORT", "EXPORT"]'::jsonb,
  '{"maxUsers": 2, "maxProducts": 100, "maxRawMaterials": 50, "maxBoms": 50, "maxBatchesMonthly": 100}'::jsonb,
  NOW(),
  NOW()
),
(
  'plan_pro',
  'PRO',
  'Business Pro',
  'Paket terlengkap untuk bisnis berkembang dengan tim produksi & analisis margin mendalam.',
  399000,
  3990000,
  'MONTHLY',
  14,
  TRUE,
  '["HPP", "BOM", "PRODUKSI", "INVENTORY", "SUPPLIER", "PURCHASE", "PROFITABILITY", "REPORT", "EXPORT", "API_INTEGRATION"]'::jsonb,
  '{"maxUsers": 10, "maxProducts": 1000, "maxRawMaterials": 500, "maxBoms": 500, "maxBatchesMonthly": 1000}'::jsonb,
  NOW(),
  NOW()
),
(
  'plan_enterprise',
  'ENTERPRISE',
  'Enterprise Scale',
  'Solusi skala korporasi multi-cabang dengan kapasitas tak terbatas & SLA prioritas.',
  999000,
  9990000,
  'MONTHLY',
  14,
  TRUE,
  '["HPP", "BOM", "PRODUKSI", "INVENTORY", "SUPPLIER", "PURCHASE", "PROFITABILITY", "MULTI_OUTLET", "AI_ANALYTICS", "REPORT", "EXPORT", "API_INTEGRATION"]'::jsonb,
  '{"maxUsers": 9999, "maxProducts": 99999, "maxRawMaterials": 99999, "maxBoms": 99999, "maxBatchesMonthly": 99999}'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features_json = EXCLUDED.features_json,
  limits_json = EXCLUDED.limits_json,
  updated_at = NOW();

