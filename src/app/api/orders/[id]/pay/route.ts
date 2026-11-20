import { NextResponse } from "next/server";
import { readDatabase, verifyAdminRequest } from "@/lib/storage";
import { fulfillOrderById } from "@/lib/order-fulfillment";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const isAdmin = verifyAdminRequest(request);

    if (!isAdmin) {
      const db = await readDatabase();
      const hasLiveQris = Boolean(
        (db.settings?.qrisStaticString || process.env.QRIS_STATIC_STRING || "").trim()
      );
      const demoAllowed =
        db.settings?.enableDemoConfirm !== undefined
          ? db.settings.enableDemoConfirm
          : !hasLiveQris;

      if (!demoAllowed) {
        return NextResponse.json(
          {
            error:
              "Konfirmasi manual dinonaktifkan karena QRIS Otomatis GoPay Merchant aktif. Pembayaran akan terverifikasi otomatis begitu Anda transfer.",
          },
          { status: 403 }
        );
      }
    }

    const result = await fulfillOrderById(id, isAdmin ? "admin-manual" : "demo");
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      order: result.order,
      message: result.message,
    });
  } catch (error) {
    console.error("[API /orders/[id]/pay POST]", error);
    return NextResponse.json(
      { error: "Gagal memproses pembayaran" },
      { status: 500 }
    );
  }
}
