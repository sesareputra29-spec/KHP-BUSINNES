import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Layers,
  Factory,
  Warehouse,
  TrendingUp,
  FileBarChart,
  ShieldCheck,
  ArrowRight,
  Check,
  Zap,
  Sparkles,
  ChevronDown,
  Building,
  Users,
  Store,
  ChefHat,
  Coffee,
  Cake,
  Play,
  Percent,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatRupiah } from '../../utils/calculator';

interface LandingPageViewProps {
  onNavigate: (route: string) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({ onNavigate }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    api.getPublicPlans()
      .then((data) => setPlans(data))
      .catch(console.error);
  }, []);

  const valueProps = [
    {
      title: 'Kalkulator HPP Akurat',
      desc: 'Dukungan metode Full Costing dan Variable Costing dengan penghitungan otomatis biaya bahan baku, BTKL, dan overhead pabrik (BOP).',
      icon: <Calculator className="w-5 h-5 text-indigo-600" />,
    },
    {
      title: 'Resep & BOM Bertingkat',
      desc: 'Susun formula resep per batch produksi dengan persentase penyusutan (shrinkage tolerance) bahan secara presisi.',
      icon: <Layers className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: 'SPK Produksi Terpantau',
      desc: 'Penerbitan Surat Perintah Kerja (SPK), monitoring status batch (Draft, Diproses, Selesai), dan konversi bahan otomatis.',
      icon: <Factory className="w-5 h-5 text-amber-600" />,
    },
    {
      title: 'Kontrol Stok & Inventaris',
      desc: 'Peringatan dini stok minimum, kartu mutasi stok real-time, dan pencatatan Purchase Order ke supplier terintegrasi.',
      icon: <Warehouse className="w-5 h-5 text-blue-600" />,
    },
    {
      title: 'Analisis Margin & Profitabilitas',
      desc: 'Pantau margin kontribusi tiap SKU, titik impas (BEP), dan simulasi skenario kenaikan harga bahan baku.',
      icon: <TrendingUp className="w-5 h-5 text-rose-600" />,
    },
    {
      title: 'Laporan Finansial Komprehensif',
      desc: 'Ekspor laporan HPP, kartu stok, neraca biaya produksi, dan riwayat pesanan dalam format Excel, CSV, dan PDF.',
      icon: <FileBarChart className="w-5 h-5 text-purple-600" />,
    },
  ];

  const targetIndustries = [
    { name: 'Bakery & Pastry', icon: <Cake className="w-4 h-4" />, example: 'Roti artisan, croissant, cookies' },
    { name: 'Cafe & Coffee Shop', icon: <Coffee className="w-4 h-4" />, example: 'Espresso blend, minuman racik, pastry' },
    { name: 'Restoran & Rumah Makan', icon: <ChefHat className="w-4 h-4" />, example: 'Menu a la carte, bumbu dasar, saus' },
    { name: 'Catering & Hajatan', icon: <Store className="w-4 h-4" />, example: 'Nasi box, paket prasmanan, snack box' },
  ];

  const faqs = [
    {
      q: 'Apakah saya bisa mencoba gratis terlebih dahulu?',
      a: 'Ya, Anda mendapatkan masa uji coba gratis (Trial) selama 14 hari dengan akses fitur lengkap tanpa perlu memasukkan kartu kredit.',
    },
    {
      q: 'Bagaimana cara perhitungan HPP di dalam aplikasi ini?',
      a: 'HPP dihitung berdasarkan total biaya bahan baku resep BOM ditambah biaya tenaga kerja langsung (BTKL) per jam dan alokasi overhead (BOP) tetap/variabel dibagi total unit output yang dihasilkan.',
    },
    {
      q: 'Apakah data bisnis saya aman dan terisolasi dari bisnis lain?',
      a: 'Sangat aman. Aplikasi menerapkan isolasi multi-tenant level server di setiap query database sehingga data bisnis Anda tidak dapat diakses oleh bisnis lain.',
    },
    {
      q: 'Bisakah saya mengekspor data laporan HPP ke Excel?',
      a: 'Tentu saja. Tersedia fitur ekspor laporan keuangan HPP, kartu stok inventaris, dan formula resep BOM dalam format CSV, JSON, dan cetak laporan.',
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Public Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white font-black text-sm flex items-center justify-center shadow-xs">
              A
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">ACRU HPP</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">· Enterprise Costing</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button onClick={() => onNavigate('/')} className="hover:text-slate-950 transition-colors cursor-pointer">
              Beranda
            </button>
            <a href="#fitur" className="hover:text-slate-950 transition-colors">
              Fitur Utama
            </a>
            <a href="#preview" className="hover:text-slate-950 transition-colors">
              Preview
            </a>
            <button onClick={() => onNavigate('/pricing')} className="hover:text-slate-950 transition-colors cursor-pointer">
              Paket & Harga
            </button>
            <a href="#faq" className="hover:text-slate-950 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/login')}
              className="text-xs font-bold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-xl transition cursor-pointer"
            >
              Masuk
            </button>
            <button
              onClick={() => onNavigate('/register')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <span>Mulai Gratis</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section (Requirement 4) */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
          <span>Platform SaaS Terintegrasi untuk UMKM & Kuliner</span>
          <span aria-hidden="true">·</span>
          <span>Trial 14 Hari Tanpa Komitmen</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15]">
          Kelola HPP, Stok, Produksi dan Penjualan dalam Satu Aplikasi.
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Hitung biaya produksi dengan lebih mudah, kendalikan inventory bahan baku, dan pantau profitabilitas bisnis kuliner serta manufaktur Anda secara presisi.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('/register')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Mulai Gratis 14 Hari</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onNavigate('/pricing')}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl transition cursor-pointer"
          >
            Lihat Paket & Harga
          </button>
        </div>

        {/* Target Segments */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Dirancang khusus untuk:</span>
          {targetIndustries.map((ind) => (
            <div key={ind.name} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              {ind.icon}
              <span className="font-medium text-slate-800">{ind.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Product Preview Section (Requirement 6) */}
      <section id="preview" className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="bg-slate-950 rounded-3xl p-4 sm:p-6 shadow-2xl border border-slate-800 text-white">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-slate-400 text-[11px]">app.acruhpp.id/dashboard</span>
            </div>
            <span className="text-slate-400 font-medium hidden sm:inline">Preview Antarmuka Asli</span>
          </div>

          <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Metric preview card */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400">Total HPP Produksi Rata-rata</span>
              <div className="text-2xl font-bold font-mono text-emerald-400">Rp 11.250 / pcs</div>
              <div className="text-[11px] text-slate-400">Berdasarkan 5 batch SPK aktif bulan ini</div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400">Margin Kontribusi Target</span>
              <div className="text-2xl font-bold font-mono text-amber-400">58,2%</div>
              <div className="text-[11px] text-slate-400">Harga Jual Rp 28.000 vs HPP Rp 11.250</div>
            </div>

            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400">Status Bahan Baku Gudang</span>
              <div className="text-2xl font-bold font-mono text-white">40 SKU Bahan</div>
              <div className="text-[11px] text-slate-400">2 Bahan mendekati batas stok minimum</div>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Semua modul HPP, BOM, Inventaris, dan Batch Produksi siap digunakan langsung setelah pendaftaran.</span>
            </div>
            <button
              onClick={() => onNavigate('/register')}
              className="text-white hover:text-emerald-400 font-bold underline cursor-pointer"
            >
              Coba Sekarang &raquo;
            </button>
          </div>
        </div>
      </section>

      {/* Value Proposition Section (Requirement 5) */}
      <section id="fitur" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Keunggulan Sistem</span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Fitur Nyata yang Membantu Operasional Bisnis Anda
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            Bukan sekadar spreadsheet, tetapi ekosistem kalkulasi biaya terstandar akuntansi manajemen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {valueProps.map((vp) => (
            <div
              key={vp.title}
              className="p-6 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs transition space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-2xs">
                {vp.icon}
              </div>
              <h3 className="font-bold text-sm text-slate-900">{vp.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{vp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview Section (Requirement 7) */}
      <section id="harga" className="py-16 bg-slate-50 border-y border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paket Langganan Transparan</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Pilih Paket yang Sesuai dengan Skala Usaha Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              Mulai gratis 14 hari. Upgrade kapan saja saat bisnis Anda berkembang.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.filter((p) => p.code !== 'FREE').map((p) => (
              <div
                key={p.id}
                className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between border-2 transition-all ${
                  p.code === 'PRO'
                    ? 'border-slate-950 bg-white shadow-xl relative'
                    : 'border-slate-200 bg-white shadow-xs'
                }`}
              >
                {p.code === 'PRO' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-950 text-white font-bold text-[10px] uppercase tracking-wider">
                    Paling Populer
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                  </div>

                  <div className="text-2xl sm:text-3xl font-black font-mono text-slate-950">
                    {formatRupiah(p.priceMonthly)}
                    <span className="text-xs font-normal text-slate-400 font-sans"> /bulan</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hingga <strong>{p.limits?.maxUsers || 5} Akun Tim</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hingga <strong>{p.limits?.maxProducts || 100} Produk (SKU)</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Hingga <strong>{p.limits?.maxRawMaterials || 50} Bahan Baku</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Formula Resep BOM & SPK Produksi</span>
                    </div>
                    {p.code === 'PRO' && (
                      <div className="flex items-center gap-2 text-indigo-700 font-medium">
                        <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Analisis Margin BEP & Simulasi Kenaikan Biaya</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => onNavigate('/register')}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                      p.code === 'PRO'
                        ? 'bg-slate-950 hover:bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                    }`}
                  >
                    Mulai Trial 14 Hari
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={() => onNavigate('/pricing')}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
            >
              Lihat Perbandingan Fitur Selengkapnya &raquo;
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pertanyaan Umum</span>
          <h2 className="text-2xl font-bold text-slate-900">Pertanyaan yang Sering Diajukan</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={faq.q}
                className="border border-slate-200 rounded-2xl p-4 transition-colors bg-white cursor-pointer"
                onClick={() => setActiveFaq(isOpen ? null : idx)}
              >
                <div className="flex items-center justify-between font-bold text-xs sm:text-sm text-slate-900">
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-950 text-white font-bold text-xs flex items-center justify-center">
              A
            </div>
            <span className="font-bold text-slate-800">ACRU Kalkulator HPP SaaS</span>
            <span>· Solusi Manajemen Biaya & Produksi UMKM Indonesia</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('/pricing')} className="hover:text-slate-800 transition cursor-pointer">
              Paket Harga
            </button>
            <button onClick={() => onNavigate('/register')} className="hover:text-slate-800 transition cursor-pointer">
              Registrasi
            </button>
            <button onClick={() => onNavigate('/login')} className="hover:text-slate-800 transition cursor-pointer">
              Masuk
            </button>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-6 pt-4 border-t border-slate-200/80 text-[11px] text-slate-400 text-center sm:text-left">
          &copy; {new Date().getFullYear()} ACRU HPP SaaS Platform. Hak cipta dilindungi undang-undang.
        </div>
      </footer>
    </div>
  );
};
