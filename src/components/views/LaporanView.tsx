import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatNumber, formatPercent } from '../../utils/calculator';
import {
  FileBarChart,
  Printer,
  Download,
  Calendar,
  Filter,
  Layers,
  Factory,
  Package,
  ShoppingCart,
  TrendingUp,
  Warehouse,
  PieChart,
  DollarSign,
  Award,
  AlertTriangle,
  Scale,
  X,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { exportToExcel } from '../../utils/excelHelper';

export const LaporanView: React.FC = () => {
  const {
    products,
    boms,
    batches,
    rawMaterials,
    purchaseOrders,
    categories,
    currentTenant,
    currentUser,
    showToast,
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<
    '7.1.1' | '7.1.2' | '7.1.3' | '7.1.4' | '7.1.5' | '7.1.6' | '7.1.7'
  >('7.1.1');

  const [dateFrom, setDateFrom] = useState('2026-09-01');
  const [dateTo, setDateTo] = useState('2026-09-30');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Helper title for active report
  const getReportTitle = () => {
    switch (activeReportTab) {
      case '7.1.1':
        return 'Laporan Ringkasan Eksekutif & Kinerja Finansial Pabrik';
      case '7.1.2':
        return 'Laporan Rekapitulasi Harga Pokok Produksi (HPP) per Produk';
      case '7.1.3':
        return 'Laporan Realisasi SPK & Variansi Biaya Produksi';
      case '7.1.4':
        return 'Laporan Pemakaian Bahan Baku & Efisiensi Resep';
      case '7.1.5':
        return 'Laporan Rekapitulasi Pembelian Bahan Baku (Purchase Order)';
      case '7.1.6':
        return 'Laporan Analisis Margin & Profitabilitas Penjualan Produk';
      case '7.1.7':
        return 'Laporan Valuasi Nilai Persediaan Gudang (Bahan Baku & Barang Jadi)';
      default:
        return 'Laporan Resmi Biaya Produksi & HPP';
    }
  };

  // Direct print execution
  const handleExecutePrint = () => {
    try {
      window.print();
      showToast('Perintah Cetak Dikirim', 'Membuka dialog cetak sistem / simpan sebagai PDF.', 'info');
    } catch {
      showToast('Gagal Mencetak', 'Gunakan tombol Unduh Dokumen PDF untuk menyimpan file.', 'warning');
    }
  };

  // Export to Excel helper (.xlsx)
  const handleExportExcel = (filename: string, headers: string[], rows: (string | number)[][]) => {
    exportToExcel(`${filename}.xlsx`, 'Laporan HPP', headers, rows);
    showToast('Ekspor Excel Berhasil', `File ${filename}.xlsx telah diunduh.`, 'success');
  };

  // Filtered Products
  const filteredProducts = products.filter(
    (p) => categoryFilter === 'ALL' || p.categoryId === categoryFilter
  );

  // Financial aggregates
  const rawValuation = rawMaterials.reduce((sum, m) => sum + m.currentStock * m.costPerUnit, 0);
  const finishedValuation = products.reduce((sum, p) => sum + p.currentStock * p.estimatedHpp, 0);
  const totalInventoryValuation = rawValuation + finishedValuation;
  const totalProductionCost = batches.reduce((sum, b) => sum + (b.actualCostTotal || b.standardCostTotal), 0);
  const totalPurchaseValue = purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
  const totalEstimatedRevenue = products.reduce((sum, p) => sum + p.currentStock * p.sellingPrice, 0);
  const totalEstimatedProfit = totalEstimatedRevenue - finishedValuation;

  // Download printable standalone HTML/PDF document
  const handleDownloadPrintHtml = () => {
    const title = getReportTitle();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let tableHtml = '';
    if (activeReportTab === '7.1.1') {
      tableHtml = `
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-title">Estimasi Omzet Penjualan</div>
            <div class="summary-val">${formatRupiah(totalEstimatedRevenue)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Estimasi Laba Kotor</div>
            <div class="summary-val" style="color: #047857;">${formatRupiah(totalEstimatedProfit)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Pengeluaran Biaya Produksi</div>
            <div class="summary-val" style="color: #7e22ce;">${formatRupiah(totalProductionCost)}</div>
          </div>
          <div class="summary-card">
            <div class="summary-title">Valuasi Persediaan Gudang</div>
            <div class="summary-val" style="color: #1d4ed8;">${formatRupiah(totalInventoryValuation)}</div>
          </div>
        </div>
      `;
    } else if (activeReportTab === '7.1.2') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Kode SKU</th>
              <th>Nama Produk Jadi</th>
              <th class="text-right">HPP Standar</th>
              <th class="text-right">Harga Jual</th>
              <th class="text-right">Laba Kotor</th>
              <th class="text-center">Margin %</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map(p => `
              <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td class="text-right">${formatRupiah(p.estimatedHpp)}</td>
                <td class="text-right">${formatRupiah(p.sellingPrice)}</td>
                <td class="text-right">${formatRupiah(p.sellingPrice - p.estimatedHpp)}</td>
                <td class="text-center">${formatPercent(p.sellingPrice > 0 ? ((p.sellingPrice - p.estimatedHpp) / p.sellingPrice) * 100 : 0)}</td>
                <td class="text-center">${p.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === '7.1.3') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>No. Batch SPK</th>
              <th>Produk Jadi</th>
              <th class="text-center">Output Rencana</th>
              <th class="text-center">Output Aktual</th>
              <th class="text-right">Biaya Standar</th>
              <th class="text-right">Biaya Aktual</th>
              <th class="text-right">Varians Biaya</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${batches.map(b => `
              <tr>
                <td><strong>${b.batchNumber}</strong></td>
                <td>${b.productName}</td>
                <td class="text-center">${formatNumber(b.plannedOutput)} Unit</td>
                <td class="text-center">${formatNumber(b.actualOutput || b.plannedOutput)} Unit</td>
                <td class="text-right">${formatRupiah(b.standardCostTotal)}</td>
                <td class="text-right">${formatRupiah(b.actualCostTotal || b.standardCostTotal)}</td>
                <td class="text-right">${formatRupiah(b.costVariance || 0)}</td>
                <td class="text-center">${b.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === '7.1.4') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama Bahan Baku</th>
              <th>Kategori</th>
              <th class="text-center">Stok Gudang</th>
              <th class="text-right">Harga Beli Satuan</th>
              <th class="text-right">Total Valuasi Stok</th>
            </tr>
          </thead>
          <tbody>
            ${rawMaterials.map(m => `
              <tr>
                <td><strong>${m.code}</strong></td>
                <td>${m.name}</td>
                <td>${m.categoryId}</td>
                <td class="text-center">${formatNumber(m.currentStock)} ${m.unit}</td>
                <td class="text-right">${formatRupiah(m.costPerUnit)} / ${m.unit}</td>
                <td class="text-right">${formatRupiah(m.currentStock * m.costPerUnit)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === '7.1.5') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Nomor PO</th>
              <th>Nama Supplier</th>
              <th>Tanggal PO</th>
              <th class="text-right">Total Tagihan</th>
              <th class="text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${purchaseOrders.map(po => `
              <tr>
                <td><strong>${po.poNumber}</strong></td>
                <td>${po.supplierName}</td>
                <td>${po.date}</td>
                <td class="text-right">${formatRupiah(po.totalAmount)}</td>
                <td class="text-center">${po.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeReportTab === '7.1.6') {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Kode SKU</th>
              <th>Nama Produk</th>
              <th class="text-right">HPP Satuan</th>
              <th class="text-right">Harga Jual</th>
              <th class="text-right">Laba Satuan</th>
              <th class="text-center">Margin %</th>
              <th class="text-center">Target %</th>
              <th class="text-center">Evaluasi</th>
            </tr>
          </thead>
          <tbody>
            ${filteredProducts.map(p => {
              const profit = p.sellingPrice - p.estimatedHpp;
              const marginPct = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;
              return `
                <tr>
                  <td><strong>${p.sku}</strong></td>
                  <td>${p.name}</td>
                  <td class="text-right">${formatRupiah(p.estimatedHpp)}</td>
                  <td class="text-right">${formatRupiah(p.sellingPrice)}</td>
                  <td class="text-right">${formatRupiah(profit)}</td>
                  <td class="text-center">${formatPercent(marginPct)}</td>
                  <td class="text-center">${formatPercent(p.targetMarginPct)}</td>
                  <td class="text-center">${marginPct >= p.targetMarginPct ? 'MEMENUHI TARGET' : 'DI BAWAH TARGET'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Nama Item / SKU</th>
              <th class="text-center">Stok Fisik</th>
              <th class="text-right">Harga Pokok Satuan</th>
              <th class="text-right">Total Valuasi</th>
            </tr>
          </thead>
          <tbody>
            ${rawMaterials.map(m => `
              <tr>
                <td>Bahan Baku</td>
                <td>${m.name} (${m.code})</td>
                <td class="text-center">${formatNumber(m.currentStock)} ${m.unit}</td>
                <td class="text-right">${formatRupiah(m.costPerUnit)} / ${m.unit}</td>
                <td class="text-right">${formatRupiah(m.currentStock * m.costPerUnit)}</td>
              </tr>
            `).join('')}
            ${products.map(p => `
              <tr>
                <td>Barang Jadi</td>
                <td>${p.name} (${p.sku})</td>
                <td class="text-center">${p.currentStock} ${p.unit}</td>
                <td class="text-right">${formatRupiah(p.estimatedHpp)} / ${p.unit}</td>
                <td class="text-right">${formatRupiah(p.currentStock * p.estimatedHpp)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title} - ${currentTenant.name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1e293b; margin: 0; padding: 24px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .company { font-size: 16pt; font-weight: bold; color: #0f172a; text-transform: uppercase; }
    .doc-type { font-size: 8.5pt; font-weight: bold; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 13pt; font-weight: bold; margin-top: 4px; color: #0f172a; }
    .meta { font-size: 8.5pt; color: #64748b; margin-top: 4px; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 8.5pt; margin-bottom: 16px; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 9pt; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-weight: bold; color: #334155; }
    td { border: 1px solid #cbd5e1; padding: 7px 8px; color: #1e293b; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 12px; }
    .summary-card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; background: #f8fafc; }
    .summary-title { font-size: 8pt; color: #64748b; text-transform: uppercase; font-weight: bold; }
    .summary-val { font-size: 13pt; font-weight: bold; margin-top: 4px; color: #0f172a; font-family: monospace; }
    .signatures { margin-top: 45px; display: flex; justify-content: space-between; page-break-inside: avoid; }
    .sig-col { text-align: center; width: 28%; font-size: 8.5pt; }
    .sig-space { height: 60px; }
    .sig-line { border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: bold; }
    .footer { margin-top: 30px; font-size: 7.5pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${currentTenant.name}</div>
      <div class="doc-type">Dokumen Akuntansi & Biaya Manufaktur HPP</div>
      <div class="title">${title}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; font-size: 9pt; color: #047857;">Status: Dokumen Resmi Terverifikasi</div>
      <div class="meta">Tanggal: ${currentDate}</div>
      <div class="meta">Pencetak: ${currentUser.name} (${currentUser.role})</div>
    </div>
  </div>

  <div class="meta-box">
    <div><strong>Periode Laporan:</strong> ${dateFrom} s/d ${dateTo}</div>
    <div><strong>Filter Kategori:</strong> ${categoryFilter === 'ALL' ? 'Semua Kategori' : categoryFilter}</div>
    <div><strong>Total Nilai Valuasi:</strong> ${formatRupiah(totalInventoryValuation)}</div>
  </div>

  ${tableHtml}

  <div class="signatures">
    <div class="sig-col">
      <div>Disiapkan Oleh,</div>
      <div class="sig-space"></div>
      <div class="sig-line">${currentUser.name}</div>
      <div style="color: #64748b;">${currentUser.role}</div>
    </div>
    <div class="sig-col">
      <div>Diperiksa Oleh,</div>
      <div class="sig-space"></div>
      <div class="sig-line">Cost Accountant</div>
      <div style="color: #64748b;">Bagian Keuangan & HPP</div>
    </div>
    <div class="sig-col">
      <div>Disetujui Oleh,</div>
      <div class="sig-space"></div>
      <div class="sig-line">Direktur / Owner</div>
      <div style="color: #64748b;">Manajemen Puncak</div>
    </div>
  </div>

  <div class="footer">
    Dokumen ini dicetak otomatis dari Sistem Manajemen HPP & Biaya Produksi Multi-Tenant • Rahasia & Terlindungi
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('File Cetak / PDF Terunduh', 'Dokumen HTML siap cetak berhasil diunduh. Dokumen akan langsung membuka dialog cetak / simpan PDF saat dibuka.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Laporan & Rekapitulasi
            </span>
            <span className="text-xs text-slate-500 font-mono">Financial Costing Center</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Pusat Laporan Biaya Produksi, Persediaan & Profitabilitas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dokumentasi rekapitulasi audit biaya untuk laporan manajemen keuangan, operasional dapur/pabrik, dan perpajakan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Buka Pratinjau & Cetak / Ekspor PDF Resmi"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* Filter and Tab Selection */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Navigation Tabs (7 Reports) */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveReportTab('7.1.1')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.1'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ringkasan Eksekutif
          </button>
          <button
            onClick={() => setActiveReportTab('7.1.2')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.2'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            HPP Produk
          </button>
          <button
            onClick={() => setActiveReportTab('7.1.3')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.3'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Realisasi Produksi
          </button>
          <button
            onClick={() => setActiveReportTab('7.1.4')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.4'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pemakaian Bahan Baku
          </button>
          <button
            onClick={() => setActiveReportTab('7.1.5')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.5'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pembelian PO
          </button>
          <button
            onClick={() => setActiveReportTab('7.1.6')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.6'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Margin & Profit
          </button>
          <button
            onClick={() => setActiveReportTab('7.1.7')}
            className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${
              activeReportTab === '7.1.7'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nilai Persediaan
          </button>
        </div>

        {/* Date Filter & Category Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600">Periode:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-600">Kategori:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 7.1.1 Laporan Ringkasan Eksekutif */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.1' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Estimasi Omzet Penjualan</div>
              <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                {formatRupiah(totalEstimatedRevenue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Valuasi stok jadi di harga jual</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Estimasi Laba Kotor</div>
              <div className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {formatRupiah(totalEstimatedProfit)}
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                Margin Rata-rata: {formatPercent(totalEstimatedRevenue > 0 ? (totalEstimatedProfit / totalEstimatedRevenue) * 100 : 0)}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Total Pengeluaran Produksi</div>
              <div className="text-2xl font-black font-mono text-purple-700 mt-1">
                {formatRupiah(totalProductionCost)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{batches.length} batch produksi terlaksana</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500">Total Nilai Persediaan Aktif</div>
              <div className="text-2xl font-black font-mono text-blue-700 mt-1">
                {formatRupiah(totalInventoryValuation)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Bahan baku + barang jadi</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">
              Analisis Ringkasan Kesehatan Finansial & Operasional Pabrik
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">Efisiensi Biaya Pokok (HPP)</div>
                <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                  Sebagian besar produk memiliki rata-rata margin kotor di atas 40%. Variansi biaya produksi batch berada dalam rentang toleransi efisiensi normal (&lt; 5%).
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">Pengendalian Stok Bahan</div>
                <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                  Terdapat {rawMaterials.filter((m) => m.currentStock <= m.minStock).length} bahan baku mendekati batas minimum. Nilai perputaran persediaan seimbang tanpa dead stock berlebih.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800">Titik Impas (BEP)</div>
                <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                  BEP operasional bulanan tertutupi setelah penjualan mencapai rata-rata 35-40% dari total kapasitas produksi dapur/pabrik.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan HPP Produk */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.2' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Harga Pokok Produksi per Produk
            </h3>
            <button
              onClick={() => {
                const headers = ['Kode SKU', 'Nama Produk', 'HPP Standar', 'Harga Jual', 'Margin Kotor (Rp)', 'Margin %', 'Status'];
                const rows = filteredProducts.map((p) => [
                  p.sku,
                  p.name,
                  p.estimatedHpp,
                  p.sellingPrice,
                  p.sellingPrice - p.estimatedHpp,
                  p.sellingPrice > 0 ? ((p.sellingPrice - p.estimatedHpp) / p.sellingPrice) * 100 : 0,
                  p.status,
                ]);
                handleExportExcel('laporan-7-1-2-hpp-produk', headers, rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kode SKU</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4 text-right">HPP Pokok Standar</th>
                  <th className="py-3 px-4 text-right">Harga Jual Normal</th>
                  <th className="py-3 px-4 text-right">Laba Kotor (Rp)</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const profit = p.sellingPrice - p.estimatedHpp;
                  const marginPct = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-purple-700">{p.sku}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                        {formatRupiah(p.estimatedHpp)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-blue-700">
                        {formatRupiah(profit)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            marginPct >= p.targetMarginPct
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {formatPercent(marginPct)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan Realisasi Produksi */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.3' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Realisasi Batch Produksi & Variansi Biaya
            </h3>
            <button
              onClick={() => {
                const headers = ['No SPK', 'Tanggal', 'Produk', 'Target Unit', 'Realisasi Unit', 'Biaya Standar', 'Biaya Riil', 'Variansi'];
                const rows = batches.map((b) => [
                  b.batchNumber,
                  b.date,
                  b.productName,
                  b.plannedOutput,
                  b.actualOutput,
                  b.standardCostTotal,
                  b.actualCostTotal,
                  b.costVariance,
                ]);
                handleExportExcel('laporan-7-1-3-realisasi-produksi', headers, rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No Batch</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4 text-center">Output Jadi</th>
                  <th className="py-3 px-4 text-right">Biaya Standar</th>
                  <th className="py-3 px-4 text-right">Biaya Realisasi</th>
                  <th className="py-3 px-4 text-right">Variansi Biaya</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-purple-700">{b.batchNumber}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{b.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{b.productName}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {b.status === 'Selesai' ? `${b.actualOutput} unit` : `Rencana: ${b.plannedOutput}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(b.standardCostTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {b.status === 'Selesai' ? formatRupiah(b.actualCostTotal) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      {b.status === 'Selesai' ? (
                        <span className={`font-bold ${b.costVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {b.costVariance > 0 ? '+' : ''}{formatRupiah(b.costVariance)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan Pemakaian Bahan Baku */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.4' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Pemakaian Bahan Baku & Toleransi Susut (Waste)
            </h3>
            <button
              onClick={() => {
                const headers = ['Kode Bahan', 'Nama Bahan', 'Harga Satuan', 'Stok Saat Ini', 'Faktor Susut %', 'Valuasi Stok'];
                const rows = rawMaterials.map((m) => [
                  m.code,
                  m.name,
                  m.buyPrice,
                  m.currentStock,
                  `${m.shrinkagePct}%`,
                  m.currentStock * m.costPerUnit,
                ]);
                handleExportExcel('laporan-7-1-4-pemakaian-bahan', headers, rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kode Bahan</th>
                  <th className="py-3 px-4">Nama Bahan Baku</th>
                  <th className="py-3 px-4 text-right">Harga Beli / Satuan</th>
                  <th className="py-3 px-4 text-right">Stok Fisik Gudang</th>
                  <th className="py-3 px-4 text-center">Faktor Susut (Waste)</th>
                  <th className="py-3 px-4 text-right">Total Nilai Bahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rawMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-700">{m.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {formatRupiah(m.buyPrice)} / {m.buyUnit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {formatNumber(m.currentStock)} {m.unit}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-700">
                      {m.shrinkagePct}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatRupiah(m.currentStock * m.costPerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan Pembelian PO */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.5' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Pembelian Pengadaan Bahan Baku (PO)
            </h3>
            <button
              onClick={() => {
                const headers = ['No PO', 'Tanggal', 'Supplier', 'Item Qty', 'Biaya Ongkir', 'Total Nilai PO', 'Status'];
                const rows = purchaseOrders.map((po) => [
                  po.poNumber,
                  po.date,
                  po.supplierName,
                  po.items.length,
                  po.shippingCost,
                  po.totalAmount,
                  po.status,
                ]);
                handleExportExcel('laporan-7-1-5-pembelian-po', headers, rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No PO</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4 text-center">Jumlah Item</th>
                  <th className="py-3 px-4 text-right">Ongkos Kirim</th>
                  <th className="py-3 px-4 text-right">Total Faktur</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{po.poNumber}</td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">{po.date}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{po.supplierName}</td>
                    <td className="py-3 px-4 text-center font-mono">{po.items.length} macam</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{formatRupiah(po.shippingCost)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(po.totalAmount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan Margin & Profitabilitas */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.6' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Margin Kotor & Peringkat Profitabilitas Produk
            </h3>
            <button
              onClick={() => {
                const headers = ['Peringkat', 'Produk', 'HPP', 'Harga Jual', 'Margin %', 'Klasifikasi'];
                const sorted = [...filteredProducts].sort((a, b) => {
                  const mA = a.sellingPrice > 0 ? ((a.sellingPrice - a.estimatedHpp) / a.sellingPrice) * 100 : 0;
                  const mB = b.sellingPrice > 0 ? ((b.sellingPrice - b.estimatedHpp) / b.sellingPrice) * 100 : 0;
                  return mB - mA;
                });
                const rows = sorted.map((p, idx) => [
                  `#${idx + 1}`,
                  p.name,
                  p.estimatedHpp,
                  p.sellingPrice,
                  p.sellingPrice > 0 ? ((p.sellingPrice - p.estimatedHpp) / p.sellingPrice) * 100 : 0,
                  p.sellingPrice - p.estimatedHpp > 20000 ? 'Star' : 'Standard',
                ]);
                handleExportExcel('laporan-7-1-6-margin-profitabilitas', headers, rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-center">Rank</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4 text-right">HPP</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Laba Satuan</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                  <th className="py-3 px-4 text-center">Klasifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {[...filteredProducts]
                  .sort((a, b) => {
                    const mA = a.sellingPrice > 0 ? ((a.sellingPrice - a.estimatedHpp) / a.sellingPrice) * 100 : 0;
                    const mB = b.sellingPrice > 0 ? ((b.sellingPrice - b.estimatedHpp) / b.sellingPrice) * 100 : 0;
                    return mB - mA;
                  })
                  .map((p, idx) => {
                    const profit = p.sellingPrice - p.estimatedHpp;
                    const marginPct = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">{formatRupiah(p.estimatedHpp)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatRupiah(p.sellingPrice)}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">{formatRupiah(profit)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {formatPercent(marginPct)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${marginPct >= 45 ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            {marginPct >= 45 ? 'Star Product' : 'Cash Cow'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan Nilai Persediaan */}
      {/* ============================================================== */}
      {activeReportTab === '7.1.7' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Nilai Valuasi Persediaan (Bahan Baku & Barang Jadi)
            </h3>
            <button
              onClick={() => {
                const headers = ['Tipe', 'Nama Item', 'Stok', 'Satuan', 'Harga / Nilai Pokok', 'Total Valuasi'];
                const rows = [
                  ...rawMaterials.map((m) => ['Bahan Baku', m.name, m.currentStock, m.unit, m.costPerUnit, m.currentStock * m.costPerUnit]),
                  ...products.map((p) => ['Produk Jadi', p.name, p.currentStock, p.unit, p.estimatedHpp, p.currentStock * p.estimatedHpp]),
                ];
                handleExportExcel('laporan-7-1-7-nilai-persediaan', headers, rows);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-slate-400">Total Valuasi Bahan Baku:</div>
              <div className="text-base font-bold font-mono text-amber-700">{formatRupiah(rawValuation)}</div>
            </div>
            <div>
              <div className="text-slate-400">Total Valuasi Barang Jadi:</div>
              <div className="text-base font-bold font-mono text-blue-700">{formatRupiah(finishedValuation)}</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold">Total Gabungan Persediaan:</div>
              <div className="text-lg font-black font-mono text-emerald-700">{formatRupiah(totalInventoryValuation)}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Kategori Item</th>
                  <th className="py-3 px-4">Nama Item / SKU</th>
                  <th className="py-3 px-4 text-center">Stok Fisik</th>
                  <th className="py-3 px-4 text-right">Harga Pokok Satuan</th>
                  <th className="py-3 px-4 text-right">Total Valuasi Persediaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {rawMaterials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-amber-700 font-bold">Bahan Baku</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                    <td className="py-3 px-4 text-center font-mono">{formatNumber(m.currentStock)} {m.unit}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatRupiah(m.costPerUnit)} / {m.unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{formatRupiah(m.currentStock * m.costPerUnit)}</td>
                  </tr>
                ))}
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-blue-700 font-bold">Produk Jadi</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name} ({p.sku})</td>
                    <td className="py-3 px-4 text-center font-mono">{p.currentStock} {p.unit}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatRupiah(p.estimatedHpp)} / {p.unit}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{formatRupiah(p.currentStock * p.estimatedHpp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PRATINJAU CETAK & EKSPOR PDF RESMI */}
      {/* ============================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header Toolbar Modal */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Pratinjau Dokumen Cetak / PDF Resmi
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {getReportTitle()} • {currentTenant.name}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExecutePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors active:scale-95"
                  title="Buka dialog cetak sistem atau simpan PDF langsung"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang (Print)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPrintHtml}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors active:scale-95"
                  title="Unduh file HTML/PDF mandiri siap cetak"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Paper Preview Area */}
            <div className="p-6 overflow-y-auto bg-slate-100/80 flex-1">
              <div className="bg-white max-w-3xl mx-auto p-8 rounded-xl shadow-md border border-slate-300 text-slate-800 font-sans text-xs space-y-5">
                
                {/* Kop Surat Dokumen Resmi */}
                <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                  <div>
                    <div className="text-base font-black uppercase tracking-wider text-slate-900">
                      {currentTenant.name}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-0.5">
                      Dokumen Akuntansi & Biaya Manufaktur HPP
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1">
                      {getReportTitle()}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                    <div className="font-bold text-emerald-700">DOKUMEN RESMI TERVERIFIKASI</div>
                    <div>Tanggal: {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div>Dicetak Oleh: <span className="font-semibold text-slate-800">{currentUser.name}</span></div>
                    <div>Jabatan: <span className="font-semibold text-slate-800">{currentUser.role}</span></div>
                  </div>
                </div>

                {/* Info Parameter Laporan */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                  <div>
                    <span className="text-slate-400">Periode:</span>{' '}
                    <strong className="text-slate-800">{dateFrom}</strong> s/d <strong className="text-slate-800">{dateTo}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Kategori:</span>{' '}
                    <strong className="text-slate-800">{categoryFilter === 'ALL' ? 'Semua Kategori' : categoryFilter}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Total Valuasi:</span>{' '}
                    <strong className="font-mono text-emerald-700">{formatRupiah(totalInventoryValuation)}</strong>
                  </div>
                </div>

                {/* Ringkasan Finansial Eksekutif */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Omzet Penjualan</div>
                    <div className="text-xs font-bold font-mono text-slate-900 mt-0.5">{formatRupiah(totalEstimatedRevenue)}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Estimasi Laba</div>
                    <div className="text-xs font-bold font-mono text-emerald-700 mt-0.5">{formatRupiah(totalEstimatedProfit)}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Biaya Produksi</div>
                    <div className="text-xs font-bold font-mono text-purple-700 mt-0.5">{formatRupiah(totalProductionCost)}</div>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Total Persediaan</div>
                    <div className="text-xs font-bold font-mono text-blue-700 mt-0.5">{formatRupiah(totalInventoryValuation)}</div>
                  </div>
                </div>

                {/* Tabel Data Berdasarkan Tab Aktif */}
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-800 mb-2">
                    Tabel Rekapitulasi Rinci:
                  </div>

                  {activeReportTab === '7.1.2' && (
                    <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">SKU</th>
                          <th className="p-2 border border-slate-200">Nama Produk</th>
                          <th className="p-2 border border-slate-200 text-right">HPP Standar</th>
                          <th className="p-2 border border-slate-200 text-right">Harga Jual</th>
                          <th className="p-2 border border-slate-200 text-right">Laba Kotor</th>
                          <th className="p-2 border border-slate-200 text-center">Margin %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-200 font-mono font-bold text-purple-700">{p.sku}</td>
                            <td className="p-2 border border-slate-200">{p.name}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(p.estimatedHpp)}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(p.sellingPrice)}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(p.sellingPrice - p.estimatedHpp)}
                            </td>
                            <td className="p-2 border border-slate-200 text-center font-mono font-bold">
                              {formatPercent(p.sellingPrice > 0 ? ((p.sellingPrice - p.estimatedHpp) / p.sellingPrice) * 100 : 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeReportTab === '7.1.3' && (
                    <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">Batch SPK</th>
                          <th className="p-2 border border-slate-200">Produk</th>
                          <th className="p-2 border border-slate-200 text-center">Rencana Output</th>
                          <th className="p-2 border border-slate-200 text-center">Aktual Output</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya Aktual</th>
                          <th className="p-2 border border-slate-200 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batches.map((b) => (
                          <tr key={b.id} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-200 font-mono font-bold text-blue-700">{b.batchNumber}</td>
                            <td className="p-2 border border-slate-200">{b.productName}</td>
                            <td className="p-2 border border-slate-200 text-center">{formatNumber(b.plannedOutput)} Unit</td>
                            <td className="p-2 border border-slate-200 text-center font-bold">{formatNumber(b.actualOutput || b.plannedOutput)} Unit</td>
                            <td className="p-2 border border-slate-200 text-right font-mono font-bold text-purple-700">
                              {formatRupiah(b.actualCostTotal || b.standardCostTotal)}
                            </td>
                            <td className="p-2 border border-slate-200 text-center font-bold text-emerald-700">{b.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeReportTab !== '7.1.2' && activeReportTab !== '7.1.3' && (
                    <table className="w-full text-left text-[11px] border-collapse border border-slate-200">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">Kategori Persediaan</th>
                          <th className="p-2 border border-slate-200">Item / SKU</th>
                          <th className="p-2 border border-slate-200 text-center">Stok Fisik</th>
                          <th className="p-2 border border-slate-200 text-right">Harga Pokok Satuan</th>
                          <th className="p-2 border border-slate-200 text-right">Valuasi Persediaan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawMaterials.slice(0, 8).map((m) => (
                          <tr key={m.id} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-200 text-amber-700 font-bold">Bahan Baku</td>
                            <td className="p-2 border border-slate-200">{m.name} ({m.code})</td>
                            <td className="p-2 border border-slate-200 text-center font-mono">{formatNumber(m.currentStock)} {m.unit}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(m.costPerUnit)} / {m.unit}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(m.currentStock * m.costPerUnit)}
                            </td>
                          </tr>
                        ))}
                        {products.slice(0, 6).map((p) => (
                          <tr key={p.id} className="border-b border-slate-200">
                            <td className="p-2 border border-slate-200 text-blue-700 font-bold">Produk Jadi</td>
                            <td className="p-2 border border-slate-200">{p.name} ({p.sku})</td>
                            <td className="p-2 border border-slate-200 text-center font-mono">{p.currentStock} {p.unit}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(p.estimatedHpp)} / {p.unit}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(p.currentStock * p.estimatedHpp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Lembar Tanda Tangan Resmi Pengesahan */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[10px] text-slate-600">
                  <div>
                    <div>Disiapkan Oleh,</div>
                    <div className="h-16 flex items-end justify-center font-bold text-slate-800 border-b border-slate-400 mx-4 pb-1">
                      {currentUser.name}
                    </div>
                    <div className="text-slate-400 mt-1">{currentUser.role}</div>
                  </div>

                  <div>
                    <div>Diperiksa Oleh,</div>
                    <div className="h-16 flex items-end justify-center font-bold text-slate-800 border-b border-slate-400 mx-4 pb-1">
                      Cost Accountant
                    </div>
                    <div className="text-slate-400 mt-1">Bagian Akuntansi Biaya</div>
                  </div>

                  <div>
                    <div>Disetujui Oleh,</div>
                    <div className="h-16 flex items-end justify-center font-bold text-slate-800 border-b border-slate-400 mx-4 pb-1">
                      Direktur / Owner
                    </div>
                    <div className="text-slate-400 mt-1">Manajemen Puncak</div>
                  </div>
                </div>

                {/* Footer Dokumen */}
                <div className="pt-3 text-center text-[9px] text-slate-400 border-t border-slate-100">
                  Dokumen ini dicetak otomatis dari Sistem Manajemen HPP & Biaya Produksi Multi-Tenant • Rahasia & Terlindungi
                </div>

              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Gunakan tombol <strong>Cetak Sekarang</strong> untuk print fisik atau <strong>Unduh Dokumen PDF</strong> untuk menyimpan file PDF mandiri.</span>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
