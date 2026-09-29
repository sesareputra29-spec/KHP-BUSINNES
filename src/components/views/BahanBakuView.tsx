import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RawMaterial } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/calculator';
import {
  Database,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Filter,
  X,
  Eye,
  Download,
  Upload,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { exportToExcel, downloadExcelTemplate, readExcelFile } from '../../utils/excelHelper';

export const BahanBakuView: React.FC = () => {
  const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial, suppliers, categories, showToast } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<RawMaterial | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('cat-m1');
  const [unit, setUnit] = useState('gr');
  const [buyUnit, setBuyUnit] = useState('kg');
  const [conversionRatio, setConversionRatio] = useState(1000);
  const [buyPrice, setBuyPrice] = useState(15000);
  const [avgBuyPrice, setAvgBuyPrice] = useState(14500);
  const [currentStock, setCurrentStock] = useState(10000);
  const [minStock, setMinStock] = useState(2000);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || 'sup-1');
  const [shrinkagePct, setShrinkagePct] = useState(2.0);
  const [status, setStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  const materialCategories = categories.filter((c) => c.type === 'MATERIAL');

  const filteredMaterials = rawMaterials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || m.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setCode('BB-' + String(rawMaterials.length + 1).padStart(3, '0'));
    setName('');
    setCategoryId(materialCategories[0]?.id || 'cat-m1');
    setUnit('gr');
    setBuyUnit('kg');
    setConversionRatio(1000);
    setBuyPrice(20000);
    setAvgBuyPrice(19500);
    setCurrentStock(5000);
    setMinStock(1000);
    setSupplierId(suppliers[0]?.id || '');
    setShrinkagePct(2.0);
    setStatus('Aktif');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: RawMaterial) => {
    setEditingMaterial(m);
    setCode(m.code);
    setName(m.name);
    setCategoryId(m.categoryId);
    setUnit(m.unit);
    setBuyUnit(m.buyUnit);
    setConversionRatio(m.conversionRatio);
    setBuyPrice(m.buyPrice);
    setAvgBuyPrice(m.avgBuyPrice || m.buyPrice);
    setCurrentStock(m.currentStock);
    setMinStock(m.minStock);
    setSupplierId(m.supplierId);
    setShrinkagePct(m.shrinkagePct);
    setStatus(m.status || 'Aktif');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMaterial) {
      updateRawMaterial(editingMaterial.id, {
        code,
        name,
        categoryId,
        unit,
        buyUnit,
        conversionRatio,
        buyPrice,
        avgBuyPrice,
        currentStock,
        minStock,
        supplierId,
        shrinkagePct,
        status,
      });
    } else {
      addRawMaterial({
        code,
        name,
        categoryId,
        unit,
        buyUnit,
        conversionRatio,
        buyPrice,
        avgBuyPrice: buyPrice,
        initialStock: currentStock,
        currentStock,
        minStock,
        supplierId,
        shrinkagePct,
        status,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(false);
  };

  const handleExportExcel = () => {
    const headers = [
      'Kode Bahan',
      'Nama Bahan',
      'Kategori',
      'Satuan Beli',
      'Satuan Resep',
      'Rasio Konversi',
      'Harga Beli Satuan',
      'Harga Rata-rata',
      'Stok Fisik',
      'Stok Min',
      'Supplier',
      'Susut %',
      'Status',
    ];
    const rows = rawMaterials.map((m) => {
      const cat = categories.find((c) => c.id === m.categoryId);
      const sup = suppliers.find((s) => s.id === m.supplierId);
      return [
        m.code,
        m.name,
        cat?.name || '',
        m.buyUnit,
        m.unit,
        m.conversionRatio,
        m.buyPrice,
        m.avgBuyPrice,
        m.currentStock,
        m.minStock,
        sup?.name || '',
        m.shrinkagePct,
        m.status,
      ];
    });
    exportToExcel('daftar-master-bahan-baku.xlsx', 'Master Bahan Baku', headers, rows);
    showToast('Ekspor Selesai', 'Data bahan baku telah diunduh dalam format Excel (.xlsx).', 'success');
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'Kode Bahan',
      'Nama Bahan Baku',
      'Kategori',
      'Satuan Beli',
      'Satuan Resep',
      'Rasio Konversi',
      'Harga Beli Satuan',
      'Harga Rata-rata',
      'Stok Fisik',
      'Batas Min Stok',
      'Nama Supplier',
      'Susut %',
      'Status',
    ];
    const sampleRows = [
      ['BB-009', 'Tepung Terigu Segitiga Biru', 'Bahan Pokok', 'kg', 'gr', 1000, 13500, 13000, 25000, 5000, 'PT Bogasari', 1.5, 'Aktif'],
      ['BB-010', 'Mentega Wijsman 200gr', 'Dairy & Lemak', 'kaleng', 'gr', 200, 48000, 47500, 3000, 600, 'CV Sumber Boga', 2.0, 'Aktif'],
    ];
    downloadExcelTemplate('template-import-bahan-baku.xlsx', 'Template Bahan Baku', headers, sampleRows);
    showToast('Template Diunduh', 'File template Excel (.xlsx) bahan baku berhasil diunduh.', 'info');
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

        const codeVal = String(row[0] || `BB-${String(rawMaterials.length + importedCount + 1).padStart(3, '0')}`).trim();
        const nameVal = String(row[1]).trim();
        const catVal = String(row[2] || '').trim().toLowerCase();
        const matchedCat = categories.find((c) => c.name.toLowerCase().includes(catVal)) || categories[0];
        const buyUnitVal = String(row[3] || 'kg').trim();
        const unitVal = String(row[4] || 'gr').trim();
        const conversionVal = Number(row[5]) || 1000;
        const buyPriceVal = Number(row[6]) || 0;
        const avgBuyPriceVal = Number(row[7]) || buyPriceVal;
        const currentStockVal = Number(row[8]) || 0;
        const minStockVal = Number(row[9]) || 1000;
        const supVal = String(row[10] || '').trim().toLowerCase();
        const matchedSup = suppliers.find((s) => s.name.toLowerCase().includes(supVal)) || suppliers[0];
        const shrinkageVal = Number(row[11]) || 2.0;
        const statusVal = String(row[12] || 'Aktif').trim().toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';

        addRawMaterial({
          code: codeVal,
          name: nameVal,
          categoryId: matchedCat?.id || 'cat-m1',
          buyUnit: buyUnitVal,
          unit: unitVal,
          conversionRatio: conversionVal,
          buyPrice: buyPriceVal,
          avgBuyPrice: avgBuyPriceVal,
          currentStock: currentStockVal,
          initialStock: currentStockVal,
          minStock: minStockVal,
          supplierId: matchedSup?.id || '',
          shrinkagePct: shrinkageVal,
          status: statusVal as 'Aktif' | 'Nonaktif',
          lastUpdated: new Date().toISOString().slice(0, 10),
        });
        importedCount++;
      }

      showToast('Import Berhasil', `${importedCount} bahan baku baru berhasil ditambahkan dari file Excel.`, 'success');
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
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Master Bahan Baku
            </span>
            <span className="text-xs text-slate-500 font-mono">{rawMaterials.length} Jenis Bahan</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Daftar Bahan Baku & Riwayat Harga
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi lengkap harga beli terakhir vs rata-rata, konversi takaran, safety stock, dan supplier.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
            title="Ekspor seluruh data master bahan baku ke Excel (.xlsx)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
            title="Impor data bahan baku dari file Excel (.xlsx / .xls)"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Import Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bahan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kode atau nama bahan baku..."
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
            <option value="ALL">Semua Kategori ({rawMaterials.length})</option>
            {materialCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Kode & Nama Bahan</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Terakhir</th>
                <th className="py-3 px-4 text-right">Harga Rata-rata</th>
                <th className="py-3 px-4 text-right">Stok Fisik</th>
                <th className="py-3 px-4 text-center">Stok Min</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.map((m) => {
                const category = categories.find((c) => c.id === m.categoryId);
                const supplier = suppliers.find((s) => s.id === m.supplierId);
                const isLowStock = m.currentStock <= m.minStock;

                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 text-sm">{m.name}</div>
                      <span className="font-mono text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 mt-0.5 inline-block">
                        {m.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {category?.name || 'Umum'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(m.buyPrice)}
                      <div className="text-[10px] text-slate-400 font-normal">/ {m.buyUnit}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(m.avgBuyPrice || m.buyPrice)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className={`font-mono font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatNumber(m.currentStock)} {m.unit}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-500">
                      {formatNumber(m.minStock)} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-700 truncate max-w-[130px]">
                      {supplier?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() =>
                          updateRawMaterial(m.id, {
                            status: m.status === 'Aktif' ? 'Nonaktif' : 'Aktif',
                          })
                        }
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          m.status === 'Aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                        title="Klik untuk ubah status aktif/nonaktif"
                      >
                        {m.status || 'Aktif'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingMaterial(m)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Detail Bahan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Edit Bahan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus bahan baku ${m.name}?`)) {
                              deleteRawMaterial(m.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus Bahan"
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

      {/* 2.2.4 Detail Modal with Price History */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  {viewingMaterial.code}
                </span>
                <h3 className="font-bold text-slate-900 text-sm">Detail Bahan Baku</h3>
              </div>
              <button onClick={() => setViewingMaterial(null)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <h4 className="text-base font-bold text-slate-900">{viewingMaterial.name}</h4>
                <div className="text-slate-500 mt-0.5">Konversi: 1 {viewingMaterial.buyUnit} = {formatNumber(viewingMaterial.conversionRatio)} {viewingMaterial.unit}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-400">Harga Terakhir:</div>
                  <div className="font-mono font-bold text-slate-900 text-sm">
                    {formatRupiah(viewingMaterial.buyPrice)} / {viewingMaterial.buyUnit}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Harga Rata-rata:</div>
                  <div className="font-mono font-bold text-slate-700 text-sm">
                    {formatRupiah(viewingMaterial.avgBuyPrice || viewingMaterial.buyPrice)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Stok Saat Ini:</div>
                  <div className="font-mono font-bold text-slate-900">
                    {formatNumber(viewingMaterial.currentStock)} {viewingMaterial.unit}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Faktor Susut (Waste):</div>
                  <div className="font-mono font-bold text-amber-700">{viewingMaterial.shrinkagePct}%</div>
                </div>
              </div>

              {/* Price History */}
              {viewingMaterial.priceHistory && viewingMaterial.priceHistory.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-bold text-slate-800 uppercase text-[11px]">Riwayat Fluktuasi Harga Pembelian</h5>
                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                    {viewingMaterial.priceHistory.map((ph, idx) => (
                      <div key={idx} className="p-2.5 flex justify-between items-center text-[11px]">
                        <div>
                          <div className="font-semibold text-slate-800">{ph.poNumber || 'Pembelian PO'}</div>
                          <div className="text-slate-400 font-mono text-[10px]">{ph.date}</div>
                        </div>
                        <div className="font-mono font-bold text-slate-900">
                          {formatRupiah(ph.price)} / {viewingMaterial.buyUnit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingMaterial(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.2.2 & 2.2.3 Tambah / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">
                {editingMaterial ? 'Edit Bahan Baku' : 'Tambah Bahan Baku Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Bahan</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
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
                    {materialCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Contoh: Tepung Terigu Cakra"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan Beli</label>
                  <input
                    type="text"
                    required
                    value={buyUnit}
                    onChange={(e) => setBuyUnit(e.target.value)}
                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                    placeholder="kg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Satuan Resep</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                    placeholder="gr"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rasio Konversi</label>
                  <input
                    type="number"
                    required
                    value={conversionRatio}
                    onChange={(e) => setConversionRatio(Number(e.target.value))}
                    className="w-full text-right font-mono font-bold px-2 py-1.5 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Beli Terakhir (Rp)</label>
                  <input
                    type="number"
                    required
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(Number(e.target.value))}
                    className="w-full font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Susut / Waste %</label>
                  <input
                    type="number"
                    step="0.5"
                    value={shrinkagePct}
                    onChange={(e) => setShrinkagePct(Number(e.target.value))}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right text-amber-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Fisik ({unit})</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stok Minimum ({unit})</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(Number(e.target.value))}
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.paymentTerms})
                    </option>
                  ))}
                </select>
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
                  Simpan Bahan
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
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Import Data Bahan Baku (.xlsx / .xls)</h3>
                  <p className="text-[11px] text-slate-500">Impor massal inventori & harga bahan baku</p>
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
                    Gunakan template standar agar kolom sesuai dengan formulir bahan baku.
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
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Kode Bahan</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Nama Bahan Baku</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Kategori</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Satuan Beli</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Satuan Resep</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Rasio Konversi</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Harga Beli Satuan</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Harga Rata-rata</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Stok Fisik</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Batas Min Stok</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Nama Supplier</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Susut %</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Status</span>
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
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-xl p-1 bg-slate-50"
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
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-xs'
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
