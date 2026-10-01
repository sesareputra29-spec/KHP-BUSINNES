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
import { api } from '../services/api';
import { checkPermission, SystemModule, RbacAction } from '../utils/rbac';
import { mockCompanySettings } from '../data/mockData';

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
  isSuperAdmin: boolean;
  isSuperAdminPortalOpen: boolean;
  setIsSuperAdminPortalOpen: (open: boolean) => void;
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

  // Subscription & Entitlements
  activeSubscription: any;
  subscriptionUsage: any;
  isReadOnly: boolean;
  refreshSubscription: () => Promise<void>;

  // Onboarding & Upgrade Modals (Customer Journey)
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isUpgradeModalOpen: boolean;
  setIsUpgradeModalOpen: (open: boolean) => void;
  openUpgradeModal: (selectedPlan?: string) => void;
  targetUpgradePlan: string;

  // Multi-Business / Multi-Tenant
  currentTenant: Tenant;
  currentBusinessId: string;
  setCurrentTenant: (tenant: Tenant) => void;
  setCurrentTenantId: (tenantId: string) => void;
  availableTenants: Tenant[];
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  setIsAuthenticated: (auth: boolean) => void;
  availableUsers: UserProfile[];
  loadBusinessData: () => Promise<void>;

  // Master Data (Scoped to current business from Backend DB)
  products: Product[];
  rawMaterials: RawMaterial[];
  suppliers: Supplier[];
  categories: Category[];
  units: UnitOfMeasure[];

  // Production & HPP (Scoped to current business from Backend DB)
  boms: BillOfMaterial[];
  batches: ProductionBatch[];

  // Inventory & Purchasing (Scoped to current business from Backend DB)
  purchaseOrders: PurchaseOrder[];
  stockMovements: StockMovement[];

  // System & Settings (Scoped to current business from Backend DB)
  logs: ActivityLog[];
  companySettings: CompanySettings;
  updateCompanySettings: (settings: Partial<CompanySettings>) => void;

  // Actions with Backend Server-Side Role & Tenant Enforcement
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

  // Backup & Restore (Server-backed)
  resetToDemoData: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonString: string) => boolean;

  // Quick Action / Search Modal
  isQuickSearchOpen: boolean;
  setIsQuickSearchOpen: (open: boolean) => void;
  logAction: (action: string, module: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMenu, setCurrentMenu] = useState<MenuId>('1.1');
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // 1. Authentication & Session State (Validated with Server)
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUserState] = useState<UserProfile>({
    id: 'user-1',
    name: 'Bambang Sudirman, SE, Ak.',
    username: 'bambang_akuntansi',
    email: 'bambang.akuntansi@bogarasa.co.id',
    role: 'Administrator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    tenantId: 'tenant-1',
    businessId: 'tenant-1',
    phone: '0812-3456-7890',
    active: true,
  });

  const [currentTenant, setCurrentTenantState] = useState<Tenant>({
    id: 'tenant-1',
    name: 'PT Boga Rasa Nusantara',
    code: 'BRN',
    industry: 'Makanan & Minuman (F&B / Bakery & Condiments)',
    plan: 'Business Pro',
    logoText: 'BRN',
    skuCount: 18,
    maxSku: 50,
    status: 'active',
    currency: 'IDR',
    createdAt: '2026-01-15',
    subscription: {
      plan: 'Business Pro',
      status: 'active',
      maxUsers: 15,
      maxSku: 50,
    },
  });

  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);

  // Subscription & Entitlements State
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState<any>(null);
  const [isSuperAdminPortalOpen, setIsSuperAdminPortalOpen] = useState<boolean>(false);

  // Onboarding & Upgrade Modal state (Customer Journey)
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [targetUpgradePlan, setTargetUpgradePlan] = useState('PRO');

  const openUpgradeModal = useCallback((selectedPlan = 'PRO') => {
    setTargetUpgradePlan(selectedPlan);
    setIsUpgradeModalOpen(true);
  }, []);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN' || authSession?.isSuperAdmin || false;
  const isReadOnly = Boolean(activeSubscription?.isReadOnly || activeSubscription?.status === 'EXPIRED');

  // 2. Business Master Data States (Loaded from Backend Database)
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<UnitOfMeasure[]>([]);
  const [boms, setBoms] = useState<BillOfMaterial[]>([]);
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(mockCompanySettings);

  // Toast Helpers
  const showToast = useCallback((title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const subData = await api.getCurrentSubscription();
      setActiveSubscription(subData.subscription);
      setSubscriptionUsage(subData.usage);
    } catch (e) {
      console.warn('Could not refresh subscription:', e);
    }
  }, []);

  // Load all business data from the backend database for current business
  const loadBusinessData = useCallback(async () => {
    try {
      const [
        prods,
        mats,
        sups,
        cats,
        unts,
        bmList,
        batchList,
        poList,
        mvList,
        logList,
        settings,
        userList,
        bizList,
        subData,
      ] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getRawMaterials().catch(() => []),
        api.getSuppliers().catch(() => []),
        api.getCategories().catch(() => []),
        api.getUnits().catch(() => []),
        api.getBoms().catch(() => []),
        api.getProductionBatches().catch(() => []),
        api.getPurchaseOrders().catch(() => []),
        api.getStockMovements().catch(() => []),
        api.getActivityLogs().catch(() => []),
        api.getCompanySettings().catch(() => mockCompanySettings),
        api.getUsers().catch(() => []),
        api.getAllBusinesses().catch(() => []),
        api.getCurrentSubscription().catch(() => null),
      ]);

      setProducts(prods);
      setRawMaterials(mats);
      setSuppliers(sups);
      setCategories(cats);
      setUnits(unts);
      setBoms(bmList);
      setBatches(batchList);
      setPurchaseOrders(poList);
      setStockMovements(mvList);
      setLogs(logList);
      setCompanySettings(settings);
      setAvailableUsers(userList);
      if (bizList.length > 0) {
        setAvailableTenants(bizList);
      }
      if (subData) {
        setActiveSubscription(subData.subscription);
        setSubscriptionUsage(subData.usage);
      }
    } catch (err: any) {
      console.error('[AppContext] Error loading business data from backend:', err);
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      const existingToken = api.getToken();
      if (existingToken) {
        try {
          const { user, business } = await api.getMe();
          if (isMounted) {
            setCurrentUserState(user);
            setCurrentTenantState(business);
            setAuthSession({
              token: existingToken,
              userId: user.id,
              userEmail: user.email,
              userName: user.name,
              userRole: user.role,
              businessId: business.id,
              businessName: business.name,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            });
            setIsAuthenticated(true);
            if (business.onboardingStatus === 'IN_PROGRESS') {
              setIsOnboardingOpen(true);
            }
            await loadBusinessData();
            return;
          }
        } catch {
          // Token expired or invalid
          api.setToken(null);
        }
      }
      // If no valid session token exists, user remains unauthenticated
      // (They will be routed to Landing Page, Pricing, Register, or Login)
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [loadBusinessData]);

  // Auth: Login
  const login = async (identifier: string, pass: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await api.login(identifier, pass);
      if (res.success) {
        setCurrentUserState(res.user);
        setCurrentTenantState(res.business);
        setAuthSession({
          token: res.token,
          userId: res.user.id,
          userEmail: res.user.email,
          userName: res.user.name,
          userRole: res.user.role,
          businessId: res.business.id,
          businessName: res.business.name,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
        setIsAuthenticated(true);
        if (res.business?.onboardingStatus === 'IN_PROGRESS') {
          setIsOnboardingOpen(true);
        }
        await loadBusinessData();
        showToast('Login Berhasil', `Selamat datang kembali, ${res.user.name}!`, 'success');
        return { success: true, message: 'Berhasil masuk.' };
      }
      return { success: false, message: 'Gagal login.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal masuk. Periksa email dan kata sandi.' };
    }
  };

  // Auth: Register Business
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
    try {
      const res = await api.register(payload);
      if (res.success) {
        setCurrentUserState(res.user);
        setCurrentTenantState(res.business);
        setAuthSession({
          token: res.token,
          userId: res.user.id,
          userEmail: res.user.email,
          userName: res.user.name,
          userRole: res.user.role,
          businessId: res.business.id,
          businessName: res.business.name,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
        setIsAuthenticated(true);
        await loadBusinessData();
        showToast('Ruang Kerja Baru Siap', res.message, 'success');
        return { success: true, message: res.message };
      }
      return { success: false, message: 'Gagal mendaftar.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal mendaftarkan bisnis baru.' };
    }
  };

  // Auth: Logout
  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.warn('Logout error ignored:', e);
    }
    setAuthSession(null);
    setIsAuthenticated(false);
    showToast('Logout Berhasil', 'Anda telah keluar dari sesi kerja.', 'info');
  };

  // Multi-Tenant Switcher
  const setCurrentTenantId = async (targetId: string) => {
    try {
      const res = await api.switchTenant(targetId);
      if (res.success) {
        setCurrentUserState(res.user);
        setCurrentTenantState(res.business);
        setAuthSession({
          token: res.token,
          userId: res.user.id,
          userEmail: res.user.email,
          userName: res.user.name,
          userRole: res.user.role,
          businessId: res.business.id,
          businessName: res.business.name,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        });
        await loadBusinessData();
        showToast('Ruang Kerja Beralih', `Sekarang bekerja di: ${res.business.name}`, 'success');
      }
    } catch (err: any) {
      showToast('Gagal Ganti Ruang Kerja', err.message, 'error');
    }
  };

  const setCurrentUser = (user: UserProfile) => {
    setCurrentUserState(user);
    showToast('Simulasi Peran Aktif', `Beralih ke peran ${user.role} (${user.name})`, 'info');
  };

  // Role & Permission checker
  const checkUserPermission = useCallback(
    (module: SystemModule, action: RbacAction = 'view'): boolean => {
      return checkPermission(currentUser?.role, module, action);
    },
    [currentUser]
  );

  // --- CRUD: Products ---
  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const created = await api.createProduct(productData);
      setProducts((prev) => [created, ...prev]);
      showToast('Produk Berhasil Ditambahkan', `${created.name} (${created.sku}) tersimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const updated = await api.updateProduct(id, productData);
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast('Produk Diperbarui', `${updated.name} berhasil disimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      showToast('Produk Dihapus', 'Produk berhasil dihapus dari database server.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- CRUD: Raw Materials ---
  const addRawMaterial = async (matData: Omit<RawMaterial, 'id' | 'costPerUnit'>) => {
    try {
      const created = await api.createRawMaterial(matData);
      setRawMaterials((prev) => [created, ...prev]);
      showToast('Bahan Baku Ditambahkan', `${created.name} tersimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateRawMaterial = async (id: string, matData: Partial<RawMaterial>) => {
    try {
      const updated = await api.updateRawMaterial(id, matData);
      setRawMaterials((prev) => prev.map((m) => (m.id === id ? updated : m)));
      showToast('Bahan Baku Diperbarui', `${updated.name} berhasil disimpan.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteRawMaterial = async (id: string) => {
    try {
      await api.deleteRawMaterial(id);
      setRawMaterials((prev) => prev.filter((m) => m.id !== id));
      showToast('Bahan Baku Dihapus', 'Bahan baku berhasil dihapus dari server.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- CRUD: Suppliers ---
  const addSupplier = async (supData: Omit<Supplier, 'id'>) => {
    try {
      const created = await api.createSupplier(supData);
      setSuppliers((prev) => [created, ...prev]);
      showToast('Supplier Ditambahkan', `${created.name} tersimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateSupplier = async (id: string, supData: Partial<Supplier>) => {
    try {
      const updated = await api.updateSupplier(id, supData);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
      showToast('Supplier Diperbarui', `${updated.name} berhasil diperbarui.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      await api.deleteSupplier(id);
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      showToast('Supplier Dihapus', 'Supplier berhasil dihapus dari server.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- CRUD: BOM ---
  const addBom = (bomData: Omit<BillOfMaterial, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const tempId = `bom_${Date.now()}`;
    api
      .createBom(bomData)
      .then((created) => {
        setBoms((prev) => [created, ...prev]);
        showToast('Resep BOM Disimpan', `Formula ${created.productName} (${created.code}) tersimpan di server.`, 'success');
      })
      .catch((err) => {
        showToast('Aksi Ditolak Server', err.message, 'error');
      });
    return tempId;
  };

  const updateBom = async (id: string, bomData: Partial<BillOfMaterial>) => {
    try {
      const updated = await api.updateBom(id, bomData);
      setBoms((prev) => prev.map((b) => (b.id === id ? updated : b)));
      showToast('Resep BOM Diperbarui', `${updated.productName} berhasil disimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteBom = async (id: string) => {
    try {
      await api.deleteBom(id);
      setBoms((prev) => prev.filter((b) => b.id !== id));
      showToast('Resep BOM Dihapus', 'Resep berhasil dihapus dari server.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- CRUD: Production ---
  const addProductionBatch = async (batchData: Omit<ProductionBatch, 'id'>) => {
    try {
      const created = await api.createProductionBatch(batchData);
      setBatches((prev) => [created, ...prev]);
      showToast('SPK Produksi Diterbitkan', `Nomor batch: ${created.batchNumber}`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateProductionBatch = async (id: string, batchData: Partial<ProductionBatch>) => {
    try {
      const updated = await api.updateProductionBatch(id, batchData);
      setBatches((prev) => prev.map((b) => (b.id === id ? updated : b)));
      showToast('SPK Produksi Diperbarui', `Status ${updated.batchNumber} kini: ${updated.status}`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- CRUD: Purchases & Stock Movements ---
  const addPurchaseOrder = async (poData: Omit<PurchaseOrder, 'id'>) => {
    try {
      const created = await api.createPurchaseOrder(poData);
      setPurchaseOrders((prev) => [created, ...prev]);
      showToast('PO Diterbitkan', `PO ${created.poNumber} tersimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updatePurchaseOrderStatus = async (id: string, status: PurchaseOrder['status']) => {
    try {
      const updated = await api.updatePurchaseOrderStatus(id, status);
      setPurchaseOrders((prev) => prev.map((p) => (p.id === id ? updated : p)));
      showToast('Status PO Berubah', `Status PO ${updated.poNumber} diubah menjadi ${status}`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const addStockMovement = async (mvData: Omit<StockMovement, 'id'>) => {
    try {
      const created = await api.createStockMovement(mvData);
      setStockMovements((prev) => [created, ...prev]);
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- Categories & Units ---
  const addCategory = async (catData: Omit<Category, 'id'>) => {
    try {
      const created = await api.createCategory(catData);
      setCategories((prev) => [...prev, created]);
      showToast('Kategori Ditambahkan', `${created.name} tersimpan.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateCategory = async (id: string, catData: Partial<Category>) => {
    try {
      const updated = await api.updateCategory(id, catData);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('Kategori Diperbarui', `${updated.name} berhasil disimpan.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      showToast('Kategori Dihapus', 'Kategori berhasil dihapus.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const addUnit = async (unitData: Omit<UnitOfMeasure, 'id'>) => {
    try {
      const created = await api.createUnit(unitData);
      setUnits((prev) => [...prev, created]);
      showToast('Satuan Ditambahkan', `${created.name} tersimpan.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateUnit = async (id: string, unitData: Partial<UnitOfMeasure>) => {
    try {
      const updated = await api.updateUnit(id, unitData);
      setUnits((prev) => prev.map((u) => (u.id === id ? updated : u)));
      showToast('Satuan Diperbarui', `${updated.name} berhasil disimpan.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteUnit = async (id: string) => {
    try {
      await api.deleteUnit(id);
      setUnits((prev) => prev.filter((u) => u.id !== id));
      showToast('Satuan Dihapus', 'Satuan berhasil dihapus.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- Users Management ---
  const addUser = async (userData: Omit<UserProfile, 'id'> & { password?: string }) => {
    try {
      const created = await api.createUser(userData);
      setAvailableUsers((prev) => [...prev, created]);
      showToast('Pengguna Ditambahkan', `${created.name} (${created.role}) tersimpan di server.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const updateUser = async (id: string, userData: Partial<UserProfile> & { newPassword?: string }) => {
    try {
      const updated = await api.updateUser(id, userData);
      setAvailableUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      if (currentUser.id === id) {
        setCurrentUserState(updated);
      }
      showToast('Pengguna Diperbarui', `${updated.name} berhasil disimpan.`, 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setAvailableUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('Pengguna Dihapus', 'Pengguna berhasil dihapus dari server.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  // --- Company Settings ---
  const updateCompanySettings = async (settingsData: Partial<CompanySettings>) => {
    try {
      const updated = await api.updateCompanySettings(settingsData);
      setCompanySettings(updated);
      showToast('Pengaturan Disimpan', 'Konfigurasi perusahaan berhasil disimpan ke database server.', 'success');
    } catch (err: any) {
      showToast('Aksi Ditolak Server', err.message, 'error');
    }
  };

  const logAction = (action: string, module: string, details: string) => {
    api.logAction(action, module, details).catch(console.error);
  };

  // --- Backup & Restore ---
  const resetToDemoData = () => {
    showToast('Reset Demo', 'Data demo awal aktif di database.', 'info');
  };

  const exportDatabaseJson = (): string => {
    // Return formatted current state as JSON string
    return JSON.stringify(
      {
        version: '2.0.0-saas-server',
        exportDate: new Date().toISOString(),
        business: currentTenant,
        companySettings,
        categories,
        units,
        suppliers,
        rawMaterials,
        products,
        boms,
        batches,
        purchaseOrders,
        stockMovements,
      },
      null,
      2
    );
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      api
        .importDatabaseJson(parsed)
        .then(() => {
          loadBusinessData();
          showToast('Impor Database Berhasil', 'Data berhasil disinkronisasi ke basis data server.', 'success');
        })
        .catch((err) => {
          showToast('Gagal Impor Database', err.message, 'error');
        });
      return true;
    } catch {
      showToast('Format Tidak Valid', 'File JSON database rusak atau tidak valid.', 'error');
      return false;
    }
  };

  const contextValue: AppContextType = {
    currentMenu,
    setCurrentMenu,
    isAuthenticated,
    authSession,
    isSuperAdmin,
    isSuperAdminPortalOpen,
    setIsSuperAdminPortalOpen,
    login,
    logout,
    registerBusinessAndUser,
    checkUserPermission,
    activeSubscription,
    subscriptionUsage,
    isReadOnly,
    refreshSubscription,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    openUpgradeModal,
    targetUpgradePlan,
    currentTenant,
    currentBusinessId: currentTenant.id,
    setCurrentTenant: setCurrentTenantState,
    setCurrentTenantId,
    availableTenants,
    currentUser,
    setCurrentUser: setCurrentUserState,
    setIsAuthenticated,
    availableUsers,
    loadBusinessData,
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
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
