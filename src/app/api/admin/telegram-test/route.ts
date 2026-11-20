import { NextResponse } from "next/server";
import { readDatabase, verifyAdminRequest } from "@/lib/storage";
import { sendTelegramMessage } from "@/lib/telegram";
import { StoreSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<StoreSettings>;
    const db = await readDatabase();
    const mergedSettings: StoreSettings = {
      ...db.settings,
      ...(body.telegramBotToken ? { telegramBotToken: body.telegramBotToken } : {}),
      ...(body.telegramChatId ? { telegramChatId: body.telegramChatId } : {}),
    };

    const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto";
    const result = await sendTelegramMessage(
      `🔔 <b>TEST NOTIFIKASI BERHASIL!</b>\n\nBot Telegram untuk <b>${storeName}</b> sudah terhubung dengan benar. Setiap order baru & pembayaran QRIS GoPay Merchant akan otomatis dikirim ke chat ini.`,
      mergedSettings
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Pesan test berhasil dikirim ke Telegram Anda!",
    });
  } catch (error) {
    console.error("[API /admin/telegram-test POST]", error);
    return NextResponse.json(
      { error: "Gagal mengirim test Telegram" },
      { status: 500 }
    );
  }
}
