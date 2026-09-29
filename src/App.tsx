/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const { currentMenu, isAuthenticated } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Authentication gate: if not signed in, show commercial multi-tenant LoginView
  if (!isAuthenticated) {
    return (
      <>
        <LoginView />
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
        return <AnalisisProfitabilitasView />;

      // 5. INVENTORY & PEMBELIAN
      case '5.1':
        return <InventoryView />;
      case '5.2':
        return <PembelianView />;

      // 6. ANALISIS & SIMULASI
      case '6.1':
        return <AnalisisHppView />;
      case '6.2':
        return <SimulasiView />;
      case '6.3':
        return <BepSensitivitasView />;

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
            {renderView()}
          </div>
        </main>
      </div>

      {/* Global Modals & Notifications */}
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
