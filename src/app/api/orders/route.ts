import { NextResponse } from "next/server";
import { readDatabase, writeDatabase } from "@/lib/storage";
import { Order, PaymentMethod } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_METHODS: PaymentMethod[] = ["QRIS", "DANA", "OVO", "GoPay", "BCA"];

function generateOrderId(): string {
  const now = new Date();
  const datePart = `${now.getFullYear().toString().slice(-2)}${String(
    now.getMonth() + 1
  ).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `INV-${datePart}-${randomPart}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") || "").trim().toLowerCase();

    if (!query) {
      return NextResponse.json(
        { error: "Masukkan nomor invoice atau email untuk melacak pesanan" },
        { status: 400 }
      );
    }

    const db = await readDatabase();
    const matched = db.orders
      .filter(
        (o) =>
          o.id.toLowerCase() === query ||
          o.customerEmail.toLowerCase() === query ||
          o.customerWhatsapp.replace(/\D/g, "") === query.replace(/\D/g, "")
      )
      .slice(0, 20);

    return NextResponse.json({ orders: matched });
  } catch (error) {
    console.error("[API /orders GET]", error);
    return NextResponse.json({ error: "Gagal mencari pesanan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      productId?: string;
      quantity?: number;
      customerName?: string;
      customerEmail?: string;
      customerWhatsapp?: string;
      paymentMethod?: PaymentMethod;
    };

    const productId = body.productId?.trim();
    const quantity = Math.max(1, Math.min(10, Number(body.quantity) || 1));
    const customerName = body.customerName?.trim() || "";
    const customerEmail = body.customerEmail?.trim() || "";
    const customerWhatsapp = body.customerWhatsapp?.trim() || "";
    const paymentMethod = ALLOWED_METHODS.includes(body.paymentMethod as PaymentMethod)
      ? (body.paymentMethod as PaymentMethod)
      : "QRIS";

    if (!productId || !customerName || !customerEmail || !customerWhatsapp) {
      return NextResponse.json(
        { error: "Lengkapi nama, email, nomor WhatsApp, dan produk yang dipilih." },
        { status: 400 }
      );
    }

    const db = await readDatabase();
    const product = db.products.find((p) => p.id === productId);
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    const availableStock = product.stock.filter((s) => s.status === "available");
    if (availableStock.length < quantity) {
      return NextResponse.json(
        {
          error: `Stok tidak mencukupi. Tersisa ${availableStock.length} akun untuk ${product.name}.`,
        },
        { status: 409 }
      );
    }

    const order: Order = {
      id: generateOrderId(),
      productId: product.id,
      productName: product.name,
      duration: product.duration,
      quantity,
      unitPrice: product.price,
      totalPrice: product.price * quantity,
      customerName,
      customerEmail,
      customerWhatsapp,
      paymentMethod,
      status: "pending",
      deliveredItems: [],
      createdAt: new Date().toISOString(),
    };

    db.orders.unshift(order);
    await writeDatabase(db);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[API /orders POST]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat pesanan" },
      { status: 500 }
    );
  }
}
