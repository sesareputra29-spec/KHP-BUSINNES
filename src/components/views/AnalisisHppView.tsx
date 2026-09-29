import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatPercent } from '../../utils/calculator';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Layers,
  Sparkles,
  Info,
  DollarSign,
  ArrowRight,
} from 'lucide-react';

export const AnalisisHppView: React.FC = () => {
  const { boms, products } = useApp();
  const [selectedBomId, setSelectedBomId] = useState<string>(boms[0]?.id || '');

  const bom = boms.find((b) => b.id === selectedBomId) || boms[0];

  if (!bom) {
    return <div className="p-8 text-center text-slate-400">Belum ada resep BOM untuk dianalisis.</div>;
  }

  const totalCost = bom.totalBatchCost;
  const matPct = totalCost > 0 ? (bom.totalMaterialCost / totalCost) * 100 : 0;
  const labPct = totalCost > 0 ? (bom.totalLaborCost / totalCost) * 100 : 0;
  const ovPct =
    totalCost > 0
      ? ((bom.totalVariableOverheadCost + bom.totalFixedOverheadCost) / totalCost) * 100
      : 0;
  const packPct = totalCost > 0 ? (bom.totalPackagingCost / totalCost) * 100 : 0;

  // Pareto Analysis on Ingredients (80/20 Rule)
  const sortedIngredients = [...bom.ingredients].sort((a, b) => b.totalCost - a.totalCost);
  let cumulative = 0;
  const paretoIngredients = sortedIngredients.map((item) => {
    cumulative += item.totalCost;
    const sharePct = bom.totalMaterialCost > 0 ? (item.totalCost / bom.totalMaterialCost) * 100 : 0;
    const cumPct = bom.totalMaterialCost > 0 ? (cumulative / bom.totalMaterialCost) * 100 : 0;
    return {
      ...item,
      sharePct,
      cumPct,
      isTopDriver: cumPct <= 80 || sharePct >= 15,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              6.1 Analisis HPP & Pareto 80/20
            </span>
            <span className="text-xs text-slate-500 font-mono">Cost Driver Diagnostic</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Analisis Struktur Biaya & Komponen Termahal (Pareto)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ketahui 20% bahan baku dan biaya yang menyerap 80% anggaran produksi untuk efisiensi biaya yang tepat sasaran.
          </p>
        </div>

        <select
          value={selectedBomId}
          onChange={(e) => setSelectedBomId(e.target.value)}
          className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
        >
          {boms.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} - {b.productName}
            </option>
          ))}
        </select>
      </div>

      {/* 4-Pillars Cost Composition Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
            <span>Bahan Baku Langsung</span>
            <span className="font-mono font-bold text-blue-700">{formatPercent(matPct)}</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {formatRupiah(bom.totalMaterialCost)}
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${matPct}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
            <span>Tenaga Kerja (BTKL)</span>
            <span className="font-mono font-bold text-emerald-700">{formatPercent(labPct)}</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {formatRupiah(bom.totalLaborCost)}
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${labPct}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
            <span>Overhead Pabrik (BOP)</span>
            <span className="font-mono font-bold text-amber-700">{formatPercent(ovPct)}</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {formatRupiah(bom.totalVariableOverheadCost + bom.totalFixedOverheadCost)}
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-amber-600 h-full rounded-full" style={{ width: `${ovPct}%` }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-900">
            <span>Kemasan & Packaging</span>
            <span className="font-mono font-bold text-purple-700">{formatPercent(packPct)}</span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2">
            {formatRupiah(bom.totalPackagingCost)}
          </div>
          <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: `${packPct}%` }} />
          </div>
        </div>
      </div>

      {/* Pareto 80/20 Analysis Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Analisis Pareto Bahan Baku (Prinsip 80/20)
            </h3>
            <p className="text-xs text-slate-500">
              Bahan baku dengan badge kuning adalah pemicu biaya terbesar (fokus utama negosiasi harga ke supplier).
            </p>
          </div>
          <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">
            Prioritas Efisiensi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Peringkat & Nama Bahan Baku</th>
                <th className="py-3 px-4 text-right">Biaya per Batch</th>
                <th className="py-3 px-4 text-right">Porsi dari Total Bahan (%)</th>
                <th className="py-3 px-4 text-right">Persentase Kumulatif</th>
                <th className="py-3 px-4 text-center">Klasifikasi Pareto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paretoIngredients.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-mono font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {item.rawMaterialName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatRupiah(item.totalCost)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-blue-700">
                    {formatPercent(item.sharePct)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                    {formatPercent(item.cumPct)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.isTopDriver
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.isTopDriver ? 'Top 80% Cost Driver' : 'Minor Cost (<20%)'}
                    </span>
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
