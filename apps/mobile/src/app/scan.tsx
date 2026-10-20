import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, Vibration, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import { normalizeBarcode } from "@/modules/nutrition/services/barcode";

const PAUSE_AFTER_READ_MS = 2000;

function enterManually() {
  router.replace({ pathname: "/product/[id]", params: { id: "new", then: "log" } });
}

export default function ScanScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Blocks repeat reads of the same code while a lookup runs and briefly after it.
  const busy = useRef(false);

  const onScanned = async ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    const barcode = normalizeBarcode(data);
    if (!barcode) return;
    busy.current = true;
    Vibration.vibrate(50);
    setError(null);
    try {
      const product = await productRepo.findByBarcode(db, barcode);
      if (product) {
        router.replace({
          pathname: "/add/[productId]",
          params: meal ? { productId: product.id, meal } : { productId: product.id },
        });
      } else {
        router.replace({ pathname: "/lookup/[barcode]", params: { barcode } });
      }
    } catch {
      setError("Couldn't check your library. Try again.");
      setTimeout(() => {
        busy.current = false;
      }, PAUSE_AFTER_READ_MS);
    }
  };

  const fallbacks = (
    <View style={styles.actions}>
      <Pressable onPress={() => router.replace("/add")} accessibilityRole="button" style={styles.secondary}>
        <Text style={styles.secondaryLabel}>Search products</Text>
      </Pressable>
      <Pressable onPress={enterManually} accessibilityRole="button" style={styles.secondary}>
        <Text style={styles.secondaryLabel}>Enter manually</Text>
      </Pressable>
    </View>
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Checking camera permission" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access is off</Text>
        <Text style={styles.body}>
          The scanner needs the camera to read barcodes. You can still search your products or add one by hand.
        </Text>
        {permission.canAskAgain ? (
          <Pressable onPress={() => void requestPermission()} accessibilityRole="button" style={styles.primary}>
            <Text style={styles.primaryLabel}>Allow camera</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" style={styles.primary}>
            <Text style={styles.primaryLabel}>Open settings</Text>
          </Pressable>
        )}
        {fallbacks}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e"] }}
        onBarcodeScanned={(result) => void onScanned(result)}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>Point at a barcode</Text>
        <View style={styles.frame} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        {error && (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
        <View style={styles.actions}>
          <Pressable
            onPress={() => setTorch((on) => !on)}
            accessibilityRole="button"
            accessibilityState={{ checked: torch }}
            style={styles.secondary}
          >
            <Text style={styles.secondaryLabel}>{torch ? "Torch off" : "Torch on"}</Text>
          </Pressable>
          <Pressable onPress={enterManually} accessibilityRole="button" style={styles.secondary}>
            <Text style={styles.secondaryLabel}>Enter manually</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#000" },
    overlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[5], padding: space[5] },
    hint: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
    frame: { width: "85%", aspectRatio: 1.8, borderWidth: 2, borderColor: colors.accent, borderRadius: radius.md },
    error: {
      color: "#fff",
      fontSize: fontSize.sm,
      backgroundColor: colors.over,
      paddingHorizontal: space[3],
      paddingVertical: space[2],
      borderRadius: radius.sm,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space[4], padding: space[5], backgroundColor: colors.bg },
    title: { color: colors.text, fontSize: fontSize.lg, fontWeight: "700", textAlign: "center" },
    body: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
    actions: { flexDirection: "row", gap: space[3] },
    primary: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[5],
      borderRadius: radius.md,
      backgroundColor: colors.accent,
    },
    primaryLabel: { color: colors.accentInk, fontSize: fontSize.md, fontWeight: "700" },
    secondary: {
      minHeight: tap,
      justifyContent: "center",
      paddingHorizontal: space[4],
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
    },
    secondaryLabel: { color: colors.text, fontSize: fontSize.md, fontWeight: "600" },
  });
}
