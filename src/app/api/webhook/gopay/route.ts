import { NextResponse } from "next/server";
import { readDatabase } from "@/lib/storage";
import { parseRupiahAmountFromNotification } from "@/lib/qris";
import { fulfillOrderById } from "@/lib/order-fulfillment";

export const dynamic = "force-dynamic";

async function handleWebhook(request: Request) {
  try {
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret") || "";
    const headerSecret =
      request.headers.get("x-webhook-secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      "";

    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      } else {
        const rawText = await request.text();
        try {
          body = JSON.parse(rawText);
        } catch {
          body = { text: rawText };
        }
      }
    }

    const db = await readDatabase();
    const expectedSecret = (
      db.settings?.webhookSecret ||
      process.env.WEBHOOK_SECRET ||
      "gopay-webhook-secret-2026"
    ).trim();

    const providedSecret = String(
      body.secret || headerSecret || querySecret || ""
    ).trim();

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized: WEBHOOK_SECRET tidak valid" },
        { status: 401 }
      );
    }

    // Ambil nominal dari parameter amount (numeric) atau parse teks notifikasi GoPay Merchant
    const rawAmount =
      body.amount ?? url.searchParams.get("amount") ?? undefined;
    const rawText = [
      body.title,
      body.text,
      body.message,
      body.notification,
      body.body,
      url.searchParams.get("text"),
      url.searchParams.get("message"),
    ]
      .filter(Boolean)
      .map(String)
      .join(" ");

    let amount: number | null = null;
    if (rawAmount !== undefined && rawAmount !== "") {
      const num = Number(String(rawAmount).replace(/[^\d]/g, ""));
      if (Number.isFinite(num) && num > 0) amount = num;
    }
    if (!amount && rawText) {
      amount = parseRupiahAmountFromNotification(rawText);
    }

    if (!amount) {
      return NextResponse.json(
        {
          ok: false,
          error: "Nominal pembayaran tidak ditemukan di payload notifikasi.",
          receivedText: rawText,
        },
        { status: 400 }
      );
    }

    // Cari order pending terbaru (maks 24 jam terakhir) yang cocok dengan payableAmount
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const matchedOrder = db.orders.find(
      (o) =>
        o.status === "pending" &&
        new Date(o.createdAt).getTime() >= cutoff &&
        (o.payableAmount === amount || o.totalPrice === amount)
    );

    if (!matchedOrder) {
      return NextResponse.json({
        ok: true,
        matched: false,
        amount,
        message: `Nominal Rp ${amount.toLocaleString(
          "id-ID"
        )} diterima, tetapi tidak ada invoice pending yang cocok.`,
      });
    }

    const result = await fulfillOrderById(matchedOrder.id, "gopay-webhook");
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, orderId: matchedOrder.id },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      matched: true,
      amount,
      orderId: matchedOrder.id,
      message: `Pembayaran Rp ${amount.toLocaleString(
        "id-ID"
      )} cocok dengan ${matchedOrder.id}! Akun otomatis terkirim.`,
    });
  } catch (error) {
    console.error("[API /webhook/gopay]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat memproses webhook GoPay Merchant" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handleWebhook(request);
}

export async function GET(request: Request) {
  return handleWebhook(request);
}
