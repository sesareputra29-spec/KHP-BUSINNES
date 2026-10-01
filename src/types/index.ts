export type MenuId =
  | '1.1' // Dashboard
  | '1.2' // Kalkulator HPP
  | '2.1' // Produk
  | '2.2' // Bahan Baku
  | '2.3' // Supplier
  | '3.1' // BOM / Resep
  | '3.2' // Produksi
  | '3.3' // Perhitungan HPP
  | '4.1' // Harga & Margin
  | '4.2' // Analisis Profitabilitas
  | '5.1' // Inventory
  | '5.2' // Pembelian
  | '6.1' // Analisis HPP
  | '6.2' // Simulasi
  | '6.3' // BEP & Sensitivitas
  | '7.1' // Laporan
  | '8.1' // Profil Pengguna
  | '8.2' // Manajemen Pengguna
  | '8.3' // Role & Hak Akses
  | '8.4.1' // Kategori Produk
  | '8.4.2' // Kategori Bahan Baku
  | '8.4.3' // Satuan
  | '8.4.4' // Pengaturan HPP
  | '8.4.5' // Pengaturan Biaya
  | '8.4.6' // Pengaturan Perusahaan
  | '8.5' // Import Data
  | '8.6' // Export Data
  | '8.7' // Backup & Restore
  | '8.8' // Log Aktivitas
  | '8.9' // Panduan
  | '8.10'; // Logout

export type CostingMethod = 'FULL_COSTING' | 'VARIABLE_COSTING';

export type FeatureKey =
  | 'HPP'
  | 'BOM'
  | 'PRODUKSI'
  | 'INVENTORY'
  | 'SUPPLIER'
  | 'PELANGGAN'
  | 'PURCHASE'
  | 'PROFITABILITY'
  | 'REPORT'
  | 'EXPORT'
  | 'MULTI_USER'
  | 'ADVANCED_REPORT'
  | 'API'
  | 'AUDIT_LOG';

export type SaaSSubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUSPENDED';

export type BusinessAccessMode = 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED';

export interface PlanLimits {
  maxUsers: number;
  maxProducts: number;
  maxRawMaterials: number;
  maxBoms: number;
  maxBatchesMonthly: number;
  maxStorageMb?: number;
}

export interface SaaSPlan {
  id: string;
  code: 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  trialDays: number;
  isActive: boolean;
  features: FeatureKey[];
  limits: PlanLimits;
  createdAt?: string;
  updatedAt?: string;
}

export interface SaaSSubscription {
  id: string;
  businessId: string;
  businessName?: string;
  planId: string;
  planCode: string;
  planName: string;
  status: SaaSSubscriptionStatus;
  billingCycle: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  trialStart?: string;
  trialEnd?: string;
  isReadOnly: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserInvitation {
  id: string;
  businessId: string;
  email: string;
  role: UserProfile['role'];
  invitedBy: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  businessId?: string;
  businessName?: string;
  action: string;
  targetType: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface PlatformOverviewStats {
  totalBusinesses: number;
  activeBusinesses: number;
  trialBusinesses: number;
  suspendedBusinesses: number;
  expiredBusinesses: number;
  totalUsers: number;
  newBusinessesThisMonth: number;
  trialsEndingSoon: number;
  activeSubscriptions: number;
  subscriptionsEndingSoon: number;
}

export interface BusinessSubscription {
  plan: 'FREE' | 'Starter' | 'STARTER' | 'Business Pro' | 'PRO' | 'Enterprise' | 'BUSINESS' | string;
  status: 'active' | 'trial' | 'expired' | 'suspended' | string;
  trialEndsAt?: string;
  expiresAt?: string;
  maxUsers: number;
  maxSku: number;
  featureFlags?: Record<string, boolean>;
}

export interface Business {
  id: string; // Business ID (e.g. 'tenant-1' or 'biz-karya-logam')
  name: string;
  code?: string;
  industry: string;
  plan: 'FREE' | 'Starter' | 'STARTER' | 'Business Pro' | 'PRO' | 'Enterprise' | 'BUSINESS' | string;
  planId?: string;
  ownerName?: string;
  ownerEmail?: string;
  logoText: string;
  skuCount: number;
  maxSku: number;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED' | 'active' | 'trial' | 'suspended' | 'expired';
  accessMode?: BusinessAccessMode;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string; // NPWP
  currency: string;
  createdAt: string;
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  userCount?: number;
  productCount?: number;
  subscription?: BusinessSubscription;
  activeSubscription?: SaaSSubscription;
  onboardingStatus?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

// Aliasing Tenant to Business for full backward compatibility
export type Tenant = Business;

export interface AuthSession {
  token: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: UserProfile['role'];
  businessId: string;
  businessName: string;
  isSuperAdmin?: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash?: string; // Salted SHA-256 hash (never plain text)
  salt?: string;
  role: 'SUPER_ADMIN' | 'Administrator' | 'Manager / Owner' | 'Staff' | 'Kasir' | 'Cost Accountant' | 'Inventory Staff' | 'Viewer';
  avatar: string;
  tenantId: string; // Business ID
  businessId?: string; // Business ID
  phone?: string;
  lastLogin?: string;
  active: boolean;
  createdAt?: string;
}

export interface Category {
  id: string;
  businessId?: string;
  tenantId?: string;
  name: string;
  code: string;
  description?: string;
  type: 'PRODUCT' | 'MATERIAL';
}

export interface UnitOfMeasure {
  id: string;
  businessId?: string;
  tenantId?: string;
  code: string; // kg, gr, l, ml, pcs, box, zak
  name: string;
  baseUnit?: string;
  conversionFactor?: number;
}

export interface PriceHistory {
  date: string;
  price: number;
  poNumber?: string;
  supplierName?: string;
}

export interface RawMaterial {
  id: string;
  businessId?: string;
  tenantId?: string;
  code: string; // BB-001
  name: string;
  categoryId: string;
  unit: string; // unit used in recipe (e.g. gr)
  buyUnit: string; // unit bought (e.g. kg)
  conversionRatio: number; // e.g. 1 kg = 1000 gr
  buyPrice: number; // Last buy price per buyUnit in IDR
  avgBuyPrice: number; // Average buy price per buyUnit
  costPerUnit: number; // Calculated price per recipe unit in IDR
  currentStock: number; // in recipe unit
  initialStock: number;
  minStock: number; // in recipe unit
  supplierId: string;
  shrinkagePct: number; // default shrinkage / waste %
  status: 'Aktif' | 'Nonaktif';
  lastUpdated: string;
  priceHistory?: PriceHistory[];
}

export interface Supplier {
  id: string;
  businessId?: string;
  tenantId?: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string; // e.g., 'Tempo 14 Hari', 'Cash', 'Tempo 30 Hari'
  rating: number; // 1-5
  status: 'Aktif' | 'Nonaktif';
  suppliedMaterialsCount?: number;
}

export interface BomIngredient {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number; // net qty
  unit: string;
  unitCost: number; // cost per recipe unit
  shrinkagePct: number; // waste / susut %
  grossQuantity: number; // quantity * (1 + shrinkagePct / 100)
  totalCost: number; // grossQuantity * unitCost
}

export interface DirectLaborCost {
  jobTitle: string;
  numWorkers: number;
  hourlyRate: number; // IDR per jam
  hoursWorked: number; // Jam pengerjaan
  totalCost: number;
}

export interface OverheadCost {
  name: string;
  category: 'Listrik' | 'Gas' | 'Air' | 'Sewa' | 'Penyusutan' | 'Kemasan' | 'Biaya Lainnya';
  isVariable: boolean;
  amount: number;
  notes?: string;
}

export interface PackagingCost {
  name: string;
  unitCost: number;
  quantity: number;
  totalCost: number;
}

export interface BillOfMaterial {
  id: string;
  businessId?: string;
  tenantId?: string;
  productId: string;
  productName: string;
  code: string;
  version: string;
  batchYield: number; // Number of final product units
  yieldUnit: string; // pcs, botol, box
  ingredients: BomIngredient[];
  laborCosts: DirectLaborCost[];
  overheadCosts: OverheadCost[];
  packagingCosts: PackagingCost[];
  costingMethod: CostingMethod;
  notes?: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalVariableOverheadCost: number;
  totalFixedOverheadCost: number;
  totalPackagingCost: number;
  totalBatchCost: number;
  hppPerUnit: number;
  createdAt: string;
  updatedAt: string;
}

export interface HppHistoryRecord {
  date: string;
  previousHpp: number;
  newHpp: number;
  diffNominal: number;
  diffPercent: number;
  reason: string;
}

export interface Product {
  id: string;
  businessId?: string;
  tenantId?: string;
  sku: string;
  name: string;
  categoryId: string;
  unit: string;
  currentStock: number;
  initialStock: number;
  minStock: number;
  targetMarginPct: number; // e.g. 40%
  estimatedHpp: number;
  previousHpp?: number;
  sellingPrice: number; // Retail selling price
  activeBomId?: string;
  status: 'Aktif' | 'Nonaktif' | 'Draft';
  photoUrl?: string;
  description?: string;
  hppHistory?: HppHistoryRecord[];
  channelPrices?: {
    offline: number;
    marketplace: number;
    foodDelivery: number;
    grosir: number;
    reseller: number;
  };
}

export interface ProductionBatch {
  id: string;
  businessId?: string;
  tenantId?: string;
  batchNumber: string; // PRD-2026-001
  date: string;
  bomId: string;
  productId: string;
  productName: string;
  plannedOutput: number;
  actualOutput: number;
  status: 'Draft' | 'Terjadwal' | 'Diproses' | 'Dalam Proses' | 'Selesai' | 'Dibatalkan';
  standardCostTotal: number;
  actualCostTotal: number;
  costVariance: number;
  variancePct: number;
  standardHppPerUnit: number;
  actualHppPerUnit: number;
  materialUsage?: { materialId: string; materialName: string; qtyUsed: number; unit: string }[];
  notes?: string;
  completedAt?: string;
  operatorName?: string;
}

export interface PurchaseOrderItem {
  rawMaterialId: string;
  rawMaterialName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  tax?: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  businessId?: string;
  tenantId?: string;
  poNumber: string; // PO-2026-001
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  taxAmount?: number;
  shippingCost: number;
  totalAmount: number;
  paymentMethod?: 'Cash' | 'Transfer Bank' | 'Tempo';
  status: 'Draft' | 'Dipesan' | 'Diterima' | 'Lunas' | 'Dibatalkan';
  paymentTerms: string;
  receivedDate?: string;
}

export interface StockMovement {
  id: string;
  businessId?: string;
  tenantId?: string;
  date: string;
  itemType: 'MATERIAL' | 'PRODUCT';
  itemId: string;
  itemName: string;
  type: 'IN_PURCHASE' | 'OUT_PRODUCTION' | 'IN_PRODUCTION' | 'OUT_SALE' | 'ADJUSTMENT';
  quantity: number;
  unit: string;
  referenceNo: string;
  unitCost: number;
  totalValue: number;
  stockBefore?: number;
  balanceAfter: number;
  notes: string;
}

export interface ActivityLog {
  id: string;
  businessId?: string;
  tenantId?: string;
  timestamp: string;
  userName: string;
  userRole: string;
  type: 'Login' | 'Logout' | 'Tambah Data' | 'Edit Data' | 'Hapus Data' | 'Import' | 'Export' | 'Perubahan Pengaturan' | 'Produksi' | 'Simulasi' | string;
  action?: string;
  module: string;
  details: string;
  description?: string;
}

export interface CompanySettings {
  businessId?: string;
  tenantId?: string;
  // Umum
  theme: 'Light' | 'Dark' | 'System';
  numberFormat: 'id-ID' | 'en-US';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currency: string;

  // HPP Settings
  defaultCostingMethod: CostingMethod;
  hppRounding: 1 | 50 | 100 | 500 | 1000;
  defaultShrinkagePct: number;
  defaultMarginTargetPct: number;

  // Biaya Settings
  hourlyLaborRateStandard: number;
  fixedMonthlyOverhead: number;
  electricityRatePerHour: number;
  gasRatePerBatch: number;
  waterRatePerMonth: number;

  // Perusahaan
  companyName: string;
  brandName: string;
  appName: string;
  ownerName: string;
  industry: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string;
  reportLogoUrl?: string;
  fiscalYear: string;
}
