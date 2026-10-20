import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";

import { useTheme } from "@/lib/theme/useTheme";

function tabIcon(name: AndroidSymbol) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <SymbolView name={{ android: name, web: name }} tintColor={color} size={size} />;
  };
}

export default function TabLayout() {
  const { colors, fontSize } = useTheme();
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
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: tabIcon("schedule") }} />
      <Tabs.Screen name="log" options={{ title: "Log", tabBarIcon: tabIcon("list") }} />
      <Tabs.Screen
        name="products"
        options={{ title: "Products", tabBarIcon: tabIcon("deployed_code") }}
      />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: tabIcon("settings") }} />
    </Tabs>
  );
}
