import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Supplier, PurchaseOrder } from '../../types';
import { formatRupiah } from '../../utils/calculator';
import {
  Factory,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Star,
  X,
  CreditCard,
  Eye,
  History,
  ShoppingCart,
  CheckCircle2,
} from 'lucide-react';

export const SupplierView: React.FC = () => {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, rawMaterials, purchaseOrders } = useApp();

  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Tempo 14 Hari');
  const [rating, setRating] = useState(4.8);
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setCode('SUP-' + String(suppliers.length + 1).padStart(3, '0'));
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setPaymentTerms('Tempo 14 Hari');
    setRating(5.0);
    setStatus('Aktif');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setCode(s.code);
    setName(s.name);
    setContactPerson(s.contactPerson);
    setPhone(s.phone);
    setEmail(s.email);
    setAddress(s.address);
    setPaymentTerms(s.paymentTerms);
    setRating(s.rating);
    setStatus(s.status || 'Aktif');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        code,
        name,
        contactPerson,
        phone,
        email,
        address,
        paymentTerms,
        rating,
        status,
      });
    } else {
      addSupplier({
        code,
        name,
        contactPerson,
        phone,
        email,
        address,
        paymentTerms,
        rating,
        status,
        suppliedMaterialsCount: 0,
      });
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Master Supplier
            </span>
            <span className="text-xs text-slate-500 font-mono">{suppliers.length} Vendor Terdaftar</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Daftar Supplier & Riwayat Pembelian
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola data vendor, kontak narahubung (PIC), syarat pembayaran (TOP), rating performa, dan riwayat pesanan faktur.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Supplier</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama supplier, PIC, atau kode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* Supplier Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((s) => {
          const suppliedCount = rawMaterials.filter((m) => m.supplierId === s.id).length;
          const relatedPos = purchaseOrders.filter((po) => po.supplierId === s.id);

          return (
            <div
              key={s.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {s.code}
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm mt-1.5">{s.name}</h3>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-200/60">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{s.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Factory className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">PIC: {s.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{s.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-slate-500 line-clamp-2">{s.address}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] text-slate-400">Termin:</div>
                  <div className="font-semibold text-slate-700 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-emerald-600" />
                    {s.paymentTerms}
                  </div>
                </div>

                {/* Actions: Detail, Riwayat PO, Edit, Hapus */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewingSupplier(s)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Detail Supplier"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setHistorySupplier(s)}
                    className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="Riwayat Pembelian PO"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                    title="Edit Supplier"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus supplier ${s.name}?`)) {
                        deleteSupplier(s.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Hapus Supplier"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2.3.4 Detail Supplier Modal */}
      {viewingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {viewingSupplier.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Detail Profil Supplier</h3>
              </div>
              <button onClick={() => setViewingSupplier(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">{viewingSupplier.name}</h4>
                <div className="text-slate-500 mt-1">{viewingSupplier.address}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400">Kontak Person:</div>
                  <div className="font-bold text-slate-800">{viewingSupplier.contactPerson}</div>
                </div>
                <div>
                  <div className="text-slate-400">Telepon / WhatsApp:</div>
                  <div className="font-mono font-bold text-slate-800">{viewingSupplier.phone}</div>
                </div>
                <div>
                  <div className="text-slate-400">Email:</div>
                  <div className="font-medium text-slate-800">{viewingSupplier.email}</div>
                </div>
                <div>
                  <div className="text-slate-400">Termin Pembayaran:</div>
                  <div className="font-bold text-emerald-700">{viewingSupplier.paymentTerms}</div>
                </div>
              </div>

              {/* Daftar Bahan yang Dipasok */}
              <div>
                <h5 className="font-bold text-slate-800 uppercase text-[11px] mb-2">Bahan Baku yang Dipasok</h5>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {rawMaterials.filter((m) => m.supplierId === viewingSupplier.id).map((m) => (
                    <div key={m.id} className="p-2.5 flex justify-between items-center text-[11px]">
                      <div>
                        <div className="font-bold text-slate-800">{m.name}</div>
                        <div className="text-slate-400 font-mono text-[10px]">{m.code}</div>
                      </div>
                      <div className="font-mono font-bold text-slate-900">
                        {formatRupiah(m.buyPrice)} / {m.buyUnit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingSupplier(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.3.5 Riwayat Pembelian PO Modal */}
      {historySupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {historySupplier.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm mt-1">
                  Riwayat Pembelian: {historySupplier.name}
                </h3>
              </div>
              <button onClick={() => setHistorySupplier(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {purchaseOrders.filter((po) => po.supplierId === historySupplier.id).length === 0 ? (
                <div className="p-8 text-center text-slate-400">Belum ada riwayat pesanan pembelian untuk supplier ini.</div>
              ) : (
                <div className="space-y-3">
                  {purchaseOrders
                    .filter((po) => po.supplierId === historySupplier.id)
                    .map((po) => (
                      <div key={po.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-bold text-blue-700">{po.poNumber}</span>
                          <span className="font-semibold text-slate-500">{po.date}</span>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            {po.status}
                          </span>
                        </div>
                        <div className="divide-y divide-slate-200/50">
                          {po.items.map((item, idx) => (
                            <div key={idx} className="py-1 flex justify-between text-slate-700">
                              <span>{item.rawMaterialName} ({item.quantity} {item.unit})</span>
                              <span className="font-mono font-bold">{formatRupiah(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                          <span>Total Tagihan:</span>
                          <span className="font-mono text-emerald-700">{formatRupiah(po.totalAmount)}</span>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistorySupplier(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.3.2 & 2.3.3 Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingSupplier ? 'Edit Supplier' : 'Tambah Supplier Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Supplier</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rating Kehandalan (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Perusahaan / Supplier</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: PT Sukses Pangan Makmur"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kontak Person (PIC)</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / Telepon</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Termin Pembayaran</label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    placeholder="Contoh: Tempo 14 Hari / Cash"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Gudang / Kantor</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
