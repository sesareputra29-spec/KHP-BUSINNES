import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BillOfMaterial, BomIngredient, DirectLaborCost, OverheadCost } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/calculator';
import { exportToExcel } from '../../utils/excelHelper';
import {
  Layers,
  Plus,
  Search,
  Eye,
  Trash2,
  Copy,
  Printer,
  X,
  Sparkles,
  Calculator,
  Download,
  Edit2,
  CheckCircle2,
} from 'lucide-react';

export const BomView: React.FC = () => {
  const { boms, deleteBom, addBom, updateBom, setCurrentMenu, rawMaterials, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedBom, setSelectedBom] = useState<BillOfMaterial | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBom, setEditingBom] = useState<BillOfMaterial | null>(null);

  // Edit fields
  const [editProductName, setEditProductName] = useState('');
  const [editYield, setEditYield] = useState(20);
  const [editYieldUnit, setEditYieldUnit] = useState('box');

  const filteredBoms = boms.filter(
    (b) =>
      b.productName.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleDuplicateBom = (bom: BillOfMaterial) => {
    const newCode = 'BOM-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    addBom({
      ...bom,
      code: newCode,
      version: `${bom.version} (Salinan)`,
      productName: `${bom.productName} (Copy)`,
    });
    showToast('BOM Diduplikasi', `Salinan resep ${bom.productName} berhasil dibuat.`, 'success');
  };

  const handleOpenEdit = (bom: BillOfMaterial) => {
    setEditingBom(bom);
    setEditProductName(bom.productName);
    setEditYield(bom.batchYield);
    setEditYieldUnit(bom.yieldUnit);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBom) return;
    const newHpp = editingBom.totalBatchCost / (editYield || 1);
    updateBom(editingBom.id, {
      productName: editProductName,
      batchYield: editYield,
      yieldUnit: editYieldUnit,
      hppPerUnit: newHpp,
    });
    setIsEditModalOpen(false);
  };

  const handleExportExcel = (bom: BillOfMaterial) => {
    const headers = ['KOMPONEN RESEP / DESKRIPSI', 'QTY / PEKERJA', 'SATUAN / PARAMETER', 'SUSUT %', 'BIAYA SATUAN', 'TOTAL BIAYA'];
    const rows: (string | number)[][] = [
      ['KODE RESEP', bom.code, '', '', '', ''],
      ['NAMA PRODUK', bom.productName, '', '', '', ''],
      ['HASIL PRODUKSI (YIELD)', bom.batchYield, bom.yieldUnit, '', '', ''],
      ['TOTAL BIAYA RESEP', '', '', '', '', bom.totalBatchCost],
      ['HPP PER UNIT', '', '', '', '', bom.hppPerUnit],
      ['--- KOMPONEN BAHAN BAKU ---', '', '', '', '', ''],
      ...bom.ingredients.map((ing) => [
        ing.rawMaterialName,
        ing.quantity,
        ing.unit,
        `${ing.shrinkagePct}%`,
        ing.unitCost,
        ing.totalCost,
      ]),
      ['--- TENAGA KERJA (BTKL) ---', '', '', '', '', ''],
      ...bom.laborCosts.map((l) => [l.jobTitle, l.numWorkers, `${l.hoursWorked} Jam`, '', l.hourlyRate, l.totalCost]),
    ];

    exportToExcel(`resep-${bom.code.toLowerCase()}.xlsx`, bom.code, headers, rows);
    showToast('Export Resep Selesai', `File Excel (.xlsx) resep ${bom.code} telah diunduh.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              BOM & Resep Produksi
            </span>
            <span className="text-xs text-slate-500 font-mono">{boms.length} Formula Tersimpan</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Daftar Resep & Formula Produksi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Susunan Bill of Materials: bahan baku, waste susut, alokasi BTKL & BOP, serta perhitungan HPP per unit.
          </p>
        </div>

        <button
          onClick={() => setCurrentMenu('1.2')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Resep Baru</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode BOM atau nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* BOM Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBoms.map((b) => (
          <div
            key={b.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {b.code}
                  </span>
                  <span className="ml-1.5 text-[10px] text-slate-400 font-mono">
                    {b.version}
                  </span>
                  <h3 className="font-bold text-slate-800 text-sm mt-1.5">{b.productName}</h3>
                </div>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {b.costingMethod === 'FULL_COSTING' ? 'Full Costing' : 'Var Costing'}
                </span>
              </div>

              {/* Yield & HPP Highlight */}
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">Hasil Produksi (Yield):</div>
                  <div className="font-bold text-slate-700 text-xs">
                    {b.batchYield} {b.yieldUnit}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">HPP Pokok per Unit:</div>
                  <div className="font-mono font-extrabold text-emerald-700 text-base">
                    {formatRupiah(b.hppPerUnit)}
                  </div>
                </div>
              </div>

              {/* Cost Composition */}
              <div className="mt-3 space-y-1.5 text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Bahan ({b.ingredients.length} item):</span>
                  <span className="font-mono font-medium">{formatRupiah(b.totalMaterialCost)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Tenaga Kerja (BTKL):</span>
                  <span className="font-mono font-medium">{formatRupiah(b.totalLaborCost)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Biaya Overhead Pabrik (BOP):</span>
                  <span className="font-mono font-medium">
                    {formatRupiah(b.totalVariableOverheadCost + b.totalFixedOverheadCost)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 text-slate-800 font-bold">
                  <span>Total Resep / Batch:</span>
                  <span className="font-mono text-emerald-700">{formatRupiah(b.totalBatchCost)}</span>
                </div>
              </div>
            </div>

            {/* Actions: Detail, Edit, Duplikasi, Cetak, Export, Hapus */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedBom(b)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl transition-colors"
                title="Detail Resep"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Detail</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(b)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                  title="Edit Resep"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicateBom(b)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                  title="Duplikasi Resep"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleExportExcel(b)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Export Resep Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Hapus formula resep ${b.code}?`)) {
                      deleteBom(b.id);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                  title="Hapus Resep"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3.1.4 Detail Resep Modal */}
      {selectedBom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                  {selectedBom.code} • {selectedBom.version}
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  Detail Resep: {selectedBom.productName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Resep</span>
                </button>
                <button
                  onClick={() => setSelectedBom(null)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
              <div className="grid grid-cols-3 gap-3 p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center">
                <div>
                  <div className="text-[10px] text-slate-500">Hasil Produksi (Yield):</div>
                  <div className="font-bold text-slate-800 text-sm">
                    {selectedBom.batchYield} {selectedBom.yieldUnit}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Total Biaya Batch:</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {formatRupiah(selectedBom.totalBatchCost)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">HPP per {selectedBom.yieldUnit}:</div>
                  <div className="font-mono font-extrabold text-emerald-700 text-sm">
                    {formatRupiah(selectedBom.hppPerUnit)}
                  </div>
                </div>
              </div>

              {/* Rincian Bahan */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Daftar Bahan Baku & Faktor Susut (Waste)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Bahan Baku</th>
                        <th className="py-2 px-3 text-right">Net Qty</th>
                        <th className="py-2 px-3 text-center">Satuan</th>
                        <th className="py-2 px-3 text-right">Waste / Susut %</th>
                        <th className="py-2 px-3 text-right">Harga Satuan</th>
                        <th className="py-2 px-3 text-right">Biaya Bahan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBom.ingredients.map((ing, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {ing.rawMaterialName}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">
                            {formatNumber(ing.quantity)}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-500">{ing.unit}</td>
                          <td className="py-2 px-3 text-right text-amber-700 font-mono">
                            {ing.shrinkagePct}%
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatRupiah(ing.unitCost)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {formatRupiah(ing.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tenaga Kerja */}
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Tenaga Kerja Langsung (BTKL)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Pekerjaan</th>
                        <th className="py-2 px-3 text-center">Pekerja</th>
                        <th className="py-2 px-3 text-right">Tarif / Jam</th>
                        <th className="py-2 px-3 text-right">Jam Kerja</th>
                        <th className="py-2 px-3 text-right">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBom.laborCosts.map((lab, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3 font-medium text-slate-800">{lab.jobTitle}</td>
                          <td className="py-2 px-3 text-center font-mono">{lab.numWorkers} orang</td>
                          <td className="py-2 px-3 text-right font-mono text-slate-600">
                            {formatRupiah(lab.hourlyRate)}
                          </td>
                          <td className="py-2 px-3 text-right font-mono">{lab.hoursWorked} jam</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                            {formatRupiah(lab.totalCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBom(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.1.3 Edit Resep Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Edit Resep / BOM</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk Resep</label>
                <input
                  type="text"
                  required
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hasil Produksi (Yield)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editYield}
                    onChange={(e) => setEditYield(Number(e.target.value))}
                    className="w-full font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan Output</label>
                  <input
                    type="text"
                    required
                    value={editYieldUnit}
                    onChange={(e) => setEditYieldUnit(e.target.value)}
                    className="w-full text-center px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
