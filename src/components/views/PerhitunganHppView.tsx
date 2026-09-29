import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatPercent, formatNumber } from '../../utils/calculator';
import {
  Calculator,
  Printer,
  FileText,
  CheckCircle2,
  Layers,
  ArrowRight,
  TrendingUp,
  Package,
  Factory,
  Scale,
  Sparkles,
  BarChart3,
  TrendingDown,
  AlertTriangle,
  Download,
  X,
} from 'lucide-react';

export const PerhitunganHppView: React.FC = () => {
  const { boms, products, batches, companySettings, showToast } = useApp();

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 4 Explicit Submenu Tabs
  const [activeTab, setActiveTab] = useState<'PRODUK' | 'BATCH' | 'KOMPARASI' | 'COSTING_METHOD'>('COSTING_METHOD');
  const [selectedBomId, setSelectedBomId] = useState<string>(boms[0]?.id || '');

  const bom = boms.find((b) => b.id === selectedBomId) || boms[0];
  const linkedProduct = products.find((p) => p.id === bom?.productId);

  if (!bom) {
    return <div className="p-8 text-center text-slate-400">Belum ada data BOM untuk dihitung.</div>;
  }

  // Calculate Full Costing breakdown
  const materialCost = bom.totalMaterialCost;
  const laborCost = bom.totalLaborCost;
  const variableOverhead = bom.totalVariableOverheadCost;
  const fixedOverhead = bom.totalFixedOverheadCost;
  const packagingCost = bom.totalPackagingCost;

  const fullCostingTotal = materialCost + laborCost + variableOverhead + fixedOverhead + packagingCost;
  const fullCostingHppPerUnit = bom.batchYield > 0 ? fullCostingTotal / bom.batchYield : 0;

  // Variable Costing breakdown (Excludes Fixed Overhead)
  const variableCostingTotal = materialCost + laborCost + variableOverhead + packagingCost;
  const variableCostingHppPerUnit = bom.batchYield > 0 ? variableCostingTotal / bom.batchYield : 0;

  const sellingPrice = linkedProduct?.sellingPrice || fullCostingHppPerUnit * 1.5;

  const getReportSubTitle = () => {
    switch (activeTab) {
      case 'PRODUK':
        return `Laporan Harga Pokok Produksi Formal - ${bom.productName}`;
      case 'BATCH':
        return 'Laporan Akuntansi Biaya Per Batch Produksi (SPK)';
      case 'KOMPARASI':
        return 'Laporan Analisis Variansi Biaya Standar vs Realisasi Aktual';
      case 'COSTING_METHOD':
        return `Komparasi Metode: Full Costing vs Variable Costing (${bom.productName})`;
      default:
        return 'Laporan Perhitungan HPP';
    }
  };

  const handleDownloadPrintHtml = () => {
    const title = getReportSubTitle();
    const currentDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let bodyHtml = '';
    if (activeTab === 'PRODUK') {
      bodyHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div><span style="font-size: 8.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Produk Jadi:</span><div style="font-size: 11pt; font-weight: bold;">${bom.productName}</div></div>
            <div><span style="font-size: 8.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Kode Resep:</span><div style="font-size: 11pt; font-weight: bold; font-family: monospace;">${bom.code}</div></div>
            <div><span style="font-size: 8.5pt; color: #64748b; font-weight: bold; text-transform: uppercase;">Batch Yield:</span><div style="font-size: 11pt; font-weight: bold;">${bom.batchYield} ${bom.yieldUnit}</div></div>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Komponen Biaya Produksi</th><th class="text-right">Biaya per Batch</th><th class="text-right">Biaya per Unit</th><th class="text-center">Porsi (%)</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>1. Biaya Bahan Baku Langsung (BBL)</strong></td><td class="text-right font-bold">${formatRupiah(materialCost)}</td><td class="text-right">${formatRupiah(materialCost / (bom.batchYield || 1))}</td><td class="text-center font-bold">${formatPercent(fullCostingTotal > 0 ? (materialCost / fullCostingTotal) * 100 : 0)}</td></tr>
            <tr><td><strong>2. Biaya Tenaga Kerja Langsung (BTKL)</strong></td><td class="text-right font-bold">${formatRupiah(laborCost)}</td><td class="text-right">${formatRupiah(laborCost / (bom.batchYield || 1))}</td><td class="text-center font-bold">${formatPercent(fullCostingTotal > 0 ? (laborCost / fullCostingTotal) * 100 : 0)}</td></tr>
            <tr><td><strong>3. Biaya Overhead Variabel</strong></td><td class="text-right font-bold">${formatRupiah(variableOverhead)}</td><td class="text-right">${formatRupiah(variableOverhead / (bom.batchYield || 1))}</td><td class="text-center font-bold">${formatPercent(fullCostingTotal > 0 ? (variableOverhead / fullCostingTotal) * 100 : 0)}</td></tr>
            <tr><td><strong>4. Biaya Overhead Tetap Pabrik</strong></td><td class="text-right font-bold">${formatRupiah(fixedOverhead)}</td><td class="text-right">${formatRupiah(fixedOverhead / (bom.batchYield || 1))}</td><td class="text-center font-bold">${formatPercent(fullCostingTotal > 0 ? (fixedOverhead / fullCostingTotal) * 100 : 0)}</td></tr>
            <tr><td><strong>5. Biaya Kemasan / Packaging</strong></td><td class="text-right font-bold">${formatRupiah(packagingCost)}</td><td class="text-right">${formatRupiah(packagingCost / (bom.batchYield || 1))}</td><td class="text-center font-bold">${formatPercent(fullCostingTotal > 0 ? (packagingCost / fullCostingTotal) * 100 : 0)}</td></tr>
            <tr style="background: #f1f5f9; font-weight: bold;"><td style="font-size: 10.5pt;">TOTAL HARGA POKOK PRODUKSI (HPP)</td><td class="text-right" style="color: #047857; font-size: 11pt;">${formatRupiah(fullCostingTotal)}</td><td class="text-right" style="color: #047857; font-size: 11pt;">${formatRupiah(fullCostingHppPerUnit)}</td><td class="text-center">100%</td></tr>
          </tbody>
        </table>
      `;
    } else if (activeTab === 'BATCH') {
      bodyHtml = `
        <table>
          <thead>
            <tr><th>No SPK</th><th>Tanggal</th><th>Produk</th><th class="text-center">Target Output</th><th class="text-center">Aktual</th><th class="text-right">Biaya Aktual</th><th class="text-right">HPP Realisasi</th><th class="text-center">Status</th></tr>
          </thead>
          <tbody>
            ${batches.map(b => `
              <tr>
                <td><strong>${b.batchNumber}</strong></td>
                <td>${b.date}</td>
                <td>${b.productName}</td>
                <td class="text-center">${b.plannedOutput} unit</td>
                <td class="text-center font-bold">${b.actualOutput} unit</td>
                <td class="text-right font-bold">${formatRupiah(b.actualCostTotal || b.standardCostTotal)}</td>
                <td class="text-right font-bold" style="color: #047857;">${formatRupiah(b.actualOutput > 0 ? (b.actualCostTotal || b.standardCostTotal) / b.actualOutput : 0)}</td>
                <td class="text-center">${b.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (activeTab === 'KOMPARASI') {
      bodyHtml = `
        <table>
          <thead>
            <tr><th>No SPK</th><th>Produk</th><th class="text-right">Biaya Standar</th><th class="text-right">Biaya Aktual</th><th class="text-right">Variansi Nominal</th><th class="text-center">Variansi %</th><th class="text-center">Kategori</th></tr>
          </thead>
          <tbody>
            ${batches.map(b => {
              const variance = b.costVariance || 0;
              const isFav = variance <= 0;
              const varPct = b.standardCostTotal > 0 ? (variance / b.standardCostTotal) * 100 : 0;
              return `
                <tr>
                  <td><strong>${b.batchNumber}</strong></td>
                  <td>${b.productName}</td>
                  <td class="text-right">${formatRupiah(b.standardCostTotal)}</td>
                  <td class="text-right font-bold">${formatRupiah(b.actualCostTotal || b.standardCostTotal)}</td>
                  <td class="text-right font-bold" style="color: ${isFav ? '#047857' : '#dc2626'};">${formatRupiah(Math.abs(variance))}</td>
                  <td class="text-center font-bold" style="color: ${isFav ? '#047857' : '#dc2626'};">${varPct > 0 ? `+${varPct.toFixed(1)}%` : `${varPct.toFixed(1)}%`}</td>
                  <td class="text-center font-bold" style="color: ${isFav ? '#047857' : '#dc2626'};">${isFav ? 'Efisien (Favorable)' : 'Boros (Unfavorable)'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      bodyHtml = `
        <table>
          <thead>
            <tr><th>Komponen Biaya</th><th class="text-right">Full Costing (GAAP)</th><th class="text-right">Variable Costing</th><th class="text-center">Keterangan</th></tr>
          </thead>
          <tbody>
            <tr><td>Bahan Baku Langsung</td><td class="text-right font-bold">${formatRupiah(materialCost)}</td><td class="text-right font-bold">${formatRupiah(materialCost)}</td><td class="text-center">Diperhitungkan sama</td></tr>
            <tr><td>Tenaga Kerja Langsung (BTKL)</td><td class="text-right font-bold">${formatRupiah(laborCost)}</td><td class="text-right font-bold">${formatRupiah(laborCost)}</td><td class="text-center">Diperhitungkan sama</td></tr>
            <tr><td>Overhead Pabrik Variabel</td><td class="text-right font-bold">${formatRupiah(variableOverhead)}</td><td class="text-right font-bold">${formatRupiah(variableOverhead)}</td><td class="text-center">Diperhitungkan sama</td></tr>
            <tr><td>Kemasan Produk</td><td class="text-right font-bold">${formatRupiah(packagingCost)}</td><td class="text-right font-bold">${formatRupiah(packagingCost)}</td><td class="text-center">Diperhitungkan sama</td></tr>
            <tr><td>Overhead Pabrik Tetap (Sewa/Mesin)</td><td class="text-right font-bold" style="color: #7e22ce;">${formatRupiah(fixedOverhead)}</td><td class="text-right font-bold" style="color: #dc2626;">Rp 0 (Beban Periode)</td><td class="text-center">Perbedaan Utama</td></tr>
            <tr style="background: #f1f5f9; font-weight: bold;"><td>TOTAL BIAYA PRODUKSI BATCH</td><td class="text-right font-bold" style="color: #047857; font-size: 11pt;">${formatRupiah(fullCostingTotal)}</td><td class="text-right font-bold" style="color: #1d4ed8; font-size: 11pt;">${formatRupiah(variableCostingTotal)}</td><td class="text-center font-bold">Selisih: ${formatRupiah(fixedOverhead)}</td></tr>
            <tr style="background: #ecfdf5; font-weight: bold;"><td>HPP PER SATUAN UNIT (${bom.batchYield} ${bom.yieldUnit})</td><td class="text-right font-bold" style="color: #047857; font-size: 12pt;">${formatRupiah(fullCostingHppPerUnit)}</td><td class="text-right font-bold" style="color: #1d4ed8; font-size: 12pt;">${formatRupiah(variableCostingHppPerUnit)}</td><td class="text-center font-bold">Per unit: ${formatRupiah(fixedOverhead / (bom.batchYield || 1))}</td></tr>
          </tbody>
        </table>
      `;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 10.5pt; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
    .company { font-size: 16pt; font-weight: 800; color: #0f172a; }
    .doc-title { font-size: 12pt; font-weight: 700; color: #047857; text-transform: uppercase; margin-top: 4px; }
    .meta { font-size: 9pt; color: #64748b; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 9.5pt; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 7px 10px; border: 1px solid #cbd5e1; }
    td { padding: 7px 10px; border: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; page-break-inside: avoid; }
    .sign-box { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px; text-align: center; height: 100px; display: flex; flex-direction: column; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company">${companySettings.companyName || 'SaaS Kalkulator HPP Indonesia'}</div>
      <div class="doc-title">${title}</div>
    </div>
    <div class="meta">
      <div>Tanggal Cetak: <strong>${currentDate}</strong></div>
      <div>Modul: <strong>3.3 Akuntansi HPP</strong></div>
    </div>
  </div>

  ${bodyHtml}

  <div class="footer-signatures">
    <div class="sign-box">
      <div style="font-size: 8.5pt; color: #64748b; font-weight: bold;">Dibuat Oleh (Cost Accounting):</div>
      <div style="border-top: 1px solid #94a3b8; font-weight: bold; margin-top: 40px; padding-top: 4px;">Bagian Akuntansi Biaya</div>
    </div>
    <div class="sign-box">
      <div style="font-size: 8.5pt; color: #64748b; font-weight: bold;">Disetujui Oleh (Finance Director):</div>
      <div style="border-top: 1px solid #94a3b8; font-weight: bold; margin-top: 40px; padding-top: 4px;">Manajer Keuangan & Pabrik</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-hpp-${activeTab.toLowerCase()}-${Date.now().toString().slice(-4)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Dokumen Siap Cetak', 'File cetak/PDF berhasil diunduh dan dialog cetak akan otomatis terbuka.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              3.3 Perhitungan HPP
            </span>
            <span className="text-xs text-slate-500 font-mono">Formal Costing Statements</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Perhitungan & Laporan Harga Pokok Produksi (HPP)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan formal HPP produk, rekapitulasi batch, komparasi standar vs aktual, serta komparasi Full Costing vs Variable Costing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Buka Pratinjau & Cetak Laporan Formal HPP"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {/* Sub-menu Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('PRODUK')}
          className={`flex-1 min-w-[180px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'PRODUK'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>HPP per Produk</span>
        </button>

        <button
          onClick={() => setActiveTab('BATCH')}
          className={`flex-1 min-w-[180px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'BATCH'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>HPP per Batch</span>
        </button>

        <button
          onClick={() => setActiveTab('KOMPARASI')}
          className={`flex-1 min-w-[180px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'KOMPARASI'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Standar vs Aktual</span>
        </button>

        <button
          onClick={() => setActiveTab('COSTING_METHOD')}
          className={`flex-1 min-w-[180px] text-xs py-2.5 px-3 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
            activeTab === 'COSTING_METHOD'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Full vs Variable Costing</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* Laporan HPP per Produk */}
      {/* ============================================================== */}
      {activeTab === 'PRODUK' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Daftar & Laporan HPP per Produk (Katalog Lengkap)
            </h3>
            <span className="text-xs text-slate-500 font-mono">{products.length} SKU Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Kode SKU</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4 text-center">Satuan</th>
                  <th className="py-3 px-4 text-right">Biaya Bahan (BOM)</th>
                  <th className="py-3 px-4 text-right">HPP Standar / Unit</th>
                  <th className="py-3 px-4 text-right">Harga Jual</th>
                  <th className="py-3 px-4 text-right">Laba Kotor</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {products.map((p) => {
                  const linkedB = boms.find((b) => b.productId === p.id);
                  const matCost = linkedB ? linkedB.totalMaterialCost / linkedB.batchYield : p.estimatedHpp * 0.6;
                  const profit = p.sellingPrice - p.estimatedHpp;
                  const marginPct = p.sellingPrice > 0 ? (profit / p.sellingPrice) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{p.sku}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{p.unit}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {formatRupiah(matCost)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatRupiah(p.estimatedHpp)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-blue-700">
                        {formatRupiah(profit)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* Laporan HPP per Batch */}
      {/* ============================================================== */}
      {activeTab === 'BATCH' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Laporan Realisasi HPP per Batch Produksi
            </h3>
            <span className="text-xs text-slate-500 font-mono">{batches.length} Batch Selesai & Berjalan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No Batch</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4 text-center">Output Hasil</th>
                  <th className="py-3 px-4 text-right">Total Biaya Riil</th>
                  <th className="py-3 px-4 text-right">HPP Riil / Unit</th>
                  <th className="py-3 px-4 text-right">HPP Standar / Unit</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{b.batchNumber}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">{b.date}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{b.productName}</td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {b.status === 'Selesai' ? `${b.actualOutput} unit` : `Target: ${b.plannedOutput} unit`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {b.status === 'Selesai' ? formatRupiah(b.actualCostTotal) : formatRupiah(b.standardCostTotal)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700">
                      {b.status === 'Selesai' ? formatRupiah(b.actualHppPerUnit) : formatRupiah(b.standardHppPerUnit)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                      {formatRupiah(b.standardHppPerUnit)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          b.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
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
      {/* Komparasi HPP Standar vs Aktual */}
      {/* ============================================================== */}
      {activeTab === 'KOMPARASI' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Komparasi HPP Standar (BOM) vs HPP Aktual (Realisasi Pabrik)
              </h3>
              <p className="text-[11px] text-slate-500">
                Analisis selisih efisiensi proses masak/baking dan pemakaian bahan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">No Batch</th>
                  <th className="py-3 px-4">Nama Produk</th>
                  <th className="py-3 px-4 text-right">HPP Standar</th>
                  <th className="py-3 px-4 text-right">HPP Realisasi</th>
                  <th className="py-3 px-4 text-right">Selisih Unit</th>
                  <th className="py-3 px-4 text-right">Total Selisih Batch</th>
                  <th className="py-3 px-4 text-center">Status Varian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {batches.filter((b) => b.status === 'Selesai').map((b) => {
                  const unitDiff = (b.actualHppPerUnit || 0) - b.standardHppPerUnit;
                  const isOver = b.costVariance > 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{b.batchNumber}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{b.productName}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {formatRupiah(b.standardHppPerUnit)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(b.actualHppPerUnit)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {unitDiff > 0 ? '+' : ''}{formatRupiah(unitDiff)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {b.costVariance > 0 ? '+' : ''}{formatRupiah(b.costVariance)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isOver ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOver ? 'Unfavorable (Boros)' : 'Favorable (Hemat)'}
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
      {/* 3.3.4 HPP Full Costing vs Variable Costing */}
      {/* ============================================================== */}
      {activeTab === 'COSTING_METHOD' && (
        <div className="space-y-6">
          {/* BOM Selector Header */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Pilih Formula / Resep untuk Dianalisis:</span>
            </div>
            <select
              value={selectedBomId}
              onChange={(e) => setSelectedBomId(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
            >
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.productName}
                </option>
              ))}
            </select>
          </div>

          {/* Side-by-side Method Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Full Costing */}
            <div className="bg-white rounded-2xl border-2 border-emerald-500/80 shadow-md p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                Standar SAK / Pajak
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  FC
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Metode Full Costing (Absorption)</h3>
                  <p className="text-xs text-slate-500">Menyerap seluruh biaya tetap & variabel dapur/pabrik</p>
                </div>
              </div>

              {/* Statement Table */}
              <div className="space-y-2.5 text-xs text-slate-700 divide-y divide-slate-100">
                <div className="flex justify-between pt-1 font-medium">
                  <span>Biaya Bahan Baku Langsung:</span>
                  <span className="font-mono">{formatRupiah(materialCost)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                  <span>Biaya Tenaga Kerja Langsung (BTKL):</span>
                  <span className="font-mono">{formatRupiah(laborCost)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                  <span>Biaya Overhead Pabrik (BOP) Variabel:</span>
                  <span className="font-mono">{formatRupiah(variableOverhead)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium bg-emerald-50/50 p-1.5 rounded-lg text-emerald-900">
                  <span className="font-bold">Biaya Overhead Pabrik (BOP) Tetap:</span>
                  <span className="font-mono font-bold">{formatRupiah(fixedOverhead)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                  <span>Biaya Kemasan / Packaging:</span>
                  <span className="font-mono">{formatRupiah(packagingCost)}</span>
                </div>
                <div className="flex justify-between pt-3 text-sm font-bold text-slate-900 border-t-2 border-slate-800">
                  <span>Total Beban Pokok Produksi:</span>
                  <span className="font-mono text-emerald-700">{formatRupiah(fullCostingTotal)}</span>
                </div>
              </div>

              {/* Unit Metric Box */}
              <div className="mt-5 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider">
                    HPP Full Costing / Unit ({bom.batchYield} {bom.yieldUnit})
                  </div>
                  <div className="text-2xl font-black text-emerald-900 font-mono mt-0.5">
                    {formatRupiah(fullCostingHppPerUnit)}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-500">Margin Laba Kotor:</div>
                  <div className="font-mono font-bold text-emerald-700">
                    {formatPercent(sellingPrice > 0 ? ((sellingPrice - fullCostingHppPerUnit) / sellingPrice) * 100 : 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Variable Costing */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                Manajerial / BEP
              </div>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  VC
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Metode Variable Costing (Marginal)</h3>
                  <p className="text-xs text-slate-500">Hanya memperhitungkan biaya yang berubah proporsional volume</p>
                </div>
              </div>

              {/* Statement Table */}
              <div className="space-y-2.5 text-xs text-slate-700 divide-y divide-slate-100">
                <div className="flex justify-between pt-1 font-medium">
                  <span>Biaya Bahan Baku Langsung:</span>
                  <span className="font-mono">{formatRupiah(materialCost)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                  <span>Biaya Tenaga Kerja Langsung (BTKL):</span>
                  <span className="font-mono">{formatRupiah(laborCost)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                  <span>Biaya Overhead Pabrik (BOP) Variabel:</span>
                  <span className="font-mono">{formatRupiah(variableOverhead)}</span>
                </div>
                <div className="flex justify-between pt-2 font-medium text-slate-400">
                  <span>BOP Tetap (Diperlakukan sbg Biaya Periode):</span>
                  <span className="font-mono font-bold">Rp 0 (Diabaikan)</span>
                </div>
                <div className="flex justify-between pt-2 font-medium">
                  <span>Biaya Kemasan / Packaging:</span>
                  <span className="font-mono">{formatRupiah(packagingCost)}</span>
                </div>
                <div className="flex justify-between pt-3 text-sm font-bold text-slate-900 border-t-2 border-slate-800">
                  <span>Total Biaya Variabel Batch:</span>
                  <span className="font-mono text-blue-700">{formatRupiah(variableCostingTotal)}</span>
                </div>
              </div>

              {/* Unit Metric Box */}
              <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-blue-800 uppercase font-bold tracking-wider">
                    HPP Variable Costing / Unit ({bom.batchYield} {bom.yieldUnit})
                  </div>
                  <div className="text-2xl font-black text-blue-900 font-mono mt-0.5">
                    {formatRupiah(variableCostingHppPerUnit)}
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-500">Margin Kontribusi:</div>
                  <div className="font-mono font-bold text-blue-700">
                    {formatPercent(sellingPrice > 0 ? ((sellingPrice - variableCostingHppPerUnit) / sellingPrice) * 100 : 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Difference Analysis Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Kesimpulan & Rekomendasi Akuntansi Biaya
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 pt-1">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="font-semibold text-white">Selisih Alokasi BOP Tetap / Unit</div>
                <div className="font-mono text-lg font-bold text-amber-400 mt-1">
                  {formatRupiah(fullCostingHppPerUnit - variableCostingHppPerUnit)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Nilai alokasi biaya sewa, mesin, dan overhead tetap per satu unit barang jadi.
                </div>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="font-semibold text-white">Untuk Penetapan Harga Jual</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Gunakan <span className="text-emerald-400 font-bold">Full Costing</span> ({formatRupiah(fullCostingHppPerUnit)}) sebagai batas dasar agar seluruh biaya operasional dapur/pabrik tertutupi dan tidak merugi.
                </p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="font-semibold text-white">Untuk Pesanan Khusus / BEP</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Gunakan <span className="text-blue-400 font-bold">Variable Costing</span> ({formatRupiah(variableCostingHppPerUnit)}) untuk evaluasi pesanan khusus kapasitas menganggur (order massal B2B).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL PRATINJAU CETAK & EKSPOR PDF RESMI PERHITUNGAN HPP */}
      {/* ============================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Pratinjau Dokumen Cetak / PDF Formal HPP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {getReportSubTitle()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPrintHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
                  title="Unduh file dokumen yang otomatis membuka dialog cetak / Simpan PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    showToast('Perintah Cetak Dikirim', 'Membuka dialog cetak sistem.', 'info');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Sekarang (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content (A4 Sheet Simulation) */}
            <div className="p-6 overflow-y-auto bg-slate-100/70 flex-1">
              <div className="bg-white max-w-3xl mx-auto p-8 rounded-xl shadow-md border border-slate-300 text-slate-800 text-xs space-y-5">
                {/* Official Letterhead */}
                <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-end">
                  <div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                      {companySettings.companyName || 'SaaS Kalkulator HPP Indonesia'}
                    </h2>
                    <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                      {getReportSubTitle()}
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div>Tanggal: <strong>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                    <div>Modul: <strong>3.3 Akuntansi HPP</strong></div>
                  </div>
                </div>

                {/* Report Content based on activeTab */}
                {activeTab === 'PRODUK' && (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Produk:</span>
                        <strong className="text-xs text-slate-900">{bom.productName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Kode Resep:</span>
                        <strong className="text-xs font-mono text-purple-700">{bom.code}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold block">Yield Resep:</span>
                        <strong className="text-xs text-slate-900">{bom.batchYield} {bom.yieldUnit}</strong>
                      </div>
                    </div>

                    <table className="w-full text-[11px] border border-slate-200 text-left">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">Komponen Biaya Produksi</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya per Batch</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya per Unit</th>
                          <th className="p-2 border border-slate-200 text-center">Porsi (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 border border-slate-200 font-semibold">1. Biaya Bahan Baku Langsung (BBL)</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(materialCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(materialCost / (bom.batchYield || 1))}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold">{formatPercent(fullCostingTotal > 0 ? (materialCost / fullCostingTotal) * 100 : 0)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-semibold">2. Biaya Tenaga Kerja Langsung (BTKL)</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(laborCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(laborCost / (bom.batchYield || 1))}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold">{formatPercent(fullCostingTotal > 0 ? (laborCost / fullCostingTotal) * 100 : 0)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-semibold">3. Biaya Overhead Pabrik Variabel</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(variableOverhead)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(variableOverhead / (bom.batchYield || 1))}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold">{formatPercent(fullCostingTotal > 0 ? (variableOverhead / fullCostingTotal) * 100 : 0)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-semibold">4. Biaya Overhead Tetap Pabrik</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(fixedOverhead)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(fixedOverhead / (bom.batchYield || 1))}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold">{formatPercent(fullCostingTotal > 0 ? (fixedOverhead / fullCostingTotal) * 100 : 0)}</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-semibold">5. Biaya Kemasan / Packaging</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(packagingCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(packagingCost / (bom.batchYield || 1))}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono font-bold">{formatPercent(fullCostingTotal > 0 ? (packagingCost / fullCostingTotal) * 100 : 0)}</td>
                        </tr>
                        <tr className="bg-emerald-50 font-bold">
                          <td className="p-2 border border-slate-200 text-slate-900">TOTAL HARGA POKOK PRODUKSI (FULL COSTING)</td>
                          <td className="p-2 border border-slate-200 text-right font-mono text-emerald-800 text-xs">{formatRupiah(fullCostingTotal)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono text-emerald-800 text-xs">{formatRupiah(fullCostingHppPerUnit)}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'BATCH' && (
                  <div className="space-y-4">
                    <table className="w-full text-[11px] border border-slate-200 text-left">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">No SPK</th>
                          <th className="p-2 border border-slate-200">Tanggal</th>
                          <th className="p-2 border border-slate-200">Produk</th>
                          <th className="p-2 border border-slate-200 text-center">Output</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya Aktual</th>
                          <th className="p-2 border border-slate-200 text-right">HPP Realisasi</th>
                          <th className="p-2 border border-slate-200 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {batches.map((b) => (
                          <tr key={b.id}>
                            <td className="p-2 border border-slate-200 font-mono font-bold text-blue-700">{b.batchNumber}</td>
                            <td className="p-2 border border-slate-200">{b.date}</td>
                            <td className="p-2 border border-slate-200 font-medium">{b.productName}</td>
                            <td className="p-2 border border-slate-200 text-center font-mono">{b.actualOutput} unit</td>
                            <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(b.actualCostTotal || b.standardCostTotal)}</td>
                            <td className="p-2 border border-slate-200 text-right font-mono font-bold text-emerald-700">
                              {formatRupiah(b.actualOutput > 0 ? (b.actualCostTotal || b.standardCostTotal) / b.actualOutput : 0)}
                            </td>
                            <td className="p-2 border border-slate-200 text-center font-semibold text-[10px]">{b.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'KOMPARASI' && (
                  <div className="space-y-4">
                    <table className="w-full text-[11px] border border-slate-200 text-left">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">No SPK</th>
                          <th className="p-2 border border-slate-200">Produk</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya Standar</th>
                          <th className="p-2 border border-slate-200 text-right">Biaya Aktual</th>
                          <th className="p-2 border border-slate-200 text-right">Variansi Biaya</th>
                          <th className="p-2 border border-slate-200 text-center">Evaluasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {batches.map((b) => {
                          const variance = b.costVariance || 0;
                          const isFav = variance <= 0;
                          return (
                            <tr key={b.id}>
                              <td className="p-2 border border-slate-200 font-mono font-bold">{b.batchNumber}</td>
                              <td className="p-2 border border-slate-200 font-medium">{b.productName}</td>
                              <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(b.standardCostTotal)}</td>
                              <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(b.actualCostTotal || b.standardCostTotal)}</td>
                              <td className={`p-2 border border-slate-200 text-right font-mono font-bold ${isFav ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {formatRupiah(Math.abs(variance))}
                              </td>
                              <td className={`p-2 border border-slate-200 text-center font-bold text-[10px] ${isFav ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {isFav ? 'Efisien (Favorable)' : 'Boros (Unfavorable)'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'COSTING_METHOD' && (
                  <div className="space-y-4">
                    <table className="w-full text-[11px] border border-slate-200 text-left">
                      <thead className="bg-slate-100 font-semibold text-slate-700">
                        <tr>
                          <th className="p-2 border border-slate-200">Komponen Biaya</th>
                          <th className="p-2 border border-slate-200 text-right">Full Costing (GAAP)</th>
                          <th className="p-2 border border-slate-200 text-right">Variable Costing</th>
                          <th className="p-2 border border-slate-200 text-center">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 border border-slate-200 font-medium">Bahan Baku Langsung</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(materialCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(materialCost)}</td>
                          <td className="p-2 border border-slate-200 text-center text-slate-500">Diperhitungkan sama</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-medium">Tenaga Kerja Langsung (BTKL)</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(laborCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(laborCost)}</td>
                          <td className="p-2 border border-slate-200 text-center text-slate-500">Diperhitungkan sama</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-medium">Overhead Pabrik Variabel</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(variableOverhead)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(variableOverhead)}</td>
                          <td className="p-2 border border-slate-200 text-center text-slate-500">Diperhitungkan sama</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-medium">Kemasan Produk</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(packagingCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold">{formatRupiah(packagingCost)}</td>
                          <td className="p-2 border border-slate-200 text-center text-slate-500">Diperhitungkan sama</td>
                        </tr>
                        <tr>
                          <td className="p-2 border border-slate-200 font-medium">Overhead Pabrik Tetap (Sewa/Mesin)</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold text-purple-700">{formatRupiah(fixedOverhead)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold text-rose-600">Rp 0 (Beban Periode)</td>
                          <td className="p-2 border border-slate-200 text-center text-amber-700 font-semibold">Perbedaan Utama</td>
                        </tr>
                        <tr className="bg-slate-50 font-bold">
                          <td className="p-2 border border-slate-200">TOTAL BIAYA PRODUKSI BATCH</td>
                          <td className="p-2 border border-slate-200 text-right font-mono text-emerald-800">{formatRupiah(fullCostingTotal)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono text-blue-800">{formatRupiah(variableCostingTotal)}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">Selisih: {formatRupiah(fixedOverhead)}</td>
                        </tr>
                        <tr className="bg-emerald-50 font-bold">
                          <td className="p-2 border border-slate-200">HPP PER SATUAN UNIT ({bom.batchYield} {bom.yieldUnit})</td>
                          <td className="p-2 border border-slate-200 text-right font-mono text-emerald-800 text-xs">{formatRupiah(fullCostingHppPerUnit)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono text-blue-800 text-xs">{formatRupiah(variableCostingHppPerUnit)}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-purple-700">Per unit: {formatRupiah(fixedOverhead / (bom.batchYield || 1))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Signature Blocks */}
                <div className="pt-6 grid grid-cols-2 gap-10 text-center text-[10px] text-slate-600">
                  <div className="space-y-12">
                    <div>Dibuat Oleh (Cost Accounting):</div>
                    <div className="border-t border-slate-400 font-bold text-slate-800 pt-1">
                      Bagian Akuntansi Biaya
                    </div>
                  </div>
                  <div className="space-y-12">
                    <div>Disetujui Oleh (Finance Director):</div>
                    <div className="border-t border-slate-400 font-bold text-slate-800 pt-1">
                      Manajer Keuangan & Pabrik
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Gunakan tombol <strong>Cetak Sekarang</strong> atau <strong>Unduh Dokumen PDF</strong> untuk menyimpan arsip laporan fisik/digital.</span>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
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
