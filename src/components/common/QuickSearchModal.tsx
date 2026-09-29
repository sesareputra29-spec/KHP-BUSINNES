import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { MenuId } from '../../types';
import {
  Search,
  Calculator,
  Package,
  Layers,
  Factory,
  BarChart3,
  TrendingUp,
  Warehouse,
  FileText,
  Settings,
  X,
  ArrowRight,
  Database,
} from 'lucide-react';

interface SearchItem {
  id: MenuId;
  title: string;
  category: string;
  keywords: string;
  icon: React.ReactNode;
}

const searchableMenuItems: SearchItem[] = [
  { id: '1.1', title: 'Dashboard Utama', category: 'UTAMA', keywords: 'ringkasan kpi grafik omset profit hpp', icon: <BarChart3 className="w-4 h-4" /> },
  { id: '1.2', title: 'Kalkulator HPP Interaktif', category: 'UTAMA', keywords: 'hitung hpp resep bahan baku btkl bop susut harga jual margin', icon: <Calculator className="w-4 h-4" /> },
  { id: '2.1', title: 'Master Produk', category: 'MASTER DATA', keywords: 'daftar produk barang jadi sku harga margin stok', icon: <Package className="w-4 h-4" /> },
  { id: '2.2', title: 'Master Bahan Baku', category: 'MASTER DATA', keywords: 'raw material harga beli satuan susut safety stock', icon: <Database className="w-4 h-4" /> },
  { id: '2.3', title: 'Master Supplier', category: 'MASTER DATA', keywords: 'vendor pemasok kontak tempo bayar', icon: <Factory className="w-4 h-4" /> },
  { id: '3.1', title: 'BOM / Resep Produksi', category: 'PRODUKSI & HPP', keywords: 'bill of materials resep batch yield komposisi biaya', icon: <Layers className="w-4 h-4" /> },
  { id: '3.2', title: 'Surat Perintah & Riwayat Produksi', category: 'PRODUKSI & HPP', keywords: 'spk batch output aktual variansi efisiensi', icon: <Factory className="w-4 h-4" /> },
  { id: '3.3', title: 'Perhitungan HPP Formal', category: 'PRODUKSI & HPP', keywords: 'full costing variable costing rekonsiliasi hpp', icon: <Calculator className="w-4 h-4" /> },
  { id: '4.1', title: 'Penetapan Harga & Margin Kanal', category: 'HARGA & PROFITABILITAS', keywords: 'pricing marketplace shopee tokped grabfood gofood grosir fee', icon: <TrendingUp className="w-4 h-4" /> },
  { id: '4.2', title: 'Analisis Profitabilitas Produk', category: 'HARGA & PROFITABILITAS', keywords: 'margin matrix profit star dog cash cow laba', icon: <BarChart3 className="w-4 h-4" /> },
  { id: '5.1', title: 'Manajemen Inventory & Kartu Stok', category: 'INVENTORY & PEMBELIAN', keywords: 'stok gudang mutasi stock opname minimum stock', icon: <Warehouse className="w-4 h-4" /> },
  { id: '5.2', title: 'Pembelian Bahan Baku (PO)', category: 'INVENTORY & PEMBELIAN', keywords: 'purchase order po faktur pembelian order suplier', icon: <FileText className="w-4 h-4" /> },
  { id: '6.1', title: 'Analisis Komposisi HPP & Pareto', category: 'ANALISIS & SIMULASI', keywords: 'komposisi 80/20 biaya terbesar pareto pie chart', icon: <BarChart3 className="w-4 h-4" /> },
  { id: '6.2', title: 'Simulasi Kenaikan Biaya (What-If)', category: 'ANALISIS & SIMULASI', keywords: 'simulasi inflasi bahan baku naik bop naik dampak laba', icon: <TrendingUp className="w-4 h-4" /> },
  { id: '6.3', title: 'Titik Impas (BEP) & Sensitivitas', category: 'ANALISIS & SIMULASI', keywords: 'break even point bep rupiah unit margin of safety', icon: <Calculator className="w-4 h-4" /> },
  { id: '7.1', title: 'Laporan & Rekapitulasi Lengkap', category: 'LAPORAN', keywords: 'rekap hpp laporan produksi kartu stok laba rugi print pdf', icon: <FileText className="w-4 h-4" /> },
  { id: '8.1', title: 'Profil Pengguna', category: 'SISTEM', keywords: 'akun foto profil nama email password', icon: <Settings className="w-4 h-4" /> },
  { id: '8.2', title: 'Manajemen Pengguna', category: 'SISTEM', keywords: 'tambah user akun karyawan tim role', icon: <Settings className="w-4 h-4" /> },
  { id: '8.3', title: 'Role & Hak Akses', category: 'SISTEM', keywords: 'permission matrix wewenang staf akuntan', icon: <Settings className="w-4 h-4" /> },
  { id: '8.4.1', title: 'Kategori Produk', category: 'SISTEM / PENGATURAN', keywords: 'kelompok produk bakery snack minuman', icon: <Settings className="w-4 h-4" /> },
  { id: '8.4.2', title: 'Kategori Bahan Baku', category: 'SISTEM / PENGATURAN', keywords: 'kategori tepung rempah bumbu kemasan', icon: <Settings className="w-4 h-4" /> },
  { id: '8.4.3', title: 'Satuan Ukuran & Konversi', category: 'SISTEM / PENGATURAN', keywords: 'unit of measure kg gr liter ml pcs rasio', icon: <Settings className="w-4 h-4" /> },
  { id: '8.4.4', title: 'Pengaturan Metode HPP', category: 'SISTEM / PENGATURAN', keywords: 'default full costing variable susut scrap', icon: <Settings className="w-4 h-4" /> },
  { id: '8.4.5', title: 'Pengaturan Tarif Biaya', category: 'SISTEM / PENGATURAN', keywords: 'upah btkl per jam bop tetap bulanan listrik', icon: <Settings className="w-4 h-4" /> },
  { id: '8.4.6', title: 'Pengaturan Perusahaan', category: 'SISTEM / PENGATURAN', keywords: 'nama pt cv npwp alamat kontak logo', icon: <Settings className="w-4 h-4" /> },
  { id: '8.5', title: 'Import Data CSV / Excel', category: 'SISTEM', keywords: 'unggah impor csv master produk bahan', icon: <Database className="w-4 h-4" /> },
  { id: '8.6', title: 'Export Data', category: 'SISTEM', keywords: 'unduh ekspor csv json master data', icon: <Database className="w-4 h-4" /> },
  { id: '8.7', title: 'Backup & Restore', category: 'SISTEM', keywords: 'cadangkan pulihkan database reset default', icon: <Database className="w-4 h-4" /> },
  { id: '8.8', title: 'Log Aktivitas & Audit Trail', category: 'SISTEM', keywords: 'histori catatan riwayat perubahan user', icon: <FileText className="w-4 h-4" /> },
  { id: '8.9', title: 'Panduan & Glosarium HPP', category: 'SISTEM', keywords: 'buku panduan tutorial bantuan istilah rumus', icon: <FileText className="w-4 h-4" /> },
];

export const QuickSearchModal: React.FC = () => {
  const { isQuickSearchOpen, setIsQuickSearchOpen, setCurrentMenu, products, rawMaterials } = useApp();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(!isQuickSearchOpen);
      }
      if (e.key === 'Escape' && isQuickSearchOpen) {
        setIsQuickSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickSearchOpen, setIsQuickSearchOpen]);

  if (!isQuickSearchOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const filteredMenus = searchableMenuItems.filter(
    (item) =>
      item.title.toLowerCase().includes(normalizedQuery) ||
      item.category.toLowerCase().includes(normalizedQuery) ||
      item.keywords.toLowerCase().includes(normalizedQuery)
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(normalizedQuery) ||
      p.sku.toLowerCase().includes(normalizedQuery)
  ).slice(0, 3);

  const filteredMaterials = rawMaterials.filter(
    (m) =>
      m.name.toLowerCase().includes(normalizedQuery) ||
      m.code.toLowerCase().includes(normalizedQuery)
  ).slice(0, 3);

  const handleSelectMenu = (id: MenuId) => {
    setCurrentMenu(id);
    setIsQuickSearchOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            placeholder="Cari menu, produk, bahan baku, atau fitur HPP... (Tekan ESC untuk tutup)"
            className="w-full text-slate-800 placeholder-slate-400 text-sm font-medium focus:outline-none bg-transparent"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded border border-slate-200">
            ESC
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {/* Menu Matches */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
              Menu & Fitur ({filteredMenus.length})
            </div>
            <div className="space-y-1">
              {filteredMenus.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectMenu(item.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 group-hover:text-emerald-950">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-400 group-hover:text-emerald-700/70">
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100" />
                </button>
              ))}
              {filteredMenus.length === 0 && (
                <p className="text-xs text-slate-400 px-3 py-2">Tidak ada menu yang cocok dengan kata kunci.</p>
              )}
            </div>
          </div>

          {/* Product shortcuts */}
          {filteredProducts.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Produk Terkait
              </div>
              <div className="space-y-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectMenu('2.1')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                        {p.sku}
                      </span>
                      <span className="text-xs font-medium text-slate-700">{p.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">
                      HPP: Rp {Math.round(p.estimatedHpp).toLocaleString('id-ID')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Raw Material shortcuts */}
          {filteredMaterials.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                Bahan Baku Terkait
              </div>
              <div className="space-y-1">
                {filteredMaterials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMenu('2.2')}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                        {m.code}
                      </span>
                      <span className="text-xs font-medium text-slate-700">{m.name}</span>
                    </div>
                    <span className="text-xs text-slate-500">
                      Stok: {m.currentStock.toLocaleString('id-ID')} {m.unit}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Gunakan panah untuk navigasi atau klik item</span>
          <span className="font-mono">Pintasan: Ctrl+K / Cmd+K</span>
        </div>
      </div>
    </div>
  );
};
