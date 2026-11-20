import { NextResponse } from "next/server";
import {
  getResolvedCategories,
  getStorageMode,
  readDatabase,
  verifyAdminRequest,
} from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json(
      { error: "Password admin salah atau tidak valid." },
      { status: 401 }
    );
  }

  try {
    const db = await readDatabase();
    const totalAvailableStock = db.products.reduce(
      (sum, p) => sum + p.stock.filter((s) => s.status === "available").length,
      0
    );
    const paidOrders = db.orders.filter((o) => o.status === "paid");
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + (o.payableAmount ?? o.totalPrice),
      0
    );

    const effectiveSettings = {
      qrisStaticString:
        db.settings?.qrisStaticString || process.env.QRIS_STATIC_STRING || "",
      webhookSecret:
        db.settings?.webhookSecret ||
        process.env.WEBHOOK_SECRET ||
        "gopay-webhook-secret-2026",
      telegramBotToken:
        db.settings?.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || "",
      telegramChatId:
        db.settings?.telegramChatId || process.env.TELEGRAM_CHAT_ID || "",
      enableDemoConfirm:
        db.settings?.enableDemoConfirm !== undefined
          ? db.settings.enableDemoConfirm
          : !(db.settings?.qrisStaticString || process.env.QRIS_STATIC_STRING),
    };

    return NextResponse.json({
      ok: true,
      storageMode: getStorageMode(),
      products: db.products,
      orders: db.orders,
      categories: getResolvedCategories(db),
      settings: effectiveSettings,
      stats: {
        totalProducts: db.products.length,
        totalAvailableStock,
        totalOrders: db.orders.length,
        paidOrdersCount: paidOrders.length,
        totalRevenue,
      },
    });
  } catch (error) {
    console.error("[API /admin/state GET]", error);
    return NextResponse.json(
      { error: "Gagal memuat data admin" },
      { status: 500 }
    );
  }
}
