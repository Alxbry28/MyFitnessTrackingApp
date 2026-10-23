import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, Vibration, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import * as productRepo from "@/modules/nutrition/repositories/productRepo";
import {
  isBarcodeInFrame,
  normalizeBarcode,
  SUPPORTED_BARCODE_TYPES,
  type Rect,
} from "@/modules/nutrition/services/barcode";

const PAUSE_AFTER_READ_MS = 2000;

// for=pantry comes from the Pantry tab's Add stock: every path ends on the add-stock screen.
function enterManually(pantry: boolean) {
  router.replace({ pathname: "/product/[id]", params: { id: "new", then: pantry ? "pantry" : "log" } });
}

export default function ScanScreen() {
  const { meal, for: target } = useLocalSearchParams<{ meal?: string; for?: string }>();
  const pantry = target === "pantry";
  const theme = useTheme();
  const styles = makeStyles(theme);
  const db = useSQLiteContext();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Blocks repeat reads of the same code while a lookup runs and briefly after it.
  const busy = useRef(false);
  const frameRectRef = useRef<Rect | null>(null);

  const onScanned = async (result: BarcodeScanningResult) => {
    if (busy.current) return;
    if (!isBarcodeInFrame(result, frameRectRef.current)) return;
    const barcode = normalizeBarcode(result.data);
    if (!barcode) return;
    busy.current = true;
    Vibration.vibrate(50);
    setError(null);
    try {
      const product = await productRepo.findByBarcode(db, barcode);
      if (product && pantry) {
        router.replace({ pathname: "/pantry/add/[productId]", params: { productId: product.id } });
      } else if (pantry) {
        router.replace({ pathname: "/lookup/[barcode]", params: { barcode, for: "pantry" } });
      } else if (product) {
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
      <Pressable
        onPress={() => router.replace(pantry ? { pathname: "/add", params: { for: "pantry" } } : "/add")}
        accessibilityRole="button"
        style={styles.secondary}
      >
        <Text style={styles.secondaryLabel}>Search products</Text>
      </Pressable>
      <Pressable onPress={() => enterManually(pantry)} accessibilityRole="button" style={styles.secondary}>
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
        barcodeScannerSettings={{ barcodeTypes: SUPPORTED_BARCODE_TYPES }}
        onBarcodeScanned={(result) => void onScanned(result)}
      />
      <View style={styles.overlay} pointerEvents="box-none">
        <Text style={styles.hint}>Point at a barcode</Text>
        <View
          style={styles.frame}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          onLayout={(e) => {
            frameRectRef.current = e.nativeEvent.layout;
          }}
        />
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
          <Pressable onPress={() => enterManually(pantry)} accessibilityRole="button" style={styles.secondary}>
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
