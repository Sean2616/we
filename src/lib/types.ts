export type ProductCategory = string;

export interface StockItem {
  id: string;
  credentials: string;
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
  accentColor: string;
  icon: string;
  logoUrl?: string;
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
  uniqueCode?: number;
  payableAmount?: number;
  qrisPayload?: string;
  paidVia?: "gopay-webhook" | "admin-manual" | "demo";
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "paid" | "expired";
  deliveredItems: DeliveredItem[];
  createdAt: string;
  paidAt?: string;
}

export interface StoreSettings {
  qrisStaticString?: string;
  webhookSecret?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  enableDemoConfirm?: boolean;
  uniqueCodeMode?: "add" | "subtract" | "none";
  uniqueCodeMin?: number;
  uniqueCodeMax?: number;
}

export interface StoreDatabase {
  products: Product[];
  orders: Order[];
  categories?: string[];
  settings?: StoreSettings;
  lastSyncedAt: string | null;
}
