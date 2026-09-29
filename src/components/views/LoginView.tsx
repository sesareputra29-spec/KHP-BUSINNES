import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  Phone,
  Factory,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, registerBusinessAndUser, availableTenants, availableUsers } = useApp();

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('bambang.akuntansi@bogarasa.co.id');
  const [loginPassword, setLoginPassword] = useState('Admin123!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Register form state
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regIndustry, setRegIndustry] = useState('Makanan & Minuman (F&B / Bakery & Condiments)');
  const [regPlan, setRegPlan] = useState<'Starter' | 'Business Pro' | 'Enterprise'>('Business Pro');
  const [regAdminName, setRegAdminName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await login(loginIdentifier, loginPassword);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Terjadi kendala saat memproses login. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regBusinessName.trim() || !regAdminName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Harap lengkapi semua bidang yang wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerBusinessAndUser({
        businessName: regBusinessName,
        industry: regIndustry,
        plan: regPlan,
        adminName: regAdminName,
        email: regEmail,
        username: regUsername || regEmail.split('@')[0],
        password: regPassword,
        phone: regPhone,
      });

      if (!res.success) {
        setErrorMessage(res.message);
      }
    } catch {
      setErrorMessage('Gagal mendaftarkan ruang kerja bisnis baru.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Account Clicker
  const handleQuickDemoSelect = (email: string, pass: string) => {
    setLoginIdentifier(email);
    setLoginPassword(pass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-[#eceef2] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo & App Brand */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900 text-white shadow-lg mb-4">
          <Layers className="w-8 h-8 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Kalkulator HPP Cloud
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          SaaS Akuntansi Biaya Produksi, Multi-Bisnis & Penetapan Harga Jual Presisi
        </p>

        {/* Tab Switcher */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl mt-6 border border-slate-300/70 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'LOGIN'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'REGISTER'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Bisnis Baru
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 sm:px-8 shadow-xl rounded-2xl border border-slate-200/90 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'LOGIN' ? (
            /* ============================================================== */
            /* FORM LOGIN */
            /* ============================================================== */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email atau Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="nama@perusahaan.co.id atau username"
                    className="block w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Kata Sandi
                  </label>
                  <span className="text-[11px] text-slate-400">Tersandi aman SHA-256</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="block w-full pl-9 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Ingat sesi masuk</span>
                </label>
                <span className="text-[11px] text-emerald-700 font-semibold cursor-pointer hover:underline">
                  Multi-Tenant Aktif
                </span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-xs text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all cursor-pointer disabled:bg-slate-400"
              >
                {isLoading ? (
                  <span>Memverifikasi Akun...</span>
                ) : (
                  <>
                    <span>Masuk ke Ruang Kerja</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* ============================================================== */
            /* FORM REGISTER BISNIS BARU (ONBOARDING) */
            /* ============================================================== */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Perusahaan / Bisnis <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regBusinessName}
                    onChange={(e) => setRegBusinessName(e.target.value)}
                    placeholder="Contoh: PT Sumber Pangan Makmur"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sektor Industri
                  </label>
                  <select
                    value={regIndustry}
                    onChange={(e) => setRegIndustry(e.target.value)}
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  >
                    <option value="Makanan & Minuman (F&B / Bakery & Condiments)">F&B / Bakery</option>
                    <option value="Manufaktur & Fabrikasi Ringan">Manufaktur Logam</option>
                    <option value="Kosmetik, Perawatan Diri & Herbal">Kosmetik & Herbal</option>
                    <option value="Tekstil, Garmen & Konveksi">Tekstil & Konveksi</option>
                    <option value="Kerajinan & Furnitur Kayu">Furnitur & Kayu</option>
                    <option value="Industri Kreatif & Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Paket Langganan
                  </label>
                  <select
                    value={regPlan}
                    onChange={(e) => setRegPlan(e.target.value as any)}
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white font-bold text-emerald-800"
                  >
                    <option value="Starter">Starter (20 SKU)</option>
                    <option value="Business Pro">Business Pro (50 SKU)</option>
                    <option value="Enterprise">Enterprise (150 SKU)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Pemilik / Administrator <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regAdminName}
                    onChange={(e) => setRegAdminName(e.target.value)}
                    placeholder="Nama lengkap penanggung jawab"
                    className="block w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Bisnis <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="admin@bisnis.com"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. WhatsApp / Telepon
                  </label>
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-xs text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer disabled:bg-slate-400"
              >
                {isLoading ? (
                  <span>Mendaftarkan Bisnis Baru...</span>
                ) : (
                  <>
                    <span>Daftarkan Bisnis & Buat Akun</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================== */}
          {/* QUICK DEMO SWITCHER FOR VALIDATION & EVALUATION */}
          {/* ============================================================== */}
          <div className="border-t border-slate-200/90 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Uji Coba Cepat (Multi-Bisnis Demo):
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                1-Klik Siap Uji
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {/* Bisnis 1: PT Boga Rasa */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                  <span>🥖</span>
                  <span className="truncate">PT Boga Rasa Nusantara</span>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoSelect('bambang.akuntansi@bogarasa.co.id', 'Admin123!')}
                    className="text-[11px] text-left px-2 py-1 rounded bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 font-medium transition-colors flex items-center justify-between"
                  >
                    <span>Bambang (Admin)</span>
                    <span className="text-[9px] text-slate-400 font-mono">Admin123!</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoSelect('dewi.produksi@bogarasa.co.id', 'Owner123!')}
                    className="text-[11px] text-left px-2 py-1 rounded bg-white hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 font-medium transition-colors flex items-center justify-between"
                  >
                    <span>Dewi (Owner)</span>
                    <span className="text-[9px] text-slate-400 font-mono">Owner123!</span>
                  </button>
                </div>
              </div>

              {/* Bisnis 2: CV Karya Logam */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-800 flex items-center gap-1">
                  <span>⚙️</span>
                  <span className="truncate">CV Karya Logam Mandiri</span>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoSelect('hendra.owner@karyalogam.co.id', 'Owner123!')}
                    className="text-[11px] text-left px-2 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-800 border border-slate-200 font-medium transition-colors flex items-center justify-between"
                  >
                    <span>Hendra (Owner)</span>
                    <span className="text-[9px] text-slate-400 font-mono">Owner123!</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoSelect('agus.teknik@karyalogam.co.id', 'Staff123!')}
                    className="text-[11px] text-left px-2 py-1 rounded bg-white hover:bg-blue-50 hover:text-blue-800 border border-slate-200 font-medium transition-colors flex items-center justify-between"
                  >
                    <span>Agus (Staff)</span>
                    <span className="text-[9px] text-slate-400 font-mono">Staff123!</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Trust Badges */}
        <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Data Isolation Per Tenant
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" /> Salted SHA-256
          </span>
          <span>•</span>
          <span>Role & Permission Security</span>
        </div>
      </div>
    </div>
  );
};
