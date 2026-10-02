import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Lock,
  Unlock,
  KeyRound,
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  ChevronRight,
  Activity,
  Award,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { Business, SaaSPlan, SaaSSubscription, AdminAuditLog, PlatformOverviewStats } from '../../types';

const DEFAULT_FALLBACK_PLANS: SaaSPlan[] = [
  {
    id: 'plan_starter',
    code: 'STARTER',
    name: 'Starter UMKM',
    description: 'Cocok untuk usaha mikro & rintisan produksi mandiri.',
    priceMonthly: 99000,
    priceYearly: 990000,
    billingPeriod: 'MONTHLY',
    trialDays: 14,
    isActive: true,
    features: ['HPP', 'BOM', 'INVENTORY', 'EXPORT'],
    limits: { maxProducts: 25, maxRawMaterials: 75, maxBoms: 25, maxUsers: 3, maxBatchesMonthly: 50, maxStorageMb: 250 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_business_pro',
    code: 'PRO',
    name: 'Business Pro',
    description: 'Pilihan ideal untuk bisnis berkembang & manufaktur skala menengah.',
    priceMonthly: 249000,
    priceYearly: 2490000,
    billingPeriod: 'MONTHLY',
    trialDays: 14,
    isActive: true,
    features: ['HPP', 'BOM', 'PRODUKSI', 'INVENTORY', 'SUPPLIER', 'PELANGGAN', 'PURCHASE', 'PROFITABILITY', 'REPORT', 'EXPORT', 'MULTI_USER', 'AUDIT_LOG'],
    limits: { maxProducts: 100, maxRawMaterials: 500, maxBoms: 100, maxUsers: 10, maxBatchesMonthly: 500, maxStorageMb: 1024 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_enterprise',
    code: 'ENTERPRISE',
    name: 'Enterprise Industrial',
    description: 'Solusi komprehensif pabrikasi multi-lini & integrasi korporasi.',
    priceMonthly: 699000,
    priceYearly: 6990000,
    billingPeriod: 'MONTHLY',
    trialDays: 30,
    isActive: true,
    features: ['HPP', 'BOM', 'PRODUKSI', 'INVENTORY', 'SUPPLIER', 'PELANGGAN', 'PURCHASE', 'PROFITABILITY', 'REPORT', 'EXPORT', 'MULTI_USER', 'ADVANCED_REPORT', 'API', 'AUDIT_LOG'],
    limits: { maxProducts: 99999, maxRawMaterials: 99999, maxBoms: 99999, maxUsers: 99999, maxBatchesMonthly: 99999, maxStorageMb: 10240 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'plan_free',
    code: 'FREE',
    name: 'Free Tier',
    description: 'Paket gratis untuk eksplorasi awal kalkulator HPP UMKM.',
    priceMonthly: 0,
    priceYearly: 0,
    billingPeriod: 'MONTHLY',
    trialDays: 0,
    isActive: true,
    features: ['HPP', 'BOM'],
    limits: { maxProducts: 5, maxRawMaterials: 15, maxBoms: 5, maxUsers: 1, maxBatchesMonthly: 10, maxStorageMb: 50 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SuperAdminDashboard: React.FC = () => {
  const { authSession, logout, setIsSuperAdminPortalOpen, showToast, setCurrentTenantId } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'businesses' | 'plans' | 'subscriptions' | 'invoices' | 'audit_logs'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Sync token from AppContext authSession into ApiService
  useEffect(() => {
    if (authSession?.token) {
      api.setToken(authSession.token);
    }
  }, [authSession?.token]);

  // Data states
  const [overview, setOverview] = useState<PlatformOverviewStats | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<SaaSPlan[]>(DEFAULT_FALLBACK_PLANS);
  const [subscriptions, setSubscriptions] = useState<SaaSSubscription[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isCreateBizModalOpen, setIsCreateBizModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaaSPlan | null>(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  // Form states for Create Business
  const [newBizForm, setNewBizForm] = useState({
    name: '',
    industry: 'Makanan & Minuman (F&B)',
    planId: 'plan_starter',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    status: 'ACTIVE',
  });

  const loadAllAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ov, bizList, planList, subList, logs, invList] = await Promise.all([
        api.getAdminOverview().catch(() => null),
        api.getAdminBusinesses().catch(() => []),
        api.getAdminPlans()
          .catch(async () => {
            const pub = await api.getPublicPlans();
            return pub.map((p) => ({
              ...p,
              isActive: true,
              billingPeriod: (p.billingPeriod === 'YEARLY' ? 'YEARLY' : 'MONTHLY') as 'MONTHLY' | 'YEARLY',
              features: p.features as any,
              limits: p.limits as any,
            }));
          })
          .catch(() => DEFAULT_FALLBACK_PLANS),
        api.getAdminSubscriptions().catch(() => []),
        api.getAdminAuditLogs().catch(() => []),
        api.getAdminInvoices().catch(() => []),
      ]);

      if (ov) setOverview(ov);
      setBusinesses(bizList);
      if (planList && planList.length > 0) {
        setPlans(planList);
      } else {
        setPlans(DEFAULT_FALLBACK_PLANS);
      }
      setSubscriptions(subList);
      setAuditLogs(logs);
      setInvoices(invList);
    } catch (err: any) {
      showToast('Gagal Memuat Data', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  // Actions
  const handleUpdateBusinessStatus = async (id: string, status: string, accessMode = 'ACTIVE') => {
    try {
      await api.updateAdminBusinessStatus(id, { status, accessMode, isReadOnly: status === 'EXPIRED' });
      showToast('Status Bisnis Diperbarui', `Bisnis ID ${id} diubah menjadi ${status}`, 'success');
      loadAllAdminData();
      if (selectedBusiness && selectedBusiness.id === id) {
        setSelectedBusiness((prev: any) => ({ ...prev, status }));
      }
    } catch (err: any) {
      showToast('Gagal Update Status', err.message, 'error');
    }
  };

  const handleSuspendBusiness = async (id: string, name: string) => {
    const reason = window.prompt(`Alasan penangguhan (suspend) untuk ${name}:`, 'Pelanggaran ketentuan atau permohonan admin');
    if (reason === null) return;
    try {
      const res = await api.suspendAdminBusiness(id, reason);
      showToast('Bisnis Ditangguhkan', res.message, 'success');
      loadAllAdminData();
      if (isDetailsModalOpen) {
        const refreshed = await api.getAdminBusiness(id);
        setSelectedBusiness(refreshed);
      }
    } catch (err: any) {
      showToast('Gagal Menangguhkan', err.message, 'error');
    }
  };

  const handleActivateBusiness = async (id: string, name: string) => {
    if (!window.confirm(`Aktifkan kembali akses penuh untuk bisnis ${name}?`)) return;
    try {
      const res = await api.activateAdminBusiness(id);
      showToast('Bisnis Diaktifkan', res.message, 'success');
      loadAllAdminData();
      if (isDetailsModalOpen) {
        const refreshed = await api.getAdminBusiness(id);
        setSelectedBusiness(refreshed);
      }
    } catch (err: any) {
      showToast('Gagal Mengaktifkan', err.message, 'error');
    }
  };

  const handleArchiveBusiness = async (id: string, name: string) => {
    const cleanCode = `ARCHIVE-${name.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
    const code = window.prompt(`PERINGATAN: Pengarsipan akan menonaktifkan akun secara aman tanpa menghapus riwayat audit.\n\nKetik "${cleanCode}" untuk konfirmasi:`);
    if (!code) return;
    try {
      const res = await api.archiveAdminBusiness(id, code);
      showToast('Bisnis Diarsipkan', res.message, 'success');
      loadAllAdminData();
      setIsDetailsModalOpen(false);
    } catch (err: any) {
      showToast('Gagal Mengarsipkan', err.message, 'error');
    }
  };

  const handleResetUserPassword = async (userId: string, userName: string) => {
    const newPassword = window.prompt(`Masukkan password baru untuk ${userName} (minimal 8 karakter):`, 'Admin123!@#');
    if (!newPassword) return;
    try {
      const res = await api.adminResetUserPassword(userId, newPassword);
      showToast('Password Berhasil Direset', res.message, 'success');
    } catch (err: any) {
      showToast('Gagal Reset Password', err.message, 'error');
    }
  };

  const handleExtendTrial = async (bizId: string, days: number) => {
    try {
      await api.updateAdminBusinessSubscription(bizId, { extendDays: days, status: 'TRIAL', isReadOnly: false });
      showToast('Masa Trial Diperpanjang', `Berhasil menambah ${days} hari trial.`, 'success');
      loadAllAdminData();
      if (isDetailsModalOpen) {
        const refreshed = await api.getAdminBusiness(bizId);
        setSelectedBusiness(refreshed);
      }
    } catch (err: any) {
      showToast('Gagal Perpanjang Trial', err.message, 'error');
    }
  };

  const handleChangePlan = async (bizId: string, planId: string) => {
    try {
      await api.updateAdminBusinessSubscription(bizId, { planId, status: 'ACTIVE', isReadOnly: false });
      showToast('Paket Berhasil Diubah', 'Paket bisnis telah diperbarui.', 'success');
      loadAllAdminData();
      if (isDetailsModalOpen) {
        const refreshed = await api.getAdminBusiness(bizId);
        setSelectedBusiness(refreshed);
      }
    } catch (err: any) {
      showToast('Gagal Ganti Paket', err.message, 'error');
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAdminBusiness(newBizForm);
      showToast('Bisnis Berhasil Dibuat', res.message, 'success');
      setIsCreateBizModalOpen(false);
      setNewBizForm({
        name: '',
        industry: 'Makanan & Minuman (F&B)',
        planId: 'plan_starter',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        status: 'ACTIVE',
      });
      loadAllAdminData();
    } catch (err: any) {
      showToast('Gagal Membuat Bisnis', err.message, 'error');
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      await api.updateAdminPlan(editingPlan.id, editingPlan);
      showToast('Paket Diperbarui', `Konfigurasi paket ${editingPlan.name} berhasil disimpan.`, 'success');
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      loadAllAdminData();
    } catch (err: any) {
      showToast('Gagal Menyimpan Paket', err.message, 'error');
    }
  };

  const handleOpenDetails = async (biz: Business) => {
    try {
      const detail = await api.getAdminBusiness(biz.id);
      setSelectedBusiness(detail);
      setIsDetailsModalOpen(true);
    } catch (err: any) {
      showToast('Gagal Membuka Detail', err.message, 'error');
    }
  };

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Admin Navigation Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-bold tracking-wider">
            SA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">Kalkulator HPP SaaS</span>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Super Admin Platform
              </span>
            </div>
            <p className="text-xs text-slate-400">Pusat Kendali Multi-Tenant, Paket, Trial, dan Feature Entitlement</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAllAdminData()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            onClick={() => {
              // Switch to tenant-1 for standard business preview
              setCurrentTenantId('tenant-1');
              setIsSuperAdminPortalOpen(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Aplikasi Bisnis</span>
          </button>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-lg font-medium transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Nav */}
        <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col p-4 gap-1.5 shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Menu Platform
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard Platform</span>
          </button>

          <button
            onClick={() => setActiveTab('businesses')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'businesses'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Manajemen Bisnis</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {businesses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'plans'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Paket & Entitlement</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {plans.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'subscriptions'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Daftar Subscription</span>
          </button>

          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'audit_logs'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Audit Log Platform</span>
          </button>

          <div className="mt-auto pt-4 border-t border-slate-800/80">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Super Admin Session</span>
              </div>
              <p>Platform Level Access</p>
              <p className="text-[11px] text-slate-500 mt-0.5">superadmin@hppsaas.com</p>
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 bg-slate-900 overflow-y-auto p-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Platform Overview</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Ringkasan status tenant, siklus langganan, dan masa percobaan trial seluruh bisnis.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Bisnis</span>
                    <Building2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {overview?.totalBusinesses || businesses.length}
                  </div>
                  <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold">{overview?.activeBusinesses || 0} Aktif</span>
                    <span>•</span>
                    <span className="text-amber-400 font-semibold">{overview?.trialBusinesses || 0} Trial</span>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Trial Aktif</span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-amber-400">
                    {overview?.trialBusinesses || 0}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {overview?.trialsEndingSoon ? (
                      <span className="text-rose-400 font-medium">⚠️ {overview.trialsEndingSoon} trial berakhir ≤ 7 hari</span>
                    ) : (
                      'Semua masa trial berjalan aman'
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Langganan Aktif</span>
                    <Award className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-emerald-400">
                    {overview?.activeSubscriptions || 0}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    {overview?.subscriptionsEndingSoon
                      ? `${overview.subscriptionsEndingSoon} subscription berakhir segera`
                      : 'Bisnis berlangganan berjalan lancar'}
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl shadow-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Pengguna</span>
                    <Users className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-white">
                    {overview?.totalUsers || 0}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">
                    Tersebar di seluruh tenant platform
                  </div>
                </div>
              </div>

              {/* Alert Banner for Expiring Trials if any */}
              {overview && overview.trialsEndingSoon > 0 && (
                <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl flex items-start gap-3 text-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Peringatan: Terdapat Masa Trial Yang Akan Berakhir</h4>
                    <p className="text-xs text-amber-300/80 mt-0.5">
                      Terdapat {overview.trialsEndingSoon} bisnis yang masa trial-nya akan berakhir dalam 7 hari ke depan. Anda dapat memperpanjang masa trial atau mengonfirmasi aktivasi paket langganan.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Business Overview Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-base text-white">Daftar Tenant Terdaftar</h3>
                  <button
                    onClick={() => setActiveTab('businesses')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    <span>Lihat Semua ({businesses.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {businesses.slice(0, 5).map((biz) => (
                    <div key={biz.id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-900/50 transition">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 text-indigo-400 font-bold flex items-center justify-center border border-slate-700">
                          {biz.code || biz.logoText || 'BIZ'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{biz.name}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                biz.status?.toUpperCase() === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : biz.status?.toUpperCase() === 'TRIAL'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {biz.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {biz.industry} • Paket: <span className="text-slate-300 font-medium">{biz.plan}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenDetails(biz)}
                          className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                        >
                          Kelola Bisnis
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESSES MANAGEMENT */}
          {activeTab === 'businesses' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">Manajemen Bisnis / Tenant</h1>
                  <p className="text-sm text-slate-400 mt-1">
                    Kontrol akses, status akun, aktivasi paket, dan perpanjangan masa trial bisnis.
                  </p>
                </div>

                <button
                  onClick={() => setIsCreateBizModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition self-start"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Bisnis Baru</span>
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama bisnis, email pemilik, atau ID..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">Bisnis & ID</th>
                        <th className="px-4 py-3.5">Industri</th>
                        <th className="px-4 py-3.5">Paket Aktif</th>
                        <th className="px-4 py-3.5">Status Akses</th>
                        <th className="px-4 py-3.5 text-center">User / SKU</th>
                        <th className="px-5 py-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {filteredBusinesses.map((biz) => {
                        const statusUpper = (biz.status || 'ACTIVE').toUpperCase();
                        return (
                          <tr key={biz.id} className="hover:bg-slate-900/40 transition">
                            <td className="px-5 py-4">
                              <div className="font-semibold text-white">{biz.name}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{biz.id}</div>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-400">{biz.industry}</td>
                            <td className="px-4 py-4">
                              <span className="font-medium text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-0.5 rounded-md text-xs">
                                {biz.plan}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                  statusUpper === 'ACTIVE'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : statusUpper === 'TRIAL'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : statusUpper === 'SUSPENDED'
                                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {statusUpper}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-xs text-center text-slate-400">
                              <span className="text-slate-200 font-semibold">{biz.userCount || 1}</span> users •{' '}
                              <span className="text-slate-200 font-semibold">{biz.productCount || 0}</span> SKU
                            </td>
                            <td className="px-5 py-4 text-right space-x-2">
                              <button
                                onClick={() => handleOpenDetails(biz)}
                                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
                              >
                                Detail & Kontrol
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLANS & FEATURE ENTITLEMENTS */}
          {activeTab === 'plans' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Paket & Feature Entitlement</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Atur hak akses fitur, batas kuota (limit), dan harga langganan yang berlaku di seluruh platform.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-slate-950 border rounded-2xl p-6 flex flex-col justify-between ${
                      p.code === 'PRO' ? 'border-indigo-500/60 shadow-lg shadow-indigo-500/10' : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          {p.code}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            p.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.description}</p>

                      <div className="mt-4 pt-4 border-t border-slate-800/80">
                        <div className="text-2xl font-extrabold text-white">
                          Rp {Number(p.priceMonthly).toLocaleString('id-ID')}
                          <span className="text-xs font-normal text-slate-400"> / bulan</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Trial: <span className="text-slate-300 font-medium">{p.trialDays} hari</span>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Limit & Kuota
                        </div>
                        <div className="text-xs text-slate-300 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Maks. Pengguna:</span>
                            <span className="font-semibold">{p.limits?.maxUsers} user</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Maks. Produk (SKU):</span>
                            <span className="font-semibold">{p.limits?.maxProducts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Maks. Bahan Baku:</span>
                            <span className="font-semibold">{p.limits?.maxRawMaterials}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Maks. Formula BOM:</span>
                            <span className="font-semibold">{p.limits?.maxBoms}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Fitur Tersedia ({p.features?.length || 0})
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {p.features?.map((f) => (
                            <span
                              key={f}
                              className="text-[11px] bg-slate-900 border border-slate-700/60 px-2 py-0.5 rounded text-slate-300"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setEditingPlan(p);
                          setIsPlanModalOpen(true);
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
                      >
                        Edit Konfigurasi Paket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SUBSCRIPTIONS */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Subscription Aktif</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Seluruh siklus langganan, masa trial, dan tanggal kadaluwarsa per bisnis di platform.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-5 py-3.5">Bisnis</th>
                        <th className="px-4 py-3.5">Paket</th>
                        <th className="px-4 py-3.5">Status</th>
                        <th className="px-4 py-3.5">Siklus</th>
                        <th className="px-4 py-3.5">Tanggal Mulai</th>
                        <th className="px-4 py-3.5">Tanggal Berakhir</th>
                        <th className="px-5 py-3.5 text-right">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {subscriptions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-slate-900/40 transition">
                          <td className="px-5 py-4 font-semibold text-white">{s.business_name || s.businessId}</td>
                          <td className="px-4 py-4">
                            <span className="text-indigo-400 font-semibold text-xs">{s.plan_name || s.planId}</span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                s.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : s.status === 'TRIAL'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-400">{s.billing_cycle || s.billingCycle}</td>
                          <td className="px-4 py-4 text-xs text-slate-400">
                            {s.start_date ? s.start_date.substring(0, 10) : '-'}
                          </td>
                          <td className="px-4 py-4 text-xs font-medium text-slate-300">
                            {s.end_date ? s.end_date.substring(0, 10) : '-'}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {s.is_read_only ? (
                              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded border border-amber-500/30">
                                Read-Only
                              </span>
                            ) : (
                              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                                Full Access
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Audit Log Super Admin</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Rekam jejak setiap aksi administratif yang dilakukan oleh Super Admin di tingkat platform.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="divide-y divide-slate-800/80">
                  {auditLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Belum ada aktivitas audit Super Admin yang tercatat.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="p-4 px-6 flex items-start gap-4 hover:bg-slate-900/40 transition">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 shrink-0 mt-0.5">
                          <Activity className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white">{log.actorName}</span>
                            <span className="text-xs px-2 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-mono">
                              {log.actorRole}
                            </span>
                            <span className="text-xs text-slate-500 ml-auto font-mono">
                              {log.timestamp.replace('T', ' ').substring(0, 19)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            Aksi: <span className="font-semibold text-indigo-300">{log.action}</span> • Target: {log.targetType} ({log.targetId})
                          </div>
                          {log.metadata && (
                            <pre className="mt-2 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 text-slate-400 overflow-x-auto">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: DETAIL & KONTROL BISNIS */}
      {isDetailsModalOpen && selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedBusiness.business?.name || 'Detail Bisnis'}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {selectedBusiness.business?.id}</p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Control */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status Akun & Akses
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleUpdateBusinessStatus(selectedBusiness.business.id, 'ACTIVE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedBusiness.business?.status === 'ACTIVE'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Set ACTIVE
                </button>
                <button
                  onClick={() => handleUpdateBusinessStatus(selectedBusiness.business.id, 'TRIAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedBusiness.business?.status === 'TRIAL'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Set TRIAL
                </button>
                <button
                  onClick={() => handleUpdateBusinessStatus(selectedBusiness.business.id, 'SUSPENDED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedBusiness.business?.status === 'SUSPENDED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Suspend Bisnis
                </button>
                <button
                  onClick={() => handleUpdateBusinessStatus(selectedBusiness.business.id, 'EXPIRED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedBusiness.business?.status === 'EXPIRED'
                      ? 'bg-slate-700 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Set EXPIRED (Read-Only)
                </button>
              </div>
            </div>

            {/* Subscription & Plan Settings */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Paket & Masa Trial
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Pilih Paket:</span>
                  <select
                    value={selectedBusiness.subscription?.planId || 'plan_starter'}
                    onChange={(e) => handleChangePlan(selectedBusiness.business.id, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="text-slate-400 block mb-1">Perpanjang Trial:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExtendTrial(selectedBusiness.business.id, 7)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex-1 transition"
                    >
                      +7 Hari
                    </button>
                    <button
                      onClick={() => handleExtendTrial(selectedBusiness.business.id, 14)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex-1 transition"
                    >
                      +14 Hari
                    </button>
                    <button
                      onClick={() => handleExtendTrial(selectedBusiness.business.id, 30)}
                      className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex-1 transition"
                    >
                      +30 Hari
                    </button>
                  </div>
                </div>
              </div>

              {selectedBusiness.subscription && (
                <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                  <span>Masa Berlaku Selesai: <strong className="text-slate-200">{selectedBusiness.subscription.endDate?.substring(0, 10) || '-'}</strong></span>
                  <span>Trial Berakhir: <strong className="text-slate-200">{selectedBusiness.subscription.trialEnd?.substring(0, 10) || '-'}</strong></span>
                </div>
              )}
            </div>

            {/* Quota Usage */}
            {selectedBusiness.quotas && (
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Penggunaan Sumber Daya
                </div>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Pengguna</div>
                    <div className="text-base font-bold text-white mt-1">{selectedBusiness.quotas.users}</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Produk</div>
                    <div className="text-base font-bold text-white mt-1">{selectedBusiness.quotas.products}</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">Bahan Baku</div>
                    <div className="text-base font-bold text-white mt-1">{selectedBusiness.quotas.rawMaterials}</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-slate-400">BOM Resep</div>
                    <div className="text-base font-bold text-white mt-1">{selectedBusiness.quotas.boms}</div>
                  </div>
                </div>
              </div>
            )}

            {/* User List & Password Reset */}
            {selectedBusiness.users && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Daftar Pengguna Bisnis ({selectedBusiness.users.length})
                </div>
                <div className="divide-y divide-slate-800/80 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                  {selectedBusiness.users.map((u: any) => (
                    <div key={u.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-900/40">
                      <div>
                        <div className="font-semibold text-white flex items-center gap-2">
                          <span>{u.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">{u.email}</div>
                      </div>
                      <button
                        onClick={() => handleResetUserPassword(u.id, u.name)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 text-[11px] transition"
                        title="Reset Password Akun"
                      >
                        <KeyRound className="w-3 h-3 text-amber-400" />
                        <span>Reset Sandi</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoices & Payment History */}
            {selectedBusiness.invoices && selectedBusiness.invoices.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Riwayat Tagihan & Pembayaran ({selectedBusiness.invoices.length})
                </div>
                <div className="divide-y divide-slate-800/80 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-36 overflow-y-auto">
                  {selectedBusiness.invoices.map((inv: any) => (
                    <div key={inv.id} className="p-2.5 px-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-medium text-slate-200">{inv.invoiceNumber}</span>
                        <span className="text-slate-500 ml-2">({inv.planName})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-white">Rp {Number(inv.amount).toLocaleString('id-ID')}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Last Activity Section */}
            {selectedBusiness.recentActivities && selectedBusiness.recentActivities.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Aktivitas Terakhir Tenant
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  {selectedBusiness.recentActivities.slice(0, 3).map((act: any, idx: number) => (
                    <div key={act.id || idx} className="text-xs flex items-start justify-between border-b border-slate-900 pb-1.5 last:border-0 last:pb-0">
                      <div>
                        <span className="font-semibold text-slate-200">{act.action || act.type}</span>
                        <p className="text-slate-400 text-[11px] mt-0.5">{act.details || act.module}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {(act.timestamp || '').replace('T', ' ').substring(0, 16)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Danger Zone: Safe Archiving */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <button
                onClick={() => handleArchiveBusiness(selectedBusiness.business.id, selectedBusiness.business.name)}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-xl text-xs font-medium transition"
              >
                Arsipkan Bisnis Ini
              </button>

              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH BISNIS BARU */}
      {isCreateBizModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Tambah Bisnis Baru</h3>
              <button onClick={() => setIsCreateBizModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nama Bisnis *</label>
                <input
                  type="text"
                  required
                  value={newBizForm.name}
                  onChange={(e) => setNewBizForm({ ...newBizForm, name: e.target.value })}
                  placeholder="Contoh: PT Kencana Food Industri"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Bidang Industri</label>
                  <input
                    type="text"
                    value={newBizForm.industry}
                    onChange={(e) => setNewBizForm({ ...newBizForm, industry: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Pilih Paket Awal</label>
                  <select
                    value={newBizForm.planId}
                    onChange={(e) => setNewBizForm({ ...newBizForm, planId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-slate-400 font-semibold mb-2">Akun Pemilik (Owner)</div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Nama Pemilik *</label>
                    <input
                      type="text"
                      required
                      value={newBizForm.ownerName}
                      onChange={(e) => setNewBizForm({ ...newBizForm, ownerName: e.target.value })}
                      placeholder="Nama Lengkap"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Email Pemilik *</label>
                      <input
                        type="email"
                        required
                        value={newBizForm.ownerEmail}
                        onChange={(e) => setNewBizForm({ ...newBizForm, ownerEmail: e.target.value })}
                        placeholder="owner@bisnis.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">No. Telepon / WA</label>
                      <input
                        type="text"
                        value={newBizForm.ownerPhone}
                        onChange={(e) => setNewBizForm({ ...newBizForm, ownerPhone: e.target.value })}
                        placeholder="0812-xxxx-xxxx"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    Password default pemilik adalah: <strong>Admin123!</strong> (Dapat diubah setelah login pertama).
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBizModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition font-semibold"
                >
                  Simpan & Buat Bisnis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT KONFIGURASI PAKET */}
      {isPlanModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Edit Konfigurasi Paket: {editingPlan.name}</h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nama Paket</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Hari Trial Default</label>
                  <input
                    type="number"
                    value={editingPlan.trialDays}
                    onChange={(e) => setEditingPlan({ ...editingPlan, trialDays: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Harga Bulanan (IDR)</label>
                  <input
                    type="number"
                    value={editingPlan.priceMonthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceMonthly: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Harga Tahunan (IDR)</label>
                  <input
                    type="number"
                    value={editingPlan.priceYearly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, priceYearly: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>
              </div>

              {/* Numerical limits */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">Batas Kuota (Limits)</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-slate-400 block mb-0.5">Maks Users</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.maxUsers || 1}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        limits: { ...editingPlan.limits, maxUsers: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Maks Produk (SKU)</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.maxProducts || 50}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        limits: { ...editingPlan.limits, maxProducts: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Maks Bahan Baku</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.maxRawMaterials || 20}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        limits: { ...editingPlan.limits, maxRawMaterials: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Maks Formula BOM</label>
                    <input
                      type="number"
                      value={editingPlan.limits?.maxBoms || 10}
                      onChange={(e) => setEditingPlan({
                        ...editingPlan,
                        limits: { ...editingPlan.limits, maxBoms: Number(e.target.value) }
                      })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Entitlements checkboxes */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">Feature Entitlements</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
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
                  ].map((feat) => {
                    const isChecked = editingPlan.features?.includes(feat as any);
                    return (
                      <label key={feat} className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextFeats = [...(editingPlan.features || [])];
                            if (e.target.checked) {
                              if (!nextFeats.includes(feat as any)) nextFeats.push(feat as any);
                            } else {
                              nextFeats = nextFeats.filter((f) => f !== feat);
                            }
                            setEditingPlan({ ...editingPlan, features: nextFeats });
                          }}
                          className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0"
                        />
                        <span>{feat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 transition font-semibold"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
