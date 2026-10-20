import { useEffect, useState } from "react";

import { fetchOffProduct, type OffLookup } from "@/lib/openFoodFacts";

// Looks a barcode up once per mount; a result after unmount is dropped.
export function useOffLookup(barcode: string): OffLookup | null {
  const [result, setResult] = useState<OffLookup | null>(null);

  useEffect(() => {
    let active = true;
    void fetchOffProduct(barcode).then((r) => {
      if (active) setResult(r);
    });
    return () => {
      active = false;
    };
  }, [barcode]);

  return result;
}
