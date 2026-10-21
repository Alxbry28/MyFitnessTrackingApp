import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { router, Tabs } from "expo-router";
import { Pressable, Text, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme/useTheme";

// pantry.html .tab svg is 22 dp; the navigator would otherwise pass 25.
const ICON_SIZE = 22;

function tabIcon(name: AndroidSymbol) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={{ android: name, web: name }} tintColor={color} size={ICON_SIZE} />;
  };
}

export default function TabLayout() {
  const { colors, fontSize, space, tap } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accentText,
        tabBarInactiveTintColor: colors.muted,
        // pantry.html .tabbar is 64 dp of tabs. The bar pads itself by the bottom inset, so the
        // height includes it; otherwise three-button navigation squeezes the tabs.
        tabBarStyle: {
          height: 64 + insets.bottom,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        // Only the active tab is 600 (pantry.html .tab.on).
        tabBarLabel: ({ focused, color, children }) => (
          <Text style={{ color, fontSize: fontSize.xs, fontWeight: focused ? "600" : "400" }}>{children}</Text>
        ),
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
