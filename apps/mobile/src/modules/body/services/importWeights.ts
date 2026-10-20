import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

import { MAX_CSV_BYTES } from "./weightCsv";

export type PickResult =
  | { kind: "canceled" }
  | { kind: "too_big" }
  | { kind: "ok"; name: string; text: string };

// Android reports CSV under several MIME types, so any file is accepted here and
// the parser rejects what isn't a weight CSV.
export async function pickWeightCsv(): Promise<PickResult> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled) return { kind: "canceled" };
  const asset = result.assets[0];
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size ?? 0) > MAX_CSV_BYTES) return { kind: "too_big" };
    return { kind: "ok", name: asset.name, text: await file.text() };
  } finally {
    // The cached copy holds health data; don't leave it behind.
    try {
      file.delete();
    } catch {
      // Already gone or not deletable; Android clears the cache eventually.
    }
  }
}
