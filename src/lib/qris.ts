/**
 * Utility standar EMVCo / QRIS Indonesia untuk mengubah QRIS Statis
 * (GoPay Merchant / GoBiz / bank lain) menjadi QRIS Dinamis dengan nominal otomatis,
 * serta parser nominal dari notifikasi GoPay Merchant Android.
 */

interface TlvEntry {
  tag: string;
  value: string;
}

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

function parseEmvTlv(payload: string): TlvEntry[] | null {
  const entries: TlvEntry[] = [];
  let idx = 0;

  while (idx < payload.length) {
    if (idx + 4 > payload.length) return null;
    const tag = payload.slice(idx, idx + 2);
    const lenStr = payload.slice(idx + 2, idx + 4);
    if (!/^\d{2}$/.test(lenStr)) return null;
    const len = Number(lenStr);
    const valStart = idx + 4;
    const valEnd = valStart + len;
    if (valEnd > payload.length) return null;

    entries.push({ tag, value: payload.slice(valStart, valEnd) });
    idx = valEnd;
  }

  return entries;
}

function serializeEmvTlv(entries: TlvEntry[]): string {
  return entries
    .map(
      ({ tag, value }) =>
        `${tag}${String(value.length).padStart(2, "0")}${value}`
    )
    .join("");
}

/**
 * Mengubah string QRIS statis menjadi QRIS dinamis dengan nominal tertentu (Rupiah bulat).
 * Mempertahankan spasi asli di nama merchant (tag 59) dan kota (tag 60) sesuai panjang TLV.
 */
export function convertStaticToDynamicQris(
  staticQris: string,
  amount: number
): string | null {
  // PENTING: Hanya hapus newline/CR, JANGAN hapus spasi di dalam nama merchant / kota!
  const cleaned = staticQris.replace(/[\r\n]+/g, "").trim();
  if (!cleaned || !cleaned.startsWith("000201")) {
    return null;
  }

  const parsed = parseEmvTlv(cleaned);
  if (!parsed || parsed.length === 0) {
    return null;
  }

  const hasCountryId = parsed.some((e) => e.tag === "58" && e.value === "ID");
  if (!hasCountryId) {
    return null;
  }

  const amountStr = String(Math.max(1, Math.round(amount)));
  const rebuilt: TlvEntry[] = [];
  let insertedAmount = false;

  for (const entry of parsed) {
    // Skip CRC lama (tag 63) dan nominal lama (tag 54)
    if (entry.tag === "63" || entry.tag === "54") {
      continue;
    }

    // Ubah Point of Initiation Method dari Statis ("11") -> Dinamis ("12")
    if (entry.tag === "01" && entry.value === "11") {
      rebuilt.push({ tag: "01", value: "12" });
      continue;
    }

    // Sisipkan tag 54 (Transaction Amount) tepat sebelum tag 58 (Country Code)
    if (entry.tag === "58" && !insertedAmount) {
      rebuilt.push({ tag: "54", value: amountStr });
      insertedAmount = true;
    }

    rebuilt.push(entry);
  }

  if (!insertedAmount) {
    return null;
  }

  const bodyWithoutCrc = serializeEmvTlv(rebuilt) + "6304";
  const crc = crc16CcittFalse(bodyWithoutCrc);
  return bodyWithoutCrc + crc;
}

/**
 * Ekstrak nominal Rupiah dari teks notifikasi GoPay Merchant / GoBiz Android.
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
  const withoutDecimals = raw.replace(/[,.]\d{2}$/, "");
  const digitsOnly = withoutDecimals.replace(/[.,]/g, "");
  const num = Number(digitsOnly);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null;
}
