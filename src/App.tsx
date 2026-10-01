/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/common/ToastContainer';
import { QuickSearchModal } from './components/common/QuickSearchModal';

// Views
import { DashboardView } from './components/views/DashboardView';
import { KalkulatorHppView } from './components/views/KalkulatorHppView';
import { ProdukView } from './components/views/ProdukView';
import { BahanBakuView } from './components/views/BahanBakuView';
import { SupplierView } from './components/views/SupplierView';
import { BomView } from './components/views/BomView';
import { ProduksiView } from './components/views/ProduksiView';
import { PerhitunganHppView } from './components/views/PerhitunganHppView';
import { HargaMarginView } from './components/views/HargaMarginView';
import { AnalisisProfitabilitasView } from './components/views/AnalisisProfitabilitasView';
import { InventoryView } from './components/views/InventoryView';
import { PembelianView } from './components/views/PembelianView';
import { AnalisisHppView } from './components/views/AnalisisHppView';
import { SimulasiView } from './components/views/SimulasiView';
import { BepSensitivitasView } from './components/views/BepSensitivitasView';
import { LaporanView } from './components/views/LaporanView';
import { SistemViews } from './components/views/SistemViews';
import { LoginView } from './components/views/LoginView';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { FeatureLockGuard } from './components/common/FeatureLockGuard';
import { UpgradePlanModal } from './components/common/UpgradePlanModal';
import { AlertTriangle, Lock } from 'lucide-react';

// Public & Onboarding Views (Customer Journey)
import { LandingPageView } from './components/public/LandingPageView';
import { PricingPageView } from './components/public/PricingPageView';
import { RegisterView } from './components/public/RegisterView';
import { OnboardingWizardView } from './components/onboarding/OnboardingWizardView';

const AppContent: React.FC = () => {
  const {
    currentMenu,
    isAuthenticated,
    currentUser,
    isSuperAdminPortalOpen,
    isReadOnly,
    activeSubscription,
    setCurrentMenu,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    targetUpgradePlan,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Client-side URL Router state matching browser location
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const navigate = useCallback((path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. PUBLIC ROUTES (When user is not authenticated)
  if (!isAuthenticated) {
    if (currentPath === '/pricing') {
      return (
        <>
          <PricingPageView onNavigate={navigate} />
          <ToastContainer />
        </>
      );
    }

    if (currentPath === '/register') {
      return (
        <>
          <RegisterView onNavigate={navigate} />
          <ToastContainer />
        </>
      );
    }

    if (currentPath === '/login' || currentPath.startsWith('/admin')) {
      return (
        <>
          <LoginView onNavigate={navigate} />
          <ToastContainer />
        </>
      );
    }

    // Default public root: Landing Page
    return (
      <>
        <LandingPageView onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // 2. SUPER ADMIN PLATFORM ROUTE (/admin or role = SUPER_ADMIN)
  const isAdminRoute = currentPath.startsWith('/admin');
  if (currentUser?.role === 'SUPER_ADMIN' || isSuperAdminPortalOpen || isAdminRoute) {
    return (
      <>
        <SuperAdminDashboard />
        <ToastContainer />
      </>
    );
  }

  // 3. ONBOARDING WIZARD ROUTE (First-time user or manual trigger)
  if (isOnboardingOpen) {
    return (
      <>
        <OnboardingWizardView onComplete={() => setIsOnboardingOpen(false)} />
        <ToastContainer />
      </>
    );
  }

  // 4. PUBLIC PRICING VIEW ACCESSIBLE FROM WITHIN THE APP
  if (currentPath === '/pricing') {
    return (
      <>
        <PricingPageView onNavigate={navigate} />
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          recommendedPlanCode={targetUpgradePlan}
        />
        <ToastContainer />
      </>
    );
  }

  // Route Views based on currentMenu ID
  const renderView = () => {
    switch (currentMenu) {
      // 1. UTAMA
      case '1.1':
        return <DashboardView />;
      case '1.2':
        return <KalkulatorHppView />;

      // 2. MASTER DATA
      case '2.1':
        return <ProdukView />;
      case '2.2':
        return <BahanBakuView />;
      case '2.3':
        return <SupplierView />;

      // 3. PRODUKSI & HPP
      case '3.1':
        return <BomView />;
      case '3.2':
        return <ProduksiView />;
      case '3.3':
        return <PerhitunganHppView />;

      // 4. HARGA & PROFITABILITAS
      case '4.1':
        return <HargaMarginView />;
      case '4.2':
        return (
          <FeatureLockGuard
            feature="PROFITABILITY"
            featureName="Analisis Profitabilitas Lanjutan"
            minimumPlan="PRO"
            description="Modul analisis margin kontribusi, profitabilitas per SKU produk, dan matriks Boston Consulting Group (BCG)."
          >
            <AnalisisProfitabilitasView />
          </FeatureLockGuard>
        );

      // 5. INVENTORY & PEMBELIAN
      case '5.1':
        return <InventoryView />;
      case '5.2':
        return <PembelianView />;

      // 6. ANALISIS & SIMULASI
      case '6.1':
        return <AnalisisHppView />;
      case '6.2':
        return (
          <FeatureLockGuard
            feature="ADVANCED_REPORT"
            featureName="Simulasi Multi-Skenario Kenaikan Biaya & HPP"
            minimumPlan="PRO"
            description="Kalkulasi 'What-If' skenario fluktuasi harga bahan baku, penyesuaian UMR tenaga kerja, dan simulasi sensitivitas margin laba."
          >
            <SimulasiView />
          </FeatureLockGuard>
        );
      case '6.3':
        return (
          <FeatureLockGuard
            feature="ADVANCED_REPORT"
            featureName="Analisis Titik Impas (BEP) & Sensitivitas Multivariat"
            minimumPlan="PRO"
            description="Perhitungan Break-Even Point (BEP) nominal Rupiah dan unit produk dengan visualisasi kurva biaya tetap vs variabel."
          >
            <BepSensitivitasView />
          </FeatureLockGuard>
        );

      // 7. LAPORAN
      case '7.1':
        return <LaporanView />;

      // 8. SISTEM & SUB-MENUS
      case '8.1':
      case '8.2':
      case '8.3':
      case '8.4.1':
      case '8.4.2':
      case '8.4.3':
      case '8.4.4':
      case '8.4.5':
      case '8.4.6':
      case '8.5':
      case '8.6':
      case '8.7':
      case '8.8':
      case '8.9':
      case '8.10':
        return <SistemViews subModule={currentMenu} />;

      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#eceef2] font-sans text-slate-900">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex shrink-0 print:hidden">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="relative">
            <Sidebar onCloseMobile={() => setIsMobileMenuOpen(false)} />
          </div>
          <div
            className="flex-1"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <div className="print:hidden">
          <Header onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        </div>

        {/* Scrollable Viewport with soft padding */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Graceful Expiration / Read-Only Mode Warning Banner */}
            {isReadOnly && (
              <div className="bg-amber-500/15 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm animate-in fade-in">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-800 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-amber-950">
                      Mode Baca-Saja (Read-Only Mode): Masa Langganan Telah Berakhir
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full uppercase">
                      {activeSubscription?.status || 'EXPIRED'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800/90 mt-1">
                    Seluruh data bisnis, formula HPP, dan laporan Anda tetap aman dan dapat dilihat atau diekspor. Namun, penambahan transaksi baru dan pengubahan data dinonaktifkan sementara.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => setCurrentMenu('8.4.6')}
                      className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-xs transition"
                    >
                      Lihat Status Paket & Subscription
                    </button>
                    <span className="text-xs text-amber-800/70">
                      Hubungi Super Admin platform untuk aktivasi atau perpanjangan.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {renderView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        recommendedPlanCode={targetUpgradePlan}
      />
      <QuickSearchModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
