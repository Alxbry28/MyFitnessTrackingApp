import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { SymbolView } from "expo-symbols";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { isBarcodeInFrame, normalizeBarcode, SUPPORTED_BARCODE_TYPES, type Rect } from "../services/barcode";

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
};

export function BarcodeScanModal({ visible, onClose, onScanned }: Props) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const busy = useRef(false);
  const frameRectRef = useRef<Rect | null>(null);
  const targetAreaPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const framePos = useRef<Rect | null>(null);

  const updateFrameLayout = () => {
    if (framePos.current) {
      frameRectRef.current = {
        x: targetAreaPos.current.x + framePos.current.x,
        y: targetAreaPos.current.y + framePos.current.y,
        width: framePos.current.width,
        height: framePos.current.height,
      };
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (busy.current) return;
    if (!isBarcodeInFrame(result, frameRectRef.current)) return;
    const barcode = normalizeBarcode(result.data);
    if (!barcode) return;
    busy.current = true;
    Vibration.vibrate(50);
    onScanned(barcode);
    onClose();
    setTimeout(() => {
      busy.current = false;
    }, 1000);
  };

  if (!visible) return null;

  let content;
  if (!permission) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Checking camera permission" />
      </View>
    );
  } else if (!permission.granted) {
    content = (
      <View style={[styles.center, { padding: theme.space[5] }]}>
        <Text style={styles.title}>Camera access is off</Text>
        <Text style={styles.body}>The scanner needs the camera to read barcodes.</Text>
        <View style={styles.btnRow}>
          {permission.canAskAgain ? (
            <Pressable onPress={() => void requestPermission()} accessibilityRole="button" style={styles.primaryBtn}>
              <Text style={styles.primaryBtnLabel}>Allow camera</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => void Linking.openSettings()} accessibilityRole="button" style={styles.primaryBtn}>
              <Text style={styles.primaryBtnLabel}>Open settings</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancelBtn}>
            <Text style={styles.cancelBtnLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  } else {
    content = (
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: SUPPORTED_BARCODE_TYPES }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={[styles.overlay, { paddingTop: insets.top + theme.space[3], paddingBottom: insets.bottom + theme.space[5] }]} pointerEvents="box-none">
          <View style={styles.topBar}>
            <Pressable onPress={onClose} accessibilityRole="button" style={styles.roundBtn}>
              <SymbolView name={{ android: "close", web: "close" }} tintColor="#ffffff" size={22} />
            </Pressable>
            <Pressable onPress={() => setTorch((t) => !t)} accessibilityRole="button" style={[styles.roundBtn, torch && styles.roundBtnActive]}>
              <SymbolView name={{ android: "flash_on", web: "flash_on" }} tintColor={torch ? theme.colors.accentInk : "#ffffff"} size={22} />
            </Pressable>
          </View>

          <View
            style={styles.targetArea}
            pointerEvents="none"
            onLayout={(e) => {
              targetAreaPos.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y };
              updateFrameLayout();
            }}
          >
            <Text style={styles.hint}>Point at a barcode</Text>
            <View
              style={styles.frame}
              onLayout={(e) => {
                framePos.current = e.nativeEvent.layout;
                updateFrameLayout();
              }}
            />
          </View>

          <Pressable onPress={onClose} accessibilityRole="button" style={styles.cancelBottomBtn}>
            <Text style={styles.cancelBottomBtnLabel}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalScreen}>{content}</View>
    </Modal>
  );
}

function makeStyles(theme: Theme) {
  const { colors, space, fontSize, radius, tap } = theme;
  return StyleSheet.create({
    modalScreen: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    cameraWrap: {
      flex: 1,
      backgroundColor: "#050505",
    },
    overlay: {
      flex: 1,
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: space[4],
    },
    topBar: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    roundBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: "rgba(0, 0, 0, 0.55)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.15)",
    },
    roundBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    targetArea: {
      alignItems: "center",
      gap: space[3],
    },
    hint: {
      color: "#ffffff",
      fontSize: fontSize.md,
      fontWeight: "600",
      textShadowColor: "rgba(0,0,0,0.8)",
      textShadowRadius: 6,
    },
    frame: {
      width: 260,
      height: 140,
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.accent,
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    cancelBottomBtn: {
      minHeight: tap,
      paddingHorizontal: space[6],
      justifyContent: "center",
      alignItems: "center",
      borderRadius: radius.md,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.2)",
    },
    cancelBottomBtnLabel: {
      color: "#ffffff",
      fontSize: fontSize.md,
      fontWeight: "600",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: space[3],
    },
    title: {
      color: colors.text,
      fontSize: fontSize.lg,
      fontWeight: "700",
      textAlign: "center",
    },
    body: {
      color: colors.muted,
      fontSize: fontSize.md,
      textAlign: "center",
      lineHeight: 22,
    },
    btnRow: {
      width: "100%",
      gap: space[2],
      marginTop: space[3],
    },
    primaryBtn: {
      minHeight: tap,
      borderRadius: radius.md,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtnLabel: {
      color: colors.accentInk,
      fontSize: fontSize.md,
      fontWeight: "700",
    },
    cancelBtn: {
      minHeight: tap,
      borderRadius: radius.md,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelBtnLabel: {
      color: colors.text,
      fontSize: fontSize.md,
      fontWeight: "600",
    },
  });
}
