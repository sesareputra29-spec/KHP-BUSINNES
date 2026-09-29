import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  formatRupiah,
  formatPercent,
  formatNumber,
  calculateBEP,
  generateSensitivityMatrix,
} from '../../utils/calculator';
import {
  Scale,
  DollarSign,
  TrendingUp,
  Sliders,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const BepSensitivitasView: React.FC = () => {
  const { products, boms, companySettings } = useApp();

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const product = products.find((p) => p.id === selectedProductId) || products[0];
  const linkedBom = boms.find((b) => b.productId === product?.id || b.id === product?.activeBomId);

  // Default parameters
  const [fixedCosts, setFixedCosts] = useState<number>(companySettings.fixedMonthlyOverhead || 12500000);
  const [sellingPrice, setSellingPrice] = useState<number>(product?.sellingPrice || 35000);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState<number>(
    linkedBom ? linkedBom.hppPerUnit * 0.85 : 18000
  );
  const [currentMonthlyVolume, setCurrentMonthlyVolume] = useState<number>(1000);

  const bepResult = calculateBEP(
    fixedCosts,
    sellingPrice,
    variableCostPerUnit,
    currentMonthlyVolume
  );

  const sensitivity = generateSensitivityMatrix(
    sellingPrice,
    currentMonthlyVolume,
    variableCostPerUnit,
    fixedCosts
  );

  const handleProductChange = (id: string) => {
    setSelectedProductId(id);
    const p = products.find((item) => item.id === id);
    if (p) {
      setSellingPrice(p.sellingPrice);
      const b = boms.find((item) => item.productId === p.id || item.id === p.activeBomId);
      if (b) {
        setVariableCostPerUnit(Math.round(b.hppPerUnit * 0.85));
      } else {
        setVariableCostPerUnit(Math.round(p.estimatedHpp * 0.85));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              6.3 BEP & Sensitivitas
            </span>
            <span className="text-xs text-slate-500 font-mono">Break-Even & Risk Analysis</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Analisis Titik Impas (BEP) & Matriks Sensitivitas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Hitung target volume minimum dan omset agar operasional bisnis tidak mengalami kerugian, serta uji daya tahan terhadap fluktuasi pasar.
          </p>
        </div>

        <select
          value={selectedProductId}
          onChange={(e) => handleProductChange(e.target.value)}
          className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>

      {/* Input Parameters Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          Parameter Biaya & Proyeksi Penjualan
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Biaya Tetap Bulanan (Fixed Cost)
            </label>
            <input
              type="number"
              step={100000}
              value={fixedCosts}
              onChange={(e) => setFixedCosts(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Sewa, gaji tetap, depresiasi</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Harga Jual per Unit (Rp)
            </label>
            <input
              type="number"
              step={500}
              value={sellingPrice}
              onChange={(e) => setSellingPrice(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Biaya Variabel per Unit (Rp)
            </label>
            <input
              type="number"
              step={500}
              value={variableCostPerUnit}
              onChange={(e) => setVariableCostPerUnit(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Bahan baku + kemasan + energi</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Penjualan Bulanan (Unit)
            </label>
            <input
              type="number"
              min={1}
              value={currentMonthlyVolume}
              onChange={(e) => setCurrentMonthlyVolume(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right text-emerald-700"
            />
          </div>
        </div>
      </div>

      {/* BEP Results 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* BEP Unit */}
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
            Titik Impas Kuantitas
          </span>
          <div className="text-3xl font-black font-mono text-white mt-1">
            {formatNumber(bepResult.bepUnits)} <span className="text-sm font-normal text-slate-300">Unit</span>
          </div>
          <div className="text-[11px] text-slate-300 mt-1">
            Penjualan minimal per bulan agar laba = 0 (BEP)
          </div>
        </div>

        {/* BEP Rupiah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Titik Impas Omset (BEP Rp)</span>
          <div className="text-2xl font-black font-mono text-slate-800 mt-1">
            {formatRupiah(bepResult.bepRupiah)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Nilai pendapatan kotor penutup modal
          </div>
        </div>

        {/* Margin Kontribusi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Margin Kontribusi / Unit</span>
          <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
            {formatRupiah(bepResult.contributionMarginPerUnit)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rasio: <span className="font-bold">{formatPercent(bepResult.contributionMarginRatio * 100)}</span> dari harga jual
          </div>
        </div>

        {/* Margin of Safety */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500">Margin of Safety (Batas Aman)</span>
          <div className="text-2xl font-black font-mono text-blue-700 mt-1">
            {formatPercent(bepResult.marginOfSafetyPct)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Toleransi penurunan penjualan sebelum merugi
          </div>
        </div>
      </div>

      {/* Sensitivity Analysis Matrix (5x5 Grid) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Matriks Sensitivitas Laba Bersih (Harga Jual vs Volume Penjualan)
            </h3>
            <p className="text-xs text-slate-500">
              Proyeksi laba bersih bulanan dengan berbagai kombinasi perubahan harga dan volume pasar.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Hijau = Untung | Merah = Rugi
          </span>
        </div>

        <div className="overflow-x-auto p-4">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr>
                <th className="p-2.5 bg-slate-100 text-slate-700 font-bold border border-slate-200 text-left">
                  Volume \ Harga Jual
                </th>
                {sensitivity.priceDeltas.map((pDelta, idx) => (
                  <th
                    key={idx}
                    className="p-2.5 bg-slate-50 text-slate-800 font-bold border border-slate-200 font-mono"
                  >
                    {pDelta > 0 ? `+${pDelta}%` : `${pDelta}%`}
                    <div className="text-[10px] font-normal text-slate-500">
                      {formatRupiah(sellingPrice * (1 + pDelta / 100))}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.volumeDeltas.map((vDelta, rIdx) => (
                <tr key={rIdx}>
                  <td className="p-2.5 bg-slate-50 font-bold text-slate-800 border border-slate-200 text-left font-mono">
                    {vDelta > 0 ? `+${vDelta}%` : `${vDelta}%`}
                    <span className="text-[10px] font-normal text-slate-500 block">
                      ({formatNumber(Math.round(currentMonthlyVolume * (1 + vDelta / 100)))} unit)
                    </span>
                  </td>
                  {sensitivity.matrix[rIdx].map((cell, cIdx) => {
                    const isProfit = cell.netProfit >= 0;
                    return (
                      <td
                        key={cIdx}
                        className={`p-2.5 border border-slate-200 font-mono font-bold transition-colors ${
                          isProfit
                            ? cell.netProfit > fixedCosts
                              ? 'bg-emerald-100/70 text-emerald-950 font-extrabold'
                              : 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-100/70 text-rose-900 font-bold'
                        }`}
                      >
                        {isProfit ? `+${formatRupiah(cell.netProfit)}` : formatRupiah(cell.netProfit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
