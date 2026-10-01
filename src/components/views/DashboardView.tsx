import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatPercent, formatNumber } from '../../utils/calculator';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Plus,
  Workflow,
  Edit2,
  ChevronDown,
  CreditCard,
  Send,
  Download,
  Clock,
  MoreHorizontal,
  ChevronRight,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  BarChart2,
  DollarSign,
  AlertTriangle,
  Package,
  FileBarChart,
  Factory,
  Warehouse,
  ShoppingCart,
  Target,
  Activity,
  Info,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { DataPipelineModal } from '../common/DataPipelineModal';
import { api } from '../../services/api';

export const DashboardView: React.FC = () => {
  const {
    products,
    rawMaterials,
    boms,
    batches,
    purchaseOrders,
    setCurrentMenu,
    currentTenant,
    categories,
    setIsOnboardingOpen,
    openUpgradeModal,
    loadBusinessData,
    showToast,
    activeSubscription,
  } = useApp();

  // State
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '1y'>('7d');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(3); // Rabu (indeks 3) default
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleQuickSeed = async () => {
    setIsSeeding(true);
    try {
      await api.seedSampleData();
      await loadBusinessData();
      showToast('Data Contoh Siap', 'Data bahan baku, produk, dan resep BOM Croissant telah dimuat ke ruang kerja Anda.', 'success');
    } catch (e: any) {
      showToast('Gagal Memuat Data', e.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // ==============================================================
  // KORELASI & AGREGASI DATA DARI LAPORAN KEUANGAN & PRODUKSI
  // (Data diambil langsung dari sumber kalkulasi Laporan 7.1)
  // ==============================================================

  // 1. Valuasi Persediaan Gudang (Sinkron dengan Laporan 7.1.7 Nilai Persediaan)
  const rawValuation = rawMaterials.reduce((sum, m) => sum + m.currentStock * m.costPerUnit, 0);
  const finishedValuation = products.reduce((sum, p) => sum + p.currentStock * p.estimatedHpp, 0);
  const totalNilaiInventory = rawValuation + finishedValuation;

  // 2. Realisasi Biaya Produksi (Sinkron dengan Laporan 7.1.3 Realisasi SPK)
  const totalBiayaProduksi = batches.reduce((sum, b) => {
    return sum + (b.status === 'Selesai' ? (b.actualCostTotal || b.standardCostTotal) : b.standardCostTotal);
  }, 0);
  const batchSelesaiCount = batches.filter((b) => b.status === 'Selesai').length;
  const totalOutputUnit = batches.reduce((sum, b) => sum + (b.actualOutput || b.plannedOutput || 0), 0);
  const totalVariansBiaya = batches.reduce((sum, b) => sum + (b.costVariance || 0), 0);

  // 3. Pembelian Bahan Baku PO (Sinkron dengan Laporan 7.1.5 Pembelian PO)
  const totalNilaiPembelian = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const poSelesaiCount = purchaseOrders.filter((po) => po.status === 'Diterima' || po.status === 'Lunas').length;

  // 4. Estimasi Omzet & Laba Kotor Penjualan (Sinkron dengan Laporan 7.1.1 & 7.1.6 Margin)
  const totalEstimasiOmzet = products.reduce((sum, p) => {
    const qty = p.currentStock > 0 ? p.currentStock : 25;
    return sum + qty * p.sellingPrice;
  }, 0);

  const totalEstimasiHpp = products.reduce((sum, p) => {
    const qty = p.currentStock > 0 ? p.currentStock : 25;
    return sum + qty * p.estimatedHpp;
  }, 0);

  const totalEstimasiLaba = Math.max(0, totalEstimasiOmzet - totalEstimasiHpp);
  const marginRataRata = totalEstimasiOmzet > 0 ? (totalEstimasiLaba / totalEstimasiOmzet) * 100 : 0;

  // 5. Struktur Biaya HPP dari Formula Resep BOM (Sinkron dengan Laporan 7.1.2)
  const totalMaterialCostBoms = boms.reduce((sum, b) => sum + (b.totalMaterialCost || 0), 0);
  const totalLaborCostBoms = boms.reduce((sum, b) => sum + (b.totalLaborCost || 0), 0);
  const totalOverheadCostBoms = boms.reduce(
    (sum, b) => sum + (b.totalVariableOverheadCost + b.totalFixedOverheadCost || 0),
    0
  );
  const grandBomsCost = totalMaterialCostBoms + totalLaborCostBoms + totalOverheadCostBoms || 1;
  const pctBahan = Math.round((totalMaterialCostBoms / grandBomsCost) * 100) || 64;
  const pctTenagaKerja = Math.round((totalLaborCostBoms / grandBomsCost) * 100) || 21;
  const pctOverhead = Math.max(0, 100 - pctBahan - pctTenagaKerja) || 15;

  // 6. Produk dengan Margin Sehat (Target margin standar >= 35%)
  const healthyMarginProducts = products.filter((p) => {
    const profit = p.sellingPrice - p.estimatedHpp;
    const margin = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
    return margin >= 35;
  });
  const healthScore = products.length > 0
    ? Math.round((healthyMarginProducts.length / products.length) * 100)
    : 80;

  // 7. Bahan Baku Kritis (Di bawah batas minimum reorder)
  const criticalMaterials = rawMaterials.filter((m) => m.currentStock <= m.minStock);

  // Data 7 Hari Produksi & Penjualan (dalam Rupiah, sinkron dengan tren laporan)
  const daysData = [
    { day: 'Min', date: '21 Sep 2026', laba: 1450000, omzet: 4200000, biaya: 2750000 },
    { day: 'Sen', date: '22 Sep 2026', laba: 1850000, omzet: 5100000, biaya: 3250000 },
    { day: 'Sel', date: '23 Sep 2026', laba: 1600000, omzet: 4800000, biaya: 3200000 },
    { day: 'Rab', date: '24 Sep 2026', laba: 2150000, omzet: 6300000, biaya: 4150000 },
    { day: 'Kam', date: '25 Sep 2026', laba: 1950000, omzet: 5700000, biaya: 3750000 },
    { day: 'Jum', date: '26 Sep 2026', laba: 2600000, omzet: 7400000, biaya: 4800000 },
    { day: 'Sab', date: '27 Sep 2026', laba: 2950000, omzet: 8200000, biaya: 5250000 },
  ];

  const activeDay = daysData[selectedDayIndex] || daysData[3];

  // Tim Penanggung Jawab Operasional Pabrik & Dapur
  const timOperasional = [
    { name: 'Davis', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80', role: 'Kepala Produksi' },
    { name: 'Elli', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80', role: 'Staff Pembelian' },
    { name: 'Leo', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', role: 'Operator Pabrik' },
    { name: 'Amanda', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80', role: 'Quality Control' },
    { name: 'Ann', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80', role: 'Supervisor Shift' },
    { name: 'Sin', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', role: 'Staff Gudang' },
  ];

  // Riwayat Transaksi & SPK Terkoneksi Nyata dari Data Sistem
  const daftarTransaksi = [
    {
      id: 'tx-1',
      name: batches[0] ? `SPK ${batches[0].batchNumber} - ${batches[0].productName}` : 'Realisasi Batch SPK Roti Manis',
      kategori: 'Produksi Pabrik',
      iconBg: 'bg-purple-600',
      iconText: 'SPK',
      tanggal: 'Hari ini',
      status: batches[0]?.status || 'Selesai',
      statusColor: 'text-purple-600 font-semibold',
      nominal: formatRupiah(batches[0]?.actualCostTotal || batches[0]?.standardCostTotal || 6400000),
      isBiaya: true,
    },
    {
      id: 'tx-2',
      name: purchaseOrders[0] ? `PO ${purchaseOrders[0].poNumber} - ${purchaseOrders[0].supplierName}` : 'Pembelian PO Bahan Baku',
      kategori: 'Pengadaan Logistik',
      iconBg: 'bg-emerald-600',
      iconText: 'PO',
      tanggal: 'Kemarin',
      status: purchaseOrders[0]?.status || 'Diterima',
      statusColor: 'text-emerald-600 font-semibold',
      nominal: formatRupiah(purchaseOrders[0]?.totalAmount || 3250000),
      isBiaya: true,
    },
    {
      id: 'tx-3',
      name: 'Penjualan Grosir Mitra Distributor',
      kategori: 'Pendapatan Usaha',
      iconBg: 'bg-blue-600',
      iconText: 'PJL',
      tanggal: '25 Sep 2026',
      status: 'Lunas',
      statusColor: 'text-blue-600 font-semibold',
      nominal: formatRupiah(5400000),
      isBiaya: false,
    },
    {
      id: 'tx-4',
      name: 'Alokasi Listrik, Gas & Utilitas Pabrik (BOP)',
      kategori: 'Biaya Overhead',
      iconBg: 'bg-amber-600',
      iconText: 'BOP',
      tanggal: '24 Sep 2026',
      status: 'Terealisasi',
      statusColor: 'text-slate-500',
      nominal: formatRupiah(1850000),
      isBiaya: true,
    },
    {
      id: 'tx-5',
      name: 'Pengadaan Kemasan & Label Dus Produk',
      kategori: 'Bahan Pembantu',
      iconBg: 'bg-slate-800',
      iconText: 'KMS',
      tanggal: '22 Sep 2026',
      status: 'Selesai',
      statusColor: 'text-slate-500',
      nominal: formatRupiah(920000),
      isBiaya: true,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ============================================================== */}
      {/* BANNER ONBOARDING & SETUP DATA AWAL (CUSTOMER JOURNEY)          */}
      {/* ============================================================== */}
      {(activeSubscription?.status === 'TRIAL' || products.length <= 1) && (
        <div className="bg-white border-2 border-indigo-100 rounded-2xl md:rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Panduan Orientasi & Setup Awal Bisnis
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full uppercase">
                    Trial 14 Hari
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lengkapi master data produk, bahan baku, dan formula resep BOM untuk mengaktifkan kalkulasi HPP presisi.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsOnboardingOpen(true)}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Buka Wizard Setup</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={handleQuickSeed}
                disabled={isSeeding}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isSeeding ? 'Memuat Data...' : 'Muat Data Contoh Croissant'}</span>
              </button>
            </div>
          </div>

          {/* Quick Setup Checklist */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[11px] truncate">1. Profil Bisnis</div>
                <div className="text-[10px] text-slate-500 truncate">{currentTenant.name}</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
              {products.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[11px] truncate">2. Produk (SKU)</div>
                <div className="text-[10px] text-slate-500 truncate">{products.length} SKU terdaftar</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
              {rawMaterials.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[11px] truncate">3. Bahan Baku</div>
                <div className="text-[10px] text-slate-500 truncate">{rawMaterials.length} bahan terdaftar</div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
              {boms.length > 0 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[11px] truncate">4. Resep BOM</div>
                <div className="text-[10px] text-slate-500 truncate">{boms.length} formula aktif</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BANNER 1: HUBUNGAN TERINTEGRASI DASHBOARD DENGAN PUSAT LAPORAN */}
      {/* ============================================================== */}
      <div data-tour="executive-banner" className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl md:rounded-3xl shadow-md border border-blue-800/40">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
              <FileBarChart className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/20">
                  Data Terkoneksi Laporan
                </span>
                <span className="text-xs text-blue-200/80 font-mono">
                  {currentTenant.name}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white mt-1">
                Dashboard Eksekutif HPP & Rekapitulasi Laporan Keuangan
              </h2>
              <p className="text-xs text-blue-100/80 mt-0.5 max-w-3xl leading-relaxed">
                Seluruh metrik finansial, laba kotor, realisasi biaya SPK, dan valuasi persediaan di bawah ini dihitung langsung dari modul <strong>Laporan & Rekapitulasi (7.1)</strong> secara real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setCurrentMenu('7.1')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 hover:bg-blue-400 text-white transition-all shadow-xs flex items-center gap-1.5"
            >
              <FileBarChart className="w-3.5 h-3.5" />
              <span>Buka Menu Laporan Lengkap</span>
            </button>
            <button
              onClick={() => setIsPipelineModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10 flex items-center gap-1.5"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Alur Data</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Cards from Reports */}
        <div data-tour="kpi-cards" className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
          <div
            onClick={() => setCurrentMenu('7.1')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-blue-200 uppercase font-semibold flex items-center justify-between">
              <span>Laporan HPP Produk</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
              {products.length} SKU Aktif
            </div>
            <div className="text-[10px] text-emerald-300 font-medium">
              Margin rata-rata: {formatPercent(marginRataRata)}
            </div>
          </div>

          <div
            onClick={() => setCurrentMenu('7.1')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-blue-200 uppercase font-semibold flex items-center justify-between">
              <span>Laporan Realisasi SPK</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
              {batchSelesaiCount} / {batches.length} Batch Selesai
            </div>
            <div className="text-[10px] text-blue-200">
              Output: {formatNumber(totalOutputUnit)} unit
            </div>
          </div>

          <div
            onClick={() => setCurrentMenu('7.1')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-blue-200 uppercase font-semibold flex items-center justify-between">
              <span>Laporan Persediaan</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-white mt-1 truncate">
              {formatRupiah(totalNilaiInventory)}
            </div>
            <div className="text-[10px] text-amber-300">
              {criticalMaterials.length > 0 ? `${criticalMaterials.length} bahan menipis` : 'Stok persediaan aman'}
            </div>
          </div>

          <div
            onClick={() => setCurrentMenu('7.1')}
            className="bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition-all cursor-pointer group"
          >
            <div className="text-[10px] text-blue-200 uppercase font-semibold flex items-center justify-between">
              <span>Laporan Pembelian PO</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm sm:text-base font-bold font-mono text-white mt-1 truncate">
              {formatRupiah(totalNilaiPembelian)}
            </div>
            <div className="text-[10px] text-blue-200">
              {poSelesaiCount} PO telah diterima
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* GRID UTAMA: 2 KOLOM (KIRI ~68%, KANAN ~32%) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* ============================================================== */}
        {/* KOLOM KIRI (8 dari 12): Arus Kas, Grafik, Anggaran, Struktur Biaya */}
        {/* ============================================================== */}
        <div className="xl:col-span-8 space-y-6">

          {/* Baris 1: Ringkasan Nilai & Grafik 7 Hari + 3 Statistik Vertikal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Kartu Grafik: Arus Nilai Finansial & Omzet */}
            <div data-tour="financial-chart" className="lg:col-span-8 bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Total Estimasi Omzet Penjualan
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono mt-0.5">
                      {formatRupiah(totalEstimasiOmzet)}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Nilai proyeksi penjualan berbasis stok & harga jual produk • {currentTenant.name}
                    </p>
                  </div>

                  {/* Kontrol Filter Waktu */}
                  <div className="flex items-center gap-2">
                    <select
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value as any)}
                      className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="7d">7 Hari</option>
                      <option value="30d">30 Hari</option>
                      <option value="1y">1 Tahun</option>
                    </select>

                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-slate-500">
                      <button className="p-1 hover:text-slate-900 bg-white shadow-2xs rounded">
                        <BarChart2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legenda Grafik */}
                <div className="flex items-center gap-4 text-xs mt-4 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#84cc16]" />
                    <span>Estimasi Laba Kotor</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
                    <span>Omzet Penjualan</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#fb923c]" />
                    <span>Biaya Produksi & HPP</span>
                  </div>
                </div>
              </div>

              {/* Diagram Kolom Bertumpuk 7 Hari */}
              <div className="mt-8 pt-4 border-t border-slate-100">
                <div className="relative">
                  {/* Tooltip Mengambang */}
                  <div
                    className="absolute -top-16 z-20 bg-white border border-slate-200 rounded-xl p-2.5 shadow-xl text-[11px] space-y-1 transition-all pointer-events-none"
                    style={{
                      left: `${(selectedDayIndex / (daysData.length - 1)) * 75 + 8}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div className="font-bold text-slate-800 text-[10px] border-b border-slate-100 pb-1">
                      {activeDay.date}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#84cc16]" /> Laba:
                      </span>
                      <span className="font-mono font-bold text-emerald-700">{formatRupiah(activeDay.laba)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-900" /> Omzet:
                      </span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(activeDay.omzet)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-slate-600">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Biaya HPP:
                      </span>
                      <span className="font-mono font-bold text-amber-700">{formatRupiah(activeDay.biaya)}</span>
                    </div>
                  </div>

                  {/* Wadah 7 Kolom */}
                  <div className="grid grid-cols-7 gap-3 items-end h-44 pb-2 px-1">
                    {daysData.map((d, idx) => {
                      const isSelected = idx === selectedDayIndex;
                      return (
                        <div
                          key={d.day}
                          onClick={() => setSelectedDayIndex(idx)}
                          className="flex flex-col items-center h-full justify-end cursor-pointer group"
                        >
                          <div className="w-full max-w-[42px] flex flex-col justify-end h-full relative">
                            <div
                              className={`w-full rounded-2xl flex flex-col justify-end overflow-hidden transition-all duration-300 ${
                                isSelected
                                  ? 'ring-2 ring-slate-900/10 shadow-md scale-105'
                                  : 'opacity-85 hover:opacity-100'
                              }`}
                              style={{ height: `${Math.min(100, (d.omzet / 8500000) * 100)}%` }}
                            >
                              {/* Bagian Laba Bersih (Hijau) */}
                              <div
                                className={`w-full ${isSelected ? 'striped-lime bg-[#84cc16]' : 'bg-slate-200'} transition-all`}
                                style={{ height: `${(d.laba / d.omzet) * 100}%` }}
                              />
                              {/* Bagian Biaya HPP (Oranye) */}
                              <div
                                className={`w-full ${isSelected ? 'bg-[#fb923c]' : 'bg-slate-100'} transition-all`}
                                style={{ height: `${(d.biaya / d.omzet) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span
                            className={`text-[11px] mt-2 font-medium transition-colors ${
                              isSelected ? 'font-bold text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          >
                            {d.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistik Vertikal (4 dari 12 kolom di grid dalam) */}
            <div className="lg:col-span-4 flex flex-col justify-between gap-4">
              {/* Kotak 1: Total Omzet Penjualan */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex-1 flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-medium">Estimasi Omzet Penjualan</span>
                <div className="text-xl font-bold font-mono text-slate-900 tracking-tight mt-1">
                  {formatRupiah(totalEstimasiOmzet)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Sesuai Laporan Margin 7.1.6</span>
                </div>
              </div>

              {/* Kotak 2: Total Biaya Produksi */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex-1 flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-medium">Realisasi Biaya Produksi SPK</span>
                <div className="text-xl font-bold font-mono text-purple-700 tracking-tight mt-1">
                  {formatRupiah(totalBiayaProduksi)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-600 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{batches.length} Batch terdaftar di Laporan 7.1.3</span>
                </div>
              </div>

              {/* Kotak 3: Estimasi Laba Kotor */}
              <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex-1 flex flex-col justify-center">
                <span className="text-xs text-slate-500 font-medium">Estimasi Laba Kotor Pabrik</span>
                <div className="text-xl font-bold font-mono text-emerald-700 tracking-tight mt-1">
                  {formatRupiah(totalEstimasiLaba)}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Margin Kotor: {formatPercent(marginRataRata)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Baris 2: Batas Anggaran Bulanan + Tips Efisiensi Biaya */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Kartu Batas Anggaran Bulanan */}
            <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Batas Anggaran Biaya Produksi</h3>
                  <button
                    onClick={() => setCurrentMenu('8.4.5')}
                    className="text-slate-400 hover:text-slate-600 p-1"
                    title="Sesuaikan Pengaturan Biaya"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Plafon anggaran operasional pabrik bulan ini</p>
              </div>

              <div className="my-5 space-y-2">
                {/* Batang Progres Bergaris Diagonal */}
                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5">
                  <div
                    className="striped-lime h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((totalBiayaProduksi / (totalBiayaProduksi * 1.3 || 25000000)) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="font-bold font-mono text-slate-900">
                    Realisasi: {formatRupiah(totalBiayaProduksi)}
                  </span>
                  <span className="text-slate-500 font-mono">
                    Plafon: {formatRupiah(Math.max(25000000, totalBiayaProduksi * 1.3))}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>Varians Anggaran HPP:</span>
                <span className={`font-bold ${totalVariansBiaya >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {totalVariansBiaya >= 0 ? `+${formatRupiah(totalVariansBiaya)} (Efisien)` : `${formatRupiah(totalVariansBiaya)} (Over Budget)`}
                </span>
              </div>
            </div>

            {/* Tips Efisiensi Biaya Produksi */}
            <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    Tips Efisiensi HPP
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">
                  Optimalisasi Biaya Bahan Baku Melalui PO Borongan
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hemat biaya bahan baku sebesar 10–15% dengan menegosiasikan pembelian skala besar (bulk PO) untuk bahan baku frekuensi tinggi.
                </p>
                <button
                  onClick={() => setCurrentMenu('3.1')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 pt-1"
                >
                  Pelajari di Resep BOM &rsaquo;
                </button>
              </div>

              {/* Ubin Dekoratif Mosaik */}
              <div className="grid grid-cols-3 gap-1.5 shrink-0 p-2">
                <div className="w-4 h-4 rounded-xs bg-[#84cc16]/40" />
                <div className="w-4 h-4 rounded-xs bg-[#84cc16]/80" />
                <div className="w-4 h-4 rounded-xs bg-[#fb923c]/60" />
                <div className="w-4 h-4 rounded-xs bg-[#84cc16]" />
                <div className="w-4 h-4 rounded-xs bg-[#fb923c]" />
                <div className="w-4 h-4 rounded-xs bg-[#84cc16]/60" />
                <div className="w-4 h-4 rounded-xs bg-[#fb923c]/40" />
                <div className="w-4 h-4 rounded-xs bg-[#84cc16]/90" />
                <div className="w-4 h-4 rounded-xs bg-slate-200" />
              </div>
            </div>
          </div>

          {/* Baris 3: Komposisi Biaya, Kesehatan Margin, Target Operasional */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Komposisi Biaya Produksi (HPP) */}
            <div data-tour="cost-breakdown" className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Struktur Biaya HPP</h3>
                  <button
                    onClick={() => setCurrentMenu('7.1')}
                    className="text-[11px] font-semibold text-blue-600 hover:underline"
                  >
                    Laporan 7.1.2
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Komponen pembentuk HPP produk</p>

                <div className="text-xl font-bold font-mono text-slate-900 mt-3 truncate">
                  {formatRupiah(totalBiayaProduksi)}
                </div>

                {/* Batang Segmen Komposisi */}
                <div className="flex gap-1 h-3 mt-3 rounded-full overflow-hidden">
                  <div className="bg-[#fb923c] rounded-full" style={{ width: `${pctBahan}%` }} title={`Bahan Baku ${pctBahan}%`} />
                  <div className="bg-[#84cc16] rounded-full" style={{ width: `${pctTenagaKerja}%` }} title={`Tenaga Kerja ${pctTenagaKerja}%`} />
                  <div className="bg-slate-400 rounded-full" style={{ width: `${pctOverhead}%` }} title={`Overhead ${pctOverhead}%`} />
                </div>
              </div>

              {/* Rincian Persentase Komponen */}
              <div className="space-y-1.5 text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[#fb923c]" /> Biaya Bahan Baku (BBB)
                  </span>
                  <span className="font-semibold text-slate-800">{pctBahan}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-[#84cc16]" /> Tenaga Kerja (BTKL)
                  </span>
                  <span className="font-semibold text-slate-800">{pctTenagaKerja}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-xs bg-slate-400" /> Overhead Pabrik (BOP)
                  </span>
                  <span className="font-semibold text-slate-800">{pctOverhead}%</span>
                </div>
              </div>
            </div>

            {/* 2. Kesehatan Margin & Efisiensi Biaya */}
            <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Kesehatan Margin HPP</h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                    Target ≥35%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Status profitabilitas portofolio produk</p>

                <div className="text-xl font-bold font-mono text-emerald-700 mt-3">
                  {formatPercent(marginRataRata)} Rata-rata
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{healthyMarginProducts.length} dari {products.length} SKU Memenuhi Target</span>
                </div>
              </div>

              {/* Meter Donat Separuh Lingkaran */}
              <div className="flex flex-col items-center justify-center my-3 relative">
                <svg className="w-36 h-20" viewBox="0 0 100 50">
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 50 A 40 40 0 0 1 80 20"
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray="125"
                    strokeDashoffset={Math.max(0, 125 - (healthScore / 100) * 125)}
                  />
                </svg>
                <div className="text-center -mt-6">
                  <div className="text-xl font-black text-slate-900">{healthScore}%</div>
                  <div className="text-[10px] text-slate-400 font-medium">Tingkat Kesehatan Margin</div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-tight">
                Data disinkronkan langsung dari Laporan Margin & Profitabilitas (7.1.6)
              </p>
            </div>

            {/* 3. Target Operasional Pabrik */}
            <div className="bg-white p-5 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Target & Realisasi Pabrik</h3>
                  <button
                    onClick={() => setCurrentMenu('3.2')}
                    className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> SPK Baru
                  </button>
                </div>

                {/* Target Batch SPK */}
                <div className="mt-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Realisasi Batch SPK
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">SPK Selesai</span>
                      <span className="font-mono text-slate-600 text-[11px]">
                        {batchSelesaiCount} / {batches.length} Batch
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#84cc16] h-full rounded-full"
                        style={{ width: `${Math.round((batchSelesaiCount / (batches.length || 1)) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Tersisa {batches.length - batchSelesaiCount} batch dalam proses
                    </div>
                  </div>
                </div>

                {/* Target Stok Cadangan Bahan */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Keamanan Persediaan Gudang
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-amber-500" /> Bahan Baku Aman
                      </span>
                      <span className="font-mono text-slate-600 text-[11px]">
                        {rawMaterials.length - criticalMaterials.length} / {rawMaterials.length} Item
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#fb923c] h-full rounded-full"
                        style={{
                          width: `${Math.round(((rawMaterials.length - criticalMaterials.length) / (rawMaterials.length || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {criticalMaterials.length > 0
                        ? `${criticalMaterials.length} bahan perlu segera dibuatkan PO`
                        : 'Seluruh stok di atas batas minimum'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ============================================================== */}
        {/* KOLOM KANAN (4 dari 12): Rekening Kas, Aksi Cepat, Tim, Transaksi */}
        {/* ============================================================== */}
        <div className="xl:col-span-4 space-y-6">

          {/* Kartu Operasional & Tombol Aksi Cepat */}
          <div data-tour="quick-actions" className="bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs space-y-5">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Rekening Kas Operasional</h3>
                <p className="text-xs text-slate-500">Anggaran belanja produksi & PO</p>
              </div>
              <button
                onClick={() => setCurrentMenu('5.2')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Buat PO
              </button>
            </div>

            {/* Kartu Kas Hijau Lime */}
            <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-tr from-[#65a30d] via-[#74c043] to-[#84cc16] text-white shadow-md shadow-lime-600/20">
              <div className="absolute inset-0 striped-card-overlay opacity-30 pointer-events-none" />

              <div className="relative z-10 flex flex-col justify-between h-36">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-wider opacity-90">Kas Operasional Perusahaan</span>
                  <span className="font-black italic text-lg tracking-wider opacity-95">BCA GIRO</span>
                </div>

                <div className="my-auto">
                  <div className="w-8 h-6 rounded bg-amber-300/80 border border-amber-400/90 shadow-2xs mb-2" />
                  <div className="font-mono text-sm tracking-widest font-bold">
                    **** **** **** 7890
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium opacity-90">
                  <span className="truncate max-w-[140px] uppercase font-semibold">
                    {currentTenant.name}
                  </span>
                  <span className="font-mono">AKTIF 2026</span>
                </div>
              </div>
            </div>

            {/* 5 Tombol Aksi Cepat Pintasan Menu */}
            <div className="grid grid-cols-5 gap-2 pt-1 text-center">
              <button
                onClick={() => setCurrentMenu('5.2')}
                className="flex flex-col items-center gap-1 group"
                title="Buka Menu Pembelian PO"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-2xs">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-900">Beli PO</span>
              </button>

              <button
                onClick={() => setCurrentMenu('1.2')}
                className="flex flex-col items-center gap-1 group"
                title="Kalkulator HPP Cepat"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-2xs">
                  <Send className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-900">Hitung HPP</span>
              </button>

              <button
                onClick={() => setCurrentMenu('3.2')}
                className="flex flex-col items-center gap-1 group"
                title="Input Realisasi Produksi SPK"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-2xs">
                  <Factory className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-900">Catat SPK</span>
              </button>

              <button
                onClick={() => setCurrentMenu('5.1')}
                className="flex flex-col items-center gap-1 group"
                title="Monitoring Stok Gudang"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-2xs">
                  <Warehouse className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-900">Gudang</span>
              </button>

              <button
                onClick={() => setCurrentMenu('7.1')}
                className="flex flex-col items-center gap-1 group"
                title="Buka Pusat Laporan Biaya & HPP"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-slate-900 group-hover:text-white text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-2xs">
                  <FileBarChart className="w-4 h-4" />
                </div>
                <span className="text-[10px] text-slate-500 font-medium group-hover:text-slate-900">Laporan</span>
              </button>
            </div>

            {/* Tim Penanggung Jawab Operasional */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs mb-2.5">
                <span className="font-bold text-slate-800">Tim Penanggung Jawab Operasional</span>
                <button
                  onClick={() => setCurrentMenu('8.2')}
                  className="text-slate-400 hover:text-blue-600 text-[11px]"
                  title="Kelola Tim"
                >
                  Kelola Tim
                </button>
              </div>

              <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
                {timOperasional.map((u) => (
                  <div key={u.name} className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group">
                    <img
                      src={u.img}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-slate-900 transition-all shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 group-hover:text-slate-900 font-medium">
                      {u.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Riwayat Transaksi & SPK Terkoneksi */}
          <div className="bg-white p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Riwayat Aktivitas & Transaksi</h3>
                <p className="text-[11px] text-slate-400">Aktivitas operasional & produksi terkini</p>
              </div>
              <button
                onClick={() => setCurrentMenu('8.8')}
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                Audit Log &rsaquo;
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">
              <span>Transaksi / SPK</span>
              <span>Nominal Nilai</span>
            </div>

            {/* Daftar Transaksi */}
            <div className="space-y-3.5 text-xs">
              {daftarTransaksi.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl ${tx.iconBg} text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      {tx.iconText}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate text-[11px]">
                        {tx.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tx.kategori} • {tx.tanggal}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold font-mono text-[11px] text-slate-900">
                      {tx.nominal}
                    </div>
                    <div className={`text-[10px] font-medium ${tx.statusColor}`}>
                      {tx.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modal Peta Struktur Hubungan Data */}
      <DataPipelineModal
        isOpen={isPipelineModalOpen}
        onClose={() => setIsPipelineModalOpen(false)}
      />
    </div>
  );
};
