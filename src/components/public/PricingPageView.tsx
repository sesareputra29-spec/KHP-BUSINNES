import React, { useState, useEffect } from 'react';
import { Check, X as XIcon, ArrowRight, ArrowLeft, Shield, Zap, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { formatRupiah } from '../../utils/calculator';

interface PricingPageViewProps {
  onNavigate: (route: string) => void;
}

export const PricingPageView: React.FC<PricingPageViewProps> = ({ onNavigate }) => {
  const { isAuthenticated, openUpgradeModal, activeSubscription } = useApp();
  const [plans, setPlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getPublicPlans()
      .then((data) => {
        setPlans(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const featureMatrix = [
    { key: 'HPP', label: 'Kalkulator HPP Dasar & Formula Biaya' },
    { key: 'BOM', label: 'Resep & Bill of Materials (BOM) Bertingkat' },
    { key: 'PRODUKSI', label: 'Surat Perintah Kerja (SPK) & Batch Produksi' },
    { key: 'INVENTORY', label: 'Kontrol Stok Bahan Baku & Minimum Stock Alert' },
    { key: 'SUPPLIER', label: 'Manajemen Data Supplier & Harga Beli' },
    { key: 'PURCHASE', label: 'Pencatatan Purchase Order (PO)' },
    { key: 'REPORT', label: 'Laporan Finansial Standar' },
    { key: 'EXPORT', label: 'Ekspor Data Laporan (Excel / CSV / JSON)' },
    { key: 'PROFITABILITY', label: 'Analisis Margin Kontribusi & Profitabilitas SKU' },
    { key: 'MULTI_USER', label: 'Multi-User & Hak Akses Berbasis Peran (RBAC)' },
    { key: 'ADVANCED_REPORT', label: 'Analisis Titik Impas (BEP) & Simulasi Sensitivitas' },
    { key: 'AUDIT_LOG', label: 'Pencatatan Riwayat Aktivitas & Log Audit' },
    { key: 'PELANGGAN', label: 'Manajemen Pelanggan & Multi-Cabang' },
    { key: 'API', label: 'Akses API Integrasi Eksternal' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white font-black text-sm flex items-center justify-center">
              A
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">ACRU HPP</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              onClick={() => onNavigate('/')}
              className="text-slate-600 hover:text-slate-950 transition cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda</span>
            </button>
            <button
              onClick={() => onNavigate('/login')}
              className="px-3 py-1.5 text-slate-700 hover:text-slate-950 transition cursor-pointer"
            >
              Masuk
            </button>
            <button
              onClick={() => onNavigate('/register')}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Mulai Gratis
            </button>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <div className="pt-14 pb-10 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>Paket Komersial Terjangkau</span>
          <span aria-hidden="true">·</span>
          <span>Dapat Dibatalkan Kapan Saja</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
          Pilihan Paket & Fitur Entitlement
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Seluruh paket mencakup masa percobaan (Trial) gratis 14 hari dengan kalkulasi HPP presisi tinggi.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="pt-6 flex items-center justify-center gap-3">
          <span className={`text-xs ${billingCycle === 'MONTHLY' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
            Tagihan Bulanan
          </span>
          <button
            type="button"
            onClick={() => setBillingCycle((prev) => (prev === 'MONTHLY' ? 'YEARLY' : 'MONTHLY'))}
            className="w-12 h-6 rounded-full bg-slate-900 p-1 flex items-center transition-colors cursor-pointer"
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                billingCycle === 'YEARLY' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs ${billingCycle === 'YEARLY' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
              Tagihan Tahunan
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              Hemat s/d 17%
            </span>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {plans.map((p) => {
            const isPro = p.code === 'PRO';
            const price = billingCycle === 'YEARLY' ? p.priceYearly : p.priceMonthly;

            return (
              <div
                key={p.id}
                className={`rounded-3xl p-5 sm:p-6 flex flex-col justify-between border-2 transition-all ${
                  isPro
                    ? 'border-slate-950 bg-white shadow-xl relative'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-950 text-white font-bold text-[9px] uppercase tracking-wider">
                    Paling Direkomendasikan
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 mt-1 min-h-[32px]">{p.description}</p>
                  </div>

                  <div>
                    <div className="text-2xl font-black font-mono text-slate-950">
                      {p.priceMonthly === 0 ? 'Gratis' : formatRupiah(price)}
                    </div>
                    {p.priceMonthly > 0 && (
                      <span className="text-[10px] text-slate-400">
                        per bisnis / {billingCycle === 'YEARLY' ? 'tahun' : 'bulan'}
                      </span>
                    )}
                  </div>

                  {/* Resource limits summary */}
                  <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="font-semibold text-[11px] text-slate-800 uppercase tracking-wider">
                      Batas Kuota Paket:
                    </div>
                    <div>• <strong>{p.limits?.maxUsers || 1}</strong> Pengguna Akun</div>
                    <div>• <strong>{p.limits?.maxProducts || 5}</strong> Produk (SKU)</div>
                    <div>• <strong>{p.limits?.maxRawMaterials || 10}</strong> Bahan Baku</div>
                    <div>• <strong>{p.limits?.maxBoms || 2}</strong> Formula Resep BOM</div>
                  </div>
                </div>

                <div className="pt-6">
                  {isAuthenticated ? (
                    <button
                      onClick={() => openUpgradeModal(p.code)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        activeSubscription?.planCode === p.code
                          ? 'bg-slate-100 text-slate-500 cursor-default'
                          : isPro
                          ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{activeSubscription?.planCode === p.code ? 'Paket Aktif Saat Ini' : `Pilih Paket ${p.name}`}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onNavigate('/register')}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        isPro
                          ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      {p.code === 'FREE' ? 'Daftar Gratis' : 'Mulai Trial 14 Hari'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table (Requirement 8) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">Tabel Perbandingan Fitur Lengkap</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar hak akses fitur resmi berbasis konfigurasi Feature Entitlement platform.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold">
                  <th className="py-3.5 px-6">Fitur & Modul</th>
                  {plans.map((p) => (
                    <th key={p.id} className="py-3.5 px-4 text-center w-28 sm:w-36">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {featureMatrix.map((f) => (
                  <tr key={f.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-6 font-medium text-slate-800">
                      {f.label}
                    </td>
                    {plans.map((p) => {
                      const hasFeature = p.features && (p.features as string[]).includes(f.key);
                      return (
                        <td key={p.id} className="py-3 px-4 text-center">
                          {hasFeature ? (
                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-300">
                              <XIcon className="w-3 h-3" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-slate-500">
            Butuh penyesuaian khusus atau volume produksi lebih dari 50 pengguna?
          </p>
          <button
            onClick={() => onNavigate('/register')}
            className="text-xs font-bold text-slate-900 hover:underline cursor-pointer"
          >
            Hubungi Tim Platform &raquo;
          </button>
        </div>
      </div>
    </div>
  );
};
