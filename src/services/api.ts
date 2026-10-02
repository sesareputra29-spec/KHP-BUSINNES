import {
  UserProfile,
  Product,
  RawMaterial,
  Supplier,
  Category,
  UnitOfMeasure,
  BillOfMaterial,
  ProductionBatch,
  PurchaseOrder,
  StockMovement,
  ActivityLog,
  CompanySettings,
  Business,
  PlatformOverviewStats,
  SaaSPlan,
  SaaSSubscription,
  UserInvitation,
  AdminAuditLog,
} from '../types';

const TOKEN_KEY = 'hpp_saas_auth_token';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = this.getToken();
  }

  public setToken(token: string | null) {
    this.token = token;
    try {
      if (typeof window !== 'undefined') {
        if (token) {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem('auth_token', token);
          sessionStorage.setItem(TOKEN_KEY, token);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          sessionStorage.removeItem(TOKEN_KEY);
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('token');
        }
      }
    } catch {
      // Safe fallback in sandboxed iframe or private mode
    }
  }

  public getToken(): string | null {
    if (this.token) return this.token;
    try {
      if (typeof window !== 'undefined') {
        const stored =
          localStorage.getItem(TOKEN_KEY) ||
          localStorage.getItem('auth_token') ||
          localStorage.getItem('token') ||
          sessionStorage.getItem(TOKEN_KEY) ||
          sessionStorage.getItem('auth_token') ||
          sessionStorage.getItem('token');
        if (stored) {
          this.token = stored;
          return stored;
        }
      }
    } catch {
      // Fallback to in-memory token
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');

    const token = this.getToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      headers.set('x-auth-token', token);
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Only clear token if session verification endpoint explicitly fails with 401
      if (endpoint === '/api/auth/me') {
        this.setToken(null);
      }
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --- Auth & Session ---
  public async login(identifier: string, password: string) {
    const res = await this.request<{
      success: boolean;
      token: string;
      user: UserProfile;
      business: Business;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async register(payload: {
    businessName: string;
    industry: string;
    plan?: string;
    adminName: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
  }) {
    const res = await this.request<{
      success: boolean;
      token: string;
      user: UserProfile;
      business: Business;
      message: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async logout() {
    try {
      await this.request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.setToken(null);
    }
  }

  public async getMe() {
    return this.request<{ user: UserProfile; business: Business }>('/api/auth/me');
  }

  public async switchTenant(targetBusinessId: string) {
    const res = await this.request<{
      success: boolean;
      token: string;
      user: UserProfile;
      business: Business;
    }>('/api/auth/switch-tenant', {
      method: 'POST',
      body: JSON.stringify({ targetBusinessId }),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  // --- Business Directory ---
  public async getCurrentBusiness() {
    return this.request<Business>('/api/business/current');
  }

  public async getAllBusinesses() {
    return this.request<Business[]>('/api/business/all');
  }

  // --- Users ---
  public async getUsers() {
    return this.request<UserProfile[]>('/api/users');
  }

  public async createUser(user: Partial<UserProfile> & { password?: string }) {
    return this.request<UserProfile>('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  public async updateUser(id: string, user: Partial<UserProfile> & { newPassword?: string }) {
    return this.request<UserProfile>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  }

  public async deleteUser(id: string) {
    return this.request<{ success: boolean }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Products ---
  public async getProducts() {
    return this.request<Product[]>('/api/products');
  }

  public async createProduct(product: Omit<Product, 'id'>) {
    return this.request<Product>('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  }

  public async updateProduct(id: string, product: Partial<Product>) {
    return this.request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
  }

  public async deleteProduct(id: string) {
    return this.request<{ success: boolean }>(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Raw Materials ---
  public async getRawMaterials() {
    return this.request<RawMaterial[]>('/api/raw-materials');
  }

  public async createRawMaterial(material: Omit<RawMaterial, 'id' | 'costPerUnit'>) {
    return this.request<RawMaterial>('/api/raw-materials', {
      method: 'POST',
      body: JSON.stringify(material),
    });
  }

  public async updateRawMaterial(id: string, material: Partial<RawMaterial>) {
    return this.request<RawMaterial>(`/api/raw-materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(material),
    });
  }

  public async deleteRawMaterial(id: string) {
    return this.request<{ success: boolean }>(`/api/raw-materials/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Suppliers ---
  public async getSuppliers() {
    return this.request<Supplier[]>('/api/suppliers');
  }

  public async createSupplier(supplier: Omit<Supplier, 'id'>) {
    return this.request<Supplier>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    });
  }

  public async updateSupplier(id: string, supplier: Partial<Supplier>) {
    return this.request<Supplier>(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplier),
    });
  }

  public async deleteSupplier(id: string) {
    return this.request<{ success: boolean }>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Categories ---
  public async getCategories() {
    return this.request<Category[]>('/api/categories');
  }

  public async createCategory(category: Omit<Category, 'id'>) {
    return this.request<Category>('/api/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  }

  public async updateCategory(id: string, category: Partial<Category>) {
    return this.request<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  }

  public async deleteCategory(id: string) {
    return this.request<{ success: boolean }>(`/api/categories/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Units ---
  public async getUnits() {
    return this.request<UnitOfMeasure[]>('/api/units');
  }

  public async createUnit(unit: Omit<UnitOfMeasure, 'id'>) {
    return this.request<UnitOfMeasure>('/api/units', {
      method: 'POST',
      body: JSON.stringify(unit),
    });
  }

  public async updateUnit(id: string, unit: Partial<UnitOfMeasure>) {
    return this.request<UnitOfMeasure>(`/api/units/${id}`, {
      method: 'PUT',
      body: JSON.stringify(unit),
    });
  }

  public async deleteUnit(id: string) {
    return this.request<{ success: boolean }>(`/api/units/${id}`, {
      method: 'DELETE',
    });
  }

  // --- BOMs ---
  public async getBoms() {
    return this.request<BillOfMaterial[]>('/api/boms');
  }

  public async createBom(bom: Omit<BillOfMaterial, 'id' | 'createdAt' | 'updatedAt'>) {
    return this.request<BillOfMaterial>('/api/boms', {
      method: 'POST',
      body: JSON.stringify(bom),
    });
  }

  public async updateBom(id: string, bom: Partial<BillOfMaterial>) {
    return this.request<BillOfMaterial>(`/api/boms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(bom),
    });
  }

  public async deleteBom(id: string) {
    return this.request<{ success: boolean }>(`/api/boms/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Production ---
  public async getProductionBatches() {
    return this.request<ProductionBatch[]>('/api/production/batches');
  }

  public async createProductionBatch(batch: Omit<ProductionBatch, 'id'>) {
    return this.request<ProductionBatch>('/api/production/batches', {
      method: 'POST',
      body: JSON.stringify(batch),
    });
  }

  public async updateProductionBatch(id: string, batch: Partial<ProductionBatch>) {
    return this.request<ProductionBatch>(`/api/production/batches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(batch),
    });
  }

  // --- Purchases & Inventory ---
  public async getPurchaseOrders() {
    return this.request<PurchaseOrder[]>('/api/purchases/orders');
  }

  public async createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>) {
    return this.request<PurchaseOrder>('/api/purchases/orders', {
      method: 'POST',
      body: JSON.stringify(po),
    });
  }

  public async updatePurchaseOrderStatus(id: string, status: PurchaseOrder['status']) {
    return this.request<PurchaseOrder>(`/api/purchases/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  public async getStockMovements() {
    return this.request<StockMovement[]>('/api/inventory/movements');
  }

  public async createStockMovement(movement: Omit<StockMovement, 'id'>) {
    return this.request<StockMovement>('/api/inventory/movements', {
      method: 'POST',
      body: JSON.stringify(movement),
    });
  }

  // --- Activity Logs & Settings ---
  public async getActivityLogs() {
    return this.request<ActivityLog[]>('/api/activity-logs');
  }

  public async logAction(action: string, module: string, details: string) {
    return this.request<{ success: boolean }>('/api/activity-logs', {
      method: 'POST',
      body: JSON.stringify({ action, module, details }),
    });
  }

  public async getCompanySettings() {
    return this.request<CompanySettings>('/api/settings/company');
  }

  public async updateCompanySettings(settings: Partial<CompanySettings>) {
    return this.request<CompanySettings>('/api/settings/company', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // --- System Backup & Restore ---
  public async exportDatabaseJson() {
    return this.request<any>('/api/system/export-json');
  }

  public async importDatabaseJson(data: any) {
    return this.request<{ success: boolean; message: string }>('/api/system/import-json', {
      method: 'POST',
      body: JSON.stringify({ data }),
    });
  }

  // --- Super Admin Portal (/api/admin/*) ---
  public async getAdminOverview() {
    return this.request<PlatformOverviewStats>('/api/admin/overview');
  }

  public async getAdminBusinesses() {
    return this.request<Business[]>('/api/admin/businesses');
  }

  public async createAdminBusiness(payload: {
    name: string;
    industry?: string;
    planId: string;
    ownerName: string;
    ownerEmail: string;
    ownerPhone?: string;
    status?: string;
  }) {
    return this.request<{ success: boolean; business: Business; owner: UserProfile; message: string }>('/api/admin/businesses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getAdminBusiness(id: string) {
    return this.request<{
      business: Business;
      subscription: any;
      users: UserProfile[];
      quotas: { products: number; rawMaterials: number; boms: number; users: number };
    }>(`/api/admin/businesses/${id}`);
  }

  public async updateAdminBusinessStatus(id: string, payload: { status: string; accessMode?: string; isReadOnly?: boolean }) {
    return this.request<{ success: boolean; business: Business }>(`/api/admin/businesses/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async updateAdminBusinessSubscription(id: string, payload: {
    planId?: string;
    status?: string;
    extendDays?: number;
    isReadOnly?: boolean;
    notes?: string;
  }) {
    return this.request<{ success: boolean; message: string }>(`/api/admin/businesses/${id}/subscription`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async suspendAdminBusiness(id: string, reason?: string) {
    return this.request<{ success: boolean; message: string; business: Business }>(`/api/admin/businesses/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async activateAdminBusiness(id: string) {
    return this.request<{ success: boolean; message: string; business: Business }>(`/api/admin/businesses/${id}/activate`, {
      method: 'POST',
    });
  }

  public async archiveAdminBusiness(id: string, confirmationCode: string) {
    return this.request<{ success: boolean; message: string; business: Business }>(`/api/admin/businesses/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ confirmationCode }),
    });
  }

  public async getAdminInvoices() {
    return this.request<any[]>('/api/admin/invoices');
  }

  public async getAdminPayments() {
    return this.request<any[]>('/api/admin/payments');
  }

  public async getAdminPlans() {
    return this.request<SaaSPlan[]>('/api/admin/plans');
  }

  public async createAdminPlan(plan: Partial<SaaSPlan>) {
    return this.request<{ success: boolean; id: string }>('/api/admin/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  public async updateAdminPlan(id: string, plan: Partial<SaaSPlan>) {
    return this.request<{ success: boolean; message: string }>(`/api/admin/plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(plan),
    });
  }

  public async getAdminSubscriptions() {
    return this.request<SaaSSubscription[]>('/api/admin/subscriptions');
  }

  public async getAdminAuditLogs() {
    return this.request<AdminAuditLog[]>('/api/admin/audit-logs');
  }

  public async adminResetUserPassword(userId: string, newPassword?: string) {
    return this.request<{ success: boolean; message: string }>('/api/admin/reset-user-password', {
      method: 'POST',
      body: JSON.stringify({ userId, newPassword }),
    });
  }

  // --- Business Subscription & Entitlement ---
  public async getCurrentSubscription() {
    return this.request<{
      subscription: any;
      usage: {
        users: { current: number; max: number };
        products: { current: number; max: number };
        rawMaterials: { current: number; max: number };
        boms: { current: number; max: number };
      };
    }>('/api/subscription/current');
  }

  public async inviteUser(email: string, role: UserProfile['role']) {
    return this.request<{ success: boolean; invitation: UserInvitation; message: string }>('/api/users/invite', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  public async getInvitations() {
    return this.request<UserInvitation[]>('/api/users/invitations');
  }

  public async getAdvancedProfitability() {
    return this.request<{ status: string; message: string; entitlement: string; plan: string }>('/api/analysis/advanced-profitability');
  }

  // --- Public & Customer Journey (Requirements 2, 7, 9, 10, 12, 14, 26, 28) ---
  public async getPublicPlans() {
    return this.request<Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      billingPeriod: string;
      trialDays: number;
      features: string[];
      limits: Record<string, number>;
    }>>('/api/public/plans');
  }

  public async registerCustomer(payload: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    businessName?: string;
    businessType?: string;
    phone?: string;
  }) {
    const res = await this.request<{
      success: boolean;
      token: string;
      user: UserProfile;
      business: Business;
      needsOnboarding: boolean;
      message: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async forgotPassword(email: string) {
    return this.request<{ success: boolean; message: string; token?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  public async resetPassword(token: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  public async setupBusinessProfile(payload: {
    name: string;
    ownerName?: string;
    businessType?: string;
    phone?: string;
    address?: string;
  }) {
    return this.request<{ success: boolean; business: Business; message: string }>('/api/onboarding/create-business', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getOnboardingStatus() {
    return this.request<{
      businessId: string;
      businessName: string;
      businessType: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
      currentStep: number;
      savedData: any;
      counts: {
        products: number;
        rawMaterials: number;
        boms: number;
        units: number;
      };
      firstValueReached: boolean;
    }>('/api/onboarding/status');
  }

  public async updateOnboardingProgress(step: number, status?: 'IN_PROGRESS' | 'COMPLETED', data?: any) {
    return this.request<{ success: boolean; step: number; status: string; message: string }>('/api/onboarding/progress', {
      method: 'PUT',
      body: JSON.stringify({ step, status, data }),
    });
  }

  public async seedSampleData() {
    return this.request<{
      success: boolean;
      message: string;
      counts: {
        rawMaterials: number;
        products: number;
        suppliers: number;
        boms: number;
      };
    }>('/api/onboarding/seed-sample-data', {
      method: 'POST',
    });
  }

  public async checkoutSubscription(payload: {
    planCode: string;
    billingCycle?: 'MONTHLY' | 'YEARLY';
    paymentMethod?: string;
  }) {
    return this.request<{
      success: boolean;
      message: string;
      invoice: any;
      subscription: {
        status: string;
        planCode: string;
        planName: string;
        endDate: string;
        isReadOnly: boolean;
      };
    }>('/api/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async getBillingInvoices() {
    return this.request<Array<{
      id: string;
      invoiceNumber: string;
      planId: string;
      planName: string;
      amount: number;
      currency: string;
      status: string;
      billingCycle: string;
      paymentMethod: string;
      paidAt: string;
      createdAt: string;
    }>>('/api/billing/invoices');
  }
}

export const api = new ApiService();
