-- ============================================================================
-- POSTGRESQL PRODUCTION DDL SCHEMA FOR VERCEL DEPLOYMENT
-- Target: Neon, Supabase, Vercel Postgres, AWS RDS, or Cloud SQL
-- ============================================================================

-- 1. Businesses / Multi-tenant Tenants
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

-- 2. Users
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

-- 4. Categories
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_categories_biz ON categories(business_id);

-- 5. Units (UOM)
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(64) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_units_biz ON units(business_id);

-- 6. Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'Aktif',
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_suppliers_biz ON suppliers(business_id);

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

-- 7. Raw Materials
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

-- 8. Products
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

-- 9. Bill of Materials (BOM / Recipe)
CREATE TABLE IF NOT EXISTS boms (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  code VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_boms_biz ON boms(business_id);

-- 10. Production Batches (SPK Produksi)
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

-- 11. Purchase Orders (PO)
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

-- 12. Stock Movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  business_id VARCHAR(64) NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  item_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  date VARCHAR(32) NOT NULL,
  data_json JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_biz ON stock_movements(business_id);

-- 13. Activity Logs (Audit Trail)
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

-- 14. Company Settings
CREATE TABLE IF NOT EXISTS company_settings (
  business_id VARCHAR(64) PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  company_name VARCHAR(255) NOT NULL,
  data_json JSONB NOT NULL
);

-- 15. SaaS Plans
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

-- 16. Subscriptions
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
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subs_biz ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_subs_plan ON subscriptions(plan_id);

-- 17. Invitations
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

-- 18. Admin Audit Logs
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

-- 19. Invoices
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
