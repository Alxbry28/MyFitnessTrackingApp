export type MuscleGroup =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body";

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "bodyweight"
  | "other";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "full_body",
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  legs: "Legs",
  shoulders: "Shoulders",
  arms: "Arms",
  core: "Core",
  full_body: "Full body",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  other: "Other",
};

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isBodyweight: boolean;
  guideId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  isBodyweight?: boolean;
};

export type WorkoutSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number | null;
  weightKg?: number | null;
  durationSec?: number | null;
  rpe?: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SetInput = {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number | null;
  weightKg?: number | null;
  durationSec?: number | null;
  rpe?: number | null;
  isWarmup?: boolean;
  isCompleted?: boolean;
};

export type SessionExercise = {
  exercise: Exercise;
  previousText?: string | null;
  sets: WorkoutSet[];
};

export type WorkoutSession = {
  id: string;
  name: string;
  startedAt: string;
  endedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  exercises?: SessionExercise[];
  durationMinutes?: number;
  totalVolumeKg?: number;
  totalSets?: number;
};
