import React, { useState, useEffect } from 'react';
import {
  Building,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers,
  Package,
  Scale,
  ChefHat,
  Award,
  Store,
  Coffee,
  Utensils,
  Cake,
  Boxes,
  Zap,
  Compass,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

interface OnboardingWizardViewProps {
  onComplete: () => void;
}

export const OnboardingWizardView: React.FC<OnboardingWizardViewProps> = ({ onComplete }) => {
  const { currentTenant, setCurrentTenant, showToast, refreshSubscription, products, rawMaterials, boms, setIsTourOpen } = useApp();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1: Info Bisnis
  const [businessName, setBusinessName] = useState(currentTenant?.name || '');
  const [ownerName, setOwnerName] = useState(currentTenant?.ownerName || '');
  const [phone, setPhone] = useState(currentTenant?.phone || '');
  const [address, setAddress] = useState(currentTenant?.address || '');

  // Step 2: Jenis Bisnis (Requirement 11)
  const businessTypes = [
    { id: 'Bakery', label: 'Bakery & Pastry', icon: <Cake className="w-5 h-5" />, desc: 'Roti, kue, croissant, & pastry' },
    { id: 'Cafe', label: 'Cafe & Coffee Shop', icon: <Coffee className="w-5 h-5" />, desc: 'Kopi, minuman racik, & snack' },
    { id: 'Restoran', label: 'Restoran & Rumah Makan', icon: <Utensils className="w-5 h-5" />, desc: 'Menu makanan utama & a la carte' },
    { id: 'Catering', label: 'Catering & Prasmanan', icon: <ChefHat className="w-5 h-5" />, desc: 'Porsi besar, nasi box, & hajatan' },
    { id: 'Food Production', label: 'Food Production / Pabrik Makanan', icon: <Store className="w-5 h-5" />, desc: 'Produksi makanan olahan & frozen food' },
    { id: 'Toko', label: 'Toko Kuliner / Retail', icon: <Boxes className="w-5 h-5" />, desc: 'Distribusi & penjualan produk olahan' },
    { id: 'Lainnya', label: 'Bisnis Manufaktur Lainnya', icon: <Building className="w-5 h-5" />, desc: 'Kebutuhan kalkulasi HPP umum' },
  ];
  const [selectedType, setSelectedType] = useState('Bakery');

  // Step 4: Quick product inputs
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState(25000);
  const [prodEstHpp, setProdEstHpp] = useState(10000);

  // Step 5: Quick material inputs
  const [matName, setMatName] = useState('');
  const [matPrice, setMatPrice] = useState(15000);
  const [matUnit, setMatUnit] = useState('kg');

  // Fetch initial progress from server
  useEffect(() => {
    api.getOnboardingStatus()
      .then((data) => {
        if (data.businessName && !businessName) setBusinessName(data.businessName);
        if (data.businessType) setSelectedType(data.businessType);
        if (data.currentStep && data.currentStep > 1) setCurrentStep(data.currentStep);
      })
      .catch(console.error);
  }, []);

  // Update step progress to server
  const saveProgress = async (step: number, status: 'IN_PROGRESS' | 'COMPLETED' = 'IN_PROGRESS') => {
    try {
      await api.updateOnboardingProgress(step, status);
    } catch (e) {
      console.error('Failed to sync onboarding progress:', e);
    }
  };

  // One-click Seed Sample Data (Requirement 14 & 20)
  const handleSeedSampleData = async () => {
    setIsLoading(true);
    try {
      await api.seedSampleData();
      showToast('Data Contoh Siap', 'Data contoh bahan baku, produk, dan resep BOM Croissant telah dibuat secara terisolasi.', 'success');
      await saveProgress(7, 'COMPLETED');
      setCurrentStep(7);
      window.location.reload(); // Refresh to populate in-memory state
    } catch (err: any) {
      showToast('Gagal Menyiapkan Data', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1 & 2 Submit
  const handleSaveBusinessProfile = async () => {
    if (!businessName.trim()) {
      showToast('Nama Diperlukan', 'Harap isi nama bisnis Anda.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.setupBusinessProfile({
        name: businessName.trim(),
        ownerName: ownerName.trim(),
        businessType: selectedType,
        phone,
        address,
      });
      setCurrentTenant(res.business);
      await saveProgress(3);
      setCurrentStep(3);
      showToast('Profil Disimpan', 'Informasi bisnis Anda berhasil diperbarui.', 'success');
    } catch (err: any) {
      showToast('Gagal Menyimpan', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4 Submit (Add First Product)
  const handleAddFirstProduct = async () => {
    if (!prodName.trim()) {
      showToast('Nama Produk Diperlukan', 'Harap masukkan nama produk pertama Anda.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.createProduct({
        name: prodName.trim(),
        sku: 'PRD-001',
        categoryId: 'cat-1',
        unit: 'pcs',
        sellingPrice: Number(prodPrice) || 0,
        estimatedHpp: Number(prodEstHpp) || 0,
        targetMarginPct: 35,
        minStock: 5,
        currentStock: 20,
        initialStock: 20,
        status: 'Aktif',
      });
      showToast('Produk Dibuat', `Produk "${prodName}" berhasil ditambahkan.`, 'success');
      await saveProgress(5);
      setCurrentStep(5);
    } catch (err: any) {
      showToast('Gagal Menambah Produk', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5 Submit (Add First Raw Material)
  const handleAddFirstMaterial = async () => {
    if (!matName.trim()) {
      showToast('Nama Bahan Diperlukan', 'Harap masukkan nama bahan baku pertama Anda.', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      await api.createRawMaterial({
        name: matName.trim(),
        code: 'RM-001',
        categoryId: 'mat-cat-1',
        unit: matUnit,
        buyUnit: matUnit,
        conversionRatio: 1,
        buyPrice: Number(matPrice) || 0,
        avgBuyPrice: Number(matPrice) || 0,
        supplierId: 'sup-1',
        shrinkagePct: 0,
        minStock: 10,
        currentStock: 50,
        initialStock: 50,
        status: 'Aktif',
        lastUpdated: new Date().toISOString(),
      });
      showToast('Bahan Baku Dibuat', `Bahan baku "${matName}" berhasil ditambahkan.`, 'success');
      await saveProgress(6);
      setCurrentStep(6);
    } catch (err: any) {
      showToast('Gagal Menambah Bahan', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { num: 1, label: 'Profil Bisnis' },
    { num: 2, label: 'Jenis Usaha' },
    { num: 3, label: 'Satuan Standar' },
    { num: 4, label: 'Produk Pertama' },
    { num: 5, label: 'Bahan Baku' },
    { num: 6, label: 'Resep BOM' },
    { num: 7, label: 'Selesai' },
  ];

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl w-full mx-auto space-y-6">
        {/* Top Branding & Fast Track Option */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
              A
            </div>
            <div>
              <div className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <span>Orientasi Bisnis Baru</span>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full uppercase">
                  Trial 14 Hari
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Langkah awal untuk memulai perhitungan HPP akurat Anda</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSeedSampleData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Mulai dari Data Contoh (1-Klik)</span>
            </button>

            <button
              onClick={onComplete}
              className="px-3.5 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium text-xs rounded-xl transition cursor-pointer"
            >
              Lanjutkan Nanti
            </button>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            {steps.map((s, idx) => {
              const isPast = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div key={s.num} className="flex items-center gap-1.5 flex-1 last:flex-none">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-slate-950 text-white ring-4 ring-slate-100'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span className={`hidden md:inline text-[11px] truncate ${isCurrent ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-200 mx-2 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Wizard Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 animate-in fade-in">
          {/* STEP 1: Profil Bisnis */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Langkah 1 dari 7</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Lengkapi Informasi Bisnis Anda</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Informasi ini akan tertera pada SPK Produksi, Purchase Order, dan faktur HPP perusahaan Anda.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Usaha / Perusahaan (PT, CV, atau Brand)</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Contoh: Dapur Rasa Nusantara"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Pemilik / Penanggung Jawab</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="Nama lengkap pemilik"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp Operasional</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Alamat Fasilitas Produksi / Dapur</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jl. Raya Bisnis No. 1, Kota..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSeedSampleData}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lewati & isi dengan data contoh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <span>Lanjutkan ke Jenis Usaha</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Jenis Usaha (Requirement 11) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Langkah 2 dari 7</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Pilih Jenis Industri / Usaha Anda</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Membantu mengonfigurasi toleransi penyusutan (shrinkage) dan rasio tenaga kerja yang sesuai.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {businessTypes.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedType(t.id)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                      selectedType === t.id
                        ? 'border-slate-950 bg-slate-50/80 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${selectedType === t.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}>
                      {t.icon}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{t.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveBusinessProfile}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Menyimpan...' : 'Simpan & Lanjutkan'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Satuan Standar (Requirement 16) */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Langkah 3 dari 7</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Konfirmasi Master Satuan Ukur</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sistem telah menginisialisasi 8 satuan standar baku untuk inventaris dan resep Anda.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { code: 'kg', name: 'Kilogram' },
                  { code: 'gr', name: 'Gram' },
                  { code: 'l', name: 'Liter' },
                  { code: 'ml', name: 'Mililiter' },
                  { code: 'pcs', name: 'Pieces / Buah' },
                  { code: 'box', name: 'Box / Kotak' },
                  { code: 'btl', name: 'Botol' },
                  { code: 'dus', name: 'Dus / Karton' },
                ].map((u) => (
                  <div key={u.code} className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">{u.code}</span>
                      <span className="text-[11px] text-slate-500 block">{u.name}</span>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                💡 Anda dapat menambahkan satuan custom tambahan kapan saja di menu Master Data & Satuan.
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    saveProgress(4);
                    setCurrentStep(4);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <span>Lanjutkan ke Produk</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Setup Produk Pertama (Requirement 17) */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Langkah 4 dari 7</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Daftarkan Produk Pertama Anda</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Produk jadi yang akan dijual kepada pelanggan dan memiliki harga jual.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Produk / Menu</label>
                  <input
                    type="text"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Contoh: Roti Sobek Coklat Keju"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Harga Jual (Rp)</label>
                    <input
                      type="number"
                      value={prodPrice}
                      onChange={(e) => setProdPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Estimasi HPP Sementara (Rp)</label>
                    <input
                      type="number"
                      value={prodEstHpp}
                      onChange={(e) => setProdEstHpp(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-right"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveProgress(5);
                      setCurrentStep(5);
                    }}
                    className="px-3.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Lewati langkah ini
                  </button>

                  <button
                    type="button"
                    onClick={handleAddFirstProduct}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Menyimpan...' : 'Simpan Produk'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Setup Bahan Baku (Requirement 18) */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Langkah 5 dari 7</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Daftarkan Bahan Baku Utama</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bahan baku yang dibeli dari supplier dan digunakan dalam resep produksi.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Bahan Baku</label>
                  <input
                    type="text"
                    value={matName}
                    onChange={(e) => setMatName(e.target.value)}
                    placeholder="Contoh: Tepung Terigu Protein Tinggi"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Harga Beli Standar per Satuan (Rp)</label>
                    <input
                      type="number"
                      value={matPrice}
                      onChange={(e) => setMatPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-right"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Satuan Ukur</label>
                    <select
                      value={matUnit}
                      onChange={(e) => setMatUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="gr">Gram (gr)</option>
                      <option value="l">Liter (l)</option>
                      <option value="ml">Mililiter (ml)</option>
                      <option value="pcs">Pieces (pcs)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      saveProgress(6);
                      setCurrentStep(6);
                    }}
                    className="px-3.5 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium cursor-pointer"
                  >
                    Lewati langkah ini
                  </button>

                  <button
                    type="button"
                    onClick={handleAddFirstMaterial}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <span>{isLoading ? 'Menyimpan...' : 'Simpan Bahan Baku'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Setup BOM / Resep (Requirement 19) */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Langkah 6 dari 7</span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">Konsep Formula BOM (Bill of Materials)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  BOM mengaitkan bahan baku, jam tenaga kerja (BTKL), dan overhead pabrik (BOP) ke dalam 1 produk jadi.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3 text-xs">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Formula HPP Otomatis Terhubung</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Pada aplikasi utama, Anda dapat menambahkan formula resep bertingkat, menentukan takaran bahan per batch, dan sistem akan langsung menghitung HPP per unit secara real-time.
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-800">Rumus Kalkulasi HPP:</div>
                  <div className="font-mono text-slate-600">HPP Unit = (Biaya Bahan Baku + BTKL + Alokasi BOP) / Total Output Unit</div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(5)}
                  className="flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await saveProgress(7, 'COMPLETED');
                    setCurrentStep(7);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <span>Selesaikan Orientasi</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: First Success / Selesai (Requirement 20) */}
          {currentStep === 7 && (
            <div className="text-center py-6 space-y-6 animate-in zoom-in-95">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-inner">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  🎉 First Success: Orientasi Selesai
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Bisnis Anda Siap Digunakan!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Ruang kerja bisnis <span className="font-bold text-slate-800">{businessName || currentTenant?.name}</span> telah siap.
                  Nikmati masa trial gratis 14 hari dengan akses fitur lengkap.
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsTourOpen(true);
                    onComplete();
                  }}
                  className="w-full sm:w-auto px-7 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4 text-lime-400" />
                  <span>Buka Dashboard & Mulai Tur Fitur</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <span>Langsung ke Dashboard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
