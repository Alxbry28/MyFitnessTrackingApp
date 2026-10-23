import type { BarcodeScanningResult, BarcodeType } from "expo-camera";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * All barcode formats supported by Expo Camera and MLKit.
 * Covers grocery retail (EAN/UPC), supplements, pharmaceuticals, warehouse,
 * and 2D barcodes (Code 128, Code 39, Code 93, ITF-14, Codabar, QR, DataMatrix, PDF417, Aztec).
 */
export const SUPPORTED_BARCODE_TYPES: BarcodeType[] = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "code93",
  "itf14",
  "codabar",
  "qr",
  "datamatrix",
  "pdf417",
  "aztec",
];

// Strips extra whitespace while preserving alphanumeric barcode formats (Code 128, Code 39, QR, etc.)
export function normalizeBarcode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/\s+/g, "");
  return cleaned === "" ? null : cleaned;
}

/**
 * Checks whether the detected barcode falls within the viewfinder frame.
 * Calculates the barcode's center point from `cornerPoints` (which Expo Camera
 * transforms into view coordinates on Android) with a fallback to `bounds`.
 */
export function isBarcodeInFrame(
  result: Pick<BarcodeScanningResult, "data"> & {
    cornerPoints?: { x: number; y: number }[];
    bounds?: {
      origin?: { x: number; y: number };
      size?: { width: number; height: number };
    };
  },
  frame: Rect | null
): boolean {
  if (!frame) return false;

  const points = result.cornerPoints;
  let cx: number | null = null;
  let cy: number | null = null;

  if (points && points.length > 0) {
    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    cx = sumX / points.length;
    cy = sumY / points.length;
  } else if (result.bounds?.origin && result.bounds?.size) {
    cx = result.bounds.origin.x + result.bounds.size.width / 2;
    cy = result.bounds.origin.y + result.bounds.size.height / 2;
  }

  if (cx === null || cy === null) {
    return false;
  }

  return (
    cx >= frame.x &&
    cx <= frame.x + frame.width &&
    cy >= frame.y &&
    cy <= frame.y + frame.height
  );
}
