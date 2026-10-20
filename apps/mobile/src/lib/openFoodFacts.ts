import {
  parseOffResponse,
  parseOffSearch,
  type OffResult,
  type OffSearchResult,
} from "@/modules/nutrition/services/offProduct";

export type OffLookup = OffResult | { kind: "offline" };
export type OffSearch = OffSearchResult | { kind: "offline" };

const FIELDS = "code,product_name,brands,nutriments,serving_size,serving_quantity,product_quantity";
const USER_AGENT = "MyFitnessTrackingApp/1.0 (Android; github.com/Alxbry28/MyFitnessTrackingApp)";
const TIMEOUT_MS = 8000;

// One GET with a timeout; a non-JSON body comes back as null for the parser to reject.
async function getJson(url: string): Promise<{ status: number; body: unknown } | { kind: "offline" }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // Left null: the parser treats it as an error or a 404.
    }
    return { status: response.status, body };
  } catch {
    // Abort (timeout) and network failures both mean "couldn't reach it".
    return { kind: "offline" };
  } finally {
    clearTimeout(timer);
  }
}

// Read-only lookup by barcode (API.md §2). One request per call, no retries, no key.
export async function fetchOffProduct(barcode: string): Promise<OffLookup> {
  const result = await getJson(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
  );
  return "kind" in result ? result : parseOffResponse(result.status, result.body, barcode);
}

// Full-text name search. Only sent when the user taps the search button, never while
// typing, so it stays far below Open Food Facts' search rate limit.
export async function searchOffProducts(name: string): Promise<OffSearch> {
  const params = `search_terms=${encodeURIComponent(name.trim())}&search_simple=1&action=process&json=1&page_size=10`;
  const result = await getJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}&fields=${FIELDS}`);
  return "kind" in result ? result : parseOffSearch(result.status, result.body);
}
