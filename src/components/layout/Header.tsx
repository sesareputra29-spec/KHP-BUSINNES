import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Plus,
  Bell,
  ChevronDown,
  Building2,
  ShieldCheck,
  LogOut,
  User,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sparkles,
  Zap,
  Compass,
} from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const {
    currentTenant,
    setCurrentTenantId,
    availableTenants,
    currentUser,
    setCurrentUser,
    availableUsers,
    setCurrentMenu,
    setIsQuickSearchOpen,
    setIsSuperAdminPortalOpen,
    rawMaterials,
    products,
    setIsOnboardingOpen,
    openUpgradeModal,
    setIsTourOpen,
  } = useApp();

  const [isTenantDropdownOpen, setIsTenantDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Check low stock count for alert badge
  const lowStockMaterials = rawMaterials.filter((m) => m.currentStock <= m.minStock);
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStock);
  const totalAlerts = lowStockMaterials.length + lowStockProducts.length;

  return (
    <header className="sticky top-0 z-30 bg-[#eceef2]/95 backdrop-blur-md px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4 select-none">
      {/* Left: Mobile hamburger & Search Pill matching screenshot */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50"
          >
            <Sliders className="w-4 h-4" />
          </button>
        )}

        {/* Tenant Switcher Dropdown (Minimalist) */}
        <div className="relative shrink-0" data-tour="tenant-selector">
          <button
            onClick={() => {
              setIsTenantDropdownOpen(!isTenantDropdownOpen);
              setIsUserDropdownOpen(false);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 transition-all text-left shadow-2xs cursor-pointer"
          >
            <div className="w-5 h-5 rounded-lg bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
              {currentTenant.logoText}
            </div>
            <span className="text-xs font-bold text-slate-800 hidden sm:inline truncate max-w-[120px]">
              {currentTenant.name}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Tenant Dropdown Menu */}
          {isTenantDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ganti Ruang Kerja (Tenant)
              </div>
              {availableTenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setCurrentTenantId(t.id);
                    setIsTenantDropdownOpen(false);
                  }}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                    t.id === currentTenant.id ? 'bg-slate-100 border-l-2 border-slate-900 font-bold' : ''
                  }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {t.logoText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{t.name}</div>
                    <div className="text-[10px] text-slate-400">{t.industry}</div>
                  </div>
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1.5 pt-1.5 px-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Multi-tenant Isolation</span>
                <span className="text-lime-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Aktif
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Global Pill Search Bar matching screenshot */}
        <div className="flex-1 min-w-[200px] hidden sm:block" data-tour="quick-search">
          <button
            onClick={() => setIsQuickSearchOpen(true)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-slate-400 bg-white hover:bg-slate-50 rounded-full border border-slate-200/90 hover:border-slate-300 transition-all text-left shadow-2xs cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-medium">Quick search...</span>
            </div>
            <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
              Ctrl + K
            </span>
          </button>
        </div>
      </div>

      {/* Right: Notification, Settings, User Pill, and "+ Add widget" button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsUserDropdownOpen(false);
              setIsTenantDropdownOpen(false);
            }}
            className="relative w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs"
            title="Pemberitahuan Sistem"
          >
            <Bell className="w-4 h-4" />
            {totalAlerts > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-in fade-in">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Pemberitahuan Sistem</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 rounded-full">
                  {totalAlerts} Alert
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-1.5 text-xs">
                {lowStockMaterials.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setCurrentMenu('5.1');
                      setIsNotifOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/70 border border-amber-200/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      Stok Bahan Baku Menipis
                    </div>
                    <div className="text-[11px] text-slate-700 mt-0.5">
                      {m.name}: sisa {m.currentStock.toLocaleString('id-ID')} {m.unit} (Min: {m.minStock.toLocaleString('id-ID')})
                    </div>
                  </div>
                ))}
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setCurrentMenu('5.1');
                      setIsNotifOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-rose-800 font-semibold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      Stok Produk Jadi Rendah
                    </div>
                    <div className="text-[11px] text-slate-700 mt-0.5">
                      {p.name}: sisa {p.currentStock} {p.unit}
                    </div>
                  </div>
                ))}
                <div className="p-2.5 rounded-xl bg-lime-50 text-[11px] text-lime-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                  Sistem HPP aktif dan sinkron real-time.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panduan Onboarding Icon Button */}
        <button
          onClick={() => setIsOnboardingOpen(true)}
          data-tour="onboarding-guide-btn"
          className="h-9 px-2.5 rounded-xl bg-white border border-slate-200/90 text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50/70 flex items-center gap-1.5 transition-all shadow-2xs font-semibold text-xs cursor-pointer"
          title="Panduan Onboarding Bisnis & Setup Awal"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden xl:inline">Panduan Setup</span>
        </button>

        {/* Tombol Walkthrough Interaktif Dashboard */}
        <button
          onClick={() => {
            setCurrentMenu('1.1');
            setIsTourOpen(true);
          }}
          className="h-9 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-all shadow-xs font-bold text-xs cursor-pointer"
          title="Mulai Tur Interaktif Fitur Dashboard (Walkthrough)"
        >
          <Compass className="w-3.5 h-3.5 text-lime-400" />
          <span className="hidden sm:inline">Tur Fitur</span>
        </button>

        {/* Settings Icon Button */}
        <button
          onClick={() => setCurrentMenu('8.4.1')}
          className="w-9 h-9 rounded-xl bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
          title="Pengaturan Sistem"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Profile Pill matching screenshot (Avatar + Name + Email) */}
        <div className="relative" data-tour="user-profile">
          <button
            onClick={() => {
              setIsUserDropdownOpen(!isUserDropdownOpen);
              setIsTenantDropdownOpen(false);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-slate-200"
            />
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser.name.split(',')[0]}
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-none">
                {currentUser.email}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* User Menu */}
          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                <div className="mt-1">
                  <span className="text-[10px] bg-slate-900 text-white font-semibold px-2 py-0.5 rounded-full">
                    {currentUser.role}
                  </span>
                </div>
              </div>

              {/* Quick Role Tester for SaaS */}
              <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Simulasi Peran (Role):
              </div>
              <div className="px-2 space-y-0.5">
                {availableUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setCurrentUser(u);
                      setIsUserDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                      u.id === currentUser.id ? 'bg-slate-100 text-slate-900 font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{u.name.split(',')[0]}</span>
                    <span className="text-[10px] text-slate-400">{u.role}</span>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 mt-2 pt-1">
                <button
                  onClick={() => {
                    openUpgradeModal('PRO');
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
                  <span>Tingkatkan Paket Langganan</span>
                </button>
                <button
                  onClick={() => {
                    setIsOnboardingOpen(true);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-indigo-700 hover:bg-indigo-50 font-medium transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Panduan Onboarding Bisnis</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentMenu('1.1');
                    setIsTourOpen(true);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-800 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
                >
                  <Compass className="w-3.5 h-3.5 text-slate-900" />
                  <span>Mulai Tur Fitur (Walkthrough)</span>
                </button>
                <button
                  onClick={() => {
                    setIsSuperAdminPortalOpen(true);
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 font-semibold transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Portal Super Admin (/admin)</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentMenu('8.1');
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Profil Pengguna</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentMenu('8.10');
                    setIsUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Keluar (Logout)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* "+ Add widget" / "+ Kalkulator HPP" Button matching screenshot */}
        <button
          onClick={() => setCurrentMenu('1.2')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-900 font-bold text-xs shadow-2xs transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add widget</span>
        </button>
      </div>
    </header>
  );
};
