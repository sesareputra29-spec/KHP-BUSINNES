import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MenuId } from '../../types';
import { formatRupiah, formatPercent, formatNumber } from '../../utils/calculator';
import {
  Database,
  ShoppingCart,
  DollarSign,
  Warehouse,
  Layers,
  Factory,
  Package,
  TrendingUp,
  PieChart,
  SlidersHorizontal,
  FileBarChart,
  LayoutDashboard,
  ArrowDown,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  ChevronRight,
  Workflow,
} from 'lucide-react';

export interface PipelineStage {
  id: string;
  stepNumber: number;
  name: string;
  menuId: MenuId;
  menuLabel: string;
  icon: React.ElementType;
  badgeColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  description: string;
  upstream: string;
  downstream: string;
  inputData: string[];
  outputData: string[];
  triggerAction: string;
  liveStatsSummary: (app: ReturnType<typeof useApp>) => { label: string; value: string };
  detailsExplanation: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: 'master-bahan',
    stepNumber: 1,
    name: 'MASTER BAHAN BAKU',
    menuId: '2.2',
    menuLabel: 'Bahan Baku',
    icon: Database,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    borderColor: 'border-amber-300',
    bgColor: 'bg-amber-50/70',
    textColor: 'text-amber-800',
    description: 'Fondasi utama katalog seluruh bahan mentah, spesifikasi takaran resep, unit beli vs resep, dan toleransi susut (shrinkage).',
    upstream: 'Master referensi / Supplier penyuplai',
    downstream: 'PEMBELIAN & HARGA BAHAN',
    inputData: ['Kode Bahan', 'Nama Bahan', 'Satuan Beli & Resep', 'Rasio Konversi (kg ke gr/ml)', 'Toleransi Susut (Waste %)'],
    outputData: ['Katalog Bahan Baku Terdaftar', 'Unit Cost per Takaran Resep'],
    triggerAction: 'Pendaftaran bahan baru atau update spesifikasi bahan',
    liveStatsSummary: (app) => ({
      label: 'Bahan Terdaftar',
      value: `${app.rawMaterials.length} Item Master`,
    }),
    detailsExplanation:
      'Setiap item bahan baku menyimpan rasio konversi unit (misal 1 kg = 1000 gr) dan persentase susut. Data ini menjadi basis perhitungan belanja dan penimbangan resep masakan/produksi.',
  },
  {
    id: 'pembelian',
    stepNumber: 2,
    name: 'PEMBELIAN',
    menuId: '5.2',
    menuLabel: 'Pembelian (PO)',
    icon: ShoppingCart,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    borderColor: 'border-blue-300',
    bgColor: 'bg-blue-50/70',
    textColor: 'text-blue-800',
    description: 'Proses pengadaan bahan baku ke vendor melalui Purchase Order (PO), pencatatan faktur, harga beli per partai, dan biaya ongkir.',
    upstream: 'MASTER BAHAN BAKU & SUPPLIER',
    downstream: 'HARGA BAHAN & INVENTORY',
    inputData: ['Daftar Bahan Dipesan', 'Harga Faktur Supplier', 'Biaya Ekspedisi / Ongkir', 'Termin Pembayaran'],
    outputData: ['Nomor PO Sah', 'Faktur Masuk', 'Validasi Penerimaan Barang'],
    triggerAction: 'Penerbitan PO baru & Verifikasi Barang Diterima Gudang',
    liveStatsSummary: (app) => ({
      label: 'Faktur Pengadaan',
      value: `${app.purchaseOrders.length} PO Terdata`,
    }),
    detailsExplanation:
      'Ketika Purchase Order (PO) disetujui dan ditandai "Diterima", sistem secara otomatis memicu pembaruan harga modal dan menambah kuantitas stok di gudang.',
  },
  {
    id: 'harga-bahan',
    stepNumber: 3,
    name: 'HARGA BAHAN',
    menuId: '2.2',
    menuLabel: 'Fluktuasi Harga',
    icon: DollarSign,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-300',
    bgColor: 'bg-emerald-50/70',
    textColor: 'text-emerald-800',
    description: 'Kalkulasi harga beli aktual terakhir (Last Buy Price), harga rata-rata bergerak (Moving Average), serta konversi harga ke satuan resep (gr/ml).',
    upstream: 'PEMBELIAN (FAKTUR MASUK)',
    downstream: 'INVENTORY & BOM / RESEP',
    inputData: ['Harga Faktur Terbaru', 'Biaya Pengiriman per Unit', 'Rasio Konversi Unit'],
    outputData: ['Cost Per Unit Resep (Rp/gr atau Rp/ml)', 'Moving Average Price', 'Riwayat Fluktuasi Harga'],
    triggerAction: 'Kedatangan PO baru atau penyesuaian manual harga pasar',
    liveStatsSummary: (app) => {
      const highestPrice = Math.max(...app.rawMaterials.map((m) => m.costPerUnit), 0);
      return {
        label: 'Update Terakhir',
        value: `${app.rawMaterials.length} Bahan Terkoreksi`,
      };
    },
    detailsExplanation:
      'Harga bahan dihitung presisi hingga unit terkecil resep. Bila tepung terigu dibeli Rp 14.000/kg, maka sistem menetapkan Rp 14,00/gr sebagai basis hitung resep.',
  },
  {
    id: 'inventory',
    stepNumber: 4,
    name: 'INVENTORY',
    menuId: '5.1',
    menuLabel: 'Inventory Gudang',
    icon: Warehouse,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    borderColor: 'border-indigo-300',
    bgColor: 'bg-indigo-50/70',
    textColor: 'text-indigo-800',
    description: 'Manajemen fisik gudang bahan baku dan barang jadi, kartu stok mutasi, batas stok minimum (reorder point), dan valuasi aset persediaan.',
    upstream: 'PEMBELIAN (Masuk) & PRODUKSI (Keluar/Masuk Jadi)',
    downstream: 'BOM / RESEP & PRODUKSI',
    inputData: ['Barang Masuk PO', 'Pengeluaran Bahan untuk Batch', 'Penyesuaian Stock Opname'],
    outputData: ['Saldo Stok Fisik Real-Time', 'Kartu Stok Mutasi', 'Total Valuasi Nilai Gudang (Rp)'],
    triggerAction: 'Penerimaan PO, eksekusi pemakaian batch, atau penyesuaian opname',
    liveStatsSummary: (app) => {
      const rawVal = app.rawMaterials.reduce((sum, m) => sum + m.currentStock * m.costPerUnit, 0);
      return {
        label: 'Valuasi Bahan',
        value: formatRupiah(rawVal),
      };
    },
    detailsExplanation:
      'Gudang memantau ketersediaan bahan agar proses produksi tidak terhenti karena kehabisan stok. Stok berkurang saat SPK jalan, dan bertambah saat PO tiba.',
  },
  {
    id: 'bom-resep',
    stepNumber: 5,
    name: 'BOM / RESEP',
    menuId: '3.1',
    menuLabel: 'Bill of Materials',
    icon: Layers,
    badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    borderColor: 'border-cyan-300',
    bgColor: 'bg-cyan-50/70',
    textColor: 'text-cyan-800',
    description: 'Formula standar produksi yang merangkum bahan baku (dengan faktor susut), alokasi tenaga kerja langsung (BTKL), overhead pabrik (BOP), dan kemasan.',
    upstream: 'HARGA BAHAN & INVENTORY',
    downstream: 'PRODUKSI & HPP PRODUK',
    inputData: ['Daftar Bahan & Takaran Netto', 'Persentase Susut Masak', 'Jam Tenaga Kerja', 'BOP Pabrik', 'Biaya Dus/Kemasan'],
    outputData: ['Total Biaya Standar per Batch', 'Yield Hasil Jadi', 'HPP Standar BOM per Unit'],
    triggerAction: 'Penyusunan atau update formula resep produk',
    liveStatsSummary: (app) => ({
      label: 'Formula Resep',
      value: `${app.boms.length} Formula Aktif`,
    }),
    detailsExplanation:
      'BOM adalah cetak biru manufaktur. Setiap resep menghitung biaya bahan kotor (gross) setelah susut, ditambah upah tukang dan biaya listrik/gas per batch.',
  },
  {
    id: 'produksi',
    stepNumber: 6,
    name: 'PRODUKSI',
    menuId: '3.2',
    menuLabel: 'Eksekusi Batch & SPK',
    icon: Factory,
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    borderColor: 'border-purple-300',
    bgColor: 'bg-purple-50/70',
    textColor: 'text-purple-800',
    description: 'Eksekusi operasional pabrik/dapur berdasarkan Surat Perintah Kerja (SPK), pencatatan output riil jadi, pemakaian aktual bahan, dan variansi biaya.',
    upstream: 'BOM / RESEP & INVENTORY',
    downstream: 'HPP PRODUK & INVENTORY (BARANG JADI)',
    inputData: ['Target Rencana Batch', 'BOM Acuan', 'Realisasi Bahan Dipakai', 'Hasil Output Jadi Nyata'],
    outputData: ['Nomor Batch/SPK Selesai', 'Biaya Riil Dikeluarkan', 'Variansi Biaya (Favorable/Unfavorable)'],
    triggerAction: 'Penerbitan SPK, pemrosesan batch, dan penyelesaian produksi',
    liveStatsSummary: (app) => ({
      label: 'Total Batch',
      value: `${app.batches.length} Batch Selesai/Aktif`,
    }),
    detailsExplanation:
      'Pada tahap ini terjadi realisasi nyata. Selisih antara takaran standar resep dengan kenyataan di dapur dihitung sebagai variansi efisiensi biaya produksi.',
  },
  {
    id: 'hpp-produk',
    stepNumber: 7,
    name: 'HPP PRODUK',
    menuId: '3.3',
    menuLabel: 'Perhitungan HPP',
    icon: Package,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    borderColor: 'border-emerald-300',
    bgColor: 'bg-emerald-50/70',
    textColor: 'text-emerald-800',
    description: 'Penetapan Harga Pokok Produksi definitif per satuan unit produk jadi, baik menggunakan metode Full Costing (standar pajak) maupun Variable Costing.',
    upstream: 'PRODUKSI & BOM / RESEP',
    downstream: 'HARGA & MARGIN',
    inputData: ['Biaya Standar Resep', 'Biaya Aktual Batch Produksi', 'Jumlah Output Jadi Efektif'],
    outputData: ['HPP Pokok / Unit Final', 'Riwayat Perubahan HPP Produk', 'Komposisi Struktur Biaya Pokok'],
    triggerAction: 'Penyelesaian batch produksi atau penetapan resmi HPP standar produk',
    liveStatsSummary: (app) => {
      const avg = app.products.length > 0
        ? app.products.reduce((s, p) => s + p.estimatedHpp, 0) / app.products.length
        : 0;
      return {
        label: 'Rata-rata HPP',
        value: formatRupiah(avg),
      };
    },
    detailsExplanation:
      'HPP definitif per unit menjadi acuan mutlak bisnis. Nilai ini yang menentukan batas bawah harga agar perusahaan tidak menjual barang di bawah modal modal (rugi).',
  },
  {
    id: 'harga-margin',
    stepNumber: 8,
    name: 'HARGA & MARGIN',
    menuId: '4.1',
    menuLabel: 'Harga & Margin',
    icon: TrendingUp,
    badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
    borderColor: 'border-teal-300',
    bgColor: 'bg-teal-50/70',
    textColor: 'text-teal-800',
    description: 'Strategi penetapan harga jual retail, margin laba kotor target, rasio markup modal, serta diferensiasi harga di kanal penjualan (Offline, Tokopedia, GrabFood, Grosir).',
    upstream: 'HPP PRODUK',
    downstream: 'PROFITABILITAS',
    inputData: ['HPP Pokok Produk', 'Target Margin %', 'Komisi Potongan Platform Multi-Channel'],
    outputData: ['Rekomendasi Harga Jual', 'Harga Jual per Kanal Penjualan', 'Estimasi Laba Kotor per Satuan'],
    triggerAction: 'Penyesuaian target margin atau perubahan tarif komisi kanal penjualan',
    liveStatsSummary: (app) => {
      const avgPrice = app.products.length > 0
        ? app.products.reduce((s, p) => s + p.sellingPrice, 0) / app.products.length
        : 0;
      return {
        label: 'Rata-rata Harga',
        value: formatRupiah(avgPrice),
      };
    },
    detailsExplanation:
      'Sistem mengamankan laba bersih dengan memproyeksikan potongan marketplace (misal Shopee 8%, GoFood 20%) sehingga harga jual di tiap kanal tetap aman menguntungkan.',
  },
  {
    id: 'profitabilitas',
    stepNumber: 9,
    name: 'PROFITABILITAS',
    menuId: '4.2',
    menuLabel: 'Analisis Profit',
    icon: PieChart,
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
    borderColor: 'border-violet-300',
    bgColor: 'bg-violet-50/70',
    textColor: 'text-violet-800',
    description: 'Evaluasi kesehatan margin portofolio produk, klasifikasi Star Products (margin tinggi & laris), Cash Cows, dan deteksi dini produk margin tipis/kritis.',
    upstream: 'HARGA & MARGIN & HPP PRODUK',
    downstream: 'ANALISIS & SIMULASI',
    inputData: ['Harga Jual Aktual', 'HPP Definitif Produk', 'Target Margin Target'],
    outputData: ['Klasifikasi Portofolio Produk', 'Ranking Profit Tertinggi ke Terendah', 'Daftar Warning Margin Rendah'],
    triggerAction: 'Perubahan harga jual produk atau pergeseran nilai HPP pokok',
    liveStatsSummary: (app) => {
      const healthy = app.products.filter((p) => {
        const m = p.sellingPrice > 0 ? ((p.sellingPrice - p.estimatedHpp) / p.sellingPrice) * 100 : 0;
        return m >= 40;
      }).length;
      return {
        label: 'Produk Sehat (>40%)',
        value: `${healthy} dari ${app.products.length} SKU`,
      };
    },
    detailsExplanation:
      'Profitabilitas menyaring seluruh produk untuk melihat siapa penyumbang laba terbesar dan siapa produk yang berpotensi membebani arus kas.',
  },
  {
    id: 'analisis-simulasi',
    stepNumber: 10,
    name: 'ANALISIS & SIMULASI',
    menuId: '6.2',
    menuLabel: 'Simulasi What-If & BEP',
    icon: SlidersHorizontal,
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    borderColor: 'border-pink-300',
    bgColor: 'bg-pink-50/70',
    textColor: 'text-pink-800',
    description: 'Uji ketahanan bisnis melalui skenario What-If fluktuasi bahan baku, kenaikan UMR, efisiensi skala ekonomi batch, substitusi bahan, dan sensitivitas titik impas (BEP).',
    upstream: 'PROFITABILITAS, HPP, & HARGA BAHAN',
    downstream: 'LAPORAN MANAJEMEN',
    inputData: ['Persentase Inflasi Bahan', 'Kenaikan Tarif Upah Tenaga Kerja', 'Skala Output Batch', 'Bahan Alternatif Pengganti'],
    outputData: ['Proyeksi HPP Baru', 'Rekomendasi Penyesuaian Harga Jual', 'Volume BEP Minimal'],
    triggerAction: 'Simulasi perubahan parameter biaya eksternal',
    liveStatsSummary: () => ({
      label: 'Model Simulasi',
      value: '4 Skenario Sensitivitas',
    }),
    detailsExplanation:
      'Memberikan keunggulan prediktif. Pemilik usaha tahu persis apa yang terjadi jika harga telur atau minyak naik 20% sebelum lonjakan itu benar-benar menekan kas.',
  },
  {
    id: 'laporan',
    stepNumber: 11,
    name: 'LAPORAN',
    menuId: '7.1',
    menuLabel: 'Laporan & Rekapitulasi',
    icon: FileBarChart,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    borderColor: 'border-rose-300',
    bgColor: 'bg-rose-50/70',
    textColor: 'text-rose-800',
    description: 'Rekapitulasi formal komprehensif (Ringkasan Eksekutif, HPP Produk, Realisasi Produksi, Pemakaian Bahan, Pembelian PO, Margin & Valuasi Persediaan).',
    upstream: 'SEMUA TAHAP TERDAHULU (1 - 10)',
    downstream: 'DASHBOARD EKSEKUTIF',
    inputData: ['Data Transaksi Seluruh Modul', 'Filter Rentang Tanggal', 'Filter Kategori Produk'],
    outputData: ['7 Laporan Formal Eksekutif', 'Dokumen Cetak PDF Resmi', 'Export Lembar Kerja Excel (CSV)'],
    triggerAction: 'Audit berkala mingguan/bulanan atau laporan direksi',
    liveStatsSummary: () => ({
      label: 'Format Tersedia',
      value: '7 Laporan Terintegrasi',
    }),
    detailsExplanation:
      'Laporan merekap seluruh riwayat biaya, pemakaian, dan pembelian ke dalam bentuk buku pembukuan siap audit untuk manajemen dan akuntan.',
  },
  {
    id: 'dashboard',
    stepNumber: 12,
    name: 'DASHBOARD',
    menuId: '1.1',
    menuLabel: 'Dashboard Utama',
    icon: LayoutDashboard,
    badgeColor: 'bg-emerald-600 text-white border-emerald-700',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-slate-900 text-white',
    textColor: 'text-emerald-400',
    description: 'Puncak kokpit intelligence yang mengonsolidasikan seluruh sinyal keuangan, KPI produksi, tren margin, peringatan stok, dan log audit secara real-time.',
    upstream: 'LAPORAN & SELURUH PIPELINE SISTEM',
    downstream: 'KEPUTUSAN STRATEGIS MANAJEMEN & PEMILIK',
    inputData: ['Agregasi Real-Time dari Tahap 1 hingga 11'],
    outputData: ['9 KPI Utama', 'Ringkasan Keuangan (Omzet, Laba, BEP)', 'Grafik Visual', 'Peringatan Dini'],
    triggerAction: 'Penyajian otomatis langsung setiap ada perubahan data',
    liveStatsSummary: (app) => ({
      label: 'Status Sistem',
      value: '100% Real-Time Terhubung',
    }),
    detailsExplanation:
      'Dashboard adalah titik akhir representasi visual. Mengubah data teknis produksi dan pembelian menjadi wawasan strategis untuk mengambil keputusan bisnis yang cepat dan tepat.',
  },
];

interface DataPipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataPipelineModal: React.FC<DataPipelineModalProps> = ({ isOpen, onClose }) => {
  const app = useApp();
  const [selectedStageId, setSelectedStageId] = useState<string>('master-bahan');
  const [viewMode, setViewMode] = useState<'FLOW' | 'TABLE'>('FLOW');

  if (!isOpen) return null;

  const currentStage = PIPELINE_STAGES.find((s) => s.id === selectedStageId) || PIPELINE_STAGES[0];

  const handleNavigateToMenu = (menuId: MenuId) => {
    app.setCurrentMenu(menuId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  Data Architecture Pipeline
                </span>
                <span className="text-xs text-slate-400 font-mono">12 Tahapan Aliran Data</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
                Peta Struktur & Hubungan Data Terintegrasi
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 bg-white/10 p-1 rounded-xl text-xs">
              <button
                onClick={() => setViewMode('FLOW')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'FLOW' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Diagram Alur
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  viewMode === 'TABLE' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Tabel Spesifikasi
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pipeline Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
          {/* Architecture Banner */}
          <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-sm">
                  Prinsip Aliran Linier & Kaskade Data Otomatis
                </span>
                <span className="text-slate-600 leading-relaxed">
                  Perubahan pada tahap atas (seperti harga beli di <strong className="text-slate-900">Pembelian</strong>) akan otomatis mengalir memperbarui biaya bahan baku, menghitung ulang <strong className="text-slate-900">BOM</strong>, mempengaruhi <strong className="text-slate-900">HPP Produk</strong>, margin penjualan, dan langsung tercermin di <strong className="text-slate-900">Dashboard</strong>.
                </span>
              </div>
            </div>
          </div>

          {viewMode === 'FLOW' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Interactive 12-Step Visual Flow Chart */}
              <div className="lg:col-span-5 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Urutan Hierarki Data</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-semibold">Klik node untuk rincian</span>
                </div>

                <div className="space-y-1.5 relative">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const isSelected = stage.id === selectedStageId;
                    const IconComp = stage.icon;
                    const stats = stage.liveStatsSummary(app);

                    return (
                      <React.Fragment key={stage.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedStageId(stage.id)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group relative ${
                            isSelected
                              ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20 z-10'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                isSelected
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                              }`}
                            >
                              {stage.stepNumber}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-xs font-bold tracking-tight truncate ${
                                    isSelected ? 'text-slate-950 font-black' : 'text-slate-800'
                                  }`}
                                >
                                  {stage.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 truncate font-mono">
                                {stage.menuLabel} • {stats.value}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.badgeColor}`}
                            >
                              {stage.menuId}
                            </span>
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                isSelected ? 'text-emerald-600 translate-x-0.5' : 'text-slate-300'
                              }`}
                            />
                          </div>
                        </button>

                        {/* Down Arrow between nodes */}
                        {idx < PIPELINE_STAGES.length - 1 && (
                          <div className="flex justify-center my-0.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <ArrowDown className="w-3 h-3 text-slate-500" />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Deep-Dive Stage Inspector */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-5 sticky top-2">
                  {/* Stage Header */}
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                        {React.createElement(currentStage.icon, { className: 'w-6 h-6' })}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            Langkah #{currentStage.stepNumber} dari 12
                          </span>
                          <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Menu ID: {currentStage.menuId}
                          </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">
                          {currentStage.name}
                        </h3>
                      </div>
                    </div>

                    <button
                      onClick={() => handleNavigateToMenu(currentStage.menuId)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
                    >
                      <span>Buka Modul</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                    {currentStage.description}
                  </p>

                  {/* Flow Relationships (Upstream & Downstream) */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
                        ← Menerima Masukan Dari (Upstream)
                      </div>
                      <div className="font-semibold text-slate-900">{currentStage.upstream}</div>
                    </div>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                        Mengalirkan Hasil Ke (Downstream) →
                      </div>
                      <div className="font-semibold text-slate-900">{currentStage.downstream}</div>
                    </div>
                  </div>

                  {/* Input vs Output Data */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400">
                        Field Data Input Masuk:
                      </span>
                      <ul className="space-y-1.5 text-slate-600 font-medium">
                        {currentStage.inputData.map((item, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-slate-400">
                        Hasil Output / Transformasi:
                      </span>
                      <ul className="space-y-1.5 text-slate-600 font-medium">
                        {currentStage.outputData.map((item, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Trigger & Cascade Explanation */}
                  <div className="p-3.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Pemicu & Efek Kaskade Otomatis (Automation):</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentStage.detailsExplanation}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Table Mode */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Urutan #</th>
                      <th className="py-3 px-4">Tahapan Pipeline</th>
                      <th className="py-3 px-4">Menu Terkait</th>
                      <th className="py-3 px-4">Input Data</th>
                      <th className="py-3 px-4">Output / Transformasi</th>
                      <th className="py-3 px-4 text-center">Aksi Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {PIPELINE_STAGES.map((stage) => (
                      <tr key={stage.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-center">
                          #{stage.stepNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{stage.name}</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5 line-clamp-1">
                            {stage.description}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stage.badgeColor}`}
                          >
                            {stage.menuLabel}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-slate-600">
                          {stage.inputData.slice(0, 2).join(', ')}...
                        </td>
                        <td className="py-3.5 px-4 text-[11px] font-semibold text-emerald-800">
                          {stage.outputData.slice(0, 2).join(', ')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleNavigateToMenu(stage.menuId)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 font-semibold rounded-lg text-[11px] transition-colors"
                          >
                            Buka
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <div>
            Struktur Hubungan Data: <span className="font-mono font-semibold text-slate-700">12 Tahap Linier</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors"
          >
            Tutup Peta Hubungan Data
          </button>
        </div>
      </div>
    </div>
  );
};
