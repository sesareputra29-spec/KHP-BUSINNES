import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatNumber } from '../../utils/calculator';
import {
  Warehouse,
  Search,
  AlertTriangle,
  RotateCcw,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  X,
  Plus,
  Package,
  Layers,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    rawMaterials,
    products,
    updateRawMaterial,
    updateProduct,
    stockMovements,
    addStockMovement,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'PRODUCTS' | 'MOVEMENTS'>('MATERIALS');
  const [search, setSearch] = useState('');

  // Stock Opname Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItemType, setAdjustItemType] = useState<'MATERIAL' | 'PRODUCT'>('MATERIAL');
  const [adjustItemId, setAdjustItemId] = useState(rawMaterials[0]?.id || '');
  const [adjustedQty, setAdjustedQty] = useState(0);
  const [adjustNotes, setAdjustNotes] = useState('Hasil Stock Opname Akhir Bulan');

  const filteredMaterials = rawMaterials.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMovements = stockMovements.filter(
    (mov) =>
      mov.itemName.toLowerCase().includes(search.toLowerCase()) ||
      mov.referenceNo.toLowerCase().includes(search.toLowerCase())
  );

  // Valuations
  const totalMaterialValuation = rawMaterials.reduce(
    (sum, m) => sum + (m.currentStock * m.costPerUnit || 0),
    0
  );

  const totalProductValuation = products.reduce(
    (sum, p) => sum + (p.currentStock * p.estimatedHpp || 0),
    0
  );

  const handleOpenAdjustment = (type: 'MATERIAL' | 'PRODUCT', id: string, current: number) => {
    setAdjustItemType(type);
    setAdjustItemId(id);
    setAdjustedQty(current);
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustItemType === 'MATERIAL') {
      const mat = rawMaterials.find((m) => m.id === adjustItemId);
      if (!mat) return;
      const diff = adjustedQty - mat.currentStock;
      updateRawMaterial(mat.id, { currentStock: adjustedQty });

      addStockMovement({
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        itemType: 'MATERIAL',
        itemId: mat.id,
        itemName: mat.name,
        type: 'ADJUSTMENT',
        quantity: diff,
        unit: mat.unit,
        referenceNo: 'ADJ-' + Date.now().toString().substring(7),
        unitCost: mat.costPerUnit,
        totalValue: Math.abs(diff) * mat.costPerUnit,
        balanceAfter: adjustedQty,
        notes: adjustNotes,
      });

      showToast('Stok Bahan Baku Disesuaikan', `${mat.name} diubah menjadi ${formatNumber(adjustedQty)} ${mat.unit}.`, 'success');
    } else {
      const prod = products.find((p) => p.id === adjustItemId);
      if (!prod) return;
      const diff = adjustedQty - prod.currentStock;
      updateProduct(prod.id, { currentStock: adjustedQty });

      addStockMovement({
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        itemType: 'PRODUCT',
        itemId: prod.id,
        itemName: prod.name,
        type: 'ADJUSTMENT',
        quantity: diff,
        unit: prod.unit,
        referenceNo: 'ADJ-' + Date.now().toString().substring(7),
        unitCost: prod.estimatedHpp,
        totalValue: Math.abs(diff) * prod.estimatedHpp,
        balanceAfter: adjustedQty,
        notes: adjustNotes,
      });

      showToast('Stok Produk Jadi Disesuaikan', `${prod.name} diubah menjadi ${formatNumber(adjustedQty)} ${prod.unit}.`, 'success');
    }

    setIsAdjustModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              5.1 Inventory & Gudang
            </span>
            <span className="text-xs text-slate-500 font-mono">Valuasi Real-time</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Manajemen Stok & Kartu Mutasi Barang
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelacakan kuantitas stok bahan baku & produk jadi, nilai valuasi persediaan, dan penyesuaian opname gudang.
          </p>
        </div>

        <button
          onClick={() => {
            setAdjustItemType('MATERIAL');
            setAdjustItemId(rawMaterials[0]?.id || '');
            setAdjustedQty(rawMaterials[0]?.currentStock || 0);
            setIsAdjustModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Sliders className="w-4 h-4" />
          <span>Stock Opname / Penyesuaian</span>
        </button>
      </div>

      {/* Valuation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Valuasi Bahan Baku (Raw Material)</div>
          <div className="text-2xl font-black text-slate-800 font-mono mt-1">
            {formatRupiah(totalMaterialValuation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {rawMaterials.length} jenis item bahan aktif di gudang
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Valuasi Barang Jadi (Finished Goods)</div>
          <div className="text-2xl font-black text-slate-800 font-mono mt-1">
            {formatRupiah(totalProductValuation)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {products.length} SKU produk siap kirim / jual
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-4 rounded-2xl border border-emerald-900 shadow-sm">
          <div className="text-xs font-semibold text-emerald-300">Total Nilai Persediaan Keseluruhan</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {formatRupiah(totalMaterialValuation + totalProductValuation)}
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1">
            Metode Penilaian: Average Costing
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('MATERIALS')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'MATERIALS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Stok Bahan Baku ({rawMaterials.length})
          </button>
          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'PRODUCTS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Stok Barang Jadi ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('MOVEMENTS')}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'MOVEMENTS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Kartu Mutasi Gudang ({stockMovements.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari item persediaan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Tab 1: Raw Materials Stock Table */}
      {activeTab === 'MATERIALS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-3 px-4">Kode / Nama Bahan</th>
                  <th className="py-3 px-4 text-right">Stok Fisik Saat Ini</th>
                  <th className="py-3 px-4 text-center">Safety Stock (Min)</th>
                  <th className="py-3 px-4 text-right">Biaya Satuan Pokok</th>
                  <th className="py-3 px-4 text-right">Nilai Valuasi Total</th>
                  <th className="py-3 px-4 text-center">Status Keamanan</th>
                  <th className="py-3 px-4 text-center w-28">Opname</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((m) => {
                  const isLow = m.currentStock <= m.minStock;
                  const totalValue = m.currentStock * m.costPerUnit;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                        <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5 inline-block">
                          {m.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {formatNumber(m.currentStock)}
                        </span>{' '}
                        <span className="text-slate-500">{m.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                        {formatNumber(m.minStock)} {m.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        Rp {m.costPerUnit < 100 ? m.costPerUnit.toFixed(2) : Math.round(m.costPerUnit).toLocaleString('id-ID')} / {m.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(totalValue)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            isLow
                              ? 'bg-rose-100 text-rose-800 flex items-center justify-center gap-1'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isLow ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              Stok Menipis
                            </>
                          ) : (
                            'Aman'
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenAdjustment('MATERIAL', m.id, m.currentStock)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors"
                        >
                          Koreksi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Finished Goods Stock Table */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-3 px-4">SKU / Nama Produk</th>
                  <th className="py-3 px-4 text-right">Stok Fisik Siap Jual</th>
                  <th className="py-3 px-4 text-center">Batas Minimum</th>
                  <th className="py-3 px-4 text-right">HPP Standar</th>
                  <th className="py-3 px-4 text-right">Nilai Valuasi HPP</th>
                  <th className="py-3 px-4 text-right">Potensi Omset (Harga Jual)</th>
                  <th className="py-3 px-4 text-center w-28">Opname</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.currentStock <= p.minStock;
                  const totalHppVal = p.currentStock * p.estimatedHpp;
                  const totalSalesPotential = p.currentStock * p.sellingPrice;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 text-sm">{p.name}</div>
                        <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 mt-0.5 inline-block">
                          {p.sku}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {p.currentStock}
                        </span>{' '}
                        <span className="text-slate-500">{p.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-slate-600">
                        {p.minStock} {p.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        {formatRupiah(p.estimatedHpp)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(totalHppVal)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {formatRupiah(totalSalesPotential)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenAdjustment('PRODUCT', p.id, p.currentStock)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition-colors"
                        >
                          Koreksi
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Stock Movements Table */}
      {activeTab === 'MOVEMENTS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                  <th className="py-3 px-4">Tanggal & Waktu</th>
                  <th className="py-3 px-4">Item Mutasi</th>
                  <th className="py-3 px-4">Jenis Transaksi</th>
                  <th className="py-3 px-4">No. Dokumen Ref</th>
                  <th className="py-3 px-4 text-right">Jumlah Mutasi</th>
                  <th className="py-3 px-4 text-right">Nilai Total</th>
                  <th className="py-3 px-4">Catatan Opname / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((mov) => {
                  const isIn = mov.quantity > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-600">{mov.date}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{mov.itemName}</div>
                        <span className="text-[10px] text-slate-400">
                          {mov.itemType === 'MATERIAL' ? 'Bahan Baku' : 'Barang Jadi'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            mov.type === 'IN_PURCHASE'
                              ? 'bg-blue-100 text-blue-800'
                              : mov.type === 'IN_PRODUCTION'
                              ? 'bg-emerald-100 text-emerald-800'
                              : mov.type === 'OUT_PRODUCTION'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{mov.referenceNo}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isIn ? 'text-emerald-700' : 'text-rose-600'}>
                          {isIn ? `+${formatNumber(mov.quantity)}` : formatNumber(mov.quantity)} {mov.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800">
                        {formatRupiah(mov.totalValue)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs truncate">
                        {mov.notes}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Opname Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                Penyesuaian Fisik (Stock Opname)
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustItemType('MATERIAL');
                    setAdjustItemId(rawMaterials[0]?.id || '');
                    setAdjustedQty(rawMaterials[0]?.currentStock || 0);
                  }}
                  className={`text-xs font-bold py-1.5 rounded-lg transition-all ${
                    adjustItemType === 'MATERIAL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Bahan Baku
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustItemType('PRODUCT');
                    setAdjustItemId(products[0]?.id || '');
                    setAdjustedQty(products[0]?.currentStock || 0);
                  }}
                  className={`text-xs font-bold py-1.5 rounded-lg transition-all ${
                    adjustItemType === 'PRODUCT'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  Produk Jadi
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Item Barang
                </label>
                <select
                  value={adjustItemId}
                  onChange={(e) => {
                    setAdjustItemId(e.target.value);
                    if (adjustItemType === 'MATERIAL') {
                      const m = rawMaterials.find((item) => item.id === e.target.value);
                      if (m) setAdjustedQty(m.currentStock);
                    } else {
                      const p = products.find((item) => item.id === e.target.value);
                      if (p) setAdjustedQty(p.currentStock);
                    }
                  }}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {adjustItemType === 'MATERIAL'
                    ? rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.currentStock} {m.unit})
                        </option>
                      ))
                    : products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.currentStock} {p.unit})
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Fisik Nyata Baru
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustedQty}
                  onChange={(e) => setAdjustedQty(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-right text-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Penyesuaian / Catatan
                </label>
                <textarea
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Selisih timbangan, susut bahan, dll..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm"
                >
                  Simpan Koreksi Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
