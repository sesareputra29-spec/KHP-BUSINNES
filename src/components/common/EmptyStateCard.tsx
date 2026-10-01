import React from 'react';
import { Plus, Sparkles, UploadCloud } from 'lucide-react';

interface EmptyStateCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  onSeedSample?: () => void;
  seedLabel?: string;
  onImport?: () => void;
  importLabel?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  icon,
  onAdd,
  addLabel = 'Tambah Data Baru',
  onSeedSample,
  seedLabel = 'Gunakan Data Contoh',
  onImport,
  importLabel = 'Import Data',
}) => {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4 my-6 animate-in fade-in">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shadow-xs">
        {icon || <Sparkles className="w-8 h-8 text-slate-500" />}
      </div>

      <div className="space-y-1">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">{description}</p>
      </div>

      <div className="pt-3 flex flex-wrap items-center justify-center gap-2">
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{addLabel}</span>
          </button>
        )}

        {onSeedSample && (
          <button
            onClick={onSeedSample}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{seedLabel}</span>
          </button>
        )}

        {onImport && (
          <button
            onClick={onImport}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-medium text-xs rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span>{importLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
