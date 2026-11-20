import {
  getResolvedCategories,
  readDatabase,
  toPublicProduct,
} from "@/lib/storage";
import StorefrontClient from "@/components/StorefrontClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await readDatabase();
  const products = db.products.map(toPublicProduct);
  const categories = getResolvedCategories(db);
  const totalAvailableStock = products.reduce((sum, p) => sum + p.stockCount, 0);
  const totalCompletedOrders = db.orders.filter((o) => o.status === "paid").length;

  return (
    <StorefrontClient
      initialProducts={products}
      initialCategories={categories}
      initialStats={{
        totalProducts: products.length,
        totalAvailableStock,
        totalCompletedOrders,
      }}
      initialLastSyncedAt={db.lastSyncedAt}
      storeName={process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto"}
      whatsappAdmin={process.env.NEXT_PUBLIC_WHATSAPP_ADMIN || "6281234567890"}
    />
  );
}
