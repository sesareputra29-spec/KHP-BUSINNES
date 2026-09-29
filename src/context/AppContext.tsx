import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  MenuId,
  Tenant,
  Business,
  UserProfile,
  Product,
  RawMaterial,
  Supplier,
  BillOfMaterial,
  ProductionBatch,
  PurchaseOrder,
  StockMovement,
  Category,
  UnitOfMeasure,
  ActivityLog,
  CompanySettings,
  AuthSession,
} from '../types';
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
import { hashPassword, verifyPassword, generateSalt, generateSessionToken } from '../utils/security';
import { checkPermission, SystemModule, RbacAction } from '../utils/rbac';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  // Navigation & Authentication
  currentMenu: MenuId;
  setCurrentMenu: (menu: MenuId) => void;
  isAuthenticated: boolean;
  authSession: AuthSession | null;
  login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  registerBusinessAndUser: (payload: {
    businessName: string;
    industry: string;
    plan?: 'Starter' | 'Business Pro' | 'Enterprise';
    adminName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
  }) => Promise<{ success: boolean; message: string }>;
  checkUserPermission: (module: SystemModule, action?: RbacAction) => boolean;

  // Multi-Business / Multi-Tenant
  currentTenant: Tenant;
  currentBusinessId: string;
  setCurrentTenantId: (tenantId: string) => void;
  availableTenants: Tenant[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  availableUsers: UserProfile[];

  // Master Data (Scoped to current business)
  products: Product[];
  rawMaterials: RawMaterial[];
  suppliers: Supplier[];
  categories: Category[];
  units: UnitOfMeasure[];

  // Production & HPP (Scoped to current business)
  boms: BillOfMaterial[];
  batches: ProductionBatch[];

  // Inventory & Purchasing (Scoped to current business)
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];

  // System & Settings (Scoped to current business)
  logs: ActivityLog[];
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;

  // Actions with Role & Tenant Enforcement
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  addRawMaterial: (material: Omit<RawMaterial, 'id' | 'costPerUnit'>) => void;
  updateRawMaterial: (id: string, material: Partial<RawMaterial>) => void;
  deleteRawMaterial: (id: string) => void;

  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;

  addBom: (bom: Omit<BillOfMaterial, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateBom: (id: string, bom: Partial<BillOfMaterial>) => void;
  deleteBom: (id: string) => void;

  addProductionBatch: (batch: Omit<ProductionBatch, 'id'>) => void;
  updateProductionBatch: (id: string, batch: Partial<ProductionBatch>) => void;

  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => void;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;

  addStockMovement: (movement: Omit<StockMovement, 'id'>) => void;

  addCategory: (cat: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, cat: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addUnit: (unit: Omit<UnitOfMeasure, 'id'>) => void;
  updateUnit: (id: string, unit: Partial<UnitOfMeasure>) => void;
  deleteUnit: (id: string) => void;

  addUser: (user: Omit<UserProfile, 'id'> & { password?: string }) => Promise<void>;
  updateUser: (id: string, user: Partial<UserProfile> & { newPassword?: string }) => Promise<void>;
  deleteUser: (id: string) => void;

  // Notifications
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Backup & Restore (Multi-Tenant safe)
  resetToDemoData: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonString: string) => boolean;

  // Quick Action / Search Modal
  isQuickSearchOpen: boolean;
  setIsQuickSearchOpen: (open: boolean) => void;
  logAction: (action: string, module: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'hpp_saas_';

// Initial migration helper: ensures every item has businessId & tenantId
function ensureTenantTag<T extends object>(
  items: T[],
  defaultTenantId = 'tenant-1'
): T[] {
  return items.map((item) => {
    const record = item as Record<string, any>;
    return {
      ...item,
      businessId: record.businessId || record.tenantId || defaultTenantId,
      tenantId: record.tenantId || record.businessId || defaultTenantId,
    } as T;
  });
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMenu, setCurrentMenu] = useState<MenuId>('1.1');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 1. Business / Tenant Registry
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}tenants`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return mockTenants;
  });

  // Active Business ID
  const [currentTenantId, setCurrentTenantIdState] = useState<string>(() => {
    const savedSession = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_session`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.businessId) return parsed.businessId;
      } catch {
        // ignore
      }
    }
    return 'tenant-1';
  });

  // 2. Global Multi-Tenant User Registry
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return ensureTenantTag(parsed, 'tenant-1');
        }
      } catch {
        // ignore
      }
    }
    return mockUsers;
  });

  // 3. Authentication & Session State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_session`);
    if (saved) {
      try {
        const parsed: AuthSession = JSON.parse(saved);
        // Verify expiry
        if (parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    // Default active session for instant evaluation & demo
    return {
      token: generateSessionToken(),
      userId: 'user-1',
      userEmail: 'bambang.akuntansi@bogarasa.co.id',
      userName: 'Bambang Sudirman, SE, Ak.',
      userRole: 'Administrator',
      businessId: 'tenant-1',
      businessName: 'PT Boga Rasa Nusantara',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  const isAuthenticated = authSession !== null;

  // Active User Profile
  const currentUser = useMemo(() => {
    if (authSession?.userId) {
      const found = allUsers.find((u) => u.id === authSession.userId);
      if (found) return found;
    }
    const tenantUser = allUsers.find((u) => (u.businessId || u.tenantId) === currentTenantId);
    return tenantUser || allUsers[0] || mockUsers[0];
  }, [authSession, allUsers, currentTenantId]);

  // Current Business Info
  const currentTenant = useMemo(() => {
    const found = tenants.find((t) => t.id === currentTenantId);
    return found || tenants[0] || mockTenants[0];
  }, [tenants, currentTenantId]);

  // 4. Multi-Tenant Master Storage (Combines all tenants with guaranteed isolation)
  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_products`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    // Seed initial products for tenant-1 and tenant-2
    return [...ensureTenantTag(mockProducts, 'tenant-1'), ...mockProductsKaryaLogam];
  });

  const [allRawMaterials, setAllRawMaterials] = useState<RawMaterial[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_raw_materials`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockRawMaterials, 'tenant-1'), ...mockRawMaterialsKaryaLogam];
  });

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_suppliers`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockSuppliers, 'tenant-1'), ...mockSuppliersKaryaLogam];
  });

  const [allCategories, setAllCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_categories`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockCategories, 'tenant-1'), ...mockCategoriesKaryaLogam];
  });

  const [allUnits, setAllUnits] = useState<UnitOfMeasure[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_units`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockUnits, 'tenant-1'), ...mockUnitsKaryaLogam];
  });

  const [allBoms, setAllBoms] = useState<BillOfMaterial[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_boms`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockBOMs, 'tenant-1'), ...mockBOMsKaryaLogam];
  });

  const [allBatches, setAllBatches] = useState<ProductionBatch[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_batches`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockProductionBatches, 'tenant-1'), ...mockBatchesKaryaLogam];
  });

  const [allPurchaseOrders, setAllPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_purchase_orders`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockPurchaseOrders, 'tenant-1'), ...mockPurchaseOrdersKaryaLogam];
  });

  const [allStockMovements, setAllStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_stock_movements`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockStockMovements, 'tenant-1'), ...mockStockMovementsKaryaLogam];
  });

  const [allLogs, setAllLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_logs`);
    if (saved) {
      try {
        return ensureTenantTag(JSON.parse(saved), 'tenant-1');
      } catch {
        // ignore
      }
    }
    return [...ensureTenantTag(mockActivityLogs, 'tenant-1'), ...mockActivityLogsKaryaLogam];
  });

  const [allCompanySettings, setAllCompanySettings] = useState<Record<string, CompanySettings>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}all_company_settings`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return {
      'tenant-1': { ...mockCompanySettings, businessId: 'tenant-1', tenantId: 'tenant-1' },
      'tenant-2': { ...mockCompanySettingsKaryaLogam, businessId: 'tenant-2', tenantId: 'tenant-2' },
    };
  });

  // --------------------------------------------------------------------------
  // PERSISTENCE EFFECT: Safely sync state to LocalStorage
  // --------------------------------------------------------------------------
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}tenants`, JSON.stringify(tenants));
  }, [tenants]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}users`, JSON.stringify(allUsers));
  }, [allUsers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_products`, JSON.stringify(allProducts));
  }, [allProducts]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_raw_materials`, JSON.stringify(allRawMaterials));
  }, [allRawMaterials]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_suppliers`, JSON.stringify(allSuppliers));
  }, [allSuppliers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_categories`, JSON.stringify(allCategories));
  }, [allCategories]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_units`, JSON.stringify(allUnits));
  }, [allUnits]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_boms`, JSON.stringify(allBoms));
  }, [allBoms]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_batches`, JSON.stringify(allBatches));
  }, [allBatches]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_purchase_orders`, JSON.stringify(allPurchaseOrders));
  }, [allPurchaseOrders]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_stock_movements`, JSON.stringify(allStockMovements));
  }, [allStockMovements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_logs`, JSON.stringify(allLogs));
  }, [allLogs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}all_company_settings`, JSON.stringify(allCompanySettings));
  }, [allCompanySettings]);

  useEffect(() => {
    if (authSession) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_session`, JSON.stringify(authSession));
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_session`);
    }
  }, [authSession]);

  // --------------------------------------------------------------------------
  // STRICT DATA ISOLATION (Per-Business Filtered Views)
  // --------------------------------------------------------------------------
  const products = useMemo(() => {
    return allProducts.filter((p) => (p.businessId || p.tenantId) === currentTenantId);
  }, [allProducts, currentTenantId]);

  const rawMaterials = useMemo(() => {
    return allRawMaterials.filter((m) => (m.businessId || m.tenantId) === currentTenantId);
  }, [allRawMaterials, currentTenantId]);

  const suppliers = useMemo(() => {
    return allSuppliers.filter((s) => (s.businessId || s.tenantId) === currentTenantId);
  }, [allSuppliers, currentTenantId]);

  const categories = useMemo(() => {
    return allCategories.filter((c) => (c.businessId || c.tenantId) === currentTenantId);
  }, [allCategories, currentTenantId]);

  const units = useMemo(() => {
    return allUnits.filter((u) => !u.businessId || (u.businessId || u.tenantId) === currentTenantId);
  }, [allUnits, currentTenantId]);

  const boms = useMemo(() => {
    return allBoms.filter((b) => (b.businessId || b.tenantId) === currentTenantId);
  }, [allBoms, currentTenantId]);

  const batches = useMemo(() => {
    return allBatches.filter((b) => (b.businessId || b.tenantId) === currentTenantId);
  }, [allBatches, currentTenantId]);

  const purchaseOrders = useMemo(() => {
    return allPurchaseOrders.filter((po) => (po.businessId || po.tenantId) === currentTenantId);
  }, [allPurchaseOrders, currentTenantId]);

  const stockMovements = useMemo(() => {
    return allStockMovements.filter((sm) => (sm.businessId || sm.tenantId) === currentTenantId);
  }, [allStockMovements, currentTenantId]);

  const availableUsers = useMemo(() => {
    return allUsers.filter((u) => (u.businessId || u.tenantId) === currentTenantId);
  }, [allUsers, currentTenantId]);

  const logs = useMemo(() => {
    return allLogs.filter((l) => (l.businessId || l.tenantId) === currentTenantId);
  }, [allLogs, currentTenantId]);

  const companySettings = useMemo(() => {
    return (
      allCompanySettings[currentTenantId] || {
        ...mockCompanySettings,
        companyName: currentTenant.name,
        industry: currentTenant.industry,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      }
    );
  }, [allCompanySettings, currentTenantId, currentTenant]);

  // --------------------------------------------------------------------------
  // TOAST & LOGGING
  // --------------------------------------------------------------------------
  const showToast = useCallback((title: string, message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const logAction = useCallback(
    (action: string, module: string, details: string) => {
      const newLog: ActivityLog = {
        id: 'log-' + Date.now(),
        businessId: currentTenantId,
        tenantId: currentTenantId,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        userName: currentUser?.name || 'Sistem',
        userRole: currentUser?.role || 'Administrator',
        type: action,
        action,
        module,
        details,
      };
      setAllLogs((prev) => [newLog, ...prev]);
    },
    [currentTenantId, currentUser]
  );

  // --------------------------------------------------------------------------
  // SECURITY & RBAC PERMISSION CHECK
  // --------------------------------------------------------------------------
  const checkUserPermission = useCallback(
    (module: SystemModule, action: RbacAction = 'view'): boolean => {
      const allowed = checkPermission(currentUser?.role, module, action);
      if (!allowed) {
        showToast(
          'Akses Ditolak',
          `Peran ${currentUser?.role || 'Pengguna'} tidak memiliki izin untuk ${action} pada modul ${module}.`,
          'error'
        );
        logAction(
          'Pelanggaran Otoritas (Ditolak)',
          module,
          `Percobaan ${action} oleh ${currentUser?.name} (${currentUser?.role}) ditolak sistem keamanan.`
        );
      }
      return allowed;
    },
    [currentUser, showToast, logAction]
  );

  // --------------------------------------------------------------------------
  // AUTHENTICATION: LOGIN, LOGOUT & REGISTRATION
  // --------------------------------------------------------------------------
  const login = async (
    identifier: string,
    passwordInput: string
  ): Promise<{ success: boolean; message: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const user = allUsers.find(
      (u) => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId
    );

    if (!user) {
      return { success: false, message: 'Email atau username tidak terdaftar dalam sistem.' };
    }

    if (!user.active) {
      return { success: false, message: 'Akun Anda dinonaktifkan oleh administrator bisnis.' };
    }

    // Verify salted password
    let isValidPassword = false;
    if (user.passwordHash && user.salt) {
      isValidPassword = await verifyPassword(passwordInput, user.salt, user.passwordHash);
    } else {
      // Fallback for demo seed users
      isValidPassword = passwordInput === 'Admin123!' || passwordInput === 'Owner123!' || passwordInput === 'Staff123!';
    }

    if (!isValidPassword) {
      return { success: false, message: 'Kata sandi yang Anda masukkan salah.' };
    }

    const targetTenantId = user.businessId || user.tenantId || 'tenant-1';
    const tenant = tenants.find((t) => t.id === targetTenantId) || tenants[0];

    // Set authenticated session
    const newSession: AuthSession = {
      token: generateSessionToken(),
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      userRole: user.role,
      businessId: targetTenantId,
      businessName: tenant.name,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setAuthSession(newSession);
    setCurrentTenantIdState(targetTenantId);
    showToast('Masuk Berhasil', `Selamat datang kembali, ${user.name}!`, 'success');
    logAction('Login', 'Autentikasi', `Pengguna ${user.name} berhasil masuk.`);
    return { success: true, message: 'Login berhasil.' };
  };

  const logout = useCallback(() => {
    logAction('Logout', 'Autentikasi', `Pengguna ${currentUser.name} keluar.`);
    setAuthSession(null);
    setCurrentMenu('1.1');
    showToast('Sesi Berakhir', 'Anda telah keluar dari aplikasi.', 'info');
  }, [currentUser, logAction, showToast]);

  const registerBusinessAndUser = async (payload: {
    businessName: string;
    industry: string;
    plan?: 'Starter' | 'Business Pro' | 'Enterprise';
    adminName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
  }): Promise<{ success: boolean; message: string }> => {
    const newTenantId = 'biz-' + Date.now().toString(36);
    const newUserId = 'user-' + Date.now().toString(36);

    // Generate Salt & Hash Password
    const salt = generateSalt();
    const passwordHash = await hashPassword(payload.password, salt);

    const newBusiness: Tenant = {
      id: newTenantId,
      name: payload.businessName.trim(),
      code: payload.businessName.substring(0, 3).toUpperCase(),
      industry: payload.industry,
      plan: payload.plan || 'Business Pro',
      logoText: payload.businessName.substring(0, 3).toUpperCase(),
      skuCount: 0,
      maxSku: payload.plan === 'Enterprise' ? 150 : payload.plan === 'Starter' ? 20 : 50,
      status: 'active',
      currency: 'IDR',
      createdAt: new Date().toISOString().slice(0, 10),
      email: payload.email,
      phone: payload.phone || '',
      subscription: {
        plan: payload.plan || 'Business Pro',
        status: 'active',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        maxUsers: payload.plan === 'Enterprise' ? 50 : payload.plan === 'Starter' ? 5 : 15,
        maxSku: payload.plan === 'Enterprise' ? 150 : payload.plan === 'Starter' ? 20 : 50,
      },
    };

    const newAdminUser: UserProfile = {
      id: newUserId,
      name: payload.adminName.trim(),
      username: payload.username.trim().toLowerCase(),
      email: payload.email.trim().toLowerCase(),
      role: 'Administrator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      tenantId: newTenantId,
      businessId: newTenantId,
      phone: payload.phone || '',
      active: true,
      lastLogin: new Date().toISOString().slice(0, 16),
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Default categories for new business
    const defaultCategories: Category[] = [
      { id: `cat-${newTenantId}-1`, businessId: newTenantId, tenantId: newTenantId, name: 'Produk Standar', code: 'PROD', type: 'PRODUCT' },
      { id: `cat-${newTenantId}-2`, businessId: newTenantId, tenantId: newTenantId, name: 'Bahan Baku Pokok', code: 'BAHAN', type: 'MATERIAL' },
      { id: `cat-${newTenantId}-3`, businessId: newTenantId, tenantId: newTenantId, name: 'Bahan Kemasan / Packaging', code: 'PACK', type: 'MATERIAL' },
    ];

    // Default company settings
    const defaultSettings: CompanySettings = {
      ...mockCompanySettings,
      businessId: newTenantId,
      tenantId: newTenantId,
      companyName: payload.businessName.trim(),
      brandName: payload.businessName.trim(),
      ownerName: payload.adminName.trim(),
      industry: payload.industry,
      email: payload.email,
      phone: payload.phone || '',
    };

    // Update global state
    setTenants((prev) => [newBusiness, ...prev]);
    setAllUsers((prev) => [newAdminUser, ...prev]);
    setAllCategories((prev) => [...defaultCategories, ...prev]);
    setAllCompanySettings((prev) => ({ ...prev, [newTenantId]: defaultSettings }));

    // Auto login to the newly registered business
    const newSession: AuthSession = {
      token: generateSessionToken(),
      userId: newUserId,
      userEmail: newAdminUser.email,
      userName: newAdminUser.name,
      userRole: 'Administrator',
      businessId: newTenantId,
      businessName: newBusiness.name,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    setAuthSession(newSession);
    setCurrentTenantIdState(newTenantId);
    showToast('Registrasi Berhasil', `Selamat datang di ruang kerja ${newBusiness.name}!`, 'success');
    return { success: true, message: 'Pendaftaran bisnis berhasil.' };
  };

  // --------------------------------------------------------------------------
  // SWITCH TENANT / BUSINESS
  // --------------------------------------------------------------------------
  const setCurrentTenantId = useCallback(
    (tenantId: string) => {
      const targetTenant = tenants.find((t) => t.id === tenantId);
      if (!targetTenant) return;

      setCurrentTenantIdState(tenantId);

      // Auto switch active session to a user within target business if currentUser does not belong to it
      if (currentUser?.businessId !== tenantId) {
        const tenantUser = allUsers.find((u) => (u.businessId || u.tenantId) === tenantId);
        if (tenantUser) {
          setAuthSession((prev) =>
            prev
              ? {
                  ...prev,
                  userId: tenantUser.id,
                  userEmail: tenantUser.email,
                  userName: tenantUser.name,
                  userRole: tenantUser.role,
                  businessId: tenantId,
                  businessName: targetTenant.name,
                }
              : null
          );
        }
      }

      showToast('Ruang Kerja Dialihkan', `Beralih ke bisnis: ${targetTenant.name}`, 'info');
      logAction('Ganti Tenant', 'Sistem', `Beralih ke ruang kerja ${targetTenant.name}`);
    },
    [tenants, currentUser, allUsers, showToast, logAction]
  );

  const setCurrentUser = useCallback(
    (user: UserProfile) => {
      setAuthSession((prev) =>
        prev
          ? {
              ...prev,
              userId: user.id,
              userEmail: user.email,
              userName: user.name,
              userRole: user.role,
              businessId: user.businessId || user.tenantId || prev.businessId,
            }
          : null
      );
      if (user.businessId && user.businessId !== currentTenantId) {
        setCurrentTenantIdState(user.businessId);
      }
      showToast('Peran Diganti', `Aktif sebagai: ${user.name} (${user.role})`, 'info');
    },
    [currentTenantId, showToast]
  );

  const updateCompanySettings = useCallback(
    (settings: Partial<CompanySettings>) => {
      if (!checkUserPermission('system', 'edit')) return;

      setAllCompanySettings((prev) => ({
        ...prev,
        [currentTenantId]: {
          ...(prev[currentTenantId] || companySettings),
          ...settings,
          businessId: currentTenantId,
          tenantId: currentTenantId,
        },
      }));
      showToast('Pengaturan Disimpan', 'Pengaturan perusahaan berhasil diperbarui.', 'success');
      logAction('Update Pengaturan', 'Pengaturan Perusahaan', 'Menyimpan konfigurasi perusahaan.');
    },
    [checkUserPermission, currentTenantId, companySettings, showToast, logAction]
  );

  // --------------------------------------------------------------------------
  // CRUD OPERATIONS WITH BUSINESS ID ENFORCEMENT & RBAC
  // --------------------------------------------------------------------------

  // Products
  const addProduct = useCallback(
    (prodData: Omit<Product, 'id'>) => {
      if (!checkUserPermission('master_data', 'create')) return;

      const id = 'prod-' + Date.now();
      const newProd: Product = {
        ...prodData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllProducts((prev) => [newProd, ...prev]);
      showToast('Produk Berhasil Ditambahkan', `${prodData.name} siap digunakan.`, 'success');
      logAction('Tambah Produk', 'Master Data Produk', `Menambahkan ${prodData.name} (${prodData.sku})`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updateProduct = useCallback(
    (id: string, updatedFields: Partial<Product>) => {
      if (!checkUserPermission('master_data', 'edit')) return;

      const target = allProducts.find((p) => p.id === id);
      if (!target || (target.businessId || target.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data produk tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllProducts((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId } : item
        )
      );
      showToast('Produk Diperbarui', 'Data produk telah disimpan.', 'success');
      logAction('Update Produk', 'Master Data Produk', `Memperbarui produk ID ${id}`);
    },
    [checkUserPermission, allProducts, currentTenantId, showToast, logAction]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      if (!checkUserPermission('master_data', 'delete')) return;

      const prod = allProducts.find((p) => p.id === id);
      if (!prod || (prod.businessId || prod.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data produk tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllProducts((prev) => prev.filter((item) => item.id !== id));
      showToast('Produk Dihapus', `${prod.name} telah dihapus.`, 'warning');
      logAction('Hapus Produk', 'Master Data Produk', `Menghapus produk ${prod.name}`);
    },
    [checkUserPermission, allProducts, currentTenantId, showToast, logAction]
  );

  // Raw Materials
  const addRawMaterial = useCallback(
    (matData: Omit<RawMaterial, 'id' | 'costPerUnit'>) => {
      if (!checkUserPermission('master_data', 'create')) return;

      const id = 'mat-' + Date.now();
      const costPerUnit =
        matData.conversionRatio > 0 ? matData.buyPrice / matData.conversionRatio : matData.buyPrice;
      const newMat: RawMaterial = {
        ...matData,
        id,
        costPerUnit,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllRawMaterials((prev) => [newMat, ...prev]);
      showToast('Bahan Baku Ditambahkan', `${matData.name} berhasil didaftarkan.`, 'success');
      logAction('Tambah Bahan Baku', 'Master Bahan Baku', `Menambahkan ${matData.name} (${matData.code})`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updateRawMaterial = useCallback(
    (id: string, updatedFields: Partial<RawMaterial>) => {
      if (!checkUserPermission('master_data', 'edit')) return;

      const target = allRawMaterials.find((m) => m.id === id);
      if (!target || (target.businessId || target.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data bahan baku tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllRawMaterials((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const merged = { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId };
          if (updatedFields.buyPrice !== undefined || updatedFields.conversionRatio !== undefined) {
            const ratio = merged.conversionRatio > 0 ? merged.conversionRatio : 1;
            merged.costPerUnit = merged.buyPrice / ratio;
          }
          return merged;
        })
      );
      showToast('Bahan Baku Diperbarui', 'Data bahan baku telah disimpan.', 'success');
      logAction('Update Bahan Baku', 'Master Bahan Baku', `Memperbarui bahan baku ID ${id}`);
    },
    [checkUserPermission, allRawMaterials, currentTenantId, showToast, logAction]
  );

  const deleteRawMaterial = useCallback(
    (id: string) => {
      if (!checkUserPermission('master_data', 'delete')) return;

      const mat = allRawMaterials.find((m) => m.id === id);
      if (!mat || (mat.businessId || mat.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data bahan baku tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllRawMaterials((prev) => prev.filter((item) => item.id !== id));
      showToast('Bahan Baku Dihapus', `${mat.name} telah dihapus.`, 'warning');
      logAction('Hapus Bahan Baku', 'Master Bahan Baku', `Menghapus bahan baku ${mat.name}`);
    },
    [checkUserPermission, allRawMaterials, currentTenantId, showToast, logAction]
  );

  // Suppliers
  const addSupplier = useCallback(
    (supplierData: Omit<Supplier, 'id'>) => {
      if (!checkUserPermission('master_data', 'create')) return;

      const id = 'sup-' + Date.now();
      const newSup: Supplier = {
        ...supplierData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllSuppliers((prev) => [newSup, ...prev]);
      showToast('Supplier Berhasil Ditambahkan', `${supplierData.name} terdaftar.`, 'success');
      logAction('Tambah Supplier', 'Master Supplier', `Menambahkan supplier ${supplierData.name}`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updateSupplier = useCallback(
    (id: string, updatedFields: Partial<Supplier>) => {
      if (!checkUserPermission('master_data', 'edit')) return;

      const target = allSuppliers.find((s) => s.id === id);
      if (!target || (target.businessId || target.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data supplier tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllSuppliers((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId } : item
        )
      );
      showToast('Supplier Diperbarui', 'Informasi supplier telah disimpan.', 'success');
      logAction('Update Supplier', 'Master Supplier', `Memperbarui supplier ID ${id}`);
    },
    [checkUserPermission, allSuppliers, currentTenantId, showToast, logAction]
  );

  const deleteSupplier = useCallback(
    (id: string) => {
      if (!checkUserPermission('master_data', 'delete')) return;

      const sup = allSuppliers.find((s) => s.id === id);
      if (!sup || (sup.businessId || sup.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data supplier tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllSuppliers((prev) => prev.filter((item) => item.id !== id));
      showToast('Supplier Dihapus', `${sup.name} telah dihapus.`, 'warning');
      logAction('Hapus Supplier', 'Master Supplier', `Menghapus supplier ${sup.name}`);
    },
    [checkUserPermission, allSuppliers, currentTenantId, showToast, logAction]
  );

  // BOM / Recipe
  const addBom = useCallback(
    (bomData: Omit<BillOfMaterial, 'id' | 'createdAt' | 'updatedAt'>): string => {
      if (!checkUserPermission('bom', 'create')) return '';

      const id = 'bom-' + Date.now();
      const now = new Date().toISOString().substring(0, 10);
      const newBom: BillOfMaterial = {
        ...bomData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
        createdAt: now,
        updatedAt: now,
      };
      setAllBoms((prev) => [newBom, ...prev]);

      // Update linked product estimated HPP & activeBomId
      setAllProducts((prev) =>
        prev.map((p) =>
          p.id === bomData.productId
            ? {
                ...p,
                estimatedHpp: bomData.hppPerUnit,
                activeBomId: id,
                hppHistory: [
                  ...(p.hppHistory || []),
                  {
                    date: now,
                    previousHpp: p.estimatedHpp,
                    newHpp: bomData.hppPerUnit,
                    diffNominal: bomData.hppPerUnit - p.estimatedHpp,
                    diffPercent: p.estimatedHpp > 0 ? ((bomData.hppPerUnit - p.estimatedHpp) / p.estimatedHpp) * 100 : 0,
                    reason: `Pembaruan dari Formula Resep ${bomData.code}`,
                  },
                ],
              }
            : p
        )
      );

      showToast('Formula BOM Disimpan', `Resep ${bomData.code} berhasil ditambahkan.`, 'success');
      logAction('Tambah BOM', 'BOM & Resep', `Menambahkan formula resep ${bomData.code} untuk ${bomData.productName}`);
      return id;
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updateBom = useCallback(
    (id: string, updatedFields: Partial<BillOfMaterial>) => {
      if (!checkUserPermission('bom', 'edit')) return;

      const target = allBoms.find((b) => b.id === id);
      if (!target || (target.businessId || target.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data resep tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      const now = new Date().toISOString().substring(0, 10);
      setAllBoms((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId, updatedAt: now }
            : item
        )
      );

      if (updatedFields.hppPerUnit !== undefined && target.productId) {
        setAllProducts((prev) =>
          prev.map((p) => (p.id === target.productId ? { ...p, estimatedHpp: updatedFields.hppPerUnit! } : p))
        );
      }

      showToast('Formula BOM Diperbarui', 'Perubahan resep berhasil disimpan.', 'success');
      logAction('Update BOM', 'BOM & Resep', `Memperbarui formula resep ID ${id}`);
    },
    [checkUserPermission, allBoms, currentTenantId, showToast, logAction]
  );

  const deleteBom = useCallback(
    (id: string) => {
      if (!checkUserPermission('bom', 'delete')) return;

      const bom = allBoms.find((b) => b.id === id);
      if (!bom || (bom.businessId || bom.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data resep tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllBoms((prev) => prev.filter((item) => item.id !== id));
      showToast('Formula Dihapus', `Resep ${bom.code} telah dihapus.`, 'warning');
      logAction('Hapus BOM', 'BOM & Resep', `Menghapus formula resep ${bom.code}`);
    },
    [checkUserPermission, allBoms, currentTenantId, showToast, logAction]
  );

  // Production Batches
  const addProductionBatch = useCallback(
    (batchData: Omit<ProductionBatch, 'id'>) => {
      if (!checkUserPermission('produksi', 'create')) return;

      const id = 'batch-' + Date.now();
      const newBatch: ProductionBatch = {
        ...batchData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllBatches((prev) => [newBatch, ...prev]);

      // If status is Selesai, adjust stock
      if (batchData.status === 'Selesai' && batchData.actualOutput > 0) {
        setAllProducts((prev) =>
          prev.map((p) =>
            p.id === batchData.productId ? { ...p, currentStock: p.currentStock + batchData.actualOutput } : p
          )
        );

        // Add Stock Movement
        const movId = 'mov-' + Date.now();
        const newMov: StockMovement = {
          id: movId,
          businessId: currentTenantId,
          tenantId: currentTenantId,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          itemType: 'PRODUCT',
          itemId: batchData.productId,
          itemName: batchData.productName,
          type: 'IN_PRODUCTION',
          quantity: batchData.actualOutput,
          unit: 'unit',
          referenceNo: batchData.batchNumber,
          unitCost: batchData.actualHppPerUnit,
          totalValue: batchData.actualCostTotal,
          balanceAfter: 0,
          notes: `Hasil produksi SPK ${batchData.batchNumber}`,
        };
        setAllStockMovements((prev) => [newMov, ...prev]);
      }

      showToast('SPK Produksi Diterbitkan', `Batch ${batchData.batchNumber} berhasil dibuat.`, 'success');
      logAction('Tambah Batch', 'Produksi', `Menerbitkan SPK ${batchData.batchNumber} untuk ${batchData.productName}`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updateProductionBatch = useCallback(
    (id: string, updatedFields: Partial<ProductionBatch>) => {
      if (!checkUserPermission('produksi', 'edit')) return;

      const target = allBatches.find((b) => b.id === id);
      if (!target || (target.businessId || target.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data batch tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      setAllBatches((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId } : item
        )
      );
      showToast('Status Produksi Diperbarui', 'Data batch produksi disimpan.', 'success');
      logAction('Update Batch', 'Produksi', `Memperbarui batch SPK ID ${id}`);
    },
    [checkUserPermission, allBatches, currentTenantId, showToast, logAction]
  );

  // Purchase Orders
  const addPurchaseOrder = useCallback(
    (poData: Omit<PurchaseOrder, 'id'>) => {
      if (!checkUserPermission('inventory', 'create')) return;

      const id = 'po-' + Date.now();
      const newPo: PurchaseOrder = {
        ...poData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllPurchaseOrders((prev) => [newPo, ...prev]);
      showToast('PO Berhasil Dibuat', `Pesanan ${poData.poNumber} ke ${poData.supplierName} tersimpan.`, 'success');
      logAction('Tambah PO', 'Pembelian', `Membuat PO ${poData.poNumber} untuk ${poData.supplierName}`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updatePurchaseOrderStatus = useCallback(
    (id: string, status: PurchaseOrder['status']) => {
      if (!checkUserPermission('inventory', 'edit')) return;

      const po = allPurchaseOrders.find((p) => p.id === id);
      if (!po || (po.businessId || po.tenantId) !== currentTenantId) {
        showToast('Akses Ditolak', 'Data PO tidak ditemukan pada ruang kerja bisnis ini.', 'error');
        return;
      }

      const receivedDate = status === 'Diterima' ? new Date().toISOString().substring(0, 10) : po.receivedDate;
      setAllPurchaseOrders((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status, receivedDate } : item))
      );

      // When PO is Diterima, update stock & price history of materials
      if (status === 'Diterima') {
        po.items.forEach((item) => {
          setAllRawMaterials((prev) =>
            prev.map((mat) => {
              if (mat.id !== item.rawMaterialId) return mat;
              const addedStock = item.quantity * (mat.conversionRatio || 1);
              const newCurrentStock = mat.currentStock + addedStock;
              const oldVal = mat.currentStock * mat.costPerUnit;
              const addedVal = item.subtotal;
              const newCostPerUnit = newCurrentStock > 0 ? (oldVal + addedVal) / newCurrentStock : mat.costPerUnit;

              return {
                ...mat,
                currentStock: newCurrentStock,
                buyPrice: item.unitPrice,
                costPerUnit: newCostPerUnit,
                lastUpdated: receivedDate!,
                priceHistory: [
                  ...(mat.priceHistory || []),
                  {
                    date: receivedDate!,
                    price: item.unitPrice,
                    poNumber: po.poNumber,
                    supplierName: po.supplierName,
                  },
                ],
              };
            })
          );
        });
      }

      showToast('Status PO Diperbarui', `PO ${po.poNumber} kini berstatus: ${status}`, 'success');
      logAction('Update Status PO', 'Pembelian', `Mengubah status PO ${po.poNumber} menjadi ${status}`);
    },
    [checkUserPermission, allPurchaseOrders, currentTenantId, showToast, logAction]
  );

  const addStockMovement = useCallback(
    (movData: Omit<StockMovement, 'id'>) => {
      if (!checkUserPermission('inventory', 'create')) return;

      const id = 'mov-' + Date.now();
      const newMov: StockMovement = {
        ...movData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllStockMovements((prev) => [newMov, ...prev]);
    },
    [checkUserPermission, currentTenantId]
  );

  // Categories
  const addCategory = useCallback(
    (catData: Omit<Category, 'id'>) => {
      if (!checkUserPermission('master_data', 'create')) return;

      const id = 'cat-' + Date.now();
      const newCat: Category = {
        ...catData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllCategories((prev) => [newCat, ...prev]);
      showToast('Kategori Ditambahkan', `Kategori ${catData.name} siap digunakan.`, 'success');
    },
    [checkUserPermission, currentTenantId, showToast]
  );

  const updateCategory = useCallback(
    (id: string, updatedFields: Partial<Category>) => {
      if (!checkUserPermission('master_data', 'edit')) return;

      setAllCategories((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId } : item
        )
      );
      showToast('Kategori Diperbarui', 'Data kategori disimpan.', 'success');
    },
    [checkUserPermission, currentTenantId, showToast]
  );

  const deleteCategory = useCallback(
    (id: string) => {
      if (!checkUserPermission('master_data', 'delete')) return;

      setAllCategories((prev) => prev.filter((item) => item.id !== id));
      showToast('Kategori Dihapus', 'Kategori telah dihapus.', 'warning');
    },
    [checkUserPermission, showToast]
  );

  // Units
  const addUnit = useCallback(
    (unitData: Omit<UnitOfMeasure, 'id'>) => {
      if (!checkUserPermission('master_data', 'create')) return;

      const id = 'u-' + Date.now();
      const newUnit: UnitOfMeasure = {
        ...unitData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
      };
      setAllUnits((prev) => [newUnit, ...prev]);
      showToast('Satuan Ditambahkan', `Satuan ${unitData.name} siap digunakan.`, 'success');
    },
    [checkUserPermission, currentTenantId, showToast]
  );

  const updateUnit = useCallback(
    (id: string, updatedFields: Partial<UnitOfMeasure>) => {
      if (!checkUserPermission('master_data', 'edit')) return;

      setAllUnits((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...updatedFields, businessId: currentTenantId, tenantId: currentTenantId } : item
        )
      );
      showToast('Satuan Diperbarui', 'Data satuan disimpan.', 'success');
    },
    [checkUserPermission, currentTenantId, showToast]
  );

  const deleteUnit = useCallback(
    (id: string) => {
      if (!checkUserPermission('master_data', 'delete')) return;

      setAllUnits((prev) => prev.filter((item) => item.id !== id));
      showToast('Satuan Dihapus', 'Satuan telah dihapus.', 'warning');
    },
    [checkUserPermission, showToast]
  );

  // User Management
  const addUser = useCallback(
    async (userData: Omit<UserProfile, 'id'> & { password?: string }) => {
      if (!checkUserPermission('system', 'create')) return;

      const id = 'user-' + Date.now();
      const salt = generateSalt();
      const rawPass = userData.password || 'Staff123!';
      const passwordHash = await hashPassword(rawPass, salt);

      const newUser: UserProfile = {
        ...userData,
        id,
        businessId: currentTenantId,
        tenantId: currentTenantId,
        salt,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      setAllUsers((prev) => [newUser, ...prev]);
      showToast('Pengguna Ditambahkan', `Pengguna ${userData.name} berhasil didaftarkan.`, 'success');
      logAction('Tambah Pengguna', 'Manajemen Pengguna', `Menambahkan pengguna ${userData.name} (${userData.role})`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const updateUser = useCallback(
    async (id: string, updatedFields: Partial<UserProfile> & { newPassword?: string }) => {
      if (!checkUserPermission('system', 'edit')) return;

      let extraSecurity: { salt?: string; passwordHash?: string } = {};
      if (updatedFields.newPassword) {
        const salt = generateSalt();
        const hash = await hashPassword(updatedFields.newPassword, salt);
        extraSecurity = { salt, passwordHash: hash };
      }

      setAllUsers((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, ...updatedFields, ...extraSecurity, businessId: currentTenantId, tenantId: currentTenantId }
            : item
        )
      );
      showToast('Pengguna Diperbarui', 'Data pengguna telah disimpan.', 'success');
      logAction('Update Pengguna', 'Manajemen Pengguna', `Memperbarui akun pengguna ID ${id}`);
    },
    [checkUserPermission, currentTenantId, showToast, logAction]
  );

  const deleteUser = useCallback(
    (id: string) => {
      if (!checkUserPermission('system', 'delete')) return;

      if (id === currentUser.id) {
        showToast('Tindakan Ditolak', 'Anda tidak dapat menghapus akun sendiri yang sedang aktif.', 'error');
        return;
      }

      const u = allUsers.find((x) => x.id === id);
      setAllUsers((prev) => prev.filter((item) => item.id !== id));
      showToast('Pengguna Dihapus', `Akun ${u?.name || ''} telah dihapus.`, 'warning');
      logAction('Hapus Pengguna', 'Manajemen Pengguna', `Menghapus akun pengguna ${u?.name}`);
    },
    [checkUserPermission, currentUser, allUsers, showToast, logAction]
  );

  // --------------------------------------------------------------------------
  // BACKUP & RESTORE (Scoped to current business for data isolation)
  // --------------------------------------------------------------------------
  const resetToDemoData = useCallback(() => {
    if (!checkUserPermission('system', 'edit')) return;

    if (currentTenantId === 'tenant-2') {
      setAllProducts((prev) => [
        ...prev.filter((p) => (p.businessId || p.tenantId) !== 'tenant-2'),
        ...mockProductsKaryaLogam,
      ]);
      setAllRawMaterials((prev) => [
        ...prev.filter((m) => (m.businessId || m.tenantId) !== 'tenant-2'),
        ...mockRawMaterialsKaryaLogam,
      ]);
      setAllSuppliers((prev) => [
        ...prev.filter((s) => (s.businessId || s.tenantId) !== 'tenant-2'),
        ...mockSuppliersKaryaLogam,
      ]);
      setAllBoms((prev) => [
        ...prev.filter((b) => (b.businessId || b.tenantId) !== 'tenant-2'),
        ...mockBOMsKaryaLogam,
      ]);
      setAllBatches((prev) => [
        ...prev.filter((b) => (b.businessId || b.tenantId) !== 'tenant-2'),
        ...mockBatchesKaryaLogam,
      ]);
      setAllPurchaseOrders((prev) => [
        ...prev.filter((po) => (po.businessId || po.tenantId) !== 'tenant-2'),
        ...mockPurchaseOrdersKaryaLogam,
      ]);
      setAllCompanySettings((prev) => ({ ...prev, 'tenant-2': mockCompanySettingsKaryaLogam }));
    } else {
      setAllProducts((prev) => [
        ...prev.filter((p) => (p.businessId || p.tenantId) !== 'tenant-1'),
        ...ensureTenantTag(mockProducts, 'tenant-1'),
      ]);
      setAllRawMaterials((prev) => [
        ...prev.filter((m) => (m.businessId || m.tenantId) !== 'tenant-1'),
        ...ensureTenantTag(mockRawMaterials, 'tenant-1'),
      ]);
      setAllSuppliers((prev) => [
        ...prev.filter((s) => (s.businessId || s.tenantId) !== 'tenant-1'),
        ...ensureTenantTag(mockSuppliers, 'tenant-1'),
      ]);
      setAllBoms((prev) => [
        ...prev.filter((b) => (b.businessId || b.tenantId) !== 'tenant-1'),
        ...ensureTenantTag(mockBOMs, 'tenant-1'),
      ]);
      setAllBatches((prev) => [
        ...prev.filter((b) => (b.businessId || b.tenantId) !== 'tenant-1'),
        ...ensureTenantTag(mockProductionBatches, 'tenant-1'),
      ]);
      setAllPurchaseOrders((prev) => [
        ...prev.filter((po) => (po.businessId || po.tenantId) !== 'tenant-1'),
        ...ensureTenantTag(mockPurchaseOrders, 'tenant-1'),
      ]);
      setAllCompanySettings((prev) => ({ ...prev, 'tenant-1': mockCompanySettings }));
    }

    showToast('Reset Demo Berhasil', `Data demo ruang kerja ${currentTenant.name} telah dipulihkan.`, 'info');
    logAction('Reset Demo Data', 'Sistem & Backup', `Reset data demo untuk ${currentTenant.name}`);
  }, [checkUserPermission, currentTenantId, currentTenant, showToast, logAction]);

  const exportDatabaseJson = useCallback((): string => {
    const payload = {
      exportVersion: '2.0.0-commercial',
      exportedAt: new Date().toISOString(),
      businessId: currentTenantId,
      businessName: currentTenant.name,
      companySettings,
      products,
      rawMaterials,
      suppliers,
      categories,
      units,
      boms,
      batches,
      purchaseOrders,
      stockMovements,
      users: availableUsers,
      logs,
    };
    return JSON.stringify(payload, null, 2);
  }, [
    currentTenantId,
    currentTenant,
    companySettings,
    products,
    rawMaterials,
    suppliers,
    categories,
    units,
    boms,
    batches,
    purchaseOrders,
    stockMovements,
    availableUsers,
    logs,
  ]);

  const importDatabaseJson = useCallback(
    (jsonString: string): boolean => {
      if (!checkUserPermission('system', 'create')) return false;

      try {
        const data = JSON.parse(jsonString);
        const targetId = currentTenantId;

        // Retain other tenants and overwrite current tenant's data safely
        if (data.products && Array.isArray(data.products)) {
          const tagged = ensureTenantTag<Product>(data.products, targetId);
          setAllProducts((prev) => [...prev.filter((p) => (p.businessId || p.tenantId) !== targetId), ...tagged]);
        }
        if (data.rawMaterials && Array.isArray(data.rawMaterials)) {
          const tagged = ensureTenantTag<RawMaterial>(data.rawMaterials, targetId);
          setAllRawMaterials((prev) => [...prev.filter((m) => (m.businessId || m.tenantId) !== targetId), ...tagged]);
        }
        if (data.suppliers && Array.isArray(data.suppliers)) {
          const tagged = ensureTenantTag<Supplier>(data.suppliers, targetId);
          setAllSuppliers((prev) => [...prev.filter((s) => (s.businessId || s.tenantId) !== targetId), ...tagged]);
        }
        if (data.categories && Array.isArray(data.categories)) {
          const tagged = ensureTenantTag<Category>(data.categories, targetId);
          setAllCategories((prev) => [...prev.filter((c) => (c.businessId || c.tenantId) !== targetId), ...tagged]);
        }
        if (data.boms && Array.isArray(data.boms)) {
          const tagged = ensureTenantTag<BillOfMaterial>(data.boms, targetId);
          setAllBoms((prev) => [...prev.filter((b) => (b.businessId || b.tenantId) !== targetId), ...tagged]);
        }
        if (data.batches && Array.isArray(data.batches)) {
          const tagged = ensureTenantTag<ProductionBatch>(data.batches, targetId);
          setAllBatches((prev) => [...prev.filter((b) => (b.businessId || b.tenantId) !== targetId), ...tagged]);
        }
        if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
          const tagged = ensureTenantTag<PurchaseOrder>(data.purchaseOrders, targetId);
          setAllPurchaseOrders((prev) => [...prev.filter((po) => (po.businessId || po.tenantId) !== targetId), ...tagged]);
        }
        if (data.companySettings) {
          setAllCompanySettings((prev) => ({
            ...prev,
            [targetId]: { ...data.companySettings, businessId: targetId, tenantId: targetId },
          }));
        }

        showToast('Import Berhasil', `Data untuk ruang kerja ${currentTenant.name} berhasil dipulihkan.`, 'success');
        logAction('Restore Database', 'Sistem', `Memulihkan data untuk ruang kerja ${currentTenant.name}`);
        return true;
      } catch {
        showToast('Import Gagal', 'Format file JSON tidak valid.', 'error');
        return false;
      }
    },
    [checkUserPermission, currentTenantId, currentTenant, showToast, logAction]
  );

  return (
    <AppContext.Provider
      value={{
        currentMenu,
        setCurrentMenu,
        isAuthenticated,
        authSession,
        login,
        logout,
        registerBusinessAndUser,
        checkUserPermission,
        currentTenant,
        currentBusinessId: currentTenantId,
        setCurrentTenantId,
        availableTenants: tenants,
        currentUser,
        setCurrentUser,
        availableUsers,
        products,
        rawMaterials,
        suppliers,
        categories,
        units,
        boms,
        batches,
        purchaseOrders,
        stockMovements,
        logs,
        companySettings,
        updateCompanySettings,
        addProduct,
        updateProduct,
        deleteProduct,
        addRawMaterial,
        updateRawMaterial,
        deleteRawMaterial,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addBom,
        updateBom,
        deleteBom,
        addProductionBatch,
        updateProductionBatch,
        addPurchaseOrder,
        updatePurchaseOrderStatus,
        addStockMovement,
        addCategory,
        updateCategory,
        deleteCategory,
        addUnit,
        updateUnit,
        deleteUnit,
        addUser,
        updateUser,
        deleteUser,
        toasts,
        showToast,
        removeToast,
        resetToDemoData,
        exportDatabaseJson,
        importDatabaseJson,
        isQuickSearchOpen,
        setIsQuickSearchOpen,
        logAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
