import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PurchaseOrder, PurchaseOrderItem } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/calculator';
import {
  ShoppingCart,
  Plus,
  Search,
  CheckCircle2,
  Trash2,
  Printer,
  X,
  Truck,
  Building2,
  ArrowRight,
} from 'lucide-react';

export const PembelianView: React.FC = () => {
  const {
    purchaseOrders,
    addPurchaseOrder,
    updatePurchaseOrderStatus,
    suppliers,
    rawMaterials,
    showToast,
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [paymentTerms, setPaymentTerms] = useState('Tempo 14 Hari');
  const [shippingCost, setShippingCost] = useState(50000);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([
    {
      rawMaterialId: rawMaterials[0]?.id || '',
      rawMaterialName: rawMaterials[0]?.name || '',
      quantity: 25,
      unit: rawMaterials[0]?.buyUnit || 'kg',
      unitPrice: rawMaterials[0]?.buyPrice || 15000,
      subtotal: 25 * (rawMaterials[0]?.buyPrice || 15000),
    },
  ]);

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setPaymentTerms(suppliers[0]?.paymentTerms || 'Tempo 14 Hari');
    setShippingCost(50000);
    setPoItems([
      {
        rawMaterialId: rawMaterials[0]?.id || '',
        rawMaterialName: rawMaterials[0]?.name || '',
        quantity: 25,
        unit: rawMaterials[0]?.buyUnit || 'kg',
        unitPrice: rawMaterials[0]?.buyPrice || 15000,
        subtotal: 25 * (rawMaterials[0]?.buyPrice || 15000),
      },
    ]);
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    const mat = rawMaterials[0];
    setPoItems([
      ...poItems,
      {
        rawMaterialId: mat?.id || '',
        rawMaterialName: mat?.name || '',
        quantity: 10,
        unit: mat?.buyUnit || 'kg',
        unitPrice: mat?.buyPrice || 10000,
        subtotal: 10 * (mat?.buyPrice || 10000),
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof PurchaseOrderItem, val: any) => {
    const updated = [...poItems];
    const item = { ...updated[index], [field]: val };

    if (field === 'rawMaterialId') {
      const selected = rawMaterials.find((m) => m.id === val);
      if (selected) {
        item.rawMaterialName = selected.name;
        item.unit = selected.buyUnit;
        item.unitPrice = selected.buyPrice;
        item.subtotal = item.quantity * selected.buyPrice;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      item.subtotal = item.quantity * item.unitPrice;
    }

    updated[index] = item;
    setPoItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setPoItems(poItems.filter((_, idx) => idx !== index));
  };

  const itemsSubtotal = poItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = itemsSubtotal + shippingCost;

  const handleCreatePo = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) return;

    const poNumber = `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`;
    addPurchaseOrder({
      poNumber,
      date: new Date().toISOString().split('T')[0],
      supplierId: sup.id,
      supplierName: sup.name,
      items: poItems,
      subtotal: itemsSubtotal,
      shippingCost,
      taxAmount: 0,
      totalAmount,
      status: 'Dipesan',
      paymentTerms,
    });

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              5.2 Pembelian Bahan Baku
            </span>
            <span className="text-xs text-slate-500 font-mono">Purchase Order (PO)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Pengadaan Bahan & Sinkronisasi Biaya Otomatis
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Penerimaan faktur PO otomatis menambah stok fisik bahan baku serta memperbarui harga pokok rata-rata per unit secara real-time.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Pesanan Pembelian (PO)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor PO atau nama supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {['ALL', 'Dipesan', 'Diterima', 'Lunas'].map((st) => (
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

      {/* PO List Cards / Table */}
      <div className="space-y-4">
        {filteredOrders.map((po) => {
          const isReceived = po.status === 'Diterima' || po.status === 'Lunas';

          return (
            <div
              key={po.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    {po.poNumber}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{po.supplierName}</h3>
                    <div className="text-[10px] text-slate-400">
                      Tanggal: {po.date} • Syarat: {po.paymentTerms}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      po.status === 'Lunas'
                        ? 'bg-emerald-100 text-emerald-800'
                        : po.status === 'Diterima'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}
                  >
                    {po.status}
                  </span>

                  {!isReceived && (
                    <button
                      onClick={() => updatePurchaseOrderStatus(po.id, 'Diterima')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Terima Barang (Masuk Gudang)</span>
                    </button>
                  )}
                  {po.status === 'Diterima' && (
                    <button
                      onClick={() => updatePurchaseOrderStatus(po.id, 'Lunas')}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                    >
                      Tandai Lunas
                    </button>
                  )}
                </div>
              </div>

              {/* Items List inside PO */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 font-semibold text-[11px] border-b border-slate-100">
                      <th className="py-1.5 px-2">Bahan Baku Dipesan</th>
                      <th className="py-1.5 px-2 text-right">Kuantitas</th>
                      <th className="py-1.5 px-2 text-right">Harga Satuan Beli</th>
                      <th className="py-1.5 px-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {po.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-medium text-slate-800">
                          {item.rawMaterialName}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-700">
                          {formatNumber(item.quantity)} {item.unit}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer Total */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-slate-500">
                  Ongkir: <span className="font-mono text-slate-700">{formatRupiah(po.shippingCost)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-slate-500 font-medium">Total Nilai PO:</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {formatRupiah(po.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add PO Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                Penerbitan Purchase Order (PO) Bahan Baku
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePo} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pilih Supplier
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                      setSelectedSupplierId(e.target.value);
                      const s = suppliers.find((sup) => sup.id === e.target.value);
                      if (s) setPaymentTerms(s.paymentTerms);
                    }}
                    className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Syarat Pembayaran
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Items Line */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Daftar Bahan yang Dipesan
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {poItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center text-xs"
                    >
                      <div className="sm:col-span-2">
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => handleUpdateItem(idx, 'rawMaterialId', e.target.value)}
                          className="w-full bg-white px-2 py-1.5 rounded-lg border border-slate-200 font-medium"
                        >
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.buyUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'quantity', Number(e.target.value))
                          }
                          className="w-full text-right font-mono bg-white px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                        <span className="text-[11px] text-slate-500 w-12">{item.unit}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'unitPrice', Number(e.target.value))
                          }
                          className="w-full text-right font-mono bg-white px-2 py-1.5 rounded-lg border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Biaya Ekspedisi / Ongkir (Rp)
                  </label>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right">
                  <div className="text-[10px] text-slate-400">Total Nilai Tagihan:</div>
                  <div className="text-xl font-black font-mono text-emerald-700">
                    {formatRupiah(totalAmount)}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                >
                  Terbitkan Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
