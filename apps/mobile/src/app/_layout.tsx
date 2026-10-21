import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DatabaseErrorBoundary, StartupLoading } from "@/components/StartupStatus";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/db/client";
import { useTheme } from "@/lib/theme/useTheme";

export default function RootLayout() {
  const { colors } = useTheme();
  return (
    // Needed by swipe-to-delete on the Log rows (react-native-gesture-handler).
    <GestureHandlerRootView style={styles.root}>
      <DatabaseErrorBoundary>
        <Suspense fallback={<StartupLoading />}>
          <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded} useSuspense>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.surface },
                headerTintColor: colors.text,
                contentStyle: { backgroundColor: colors.bg },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
              <Stack.Screen name="add/index" options={{ title: "Add food" }} />
              <Stack.Screen name="add/[productId]" options={{ title: "Add to meal" }} />
              <Stack.Screen name="entry/[id]" options={{ title: "Edit entry", headerShown: false }} />
              <Stack.Screen name="scan" options={{ title: "Scan", presentation: "fullScreenModal" }} />
              <Stack.Screen name="lookup/[barcode]" options={{ title: "Check and save" }} />
              <Stack.Screen name="weight" options={{ title: "Log weight" }} />
              <Stack.Screen name="body-profile" options={{ title: "Body profile" }} />
              <Stack.Screen name="import-weight" options={{ title: "Import weight history" }} />
              <Stack.Screen name="paste-log" options={{ title: "Text log", headerShown: false }} />
              <Stack.Screen name="restore" options={{ title: "Restore backup" }} />
            </Stack>
          </SQLiteProvider>
        </Suspense>
        <StatusBar style="auto" />
      </DatabaseErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
