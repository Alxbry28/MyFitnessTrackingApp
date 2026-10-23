export type SetPerformance = {
  weightKg?: number | null;
  reps?: number | null;
  isBodyweight?: boolean;
  isWarmup?: boolean;
};

// Formats performance from previous session, e.g. "60 kg × 8, 8, 7" or "BW × 10, 8, 8".
export function formatPreviousPerformance(sets: SetPerformance[]): string {
  const workingSets = sets.filter((s) => !s.isWarmup && (s.reps ?? 0) > 0);
  if (workingSets.length === 0) return "No previous sets";

  const allSameWeight = workingSets.every(
    (s) => s.weightKg === workingSets[0]?.weightKg,
  );

  const first = workingSets[0]!;
  const isBw = first.isBodyweight;

  if (allSameWeight) {
    const repsStr = workingSets.map((s) => s.reps ?? 0).join(", ");
    if (isBw && (!first.weightKg || first.weightKg === 0)) {
      return `BW × ${repsStr}`;
    }
    const weightPrefix = isBw
      ? `BW + ${first.weightKg ?? 0} kg`
      : `${first.weightKg ?? 0} kg`;
    return `${weightPrefix} × ${repsStr}`;
  }

  // Varying weights
  return workingSets
    .map((s) => {
      const prefix = s.isBodyweight
        ? s.weightKg && s.weightKg > 0
          ? `BW+${s.weightKg}k`
          : "BW"
        : `${s.weightKg ?? 0}k`;
      return `${prefix}×${s.reps ?? 0}`;
    })
    .join(", ");
}

export function calculateTotalVolume(
  sets: { weightKg?: number | null; reps?: number | null; isWarmup?: boolean; isCompleted?: boolean }[],
): number {
  return sets
    .filter((s) => s.isCompleted !== false && !s.isWarmup)
    .reduce((sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0), 0);
}

export function calculateDurationMinutes(
  startedAt: string,
  endedAt?: string | null,
): number {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  if (isNaN(start) || isNaN(end) || end <= start) return 1;
  return Math.max(1, Math.round((end - start) / 60000));
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export type SessionStats = {
  durationMinutes: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
};

export function calculateSessionStats(session: {
  startedAt: string;
  endedAt?: string | null;
  exercises?: { sets: { weightKg?: number | null; reps?: number | null; isWarmup?: boolean; isCompleted?: boolean }[] }[];
}): SessionStats {
  const durationMinutes = calculateDurationMinutes(session.startedAt, session.endedAt);
  const allSets = (session.exercises ?? []).flatMap((e) => e.sets);
  const completedWorkingSets = allSets.filter((s) => s.isCompleted !== false && !s.isWarmup);
  const totalSets = completedWorkingSets.length;
  const totalReps = completedWorkingSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalVolumeKg = calculateTotalVolume(allSets);

  return {
    durationMinutes,
    totalSets,
    totalReps,
    totalVolumeKg,
  };
}

export function formatKg(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1).replace(/\.0$/, "")}t`;
  }
  return `${Math.round(kg)} kg`;
}

// 1RM estimation using Epley formula: w * (1 + r / 30)
export function estimate1RM(weightKg: number | null | undefined, reps: number | null | undefined): number {
  const w = weightKg ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return Math.round(w);
  return Math.round(w * (1 + r / 30));
}

export type ExerciseHistoryMax = {
  maxWeight: number;
  maxVolume: number;
};

export type SetPRResult = {
  isWeightPR: boolean;
  isVolumePR: boolean;
};

export function checkSetPR(
  set: { weightKg?: number | null; reps?: number | null; isWarmup?: boolean; isCompleted?: boolean },
  history: ExerciseHistoryMax,
): SetPRResult {
  if (set.isWarmup || set.isCompleted === false) {
    return { isWeightPR: false, isVolumePR: false };
  }
  const weight = set.weightKg ?? 0;
  const reps = set.reps ?? 0;
  const volume = weight * reps;

  const isWeightPR = weight > 0 && history.maxWeight > 0 && weight > history.maxWeight;
  const isVolumePR = volume > 0 && history.maxVolume > 0 && volume > history.maxVolume;

  return { isWeightPR, isVolumePR };
}

export type BestSetSummary = {
  text: string;
  isPR: boolean;
};

export function getExerciseBestSet(
  sets: { weightKg?: number | null; reps?: number | null; isWarmup?: boolean; isCompleted?: boolean }[],
  isBodyweight: boolean,
  historyMax?: ExerciseHistoryMax,
): BestSetSummary | null {
  const completed = sets.filter((s) => s.isCompleted !== false && !s.isWarmup && (s.reps ?? 0) > 0);
  if (completed.length === 0) return null;

  // Sort by highest weight, then highest reps
  const sorted = [...completed].sort((a, b) => {
    const wDiff = (b.weightKg ?? 0) - (a.weightKg ?? 0);
    if (wDiff !== 0) return wDiff;
    return (b.reps ?? 0) - (a.reps ?? 0);
  });

  const best = sorted[0]!;
  const prs = historyMax ? checkSetPR(best, historyMax) : { isWeightPR: false, isVolumePR: false };
  const hasPR = prs.isWeightPR || prs.isVolumePR;

  let text = "";
  if (isBodyweight) {
    if (best.weightKg && best.weightKg > 0) {
      text = `+${best.weightKg} kg × ${best.reps}`;
    } else {
      text = `BW × ${best.reps}`;
    }
  } else {
    text = `${best.weightKg ?? 0} kg × ${best.reps}`;
  }

  return {
    text,
    isPR: hasPR,
  };
}

