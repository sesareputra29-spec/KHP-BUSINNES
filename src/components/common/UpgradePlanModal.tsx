import React, { useState, useEffect } from 'react';
import { X, Check, Zap, ShieldCheck, ArrowRight, QrCode, Building2, CreditCard, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { formatRupiah } from '../../utils/calculator';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendedPlanCode?: string;
}

export const UpgradePlanModal: React.FC<UpgradePlanModalProps> = ({
  isOpen,
  onClose,
  recommendedPlanCode = 'PRO',
}) => {
  const { activeSubscription, refreshSubscription, showToast } = useApp();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState(recommendedPlanCode);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'TRANSFER_BANK' | 'VIRTUAL_ACCOUNT'>('QRIS');
  const [isLoading, setIsLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlanCode(recommendedPlanCode);
      setCheckoutSuccess(null);
      api.getPublicPlans()
        .then((data) => setPlans(data.filter((p) => p.code !== 'FREE')))
        .catch(console.error);
    }
  }, [isOpen, recommendedPlanCode]);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];
  const price = selectedPlan
    ? (billingCycle === 'YEARLY' ? selectedPlan.priceYearly : selectedPlan.priceMonthly)
    : 0;

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const res = await api.checkoutSubscription({
        planCode: selectedPlanCode,
        billingCycle,
        paymentMethod,
      });

      setCheckoutSuccess(res);
      showToast('Aktivasi Berhasil', `Selamat! Paket ${res.subscription.planName} kini aktif.`, 'success');
      await refreshSubscription();
    } catch (err: any) {
      showToast('Checkout Gagal', err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tingkatkan Paket Langganan Bisnis</h3>
              <p className="text-xs text-slate-500">Buka kapasitas penuh, fitur multivariat, dan hilangkan batasan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {checkoutSuccess ? (
          <div className="p-8 text-center space-y-5 animate-in zoom-in-95">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Check className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Pembayaran & Aktivasi Berhasil</span>
              <h3 className="text-xl font-bold text-slate-900">Selamat! Langganan Telah Aktif</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {checkoutSuccess.message} Invoice resmi telah diterbitkan dengan nomor{' '}
                <span className="font-mono font-bold text-slate-800">{checkoutSuccess.invoice?.invoiceNumber}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs max-w-sm mx-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Paket:</span>
                <span className="font-bold text-slate-900">{checkoutSuccess.subscription?.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Masa Aktif Berakhir:</span>
                <span className="font-bold text-slate-900">
                  {new Date(checkoutSuccess.subscription?.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Metode Pembayaran:</span>
                <span className="font-semibold text-slate-800">{paymentMethod}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Kembali ke Aplikasi
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-2">
              <span className={`text-xs ${billingCycle === 'MONTHLY' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                Bulanan
              </span>
              <button
                type="button"
                onClick={() => setBillingCycle((prev) => (prev === 'MONTHLY' ? 'YEARLY' : 'MONTHLY'))}
                className="w-12 h-6 rounded-full bg-slate-900 p-1 flex items-center transition-colors cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    billingCycle === 'YEARLY' ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${billingCycle === 'YEARLY' ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                  Tahunan
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Hemat s/d 17%
                </span>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.map((p) => {
                const isSelected = selectedPlanCode === p.code;
                const pPrice = billingCycle === 'YEARLY' ? p.priceYearly : p.priceMonthly;

                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanCode(p.code)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-950 bg-slate-50/70 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{p.name}</span>
                        {p.code === 'PRO' && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                            Populer
                          </span>
                        )}
                      </div>
                      <div className="text-base font-extrabold text-slate-900 font-mono">
                        {formatRupiah(pPrice)}
                        <span className="text-[10px] text-slate-500 font-normal font-sans">
                          /{billingCycle === 'YEARLY' ? 'thn' : 'bln'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{p.description}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 mt-3 space-y-1 text-[11px] text-slate-600">
                      <div>• Max {p.limits?.maxUsers || 5} Pengguna</div>
                      <div>• Max {p.limits?.maxProducts || 100} Produk (SKU)</div>
                      <div>• Max {p.limits?.maxRawMaterials || 50} Bahan Baku</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-800">Pilih Metode Pembayaran</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'QRIS', label: 'QRIS Instant', icon: <QrCode className="w-4 h-4" /> },
                  { id: 'TRANSFER_BANK', label: 'Transfer Bank', icon: <Building2 className="w-4 h-4" /> },
                  { id: 'VIRTUAL_ACCOUNT', label: 'Virtual Account', icon: <CreditCard className="w-4 h-4" /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs transition-all cursor-pointer ${
                      paymentMethod === m.id
                        ? 'border-slate-950 bg-slate-50 font-bold text-slate-900 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Order Summary & Submit Button */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-slate-400 block">Total Tagihan ({billingCycle === 'YEARLY' ? '1 Tahun' : '1 Bulan'}):</span>
                <span className="text-xl font-extrabold text-slate-900 font-mono">
                  {formatRupiah(price)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isLoading ? 'Memproses Aktivasi...' : `Konfirmasi & Bayar ${selectedPlan?.name}`}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
