import { NextResponse } from "next/server";
import { readDatabase, verifyAdminRequest, writeDatabase } from "@/lib/storage";
import { convertStaticToDynamicQris } from "@/lib/qris";
import { StoreSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!verifyAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as StoreSettings;
    const qrisStaticString = String(body.qrisStaticString || "").trim();

    if (qrisStaticString) {
      const testDynamic = convertStaticToDynamicQris(qrisStaticString, 10000);
      if (!testDynamic) {
        return NextResponse.json(
          {
            error:
              "String QRIS tidak valid. Pastikan hasil scan QRIS GoPay Merchant diawali '000201...' dan mengandung '5802ID'.",
          },
          { status: 400 }
        );
      }
    }

    const db = await readDatabase();
    db.settings = {
      qrisStaticString,
      webhookSecret:
        String(body.webhookSecret || "").trim() || "gopay-webhook-secret-2026",
      telegramBotToken: String(body.telegramBotToken || "").trim(),
      telegramChatId: String(body.telegramChatId || "").trim(),
      enableDemoConfirm: Boolean(body.enableDemoConfirm),
    };
    db.lastSyncedAt = new Date().toISOString();

    await writeDatabase(db);

    return NextResponse.json({
      ok: true,
      settings: db.settings,
      message: "Pengaturan QRIS GoPay Merchant & Telegram berhasil disimpan!",
    });
  } catch (error) {
    console.error("[API /admin/settings POST]", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan" },
      { status: 500 }
    );
  }
}
