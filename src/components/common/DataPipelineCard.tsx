import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MenuId } from '../../types';
import { PIPELINE_STAGES } from './DataPipelineModal';
import {
  Workflow,
  ArrowRight,
  ArrowDown,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface DataPipelineCardProps {
  onOpenFullModal?: () => void;
  defaultExpanded?: boolean;
}

export const DataPipelineCard: React.FC<DataPipelineCardProps> = ({
  onOpenFullModal,
  defaultExpanded = true,
}) => {
  const app = useApp();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeStageId, setActiveStageId] = useState<string>('master-bahan');

  const selectedStage = PIPELINE_STAGES.find((s) => s.id === activeStageId) || PIPELINE_STAGES[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all">
      {/* Card Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                Struktur Hubungan Data Sistem
              </span>
              <span className="text-xs text-slate-300 font-mono">12 Tahapan Aliran Linier</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Aliran & Kaskade Data: Master Bahan Baku s/d Dashboard
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFullModal && (
            <button
              onClick={onOpenFullModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <span>Buka Peta Lengkap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-colors"
            title={isExpanded ? 'Ciutkan' : 'Bentangkan'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5 bg-slate-50/50">
          {/* Horizontal scrollable stepper pills */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div className="flex items-center gap-2 min-w-max">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isActive = stage.id === activeStageId;
                const stats = stage.liveStatsSummary(app);

                return (
                  <React.Fragment key={stage.id}>
                    <button
                      type="button"
                      onClick={() => setActiveStageId(stage.id)}
                      className={`group flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isActive
                          ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                          isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {stage.stepNumber}
                      </div>

                      <div className="text-left">
                        <div
                          className={`text-xs font-bold whitespace-nowrap ${
                            isActive ? 'text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {stage.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                          {stats.value}
                        </div>
                      </div>
                    </button>

                    {idx < PIPELINE_STAGES.length - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Active Node Detail Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  {selectedStage.stepNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Tahapan #{selectedStage.stepNumber} dari 12
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {selectedStage.menuLabel}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {selectedStage.name}
                  </h4>
                </div>
              </div>

              <button
                onClick={() => app.setCurrentMenu(selectedStage.menuId)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <span>Buka Modul {selectedStage.menuLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedStage.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400">Aliran Masuk (Upstream):</div>
                <div className="font-semibold text-slate-800 mt-0.5">{selectedStage.upstream}</div>
              </div>
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-bold uppercase text-emerald-700">Aliran Keluar (Downstream):</div>
                <div className="font-semibold text-emerald-900 mt-0.5">{selectedStage.downstream}</div>
              </div>
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                <div className="text-[10px] font-bold uppercase text-purple-700">Kondisi Real-Time:</div>
                <div className="font-mono font-bold text-purple-900 mt-0.5">
                  {selectedStage.liveStatsSummary(app).value}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
