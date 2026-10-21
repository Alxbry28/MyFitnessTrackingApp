import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { router, Tabs } from "expo-router";
import { Pressable, Text, type ColorValue } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";

function tabIcon(name: AndroidSymbol) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={{ android: name, web: name }} tintColor={color} size={size} />;
  };
}

export default function TabLayout() {
  const { colors, fontSize, space, tap } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: fontSize.sm, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", headerShown: false, tabBarIcon: tabIcon("schedule") }} />
      <Tabs.Screen name="log" options={{ title: "Log", tabBarIcon: tabIcon("list") }} />
      <Tabs.Screen
        name="products"
        options={{ title: "Products", tabBarIcon: tabIcon("deployed_code") }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "Progress",
          tabBarIcon: tabIcon("monitor_weight"),
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/weight")}
              accessibilityRole="button"
              style={{ minHeight: tap, justifyContent: "center", paddingHorizontal: space[4] }}
            >
              <Text style={{ color: colors.accentText, fontSize: fontSize.md, fontWeight: "600" }}>+ Log weight</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon("settings") }} />
    </Tabs>
  );
}
