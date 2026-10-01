import React, { useState } from 'react';
import { Joyride, Step, ACTIONS, EVENTS, STATUS, EventData, Controls } from 'react-joyride';
import { useApp } from '../../context/AppContext';

interface DashboardWalkthroughProps {
  runTour: boolean;
  onCloseTour: () => void;
}

export const DashboardWalkthrough: React.FC<DashboardWalkthroughProps> = ({
  runTour,
  onCloseTour,
}) => {
  const { currentTenant } = useApp();
  const [stepIndex, setStepIndex] = useState(0);

  const steps: Step[] = [
    {
      target: '[data-tour="tenant-selector"]',
      title: '🏢 Ruang Kerja & Multi-Tenant',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Anda berada di ruang kerja <strong className="text-slate-900">{currentTenant.name}</strong>. Anda dapat beralih antar unit bisnis atau cabang usaha dengan isolasi data yang aman.
          </p>
        </div>
      ),
      placement: 'bottom-start',
      skipBeacon: true,
    },
    {
      target: '[data-tour="quick-search"]',
      title: '🔍 Pencarian Cepat Global (Ctrl + K)',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Temukan produk, bahan baku, supplier, nomor SPK, atau menu navigasi apa saja secara instan dengan menekan <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px]">Ctrl + K</kbd>.
          </p>
        </div>
      ),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="onboarding-guide-btn"]',
      title: '✨ Panduan Setup & Onboarding',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Buka kembali 6 langkah wizard orientasi dan fitur 1-klik muat data contoh kapan saja jika ingin meninjau alur setup awal.
          </p>
        </div>
      ),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="executive-banner"]',
      title: '📊 Dashboard Eksekutif HPP Terintegrasi',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Pusat kendali finansial dan operasional manufaktur. Semua data terhubung otomatis secara real-time dengan modul <strong>Laporan & Rekapitulasi (7.1)</strong>.
          </p>
        </div>
      ),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="kpi-cards"]',
      title: '📈 4 Metrik Finansial Utama',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Pantau status SKU aktif & margin laba kotor, realisasi batch produksi SPK, total valuasi persediaan stok gudang, dan pembelian PO.
          </p>
        </div>
      ),
      placement: 'bottom',
      skipBeacon: true,
    },
    {
      target: '[data-tour="financial-chart"]',
      title: '📉 Grafik Arus Nilai & Tren 7 Hari',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Bandingkan pergerakan estimasi laba kotor (hijau lime), omzet penjualan (hitam), dan biaya produksi (oranye) dengan filter waktu dinamis.
          </p>
        </div>
      ),
      placement: 'top',
      skipBeacon: true,
    },
    {
      target: '[data-tour="cost-breakdown"]',
      title: '🧱 Struktur Komposisi Biaya HPP',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Analisis proporsi 3 elemen biaya pembentuk harga pokok: <strong>Biaya Bahan Baku (BBB)</strong>, <strong>Tenaga Kerja Langsung (BTKL)</strong>, dan <strong>Overhead Pabrik (BOP)</strong>.
          </p>
        </div>
      ),
      placement: 'top',
      skipBeacon: true,
    },
    {
      target: '[data-tour="quick-actions"]',
      title: '⚡ Pintasan Aksi Transaksi Cepat',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Pintasan cepat untuk membuat PO pembelian bahan baku, menjalankan kalkulator simulasi HPP, input SPK produksi baru, atau menambah master produk.
          </p>
        </div>
      ),
      placement: 'left',
      skipBeacon: true,
    },
    {
      target: '[data-tour="sidebar-nav"]',
      title: '🧭 Menu & Modul Lengkap',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Akses seluruh fitur enterprise: Resep BOM bertingkat, Pelacakan Produksi, Analisis Sensitivitas BEP, Pembelian PO, dan Pengaturan Sistem.
          </p>
        </div>
      ),
      placement: 'right',
      skipBeacon: true,
    },
    {
      target: '[data-tour="user-profile"]',
      title: '👤 Profil Pengguna & Paket Langganan',
      content: (
        <div className="space-y-1.5 text-left text-xs text-slate-600">
          <p>
            Kelola profil, uji coba simulasi peran pengguna (Role-Based Access), atau tingkatkan paket langganan ke <strong>PRO</strong> untuk modul tanpa batas.
          </p>
        </div>
      ),
      placement: 'bottom-end',
      skipBeacon: true,
    },
  ];

  const handleJoyrideEvent = (data: EventData, _controls: Controls) => {
    const { status, action, index, type } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onCloseTour();
      setStepIndex(0);
      try {
        localStorage.setItem('hasSeenDashboardTour', 'true');
      } catch (e) {
        // ignore
      }
    } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }
  };

  return (
    <Joyride
      steps={steps}
      run={runTour}
      stepIndex={stepIndex}
      continuous
      scrollToFirstStep
      onEvent={handleJoyrideEvent}
      options={{
        showProgress: true,
        overlayColor: 'rgba(15, 23, 42, 0.65)',
        primaryColor: '#0f172a',
        zIndex: 10000,
        buttons: ['skip', 'back', 'primary'],
      }}
      locale={{
        back: 'Sebelumnya',
        close: 'Tutup',
        last: 'Selesai & Jelajahi',
        next: 'Lanjut',
        skip: 'Lewati Tur',
      }}
      styles={{
        tooltip: {
          borderRadius: '16px',
          padding: '18px 20px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          color: '#334155',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '14px',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '6px',
        },
        buttonPrimary: {
          backgroundColor: '#0f172a',
          borderRadius: '10px',
          fontSize: '12px',
          fontWeight: 700,
          padding: '8px 16px',
          color: '#ffffff',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        buttonBack: {
          color: '#64748b',
          fontSize: '12px',
          fontWeight: 600,
          marginRight: '8px',
        },
        buttonSkip: {
          color: '#94a3b8',
          fontSize: '12px',
          fontWeight: 500,
        },
        buttonClose: {
          display: 'none',
        },
      }}
    />
  );
};
