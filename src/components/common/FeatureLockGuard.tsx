import React from 'react';
import { Lock, Zap, ArrowRight, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { FeatureKey } from '../../types';

interface FeatureLockGuardProps {
  feature: FeatureKey;
  featureName: string;
  minimumPlan?: string;
  description?: string;
  children: React.ReactNode;
}

export const FeatureLockGuard: React.FC<FeatureLockGuardProps> = ({
  feature,
  featureName,
  minimumPlan = 'PRO',
  description = 'Fitur ini merupakan bagian dari modul lanjutan komersial yang memerlukan aktivasi paket khusus.',
  children,
}) => {
  const { activeSubscription, setCurrentMenu, isSuperAdmin, openUpgradeModal } = useApp();

  // Super Admin bypasses feature lock
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const features = activeSubscription?.features as FeatureKey[] | undefined;
  const isAllowed = !features || features.includes(feature);

  if (isAllowed) {
    return <>{children}</>;
  }

  const currentPlanCode = activeSubscription?.planCode || 'STARTER';

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Fitur Terkunci (Feature Entitlement)
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{featureName}</h2>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-left">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Paket Bisnis Anda:</span>
            <span className="font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 font-mono">
              {currentPlanCode}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Diperlukan Minimal:</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200 font-mono">
              Paket {minimumPlan}
            </span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => openUpgradeModal(minimumPlan)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-950 hover:bg-slate-800 transition-all shadow-md cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Tingkatkan ke Paket {minimumPlan} Sekarang</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={() => setCurrentMenu('8.4.6')}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <span>Lihat Detail Kuota & Fitur di Pengaturan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
