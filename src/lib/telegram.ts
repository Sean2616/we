import { Order, StoreSettings } from "./types";

function formatRupiah(value: number) {
  return "Rp " + Math.round(value).toLocaleString("id-ID");
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function resolveTelegramConfig(settings?: StoreSettings) {
  const token = (
    settings?.telegramBotToken ||
    process.env.TELEGRAM_BOT_TOKEN ||
    ""
  ).trim();
  const chatId = (
    settings?.telegramChatId ||
    process.env.TELEGRAM_CHAT_ID ||
    ""
  ).trim();
  return token && chatId ? { token, chatId } : null;
}

export async function sendTelegramMessage(
  htmlText: string,
  settings?: StoreSettings
): Promise<{ ok: boolean; error?: string }> {
  const cfg = resolveTelegramConfig(settings);
  if (!cfg) {
    return {
      ok: false,
      error: "TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diatur.",
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text: htmlText,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: data.description || `Telegram HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Gagal menghubungi Telegram",
    };
  }
}

export async function notifyNewOrder(
  order: Order,
  settings?: StoreSettings
): Promise<void> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto";
  const payable = order.payableAmount ?? order.totalPrice;

  const lines = [
    `🛒 <b>ORDER BARU MASUK — ${escapeHtml(storeName)}</b>`,
    ``,
    `🧾 Invoice: <code>${escapeHtml(order.id)}</code>`,
    `📦 Produk: <b>${escapeHtml(order.productName)}</b> (${escapeHtml(order.duration)})`,
    `🔢 Jumlah: ${order.quantity} akun`,
    `💳 Metode: <b>${escapeHtml(order.paymentMethod)}</b>`,
    `💰 Total Bayar: <b>${formatRupiah(payable)}</b>${
      order.uniqueCode ? ` (Kode unik: +${order.uniqueCode})` : ""
    }`,
    ``,
    `👤 Pembeli: ${escapeHtml(order.customerName)}`,
    `📧 Email: ${escapeHtml(order.customerEmail)}`,
    `📱 WhatsApp: ${escapeHtml(order.customerWhatsapp)}`,
    ``,
    `⏳ Status: <b>MENUNGGU PEMBAYARAN</b>`,
  ];

  await sendTelegramMessage(lines.join("\n"), settings);
}

export async function notifyOrderPaid(
  order: Order,
  via: "gopay-webhook" | "admin-manual" | "demo",
  remainingStock: number,
  settings?: StoreSettings
): Promise<void> {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto";
  const payable = order.payableAmount ?? order.totalPrice;
  const viaLabel =
    via === "gopay-webhook"
      ? "QRIS GoPay Merchant (Otomatis)"
      : via === "admin-manual"
      ? "Konfirmasi Manual Admin"
      : "Simulasi Demo";

  const lines = [
    `✅ <b>PEMBAYARAN LUNAS & AKUN TERKIRIM</b>`,
    `🏪 Toko: ${escapeHtml(storeName)}`,
    ``,
    `🧾 Invoice: <code>${escapeHtml(order.id)}</code>`,
    `📦 Produk: <b>${escapeHtml(order.productName)}</b> × ${order.quantity}`,
    `💰 Nominal Masuk: <b>${formatRupiah(payable)}</b>`,
    `⚡ Verifikasi: ${escapeHtml(viaLabel)}`,
    `👤 Pembeli: ${escapeHtml(order.customerName)} (${escapeHtml(order.customerWhatsapp)})`,
    ``,
    `📊 Sisa Stok ${escapeHtml(order.productName)}: <b>${remainingStock}</b>`,
  ];

  if (remainingStock <= 1) {
    lines.push(
      ``,
      `⚠️ <b>PERINGATAN STOK!</b> Stok ${escapeHtml(
        order.productName
      )} tinggal <b>${remainingStock}</b>. Segera restok di /admin!`
    );
  }

  await sendTelegramMessage(lines.join("\n"), settings);
}
