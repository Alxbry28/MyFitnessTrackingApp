import type { ImageSource } from "expo-image";

export type ExerciseImageSet = {
  start: ImageSource;
  finish: ImageSource;
};

export const EXERCISE_LOCAL_IMAGES: Record<string, ExerciseImageSet> = {
  "bench-press": {
    start: require("../../../../assets/exercises/bench-press/0.jpg"),
    finish: require("../../../../assets/exercises/bench-press/1.jpg"),
  },
  "incline-dumbbell-bench-press": {
    start: require("../../../../assets/exercises/incline-dumbbell-bench-press/0.jpg"),
    finish: require("../../../../assets/exercises/incline-dumbbell-bench-press/1.jpg"),
  },
  "squat": {
    start: require("../../../../assets/exercises/squat/0.jpg"),
    finish: require("../../../../assets/exercises/squat/1.jpg"),
  },
  "deadlift": {
    start: require("../../../../assets/exercises/deadlift/0.jpg"),
    finish: require("../../../../assets/exercises/deadlift/1.jpg"),
  },
  "romanian-deadlift": {
    start: require("../../../../assets/exercises/romanian-deadlift/0.jpg"),
    finish: require("../../../../assets/exercises/romanian-deadlift/1.jpg"),
  },
  "pull-up": {
    start: require("../../../../assets/exercises/pull-up/0.jpg"),
    finish: require("../../../../assets/exercises/pull-up/1.jpg"),
  },
  "push-up": {
    start: require("../../../../assets/exercises/push-up/0.jpg"),
    finish: require("../../../../assets/exercises/push-up/1.jpg"),
  },
  "bent-over-row": {
    start: require("../../../../assets/exercises/bent-over-row/0.jpg"),
    finish: require("../../../../assets/exercises/bent-over-row/1.jpg"),
  },
  "shoulder-press": {
    start: require("../../../../assets/exercises/shoulder-press/0.jpg"),
    finish: require("../../../../assets/exercises/shoulder-press/1.jpg"),
  },
  "lateral-raise": {
    start: require("../../../../assets/exercises/lateral-raise/0.jpg"),
    finish: require("../../../../assets/exercises/lateral-raise/1.jpg"),
  },
  "bicep-curl": {
    start: require("../../../../assets/exercises/bicep-curl/0.jpg"),
    finish: require("../../../../assets/exercises/bicep-curl/1.jpg"),
  },
  "tricep-pushdown": {
    start: require("../../../../assets/exercises/tricep-pushdown/0.jpg"),
    finish: require("../../../../assets/exercises/tricep-pushdown/1.jpg"),
  },
  "dip": {
    start: require("../../../../assets/exercises/dip/0.jpg"),
    finish: require("../../../../assets/exercises/dip/1.jpg"),
  },
  "leg-press": {
    start: require("../../../../assets/exercises/leg-press/0.jpg"),
    finish: require("../../../../assets/exercises/leg-press/1.jpg"),
  },
  "lat-pulldown": {
    start: require("../../../../assets/exercises/lat-pulldown/0.jpg"),
    finish: require("../../../../assets/exercises/lat-pulldown/1.jpg"),
  },
  "hanging-leg-raise": {
    start: require("../../../../assets/exercises/hanging-leg-raise/0.jpg"),
    finish: require("../../../../assets/exercises/hanging-leg-raise/1.jpg"),
  },
  "plank": {
    start: require("../../../../assets/exercises/plank/0.jpg"),
    finish: require("../../../../assets/exercises/plank/1.jpg"),
  },
};

export function getExerciseImageSet(guideId?: string | null): ExerciseImageSet | null {
  if (!guideId) return null;
  return EXERCISE_LOCAL_IMAGES[guideId] ?? null;
}
