import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <AdminClient
      storeName={process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto"}
    />
  );
}
