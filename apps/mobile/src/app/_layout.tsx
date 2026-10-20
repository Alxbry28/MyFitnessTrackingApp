import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { Suspense } from "react";

import { DatabaseErrorBoundary, StartupLoading } from "@/components/StartupStatus";
import { DATABASE_NAME, migrateDbIfNeeded } from "@/db/client";
import { useTheme } from "@/lib/theme/useTheme";

export default function RootLayout() {
  const { colors } = useTheme();
  return (
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
          </Stack>
        </SQLiteProvider>
      </Suspense>
      <StatusBar style="auto" />
    </DatabaseErrorBoundary>
  );
}
