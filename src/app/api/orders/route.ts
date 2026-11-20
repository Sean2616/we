import { NextResponse } from "next/server";
import { readDatabase, writeDatabase } from "@/lib/storage";
import { convertStaticToDynamicQris } from "@/lib/qris";
import { notifyNewOrder } from "@/lib/telegram";
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

function generateUniqueCodeAndPayable(
  baseTotal: number,
  existingOrders: Order[],
  mode: "add" | "subtract" | "none",
  minCode: number,
  maxCode: number
): { uniqueCode: number; payableAmount: number } {
  if (mode === "none" || maxCode <= 0) {
    return { uniqueCode: 0, payableAmount: baseTotal };
  }

  const safeMin = Math.max(1, Math.min(999, Math.round(minCode)));
  const safeMax = Math.max(safeMin, Math.min(999, Math.round(maxCode)));

  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const usedTotals = new Set(
    existingOrders
      .filter(
        (o) =>
          o.status === "pending" && new Date(o.createdAt).getTime() >= cutoff
      )
      .map((o) => o.payableAmount ?? o.totalPrice)
  );

  for (let attempt = 0; attempt < 60; attempt++) {
    const code =
      Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
    const candidate =
      mode === "subtract" ? Math.max(100, baseTotal - code) : baseTotal + code;
    if (!usedTotals.has(candidate)) {
      return {
        uniqueCode: mode === "subtract" ? -code : code,
        payableAmount: candidate,
      };
    }
  }

  const fallbackCode =
    Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  return {
    uniqueCode: mode === "subtract" ? -fallbackCode : fallbackCode,
    payableAmount:
      mode === "subtract"
        ? Math.max(100, baseTotal - fallbackCode)
        : baseTotal + fallbackCode,
  };
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

    const totalPrice = product.price * quantity;
    const uniqueCodeMode = db.settings?.uniqueCodeMode || "add";
    const uniqueCodeMin = db.settings?.uniqueCodeMin ?? 1;
    const uniqueCodeMax = db.settings?.uniqueCodeMax ?? 99;
    const { uniqueCode, payableAmount } = generateUniqueCodeAndPayable(
      totalPrice,
      db.orders,
      uniqueCodeMode,
      uniqueCodeMin,
      uniqueCodeMax
    );

    // Generate Dynamic QRIS jika string QRIS GoPay Merchant sudah diatur
    const staticQris = (
      db.settings?.qrisStaticString ||
      process.env.QRIS_STATIC_STRING ||
      ""
    ).trim();
    const qrisPayload = staticQris
      ? convertStaticToDynamicQris(staticQris, payableAmount) || undefined
      : undefined;

    const order: Order = {
      id: generateOrderId(),
      productId: product.id,
      productName: product.name,
      duration: product.duration,
      quantity,
      unitPrice: product.price,
      totalPrice,
      uniqueCode,
      payableAmount,
      qrisPayload,
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

    // Kirim notifikasi order baru ke Telegram
    try {
      await notifyNewOrder(order, db.settings);
    } catch (err) {
      console.error("[Telegram notifyNewOrder error]", err);
    }

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    console.error("[API /orders POST]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat pesanan" },
      { status: 500 }
    );
  }
}
