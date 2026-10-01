import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MenuId } from '../../types';
import {
  LayoutDashboard,
  Calculator,
  Database,
  Package,
  Layers,
  Factory,
  TrendingUp,
  Percent,
  Warehouse,
  ShoppingCart,
  PieChart,
  SlidersHorizontal,
  Scale,
  FileBarChart,
  Settings,
  User,
  Users,
  Shield,
  FileSpreadsheet,
  DownloadCloud,
  RotateCcw,
  History,
  BookOpen,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Tag,
  DollarSign,
  Building,
  Zap,
  Compass,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const {
    currentMenu,
    setCurrentMenu,
    rawMaterials,
    products,
    boms,
    batches,
    activeSubscription,
    subscriptionUsage,
    availableUsers,
    currentTenant,
    openUpgradeModal,
    setIsOnboardingOpen,
    setIsTourOpen,
  } = useApp();

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sec1: true,
    sec2: true,
    sec3: true,
    sec4: true,
    sec5: true,
    sec6: true,
    sec7: true,
    sec8: false,
  });

  const [isSubscriptionCardCollapsed, setIsSubscriptionCardCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_sub_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSubscriptionCollapse = () => {
    setIsSubscriptionCardCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_sub_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleSection = (sec: string) => {
    setExpandedSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const handleMenuClick = (menuId: MenuId) => {
    setCurrentMenu(menuId);
    if (onCloseMobile) onCloseMobile();
  };

  const lowStockCount = rawMaterials.filter((m) => m.currentStock <= m.minStock).length;
  const inProgressBatches = batches.filter((b) => b.status === 'Diproses').length;

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col h-screen border-r border-slate-200/90 shrink-0 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
      {/* Brand Header matching screenshot */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-white font-black text-sm flex items-center justify-center shadow-sm tracking-tighter">
            A
          </div>
          <div>
            <div className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>ACRU</span>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-lime-100 text-lime-800 border border-lime-200/80">
                HPP
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Enterprise Costing</div>
          </div>
        </div>
      </div>

      {/* Navigation Scrollable Area */}
      <nav data-tour="sidebar-nav" className="flex-1 overflow-y-auto p-3 space-y-3 text-xs font-medium">
        {/* ================= UTAMA ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec1')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>UTAMA</span>
            {expandedSections.sec1 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec1 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('1.1')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '1.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0 text-slate-700" />
                <span className="truncate">Dashboard</span>
              </button>
              <button
                onClick={() => handleMenuClick('1.2')}
                className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                  currentMenu === '1.2'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Calculator className="w-4 h-4 shrink-0 text-lime-600" />
                  <span className="truncate">Kalkulator HPP</span>
                </div>
                <span className="text-[9px] bg-lime-100 text-lime-800 px-1.5 py-0.5 rounded font-bold">
                  Live
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ================= MASTER DATA ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec2')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>MASTER DATA</span>
            {expandedSections.sec2 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec2 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('2.1')}
                className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                  currentMenu === '2.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Package className="w-4 h-4 shrink-0 text-slate-600" />
                  <span className="truncate">Produk</span>
                </div>
                <span className="text-[10px] bg-slate-900 text-white font-mono px-2 py-0.2 rounded-full font-bold">
                  {products.length}
                </span>
              </button>
              <button
                onClick={() => handleMenuClick('2.2')}
                className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                  currentMenu === '2.2'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Database className="w-4 h-4 shrink-0 text-slate-600" />
                  <span className="truncate">Bahan Baku</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{rawMaterials.length}</span>
              </button>
              <button
                onClick={() => handleMenuClick('2.3')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '2.3'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <Factory className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Supplier</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= PRODUKSI & HPP ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec3')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>PRODUKSI & HPP</span>
            {expandedSections.sec3 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec3 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('3.1')}
                className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                  currentMenu === '3.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Layers className="w-4 h-4 shrink-0 text-slate-600" />
                  <span className="truncate">BOM / Resep</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{boms.length}</span>
              </button>
              <button
                onClick={() => handleMenuClick('3.2')}
                className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                  currentMenu === '3.2'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Factory className="w-4 h-4 shrink-0 text-slate-600" />
                  <span className="truncate">Produksi</span>
                </div>
                {inProgressBatches > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.2 rounded-full">
                    {inProgressBatches} aktif
                  </span>
                )}
              </button>
              <button
                onClick={() => handleMenuClick('3.3')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '3.3'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <Calculator className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Perhitungan HPP</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= HARGA & PROFITABILITAS ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec4')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>HARGA & PROFITABILITAS</span>
            {expandedSections.sec4 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec4 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('4.1')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '4.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <Percent className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Harga & Margin</span>
              </button>
              <button
                onClick={() => handleMenuClick('4.2')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '4.2'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <TrendingUp className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Analisis Profitabilitas</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= INVENTORY & PEMBELIAN ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec5')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>INVENTORY & PEMBELIAN</span>
            {expandedSections.sec5 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec5 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('5.1')}
                className={`w-full flex items-center justify-between px-3 py-2 transition-all ${
                  currentMenu === '5.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Warehouse className="w-4 h-4 shrink-0 text-slate-600" />
                  <span className="truncate">Inventory</span>
                </div>
                {lowStockCount > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-semibold px-2 py-0.2 rounded-full">
                    {lowStockCount} alert
                  </span>
                )}
              </button>
              <button
                onClick={() => handleMenuClick('5.2')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '5.2'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <ShoppingCart className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Pembelian</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= ANALISIS & SIMULASI ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec6')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>ANALISIS & SIMULASI</span>
            {expandedSections.sec6 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec6 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('6.1')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '6.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <PieChart className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Analisis HPP</span>
              </button>
              <button
                onClick={() => handleMenuClick('6.2')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '6.2'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Simulasi</span>
              </button>
              <button
                onClick={() => handleMenuClick('6.3')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '6.3'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <Scale className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">BEP & Sensitivitas</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= LAPORAN ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec7')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>LAPORAN</span>
            {expandedSections.sec7 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec7 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('7.1')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 transition-all ${
                  currentMenu === '7.1'
                    ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold rounded-r-xl'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
                }`}
              >
                <FileBarChart className="w-4 h-4 shrink-0 text-slate-600" />
                <span className="truncate">Laporan Terpadu</span>
              </button>
            </div>
          )}
        </div>

        {/* ================= SISTEM ================= */}
        <div>
          <button
            onClick={() => toggleSection('sec8')}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-700 transition-colors"
          >
            <span>SISTEM</span>
            {expandedSections.sec8 ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.sec8 && (
            <div className="mt-1 space-y-0.5">
              <button
                onClick={() => handleMenuClick('8.1')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.1' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Profil Pengguna</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.2')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.2' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Manajemen Pengguna</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.3')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.3' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Role & Hak Akses</span>
              </button>

              {/* Menu Pengaturan Tunggal (Sub-menu dipindahkan ke halaman pengaturan) */}
              <button
                onClick={() => handleMenuClick('8.4.1')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu.startsWith('8.4') ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Pengaturan</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.5')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.5' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Import Data</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.6')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.6' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DownloadCloud className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Export Data</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.7')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.7' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Backup & Restore</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.8')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.8' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <History className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Log Aktivitas</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.9')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.9' ? 'border-l-4 border-slate-950 bg-slate-100/90 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Panduan</span>
              </button>

              <button
                onClick={() => handleMenuClick('8.10')}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${
                  currentMenu === '8.10' ? 'bg-rose-50 text-rose-700 font-bold' : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Logout</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Subscription Status & Quota Card */}
      <div className="p-3 border-t border-slate-100 bg-white">
        {(() => {
          const planCode = activeSubscription?.planCode || currentTenant?.plan || 'STARTER';
          const planName = activeSubscription?.planName || 'Starter UMKM';
          const subStatus = (activeSubscription?.status || 'ACTIVE').toUpperCase();
          const maxUsers = activeSubscription?.limits?.maxUsers || 5;
          const currentUsers = availableUsers.length;
          const maxProducts = activeSubscription?.limits?.maxProducts || 100;
          const currentProducts = products.length;
          const userRatio = currentUsers / maxUsers;
          const isWarning = userRatio >= 0.8 || currentProducts / maxProducts >= 0.8;

          const dateEndStr = activeSubscription?.endDate || activeSubscription?.trialEnd;
          const formattedEnd = dateEndStr ? new Date(dateEndStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '31 Des 2026';

          if (isSubscriptionCardCollapsed) {
            return (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  onClick={toggleSubscriptionCollapse}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 transition-all text-left cursor-pointer group shadow-2xs"
                  title="Tampilkan kartu informasi paket & langganan"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-5 h-5 rounded-md bg-slate-950 text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Zap className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 truncate">
                      {planCode}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        subStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : subStatus === 'TRIAL'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {subStatus === 'ACTIVE' ? 'Aktif' : subStatus === 'TRIAL' ? 'Trial' : 'Expired'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-slate-800 transition-colors">
                    <span className="text-[10px] font-semibold text-slate-500">Tampilkan</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </div>
                </button>

                <div className="px-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[110px]">{currentTenant.name}</span>
                  <span>{products.length}/{maxProducts} SKU</span>
                </div>
              </div>
            );
          }

          return (
            <div className="space-y-2 animate-in fade-in duration-200">
              <div className={`border rounded-2xl p-3 space-y-2.5 relative transition-all ${
                subStatus === 'EXPIRED'
                  ? 'bg-rose-50/70 border-rose-200'
                  : subStatus === 'TRIAL'
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-slate-50 border-slate-200/90'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-xs">
                      <Zap className="w-3 h-3 fill-white text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">Paket: {planCode}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      subStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : subStatus === 'TRIAL'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {subStatus === 'ACTIVE' ? 'Aktif' : subStatus === 'TRIAL' ? 'Masa Trial' : 'Expired'}
                    </span>
                    <button
                      onClick={toggleSubscriptionCollapse}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-md transition-all cursor-pointer"
                      title="Sembunyikan kartu ke bawah"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Berakhir:</span>
                    <span className="font-semibold text-slate-800">{formattedEnd}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Penggunaan User:</span>
                    <span className={`font-semibold ${userRatio >= 0.8 ? 'text-amber-600 font-bold' : 'text-slate-800'}`}>
                      {currentUsers} / {maxUsers} User
                    </span>
                  </div>
                </div>

                {/* Quota warning if approaching 80% */}
                {isWarning && subStatus !== 'EXPIRED' && (
                  <div className="text-[10px] bg-amber-100/80 text-amber-800 p-1.5 rounded-lg font-medium border border-amber-200 leading-tight">
                    ⚠️ Penggunaan Anda telah mencapai {Math.round(Math.max(userRatio, currentProducts / maxProducts) * 100)}% dari batas paket.
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => openUpgradeModal('PRO')}
                    className="w-full py-1.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-[11px] rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span>Tingkatkan ke PRO</span>
                  </button>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleMenuClick('8.4.6')}
                      className="py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[10px] rounded-lg transition-all text-center truncate cursor-pointer"
                    >
                      Detail Paket
                    </button>
                    <button
                      onClick={() => setIsOnboardingOpen(true)}
                      className="py-1 bg-slate-100 hover:bg-slate-200 text-indigo-700 font-semibold text-[10px] rounded-lg transition-all text-center truncate cursor-pointer"
                    >
                      Panduan Setup
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      handleMenuClick('1.1');
                      setIsTourOpen(true);
                    }}
                    className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[10px] rounded-lg transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Compass className="w-3 h-3 text-lime-600" />
                    <span>Mulai Tur Fitur Dashboard</span>
                  </button>
                </div>
              </div>

              <div className="px-1 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                  {currentTenant.name}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  {products.length} / {maxProducts} SKU
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </aside>
  );
};
