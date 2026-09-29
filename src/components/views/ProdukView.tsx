import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { formatRupiah, formatPercent } from '../../utils/calculator';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Filter,
  X,
  Eye,
  Copy,
  Download,
  Upload,
  CheckCircle2,
  Image,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToExcel, downloadExcelTemplate, readExcelFile } from '../../utils/excelHelper';

export const ProdukView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, categories, setCurrentMenu, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('cat-p1');
  const [unit, setUnit] = useState('pcs');
  const [currentStock, setCurrentStock] = useState(0);
  const [minStock, setMinStock] = useState(10);
  const [targetMarginPct, setTargetMarginPct] = useState(40);
  const [estimatedHpp, setEstimatedHpp] = useState(25000);
  const [sellingPrice, setSellingPrice] = useState(40000);
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif' | 'Draft'>('Aktif');
  const [photoUrl, setPhotoUrl] = useState('');
  const [description, setDescription] = useState('');

  const productCategories = categories.filter((c) => c.type === 'PRODUCT');

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    const newSku = 'SKU-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setSku(newSku);
    setName('');
    setCategoryId(productCategories[0]?.id || 'cat-p1');
    setUnit('pcs');
    setCurrentStock(0);
    setMinStock(10);
    setTargetMarginPct(40);
    setEstimatedHpp(20000);
    setSellingPrice(35000);
    setStatus('Aktif');
    setPhotoUrl('https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=300&q=80');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setSku(p.sku);
    setName(p.name);
    setCategoryId(p.categoryId);
    setUnit(p.unit);
    setCurrentStock(p.currentStock);
    setMinStock(p.minStock);
    setTargetMarginPct(p.targetMarginPct);
    setEstimatedHpp(p.estimatedHpp);
    setSellingPrice(p.sellingPrice);
    setStatus(p.status);
    setPhotoUrl(p.photoUrl || '');
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleDuplicateProduct = (p: Product) => {
    const newSku = 'SKU-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    addProduct({
      ...p,
      sku: newSku,
      name: `${p.name} (Salinan)`,
      currentStock: 0,
    });
    showToast('Produk Diduplikasi', `Salinan produk ${p.name} berhasil dibuat.`, 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      updateProduct(editingProduct.id, {
        sku,
        name,
        categoryId,
        unit,
        currentStock,
        minStock,
        targetMarginPct,
        estimatedHpp,
        sellingPrice,
        status,
        photoUrl,
        description,
      });
    } else {
      addProduct({
        sku,
        name,
        categoryId,
        unit,
        currentStock,
        initialStock: currentStock,
        minStock,
        targetMarginPct,
        estimatedHpp,
        sellingPrice,
        status,
        photoUrl,
        description,
        channelPrices: {
          offline: sellingPrice,
          marketplace: Math.ceil((sellingPrice * 1.12) / 500) * 500,
          foodDelivery: Math.ceil((sellingPrice * 1.25) / 500) * 500,
          grosir: Math.ceil((sellingPrice * 0.82) / 500) * 500,
          reseller: Math.ceil((sellingPrice * 0.9) / 500) * 500,
        },
      });
    }
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const headers = [
      'Kode SKU',
      'Nama Produk',
      'Kategori',
      'Satuan',
      'HPP Standar',
      'Harga Jual',
      'Target Margin %',
      'Stok',
      'Min Stok',
      'Status',
      'Deskripsi',
    ];
    const rows = products.map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return [
        p.sku,
        p.name,
        cat?.name || '',
        p.unit,
        p.estimatedHpp,
        p.sellingPrice,
        p.targetMarginPct,
        p.currentStock,
        p.minStock,
        p.status,
        p.description || '',
      ];
    });
    exportToExcel('daftar-master-produk.xlsx', 'Master Produk', headers, rows);
    showToast('Ekspor Selesai', 'Data produk telah diunduh dalam format Excel (.xlsx).', 'success');
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Kode SKU',
      'Nama Produk',
      'Kategori',
      'Satuan',
      'HPP Standar',
      'Harga Jual',
      'Target Margin %',
      'Stok Awal',
      'Min Stok',
      'Status',
      'Deskripsi',
    ];
    const sampleRows = [
      ['PRD-004', 'Roti Sisir Mentega', 'Roti Manis', 'Pcs', 7500, 14000, 40, 50, 10, 'Aktif', 'Roti sisir lembut oles mentega spesial'],
      ['PRD-005', 'Donat Coklat Meses', 'Donat & Pastry', 'Pcs', 4500, 9000, 45, 100, 15, 'Aktif', 'Donat kentang empuk topping coklat premium'],
    ];
    downloadExcelTemplate('template-import-produk.xlsx', 'Template Produk', headers, sampleRows);
    showToast('Template Diunduh', 'File template Excel (.xlsx) produk berhasil diunduh.', 'info');
  };

  const handleProcessImport = async () => {
    if (!selectedFile) {
      showToast('Pilih File', 'Silakan pilih file Excel (.xlsx / .xls) terlebih dahulu.', 'warning');
      return;
    }
    setIsProcessingImport(true);
    try {
      const rows = await readExcelFile(selectedFile);
      if (rows.length < 2) {
        showToast('File Kosong', 'File Excel tidak memiliki baris data untuk diimpor.', 'warning');
        setIsProcessingImport(false);
        return;
      }

      let importedCount = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || !row[1]) continue;

        const skuVal = String(row[0] || `PRD-${String(products.length + importedCount + 1).padStart(3, '0')}`).trim();
        const nameVal = String(row[1]).trim();
        const catVal = String(row[2] || '').trim().toLowerCase();
        const matchedCat = categories.find((c) => c.name.toLowerCase().includes(catVal)) || categories[0];
        const unitVal = String(row[3] || 'pcs').trim();
        const hppVal = Number(row[4]) || 0;
        const sellingPriceVal = Number(row[5]) || 0;
        const targetMarginVal = Number(row[6]) || 40;
        const currentStockVal = Number(row[7]) || 0;
        const minStockVal = Number(row[8]) || 10;
        const statusVal = String(row[9] || 'Aktif').trim().toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';
        const descVal = String(row[10] || '');

        addProduct({
          sku: skuVal,
          name: nameVal,
          categoryId: matchedCat?.id || 'cat-p1',
          unit: unitVal,
          estimatedHpp: hppVal,
          sellingPrice: sellingPriceVal,
          targetMarginPct: targetMarginVal,
          currentStock: currentStockVal,
          minStock: minStockVal,
          initialStock: currentStockVal,
          status: statusVal as 'Aktif' | 'Nonaktif',
          description: descVal,
          channelPrices: {
            offline: sellingPriceVal,
            marketplace: Math.ceil((sellingPriceVal * 1.12) / 500) * 500,
            foodDelivery: Math.ceil((sellingPriceVal * 1.25) / 500) * 500,
            grosir: Math.ceil((sellingPriceVal * 0.82) / 500) * 500,
            reseller: Math.ceil((sellingPriceVal * 0.9) / 500) * 500,
          },
        });
        importedCount++;
      }

      showToast('Import Berhasil', `${importedCount} produk berhasil ditambahkan dari file Excel.`, 'success');
      setSelectedFile(null);
      setIsImportModalOpen(false);
    } catch {
      showToast('Gagal Import', 'Format file tidak sesuai atau file rusak. Harap gunakan template Excel yang disediakan.', 'error');
    } finally {
      setIsProcessingImport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Master Produk
            </span>
            <span className="text-xs text-slate-500 font-mono">{products.length} SKU Barang Jadi</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Daftar Produk & Standar HPP
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola katalog barang jadi, foto produk, harga jual, estimasi margin laba, dan formula resep BOM terkait.
          </p>
        </div>

        {/* Action Buttons: Tambah, Export, Import */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
            title="Ekspor seluruh data master produk ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
            title="Impor data master produk dari file Excel (.xlsx / .xls)"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Import Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama produk atau SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Semua Kategori ({products.length})</option>
            {productCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table with all fields */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Foto & Produk</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">HPP Standar</th>
                <th className="py-3 px-4 text-right">Harga Jual</th>
                <th className="py-3 px-4 text-right">Margin Riil</th>
                <th className="py-3 px-4 text-center">Stok</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const category = categories.find((c) => c.id === p.categoryId);
                const nominalMargin = p.sellingPrice - p.estimatedHpp;
                const marginPct = p.sellingPrice > 0 ? (nominalMargin / p.sellingPrice) * 100 : 0;
                const isLowStock = p.currentStock <= p.minStock;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.photoUrl || 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80'}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                              {p.sku}
                            </span>
                            <span className="text-[10px] text-slate-400">• Satuan: {p.unit}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {category?.name || 'Umum'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                      {formatRupiah(p.estimatedHpp)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      {formatRupiah(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${marginPct < p.targetMarginPct ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {formatPercent(marginPct)}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Target: {p.targetMarginPct}%
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                          isLowStock
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() =>
                          updateProduct(p.id, {
                            status: p.status === 'Aktif' ? 'Nonaktif' : 'Aktif',
                          })
                        }
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          p.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title="Klik untuk ubah status aktif/nonaktif"
                      >
                        {p.status}
                      </button>
                    </td>
                    {/* Aksi: Lihat, Edit, Hapus, Duplikasi */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Detail Produk"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Edit Produk"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg"
                          title="Duplikasi Produk"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus produk ${p.name}?`)) {
                              deleteProduct(p.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2.1.4 Detail Produk Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                  {viewingProduct.sku}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Detail Informasi Produk</h3>
              </div>
              <button onClick={() => setViewingProduct(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="flex items-center gap-4">
                <img
                  src={viewingProduct.photoUrl}
                  alt={viewingProduct.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-base font-bold text-slate-900">{viewingProduct.name}</h4>
                  <p className="text-slate-500 mt-1">{viewingProduct.description || 'Tidak ada deskripsi'}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Status: {viewingProduct.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400">Harga Pokok (HPP):</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {formatRupiah(viewingProduct.estimatedHpp)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Harga Jual Eceran:</div>
                  <div className="font-mono font-bold text-emerald-700 text-sm">
                    {formatRupiah(viewingProduct.sellingPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Target Margin:</div>
                  <div className="font-mono font-bold text-slate-700">{viewingProduct.targetMarginPct}%</div>
                </div>
                <div>
                  <div className="text-slate-400">Stok Saat Ini:</div>
                  <div className="font-mono font-bold text-slate-900">{viewingProduct.currentStock} {viewingProduct.unit}</div>
                </div>
              </div>

              {/* Riwayat Perubahan HPP */}
              {viewingProduct.hppHistory && viewingProduct.hppHistory.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 uppercase text-[11px]">Riwayat Perubahan HPP</h5>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {viewingProduct.hppHistory.map((h, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-semibold text-slate-800">{h.reason}</div>
                          <div className="text-slate-400 font-mono text-[10px]">{h.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900">{formatRupiah(h.newHpp)}</div>
                          <div className="text-[10px] text-amber-600 font-semibold">
                            +{formatRupiah(h.diffNominal)} (+{formatPercent(h.diffPercent)})
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.1.2 & 2.1.3 Tambah / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingProduct ? 'Edit Data Produk' : 'Tambah Produk Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Produk (SKU)</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {productCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Roti Sobek Cokelat"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center"
                    placeholder="pcs / box / jar"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Saat Ini</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batas Minimum</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HPP Standar (Rp)</label>
                  <input
                    type="number"
                    required
                    value={estimatedHpp}
                    onChange={(e) => setEstimatedHpp(Number(e.target.value))}
                    className="w-full font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full font-mono font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl text-right text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">URL Foto Produk</label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Import Data Produk (.xlsx / .xls)</h3>
                  <p className="text-[11px] text-slate-500">Impor massal katalog produk barang jadi</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Template Download Section */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-emerald-900 text-xs">Template Format Excel (.xlsx)</div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Gunakan template standar agar kolom sesuai dengan formulir produk.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Form columns description */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-semibold text-slate-700 text-[11px]">Kolom yang didukung (sesuai formulir):</div>
                <div className="flex flex-wrap gap-1 text-[10px] font-mono text-slate-600">
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Kode SKU</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Nama Produk</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Kategori</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Satuan</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">HPP Standar</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Harga Jual</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Target Margin %</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Stok Awal</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Min Stok</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Status</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Deskripsi</span>
                </div>
              </div>

              {/* File Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Pilih File Spreadsheet Excel (.xlsx / .xls):</label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
                />
                {selectedFile && (
                  <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>File siap diimpor: <strong>{selectedFile.name}</strong></span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || isProcessingImport}
                  onClick={handleProcessImport}
                  className={`px-4 py-2 font-bold text-white rounded-xl transition-all ${
                    !selectedFile || isProcessingImport
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 shadow-xs'
                  }`}
                >
                  {isProcessingImport ? 'Memproses...' : 'Proses Import Excel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
