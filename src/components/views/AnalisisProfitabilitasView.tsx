import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatPercent } from '../../utils/calculator';
import {
  TrendingUp,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowUpRight,
  Filter,
  Layers,
  CheckCircle2,
} from 'lucide-react';

export const AnalisisProfitabilitasView: React.FC = () => {
  const { products, setCurrentMenu } = useApp();
  const [filterType, setFilterType] = useState<'ALL' | 'HEALTHY' | 'WARNING'>('ALL');

  // Compute metrics for each product
  const productProfitability = products.map((p) => {
    const nominalProfit = p.sellingPrice - p.estimatedHpp;
    const marginPct = p.sellingPrice > 0 ? (nominalProfit / p.sellingPrice) * 100 : 0;
    const isBelowTarget = marginPct < p.targetMarginPct;
    const isCritical = marginPct < 25;

    let categoryClass = 'Star';
    if (marginPct >= 45) categoryClass = 'Star (Margin Tinggi)';
    else if (marginPct >= 35) categoryClass = 'Cash Cow (Stabil)';
    else if (marginPct >= 20) categoryClass = 'Perlu Optimasi';
    else categoryClass = 'Kritis / Rugi Tipis';

    return {
      ...p,
      nominalProfit,
      marginPct,
      isBelowTarget,
      isCritical,
      categoryClass,
    };
  });

  // Sort descending by nominal profit
  const sorted = [...productProfitability].sort((a, b) => b.marginPct - a.marginPct);

  const filtered = sorted.filter((p) => {
    if (filterType === 'HEALTHY') return !p.isBelowTarget;
    if (filterType === 'WARNING') return p.isBelowTarget;
    return true;
  });

  const warningCount = sorted.filter((p) => p.isBelowTarget).length;
  const bestProduct = sorted[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              4.2 Analisis Profitabilitas
            </span>
            <span className="text-xs text-slate-500 font-mono">Matriks Margin Kontribusi</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Evaluasi Margin & Profitabilitas Portofolio Produk
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identifikasi produk dengan margin tertinggi (Star), produk penopang arus kas (Cash Cow), dan peringatan dini produk berisiko rugi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {warningCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>{warningCount} Produk Di Bawah Target</span>
            </div>
          )}
        </div>
      </div>

      {/* Top Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {bestProduct && (
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-5 rounded-2xl border border-emerald-800 shadow-md">
            <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Produk Margin Tertinggi
              </span>
              <span>Star Item</span>
            </div>
            <div className="text-base font-bold text-white mt-2 truncate">
              {bestProduct.name}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-emerald-300">
                {formatPercent(bestProduct.marginPct)}
              </span>
              <span className="text-xs text-emerald-200 font-mono">
                (+{formatRupiah(bestProduct.nominalProfit)} / unit)
              </span>
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Kesehatan Portofolio</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {sorted.length - warningCount} / {sorted.length}
            </span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Memenuhi Target
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            Produk dengan margin penjualan di atas standar target perusahaan
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Tindakan Rekomendasi</span>
          <div className="mt-2 text-xs text-slate-700 leading-relaxed font-medium">
            {warningCount > 0 ? (
              <span>
                Lakukan rekayasa formula (Value Engineering) pada resep atau naikkan harga jual eceran pada produk dengan label merah.
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Semua produk memiliki tingkat margin yang sehat dan menguntungkan.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('ALL')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterType === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Semua Produk ({sorted.length})
            </button>
            <button
              onClick={() => setFilterType('HEALTHY')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterType === 'HEALTHY'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Margin Sehat ({sorted.length - warningCount})
            </button>
            <button
              onClick={() => setFilterType('WARNING')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                filterType === 'WARNING'
                  ? 'bg-white text-rose-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Perlu Perhatian ({warningCount})
            </button>
          </div>

          <button
            onClick={() => setCurrentMenu('4.1')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>Simulasi Harga Kanal</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Nama Produk / SKU</th>
                <th className="py-3 px-4 text-right">HPP Standar</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-right">Laba Nominal</th>
                <th className="py-3 px-4 text-right">Margin Riil</th>
                <th className="py-3 px-4 text-right">Target Margin</th>
                <th className="py-3 px-4 text-center">Klasifikasi Margin</th>
                <th className="py-3 px-4 text-center w-28">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    {formatRupiah(p.estimatedHpp)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(p.sellingPrice)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                    +{formatRupiah(p.nominalProfit)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-mono font-extrabold text-sm ${
                        p.isBelowTarget ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatPercent(p.marginPct)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                    {p.targetMarginPct}%
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        p.marginPct >= 45
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.marginPct >= 35
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.categoryClass}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setCurrentMenu('4.1')}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors"
                    >
                      Atur Harga
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
