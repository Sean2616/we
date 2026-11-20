import { readDatabase, writeDatabase } from "./storage";
import { notifyOrderPaid } from "./telegram";
import { Order } from "./types";

export interface FulfillmentResult {
  ok: boolean;
  status: number;
  order?: Order;
  message?: string;
  error?: string;
  alreadyPaid?: boolean;
}

export async function fulfillOrderById(
  orderId: string,
  via: "gopay-webhook" | "admin-manual" | "demo"
): Promise<FulfillmentResult> {
  const db = await readDatabase();
  const order = db.orders.find(
    (o) => o.id.toLowerCase() === orderId.toLowerCase()
  );

  if (!order) {
    return { ok: false, status: 404, error: "Invoice tidak ditemukan" };
  }

  if (order.status === "paid") {
    return {
      ok: true,
      status: 200,
      order,
      alreadyPaid: true,
      message: "Pesanan sudah dibayar dan akun telah dikirim.",
    };
  }

  const product = db.products.find((p) => p.id === order.productId);
  if (!product) {
    return {
      ok: false,
      status: 404,
      error: "Produk untuk pesanan ini sudah tidak tersedia.",
    };
  }

  const availableItems = product.stock.filter((s) => s.status === "available");
  if (availableItems.length < order.quantity) {
    return {
      ok: false,
      status: 409,
      error: `Maaf, stok ${product.name} baru saja habis (tersisa ${availableItems.length}). Silakan hubungi admin.`,
    };
  }

  const now = new Date().toISOString();
  const allocated = availableItems.slice(0, order.quantity);
  for (const item of allocated) {
    item.status = "sold";
    item.orderId = order.id;
    item.soldAt = now;
  }

  order.status = "paid";
  order.paidAt = now;
  order.paidVia = via;
  order.deliveredItems = allocated.map((item) => ({
    credentials: item.credentials,
    note: item.note,
  }));
  product.updatedAt = now;

  await writeDatabase(db);

  const remainingStock = product.stock.filter(
    (s) => s.status === "available"
  ).length;

  // Kirim notifikasi LUNAS ke Telegram (non-blocking error)
  try {
    await notifyOrderPaid(order, via, remainingStock, db.settings);
  } catch (err) {
    console.error("[Telegram notifyOrderPaid error]", err);
  }

  return {
    ok: true,
    status: 200,
    order,
    message: "Pembayaran terverifikasi! Akun premium berhasil dikirim otomatis.",
  };
}
