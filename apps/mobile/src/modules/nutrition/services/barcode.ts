// Strips spaces or separators from a read; the library stores digits only.
export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits === "" ? null : digits;
}
