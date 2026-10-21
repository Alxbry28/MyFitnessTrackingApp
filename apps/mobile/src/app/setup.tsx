import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import { SetupResults } from "@/modules/body/components/setup/SetupResults";
import { AboutStep, ActivityStep, GoalStep, WelcomeStep } from "@/modules/body/components/setup/SetupSteps";
import { useSetup, type SetupPrefill } from "@/modules/body/hooks/useSetup";
import {
  ageOn,
  bmr,
  cmToFtIn,
  etaLabel,
  goalOffset,
  kgPerWeek,
  kgToLb,
  targetKcal,
  tdee,
  type ActivityLevel,
  type Goal,
  type Pace,
} from "@/modules/body/services/setupCalc";
import {
  parseWeight,
  targetWeightError,
  validateAbout,
  type About,
  type AboutErrors,
  type AboutValues,
} from "@/modules/body/services/setupSchema";
import type { BmiScale } from "@/modules/body/types/body";
import type { Units } from "@/modules/nutrition/repositories/settingsRepo";
import { dayKey } from "@/modules/nutrition/services/mealTime";
import { macroTargets } from "@/modules/nutrition/services/nutritionCalc";

type Step = "welcome" | "about" | "activity" | "goal" | "results";

export default function SetupScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const theme = useTheme();
  const styles = makeStyles(theme);
  const insets = useSafeAreaInsets();
  const { state, finish, skip } = useSetup();

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {state.status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} accessibilityLabel="Loading" />
        </View>
      ) : (
        <SetupFlow prefill={state.prefill} fromSettings={from === "settings"} finish={finish} skip={skip} />
      )}
    </View>
  );
}

function displayWeight(kg: number | null, units: Units): string {
  if (kg === null) return "";
  return String(Math.round((units === "imperial" ? kgToLb(kg) : kg) * 10) / 10);
}

function initialAbout(prefill: SetupPrefill): AboutValues {
  const { profile, latestKg, units } = prefill;
  const ftIn = profile.heightCm === null ? null : cmToFtIn(profile.heightCm);
  return {
    sex: profile.sex ?? "male",
    birthDate: profile.birthDate,
    heightCm: profile.heightCm === null ? "" : String(profile.heightCm),
    heightFt: ftIn ? String(ftIn.ft) : "",
    heightIn: ftIn ? String(ftIn.inches) : "",
    weight: displayWeight(latestKg, units),
  };
}

type FlowProps = {
  prefill: SetupPrefill;
  fromSettings: boolean;
  finish: ReturnType<typeof useSetup>["finish"];
  skip: ReturnType<typeof useSetup>["skip"];
};

function SetupFlow({ prefill, fromSettings, finish, skip }: FlowProps) {
  const styles = makeStyles(useTheme());
  const [today] = useState(() => dayKey(new Date()));
  const [step, setStep] = useState<Step>(fromSettings ? "about" : "welcome");
  const [units, setUnits] = useState<Units>(prefill.units);
  const [aboutValues, setAboutValues] = useState<AboutValues>(() => initialAbout(prefill));
  const [aboutErrors, setAboutErrors] = useState<AboutErrors>({});
  const [about, setAbout] = useState<About | null>(null);
  const [activity, setActivity] = useState<ActivityLevel>(prefill.profile.activityLevel ?? "moderate");
  const [goal, setGoal] = useState<Goal>(prefill.profile.goal ?? "cut");
  const [pace, setPace] = useState<Pace>("steady");
  const [target, setTarget] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [bmiScale, setBmiScale] = useState<BmiScale>(prefill.profile.bmiScale);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // The answers last saved when only the weight failed; Start again continues only if unchanged.
  const [savedAnswers, setSavedAnswers] = useState<string | null>(null);

  const leave = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const back = () => {
    if (step === "welcome" || (step === "about" && fromSettings)) leave();
    else if (step === "about") setStep("welcome");
    else if (step === "activity") setStep("about");
    else if (step === "goal") setStep("activity");
    else setStep("goal");
  };

  // Android back walks the steps instead of closing setup midway.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      back();
      return true;
    });
    return () => sub.remove();
  });

  // Switching units converts the typed weights so the numbers keep their meaning.
  const changeUnits = (next: Units) => {
    if (next === units) return;
    const convert = (text: string) => displayWeight(parseWeight(text, units), next);
    setAboutValues((v) => ({ ...v, weight: convert(v.weight) || v.weight }));
    setTarget((t) => convert(t) || t);
    setUnits(next);
  };

  const age = about ? ageOn(about.birthDate, today) : 0;
  const bmrKcal = about ? bmr(about.sex, about.weightKg, about.heightCm, age) : 0;
  const tdeeKcal = tdee(bmrKcal, activity);
  const offset = goalOffset(goal, pace);
  const kcal = targetKcal(tdeeKcal, offset);
  const targetKg = parseWeight(target, units);

  const nextFromAbout = () => {
    const result = validateAbout(aboutValues, units, today);
    if (!result.ok) {
      setAboutErrors(result.errors);
      return;
    }
    setAboutErrors({});
    setAbout(result.data);
    setStep("activity");
  };

  const nextFromGoal = () => {
    if (!about) return;
    const error = targetWeightError(goal, targetKg, about.weightKg, units);
    setTargetError(error);
    if (!error) setStep("results");
  };

  // Setup is always pushed over Today or Settings, so finishing returns to where it opened.
  const done = leave;

  const start = async () => {
    if (!about || saving) return;
    const input = { ...about, activityLevel: activity, goal, bmiScale, units, calorieGoal: kcal };
    const answers = JSON.stringify(input);
    // These exact answers are saved and only the weight failed: the message has been read, so continue.
    if (savedAnswers === answers) {
      done();
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const result = await finish(input);
      if (result.weightSaved) {
        done();
      } else {
        setSavedAnswers(answers);
        setSaveError("Saved your goal, but couldn't save your weight. Log it on Progress.");
      }
    } catch {
      setSaveError("Couldn't save your setup. Try again.");
    } finally {
      setSaving(false);
    }
  };

  let body;
  if (step === "welcome") {
    body = (
      <WelcomeStep
        onStart={() => setStep("about")}
        onSkip={() => {
          // Opening Settings matters more than the flag; a failed write just shows setup again next run.
          void skip()
            .catch(() => undefined)
            .finally(() => router.replace("/settings"));
        }}
      />
    );
  } else if (step === "about") {
    body = (
      <AboutStep
        units={units}
        onUnits={changeUnits}
        values={aboutValues}
        onChange={setAboutValues}
        errors={aboutErrors}
        today={today}
        onBack={back}
        onNext={nextFromAbout}
      />
    );
  } else if (step === "activity") {
    body = <ActivityStep value={activity} onChange={setActivity} onBack={back} onNext={() => setStep("goal")} />;
  } else if (step === "goal" && about) {
    const currentDisplay = units === "imperial" ? kgToLb(about.weightKg) : about.weightKg;
    const targetNumber = Number(target.replace(",", "."));
    body = (
      <GoalStep
        goal={goal}
        onGoal={(g) => {
          setGoal(g);
          setTargetError(null);
        }}
        pace={pace}
        onPace={setPace}
        target={target}
        onTarget={(t) => {
          setTarget(t);
          setTargetError(null);
        }}
        targetError={targetError}
        difference={target.trim() && Number.isFinite(targetNumber) ? targetNumber - currentDisplay : null}
        units={units}
        kcalFor={(o) => targetKcal(tdeeKcal, o)}
        onBack={back}
        onNext={nextFromGoal}
      />
    );
  } else if (step === "results" && about) {
    const unit = units === "imperial" ? "lb" : "kg";
    const show = (kg: number) => `${displayWeight(kg, units)} ${unit}`;
    const eta = goal !== "maintain" && targetKg !== null ? etaLabel(new Date(), about.weightKg, targetKg, kgPerWeek(offset)) : null;
    body = (
      <SetupResults
        kcal={kcal}
        subLine={
          goal === "maintain" || targetKg === null
            ? { lead: `Keep around ${show(about.weightKg)}`, bold: null }
            : { lead: `${show(targetKg)} around `, bold: eta }
        }
        bmrKcal={bmrKcal}
        tdeeKcal={tdeeKcal}
        offset={offset}
        heightCm={about.heightCm}
        weightKg={about.weightKg}
        bmiScale={bmiScale}
        onBmiScale={setBmiScale}
        macros={macroTargets(kcal)}
        saving={saving}
        error={saveError}
        onStart={() => void start()}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      {body}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.bg },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    scroll: { flexGrow: 1 },
  });
}
