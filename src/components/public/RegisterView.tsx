import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, ShieldCheck, Mail, Lock, User, Building, Cake, AlertCircle, Phone, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';

interface RegisterViewProps {
  onNavigate: (route: string) => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({ onNavigate }) => {
  const { setCurrentUser, setCurrentTenant, setIsAuthenticated, setIsOnboardingOpen, showToast, refreshSubscription, loadBusinessData } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Bakery & Pastry');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validations (Requirement 9)
    if (!name.trim()) {
      setErrorMessage('Nama lengkap wajib diisi.');
      return;
    }
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      setErrorMessage('Format alamat email tidak valid.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.registerCustomer({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        businessName: businessName.trim(),
        businessType,
        phone: phone.trim(),
      });

      setCurrentUser(res.user);
      setCurrentTenant(res.business);
      setIsAuthenticated(true);
      setIsOnboardingOpen(true);
      await loadBusinessData();
      await refreshSubscription();
      showToast('Registrasi Berhasil', 'Akun bisnis Anda aktif dengan masa Trial 14 hari.', 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal melakukan pendaftaran. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white font-black text-sm flex items-center justify-center shadow-xs">
            A
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900">ACRU HPP SaaS</span>
        </div>

        <h2 className="mt-4 text-center text-2xl font-black text-slate-950 tracking-tight">
          Mulai Uji Coba Gratis 14 Hari
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Hitung HPP, susun resep BOM, dan kelola produksi tanpa biaya awal.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl border border-slate-200/90 rounded-3xl sm:px-10 space-y-6">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Pemilik</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Rian Hendrawan"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Perusahaan / Bisnis</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rian@rotimanis.co.id"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kata Sandi (Min. 6 Karakter)</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ulangi Kata Sandi</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Usaha / Brand</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Contoh: Roti Manis Nusantara"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jenis Usaha Kuliner / Manufaktur</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium"
                >
                  <option value="Bakery & Pastry">Bakery & Pastry</option>
                  <option value="Cafe & Coffee Shop">Cafe & Coffee Shop</option>
                  <option value="Restoran & Rumah Makan">Restoran & Rumah Makan</option>
                  <option value="Catering & Prasmanan">Catering & Prasmanan</option>
                  <option value="Food Production / Pabrik">Food Production / Pabrik Makanan</option>
                  <option value="Toko Kuliner / Retail">Toko Kuliner / Retail</option>
                  <option value="Manufaktur Lainnya">Manufaktur Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kota / Alamat Usaha <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Contoh: Bandung, Jabar"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-950/10 font-medium text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Membuat Akun...' : 'Daftar & Mulai Trial 14 Hari'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => onNavigate('/')}
              className="hover:text-slate-800 transition cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </button>

            <div>
              <span>Sudah punya akun? </span>
              <button
                onClick={() => onNavigate('/login')}
                className="font-bold text-slate-950 hover:underline cursor-pointer"
              >
                Masuk di sini
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
