/**
 * Utility untuk mengubah QRIS Statis (GoPay Merchant / GoBiz / bank lain)
 * menjadi QRIS Dinamis dengan nominal otomatis sesuai standar EMVCo / QRIS Indonesia,
 * serta parser nominal dari notifikasi GoPay Merchant Android.
 */

function crc16CcittFalse(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Mengubah string QRIS statis menjadi QRIS dinamis dengan nominal tertentu (Rupiah bulat).
 */
export function convertStaticToDynamicQris(
  staticQris: string,
  amount: number
): string | null {
  const cleaned = staticQris.trim().replace(/\s+/g, "");
  if (!cleaned || !cleaned.startsWith("000201")) {
    return null;
  }

  // Hapus tag CRC lama (6304XXXX) di akhir string
  const crcIdx = cleaned.lastIndexOf("6304");
  let body = crcIdx > 0 ? cleaned.slice(0, crcIdx) : cleaned;

  // Ubah Point of Initiation Method dari Statis (010211) -> Dinamis (010212)
  body = body.replace("010211", "010212");

  // Hapus tag 54 (Transaction Amount) lama jika sudah ada
  body = body.replace(/54\d{2}\d+(?=5802ID)/, "");

  // Buat tag 54 baru (Transaction Amount)
  const amountStr = String(Math.max(1, Math.round(amount)));
  const amountTag = `54${String(amountStr.length).padStart(2, "0")}${amountStr}`;

  // Sisipkan tag 54 tepat sebelum Country Code (5802ID)
  const countryIdx = body.indexOf("5802ID");
  if (countryIdx === -1) {
    return null;
  }

  const dynamicBody =
    body.slice(0, countryIdx) + amountTag + body.slice(countryIdx) + "6304";
  const crc = crc16CcittFalse(dynamicBody);
  return dynamicBody + crc;
}

/**
 * Ekstrak nominal Rupiah dari teks notifikasi GoPay Merchant / GoBiz Android.
 * Contoh teks:
 * - "Pembayaran QRIS sebesar Rp35.147 berhasil diterima"
 * - "Anda menerima pembayaran Rp 35.147,00 dari Budi"
 * - "Transaksi masuk IDR 35,147"
 */
export function parseRupiahAmountFromNotification(text: string): number | null {
  if (!text) return null;
  const normalized = text.trim();

  // Prioritas 1: Format dengan prefix Rp / IDR (misal Rp 35.147 atau Rp35.147,00)
  const rpMatch = normalized.match(/(?:rp\.?|idr)\s*([\d.,]+)/i);
  if (rpMatch && rpMatch[1]) {
    const parsed = parseIndonesianNumber(rpMatch[1]);
    if (parsed && parsed >= 100) return parsed;
  }

  // Prioritas 2: Angka standalone berformat ribuan (misal 35.147 atau 35147)
  const numMatch = normalized.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d{4,9})\b/);
  if (numMatch && numMatch[1]) {
    const parsed = parseIndonesianNumber(numMatch[1]);
    if (parsed && parsed >= 100) return parsed;
  }

  return null;
}

function parseIndonesianNumber(raw: string): number | null {
  // Hapus desimal ,00 atau .00 di akhir
  const withoutDecimals = raw.replace(/[,.]\d{2}$/, "");
  // Hapus pemisah ribuan (. atau ,)
  const digitsOnly = withoutDecimals.replace(/[.,]/g, "");
  const num = Number(digitsOnly);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}
