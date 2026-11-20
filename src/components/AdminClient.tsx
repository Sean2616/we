"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Package,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Save,
  Send,
  Settings,
  Tag,
  Trash2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Order, Product, ProductCategory, StoreSettings } from "@/lib/types";

const FALLBACK_CATEGORIES: ProductCategory[] = [
  "Streaming",
  "Music",
  "Design",
  "AI & Productivity",
  "Editing",
  "Other",
];

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Kompres gambar logo produk di browser menjadi 128x128px (ringan ~4-8 KB)
 * agar bisa langsung disimpan permanen di GitHub Gist tanpa layanan storage berbayar.
 */
function resizeImageToDataUrl(file: File, maxSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas tidak didukung"));

        // Center-crop square
        const scale = Math.max(maxSize / img.width, maxSize / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (maxSize - w) / 2;
        const y = (maxSize - h) / 2;

        ctx.clearRect(0, 0, maxSize, maxSize);
        ctx.drawImage(img, x, y, w, h);

        // Gunakan WebP jika didukung, fallback PNG
        const webp = canvas.toDataURL("image/webp", 0.85);
        if (webp.startsWith("data:image/webp")) {
          resolve(webp);
        } else {
          resolve(canvas.toDataURL("image/png"));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface AdminStats {
  totalProducts: number;
  totalAvailableStock: number;
  totalOrders: number;
  paidOrdersCount: number;
  totalRevenue: number;
}

export default function AdminClient({ storeName }: { storeName: string }) {
  const [adminKey, setAdminKey] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const [stats, setStats] = useState<AdminStats>({
    totalProducts: 0,
    totalAvailableStock: 0,
    totalOrders: 0,
    paidOrdersCount: 0,
    totalRevenue: 0,
  });
  const [storageMode, setStorageMode] = useState<string>("local-json");
  const [loadingData, setLoadingData] = useState(false);

  const [activeTab, setActiveTab] = useState<"stock" | "orders" | "settings">("stock");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Settings State
  const [qrisStaticString, setQrisStaticString] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("gopay-webhook-secret-2026");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [enableDemoConfirm, setEnableDemoConfirm] = useState(true);
  const [uniqueCodeMode, setUniqueCodeMode] = useState<"add" | "subtract" | "none">("add");
  const [uniqueCodeMin, setUniqueCodeMin] = useState("1");
  const [uniqueCodeMax, setUniqueCodeMax] = useState("99");
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [simAmount, setSimAmount] = useState("");
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Product Form State
  const [pName, setPName] = useState("");
  const [pCategory, setPCategory] = useState<ProductCategory>("Streaming");
  const [pDuration, setPDuration] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pOriginalPrice, setPOriginalPrice] = useState("");
  const [pBadge, setPBadge] = useState("");
  const [pIcon, setPIcon] = useState("");
  const [pLogoUrl, setPLogoUrl] = useState("");
  const [pAccent, setPAccent] = useState("#FAAE2B");
  const [pDesc, setPDesc] = useState("");
  const [pFeatures, setPFeatures] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  // Bulk Stock Form State
  const [bulkLines, setBulkLines] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [addingStock, setAddingStock] = useState(false);

  function showToast(text: string, type: "ok" | "err" = "ok") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  }

  function hydrateEditor(prod: Product | null) {
    if (!prod) {
      setPName("");
      setPCategory(categories[0] || "Streaming");
      setPDuration("1 Bulan");
      setPPrice("");
      setPOriginalPrice("");
      setPBadge("");
      setPIcon("");
      setPLogoUrl("");
      setPAccent("#FAAE2B");
      setPDesc("");
      setPFeatures("Garansi Full Durasi\nAuto Kirim 24/7");
      return;
    }
    setPName(prod.name);
    setPCategory(prod.category);
    setPDuration(prod.duration);
    setPPrice(String(prod.price));
    setPOriginalPrice(prod.originalPrice ? String(prod.originalPrice) : "");
    setPBadge(prod.badge || "");
    setPIcon(prod.icon);
    setPLogoUrl(prod.logoUrl || "");
    setPAccent(prod.accentColor);
    setPDesc(prod.description);
    setPFeatures(prod.features.join("\n"));
  }

  async function fetchAdminState(key: string, keepSelection = true) {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/state", {
        headers: { "x-admin-key": key },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Gagal login" };
      }

      setProducts(data.products || []);
      setOrders(data.orders || []);
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
      }
      setStats(data.stats);
      setStorageMode(data.storageMode);

      if (data.settings) {
        const s = data.settings as StoreSettings;
        setQrisStaticString(s.qrisStaticString || "");
        setWebhookSecret(s.webhookSecret || "gopay-webhook-secret-2026");
        setTelegramBotToken(s.telegramBotToken || "");
        setTelegramChatId(s.telegramChatId || "");
        setEnableDemoConfirm(Boolean(s.enableDemoConfirm));
        setUniqueCodeMode(s.uniqueCodeMode || "add");
        setUniqueCodeMin(String(s.uniqueCodeMin ?? 1));
        setUniqueCodeMax(String(s.uniqueCodeMax ?? 99));
      }

      if (keepSelection && selectedId) {
        const found = (data.products as Product[]).find((p) => p.id === selectedId);
        if (found) {
          hydrateEditor(found);
        } else if (data.products.length > 0) {
          setSelectedId(data.products[0].id);
          hydrateEditor(data.products[0]);
        } else {
          setSelectedId(null);
          hydrateEditor(null);
        }
      } else if (data.products.length > 0) {
        setSelectedId(data.products[0].id);
        hydrateEditor(data.products[0]);
      }

      return { ok: true };
    } catch {
      return { ok: false, error: "Koneksi gagal." };
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("premstore_admin_key");
    if (saved) {
      setAdminKey(saved);
      fetchAdminState(saved, false).then((r) => {
        if (r.ok) {
          setAuthenticated(true);
        } else {
          sessionStorage.removeItem("premstore_admin_key");
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    const res = await fetchAdminState(inputPassword.trim(), false);
    setAuthLoading(false);
    if (!res.ok) {
      setAuthError(res.error || "Password salah.");
      return;
    }
    setAdminKey(inputPassword.trim());
    sessionStorage.setItem("premstore_admin_key", inputPassword.trim());
    setAuthenticated(true);
    setInputPassword("");
  }

  function handleLogout() {
    sessionStorage.removeItem("premstore_admin_key");
    setAdminKey("");
    setAuthenticated(false);
  }

  function selectProduct(prod: Product) {
    setSelectedId(prod.id);
    hydrateEditor(prod);
  }

  function startNewProduct() {
    setSelectedId(null);
    hydrateEditor(null);
  }

  async function handleLogoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 128);
      setPLogoUrl(dataUrl);
      showToast("Logo siap! Klik 'Simpan Produk' untuk menyimpan.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal memproses gambar logo",
        "err"
      );
    } finally {
      e.target.value = "";
    }
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          id: selectedId,
          name: pName,
          category: pCategory,
          duration: pDuration,
          price: Number(pPrice),
          originalPrice: pOriginalPrice ? Number(pOriginalPrice) : null,
          badge: pBadge,
          icon: pIcon,
          logoUrl: pLogoUrl,
          accentColor: pAccent,
          description: pDesc,
          features: pFeatures,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menyimpan produk", "err");
        return;
      }

      setSelectedId(data.savedId);
      await fetchAdminState(adminKey, false);
      const savedProd = (data.products as Product[]).find(
        (p) => p.id === data.savedId
      );
      if (savedProd) {
        setSelectedId(savedProd.id);
        hydrateEditor(savedProd);
      }
      showToast("Produk berhasil disimpan!");
    } catch {
      showToast("Terjadi kesalahan jaringan", "err");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleDeleteProduct() {
    if (!selectedId) return;
    if (!confirm("Hapus produk ini beserta seluruh stoknya?")) return;

    const res = await fetch(`/api/admin/products/${encodeURIComponent(selectedId)}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Gagal menghapus produk", "err");
      return;
    }
    setSelectedId(null);
    await fetchAdminState(adminKey, false);
    showToast("Produk berhasil dihapus.");
  }

  async function handleAddBulkStock(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setAddingStock(true);
    try {
      const res = await fetch(
        `/api/admin/products/${encodeURIComponent(selectedId)}/stock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": adminKey,
          },
          body: JSON.stringify({ lines: bulkLines, note: bulkNote }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menambah stok", "err");
        return;
      }
      setBulkLines("");
      await fetchAdminState(adminKey, true);
      showToast(`${data.addedCount} stok akun berhasil ditambahkan!`);
    } finally {
      setAddingStock(false);
    }
  }

  async function handleDeleteStock(stockId: string) {
    if (!selectedId) return;
    const res = await fetch(
      `/api/admin/products/${encodeURIComponent(selectedId)}/stock/${encodeURIComponent(
        stockId
      )}`,
      {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      }
    );
    if (!res.ok) {
      showToast("Gagal menghapus stok", "err");
      return;
    }
    await fetchAdminState(adminKey, true);
    showToast("Stok dihapus.");
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setAddingCategory(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menambah kategori", "err");
        return;
      }
      setCategories(data.categories || []);
      setNewCategoryName("");
      showToast(data.message || `Kategori "${name}" ditambahkan!`);
    } finally {
      setAddingCategory(false);
    }
  }

  async function handleDeleteCategory(name: string) {
    if (!confirm(`Hapus kategori "${name}" dari daftar filter?`)) return;
    const res = await fetch(
      `/api/admin/categories?name=${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: { "x-admin-key": adminKey },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Gagal menghapus kategori", "err");
      return;
    }
    setCategories(data.categories || []);
    showToast(data.message || `Kategori "${name}" dihapus.`);
  }

  async function handleManualConfirmOrder(orderId: string) {
    const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
      method: "POST",
      headers: { "x-admin-key": adminKey },
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Gagal memproses order", "err");
      return;
    }
    await fetchAdminState(adminKey, true);
    showToast(`Order ${orderId} ditandai LUNAS & akun dikirim otomatis!`);
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({
          qrisStaticString,
          webhookSecret,
          telegramBotToken,
          telegramChatId,
          enableDemoConfirm,
          uniqueCodeMode,
          uniqueCodeMin: Number(uniqueCodeMin),
          uniqueCodeMax: Number(uniqueCodeMax),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal menyimpan pengaturan", "err");
        return;
      }
      showToast(data.message || "Pengaturan berhasil disimpan!");
    } catch {
      showToast("Terjadi kesalahan jaringan", "err");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    try {
      const res = await fetch("/api/admin/telegram-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ telegramBotToken, telegramChatId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Gagal mengirim test Telegram", "err");
        return;
      }
      showToast(data.message || "Pesan test terkirim ke Telegram!");
    } finally {
      setTestingTelegram(false);
    }
  }

  async function handleTestWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (!simAmount.trim()) return;
    setTestingWebhook(true);
    try {
      const res = await fetch(
        `/api/webhook/gopay?secret=${encodeURIComponent(webhookSecret)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `Pembayaran QRIS sebesar Rp${Number(
              simAmount.replace(/[^\d]/g, "")
            ).toLocaleString("id-ID")} berhasil diterima di GoPay Merchant`,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Simulasi webhook gagal", "err");
        return;
      }
      await fetchAdminState(adminKey, true);
      showToast(data.message || "Webhook diproses!", data.matched ? "ok" : "err");
    } finally {
      setTestingWebhook(false);
    }
  }

  // LOGIN SCREEN (Saweria Neo-Brutalism)
  if (!authenticated) {
    return (
      <div className="min-h-screen dot-bg text-zinc-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white brutal-card overflow-hidden">
          <div className="bg-[#FAAE2B] border-b-2 border-zinc-900 p-6 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6 text-zinc-900" />
            </div>
            <div>
              <h1 className="text-lg font-black text-zinc-900 leading-tight">
                Admin Panel — {storeName}
              </h1>
              <p className="font-mono text-[11px] font-bold text-zinc-800 mt-0.5">
                KELOLA STOK • QRIS GOPAY • TELEGRAM
              </p>
            </div>
          </div>

          <div className="p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              {authError && (
                <div className="p-3 rounded-xl bg-[#FCA5A5] border-2 border-zinc-900 text-zinc-900 text-xs font-bold">
                  {authError}
                </div>
              )}

              <div>
                <label className="block font-mono text-[11px] font-bold text-zinc-800 mb-1.5">
                  ADMIN_PASSWORD
                </label>
                <input
                  type="password"
                  required
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Masukkan password admin..."
                  className="w-full px-3.5 py-2.5 rounded-xl brutal-input text-sm font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 rounded-xl brutal-btn bg-[#A7F3D0] text-zinc-900 font-black text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    Masuk Dashboard Admin
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t-2 border-dashed border-zinc-300 flex items-center justify-between text-xs font-mono font-bold text-zinc-600">
              <Link href="/" className="hover:text-zinc-900 inline-flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                Kembali ke Toko
              </Link>
              <span>Full Vercel</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedProduct = products.find((p) => p.id === selectedId) || null;

  return (
    <div className="min-h-screen dot-bg text-zinc-900 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#f6f1e7]/95 backdrop-blur border-b-2 border-zinc-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAAE2B] brutal-card-sm flex items-center justify-center">
              <Zap className="w-5 h-5 text-zinc-900 fill-zinc-900" />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base text-zinc-900 leading-tight">
                Admin Dashboard — {storeName}
              </h1>
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-zinc-700">
                <Database className="w-3 h-3 text-emerald-700" />
                <span>
                  {storageMode === "github-gist"
                    ? "GitHub Gist (Gratis & Permanen)"
                    : storageMode === "upstash-redis"
                    ? "Upstash Redis (Permanen)"
                    : storageMode === "local-json"
                    ? "Local JSON (Dev)"
                    : "In-Memory (Sementara)"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAdminState(adminKey, true)}
              disabled={loadingData}
              className="brutal-btn bg-white inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/"
              className="brutal-btn bg-[#8BD3DD] px-3 py-2 rounded-xl text-xs font-bold text-zinc-900"
            >
              Lihat Toko
            </Link>
            <button
              onClick={handleLogout}
              className="brutal-btn bg-[#FCA5A5] inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-900 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Storage Warning */}
        {storageMode === "memory" && (
          <div className="p-4 rounded-2xl bg-[#FDE68A] brutal-card-sm text-zinc-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-zinc-900 shrink-0 mt-0.5" />
            <div>
              <strong>Perhatian — Storage Sementara Aktif di Vercel:</strong>{" "}
              Tambahkan <code>GITHUB_TOKEN</code> dan <code>GITHUB_GIST_ID</code> di
              Vercel Environment Variables lalu Redeploy agar stok tersimpan permanen
              100% gratis.
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`p-3.5 rounded-xl brutal-card-sm text-xs font-bold flex items-center gap-2 ${
              toast.type === "ok"
                ? "bg-[#A7F3D0] text-zinc-900"
                : "bg-[#FCA5A5] text-zinc-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toast.text}</span>
          </div>
        )}

        {/* Stats Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl bg-white brutal-card-sm p-4">
            <div className="font-mono text-[10px] font-bold uppercase text-zinc-500">
              Total Produk
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {stats.totalProducts}
            </div>
          </div>
          <div className="rounded-2xl bg-[#A7F3D0] brutal-card-sm p-4">
            <div className="font-mono text-[10px] font-bold uppercase text-zinc-700">
              Stok Siap Kirim
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {stats.totalAvailableStock}
            </div>
          </div>
          <div className="rounded-2xl bg-[#8BD3DD] brutal-card-sm p-4">
            <div className="font-mono text-[10px] font-bold uppercase text-zinc-700">
              Order Lunas / Total
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {stats.paidOrdersCount}{" "}
              <span className="text-sm font-bold text-zinc-700">
                / {stats.totalOrders}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-[#FAAE2B] brutal-card-sm p-4">
            <div className="font-mono text-[10px] font-bold uppercase text-zinc-800">
              Total Omzet
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-1">
              {formatRupiah(stats.totalRevenue)}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setActiveTab("stock")}
            className={`brutal-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${
              activeTab === "stock"
                ? "bg-[#FAAE2B] text-zinc-900"
                : "bg-white text-zinc-800"
            }`}
          >
            <Package className="w-4 h-4" />
            Kelola Produk & Stok
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`brutal-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${
              activeTab === "orders"
                ? "bg-[#FAAE2B] text-zinc-900"
                : "bg-white text-zinc-800"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Riwayat Order ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`brutal-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer ${
              activeTab === "settings"
                ? "bg-[#FAAE2B] text-zinc-900"
                : "bg-white text-zinc-800"
            }`}
          >
            <Settings className="w-4 h-4" />
            QRIS GoPay & Telegram
          </button>
        </div>

        {/* TAB 1: PRODUCTS & STOCK */}
        {activeTab === "stock" && (
          <div className="space-y-5">
            {/* Dynamic Category Manager */}
            <div className="rounded-2xl bg-white brutal-card-sm p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-zinc-900" />
                  <h2 className="font-black text-sm text-zinc-900">
                    Kelola Kategori Produk ({categories.length})
                  </h2>
                </div>
                <form onSubmit={handleAddCategory} className="flex w-full sm:w-auto gap-2">
                  <input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Kategori baru (VPN, Gaming, Cloud)"
                    className="flex-1 sm:w-64 min-w-0 px-3 py-1.5 rounded-xl brutal-input text-xs font-medium"
                  />
                  <button
                    type="submit"
                    disabled={addingCategory}
                    className="brutal-btn bg-[#A7F3D0] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-900 text-xs font-black cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tambah
                  </button>
                </form>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f6f1e7] border-2 border-zinc-900 text-xs font-bold text-zinc-900"
                  >
                    {cat}
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-zinc-600 hover:text-rose-700 cursor-pointer"
                      title={`Hapus kategori ${cat}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Sidebar: Product List */}
              <div className="lg:col-span-4 rounded-2xl bg-white brutal-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-black text-sm text-zinc-900">Daftar Produk</h2>
                  <button
                    onClick={startNewProduct}
                    className="brutal-btn bg-[#FAAE2B] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-zinc-900 text-xs font-black cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Produk Baru
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                  {products.map((prod) => {
                    const avail = prod.stock.filter(
                      (s) => s.status === "available"
                    ).length;
                    const active = prod.id === selectedId;
                    return (
                      <button
                        key={prod.id}
                        onClick={() => selectProduct(prod)}
                        className={`w-full text-left p-3 rounded-xl border-2 border-zinc-900 transition cursor-pointer flex items-center gap-3 ${
                          active
                            ? "bg-[#FDE68A] shadow-[3px_3px_0px_0px_#18181b]"
                            : "bg-[#f6f1e7] hover:bg-white"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg bg-white border-2 border-zinc-900 flex items-center justify-center font-black text-xs text-zinc-900 shrink-0 overflow-hidden">
                          {prod.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={prod.logoUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{prod.icon}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-xs text-zinc-900 truncate">
                              {prod.name}
                            </span>
                            <span
                              className={`font-mono px-2 py-0.5 rounded-md border border-zinc-900 text-[10px] font-black shrink-0 ${
                                avail > 0
                                  ? "bg-[#A7F3D0] text-zinc-900"
                                  : "bg-[#FCA5A5] text-zinc-900"
                              }`}
                            >
                              Stok: {avail}
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-mono text-[11px] text-zinc-700 mt-1">
                            <span className="truncate">
                              {prod.category} • {prod.duration}
                            </span>
                            <span className="font-black text-zinc-900 shrink-0">
                              {formatRupiah(prod.price)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Content: Editor & Bulk Stock */}
              <div className="lg:col-span-8 space-y-5">
                {/* Product Form */}
                <form
                  onSubmit={handleSaveProduct}
                  className="rounded-2xl bg-white brutal-card p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b-2 border-dashed border-zinc-300">
                    <h2 className="font-black text-sm text-zinc-900">
                      {selectedProduct
                        ? `Edit Produk: ${selectedProduct.name}`
                        : "Tambah Produk Baru"}
                    </h2>
                    <div className="flex items-center gap-2">
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={handleDeleteProduct}
                          className="brutal-btn bg-[#FCA5A5] inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-900 text-xs font-black cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={savingProduct}
                        className="brutal-btn bg-[#A7F3D0] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-zinc-900 text-xs font-black cursor-pointer disabled:opacity-60"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingProduct ? "Menyimpan..." : "Simpan Produk"}
                      </button>
                    </div>
                  </div>

                  {/* Logo Uploader */}
                  <div className="p-3.5 rounded-xl bg-[#f6f1e7] border-2 border-zinc-900 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-white border-2 border-zinc-900 flex items-center justify-center shrink-0 overflow-hidden">
                      {pLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pLogoUrl}
                          alt="Preview Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="brutal-btn bg-[#FAAE2B] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-zinc-900 cursor-pointer">
                          <Upload className="w-3.5 h-3.5" />
                          Upload Gambar Logo
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                        </label>
                        {pLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setPLogoUrl("")}
                            className="brutal-btn bg-white px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 cursor-pointer"
                          >
                            Hapus Logo
                          </button>
                        )}
                      </div>
                      <input
                        value={pLogoUrl}
                        onChange={(e) => setPLogoUrl(e.target.value)}
                        placeholder="Atau tempel URL gambar logo (https://...)"
                        className="w-full px-3 py-1.5 rounded-lg brutal-input text-[11px] font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Nama Produk
                      </label>
                      <input
                        required
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        placeholder="Netflix Premium 4K"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Kategori
                      </label>
                      <select
                        value={pCategory}
                        onChange={(e) =>
                          setPCategory(e.target.value as ProductCategory)
                        }
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Durasi
                      </label>
                      <input
                        required
                        value={pDuration}
                        onChange={(e) => setPDuration(e.target.value)}
                        placeholder="1 Bulan (1P1U)"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Harga Jual (Rp)
                      </label>
                      <input
                        type="number"
                        required
                        value={pPrice}
                        onChange={(e) => setPPrice(e.target.value)}
                        placeholder="35000"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Harga Coret (Opsional)
                      </label>
                      <input
                        type="number"
                        value={pOriginalPrice}
                        onChange={(e) => setPOriginalPrice(e.target.value)}
                        placeholder="54000"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Badge (Opsional)
                      </label>
                      <input
                        value={pBadge}
                        onChange={(e) => setPBadge(e.target.value)}
                        placeholder="TERLARIS / INSTANT"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Kode Ikon (Cadangan jika tanpa logo)
                      </label>
                      <input
                        maxLength={3}
                        value={pIcon}
                        onChange={(e) => setPIcon(e.target.value)}
                        placeholder="NF"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                        Warna Aksen (Hex)
                      </label>
                      <input
                        value={pAccent}
                        onChange={(e) => setPAccent(e.target.value)}
                        placeholder="#FAAE2B"
                        className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                      Deskripsi Singkat
                    </label>
                    <input
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Akun legal bergaransi penuh..."
                      className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[10px] font-bold uppercase text-zinc-600 mb-1">
                      Fitur Unggulan (1 baris = 1 fitur)
                    </label>
                    <textarea
                      rows={3}
                      value={pFeatures}
                      onChange={(e) => setPFeatures(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-semibold"
                    />
                  </div>
                </form>

                {/* Stock Manager */}
                {selectedProduct && (
                  <div className="rounded-2xl bg-white brutal-card p-5 space-y-4">
                    <div>
                      <h2 className="font-black text-sm text-zinc-900">
                        Stok Akun Otomatis — {selectedProduct.name}
                      </h2>
                      <p className="text-xs text-zinc-600">
                        Paste banyak akun sekaligus (1 baris = 1 stok akun yang dikirim
                        otomatis ke pembeli).
                      </p>
                    </div>

                    <form onSubmit={handleAddBulkStock} className="space-y-3">
                      <textarea
                        rows={4}
                        required
                        value={bulkLines}
                        onChange={(e) => setBulkLines(e.target.value)}
                        placeholder={
                          "akun1@mail.com | Pass123 | Profile 1 PIN 1234\nakun2@mail.com | Pass456 | Profile 2 PIN 5678"
                        }
                        className="w-full px-3 py-2.5 rounded-xl brutal-input font-mono text-xs"
                      />
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          value={bulkNote}
                          onChange={(e) => setBulkNote(e.target.value)}
                          placeholder="Catatan untuk pembeli (opsional, misal: Jangan ubah password)"
                          className="flex-1 px-3 py-2 rounded-xl brutal-input text-xs font-medium"
                        />
                        <button
                          type="submit"
                          disabled={addingStock}
                          className="brutal-btn bg-[#A7F3D0] px-4 py-2 rounded-xl text-zinc-900 text-xs font-black inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                        >
                          <Plus className="w-4 h-4" />
                          {addingStock ? "Menambahkan..." : "Tambah Stok"}
                        </button>
                      </div>
                    </form>

                    <div className="overflow-x-auto pt-2">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b-2 border-zinc-900 font-mono text-[10px] uppercase text-zinc-600">
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 pr-3">Kredensial Akun</th>
                            <th className="py-2 pr-3">Catatan / Order</th>
                            <th className="py-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {[...selectedProduct.stock]
                            .sort((a, b) => (a.status === "available" ? -1 : 1))
                            .map((item) => (
                              <tr key={item.id}>
                                <td className="py-2.5 pr-3 whitespace-nowrap">
                                  <span
                                    className={`font-mono px-2 py-0.5 rounded-md border border-zinc-900 text-[10px] font-black ${
                                      item.status === "available"
                                        ? "bg-[#A7F3D0] text-zinc-900"
                                        : "bg-[#FDE68A] text-zinc-900"
                                    }`}
                                  >
                                    {item.status === "available"
                                      ? "READY"
                                      : "TERJUAL"}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-3 font-mono text-[11px] font-semibold text-zinc-900 break-all">
                                  {item.credentials}
                                </td>
                                <td className="py-2.5 pr-3 text-zinc-700">
                                  {item.orderId && (
                                    <div className="font-mono text-[11px] font-black text-zinc-900">
                                      {item.orderId}
                                    </div>
                                  )}
                                  <div>{item.note || "-"}</div>
                                </td>
                                <td className="py-2.5 text-right">
                                  <button
                                    onClick={() => handleDeleteStock(item.id)}
                                    className="p-1.5 rounded-lg bg-[#FCA5A5] border border-zinc-900 text-zinc-900 cursor-pointer"
                                    title="Hapus stok"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          {selectedProduct.stock.length === 0 && (
                            <tr>
                              <td
                                colSpan={4}
                                className="py-8 text-center text-zinc-500 font-medium"
                              >
                                Stok kosong. Paste daftar akun pada form di atas.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ORDERS */}
        {activeTab === "orders" && (
          <div className="rounded-2xl bg-white brutal-card p-5 overflow-x-auto">
            <h2 className="font-black text-sm text-zinc-900 mb-4">
              Semua Pesanan Masuk
            </h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b-2 border-zinc-900 font-mono text-[10px] uppercase text-zinc-600">
                  <th className="py-2.5 pr-3">Invoice</th>
                  <th className="py-2.5 pr-3">Pembeli</th>
                  <th className="py-2.5 pr-3">Produk</th>
                  <th className="py-2.5 pr-3">Total</th>
                  <th className="py-2.5 pr-3">Status</th>
                  <th className="py-2.5 pr-3">Akun Terkirim / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-3 font-mono font-black text-zinc-900 whitespace-nowrap">
                      <Link href={`/order/${order.id}`} className="underline">
                        {order.id}
                      </Link>
                      <div className="text-[10px] font-sans font-normal text-zinc-500">
                        {new Date(order.createdAt).toLocaleString("id-ID")}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="font-bold text-zinc-900">
                        {order.customerName}
                      </div>
                      <div className="text-[11px] text-zinc-600">
                        {order.customerEmail} • {order.customerWhatsapp}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="text-zinc-900 font-bold">
                        {order.productName} × {order.quantity}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500">
                        {order.paymentMethod}
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-black text-zinc-900 whitespace-nowrap">
                      {formatRupiah(order.payableAmount ?? order.totalPrice)}
                      {order.uniqueCode ? (
                        <div className="font-mono text-[10px] font-bold text-zinc-600">
                          {order.uniqueCode > 0
                            ? `+${order.uniqueCode}`
                            : order.uniqueCode}{" "}
                          kode unik
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span
                        className={`font-mono px-2 py-0.5 rounded-md border border-zinc-900 text-[10px] font-black ${
                          order.status === "paid"
                            ? "bg-[#A7F3D0] text-zinc-900"
                            : "bg-[#FDE68A] text-zinc-900"
                        }`}
                      >
                        {order.status === "paid" ? "LUNAS" : "PENDING"}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {order.status === "paid" ? (
                        <div className="font-mono text-[11px] font-semibold text-zinc-800 space-y-1">
                          {order.deliveredItems.map((d, i) => (
                            <div key={i} className="break-all">
                              {d.credentials}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleManualConfirmOrder(order.id)}
                          className="brutal-btn bg-[#A7F3D0] px-3 py-1.5 rounded-lg text-zinc-900 text-[11px] font-black cursor-pointer"
                        >
                          Konfirmasi & Kirim Akun
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-500">
                      Belum ada pesanan masuk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: QRIS GOPAY MERCHANT & TELEGRAM */}
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <form
              onSubmit={handleSaveSettings}
              className="lg:col-span-7 rounded-2xl bg-white brutal-card p-5 space-y-5"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-dashed border-zinc-300">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-zinc-900" />
                  <h2 className="font-black text-sm text-zinc-900">
                    QRIS GoPay Merchant & Notifikasi Telegram
                  </h2>
                </div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="brutal-btn bg-[#A7F3D0] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-zinc-900 text-xs font-black cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingSettings ? "Menyimpan..." : "Simpan Pengaturan"}
                </button>
              </div>

              {/* QRIS Static String */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] font-bold uppercase text-zinc-800">
                  String QRIS Statis GoPay Merchant
                </label>
                <textarea
                  rows={3}
                  value={qrisStaticString}
                  onChange={(e) => setQrisStaticString(e.target.value)}
                  placeholder="00020101021126670016COM.NOBUBANK.WWW...5802ID...6304XXXX"
                  className="w-full px-3 py-2.5 rounded-xl brutal-input font-mono text-[11px]"
                />
                <p className="text-[11px] text-zinc-600 leading-relaxed">
                  Scan gambar QRIS dari aplikasi <strong>GoPay Merchant</strong>{" "}
                  dengan QR Scanner → salin teks <code>000201...</code> lalu tempel di
                  sini. Sistem otomatis mengubahnya menjadi QRIS Dinamis valid!
                </p>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] font-bold uppercase text-zinc-800">
                  Webhook Secret (Auto-Confirm GoPay Merchant)
                </label>
                <input
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="gopay-webhook-secret-2026"
                  className="w-full px-3 py-2 rounded-xl brutal-input font-mono text-xs"
                />
              </div>

              {/* Custom Unique Code */}
              <div className="space-y-2.5 p-4 rounded-xl bg-[#f6f1e7] border-2 border-zinc-900">
                <div className="text-xs font-black text-zinc-900">
                  Pengaturan Kode Unik QRIS
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] font-bold text-zinc-700 mb-1">
                      MODE KODE UNIK
                    </label>
                    <select
                      value={uniqueCodeMode}
                      onChange={(e) =>
                        setUniqueCodeMode(
                          e.target.value as "add" | "subtract" | "none"
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-bold"
                    >
                      <option value="add">Tambah ke Harga (+Rp)</option>
                      <option value="subtract">Potong Harga (-Rp)</option>
                      <option value="none">Tanpa Kode Unik (Rp 0)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold text-zinc-700 mb-1">
                      MINIMAL (RP)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      disabled={uniqueCodeMode === "none"}
                      value={uniqueCodeMin}
                      onChange={(e) => setUniqueCodeMin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-bold disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold text-zinc-700 mb-1">
                      MAKSIMAL (RP)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      disabled={uniqueCodeMode === "none"}
                      value={uniqueCodeMax}
                      onChange={(e) => setUniqueCodeMax(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl brutal-input text-xs font-bold disabled:opacity-40"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-zinc-700">
                  Tips: Pilih <strong>Potong Harga (-Rp)</strong> rentang{" "}
                  <code>1</code>–<code>99</code> agar pembeli tidak terbebani biaya
                  tambahan, namun nominal tiap invoice tetap unik!
                </p>
              </div>

              <hr className="border-t-2 border-dashed border-zinc-300" />

              {/* Telegram Bot */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-zinc-900" />
                    <span className="text-xs font-black text-zinc-900">
                      Notifikasi Bot Telegram
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={testingTelegram}
                    className="brutal-btn bg-[#8BD3DD] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-zinc-900 text-xs font-black cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {testingTelegram ? "Mengirim..." : "Test Kirim Telegram"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] font-bold text-zinc-700 mb-1">
                      TELEGRAM BOT TOKEN (@BotFather)
                    </label>
                    <input
                      type="password"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="123456789:AAH..."
                      className="w-full px-3 py-2 rounded-xl brutal-input font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-[10px] font-bold text-zinc-700 mb-1">
                      TELEGRAM CHAT ID (@userinfobot)
                    </label>
                    <input
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 py-2 rounded-xl brutal-input font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-t-2 border-dashed border-zinc-300" />

              {/* Demo Mode Toggle */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableDemoConfirm}
                  onChange={(e) => setEnableDemoConfirm(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-zinc-900"
                />
                <div>
                  <div className="text-xs font-black text-zinc-900">
                    Aktifkan Tombol &quot;Simulasi Bayar (Demo)&quot; di Halaman Pembeli
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    Matikan saat toko sudah live agar pembeli wajib membayar lewat QRIS
                    GoPay Merchant.
                  </div>
                </div>
              </label>
            </form>

            {/* Right Guide & Webhook Tester */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-2xl bg-[#8BD3DD] brutal-card p-5 space-y-3">
                <h3 className="font-black text-sm text-zinc-900">
                  Cara Auto-Confirm GoPay Merchant (MacroDroid)
                </h3>
                <ol className="text-xs font-medium text-zinc-900 space-y-1.5 list-decimal list-inside">
                  <li>
                    <strong>Trigger:</strong> Notification Received → Pilih aplikasi{" "}
                    <strong>GoPay Merchant</strong>.
                  </li>
                  <li>
                    <strong>Action:</strong> HTTP Request → Method{" "}
                    <code className="font-bold">POST</code>, Content-Type{" "}
                    <code className="font-bold">application/json</code>.
                  </li>
                  <li>
                    <strong>URL Webhook:</strong>
                  </li>
                </ol>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border-2 border-zinc-900">
                  <code className="text-[11px] font-bold text-zinc-900 break-all flex-1">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/webhook/gopay?secret=${webhookSecret}`
                      : `/api/webhook/gopay?secret=${webhookSecret}`}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/api/webhook/gopay?secret=${webhookSecret}`;
                      navigator.clipboard.writeText(url);
                      setCopiedWebhook(true);
                      setTimeout(() => setCopiedWebhook(false), 2000);
                    }}
                    className="p-1.5 rounded-lg bg-[#FAAE2B] border border-zinc-900 text-zinc-900 cursor-pointer shrink-0"
                  >
                    {copiedWebhook ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-zinc-900">
                  <strong>Body JSON di MacroDroid:</strong>
                  <pre className="mt-1 p-2.5 rounded-xl bg-white border-2 border-zinc-900 font-mono font-bold text-zinc-900 overflow-x-auto">
{`{"text": "[not_title] [notification]"}`}
                  </pre>
                </div>
              </div>

              <form
                onSubmit={handleTestWebhook}
                className="rounded-2xl bg-white brutal-card p-5 space-y-3"
              >
                <h3 className="font-black text-sm text-zinc-900">
                  Simulasi Webhook GoPay Merchant
                </h3>
                <p className="text-xs text-zinc-600">
                  Masukkan nominal tepat (termasuk kode unik, misal{" "}
                  <code>34988</code>) dari salah satu order PENDING untuk menguji
                  auto-kirim akun.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    value={simAmount}
                    onChange={(e) => setSimAmount(e.target.value)}
                    placeholder="Contoh: 34988"
                    className="flex-1 px-3 py-2 rounded-xl brutal-input text-xs font-bold"
                  />
                  <button
                    type="submit"
                    disabled={testingWebhook}
                    className="brutal-btn bg-[#A7F3D0] px-4 py-2 rounded-xl text-zinc-900 text-xs font-black cursor-pointer disabled:opacity-60"
                  >
                    {testingWebhook ? "Testing..." : "Simulasikan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
