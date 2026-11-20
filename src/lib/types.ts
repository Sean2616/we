export type ProductCategory =
  | "Streaming"
  | "Music"
  | "Design"
  | "AI & Productivity"
  | "Editing"
  | "Other";

export interface StockItem {
  id: string;
  credentials: string; // e.g. "email@domain.com | password123 | Profile 2 PIN 1234"
  note?: string;
  status: "available" | "sold";
  orderId?: string;
  addedAt: string;
  soldAt?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  duration: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  description: string;
  features: string[];
  accentColor: string; // hex or tailwind gradient token
  icon: string; // short label or emoji
  stock: StockItem[];
  updatedAt: string;
}

export interface PublicProduct extends Omit<Product, "stock"> {
  stockCount: number;
  soldCount: number;
}

export type PaymentMethod = "QRIS" | "DANA" | "OVO" | "GoPay" | "BCA";

export interface DeliveredItem {
  credentials: string;
  note?: string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  duration: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "paid" | "expired";
  deliveredItems: DeliveredItem[];
  createdAt: string;
  paidAt?: string;
}

export interface StoreDatabase {
  products: Product[];
  orders: Order[];
  lastSyncedAt: string | null;
}

export interface SyncPayload {
  mode?: "replace" | "merge";
  products: Product[];
}
