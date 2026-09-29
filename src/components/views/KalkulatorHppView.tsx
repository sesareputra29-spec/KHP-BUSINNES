import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  CostingMethod,
  BomIngredient,
  DirectLaborCost,
  OverheadCost,
  PackagingCost,
} from '../../types';
import {
  formatRupiah,
  formatPercent,
  formatNumber,
  calculateIngredientCost,
  calculateLaborCost,
  calculatePricesFromHpp,
  calculateBEP,
} from '../../utils/calculator';
import {
  Calculator,
  Plus,
  Trash2,
  Save,
  Printer,
  RotateCcw,
  Sparkles,
  Layers,
  Percent,
  DollarSign,
  Package,
  Info,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  Lightbulb,
  X,
  FileText,
} from 'lucide-react';
import { exportToExcel } from '../../utils/excelHelper';

export const KalkulatorHppView: React.FC = () => {
  const { rawMaterials, products, categories, addBom, addProduct, showToast, companySettings } = useApp();

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 1.2.1 Pilih Produk
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [productName, setProductName] = useState('Roti Sobek Keju Cokelat Spesial');
  const [productCategory, setProductCategory] = useState<string>('cat-p1');
  const [yieldUnit, setYieldUnit] = useState<string>('box');
  const [batchYield, setBatchYield] = useState<number>(20);

  // 1.2.2 Komponen Bahan Baku
  const [ingredients, setIngredients] = useState<BomIngredient[]>([
    {
      rawMaterialId: rawMaterials[0]?.id || 'mat-1',
      rawMaterialName: rawMaterials[0]?.name || 'Tepung Terigu Protein Tinggi (Cakra Kembar)',
      quantity: 3000,
      unit: 'gr',
      unitCost: 14.5,
      shrinkagePct: 1.5,
      grossQuantity: 3045,
      totalCost: 44152.5,
    },
    {
      rawMaterialId: rawMaterials[1]?.id || 'mat-2',
      rawMaterialName: rawMaterials[1]?.name || 'Gula Pasir Kristal Putih (Gulaku)',
      quantity: 500,
      unit: 'gr',
      unitCost: 17.5,
      shrinkagePct: 1.0,
      grossQuantity: 505,
      totalCost: 8837.5,
    },
    {
      rawMaterialId: rawMaterials[2]?.id || 'mat-3',
      rawMaterialName: rawMaterials[2]?.name || 'Mentega / Butter Anchor Salted',
      quantity: 450,
      unit: 'gr',
      unitCost: 165,
      shrinkagePct: 2.0,
      grossQuantity: 459,
      totalCost: 75735,
    },
  ]);

  // 1.2.3 Biaya Tenaga Kerja
  const [laborCosts, setLaborCosts] = useState<DirectLaborCost[]>([
    {
      jobTitle: 'Baker Adonan & Oven',
      numWorkers: 1,
      hourlyRate: companySettings.hourlyLaborRateStandard || 35000,
      hoursWorked: 3.5,
      totalCost: 122500,
    },
    {
      jobTitle: 'Asisten Baker (Isian & Rolling)',
      numWorkers: 1,
      hourlyRate: 25000,
      hoursWorked: 3.0,
      totalCost: 75000,
    },
  ]);

  // 1.2.4 Biaya Overhead (Explicit sub-items: Listrik, Gas, Air, Sewa, Penyusutan, Kemasan, Biaya Lainnya)
  const [overheadListrik, setOverheadListrik] = useState<number>(18000);
  const [overheadGas, setOverheadGas] = useState<number>(32000);
  const [overheadAir, setOverheadAir] = useState<number>(5000);
  const [overheadSewa, setOverheadSewa] = useState<number>(25000);
  const [overheadPenyusutan, setOverheadPenyusutan] = useState<number>(15000);
  const [overheadKemasan, setOverheadKemasan] = useState<number>(44000);
  const [overheadLainnya, setOverheadLainnya] = useState<number>(10000);

  // 1.2.6 Harga Jual
  const [targetMarginPct, setTargetMarginPct] = useState<number>(companySettings.defaultMarginTargetPct || 40);
  const [actualSellingPrice, setActualSellingPrice] = useState<number>(42000);

  // 1.2.5 Perhitungan
  const totalBahanBaku = ingredients.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalTenagaKerja = laborCosts.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  const totalOverhead =
    overheadListrik +
    overheadGas +
    overheadAir +
    overheadSewa +
    overheadPenyusutan +
    overheadKemasan +
    overheadLainnya;

  const totalBiayaProduksi = totalBahanBaku + totalTenagaKerja + totalOverhead;
  const validYield = batchYield > 0 ? batchYield : 1;
  const hppPerUnit = totalBiayaProduksi / validYield;

  // 1.2.6 Harga Jual Calculations
  const markupPct = (targetMarginPct / (100 - targetMarginPct)) * 100;
  const hargaJualRekomendasi = Math.ceil((hppPerUnit / (1 - targetMarginPct / 100)) / 500) * 500;
  const profitPerUnit = actualSellingPrice - hppPerUnit;
  const actualMarginPct = actualSellingPrice > 0 ? (profitPerUnit / actualSellingPrice) * 100 : 0;
  const actualMarkupPct = hppPerUnit > 0 ? (profitPerUnit / hppPerUnit) * 100 : 0;

  // 1.2.7 Hasil Analisis
  let statusMargin = 'Margin Sesuai Target';
  if (actualMarginPct >= targetMarginPct + 10) statusMargin = 'Margin Tinggi';
  else if (actualMarginPct >= targetMarginPct) statusMargin = 'Margin Sesuai Target';
  else if (actualMarginPct >= targetMarginPct - 15) statusMargin = 'Margin Perlu Review';
  else statusMargin = 'Margin Rendah';

  const bepCalc = calculateBEP(
    overheadSewa + overheadPenyusutan + 5000000, // Fixed cost share
    actualSellingPrice,
    hppPerUnit * 0.8
  );

  const selisihTarget = actualMarginPct - targetMarginPct;

  // Handlers for ingredients
  const handleAddIngredient = () => {
    const defaultMat = rawMaterials[0];
    const newIng: BomIngredient = {
      rawMaterialId: defaultMat?.id || '',
      rawMaterialName: defaultMat?.name || 'Pilih Bahan Baku',
      quantity: 100,
      unit: defaultMat?.unit || 'gr',
      unitCost: defaultMat?.costPerUnit || 10,
      shrinkagePct: defaultMat?.shrinkagePct || 2,
      grossQuantity: 102,
      totalCost: 102 * (defaultMat?.costPerUnit || 10),
    };
    setIngredients([...ingredients, newIng]);
  };

  const handleUpdateIngredient = (index: number, field: keyof BomIngredient, val: any) => {
    const updated = [...ingredients];
    const item = { ...updated[index], [field]: val };

    if (field === 'rawMaterialId') {
      const selected = rawMaterials.find((m) => m.id === val);
      if (selected) {
        item.rawMaterialName = selected.name;
        item.unit = selected.unit;
        item.unitCost = selected.costPerUnit;
        item.shrinkagePct = selected.shrinkagePct || 0;
      }
    }

    const { grossQuantity, totalCost } = calculateIngredientCost(
      item.quantity,
      item.unitCost,
      item.shrinkagePct
    );
    item.grossQuantity = grossQuantity;
    item.totalCost = totalCost;

    updated[index] = item;
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, idx) => idx !== index));
  };

  // Labor Handlers
  const handleAddLabor = () => {
    setLaborCosts([
      ...laborCosts,
      {
        jobTitle: 'Tenaga Packing & Quality Control',
        numWorkers: 1,
        hourlyRate: 25000,
        hoursWorked: 2,
        totalCost: 50000,
      },
    ]);
  };

  const handleUpdateLabor = (index: number, field: keyof DirectLaborCost, val: any) => {
    const updated = [...laborCosts];
    const item = { ...updated[index], [field]: val };
    item.totalCost = calculateLaborCost(item.numWorkers, item.hourlyRate, item.hoursWorked);
    updated[index] = item;
    setLaborCosts(updated);
  };

  const handleRemoveLabor = (index: number) => {
    setLaborCosts(laborCosts.filter((_, idx) => idx !== index));
  };

  // 1.2.8 Aksi Handlers
  const handleReset = () => {
    setProductName('Produk Baru');
    setBatchYield(20);
    setYieldUnit('pcs');
    setTargetMarginPct(40);
    setActualSellingPrice(35000);
    showToast('Kalkulator Direset', 'Semua nilai dikembalikan ke default.', 'info');
  };

  const handleSave = () => {
    const bomCode = 'BOM-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const bomId = addBom({
      productId: '',
      productName,
      code: bomCode,
      version: 'v1.0 (Kalkulator)',
      batchYield,
      yieldUnit,
      ingredients,
      laborCosts,
      overheadCosts: [
        { name: 'Listrik Oven & Mixer', category: 'Listrik', isVariable: true, amount: overheadListrik },
        { name: 'Gas LPG', category: 'Gas', isVariable: true, amount: overheadGas },
        { name: 'Air & Sanitasi', category: 'Air', isVariable: true, amount: overheadAir },
        { name: 'Sewa Tempat', category: 'Sewa', isVariable: false, amount: overheadSewa },
        { name: 'Penyusutan Alat', category: 'Penyusutan', isVariable: false, amount: overheadPenyusutan },
        { name: 'Biaya Lainnya', category: 'Biaya Lainnya', isVariable: true, amount: overheadLainnya },
      ],
      packagingCosts: [
        { name: 'Kemasan Produk', unitCost: overheadKemasan / validYield, quantity: validYield, totalCost: overheadKemasan },
      ],
      costingMethod: 'FULL_COSTING',
      totalMaterialCost: totalBahanBaku,
      totalLaborCost: totalTenagaKerja,
      totalVariableOverheadCost: overheadListrik + overheadGas + overheadAir + overheadLainnya,
      totalFixedOverheadCost: overheadSewa + overheadPenyusutan,
      totalPackagingCost: overheadKemasan,
      totalBatchCost: totalBiayaProduksi,
      hppPerUnit,
    });

    const skuCode = 'SKU-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    addProduct({
      sku: skuCode,
      name: productName,
      categoryId: productCategory,
      unit: yieldUnit,
      currentStock: 0,
      initialStock: 0,
      minStock: 10,
      targetMarginPct,
      estimatedHpp: hppPerUnit,
      sellingPrice: actualSellingPrice,
      activeBomId: bomId,
      status: 'Aktif',
      description: `Kalkulasi HPP ${productName} (Yield: ${batchYield} ${yieldUnit})`,
    });
  };

  const handleExportExcel = () => {
    const rows = [
      ['KOMPONEN BIAYA', 'RINCIAN', 'SUBTOTAL (IDR)'],
      ['1. Bahan Baku Langsung', `${ingredients.length} jenis bahan`, totalBahanBaku],
      ...ingredients.map((ing) => [`- ${ing.rawMaterialName}`, `${ing.quantity} ${ing.unit} (Susut ${ing.shrinkagePct}%)`, ing.totalCost]),
      ['2. Tenaga Kerja Langsung (BTKL)', `${laborCosts.length} posisi pekerja`, totalTenagaKerja],
      ...laborCosts.map((l) => [`- ${l.jobTitle}`, `${l.numWorkers} orang x ${l.hoursWorked} jam`, l.totalCost]),
      ['3. Biaya Overhead Pabrik (BOP)', 'Total Overhead', totalOverhead],
      ['- Listrik', 'Biaya per batch', overheadListrik],
      ['- Gas', 'Biaya per batch', overheadGas],
      ['- Air', 'Biaya per batch', overheadAir],
      ['- Sewa Tempat', 'Alokasi batch', overheadSewa],
      ['- Penyusutan Alat', 'Depresiasi', overheadPenyusutan],
      ['- Kemasan', 'Box / Toples', overheadKemasan],
      ['- Biaya Lainnya', 'Operasional', overheadLainnya],
      ['TOTAL BIAYA PRODUKSI', `Yield: ${batchYield} ${yieldUnit}`, totalBiayaProduksi],
      ['HPP PER UNIT', '', hppPerUnit],
      ['HARGA JUAL REKOMENDASI', `Target Margin ${targetMarginPct}%`, hargaJualRekomendasi],
      ['HARGA JUAL AKTUAL', '', actualSellingPrice],
      ['LABA BERSIH PER UNIT', '', profitPerUnit],
      ['MARGIN AKTUAL %', '', `${actualMarginPct.toFixed(2)}%`],
    ];

    exportToExcel(
      `kalkulasi-hpp-${productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.xlsx`,
      'Kalkulasi HPP',
      ['KOMPONEN / ELEMEN BIAYA', 'PARAMETER / RINCIAN', 'NILAI RUPIAH (IDR)'],
      rows
    );
    showToast('Export Excel Berhasil', 'File kalkulasi HPP (.xlsx) telah diunduh.', 'success');
  };

  const handleDownloadPrintHtml = () => {
    const currentDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Lembar Kalkulasi HPP - ${productName}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 11pt; color: #1e293b; margin: 0; padding: 20px; line-height: 1.5; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
    .company { font-size: 16pt; font-weight: 800; color: #0f172a; }
    .doc-title { font-size: 13pt; font-weight: 700; color: #059669; text-transform: uppercase; margin-top: 4px; }
    .meta { font-size: 9pt; color: #64748b; text-align: right; }
    .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .info-label { font-size: 8.5pt; color: #64748b; text-transform: uppercase; font-weight: 600; }
    .info-val { font-size: 11pt; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .kpi-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; }
    .kpi-title { font-size: 8.5pt; color: #475569; font-weight: 600; text-transform: uppercase; }
    .kpi-num { font-size: 13pt; font-weight: 800; margin-top: 4px; color: #047857; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 9.5pt; }
    th { background: #f1f5f9; color: #334155; font-weight: 700; text-align: left; padding: 6px 10px; border: 1px solid #cbd5e1; }
    td { padding: 6px 10px; border: 1px solid #e2e8f0; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .section-title { font-size: 11pt; font-weight: 700; color: #0f172a; margin: 14px 0 6px 0; border-left: 3px solid #059669; padding-left: 8px; }
    .footer-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; page-break-inside: avoid; }
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
      <div class="doc-title">Lembar Kalkulasi HPP & Penetapan Harga Jual</div>
    </div>
    <div class="meta">
      <div>Tanggal Cetak: <strong>${currentDate}</strong></div>
      <div>No. Ref: <strong>CALC-${Date.now().toString().slice(-6)}</strong></div>
    </div>
  </div>

  <div class="info-card">
    <div>
      <div class="info-label">Nama Produk</div>
      <div class="info-val">${productName}</div>
    </div>
    <div>
      <div class="info-label">Hasil Produksi (Batch Yield)</div>
      <div class="info-val">${batchYield} ${yieldUnit}</div>
    </div>
    <div>
      <div class="info-label">Target Margin Laba</div>
      <div class="info-val">${targetMarginPct}%</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-box">
      <div class="kpi-title">Biaya Bahan Baku</div>
      <div class="kpi-num">${formatRupiah(totalBahanBaku)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Biaya Tenaga Kerja (BTKL)</div>
      <div class="kpi-num" style="color: #7e22ce;">${formatRupiah(totalTenagaKerja)}</div>
    </div>
    <div class="kpi-box">
      <div class="kpi-title">Biaya Overhead (BOP)</div>
      <div class="kpi-num" style="color: #d97706;">${formatRupiah(totalOverhead)}</div>
    </div>
    <div class="kpi-box" style="background: #ecfdf5; border-color: #059669;">
      <div class="kpi-title">HPP Pokok per Unit</div>
      <div class="kpi-num" style="color: #059669; font-size: 15pt;">${formatRupiah(hppPerUnit)}</div>
    </div>
  </div>

  <div class="section-title">1. Rincian Komposisi Bahan Baku Langsung</div>
  <table>
    <thead>
      <tr>
        <th>Nama Bahan Baku</th>
        <th class="text-right">Qty Resep</th>
        <th class="text-center">Susut %</th>
        <th class="text-right">Harga Satuan</th>
        <th class="text-right">Subtotal Biaya</th>
      </tr>
    </thead>
    <tbody>
      ${ingredients.map(ing => `
        <tr>
          <td><strong>${ing.rawMaterialName}</strong></td>
          <td class="text-right">${formatNumber(ing.quantity)} ${ing.unit}</td>
          <td class="text-center">${ing.shrinkagePct}%</td>
          <td class="text-right">${formatRupiah(ing.unitCost)} / ${ing.unit}</td>
          <td class="text-right font-bold">${formatRupiah(ing.totalCost)}</td>
        </tr>
      `).join('')}
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="4">TOTAL BIAYA BAHAN BAKU LANGSUNG</td>
        <td class="text-right" style="color: #047857;">${formatRupiah(totalBahanBaku)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">2. Rincian Biaya Tenaga Kerja Langsung (BTKL) & Overhead (BOP)</div>
  <table>
    <thead>
      <tr>
        <th>Elemen Biaya</th>
        <th class="text-center">Kuantitas / Waktu</th>
        <th class="text-right">Tarif / Satuan</th>
        <th class="text-right">Total Biaya</th>
      </tr>
    </thead>
    <tbody>
      ${laborCosts.map(l => `
        <tr>
          <td>Tenaga Kerja: <strong>${l.jobTitle}</strong></td>
          <td class="text-center">${l.numWorkers} orang x ${l.hoursWorked} jam</td>
          <td class="text-right">${formatRupiah(l.hourlyRate)} / jam</td>
          <td class="text-right font-bold">${formatRupiah(l.totalCost)}</td>
        </tr>
      `).join('')}
      <tr>
        <td>Overhead Utilitas (Listrik, Gas, Air)</td>
        <td class="text-center">Operasional Batch</td>
        <td class="text-right">-</td>
        <td class="text-right font-bold">${formatRupiah(overheadListrik + overheadGas + overheadAir)}</td>
      </tr>
      <tr>
        <td>Overhead Pabrik (Sewa & Penyusutan Alat)</td>
        <td class="text-center">Alokasi Mesin</td>
        <td class="text-right">-</td>
        <td class="text-right font-bold">${formatRupiah(overheadSewa + overheadPenyusutan)}</td>
      </tr>
      <tr>
        <td>Kemasan & Packaging Produk</td>
        <td class="text-center">${batchYield} ${yieldUnit}</td>
        <td class="text-right">${formatRupiah(overheadKemasan / validYield)} / ${yieldUnit}</td>
        <td class="text-right font-bold">${formatRupiah(overheadKemasan)}</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td colspan="3">TOTAL BIAYA PRODUKSI BATCH (BAHAN + BTKL + BOP)</td>
        <td class="text-right" style="color: #047857; font-size: 11pt;">${formatRupiah(totalBiayaProduksi)}</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">3. Ringkasan Penetapan Harga Jual & Profitabilitas per Unit</div>
  <table>
    <thead>
      <tr>
        <th>Metrik Finansial</th>
        <th class="text-right">HPP Standar</th>
        <th class="text-right">Harga Jual Aktual</th>
        <th class="text-right">Laba Satuan</th>
        <th class="text-center">Margin %</th>
        <th class="text-center">Markup %</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Kalkulasi Pokok Produk</strong></td>
        <td class="text-right font-bold">${formatRupiah(hppPerUnit)}</td>
        <td class="text-right font-bold" style="color: #1d4ed8;">${formatRupiah(actualSellingPrice)}</td>
        <td class="text-right font-bold" style="color: #047857;">${formatRupiah(profitPerUnit)}</td>
        <td class="text-center font-bold" style="color: #047857;">${formatPercent(actualMarginPct)}</td>
        <td class="text-center font-bold">${formatPercent(actualMarkupPct)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-signatures">
    <div class="sign-box">
      <div style="font-size: 8.5pt; color: #64748b; font-weight: bold;">Dihitung Oleh (Cost Accountant):</div>
      <div style="border-top: 1px solid #94a3b8; font-weight: bold; margin-top: 40px; padding-top: 4px;">Bagian Analisis HPP & Biaya</div>
    </div>
    <div class="sign-box">
      <div style="font-size: 8.5pt; color: #64748b; font-weight: bold;">Disetujui Oleh (Owner / Manajer):</div>
      <div style="border-top: 1px solid #94a3b8; font-weight: bold; margin-top: 40px; padding-top: 4px;">Pimpinan / Finance Manager</div>
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
    link.download = `lembar-kalkulasi-hpp-${productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.html`;
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
              1.2 Kalkulator HPP
            </span>
            <span className="text-xs text-slate-500 font-mono">Formula: Bahan + BTKL + BOP = HPP</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Kalkulator Lengkap Harga Pokok Produksi & Analisis Margin
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Susun komponen bahan baku, alokasi jam kerja, overhead pabrik lengkap, dan tetapkan harga jual optimal.
          </p>
        </div>

        {/* 1.2.8 Aksi Tombol Cepat */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Buka Pratinjau & Cetak Dokumen Kalkulasi HPP"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 transition-colors"
            title="Export Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
            title="Reset"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Resep & Produk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Sections 1.2.1 through 1.2.4 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1.2.1 Pilih Produk */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              1.2.1 Parameter Produk & Rencana Batch
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Produk / Resep
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {categories.filter((c) => c.type === 'PRODUCT').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jumlah Produksi (Yield)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    value={batchYield}
                    onChange={(e) => setBatchYield(Math.max(1, Number(e.target.value)))}
                    className="w-full font-mono font-bold px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right"
                  />
                  <input
                    type="text"
                    value={yieldUnit}
                    onChange={(e) => setYieldUnit(e.target.value)}
                    className="w-16 px-1.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center"
                    placeholder="pcs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 1.2.2 Komponen Bahan Baku */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                    A
                  </span>
                  1.2.2 Komponen Bahan Baku & Waste / Susut
                </h3>
                <p className="text-[11px] text-slate-400">
                  Perhitungan otomatis susut pembersihan dan pemanggangan
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddIngredient}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bahan</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2 px-3">Bahan Baku</th>
                    <th className="py-2 px-3 text-right">Qty Resep</th>
                    <th className="py-2 px-3 text-center">Satuan</th>
                    <th className="py-2 px-3 text-right">Waste / Susut %</th>
                    <th className="py-2 px-3 text-right">Harga Satuan</th>
                    <th className="py-2 px-3 text-right">Total Biaya</th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3">
                        <select
                          value={item.rawMaterialId}
                          onChange={(e) => handleUpdateIngredient(idx, 'rawMaterialId', e.target.value)}
                          className="w-full bg-transparent font-medium text-slate-800"
                        >
                          {rawMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateIngredient(idx, 'quantity', Number(e.target.value))}
                          className="w-20 text-right font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200"
                        />
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">{item.unit}</td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.5"
                          value={item.shrinkagePct}
                          onChange={(e) => handleUpdateIngredient(idx, 'shrinkagePct', Number(e.target.value))}
                          className="w-16 text-right font-mono bg-slate-50 px-1 py-1 rounded border border-slate-200 text-amber-700"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatRupiah(item.unitCost)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(item.totalCost)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <td colSpan={5} className="py-2 px-3 text-slate-700">
                      Total Biaya Bahan Baku Langsung
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-blue-700 text-sm">
                      {formatRupiah(totalBahanBaku)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 1.2.3 Biaya Tenaga Kerja */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                    B
                  </span>
                  1.2.3 Biaya Tenaga Kerja Langsung (BTKL)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddLabor}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pekerja</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <th className="py-2 px-3">Jenis Pekerja</th>
                    <th className="py-2 px-3 text-center">Jumlah Orang</th>
                    <th className="py-2 px-3 text-right">Tarif per Jam</th>
                    <th className="py-2 px-3 text-right">Jumlah Jam</th>
                    <th className="py-2 px-3 text-right">Total Biaya</th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {laborCosts.map((l, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={l.jobTitle}
                          onChange={(e) => handleUpdateLabor(idx, 'jobTitle', e.target.value)}
                          className="w-full bg-transparent font-medium"
                        />
                      </td>
                      <td className="py-2 px-3 text-center">
                        <input
                          type="number"
                          min={1}
                          value={l.numWorkers}
                          onChange={(e) => handleUpdateLabor(idx, 'numWorkers', Number(e.target.value))}
                          className="w-16 text-center font-mono bg-slate-50 px-1 py-1 rounded border border-slate-200"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          value={l.hourlyRate}
                          onChange={(e) => handleUpdateLabor(idx, 'hourlyRate', Number(e.target.value))}
                          className="w-24 text-right font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.5"
                          value={l.hoursWorked}
                          onChange={(e) => handleUpdateLabor(idx, 'hoursWorked', Number(e.target.value))}
                          className="w-16 text-right font-mono bg-slate-50 px-1 py-1 rounded border border-slate-200"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {formatRupiah(l.totalCost)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLabor(idx)}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                    <td colSpan={4} className="py-2 px-3 text-slate-700">
                      Total Biaya Tenaga Kerja (BTKL)
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-emerald-700 text-sm">
                      {formatRupiah(totalTenagaKerja)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 1.2.4 Biaya Overhead Pabrik (Explicit Listrik, Gas, Air, Sewa, Penyusutan, Kemasan, Biaya Lainnya) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                C
              </span>
              1.2.4 Biaya Overhead Pabrik (BOP) Lengkap
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Listrik</label>
                <input
                  type="number"
                  value={overheadListrik}
                  onChange={(e) => setOverheadListrik(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gas</label>
                <input
                  type="number"
                  value={overheadGas}
                  onChange={(e) => setOverheadGas(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Air</label>
                <input
                  type="number"
                  value={overheadAir}
                  onChange={(e) => setOverheadAir(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sewa Tempat</label>
                <input
                  type="number"
                  value={overheadSewa}
                  onChange={(e) => setOverheadSewa(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Penyusutan</label>
                <input
                  type="number"
                  value={overheadPenyusutan}
                  onChange={(e) => setOverheadPenyusutan(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kemasan</label>
                <input
                  type="number"
                  value={overheadKemasan}
                  onChange={(e) => setOverheadKemasan(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Biaya Lainnya</label>
                <input
                  type="number"
                  value={overheadLainnya}
                  onChange={(e) => setOverheadLainnya(Number(e.target.value))}
                  className="w-full font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
              <span className="font-bold text-amber-900">Total Biaya Overhead (BOP):</span>
              <span className="font-mono font-extrabold text-amber-800 text-sm">
                {formatRupiah(totalOverhead)}
              </span>
            </div>
          </div>
        </div>

        {/* Right 1 Col: 1.2.5 Perhitungan & 1.2.6 Harga Jual & 1.2.7 Hasil Analisis */}
        <div className="space-y-6">
          {/* 1.2.5 Perhitungan Box */}
          <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white p-5 rounded-2xl shadow-xl border border-slate-800 space-y-4">
            <div className="border-b border-white/10 pb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                1.2.5 Rekapitulasi Perhitungan
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Harga Pokok Produksi (HPP)
              </h3>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Bahan Baku:</span>
                <span className="font-mono">{formatRupiah(totalBahanBaku)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Tenaga Kerja:</span>
                <span className="font-mono">{formatRupiah(totalTenagaKerja)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Total Overhead:</span>
                <span className="font-mono">{formatRupiah(totalOverhead)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-white/10 text-white font-bold">
                <span>Total Biaya Produksi:</span>
                <span className="font-mono">{formatRupiah(totalBiayaProduksi)}</span>
              </div>
            </div>

            {/* HPP per Unit Large */}
            <div className="pt-2 border-t border-white/10">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                HPP Pokok per Unit ({batchYield} {yieldUnit})
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-0.5">
                {formatRupiah(hppPerUnit)}
              </div>
            </div>
          </div>

          {/* 1.2.6 Harga Jual */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
              1.2.6 Penetapan Harga Jual
            </h3>

            <div>
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-slate-700">Target Margin:</span>
                <span className="font-mono font-bold text-emerald-700">{targetMarginPct}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={targetMarginPct}
                onChange={(e) => setTargetMarginPct(Number(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <div className="text-[10px] text-slate-400 mt-0.5">
                Setara Markup: <span className="font-bold">{markupPct.toFixed(1)}%</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div className="text-[10px] text-slate-400">Harga Jual Rekomendasi:</div>
              <div className="font-mono font-extrabold text-slate-900 text-lg">
                {formatRupiah(hargaJualRekomendasi)}
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Harga Jual Aktual yang Ditetapkan (Rp)
              </label>
              <input
                type="number"
                step={500}
                value={actualSellingPrice}
                onChange={(e) => setActualSellingPrice(Number(e.target.value))}
                className="w-full font-mono font-bold text-sm px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-right text-emerald-700"
              />
            </div>

            <div className="flex justify-between pt-1 text-slate-600">
              <span>Profit Bersih per Unit:</span>
              <span className="font-mono font-bold text-emerald-700">
                +{formatRupiah(profitPerUnit)}
              </span>
            </div>
          </div>

          {/* 1.2.7 Hasil Analisis */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
              1.2.7 Hasil Analisis & Kelayakan
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Margin Aktual:</span>
                <span className="font-mono font-extrabold text-sm text-slate-900">
                  {formatPercent(actualMarginPct)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Markup Aktual:</span>
                <span className="font-mono font-bold text-slate-700">
                  {formatPercent(actualMarkupPct)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status Margin:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    statusMargin === 'Margin Tinggi' || statusMargin === 'Margin Sesuai Target'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {statusMargin}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Selisih thd Target:</span>
                <span
                  className={`font-mono font-bold ${
                    selisihTarget >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {selisihTarget >= 0 ? `+${selisihTarget.toFixed(1)}%` : `${selisihTarget.toFixed(1)}%`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="text-slate-600">BEP Penjualan:</span>
                <span className="font-mono font-bold text-blue-700">
                  {formatNumber(bepCalc.bepUnits)} unit ({formatRupiah(bepCalc.bepRupiah)})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL PRATINJAU CETAK & EKSPOR PDF RESMI KALKULASI HPP */}
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
                    Pratinjau Dokumen Cetak / PDF Kalkulasi HPP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dokumen lembar kalkulasi biaya produksi dan penetapan harga jual resmi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPrintHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 transition-colors"
                  title="Unduh file HTML mandiri yang otomatis memicu dialog cetak / Simpan PDF"
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
                      Lembar Kalkulasi Harga Pokok Produksi (HPP) & Margin Laba
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-mono space-y-0.5">
                    <div>Tanggal: <strong>{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                    <div>Status: <span className="text-emerald-700 font-bold">Terverifikasi</span></div>
                  </div>
                </div>

                {/* Info Card */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Nama Produk:</span>
                    <strong className="text-xs text-slate-900">{productName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Target Yield (Batch):</span>
                    <strong className="text-xs text-slate-900">{batchYield} {yieldUnit}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block">Target Margin Laba:</span>
                    <strong className="text-xs text-emerald-700">{targetMarginPct}%</strong>
                  </div>
                </div>

                {/* KPI Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Biaya Bahan Baku</span>
                    <strong className="text-xs font-mono font-bold text-slate-800">{formatRupiah(totalBahanBaku)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Tenaga Kerja (BTKL)</span>
                    <strong className="text-xs font-mono font-bold text-purple-700">{formatRupiah(totalTenagaKerja)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Biaya Overhead (BOP)</span>
                    <strong className="text-xs font-mono font-bold text-amber-700">{formatRupiah(totalOverhead)}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-center">
                    <span className="text-[10px] text-emerald-700 uppercase font-bold block">HPP Pokok per Unit</span>
                    <strong className="text-sm font-mono font-black text-emerald-800">{formatRupiah(hppPerUnit)}</strong>
                  </div>
                </div>

                {/* Table 1: Bahan Baku */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-emerald-600 rounded-full inline-block"></span>
                    1. Rincian Komposisi Bahan Baku Langsung
                  </h4>
                  <table className="w-full text-[11px] border border-slate-200 text-left">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2 border border-slate-200">Nama Bahan Baku</th>
                        <th className="p-2 border border-slate-200 text-right">Kuantitas</th>
                        <th className="p-2 border border-slate-200 text-center">Susut %</th>
                        <th className="p-2 border border-slate-200 text-right">Harga Satuan</th>
                        <th className="p-2 border border-slate-200 text-right">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {ingredients.map((ing, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-medium">{ing.rawMaterialName}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatNumber(ing.quantity)} {ing.unit}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">{ing.shrinkagePct}%</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(ing.unitCost)}</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{formatRupiah(ing.totalCost)}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={4} className="p-2 border border-slate-200 text-slate-700">SUBTOTAL BIAYA BAHAN BAKU</td>
                        <td className="p-2 border border-slate-200 text-right font-mono text-emerald-700">{formatRupiah(totalBahanBaku)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: BTKL & Overhead */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-purple-600 rounded-full inline-block"></span>
                    2. Rincian Tenaga Kerja (BTKL) & Overhead Pabrik (BOP)
                  </h4>
                  <table className="w-full text-[11px] border border-slate-200 text-left">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2 border border-slate-200">Komponen Biaya</th>
                        <th className="p-2 border border-slate-200 text-center">Rincian Kuantitas</th>
                        <th className="p-2 border border-slate-200 text-right">Tarif / Satuan</th>
                        <th className="p-2 border border-slate-200 text-right">Total Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {laborCosts.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-medium">Tenaga Kerja: {l.jobTitle}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">{l.numWorkers} orang x {l.hoursWorked} jam</td>
                          <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(l.hourlyRate)} / jam</td>
                          <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{formatRupiah(l.totalCost)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-2 border border-slate-200">Overhead Utilitas (Listrik, Gas, Air)</td>
                        <td className="p-2 border border-slate-200 text-center font-mono">Operasional Batch</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">-</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{formatRupiah(overheadListrik + overheadGas + overheadAir)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-200">Overhead Sewa & Depresiasi Mesin</td>
                        <td className="p-2 border border-slate-200 text-center font-mono">Alokasi Mesin</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">-</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{formatRupiah(overheadSewa + overheadPenyusutan)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-200">Kemasan Produk & Packaging</td>
                        <td className="p-2 border border-slate-200 text-center font-mono">{batchYield} {yieldUnit}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono">{formatRupiah(overheadKemasan / validYield)} / {yieldUnit}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono font-bold text-slate-800">{formatRupiah(overheadKemasan)}</td>
                      </tr>
                      <tr className="bg-slate-50 font-bold">
                        <td colSpan={3} className="p-2 border border-slate-200 text-slate-700">TOTAL BIAYA PRODUKSI BATCH (BAHAN + BTKL + BOP)</td>
                        <td className="p-2 border border-slate-200 text-right font-mono text-emerald-700">{formatRupiah(totalBiayaProduksi)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 3: Harga Jual & Profitabilitas */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-full inline-block"></span>
                    3. Ringkasan Harga Jual, Laba & Margin
                  </h4>
                  <table className="w-full text-[11px] border border-slate-200 text-left">
                    <thead className="bg-slate-100 font-semibold text-slate-700">
                      <tr>
                        <th className="p-2 border border-slate-200">HPP Standar / Unit</th>
                        <th className="p-2 border border-slate-200 text-right">Rekomendasi Margin ({targetMarginPct}%)</th>
                        <th className="p-2 border border-slate-200 text-right">Harga Jual Ditetapkan</th>
                        <th className="p-2 border border-slate-200 text-right">Laba Kotor Satuan</th>
                        <th className="p-2 border border-slate-200 text-center">Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="font-bold">
                        <td className="p-2 border border-slate-200 font-mono">{formatRupiah(hppPerUnit)}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono text-slate-600">{formatRupiah(hargaJualRekomendasi)}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono text-blue-700">{formatRupiah(actualSellingPrice)}</td>
                        <td className="p-2 border border-slate-200 text-right font-mono text-emerald-700">{formatRupiah(profitPerUnit)}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-emerald-700">{formatPercent(actualMarginPct)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signature Blocks */}
                <div className="pt-6 grid grid-cols-2 gap-10 text-center text-[10px] text-slate-600">
                  <div className="space-y-12">
                    <div>Dihitung Oleh (Cost Accountant):</div>
                    <div className="border-t border-slate-400 font-bold text-slate-800 pt-1">
                      Bagian Analisis HPP & Produksi
                    </div>
                  </div>
                  <div className="space-y-12">
                    <div>Disetujui Oleh (Owner / Manajer):</div>
                    <div className="border-t border-slate-400 font-bold text-slate-800 pt-1">
                      Pimpinan / Finance Manager
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Gunakan tombol <strong>Cetak Sekarang</strong> atau <strong>Unduh Dokumen PDF</strong> untuk menyimpan arsip fisik/digital.</span>
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
