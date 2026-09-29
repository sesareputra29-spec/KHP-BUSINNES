import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatRupiah, formatPercent, calculateMultiChannelPricing } from '../../utils/calculator';
import {
  Percent,
  TrendingUp,
  Store,
  ShoppingBag,
  Bike,
  Building2,
  Users,
  Info,
  DollarSign,
  Save,
} from 'lucide-react';

export const HargaMarginView: React.FC = () => {
  const { products, updateProduct, showToast } = useApp();
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  const product = products.find((p) => p.id === selectedProductId) || products[0];

  const [basePrice, setBasePrice] = useState<number>(product?.sellingPrice || 35000);
  const [targetMargin, setTargetMargin] = useState<number>(product?.targetMarginPct || 40);

  const hpp = product?.estimatedHpp || 20000;
  const channelBreakdown = calculateMultiChannelPricing(hpp, basePrice);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const p = products.find((item) => item.id === prodId);
    if (p) {
      setBasePrice(p.sellingPrice);
      setTargetMargin(p.targetMarginPct);
    }
  };

  const handleSavePrices = () => {
    if (!product) return;
    updateProduct(product.id, {
      sellingPrice: basePrice,
      targetMarginPct: targetMargin,
      channelPrices: {
        offline: channelBreakdown[0]?.recommendedPrice || basePrice,
        marketplace: channelBreakdown[1]?.recommendedPrice || basePrice * 1.12,
        foodDelivery: channelBreakdown[2]?.recommendedPrice || basePrice * 1.25,
        grosir: channelBreakdown[3]?.recommendedPrice || basePrice * 0.82,
        reseller: channelBreakdown[4]?.recommendedPrice || basePrice * 0.9,
      },
    });
    showToast('Harga Kanal Disimpan', `Harga baru untuk ${product.name} telah disimpan ke master data.`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              4.1 Harga & Margin
            </span>
            <span className="text-xs text-slate-500 font-mono">Multi-Channel Pricing Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Penetapan Harga Jual & Perlindungan Margin Kanal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lindungi profitabilitas bisnis dari potongan komisi marketplace (Shopee/Tokopedia) dan biaya aplikasi pesan-antar makanan (GoFood/GrabFood).
          </p>
        </div>

        <button
          onClick={handleSavePrices}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Save className="w-4 h-4" />
          <span>Simpan ke Master Produk</span>
        </button>
      </div>

      {/* Control Selector Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Produk untuk Dikonfigurasi
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Harga Jual Dasar Eceran / Toko (Rp)
            </label>
            <input
              type="number"
              step={500}
              value={basePrice}
              onChange={(e) => setBasePrice(Number(e.target.value))}
              className="w-full text-xs font-mono font-bold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 text-right"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">
                HPP Pokok Produk
              </div>
              <div className="text-xl font-black text-emerald-950 font-mono">
                {formatRupiah(hpp)}
              </div>
            </div>
            <div className="text-right text-xs">
              <span className="text-slate-500">Margin Toko Fisik:</span>
              <div className="font-mono font-bold text-emerald-700 text-sm">
                {formatPercent(basePrice > 0 ? ((basePrice - hpp) / basePrice) * 100 : 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-channel Pricing Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {channelBreakdown.map((ch, idx) => {
          const icons = [
            <Store className="w-5 h-5 text-blue-600" />,
            <ShoppingBag className="w-5 h-5 text-orange-600" />,
            <Bike className="w-5 h-5 text-emerald-600" />,
            <Building2 className="w-5 h-5 text-purple-600" />,
            <Users className="w-5 h-5 text-teal-600" />,
          ][idx % 5];

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {icons}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">{ch.channelName}</h3>
                    <span className="text-[10px] text-slate-400">
                      Potongan platform: {ch.commissionPct}%
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3 text-center">
                  <div className="text-[10px] text-slate-400 font-medium">Harga Rekomendasi Jual:</div>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">
                    {formatRupiah(ch.recommendedPrice)}
                  </div>
                </div>

                {/* Deductions Breakdown */}
                <div className="space-y-1.5 text-xs divide-y divide-slate-100">
                  <div className="flex justify-between pt-1 text-slate-500">
                    <span>Komisi Aplikasi:</span>
                    <span className="font-mono text-rose-600">
                      -{formatRupiah(ch.platformFeeAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-slate-500">
                    <span>Kemasan Ekstra (Bubble/Seal):</span>
                    <span className="font-mono text-slate-600">
                      -{formatRupiah(ch.extraPackagingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-slate-700 font-semibold">
                    <span>Pendapatan Bersih Diterima:</span>
                    <span className="font-mono text-slate-900">
                      {formatRupiah(ch.netRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 text-slate-500">
                    <span>HPP Produk:</span>
                    <span className="font-mono">-{formatRupiah(ch.hppPerUnit)}</span>
                  </div>
                </div>
              </div>

              {/* Net Margin Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400">Laba Bersih Riil:</div>
                  <div className="font-mono font-bold text-emerald-700 text-sm">
                    +{formatRupiah(ch.netProfit)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Margin Bersih:</div>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      ch.netMarginPct >= 30
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {formatPercent(ch.netMarginPct)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explanation Banner */}
      <div className="bg-emerald-950 text-white rounded-2xl p-5 border border-emerald-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <span className="font-bold text-white block mb-0.5">
            Formula Perlindungan Margin (Anti Boncos Platform)
          </span>
          Banyak UMKM dan industri manufaktur menjual di marketplace dengan harga sama seperti toko fisik, tanpa sadar kehilangan 7% hingga 20% laba akibat potongan komisi dan gratis ongkir. Kalkulator di atas secara otomatis merekomendasikan harga pas untuk menjaga margin profit tetap stabil di semua saluran.
        </div>
      </div>
    </div>
  );
};
