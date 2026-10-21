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
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        // pantry.html .tabbar: 64 dp, xs labels; the active one is accentText 600.
        tabBarStyle: { height: 64, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", headerShown: false, tabBarIcon: tabIcon("schedule") }} />
      <Tabs.Screen name="log" options={{ title: "Log", headerShown: false, tabBarIcon: tabIcon("list") }} />
      <Tabs.Screen name="pantry" options={{ title: "Pantry", headerShown: false, tabBarIcon: tabIcon("kitchen") }} />
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
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: tabIcon("more_horiz") }} />
      {/* prototypes/pantry.html moves these under More; href: null keeps them as tabs-area screens off the bar. */}
      <Tabs.Screen name="products" options={{ title: "Products", href: null }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", href: null }} />
    </Tabs>
  );
}
