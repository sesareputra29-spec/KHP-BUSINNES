import React, { useState } from 'react';
import { X, Mail, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin?: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'REQUEST' | 'RESET'>('REQUEST');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res.token) {
        setToken(res.token);
      }
      setMessage({
        type: 'success',
        text: 'Token pemulihan kata sandi telah diterbitkan.',
      });
      setStep('RESET');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memproses permohonan.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setMessage({ type: 'error', text: 'Token reset wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Kata sandi minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Konfirmasi kata sandi tidak cocok.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await api.resetPassword(token.trim(), newPassword);
      setMessage({ type: 'success', text: res.message || 'Kata sandi berhasil diperbarui!' });
      setTimeout(() => {
        onClose();
        setStep('REQUEST');
        setEmail('');
        setToken('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1800);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengatur ulang kata sandi.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {step === 'REQUEST' ? 'Lupa Kata Sandi' : 'Atur Kata Sandi Baru'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {step === 'REQUEST' ? 'Pulihkan akses akun bisnis Anda' : 'Masukkan token dan sandi baru'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`mx-5 mt-4 p-3 rounded-xl text-xs flex items-start gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="leading-tight">{message.text}</span>
          </div>
        )}

        {/* Content */}
        {step === 'REQUEST' ? (
          <form onSubmit={handleRequestToken} className="p-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Akun Terdaftar</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bambang.akuntansi@bogarasa.co.id"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Kami akan menerbitkan token reset resmi untuk memverifikasi kepemilikan akun.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('RESET')}
                className="text-slate-500 hover:text-slate-800 text-[11px] underline"
              >
                Sudah punya token?
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Memproses...' : 'Kirim Petunjuk'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="p-5 space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Token Verifikasi</label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Salin token dari instruksi / email"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru (Min. 6 Karakter)</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ulangi Kata Sandi Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('REQUEST')}
                className="text-slate-500 hover:text-slate-800 text-[11px] underline"
              >
                &laquo; Kembali minta token
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'Menyimpan...' : 'Perbarui Kata Sandi'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
