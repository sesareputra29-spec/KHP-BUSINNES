import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProductionBatch } from '../../types';
import { formatRupiah, formatPercent, formatNumber } from '../../utils/calculator';
import {
  Factory,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  FileCheck,
  TrendingDown,
  TrendingUp,
  X,
  Play,
  Printer,
  BarChart3,
  Ban,
  Eye,
  Layers,
  FileText,
} from 'lucide-react';

export const ProduksiView: React.FC = () => {
  const { batches, addProductionBatch, updateProductionBatch, boms, products, companySettings, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // New Batch Modal State (3.2.2 Input Produksi Baru)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState(boms[0]?.id || '');
  const [plannedOutput, setPlannedOutput] = useState(25);
  const [operatorName, setOperatorName] = useState('Tim Produksi');
  const [notes, setNotes] = useState('');

  // Complete Batch Modal State (3.2.3 Realisasi Produksi)
  const [completingBatch, setCompletingBatch] = useState<ProductionBatch | null>(null);
  const [actualOutput, setActualOutput] = useState(0);
  const [actualCostTotal, setActualCostTotal] = useState(0);
  const [completionNotes, setCompletionNotes] = useState('');

  // 3.2.4 Evaluasi HPP Produksi & Analisis Varian Modal State
  const [varianceModalBatch, setVarianceModalBatch] = useState<ProductionBatch | null>(null);

  // Cetak SPK Modal State
  const [spkModalBatch, setSpkModalBatch] = useState<ProductionBatch | null>(null);

  const filteredBatches = batches.filter((b) => {
    const matchesSearch =
      b.batchNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.productName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    const defaultBom = boms[0];
    setSelectedBomId(defaultBom?.id || '');
    setPlannedOutput(defaultBom?.batchYield || 20);
    setOperatorName('Tim Produksi Utama');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const bom = boms.find((b) => b.id === selectedBomId);
    if (!bom) return;

    const batchNumber = `SPK-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`;
    const standardCostTotal = bom.hppPerUnit * plannedOutput;

    addProductionBatch({
      batchNumber,
      date: new Date().toISOString().split('T')[0],
      bomId: bom.id,
      productId: bom.productId || 'prod-1',
      productName: bom.productName,
      plannedOutput,
      actualOutput: 0,
      status: 'Dalam Proses',
      standardCostTotal,
      actualCostTotal: standardCostTotal,
      costVariance: 0,
      variancePct: 0,
      standardHppPerUnit: bom.hppPerUnit,
      actualHppPerUnit: bom.hppPerUnit,
      notes,
      operatorName,
    });

    setIsAddModalOpen(false);
  };

  const handleOpenCompleteModal = (batch: ProductionBatch) => {
    setCompletingBatch(batch);
    setActualOutput(batch.plannedOutput);
    setActualCostTotal(batch.standardCostTotal);
    setCompletionNotes('Selesai sesuai standar proses produksi.');
  };

  const handleFinishBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingBatch) return;

    const costVariance = actualCostTotal - completingBatch.standardCostTotal;
    const variancePct =
      completingBatch.standardCostTotal > 0
        ? (costVariance / completingBatch.standardCostTotal) * 100
        : 0;

    const actualHppPerUnit = actualOutput > 0 ? actualCostTotal / actualOutput : 0;

    updateProductionBatch(completingBatch.id, {
      status: 'Selesai',
      actualOutput,
      actualCostTotal,
      costVariance,
      variancePct,
      actualHppPerUnit,
      completedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: completionNotes,
    });

    setCompletingBatch(null);
  };

  const handleCancelBatch = (batch: ProductionBatch) => {
    if (confirm(`Apakah Anda yakin ingin membatalkan SPK ${batch.batchNumber}?`)) {
      updateProductionBatch(batch.id, { status: 'Dibatalkan' });
      showToast('SPK Dibatalkan', `Batch ${batch.batchNumber} telah dibatalkan.`, 'warning');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Produksi & Eksekusi Batch
            </span>
            <span className="text-xs text-slate-500 font-mono">{batches.length} Batch Riwayat</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Surat Perintah Kerja (SPK) & Realisasi Biaya Produksi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan batch produksi riil, pemantauan bahan standar vs aktual, dan evaluasi variansi biaya (cost variance).
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Input Produksi Baru (SPK)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor batch, SPK, atau produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {['ALL', 'Terjadwal', 'Dalam Proses', 'Selesai', 'Dibatalkan'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'ALL' ? 'Semua Status' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">No Batch / SPK</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4 text-center">Rencana vs Realisasi</th>
                <th className="py-3 px-4 text-right">Biaya Standar</th>
                <th className="py-3 px-4 text-right">Biaya Realisasi</th>
                <th className="py-3 px-4 text-right">Variansi Biaya</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredBatches.map((b) => {
                const isOver = b.costVariance > 0;
                const isSaved = b.costVariance < 0;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-700">{b.batchNumber}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {b.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{b.productName}</div>
                      <div className="text-[10px] text-slate-400">PIC: {b.operatorName || 'Tim Produksi'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <div className="font-bold text-slate-800">
                        {b.status === 'Selesai' ? b.actualOutput : '-'} / {b.plannedOutput} unit
                      </div>
                      {b.status === 'Selesai' && b.actualOutput !== b.plannedOutput && (
                        <span className={`text-[10px] ${b.actualOutput < b.plannedOutput ? 'text-rose-600' : 'text-emerald-600'}`}>
                          ({b.actualOutput - b.plannedOutput > 0 ? '+' : ''}{b.actualOutput - b.plannedOutput} unit)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(b.standardCostTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {b.status === 'Selesai' ? formatRupiah(b.actualCostTotal) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">
                      {b.status === 'Selesai' ? (
                        <div className={`font-bold ${isOver ? 'text-rose-600' : isSaved ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {isOver ? '+' : ''}{formatRupiah(b.costVariance)}
                          <div className="text-[10px] font-normal">
                            ({b.variancePct > 0 ? `+${b.variancePct.toFixed(1)}%` : `${b.variancePct.toFixed(1)}%`})
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'Dalam Proses'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : b.status === 'Terjadwal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 3.2.3 Realisasi Produksi (Selesai) */}
                        {b.status === 'Dalam Proses' && (
                          <button
                            onClick={() => handleOpenCompleteModal(b)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
                            title="Realisasi Produksi (Selesaikan Batch)"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {b.status === 'Terjadwal' && (
                          <button
                            onClick={() => updateProductionBatch(b.id, { status: 'Dalam Proses' })}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                            title="Mulai Proses Produksi"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* 3.2.4 Evaluasi HPP & Analisis Varian */}
                        <button
                          onClick={() => setVarianceModalBatch(b)}
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                          title="Evaluasi HPP & Analisis Varian"
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Cetak SPK */}
                        <button
                          onClick={() => setSpkModalBatch(b)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Cetak SPK (Surat Perintah Kerja)"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Batalkan SPK */}
                        {(b.status === 'Terjadwal' || b.status === 'Dalam Proses') && (
                          <button
                            onClick={() => handleCancelBatch(b)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Batalkan SPK"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3.2.2 Input Produksi Baru Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                Input Produksi Baru (Terbitkan SPK)
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Resep Standar (BOM)
                </label>
                <select
                  value={selectedBomId}
                  onChange={(e) => {
                    setSelectedBomId(e.target.value);
                    const b = boms.find((item) => item.id === e.target.value);
                    if (b) setPlannedOutput(b.batchYield);
                  }}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {boms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.productName} (Standar Yield: {b.batchYield} {b.yieldUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Rencana Produksi (Unit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={plannedOutput}
                    onChange={(e) => setPlannedOutput(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Operator / PIC Pelaksana
                  </label>
                  <input
                    type="text"
                    required
                    value={operatorName}
                    onChange={(e) => setOperatorName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Instruksi Khusus / Catatan SPK
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Perhatikan suhu oven 180°C, gunakan ragi baru batch B..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Terbitkan & Mulai SPK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3.2.3 Realisasi Produksi Modal */}
      {completingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold">
                  {completingBatch.batchNumber}
                </span>
                <h3 className="font-bold text-slate-800 text-sm mt-1">
                  Realisasi Produksi & Input Hasil Nyata
                </h3>
              </div>
              <button onClick={() => setCompletingBatch(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFinishBatch} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Produk:</span>
                  <span className="font-bold text-slate-800">{completingBatch.productName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Rencana Target:</span>
                  <span className="font-mono">{completingBatch.plannedOutput} unit</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Standar BOM:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatRupiah(completingBatch.standardCostTotal)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Output Realisasi Jadi (Unit)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={actualOutput}
                    onChange={(e) => setActualOutput(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Biaya Riil Dikeluarkan (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    value={actualCostTotal}
                    onChange={(e) => setActualCostTotal(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right text-emerald-700"
                  />
                </div>
              </div>

              {/* Variance Live Preview */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <span>Variansi Biaya (Realisasi - Standar):</span>
                <span
                  className={`font-mono font-bold ${
                    actualCostTotal > completingBatch.standardCostTotal
                      ? 'text-rose-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {actualCostTotal - completingBatch.standardCostTotal > 0 ? '+' : ''}
                  {formatRupiah(actualCostTotal - completingBatch.standardCostTotal)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Evaluasi Produksi
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Kualitas adonan sempurna, tekstur renyah, susut bahan sesuai toleransi..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCompletingBatch(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Simpan Realisasi & Masuk Gudang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3.2.4 Evaluasi HPP Produksi & Analisis Varian Modal */}
      {varianceModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {varianceModalBatch.batchNumber}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Evaluasi HPP & Analisis Variansi Biaya
                </h3>
              </div>
              <button onClick={() => setVarianceModalBatch(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">{varianceModalBatch.productName}</h4>
                <div className="text-slate-500 mt-0.5 font-mono">
                  Tanggal: {varianceModalBatch.date} • Operator: {varianceModalBatch.operatorName || 'Tim Produksi'}
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 text-[10px]">HPP Standar / Unit:</div>
                  <div className="font-mono font-bold text-slate-800 text-sm">
                    {formatRupiah(varianceModalBatch.standardHppPerUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">HPP Realisasi / Unit:</div>
                  <div className="font-mono font-bold text-purple-700 text-sm">
                    {formatRupiah(varianceModalBatch.actualHppPerUnit || varianceModalBatch.standardHppPerUnit)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Varian HPP:</div>
                  <div className={`font-mono font-bold text-sm ${varianceModalBatch.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {varianceModalBatch.costVariance > 0 ? '+' : ''}{formatRupiah(varianceModalBatch.costVariance)}
                  </div>
                </div>
              </div>

              {/* Variance Breakdown Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Komponen Biaya</th>
                      <th className="py-2.5 px-3 text-right">Standar (BOM)</th>
                      <th className="py-2.5 px-3 text-right">Realisasi (Riil)</th>
                      <th className="py-2.5 px-3 text-right">Selisih (Variance)</th>
                      <th className="py-2.5 px-3 text-center">Status Varian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 font-sans">Bahan Baku Utama</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.standardCostTotal * 0.55)}</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.actualCostTotal * 0.55)}</td>
                      <td className={`py-2.5 px-3 text-right ${varianceModalBatch.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatRupiah(varianceModalBatch.costVariance * 0.55)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${varianceModalBatch.costVariance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {varianceModalBatch.costVariance > 0 ? 'Unfavorable' : 'Favorable'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 font-sans">Tenaga Kerja Langsung (BTKL)</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.standardCostTotal * 0.25)}</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.actualCostTotal * 0.25)}</td>
                      <td className={`py-2.5 px-3 text-right ${varianceModalBatch.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatRupiah(varianceModalBatch.costVariance * 0.25)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${varianceModalBatch.costVariance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {varianceModalBatch.costVariance > 0 ? 'Unfavorable' : 'Favorable'}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-medium text-slate-800 font-sans">Overhead & Kemasan</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.standardCostTotal * 0.20)}</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.actualCostTotal * 0.20)}</td>
                      <td className={`py-2.5 px-3 text-right ${varianceModalBatch.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatRupiah(varianceModalBatch.costVariance * 0.20)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${varianceModalBatch.costVariance > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {varianceModalBatch.costVariance > 0 ? 'Unfavorable' : 'Favorable'}
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
                      <td className="py-2.5 px-3 font-sans">Total Biaya Batch</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.standardCostTotal)}</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(varianceModalBatch.actualCostTotal)}</td>
                      <td className={`py-2.5 px-3 text-right ${varianceModalBatch.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {varianceModalBatch.costVariance > 0 ? '+' : ''}{formatRupiah(varianceModalBatch.costVariance)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="text-[10px] text-slate-500 font-semibold">Net Variance</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {varianceModalBatch.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="font-bold text-amber-900 text-[11px] mb-0.5">Catatan Produksi:</div>
                  <div className="text-amber-800 text-xs">{varianceModalBatch.notes}</div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setVarianceModalBatch(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup Evaluasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cetak SPK (Surat Perintah Kerja) Slip Modal */}
      {spkModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Cetak Surat Perintah Kerja (SPK)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button onClick={() => setSpkModalBatch(null)} className="text-slate-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable SPK Sheet */}
            <div className="p-6 space-y-5 text-xs text-slate-800 bg-white">
              {/* Header Company */}
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-wide">
                    {companySettings.companyName || 'PT BOGA RASA NUSANTARA'}
                  </h2>
                  <div className="text-[11px] text-slate-500">{companySettings.address}</div>
                  <div className="text-[11px] text-slate-500">Telp: {companySettings.phone} • Email: {companySettings.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md inline-block">
                    SURAT PERINTAH KERJA (SPK)
                  </div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-1">{spkModalBatch.batchNumber}</div>
                  <div className="text-[11px] text-slate-500">Tanggal: {spkModalBatch.date}</div>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400 text-[10px]">Nama Produk:</div>
                  <div className="font-bold text-slate-900 text-sm">{spkModalBatch.productName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Target Rencana Hasil (Yield):</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">{spkModalBatch.plannedOutput} Unit</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Operator / PIC Shift:</div>
                  <div className="font-semibold text-slate-800">{spkModalBatch.operatorName || 'Tim Produksi'}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Status SPK:</div>
                  <div className="font-semibold text-purple-700">{spkModalBatch.status}</div>
                </div>
              </div>

              {/* Materials Needed Checklist */}
              <div>
                <h5 className="font-bold uppercase text-[11px] text-slate-800 mb-2">
                  Daftar Bahan Baku & Alokasi Standar (BOM)
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2">No</th>
                        <th className="p-2">Bahan Baku</th>
                        <th className="p-2 text-right">Alokasi Standar</th>
                        <th className="p-2 text-center">Check Gudang</th>
                        <th className="p-2 text-center">Timbang PIC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2">1</td>
                        <td className="p-2 font-medium">Bahan Baku Komposisi Resep Formula</td>
                        <td className="p-2 text-right font-mono">Sesuai BOM Resep</td>
                        <td className="p-2 text-center font-mono">[ ✔ ] Disiapkan</td>
                        <td className="p-2 text-center font-mono">[ ___ ] Valid</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 text-[11px] mb-0.5">Instruksi Khusus:</div>
                <div className="text-slate-600 text-[11px]">
                  {spkModalBatch.notes || 'Patuhi standar sanitasi, timbang bahan sesuai takaran presisi, catat jika ada bahan terbuang/rusak.'}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-center text-[11px]">
                <div>
                  <div className="text-slate-500 mb-10">Dibuat Oleh (Admin):</div>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">Cost Accountant</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-10">Diterima Oleh (PIC):</div>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">{spkModalBatch.operatorName || 'Kepala Dapur'}</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-10">QC & Gudang Jadi:</div>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1">Quality Control</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSpkModalBatch(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
