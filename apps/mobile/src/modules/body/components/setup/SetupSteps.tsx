import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { SymbolView, type AndroidSymbol } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { useTheme, type Theme } from "@/lib/theme/useTheme";
import type { Units } from "@/modules/nutrition/repositories/settingsRepo";
import { dayFromKey, dayKey } from "@/modules/nutrition/services/mealTime";
import { formatKcal } from "@/modules/nutrition/services/nutritionCalc";

import { ACTIVITY_LEVELS, ageOn, goalOffset, kgPerWeek, kgToLb, PACES, type ActivityLevel, type Goal, type Pace } from "../../services/setupCalc";
import type { AboutErrors, AboutValues } from "../../services/setupSchema";
import {
  FieldLabel,
  Helper,
  LinkButton,
  NumberInput,
  OptionRow,
  PickerInput,
  PrimaryButton,
  Segmented,
  StepHeader,
  Title,
} from "./SetupParts";

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatBirthDate(day: string): string {
  const d = dayFromKey(day);
  return `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const POINTS: { icon: AndroidSymbol; text: string }[] = [
  { icon: "barcode_scanner", text: "Scan barcodes or paste a meal list" },
  { icon: "smartphone", text: "Your data stays on this phone" },
  { icon: "download", text: "Export a backup any time" },
];

export function WelcomeStep({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  return (
    <View style={styles.content}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <SymbolView name={{ android: "restaurant", web: "restaurant" }} tintColor={theme.colors.accentInk} size={34} />
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header">
          {"Track food your way.\nOffline, on your phone."}
        </Text>
        <Text style={styles.heroText}>
          {"Three quick questions and we'll suggest a daily calorie target. You can change everything later."}
        </Text>
        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.icon} style={styles.point}>
              <SymbolView name={{ android: p.icon, web: p.icon }} tintColor={theme.colors.accentText} size={22} />
              <Text style={styles.pointText}>{p.text}</Text>
            </View>
          ))}
        </View>
      </View>
      <PrimaryButton label="Set up my goal" onPress={onStart} />
      <LinkButton label="Skip, I'll enter a calorie goal myself" onPress={onSkip} />
    </View>
  );
}

type AboutProps = {
  units: Units;
  onUnits: (units: Units) => void;
  values: AboutValues;
  onChange: (values: AboutValues) => void;
  errors: AboutErrors;
  today: string;
  onBack: () => void;
  onNext: () => void;
};

export function AboutStep({ units, onUnits, values, onChange, errors, today, onBack, onNext }: AboutProps) {
  const styles = makeStyles(useTheme());
  const set = (patch: Partial<AboutValues>) => onChange({ ...values, ...patch });
  const pickBirthDate = () =>
    DateTimePickerAndroid.open({
      value: values.birthDate ? dayFromKey(values.birthDate) : new Date(1995, 0, 1, 12),
      mode: "date",
      maximumDate: dayFromKey(today),
      onChange: (event, date) => {
        if (event.type === "set" && date) set({ birthDate: dayKey(date) });
      },
    });
  const imperial = units === "imperial";

  return (
    <>
      <StepHeader step={1} onBack={onBack} />
      <View style={styles.content}>
        <Title title="About you" sub="Used to estimate how much energy your body burns. Stored only on this phone." />
        <Segmented
          label="Units"
          small
          value={units}
          onChange={onUnits}
          options={[
            { value: "metric", label: "kg · cm" },
            { value: "imperial", label: "lb · ft" },
          ]}
        />
        <View>
          <FieldLabel>Sex</FieldLabel>
          <Segmented
            label="Sex"
            value={values.sex}
            onChange={(sex) => set({ sex })}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
            ]}
          />
          <Helper>The calorie formula differs by sex.</Helper>
        </View>
        <View>
          <FieldLabel>Birth date</FieldLabel>
          <PickerInput
            label="Birth date"
            text={values.birthDate ? formatBirthDate(values.birthDate) : "Pick a date"}
            unit={values.birthDate ? `${ageOn(values.birthDate, today)} yrs` : undefined}
            onPress={pickBirthDate}
            error={!!errors.birthDate}
          />
          {errors.birthDate && <Helper error>{errors.birthDate}</Helper>}
        </View>
        <View style={styles.row2}>
          <View style={styles.col}>
            <FieldLabel>Height</FieldLabel>
            {imperial ? (
              <View style={styles.row2}>
                <View style={styles.col}>
                  <NumberInput label="Height, feet" value={values.heightFt} onChange={(heightFt) => set({ heightFt })} unit="ft" error={!!errors.height} keyboardType="number-pad" />
                </View>
                <View style={styles.col}>
                  <NumberInput label="Height, inches" value={values.heightIn} onChange={(heightIn) => set({ heightIn })} unit="in" error={!!errors.height} keyboardType="number-pad" />
                </View>
              </View>
            ) : (
              <NumberInput label="Height in centimetres" value={values.heightCm} onChange={(heightCm) => set({ heightCm })} unit="cm" error={!!errors.height} />
            )}
            {errors.height && <Helper error>{errors.height}</Helper>}
          </View>
          <View style={styles.col}>
            <FieldLabel>Current weight</FieldLabel>
            <NumberInput
              label={imperial ? "Current weight in pounds" : "Current weight in kilograms"}
              value={values.weight}
              onChange={(weight) => set({ weight })}
              unit={imperial ? "lb" : "kg"}
              error={!!errors.weight}
            />
            {errors.weight && <Helper error>{errors.weight}</Helper>}
          </View>
        </View>
        <View style={styles.spacer} />
        <PrimaryButton label="Next" onPress={onNext} />
      </View>
    </>
  );
}

const ACTIVITY_COPY: Record<ActivityLevel, { name: string; meta: string; factor: string }> = {
  sedentary: { name: "Sedentary", meta: "Desk job, little exercise", factor: "×1.2" },
  light: { name: "Lightly active", meta: "Training 1–3 days a week", factor: "×1.375" },
  moderate: { name: "Moderately active", meta: "Training 3–5 days a week", factor: "×1.55" },
  very: { name: "Very active", meta: "Hard training 6–7 days a week", factor: "×1.725" },
  extra: { name: "Extra active", meta: "Physical job plus training", factor: "×1.9" },
};

export function ActivityStep({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: ActivityLevel;
  onChange: (value: ActivityLevel) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const styles = makeStyles(useTheme());
  return (
    <>
      <StepHeader step={2} onBack={onBack} />
      <View style={styles.content}>
        <Title title="How active are you?" sub="Count your job and your training. Pick the closest one." />
        <View style={styles.list} accessibilityRole="radiogroup">
          {ACTIVITY_LEVELS.map((level) => (
            <OptionRow
              key={level}
              name={ACTIVITY_COPY[level].name}
              meta={ACTIVITY_COPY[level].meta}
              side={ACTIVITY_COPY[level].factor}
              selected={value === level}
              onPress={() => onChange(level)}
            />
          ))}
        </View>
        <View style={styles.spacer} />
        <PrimaryButton label="Next" onPress={onNext} />
      </View>
    </>
  );
}

const PACE_COPY: Record<Pace, string> = { gentle: "Gentle", steady: "Steady", fast: "Fast" };

type GoalProps = {
  goal: Goal;
  onGoal: (goal: Goal) => void;
  pace: Pace;
  onPace: (pace: Pace) => void;
  target: string;
  onTarget: (value: string) => void;
  targetError: string | null;
  // Target minus current weight in the display unit, or null when the target isn't a number yet.
  difference: number | null;
  units: Units;
  kcalFor: (offset: number) => number;
  onBack: () => void;
  onNext: () => void;
};

function weekLabel(kg: number, units: Units): string {
  return units === "imperial" ? `≈ ${(Math.round(kgToLb(kg) * 10) / 10).toFixed(1)} lb / week` : `≈ ${kg.toFixed(2).replace(/0$/, "")} kg / week`;
}

export function GoalStep(props: GoalProps) {
  const styles = makeStyles(useTheme());
  const { goal, units, difference } = props;
  const unit = units === "imperial" ? "lb" : "kg";
  const diffText =
    difference === null ? unit : `${unit} · ${difference < 0 ? "−" : "+"}${Math.abs(Math.round(difference * 10) / 10)} ${unit}`;

  return (
    <>
      <StepHeader step={3} onBack={props.onBack} />
      <View style={styles.content}>
        <Title title="What's your goal?" />
        <Segmented
          label="Goal"
          value={goal}
          onChange={props.onGoal}
          options={[
            { value: "cut", label: "Lose fat" },
            { value: "maintain", label: "Maintain" },
            { value: "bulk", label: "Build muscle" },
          ]}
        />
        {goal !== "maintain" && (
          <View>
            <FieldLabel>Target weight</FieldLabel>
            <NumberInput label="Target weight" value={props.target} onChange={props.onTarget} unit={diffText} error={!!props.targetError} />
            {props.targetError && <Helper error>{props.targetError}</Helper>}
          </View>
        )}
        {goal === "cut" && (
          <View>
            <FieldLabel>Pace</FieldLabel>
            <View style={styles.list} accessibilityRole="radiogroup">
              {PACES.map((p) => {
                const offset = goalOffset("cut", p);
                const meta = weekLabel(kgPerWeek(offset), units) + (p === "fast" ? " · harder to keep" : "");
                return (
                  <OptionRow
                    key={p}
                    name={PACE_COPY[p]}
                    meta={meta}
                    side={formatKcal(props.kcalFor(offset))}
                    sideSub="kcal / day"
                    selected={props.pace === p}
                    onPress={() => props.onPace(p)}
                  />
                );
              })}
            </View>
          </View>
        )}
        <View style={styles.spacer} />
        <PrimaryButton label="See my plan" onPress={props.onNext} />
      </View>
    </>
  );
}

export function makeStyles(theme: Theme) {
  const { colors, space, fontSize } = theme;
  return StyleSheet.create({
    content: {
      flexGrow: 1,
      gap: space[4],
      paddingTop: space[2],
      paddingHorizontal: space[4],
      paddingBottom: space[4],
    },
    spacer: { flex: 1 },
    list: { gap: space[2] },
    row2: { flexDirection: "row", gap: space[3] },
    col: { flex: 1 },
    hero: { flex: 1, justifyContent: "center", gap: space[4] },
    logo: {
      width: 64,
      height: 64,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
    },
    heroTitle: { color: colors.text, fontSize: fontSize.xl, fontWeight: "700", letterSpacing: -0.5, lineHeight: 32 },
    heroText: { color: colors.muted, fontSize: fontSize.md, lineHeight: 22 },
    points: { gap: space[3], marginTop: space[2] },
    point: { flexDirection: "row", alignItems: "center", gap: space[3] },
    pointText: { color: colors.text, fontSize: fontSize.sm },
  });
}
