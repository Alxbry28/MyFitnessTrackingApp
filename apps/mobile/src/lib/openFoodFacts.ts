import { parseOffResponse, type OffResult } from "@/modules/nutrition/services/offProduct";

export type OffLookup = OffResult | { kind: "offline" };

const FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity,product_quantity";
const USER_AGENT = "MyFitnessTrackingApp/1.0 (Android; github.com/Alxbry28/MyFitnessTrackingApp)";
const TIMEOUT_MS = 8000;

// Read-only lookup by barcode (API.md §2). One request per call, no retries, no key.
export async function fetchOffProduct(barcode: string): Promise<OffLookup> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
      { headers: { "User-Agent": USER_AGENT }, signal: controller.signal },
    );
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // A non-JSON body is handled by the parser as an error or a 404.
    }
    return parseOffResponse(response.status, body, barcode);
  } catch {
    // Abort (timeout) and network failures both mean "couldn't reach it".
    return { kind: "offline" };
  } finally {
    clearTimeout(timer);
  }
}
