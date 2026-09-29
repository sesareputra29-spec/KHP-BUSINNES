import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatPercent, formatNumber } from '../../utils/calculator';
import {
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  DollarSign,
  Layers,
  Users,
  Factory,
  RefreshCw,
  Scale,
  CheckCircle2,
} from 'lucide-react';

export const SimulasiView: React.FC = () => {
  const { boms, products, rawMaterials } = useApp();
  const [selectedBomId, setSelectedBomId] = useState<string>(boms[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'BAHAN' | 'UMR' | 'VOLUME' | 'SUBSTITUSI'>('BAHAN');

  const bom = boms.find((b) => b.id === selectedBomId) || boms[0];
  const linkedProduct = products.find((p) => p.id === bom?.productId);

  // 6.2.1 Bahan Baku Simulation
  const [materialDelta, setMaterialDelta] = useState<number>(15); // +15%
  const [specificMatId, setSpecificMatId] = useState<string>('ALL');
  const [specificMatDelta, setSpecificMatDelta] = useState<number>(25);

  // 6.2.2 Tenaga Kerja (UMR) Simulation
  const [laborDelta, setLaborDelta] = useState<number>(10); // +10%

  // 6.2.3 Volume Produksi Simulation (Yield scaling)
  const [simYield, setSimYield] = useState<number>(bom ? bom.batchYield * 2 : 40);

  // 6.2.4 Substitusi Bahan Alternatif
  const [subSourceMatId, setSubSourceMatId] = useState<string>(rawMaterials[2]?.id || rawMaterials[0]?.id || '');
  const [subTargetMatId, setSubTargetMatId] = useState<string>(rawMaterials[1]?.id || '');
  const [subRatioPct, setSubRatioPct] = useState<number>(100); // 100% replacement

  if (!bom) {
    return <div className="p-8 text-center text-slate-400">Belum ada BOM untuk disimulasikan.</div>;
  }

  // Original costs
  const origMat = bom.totalMaterialCost;
  const origLab = bom.totalLaborCost;
  const origVarOv = bom.totalVariableOverheadCost;
  const origFixedOv = bom.totalFixedOverheadCost;
  const origPack = bom.totalPackagingCost;
  const origTotalBatch = origMat + origLab + origVarOv + origFixedOv + origPack;
  const origHpp = bom.hppPerUnit;
  const origSellingPrice = linkedProduct?.sellingPrice || origHpp * 1.5;
  const originalMarginPct =
    origSellingPrice > 0 ? ((origSellingPrice - origHpp) / origSellingPrice) * 100 : 40;

  // -------------------------------------------------------------
  // Calculate simulation outcomes based on active tab
  // -------------------------------------------------------------
  let simTotalBatch = origTotalBatch;
  let simYieldOut = bom.batchYield;
  let simNotes = '';

  if (activeTab === 'BAHAN') {
    if (specificMatId === 'ALL') {
      const simMat = origMat * (1 + materialDelta / 100);
      simTotalBatch = simMat + origLab + origVarOv + origFixedOv + origPack;
      simNotes = `Kenaikan rata-rata seluruh bahan baku sebesar ${materialDelta > 0 ? '+' : ''}${materialDelta}%.`;
    } else {
      const targetIng = bom.ingredients.find((i) => i.rawMaterialId === specificMatId);
      const ingCost = targetIng ? targetIng.totalCost : 0;
      const extraCost = ingCost * (specificMatDelta / 100);
      simTotalBatch = origTotalBatch + extraCost;
      simNotes = `Kenaikan khusus harga ${targetIng?.rawMaterialName || 'bahan'} sebesar ${specificMatDelta > 0 ? '+' : ''}${specificMatDelta}%.`;
    }
  } else if (activeTab === 'UMR') {
    const simLab = origLab * (1 + laborDelta / 100);
    simTotalBatch = origMat + simLab + origVarOv + origFixedOv + origPack;
    simNotes = `Kenaikan upah/UMR tenaga kerja langsung sebesar ${laborDelta > 0 ? '+' : ''}${laborDelta}%.`;
  } else if (activeTab === 'VOLUME') {
    simYieldOut = simYield > 0 ? simYield : 1;
    const scaleRatio = simYieldOut / (bom.batchYield || 1);
    // Variable costs scale linearly with volume, fixed overhead remains constant!
    const scaledVarMat = origMat * scaleRatio;
    const scaledVarLab = origLab * scaleRatio;
    const scaledVarOv = origVarOv * scaleRatio;
    const scaledPack = origPack * scaleRatio;
    const unscaledFixedOv = origFixedOv; // FIXED cost does NOT double!

    simTotalBatch = scaledVarMat + scaledVarLab + scaledVarOv + scaledPack + unscaledFixedOv;
    simNotes = `Peningkatan kapasitas produksi dari ${bom.batchYield} menjadi ${simYieldOut} ${bom.yieldUnit}. Biaya tetap pabrik diserap lebih efisien.`;
  } else if (activeTab === 'SUBSTITUSI') {
    const srcMat = rawMaterials.find((m) => m.id === subSourceMatId);
    const altMat = rawMaterials.find((m) => m.id === subTargetMatId);
    const ing = bom.ingredients.find((i) => i.rawMaterialId === subSourceMatId);

    if (ing && srcMat && altMat) {
      const srcUnitCost = ing.unitCost;
      const altUnitCost = altMat.costPerUnit;
      const replacedQty = ing.quantity * (subRatioPct / 100);
      const costSavings = replacedQty * (srcUnitCost - altUnitCost);
      simTotalBatch = origTotalBatch - costSavings;
      simNotes = `Mengganti ${subRatioPct}% pemakaian ${srcMat.name} dengan ${altMat.name}.`;
    } else {
      simNotes = `Pilih bahan baku dari resep untuk disimulasikan penggantiannya.`;
    }
  }

  const simHpp = simYieldOut > 0 ? simTotalBatch / simYieldOut : 0;
  const hppDiff = simHpp - origHpp;
  const hppDiffPct = origHpp > 0 ? (hppDiff / origHpp) * 100 : 0;

  // If selling price stays fixed:
  const newMarginIfFixedPrice =
    origSellingPrice > 0 ? ((origSellingPrice - simHpp) / origSellingPrice) * 100 : 0;

  // New recommended price to maintain original margin %:
  const newRecommendedPrice =
    Math.ceil((simHpp / (1 - originalMarginPct / 100)) / 500) * 500;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              6.2 Simulasi Skenario (What-If)
            </span>
            <span className="text-xs text-slate-500 font-mono">Sensitivitas & Skala Produksi</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Simulasi Dampak Fluktuasi Biaya, Volume & Bahan Alternatif
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Uji skenario kenaikan harga bahan, UMR upah, skala ekonomi kapasitas batch, dan estimasi efisiensi substitusi bahan alternatif.
          </p>
        </div>

        <div className="flex items-center gap-3">
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
      </div>

      {/* 4 Simulasi Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('BAHAN')}
          className={`flex-1 min-w-[200px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'BAHAN'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Kenaikan Harga Bahan</span>
        </button>

        <button
          onClick={() => setActiveTab('UMR')}
          className={`flex-1 min-w-[200px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'UMR'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kenaikan UMR / Upah</span>
        </button>

        <button
          onClick={() => setActiveTab('VOLUME')}
          className={`flex-1 min-w-[200px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'VOLUME'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Perubahan Volume (Skala)</span>
        </button>

        <button
          onClick={() => setActiveTab('SUBSTITUSI')}
          className={`flex-1 min-w-[200px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'SUBSTITUSI'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>Bahan Alternatif (Substitusi)</span>
        </button>
      </div>

      {/* Main Grid: Parameters vs Live Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Parameter Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Parameter Skenario Simulasi
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Formula: {bom.code}</span>
          </div>

          {/* ================= Tab 1: 6.2.1 Kenaikan Harga Bahan ================= */}
          {activeTab === 'BAHAN' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Bahan yang Disimulasikan
                </label>
                <select
                  value={specificMatId}
                  onChange={(e) => setSpecificMatId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="ALL">Semua Bahan Baku (Inflasi Umum)</option>
                  {bom.ingredients.map((ing) => (
                    <option key={ing.rawMaterialId} value={ing.rawMaterialId}>
                      Khusus: {ing.rawMaterialName}
                    </option>
                  ))}
                </select>
              </div>

              {specificMatId === 'ALL' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Persentase Inflasi Bahan Baku:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {materialDelta > 0 ? `+${materialDelta}%` : `${materialDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="50"
                    step="1"
                    value={materialDelta}
                    onChange={(e) => setMaterialDelta(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Turun -20%</span>
                    <span>Stabil (0%)</span>
                    <span>Naik +50%</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700">Lonjakan Harga Bahan Ini:</span>
                    <span className="font-mono font-bold text-rose-700">
                      {specificMatDelta > 0 ? `+${specificMatDelta}%` : `${specificMatDelta}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="100"
                    step="5"
                    value={specificMatDelta}
                    onChange={(e) => setSpecificMatDelta(Number(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>-20%</span>
                    <span>0%</span>
                    <span>+100%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= Tab 2: 6.2.2 Kenaikan UMR / Upah ================= */}
          {activeTab === 'UMR' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">Kenaikan Tarif Upah / UMR:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {laborDelta > 0 ? `+${laborDelta}%` : `${laborDelta}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="50"
                  step="1"
                  value={laborDelta}
                  onChange={(e) => setLaborDelta(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>-10%</span>
                  <span>Standar (0%)</span>
                  <span>Naik +50%</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                <div className="font-bold mb-1">Dampak ke Biaya Tenaga Kerja (BTKL):</div>
                <div>BTKL Awal: <span className="font-mono font-bold">{formatRupiah(origLab)}</span></div>
                <div>BTKL Setelah Penyesuaian: <span className="font-mono font-bold">{formatRupiah(origLab * (1 + laborDelta / 100))}</span></div>
              </div>
            </div>
          )}

          {/* ================= Tab 3: 6.2.3 Perubahan Volume (Skala) ================= */}
          {activeTab === 'VOLUME' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">Simulasi Jumlah Output per Batch (Yield):</span>
                  <span className="font-mono font-bold text-purple-700">
                    {simYield} {bom.yieldUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.max(5, Math.floor(bom.batchYield * 0.5))}
                  max={bom.batchYield * 5}
                  step={5}
                  value={simYield}
                  onChange={(e) => setSimYield(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Output Standar ({bom.batchYield})</span>
                  <span>Skala Besar ({bom.batchYield * 3})</span>
                  <span>Kapasitas Penuh ({bom.batchYield * 5})</span>
                </div>
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900">
                <div className="font-bold mb-1">Efisiensi Biaya Tetap (Economies of Scale):</div>
                <p className="text-[11px] leading-relaxed text-purple-800">
                  Biaya overhead tetap pabrik ({formatRupiah(origFixedOv)}) kini dibagi ke {simYield} unit (menjadi <span className="font-mono font-bold">{formatRupiah(origFixedOv / simYield)}/unit</span> vs sebelumnya <span className="font-mono font-bold">{formatRupiah(origFixedOv / bom.batchYield)}/unit</span>).
                </p>
              </div>
            </div>
          )}

          {/* ================= Tab 4: 6.2.4 Bahan Alternatif (Substitusi) ================= */}
          {activeTab === 'SUBSTITUSI' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Bahan Baku Resep Saat Ini
                </label>
                <select
                  value={subSourceMatId}
                  onChange={(e) => setSubSourceMatId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {bom.ingredients.map((ing) => (
                    <option key={ing.rawMaterialId} value={ing.rawMaterialId}>
                      {ing.rawMaterialName} (Harga: {formatRupiah(ing.unitCost)} / {ing.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Bahan Pengganti / Alternatif
                </label>
                <select
                  value={subTargetMatId}
                  onChange={(e) => setSubTargetMatId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {rawMaterials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name} (Harga: {formatRupiah(mat.costPerUnit)} / {mat.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">Persentase Substitusi Penggantian:</span>
                  <span className="font-mono font-bold text-amber-700">{subRatioPct}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="10"
                  value={subRatioPct}
                  onChange={(e) => setSubRatioPct(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10% (Uji coba rasa)</span>
                  <span>50% (Campuran)</span>
                  <span>100% (Substitusi penuh)</span>
                </div>
              </div>
            </div>
          )}

          {/* Skenario Info Banner */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
            <span className="font-bold text-slate-800">Ringkasan Skenario:</span> {simNotes}
          </div>
        </div>

        {/* Right Column: Live Impact Results */}
        <div className="space-y-4">
          {/* Main Impact Card */}
          <div className="bg-gradient-to-br from-slate-900 to-purple-950 text-white p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs uppercase font-bold tracking-wider text-purple-300">
                Dampak terhadap HPP Pokok per Unit
              </span>
              <span className="text-xs font-mono text-slate-300">
                Yield: {simYieldOut} {bom.yieldUnit}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-slate-400">HPP Pokok Awal:</div>
                <div className="text-xl font-bold font-mono text-slate-300 mt-0.5">
                  {formatRupiah(origHpp)}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-purple-300 font-semibold">
                  HPP Baru (Hasil Simulasi):
                </div>
                <div className={`text-2xl font-black font-mono mt-0.5 ${hppDiff > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {formatRupiah(simHpp)}
                </div>
              </div>
            </div>

            <div className="p-3 bg-white/10 rounded-xl border border-white/15 text-xs flex items-center justify-between">
              <span>Selisih Variasi HPP:</span>
              <span className={`font-mono font-bold text-sm ${hppDiff > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                {hppDiff > 0 ? '+' : ''}{formatRupiah(hppDiff)} ({hppDiffPct > 0 ? `+${hppDiffPct.toFixed(1)}%` : `${hppDiffPct.toFixed(1)}%`})
              </span>
            </div>
          </div>

          {/* Scenario A: If price stays unchanged */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Skenario 1: Jika Harga Jual Tetap ({formatRupiah(origSellingPrice)})</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Margin kotor penjualan Anda akan berubah dari{' '}
              <span className="font-bold text-slate-800">{formatPercent(originalMarginPct)}</span> menjadi{' '}
              <span className={`font-bold ${newMarginIfFixedPrice < originalMarginPct ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatPercent(newMarginIfFixedPrice)}
              </span>. Selisih laba per unit sebesar{' '}
              <span className={`font-mono font-bold ${hppDiff > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {hppDiff > 0 ? '-' : '+'}{formatRupiah(Math.abs(hppDiff))}
              </span>.
            </p>
          </div>

          {/* Scenario B: If price is adjusted */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Skenario 2: Rekomendasi Penyesuaian Harga Jual Baru</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Agar persentase margin keuntungan tetap stabil sebesar{' '}
              <span className="font-bold text-slate-800">{formatPercent(originalMarginPct)}</span>, harga jual ideal adalah:
            </p>
            <div className="text-2xl font-black text-emerald-700 font-mono pt-1">
              {formatRupiah(newRecommendedPrice)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
