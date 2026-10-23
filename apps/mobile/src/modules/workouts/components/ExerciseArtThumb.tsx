import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, Ellipse, Line, Path, Rect } from "react-native-svg";

import { useTheme } from "@/lib/theme/useTheme";
import { getExerciseImageSet } from "../data/exerciseImages";
import type { Equipment, MuscleGroup } from "../types/workouts";

type Props = {
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
  guideId?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  isCustom?: boolean;
};

export function ExerciseArtThumb({
  muscleGroup,
  equipment,
  guideId,
  name = "",
  size = "md",
  isCustom = false,
}: Props) {
  const theme = useTheme();
  const dimension = size === "sm" ? 38 : size === "lg" ? 72 : 48;
  const radius = size === "lg" ? 14 : 8;
  const fontSize = size === "sm" ? 12 : size === "lg" ? 22 : 14;

  // Custom exercises render 2-letter monogram as in prototype frame 3
  if (isCustom) {
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "EX";

    return (
      <View
        style={[
          styles.container,
          styles.customContainer,
          {
            width: dimension,
            height: dimension,
            borderRadius: radius,
            backgroundColor: theme.colors.surface2,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.customText, { fontSize, color: theme.colors.accentText }]}>
          {initials}
        </Text>
      </View>
    );
  }

  // Real exercise photography from free-exercise-db
  const imageSet = getExerciseImageSet(guideId);
  if (imageSet) {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimension,
            height: dimension,
            borderRadius: radius,
            backgroundColor: theme.colors.surface2,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Image
          source={imageSet.start}
          style={[styles.photo, { borderRadius: radius - 1 }]}
          contentFit="cover"
          transition={150}
        />
      </View>
    );
  }

  const ink = theme.colors.artInk;
  const muscle = theme.colors.artMuscle;
  const secondary = theme.colors.artSecondary;

  return (
    <View
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: radius,
          backgroundColor: theme.colors.artBg,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Svg width="86%" height="86%" viewBox="0 0 48 48">
        {renderArt({ muscleGroup, equipment, guideId, ink, muscle, secondary })}
      </Svg>
    </View>
  );
}

function renderArt({
  muscleGroup,
  equipment,
  guideId,
  ink,
  muscle,
  secondary,
}: {
  muscleGroup: MuscleGroup;
  equipment?: Equipment;
  guideId?: string | null;
  ink: string;
  muscle: string;
  secondary: string;
}) {
  // 1. Bench Press / Incline Chest Press
  if (guideId === "bench-press" || (muscleGroup === "chest" && equipment === "barbell")) {
    return (
      <>
        <Rect x="6" y="30" width="36" height="4" rx="2" fill={ink} />
        <Line x1="12" y1="34" x2="12" y2="42" stroke={ink} strokeWidth="2.5" />
        <Line x1="36" y1="34" x2="36" y2="42" stroke={ink} strokeWidth="2.5" />
        <Ellipse cx="22" cy="26" rx="10" ry="4" fill={muscle} />
        <Circle cx="35" cy="25" r="3.5" fill={ink} />
        <Line x1="8" y1="14" x2="40" y2="14" stroke={ink} strokeWidth="2.5" />
        <Rect x="9" y="10" width="3" height="8" rx="1" fill={ink} />
        <Rect x="36" y="10" width="3" height="8" rx="1" fill={ink} />
        <Line x1="22" y1="25" x2="22" y2="14" stroke={secondary} strokeWidth="3" strokeLinecap="round" />
      </>
    );
  }

  if (guideId === "incline-dumbbell-bench-press" || (muscleGroup === "chest" && equipment === "dumbbell")) {
    return (
      <>
        <Line x1="10" y1="36" x2="28" y2="20" stroke={ink} strokeWidth="3.5" strokeLinecap="round" />
        <Line x1="28" y1="36" x2="10" y2="36" stroke={ink} strokeWidth="2.5" />
        <Ellipse cx="21" cy="25" rx="7" ry="4" transform="rotate(-38, 21, 25)" fill={muscle} />
        <Circle cx="28" cy="17" r="3.5" fill={ink} />
        <Line x1="20" y1="24" x2="20" y2="11" stroke={secondary} strokeWidth="3" />
        <Rect x="16" y="9" width="8" height="3" rx="1" fill={ink} />
      </>
    );
  }

  if (guideId === "dip" || (muscleGroup === "chest" && equipment === "bodyweight")) {
    return (
      <>
        <Path d="M12 24h24M14 24v16M34 24v16" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
        <Circle cx="24" cy="11" r="3.5" fill={ink} />
        <Path d="M20 16h8l-1 10h-6z" fill={muscle} />
        <Path d="M19 17l-4 7M29 17l4 7" stroke={secondary} strokeWidth="3" strokeLinecap="round" />
        <Path d="M22 26l-1 10M26 26l1 10" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      </>
    );
  }

  // 2. Shoulders (Overhead press / Lateral raise)
  if (muscleGroup === "shoulders") {
    return (
      <>
        <Circle cx="24" cy="14" r="3.5" fill={ink} />
        <Rect x="19" y="19" width="10" height="13" rx="2" fill={ink} />
        <Circle cx="18" cy="21" r="3.5" fill={muscle} />
        <Circle cx="30" cy="21" r="3.5" fill={muscle} />
        <Path d="M16 20L13 10M32 20L35 10" stroke={secondary} strokeWidth="2.8" strokeLinecap="round" />
        <Line x1="8" y1="10" x2="40" y2="10" stroke={ink} strokeWidth="2.5" />
        <Path d="M21 32v10M27 32v10" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      </>
    );
  }

  // 3. Legs (Squat / Leg Press / Deadlift)
  if (guideId === "leg-press" || (muscleGroup === "legs" && equipment === "machine")) {
    return (
      <>
        <Line x1="12" y1="36" x2="26" y2="28" stroke={ink} strokeWidth="3" strokeLinecap="round" />
        <Ellipse cx="25" cy="27" rx="6" ry="3.5" transform="rotate(-25, 25, 27)" fill={muscle} />
        <Rect x="28" y="14" width="12" height="6" rx="1.5" transform="rotate(-25, 28, 14)" fill={secondary} />
        <Circle cx="15" cy="29" r="3" fill={ink} />
      </>
    );
  }

  if (muscleGroup === "legs") {
    return (
      <>
        <Circle cx="24" cy="10" r="3.5" fill={ink} />
        <Line x1="10" y1="12" x2="38" y2="12" stroke={ink} strokeWidth="2.5" />
        <Rect x="9" y="9" width="3" height="6" rx="1" fill={ink} />
        <Rect x="36" y="9" width="3" height="6" rx="1" fill={ink} />
        <Line x1="24" y1="14" x2="24" y2="24" stroke={ink} strokeWidth="3" />
        <Path d="M24 24L17 32L18 42" stroke={muscle} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M24 24L31 32L30 42" stroke={muscle} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }

  // 4. Back (Deadlift / Pull-up / Row / Pulldown)
  if (muscleGroup === "back") {
    return (
      <>
        <Circle cx="24" cy="12" r="3.5" fill={ink} />
        <Path d="M18 17h12l-2 12h-8z" fill={muscle} />
        <Line x1="10" y1="6" x2="38" y2="6" stroke={ink} strokeWidth="2.5" />
        <Path d="M19 18L14 8M29 18L34 8" stroke={secondary} strokeWidth="2.8" strokeLinecap="round" />
        <Path d="M21 29v13M27 29v13" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
      </>
    );
  }

  // 5. Arms (Biceps / Triceps)
  if (muscleGroup === "arms") {
    return (
      <>
        <Circle cx="24" cy="12" r="3.5" fill={ink} />
        <Rect x="20" y="17" width="8" height="14" rx="2" fill={ink} />
        <Circle cx="15" cy="23" r="3.5" fill={muscle} />
        <Circle cx="33" cy="23" r="3.5" fill={muscle} />
        <Path d="M20 18L15 23L13 32" stroke={secondary} strokeWidth="2.8" strokeLinecap="round" />
        <Path d="M28 18L33 23L35 32" stroke={secondary} strokeWidth="2.8" strokeLinecap="round" />
        <Circle cx="13" cy="34" r="2.5" fill={ink} />
        <Circle cx="35" cy="34" r="2.5" fill={ink} />
      </>
    );
  }

  // 6. Core / Default
  return (
    <>
      <Circle cx="24" cy="12" r="3.5" fill={ink} />
      <Rect x="19" y="18" width="10" height="14" rx="2" fill={muscle} />
      <Line x1="19" y1="23" x2="29" y2="23" stroke={secondary} strokeWidth="1.5" />
      <Line x1="19" y1="27" x2="29" y2="27" stroke={secondary} strokeWidth="1.5" />
      <Path d="M21 32v10M27 32v10" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  customContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  customText: {
    fontSize: 14,
    fontWeight: "700",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
});
