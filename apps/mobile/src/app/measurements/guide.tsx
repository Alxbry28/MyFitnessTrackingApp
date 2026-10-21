import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Text as SvgText,
} from "react-native-svg";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { measurementRepo } from "@/modules/body/repositories/measurementRepo";
import { DEFAULT_TRACKED_SITE_KEYS } from "@/modules/body/services/measurementCalc";

type SiteKey =
  | "neck"
  | "shoulders"
  | "chest"
  | "arm"
  | "forearm"
  | "waist"
  | "hips"
  | "thigh"
  | "calf";

interface GuideSite {
  id: number;
  key: SiteKey;
  name: string;
  sideText?: string;
  pinX: number;
  pinY: number;
  defaultState: "flexed" | "relaxed";
  stateLabel: string;
  howSteps: string[];
  mistakes: string[];
  landmarkTip: string;
}

const GUIDE_SITES: GuideSite[] = [
  {
    id: 1,
    key: "neck",
    name: "Neck",
    pinX: 74,
    pinY: 39,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Stand tall and look straight ahead.",
      "Wrap the tape just below the Adam's apple / thyroid cartilage.",
      "Keep the tape snug and level all around. Read after a normal breath.",
    ],
    mistakes: [
      "Tilting your head up or down while measuring",
      "Pulling tape too tight so it compresses the throat",
    ],
    landmarkTip: "Just below the Adam's apple, looking straight ahead.",
  },
  {
    id: 2,
    key: "shoulders",
    name: "Shoulders",
    pinX: 103,
    pinY: 53,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Stand upright with arms relaxed down at your sides.",
      "Wrap tape around the widest point across both shoulders (deltoids).",
      "Best done in front of a mirror or with help to keep the tape level at the back.",
    ],
    mistakes: [
      "Shrugging or tensing your shoulder traps",
      "Tape slanting down across the back",
    ],
    landmarkTip: "Widest curve around both shoulders, arms relaxed down.",
  },
  {
    id: 3,
    key: "chest",
    name: "Chest",
    pinX: 94,
    pinY: 68,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Wrap the tape across your nipples, with arms hanging relaxed at your sides.",
      "Check in a mirror to ensure the tape is level around your back and shoulder blades.",
      "Take a normal breath out, pause, then read the measurement in cm.",
    ],
    mistakes: [
      "Puffing up your chest or inhaling deeply before reading",
      "Tape dropping lower at the back below the shoulder blades",
    ],
    landmarkTip: "Across the center of the nipples, level around the back.",
  },
  {
    id: 4,
    key: "arm",
    name: "Upper arm",
    sideText: "L/R",
    pinX: 9,
    pinY: 80,
    defaultState: "flexed",
    stateLabel: "flexed · recommended",
    howSteps: [
      "Raise your arm to shoulder height and flex, curling fist toward your shoulder.",
      "Find the biceps peak: the widest circumference of the upper arm.",
      "Wrap tape around the peak and across the triceps, keeping it level.",
      "Read in cm. Measure right arm first, then left arm.",
    ],
    mistakes: [
      "Tape slanted toward the elbow",
      "Flexed one session, relaxed the next",
      "Pulling tape so tight it digs into muscle tissue",
    ],
    landmarkTip: "Measure distance from elbow crease to tape once (e.g. 12 cm) and reuse it every session.",
  },
  {
    id: 5,
    key: "forearm",
    name: "Forearm",
    sideText: "L/R",
    pinX: 8,
    pinY: 104,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Extend your arm forward with elbow straight and fist relaxed (not clenched).",
      "Wrap tape around the thickest part of the forearm, usually 3–5 cm below the elbow crease.",
      "Read in cm. Right forearm first, then left.",
    ],
    mistakes: [
      "Clenching fist tightly (artificially expands forearm)",
      "Measuring too close to the wrist",
    ],
    landmarkTip: "Widest point below the elbow crease, arm straight.",
  },
  {
    id: 6,
    key: "waist",
    name: "Waist",
    pinX: 92,
    pinY: 108,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Stand tall and relaxed with feet hip-width apart.",
      "Place tape directly across your navel (belly button).",
      "Ensure tape is horizontal around your lower back.",
      "Breathe out normally, then read in cm without sucking in.",
    ],
    mistakes: [
      "Sucking in your stomach",
      "Measuring at narrowest waist one time and navel the next",
      "Measuring right after a heavy meal or large drink",
    ],
    landmarkTip: "Center of the navel (used for waist-to-height ratio calculation).",
  },
  {
    id: 7,
    key: "hips",
    name: "Hips",
    pinX: 92,
    pinY: 136,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Stand upright with feet together (heels touching).",
      "Wrap tape around the widest part of your buttocks/glutes.",
      "Check in a side mirror to make sure tape is level horizontally.",
      "Read snug against the skin.",
    ],
    mistakes: [
      "Standing with feet wide apart",
      "Tape tilted higher or lower at the back",
    ],
    landmarkTip: "Widest point of the buttocks with heels together.",
  },
  {
    id: 8,
    key: "thigh",
    name: "Thigh",
    sideText: "L/R",
    pinX: 33,
    pinY: 176,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Stand with weight distributed evenly on both feet.",
      "Wrap tape around the widest part of upper thigh, just below the buttocks.",
      "Measure relaxed, standing tall. Right thigh first, then left.",
    ],
    mistakes: [
      "Tensing the leg one session, relaxed the next",
      "Shifting body weight onto the measured leg",
    ],
    landmarkTip: "Measure distance above top of kneecap once (e.g. 18 cm) to always hit the same spot.",
  },
  {
    id: 9,
    key: "calf",
    name: "Calf",
    sideText: "L/R",
    pinX: 34,
    pinY: 222,
    defaultState: "relaxed",
    stateLabel: "relaxed · standard",
    howSteps: [
      "Stand upright with weight balanced evenly on both feet.",
      "Wrap tape around the widest point of the calf muscle.",
      "Keep tape horizontal and read in cm.",
    ],
    mistakes: [
      "Standing on tiptoe or flexing calf",
      "Measuring while sitting down",
    ],
    landmarkTip: "Widest point below the back of the knee.",
  },
];

export default function MeasureGuideScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();

  const [trackedKeys, setTrackedKeys] = useState<string[]>(DEFAULT_TRACKED_SITE_KEYS);
  const [selectedSite, setSelectedSite] = useState<GuideSite | null>(null);

  useEffect(() => {
    let active = true;
    void measurementRepo.getTrackedSites(db).then((keys) => {
      if (active) setTrackedKeys(keys);
    });
    return () => {
      active = false;
    };
  }, [db]);

  const isSiteTracked = (key: SiteKey): boolean => {
    if (key === "arm") {
      return trackedKeys.includes("arm_left") || trackedKeys.includes("arm_right");
    }
    if (key === "thigh") {
      return trackedKeys.includes("thigh_left") || trackedKeys.includes("thigh_right");
    }
    if (key === "forearm") {
      return trackedKeys.includes("forearm_left") || trackedKeys.includes("forearm_right");
    }
    if (key === "calf") {
      return trackedKeys.includes("calf_left") || trackedKeys.includes("calf_right");
    }
    return trackedKeys.includes(key);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* App Bar */}
      <View style={styles.appbar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>‹ Measurements</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.appbarTitle}>How to Measure</Text>
          <Text style={styles.appbarSub}>2 min read</Text>
        </View>
        <Pressable
          onPress={() => router.push("/measurements/sites" as any)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.headerActionBtn}
        >
          <Text style={styles.headerActionText}>Sites</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Frame 1: Body Map & Site List */}
        <View style={styles.mapCard}>
          <View style={styles.mapRow}>
            {/* SVG Silhouette with pins */}
            <View style={styles.svgContainer}>
              <Svg viewBox="0 0 120 260" width={116} height={252}>
                {/* Head */}
                <Circle cx="60" cy="20" r="13" fill={theme.colors.surface2} stroke={theme.colors.muted} strokeWidth={1.6} />
                {/* Body Silhouette */}
                <Path
                  d="M53 32 v9 L32 48 Q24 51 22 60 L15 120 L23 122 L32 72 L34 118 Q32 134 36 146 L41 252 L56 252 L58 160 L62 160 L64 252 L79 252 L84 146 Q88 134 86 118 L88 72 L97 122 L105 120 L98 60 Q96 51 88 48 L67 41 v-9 Z"
                  fill={theme.colors.surface2}
                  stroke={theme.colors.muted}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Tape Lines */}
                <Path d="M53 39 h14" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M24 53 h72" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M33 68 h54" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M19 80 h12" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M16 104 h11" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M35 108 h50" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M35 136 h50" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M41 176 h16" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                <Path d="M42 222 h14" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />

                {/* Number Pins */}
                {GUIDE_SITES.map((site) => {
                  const tracked = isSiteTracked(site.key);
                  return (
                    <G
                      key={site.id}
                      onPress={() => setSelectedSite(site)}
                    >
                      <Circle
                        cx={site.pinX}
                        cy={site.pinY}
                        r={6.5}
                        fill={tracked ? theme.colors.accent : theme.colors.surface2}
                        stroke={tracked ? theme.colors.accentInk : theme.colors.faint}
                        strokeWidth={0.8}
                      />
                      <SvgText
                        x={site.pinX}
                        y={site.pinY + 3.2}
                        fill={tracked ? theme.colors.accentInk : theme.colors.muted}
                        fontSize={8.5}
                        fontWeight="700"
                        textAnchor="middle"
                      >
                        {site.id}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>

            {/* Site List */}
            <View style={styles.siteListCol}>
              {GUIDE_SITES.map((site) => {
                const tracked = isSiteTracked(site.key);
                return (
                  <Pressable
                    key={site.id}
                    onPress={() => setSelectedSite(site)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.siteItemRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.siteBadgeNumber,
                        tracked ? styles.badgeOn : styles.badgeOff,
                      ]}
                    >
                      <Text
                        style={[
                          styles.siteBadgeText,
                          tracked ? styles.badgeTextOn : styles.badgeTextOff,
                        ]}
                      >
                        {site.id}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.siteItemName,
                        !tracked && styles.siteItemNameOff,
                      ]}
                    >
                      {site.name}
                    </Text>
                    {site.sideText && (
                      <Text style={styles.sideLabel}>{site.sideText}</Text>
                    )}
                    {!tracked && <Text style={styles.offLabel}>off</Text>}
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => router.push("/measurements/sites" as any)}
                accessibilityRole="button"
                style={styles.chooseSitesLink}
              >
                <Text style={styles.chooseSitesText}>Customize sites ›</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Before You Start Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>BEFORE YOU START</Text>
          <View style={styles.tickList}>
            <View style={styles.tickRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tickText}>
                <Text style={styles.bold}>Soft tape measure</Text> ({"tailor's tape"}, cm side), not a stiff metal tape.
              </Text>
            </View>
            <View style={styles.tickRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tickText}>
                <Text style={styles.bold}>Morning timing:</Text> after using the bathroom, before eating, drinking, or training.
              </Text>
            </View>
            <View style={styles.tickRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tickText}>
                <Text style={styles.bold}>Mirror check:</Text> measure in front of a mirror to ensure tape is level all the way around.
              </Text>
            </View>
            <View style={styles.tickRow}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.tickText}>
                <Text style={styles.bold}>Natural posture:</Text> relaxed and standing tall, feet hip-width apart.
              </Text>
            </View>
          </View>
        </View>

        {/* Golden Rules Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>GOLDEN RULES</Text>
          <View style={styles.stepList}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.bold}>Same time, same spot, same tape</Text> every session.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.bold}>Tape snug and level:</Text> flat against skin without pressing into or indenting tissue.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.bold}>Measure twice:</Text> if the two differ, average them for your final entry.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.bold}>Every 2–4 weeks is ideal:</Text> weekly numbers are mostly hydration noise. Muscle grows slowly.
              </Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.bold}>Flexed vs Relaxed:</Text> for arms, pick flexed (recommended) or relaxed once and never switch.
              </Text>
            </View>
          </View>
        </View>

        {/* Reading Your Progress Results Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>READING YOUR RESULTS</Text>
          <View style={styles.resultItem}>
            <Text style={styles.resultRule}>Waist ↓, arms/chest ↑ or same</Text>
            <Text style={styles.resultDesc}>Losing body fat while preserving or building muscle 👍</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultRule}>Waist ↓, arms/chest ↓ rapidly</Text>
            <Text style={styles.resultDesc}>Weight dropping too fast; check your daily protein intake and calorie deficit.</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultRule}>Changes under ~0.5 cm</Text>
            <Text style={styles.resultDesc}>Measuring variance and water retention. Look at trends over 2–3 sessions.</Text>
          </View>
          <View style={[styles.resultItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.resultRule}>Left & Right differ by 0.5–1 cm</Text>
            <Text style={styles.resultDesc}>Completely normal bilateral difference. Consistent tracking will reveal genuine asymmetry changes.</Text>
          </View>
        </View>

        {/* Primary Action Button */}
        <Pressable
          onPress={() => router.push("/measurements/log" as any)}
          accessibilityRole="button"
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Log measurements</Text>
        </Pressable>
      </ScrollView>

      {/* Frame 2: Site Detail Inspector Sheet */}
      {selectedSite && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedSite(null)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => setSelectedSite(null)}
            />
            <View style={[styles.sheetContainer, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.sheetGrabber} />

              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>{selectedSite.name}</Text>
                  <Text style={styles.sheetBadge}>{selectedSite.stateLabel}</Text>
                </View>
                <Pressable
                  onPress={() => setSelectedSite(null)}
                  accessibilityRole="button"
                  hitSlop={12}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetScroll}
              >
                {/* Anatomical Diagram */}
                <View style={styles.diagramCard}>
                  {selectedSite.key === "arm" ? (
                    <Svg viewBox="0 0 200 150" width={220} height={140}>
                      {/* Flexed arm outline */}
                      <Path
                        d="M8 128 Q14 100 52 94 Q78 72 104 82 Q118 88 126 96 L138 46 Q140 30 154 31 Q168 33 166 50 L156 108 Q152 130 128 132 Q90 136 56 138 Q20 142 8 128 Z"
                        fill={theme.colors.surface2}
                        stroke={theme.colors.muted}
                        strokeWidth={1.6}
                      />
                      {/* Elbow crease line */}
                      <Path d="M126 96 Q132 112 132 130" stroke={theme.colors.faint} strokeWidth={1.2} strokeDasharray="3 3" />
                      {/* Tape wrap back and front */}
                      <Path d="M80 80 Q66 108 82 136" stroke={theme.colors.accent} strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />
                      <Path d="M80 80 Q94 108 82 136" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                      {/* Landmark line */}
                      <Line x1="84" y1="144" x2="130" y2="144" stroke={theme.colors.text} strokeWidth={1.2} />
                      <Line x1="84" y1="140" x2="84" y2="148" stroke={theme.colors.text} strokeWidth={1.2} />
                      <Line x1="130" y1="140" x2="130" y2="148" stroke={theme.colors.text} strokeWidth={1.2} />
                      <SvgText x="107" y="141" fill={theme.colors.text} fontSize={10} fontWeight="600" textAnchor="middle">
                        ~12 cm
                      </SvgText>
                      <SvgText x="138" y="146" fill={theme.colors.muted} fontSize={9} textAnchor="start">
                        elbow crease
                      </SvgText>
                    </Svg>
                  ) : selectedSite.key === "waist" ? (
                    <Svg viewBox="0 0 160 150" width={180} height={140}>
                      {/* Torso outline */}
                      <Path
                        d="M40 6 Q80 0 120 6 Q130 40 124 70 Q120 92 126 118 L128 146 L32 146 L34 118 Q40 92 36 70 Q30 40 40 6 Z"
                        fill={theme.colors.surface2}
                        stroke={theme.colors.muted}
                        strokeWidth={1.6}
                      />
                      {/* Ribs guide */}
                      <Path d="M50 52 Q80 62 110 52" stroke={theme.colors.faint} strokeWidth={1} strokeDasharray="3 3" />
                      <SvgText x="80" y="44" fill={theme.colors.faint} fontSize={8} textAnchor="middle">
                        ribcage
                      </SvgText>
                      {/* Tape wrap at navel */}
                      <Path d="M38 84 Q80 74 122 84" stroke={theme.colors.accent} strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />
                      <Path d="M38 84 Q80 96 122 84" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                      {/* Navel circle */}
                      <Circle cx="80" cy="90" r="2.8" fill={theme.colors.text} />
                      <SvgText x="80" y="106" fill={theme.colors.text} fontSize={9} fontWeight="600" textAnchor="middle">
                        navel
                      </SvgText>
                    </Svg>
                  ) : selectedSite.key === "chest" ? (
                    <Svg viewBox="0 0 160 150" width={180} height={140}>
                      {/* Chest / Torso outline */}
                      <Path
                        d="M32 16 Q80 6 128 16 Q138 46 132 80 Q124 110 126 146 L34 146 Q36 110 28 80 Q22 46 32 16 Z"
                        fill={theme.colors.surface2}
                        stroke={theme.colors.muted}
                        strokeWidth={1.6}
                      />
                      {/* Nipples */}
                      <Circle cx="60" cy="74" r="2.2" fill={theme.colors.text} />
                      <Circle cx="100" cy="74" r="2.2" fill={theme.colors.text} />
                      {/* Tape wrap across nipples */}
                      <Path d="M30 74 Q80 68 130 74" stroke={theme.colors.accent} strokeWidth={2} strokeDasharray="3 3" opacity={0.6} />
                      <Path d="M30 74 Q80 80 130 74" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                      <SvgText x="80" y="94" fill={theme.colors.text} fontSize={9} fontWeight="600" textAnchor="middle">
                        across nipples
                      </SvgText>
                    </Svg>
                  ) : (
                    <Svg viewBox="0 0 160 150" width={180} height={140}>
                      {/* Generic Site Placement */}
                      <Circle cx="80" cy="75" r="50" fill={theme.colors.surface2} stroke={theme.colors.muted} strokeWidth={1.6} />
                      <Path d="M35 75 h90" stroke={theme.colors.accent} strokeWidth={3} strokeLinecap="round" />
                      <SvgText x="80" y="65" fill={theme.colors.accentText} fontSize={11} fontWeight="700" textAnchor="middle">
                        {selectedSite.name}
                      </SvgText>
                      <SvgText x="80" y="95" fill={theme.colors.muted} fontSize={9} textAnchor="middle">
                        Level tape wrap
                      </SvgText>
                    </Svg>
                  )}
                </View>

                {/* How to measure */}
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetSectionTitle}>HOW TO MEASURE</Text>
                  {selectedSite.howSteps.map((step, idx) => (
                    <View key={idx} style={styles.sheetStepRow}>
                      <View style={styles.sheetStepBadge}>
                        <Text style={styles.sheetStepBadgeText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.sheetStepText}>{step}</Text>
                    </View>
                  ))}
                </View>

                {/* Common mistakes */}
                <View style={styles.sheetSection}>
                  <Text style={styles.sheetSectionTitle}>COMMON MISTAKES</Text>
                  {selectedSite.mistakes.map((mistake, idx) => (
                    <View key={idx} style={styles.mistakeRow}>
                      <Text style={styles.mistakeCross}>✕</Text>
                      <Text style={styles.mistakeText}>{mistake}</Text>
                    </View>
                  ))}
                </View>

                {/* Consistency landmark spot */}
                <View style={styles.tipBox}>
                  <Text style={styles.tipTitle}>Same spot every time:</Text>
                  <Text style={styles.tipText}>{selectedSite.landmarkTip}</Text>
                </View>

                <Pressable
                  onPress={() => setSelectedSite(null)}
                  style={styles.sheetDoneBtn}
                >
                  <Text style={styles.sheetDoneBtnText}>Got it</Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.bg,
    },
    appbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    backBtn: {
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    backText: {
      fontSize: 15,
      color: theme.colors.accent,
      fontWeight: "500",
    },
    titleWrap: {
      alignItems: "center",
    },
    appbarTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.text,
    },
    appbarSub: {
      fontSize: 11,
      color: theme.colors.muted,
      marginTop: 1,
    },
    headerActionBtn: {
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    headerActionText: {
      fontSize: 14,
      color: theme.colors.accent,
      fontWeight: "600",
    },
    content: {
      padding: 16,
      gap: 16,
    },
    mapCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
    },
    mapRow: {
      flexDirection: "row",
      gap: 14,
    },
    svgContainer: {
      width: 116,
      alignItems: "center",
      justifyContent: "center",
    },
    siteListCol: {
      flex: 1,
      justifyContent: "space-between",
    },
    siteItemRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 26,
      paddingVertical: 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 6,
    },
    pressed: {
      opacity: 0.7,
    },
    siteBadgeNumber: {
      width: 17,
      height: 17,
      borderRadius: 8.5,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeOn: {
      backgroundColor: theme.colors.accent,
    },
    badgeOff: {
      backgroundColor: theme.colors.surface2,
      borderWidth: 1,
      borderColor: theme.colors.faint,
    },
    siteBadgeText: {
      fontSize: 10,
      fontWeight: "700",
    },
    badgeTextOn: {
      color: theme.colors.accentInk,
    },
    badgeTextOff: {
      color: theme.colors.muted,
    },
    siteItemName: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.text,
    },
    siteItemNameOff: {
      color: theme.colors.muted,
    },
    sideLabel: {
      fontSize: 10,
      color: theme.colors.faint,
      marginRight: 2,
    },
    offLabel: {
      fontSize: 10,
      color: theme.colors.faint,
      marginRight: 2,
    },
    chevron: {
      fontSize: 14,
      color: theme.colors.faint,
    },
    chooseSitesLink: {
      marginTop: 8,
      paddingVertical: 4,
    },
    chooseSitesText: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accentText,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
    },
    cardSectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.6,
      color: theme.colors.muted,
      marginBottom: 12,
    },
    tickList: {
      gap: 10,
    },
    tickRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    checkIcon: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.ok,
      lineHeight: 18,
    },
    tickText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    stepList: {
      gap: 10,
    },
    stepRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    stepNumberBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    stepNumberText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    stepText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    bold: {
      fontWeight: "600",
      color: theme.colors.text,
    },
    resultItem: {
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 2,
    },
    resultRule: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
    },
    resultDesc: {
      fontSize: 12,
      color: theme.colors.muted,
      lineHeight: 16,
    },
    primaryBtn: {
      height: 50,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.accentInk,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    modalBackdrop: {
      flex: 1,
    },
    sheetContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "85%",
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    sheetGrabber: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.faint,
      alignSelf: "center",
      marginBottom: 12,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.colors.text,
    },
    sheetBadge: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.accentText,
      marginTop: 2,
    },
    closeBtn: {
      padding: 6,
    },
    closeBtnText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.muted,
    },
    sheetScroll: {
      paddingBottom: 24,
      gap: 16,
    },
    diagramCard: {
      backgroundColor: theme.colors.bg,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetSection: {
      gap: 8,
    },
    sheetSectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.colors.muted,
      letterSpacing: 0.6,
    },
    sheetStepRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    sheetStepBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 1,
    },
    sheetStepBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    sheetStepText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    mistakeRow: {
      flexDirection: "row",
      gap: 8,
      alignItems: "flex-start",
    },
    mistakeCross: {
      fontSize: 13,
      fontWeight: "700",
      color: theme.colors.over,
      lineHeight: 18,
    },
    mistakeText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 18,
    },
    tipBox: {
      backgroundColor: theme.colors.accentSoft,
      borderRadius: theme.radius.sm,
      padding: 12,
      gap: 4,
    },
    tipTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.colors.accentText,
    },
    tipText: {
      fontSize: 12,
      color: theme.colors.text,
      lineHeight: 16,
    },
    sheetDoneBtn: {
      height: 46,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    sheetDoneBtnText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
  });
}
