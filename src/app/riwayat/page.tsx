import HistoryClient from "@/components/HistoryClient";

export const dynamic = "force-dynamic";

export default function RiwayatPage() {
  return (
    <HistoryClient
      storeName={process.env.NEXT_PUBLIC_STORE_NAME || "PremStore Auto"}
    />
  );
}
