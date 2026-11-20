import { NextResponse } from "next/server";
import { readDatabase } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = await readDatabase();
    const order = db.orders.find((o) => o.id.toLowerCase() === id.toLowerCase());

    if (!order) {
      return NextResponse.json(
        { error: "Invoice tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("[API /orders/[id] GET]", error);
    return NextResponse.json(
      { error: "Gagal mengambil detail invoice" },
      { status: 500 }
    );
  }
}
