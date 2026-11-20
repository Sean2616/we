"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Order, PaymentMethod, ProductCategory, PublicProduct } from "@/lib/types";

interface StorefrontClientProps {
  initialProducts: PublicProduct[];
  initialCategories: string[];
  initialStats: {
    totalProducts: number;
    totalAvailableStock: number;
    totalCompletedOrders: number;
  };
  initialLastSyncedAt: string | null;
  storeName: string;
  whatsappAdmin: string;
}

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; desc: string }> = [
  { id: "QRIS", label: "QRIS (GoPay / All E-Wallet & Bank)", desc: "Nominal otomatis & verifikasi cepat" },
  { id: "DANA", label: "DANA (via QRIS)", desc: "Scan QRIS di aplikasi DANA" },
  { id: "OVO", label: "OVO (via QRIS)", desc: "Scan QRIS di aplikasi OVO" },
  { id: "GoPay", label: "GoPay (via QRIS)", desc: "Scan QRIS di aplikasi GoPay" },
  { id: "BCA", label: "BCA / Bank (via QRIS)", desc: "Scan QRIS di m-Banking" },
];

const PASTEL_HEADERS = [
  "#FCA5A5",
  "#86EFAC",
  "#8BD3DD",
  "#FDE68A",
  "#F9A8D4",
  "#C4B5FD",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function StorefrontClient({
  initialProducts,
  initialCategories,
  initialStats,
  initialLastSyncedAt,
  storeName,
  whatsappAdmin,
}: StorefrontClientProps) {
  const router = useRouter();

  const [products, setProducts] = useState<PublicProduct[]>(initialProducts);
  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [stats, setStats] = useState(initialStats);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"Semua" | ProductCategory>("Semua");

  // Checkout Modal State
  const [selectedProduct, setSelectedProduct] = useState<PublicProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("QRIS");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Order Tracker Modal State
  const [trackerOpen, setTrackerOpen] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState("");
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerResults, setTrackerResults] = useState<Order[] | null>(null);
  const [trackerError, setTrackerError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCategory =
        selectedCategory === "Semua" || p.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [products, searchQuery, selectedCategory]);

  async function refreshStock() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
        if (Array.isArray(data.categories)) setCategories(data.categories);
        setStats(data.stats);
        setLastSyncedAt(data.lastSyncedAt);
      }
    } finally {
      setRefreshing(false);
    }
  }

  function openCheckout(product: PublicProduct) {
    setSelectedProduct(product);
    setQuantity(1);
    setCheckoutError(null);
  }

  async function handleCheckoutSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
          customerName,
          customerEmail,
          customerWhatsapp,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || "Gagal membuat pesanan");
        return;
      }

      router.push(`/order/${data.order.id}`);
    } catch {
      setCheckoutError("Koneksi bermasalah. Silakan coba lagi.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleTrackOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!trackerQuery.trim()) return;

    setTrackerLoading(true);
    setTrackerError(null);
    try {
      const res = await fetch(
        `/api/orders?q=${encodeURIComponent(trackerQuery.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setTrackerError(data.error || "Gagal mencari pesanan");
        setTrackerResults(null);
        return;
      }
      setTrackerResults(data.orders || []);
    } catch {
      setTrackerError("Terjadi kesalahan jaringan.");
    } finally {
      setTrackerLoading(false);
    }
  }

  return (
    <div className="min-h-screen dot-bg text-zinc-900 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-[#f6f1e7]/95 backdrop-blur border-b-2 border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAAE2B] brutal-card-sm flex items-center justify-center">
              <Zap className="w-5 h-5 text-zinc-900 fill-zinc-900" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-zinc-900 block leading-none">
                {storeName}
              </span>
              <span className="font-mono text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 border border-zinc-900 inline-block" />
                AUTO-ORDER 24/7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={refreshStock}
              disabled={refreshing}
              className="brutal-btn bg-white inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
              title="Refresh stok terbaru"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                setTrackerOpen(true);
                setTrackerResults(null);
                setTrackerError(null);
              }}
              className="brutal-btn bg-white inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              Lacak Pesanan
            </button>

            <a
              href={`https://wa.me/${whatsappAdmin}`}
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex brutal-btn bg-[#8BD3DD] items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900"
            >
              Bantuan WA
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-16 flex-1 space-y-8">
        {/* Hero Card ala Saweria */}
        <section className="brutal-card rounded-2xl bg-[#FAAE2B] p-6 sm:p-8 relative overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase px-3 py-1 rounded-lg bg-white border-2 border-zinc-900 mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Stok Real-Time • Pengiriman Akun Otomatis
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 leading-tight mb-3">
              Beli Aplikasi Premium Tanpa Antre, Akun Langsung Masuk!
            </h1>
            <p className="text-zinc-900/85 text-sm sm:text-base font-medium leading-relaxed max-w-2xl mb-6">
              Pilih aplikasi favoritmu, bayar lewat QRIS GoPay Merchant dengan nominal
              otomatis, dan detail akun langsung tampil di layar dalam hitungan detik.
            </p>

            {/* Stats Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="brutal-card-sm bg-white rounded-xl px-4 py-2.5">
                <div className="font-mono text-[10px] font-bold uppercase text-zinc-500">
                  Layanan
                </div>
                <div className="text-lg font-black text-zinc-900">
                  {stats.totalProducts} Produk
                </div>
              </div>
              <div className="brutal-card-sm bg-[#A7F3D0] rounded-xl px-4 py-2.5">
                <div className="font-mono text-[10px] font-bold uppercase text-zinc-700">
                  Stok Siap Kirim
                </div>
                <div className="text-lg font-black text-zinc-900">
                  {stats.totalAvailableStock} Akun
                </div>
              </div>
              <div className="brutal-card-sm bg-[#8BD3DD] rounded-xl px-4 py-2.5">
                <div className="font-mono text-[10px] font-bold uppercase text-zinc-700">
                  Order Sukses
                </div>
                <div className="text-lg font-black text-zinc-900">
                  {stats.totalCompletedOrders + 128}+ Order
                </div>
              </div>
            </div>

            {lastSyncedAt && (
              <p className="font-mono text-[11px] font-semibold text-zinc-900/75 mt-4 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Update terakhir: {new Date(lastSyncedAt).toLocaleString("id-ID")}
              </p>
            )}
          </div>
        </section>

        {/* Category Filter & Search */}
        <section className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5">
            {["Semua", ...categories].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`brutal-btn px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#FAAE2B] text-zinc-900"
                      : "bg-white text-zinc-800"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative md:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari Netflix, Spotify, Canva..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl brutal-input text-sm font-medium placeholder:text-zinc-400 shadow-[3px_3px_0px_0px_#18181b]"
            />
          </div>
        </section>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="brutal-card rounded-2xl bg-white text-center py-16 px-6">
            <Package className="w-10 h-10 text-zinc-500 mx-auto mb-3" />
            <p className="text-zinc-900 font-black">Produk tidak ditemukan</p>
            <p className="text-xs text-zinc-600 mt-1">
              Coba kata kunci atau pilih kategori lain.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product, index) => {
              const outOfStock = product.stockCount <= 0;
              const lowStock = product.stockCount > 0 && product.stockCount <= 2;
              const discountPct =
                product.originalPrice && product.originalPrice > product.price
                  ? Math.round(
                      ((product.originalPrice - product.price) /
                        product.originalPrice) *
                        100
                    )
                  : null;
              const headerBg = PASTEL_HEADERS[index % PASTEL_HEADERS.length];

              return (
                <div
                  key={product.id}
                  className="brutal-card rounded-2xl bg-white flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Colored Neo-Brutalism Card Header */}
                    <div
                      className="px-4 py-3.5 border-b-2 border-zinc-900 flex items-center justify-between gap-2"
                      style={{ backgroundColor: headerBg }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-center font-black text-sm text-zinc-900 shrink-0 overflow-hidden">
                          {product.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.logoUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{product.icon}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] uppercase font-bold text-zinc-800 block truncate">
                            {product.category}
                          </span>
                          <h3 className="font-black text-sm sm:text-base text-zinc-900 leading-tight truncate">
                            {product.name}
                          </h3>
                        </div>
                      </div>

                      {product.badge && (
                        <span className="font-mono px-2 py-0.5 rounded-md text-[10px] font-black bg-white border-2 border-zinc-900 text-zinc-900 shrink-0">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3">
                      <div className="font-mono text-[11px] font-bold text-zinc-600">
                        ⏱ Durasi: {product.duration}
                      </div>

                      <p className="text-xs text-zinc-700 leading-relaxed">
                        {product.description}
                      </p>

                      <ul className="space-y-1.5 pt-1">
                        {product.features.map((feat, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2 text-xs font-medium text-zinc-800"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Footer / Price & CTA */}
                  <div className="px-4 pb-4 pt-3 border-t-2 border-dashed border-zinc-300">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-zinc-900">
                            {formatRupiah(product.price)}
                          </span>
                          {discountPct && (
                            <span className="font-mono text-[10px] font-black px-1.5 py-0.5 rounded bg-[#FCA5A5] border border-zinc-900 text-zinc-900">
                              -{discountPct}%
                            </span>
                          )}
                        </div>
                        {product.originalPrice && (
                          <span className="font-mono text-xs text-zinc-500 line-through">
                            {formatRupiah(product.originalPrice)}
                          </span>
                        )}
                      </div>

                      <div
                        className={`font-mono px-2.5 py-1 rounded-lg text-xs font-bold border-2 border-zinc-900 ${
                          outOfStock
                            ? "bg-[#FCA5A5] text-zinc-900"
                            : lowStock
                            ? "bg-[#FDE68A] text-zinc-900"
                            : "bg-[#A7F3D0] text-zinc-900"
                        }`}
                      >
                        {outOfStock ? "HABIS" : `Stok: ${product.stockCount}`}
                      </div>
                    </div>

                    <button
                      disabled={outOfStock}
                      onClick={() => openCheckout(product)}
                      className={`w-full py-2.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 ${
                        outOfStock
                          ? "bg-zinc-200 text-zinc-500 border-2 border-zinc-400 cursor-not-allowed"
                          : "brutal-btn bg-[#FAAE2B] text-zinc-900 cursor-pointer"
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {outOfStock ? "Stok Sedang Kosong" : "Beli Otomatis"}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Trust Badges */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="brutal-card-sm rounded-2xl bg-white p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#FAAE2B] border-2 border-zinc-900 text-zinc-900">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-zinc-900">Kirim Otomatis 24/7</h4>
              <p className="text-xs text-zinc-600 mt-1">
                Begitu pembayaran QRIS masuk, akun langsung muncul di layar tanpa antre
                admin.
              </p>
            </div>
          </div>
          <div className="brutal-card-sm rounded-2xl bg-[#A7F3D0] p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border-2 border-zinc-900 text-zinc-900">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-zinc-900">Garansi Full Durasi</h4>
              <p className="text-xs text-zinc-800 mt-1">
                Semua akun dicek sebelum masuk stok dan dilindungi garansi penggantian.
              </p>
            </div>
          </div>
          <div className="brutal-card-sm rounded-2xl bg-[#8BD3DD] p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-white border-2 border-zinc-900 text-zinc-900">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-zinc-900">QRIS All-Payment</h4>
              <p className="text-xs text-zinc-800 mt-1">
                Bisa bayar dari GoPay, DANA, OVO, ShopeePay, BCA, BRI, Mandiri, SeaBank.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-zinc-900 bg-white py-6 px-4 text-center text-xs font-mono font-semibold text-zinc-700 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span>© {new Date().getFullYear()} {storeName} • Auto-Order 24/7</span>
        <a
          href="/admin"
          className="px-2.5 py-1 rounded-lg bg-[#f6f1e7] border border-zinc-900 text-zinc-900 hover:bg-[#FAAE2B] transition"
        >
          Admin Panel
        </a>
      </footer>

      {/* Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#f6f1e7] brutal-card overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 bg-[#FAAE2B] border-b-2 border-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedProduct.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.logoUrl}
                    alt={selectedProduct.name}
                    className="w-9 h-9 rounded-lg bg-white border-2 border-zinc-900 object-cover"
                  />
                )}
                <div>
                  <h3 className="font-black text-base text-zinc-900">
                    Checkout Auto Order
                  </h3>
                  <p className="font-mono text-xs font-bold text-zinc-800">
                    {selectedProduct.name} • {selectedProduct.duration}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-lg bg-white border-2 border-zinc-900 flex items-center justify-center text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleCheckoutSubmit}
              className="p-5 space-y-4 overflow-y-auto"
            >
              {checkoutError && (
                <div className="p-3 rounded-xl bg-[#FCA5A5] border-2 border-zinc-900 text-zinc-900 text-xs font-bold">
                  {checkoutError}
                </div>
              )}

              {/* Quantity */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border-2 border-zinc-900">
                <div>
                  <div className="text-xs font-black text-zinc-900">Jumlah Akun</div>
                  <div className="font-mono text-[11px] text-zinc-600">
                    Stok ready: {selectedProduct.stockCount}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg bg-[#f6f1e7] border-2 border-zinc-900 text-zinc-900 font-black cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-6 text-center font-mono font-black text-sm">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((q) => Math.min(selectedProduct.stockCount, q + 1))
                    }
                    className="w-8 h-8 rounded-lg bg-[#FAAE2B] border-2 border-zinc-900 text-zinc-900 font-black cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold text-zinc-800 mb-1">
                    NAMA LENGKAP
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3.5 py-2.5 rounded-xl brutal-input text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] font-bold text-zinc-800 mb-1">
                    NO. WHATSAPP
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerWhatsapp}
                    onChange={(e) => setCustomerWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl brutal-input text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-bold text-zinc-800 mb-1">
                  EMAIL (UNTUK LACAK INVOICE)
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl brutal-input text-sm font-medium"
                />
              </div>

              {/* Payment Methods */}
              <div>
                <label className="block font-mono text-[11px] font-bold text-zinc-800 mb-2">
                  METODE PEMBAYARAN
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((pm) => {
                    const active = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`p-3 rounded-xl border-2 border-zinc-900 text-left transition cursor-pointer ${
                          active
                            ? "bg-[#8BD3DD] shadow-[2px_2px_0px_0px_#18181b]"
                            : "bg-white hover:bg-zinc-50"
                        }`}
                      >
                        <div className="text-xs font-black text-zinc-900">{pm.label}</div>
                        <div className="text-[11px] text-zinc-700 mt-0.5">{pm.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="p-4 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] font-bold text-zinc-500">
                    TOTAL PEMBAYARAN
                  </div>
                  <div className="text-lg font-black text-zinc-900">
                    {formatRupiah(selectedProduct.price * quantity)}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="brutal-btn px-5 py-2.5 rounded-xl bg-[#A7F3D0] text-zinc-900 font-black text-sm flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      Buat Invoice
                      <Zap className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Tracker Modal */}
      {trackerOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-900/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#f6f1e7] brutal-card overflow-hidden">
            <div className="px-5 py-4 bg-[#8BD3DD] border-b-2 border-zinc-900 flex items-center justify-between">
              <h3 className="font-black text-base text-zinc-900">Lacak Pesanan</h3>
              <button
                onClick={() => setTrackerOpen(false)}
                className="w-8 h-8 rounded-lg bg-white border-2 border-zinc-900 flex items-center justify-center text-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <form onSubmit={handleTrackOrder} className="flex gap-2 mb-4">
                <input
                  type="text"
                  required
                  value={trackerQuery}
                  onChange={(e) => setTrackerQuery(e.target.value)}
                  placeholder="No. Invoice (INV-...) atau Email"
                  className="flex-1 px-3.5 py-2.5 rounded-xl brutal-input text-sm font-medium"
                />
                <button
                  type="submit"
                  disabled={trackerLoading}
                  className="brutal-btn px-4 py-2.5 rounded-xl bg-[#FAAE2B] text-zinc-900 text-sm font-black cursor-pointer"
                >
                  {trackerLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Cari"
                  )}
                </button>
              </form>

              {trackerError && (
                <p className="text-xs font-bold text-rose-700 mb-3">{trackerError}</p>
              )}

              {trackerResults && trackerResults.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-6 font-medium">
                  Pesanan tidak ditemukan. Pastikan nomor invoice atau email benar.
                </p>
              )}

              {trackerResults && trackerResults.length > 0 && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {trackerResults.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => router.push(`/order/${order.id}`)}
                      className="w-full p-3.5 rounded-xl bg-white hover:bg-[#FDE68A]/40 border-2 border-zinc-900 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-black text-zinc-900">
                          {order.id}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-black px-2 py-0.5 rounded-md border border-zinc-900 ${
                            order.status === "paid"
                              ? "bg-[#A7F3D0] text-zinc-900"
                              : "bg-[#FDE68A] text-zinc-900"
                          }`}
                        >
                          {order.status === "paid" ? "LUNAS" : "PENDING"}
                        </span>
                      </div>
                      <div className="text-xs font-black text-zinc-900">
                        {order.productName} × {order.quantity}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-600 mt-0.5">
                        {formatRupiah(order.payableAmount ?? order.totalPrice)} •{" "}
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
