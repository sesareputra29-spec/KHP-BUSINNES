import React from 'react';
import { useApp } from '../../context/AppContext';
import { MenuId } from '../../types';
import {
  Settings,
  Tag,
  Layers,
  Scale,
  Calculator,
  DollarSign,
  Building,
  Plus,
} from 'lucide-react';

interface SettingsSubNavProps {
  activeTab: MenuId;
  onTabChange: (tabId: MenuId) => void;
  onAddAction?: () => void;
  addActionLabel?: string;
}

export const SettingsSubNav: React.FC<SettingsSubNavProps> = ({
  activeTab,
  onTabChange,
  onAddAction,
  addActionLabel,
}) => {
  const { currentTenant, categories, units, activeSubscription } = useApp();

  const effectiveTab = activeTab === '8.4' ? '8.4.1' : activeTab;

  const tabs: Array<{
    id: MenuId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    badge?: string;
  }> = [
    {
      id: '8.4.1',
      label: 'Kategori Produk',
      icon: Tag,
      count: categories.filter((c) => c.type === 'PRODUCT').length,
    },
    {
      id: '8.4.2',
      label: 'Kategori Bahan Baku',
      icon: Layers,
      count: categories.filter((c) => c.type === 'MATERIAL').length,
    },
    {
      id: '8.4.3',
      label: 'Satuan Ukuran (UOM)',
      icon: Scale,
      count: units.length,
    },
    {
      id: '8.4.4',
      label: 'Pengaturan HPP',
      icon: Calculator,
    },
    {
      id: '8.4.5',
      label: 'Pengaturan Biaya',
      icon: DollarSign,
    },
    {
      id: '8.4.6',
      label: 'Perusahaan & Langganan',
      icon: Building,
      badge: activeSubscription?.planCode || currentTenant?.plan || 'TRIAL',
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Settings className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded-full border border-slate-200">
                Pengaturan Sistem
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {currentTenant.name}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">
              Pusat Konfigurasi & Master Parameter
            </h1>
            <p className="text-xs text-slate-500">
              Pilih menu pengaturan di bawah untuk mengelola master kategori, standar satuan ukuran, formula HPP, tarif biaya, dan identitas perusahaan.
            </p>
          </div>
        </div>

        {/* Optional Action Button (e.g. Tambah Kategori / Tambah Satuan) */}
        {onAddAction && addActionLabel && (
          <button
            onClick={onAddAction}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{addActionLabel}</span>
          </button>
        )}
      </div>

      {/* In-Page Sub-Menu Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pt-3 border-t border-slate-100 scrollbar-none">
        {tabs.map((tab) => {
          const isActive = effectiveTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-lime-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white font-semibold' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded uppercase ${
                    isActive ? 'bg-lime-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-700 font-semibold'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
