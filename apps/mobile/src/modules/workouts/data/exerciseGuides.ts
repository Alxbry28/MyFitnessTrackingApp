export type ExerciseGuideData = {
  guideId: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  category: "Compound" | "Isolation";
  force: "Push" | "Pull" | "Hinge" | "Squat" | "Hold";
  steps: { title: string; desc: string }[];
  dos: string[];
  donts: string[];
  breathingCue: string;
};

export const EXERCISE_GUIDES: Record<string, ExerciseGuideData> = {
  "bench-press": {
    guideId: "bench-press",
    name: "Barbell Bench Press",
    primaryMuscles: ["Pectoralis Major (Mid & Lower Chest)"],
    secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
    category: "Compound",
    force: "Push",
    steps: [
      {
        title: "Setup & Scapular Retraction",
        desc: "Lie flat with eyes directly under the bar. Pinch shoulder blades down and back into the bench. Place feet flat on the floor.",
      },
      {
        title: "Grip & Unrack",
        desc: "Grip slightly wider than shoulder width. Squeeze bar firmly to keep wrists straight directly over elbows. Unrack and stabilize over chest.",
      },
      {
        title: "Controlled Descent (45°–70° Tuck)",
        desc: "Lower the bar in a diagonal arc to touch your lower sternum/nipple line with forearms vertical.",
      },
      {
        title: "Leg Drive & Lockout",
        desc: "Drive through feet without lifting glutes off bench. Press bar up and slightly backward over shoulders to lockout.",
      },
    ],
    dos: [
      "Keep glutes and upper back firmly planted on the bench throughout.",
      "Tuck elbows at 45°–70° from torso to protect rotator cuffs.",
      "Maintain a natural, stable arch in your thoracic spine.",
    ],
    donts: [
      "Do not flare elbows out at 90° (causes shoulder impingement).",
      "Do not bounce the barbell off your ribcage.",
      "Do not let wrists hyperextend backward under heavy load.",
    ],
    breathingCue:
      "Inhale deeply into belly and brace before unrack and descent. Hold through descent, then exhale forcefully past the sticking point on the press.",
  },

  "incline-dumbbell-bench-press": {
    guideId: "incline-dumbbell-bench-press",
    name: "Incline Dumbbell Press",
    primaryMuscles: ["Clavicular Head (Upper Chest)"],
    secondaryMuscles: ["Anterior Deltoids", "Triceps Brachii"],
    category: "Compound",
    force: "Push",
    steps: [
      {
        title: "Bench Angle Setup (30°–45°)",
        desc: "Set bench angle to 30°–45°. Higher angles shift work to front deltoids rather than upper chest.",
      },
      {
        title: "Kick Up & Position",
        desc: "Kick dumbbells to shoulders with knees. Retract shoulder blades and plant feet firmly.",
      },
      {
        title: "Smooth Descent",
        desc: "Lower dumbbells under control with elbows at ~45° until stretch is felt in upper chest.",
      },
      {
        title: "Press & Squeeze",
        desc: "Press dumbbells up in a slight inward converging arc without clanking the weights together.",
      },
    ],
    dos: [
      "Keep forearms perpendicular to the floor at the bottom of each rep.",
      "Focus on squeezing the upper chest together at peak contraction.",
    ],
    donts: [
      "Do not set the bench too steep (>45° becomes an overhead press).",
      "Do not drop elbows below shoulder joint level if experiencing shoulder discomfort.",
    ],
    breathingCue:
      "Inhale at the top or on descent. Hold briefly at bottom stretch, then exhale as you press upwards.",
  },

  "push-up": {
    guideId: "push-up",
    name: "Push-up",
    primaryMuscles: ["Pectoralis Major", "Triceps Brachii"],
    secondaryMuscles: ["Anterior Deltoids", "Rectus Abdominis", "Core"],
    category: "Compound",
    force: "Push",
    steps: [
      {
        title: "Plank Setup",
        desc: "Hands shoulder-width apart, fingers slightly flared. Squeeze glutes, quads, and abs into a rigid straight line.",
      },
      {
        title: "Controlled Lowering",
        desc: "Lower chest towards floor, keeping elbows tracking back at roughly 45° like an arrow shape.",
      },
      {
        title: "Full Range Lockout",
        desc: "Press through palms until elbows lock out fully with shoulder blades spreading across ribcage at the top.",
      },
    ],
    dos: [
      "Keep body in a solid straight line from head to heels.",
      "Touch chest within 1 inch of the floor on every rep.",
    ],
    donts: [
      "Do not allow hips to sag downward or pike upward.",
      "Do not let head lead the movement by craning your neck downward.",
    ],
    breathingCue: "Inhale on the way down; exhale as you push the floor away.",
  },

  squat: {
    guideId: "squat",
    name: "Barbell Back Squat",
    primaryMuscles: ["Quadriceps", "Gluteus Maximus"],
    secondaryMuscles: ["Adductors", "Hamstrings", "Erector Spinae", "Core"],
    category: "Compound",
    force: "Squat",
    steps: [
      {
        title: "Walkout & Foot Stance",
        desc: "Rest bar on upper traps. Unrack with 2–3 precise steps back. Set feet shoulder-width, toes turned out 15°–30°.",
      },
      {
        title: "Brace & Simultaneous Break",
        desc: "Take big diaphragmatic breath and brace abs 360°. Break hips and knees simultaneously.",
      },
      {
        title: "Hit Parallel Depth",
        desc: "Descend smoothly until hip crease is below the top of the patella (parallel or deeper).",
      },
      {
        title: "Mid-foot Drive",
        desc: "Drive through whole foot (tripod: heel, big toe, pinky toe). Stand up tall with hips and chest rising together.",
      },
    ],
    dos: [
      "Keep knees tracking in exact line with your toes throughout the descent and ascent.",
      "Maintain neutral cervical and lumbar spine with chest upright.",
      "Keep heel and toe firmly grounded without rocking forward.",
    ],
    donts: [
      "Never let knees cave inward (knee valgus) on the ascent.",
      "Do not allow hips to shoot up before chest ('good morning squat').",
      "Avoid cutting depth above parallel unless working around a medical restriction.",
    ],
    breathingCue:
      "Big breath and hard Valsalva brace at top. Hold breath tightly through bottom turn, then exhale past halfway up.",
  },

  "leg-press": {
    guideId: "leg-press",
    name: "Leg Press",
    primaryMuscles: ["Quadriceps"],
    secondaryMuscles: ["Gluteus Maximus", "Adductors", "Hamstrings"],
    category: "Compound",
    force: "Squat",
    steps: [
      {
        title: "Foot Placement",
        desc: "Sit deep in seat with lower back pinned to backrest. Place feet shoulder-width apart in the center of platform.",
      },
      {
        title: "Lower to 90 Degrees",
        desc: "Disengage safety and lower sled until knees reach approximately 90° angle without hips lifting from pad.",
      },
      {
        title: "Press to Soft Lockout",
        desc: "Drive platform away through whole foot. Stop just shy of hyper-extending knees.",
      },
    ],
    dos: [
      "Keep lower back and tailbone completely flush against backrest.",
      "Keep knees tracking over toes without caving inward.",
    ],
    donts: [
      "Never hyperextend or forcefully slam knees into lockout.",
      "Do not allow pelvis or tailbone to curl off seat at bottom (causes spinal flexion).",
    ],
    breathingCue: "Inhale as sled descends; exhale forcefully as you press sled away.",
  },

  "romanian-deadlift": {
    guideId: "romanian-deadlift",
    name: "Romanian Deadlift",
    primaryMuscles: ["Hamstrings", "Gluteus Maximus"],
    secondaryMuscles: ["Erector Spinae", "Latissimus Dorsi", "Forearms"],
    category: "Compound",
    force: "Hinge",
    steps: [
      {
        title: "Top Setup",
        desc: "Stand tall holding bar at hip level with shoulder-width grip. Soften knees with a slight unlock.",
      },
      {
        title: "Hip Hinge Backwards",
        desc: "Push hips backward as if reaching for a wall behind you. Keep barbell scraping down along shins.",
      },
      {
        title: "Feel Deep Hamstring Stretch",
        desc: "Hinge down until hamstrings are fully loaded (usually just below knees). Keep back completely flat.",
      },
      {
        title: "Hip Extension",
        desc: "Drive hips forward to return to standing. Squeeze glutes at top without leaning back into hyperextension.",
      },
    ],
    dos: [
      "Maintain fixed knee bend throughout rep (this is a hip hinge, not a squat).",
      "Keep bar close to legs at all times to minimize lower back moment arm.",
    ],
    donts: [
      "Do not round upper or lower back to reach lower.",
      "Do not bend knees excessively into a squat.",
    ],
    breathingCue: "Breathe in and brace at top. Hold hinge position. Exhale as hips drive through.",
  },

  deadlift: {
    guideId: "deadlift",
    name: "Conventional Deadlift",
    primaryMuscles: ["Erector Spinae", "Gluteus Maximus", "Hamstrings"],
    secondaryMuscles: ["Latissimus Dorsi", "Trapezius", "Quadriceps", "Forearms"],
    category: "Compound",
    force: "Hinge",
    steps: [
      {
        title: "Stance & Bar Placement",
        desc: "Stand with bar over mid-foot (1 inch from shins). Feet hip-width apart.",
      },
      {
        title: "Grip & Shins to Bar",
        desc: "Hinge down and grip bar just outside legs. Bring shins forward to touch bar without rolling it.",
      },
      {
        title: "Pull Slack & Engage Lats",
        desc: "Chest up, pull slack out of bar until it clicks. Squeeze armpits shut to pack lats.",
      },
      {
        title: "Leg Press the Floor Away",
        desc: "Drive feet through floor. Keep bar touching legs as knees and hips lock out simultaneously.",
      },
    ],
    dos: [
      "Bar must travel in a strict vertical line over mid-foot.",
      "Engage lats to keep bar pinned close to body throughout.",
    ],
    donts: [
      "Never jerk the bar off the floor without pulling slack first.",
      "Do not round your lumbar spine under heavy load.",
      "Do not hyperextend lower back at the top lockout.",
    ],
    breathingCue: "Take massive breath into abdomen at bottom setup. Lock brace. Exhale after locking out at top.",
  },

  "pull-up": {
    guideId: "pull-up",
    name: "Pull-up",
    primaryMuscles: ["Latissimus Dorsi"],
    secondaryMuscles: ["Biceps Brachii", "Rhomboids", "Middle & Lower Trapezius"],
    category: "Compound",
    force: "Pull",
    steps: [
      {
        title: "Grip & Dead Hang",
        desc: "Pronated (overhand) grip slightly wider than shoulders. Hang with arms straight and core braced.",
      },
      {
        title: "Active Scapular Depression",
        desc: "Pull shoulder blades down away from ears before bending elbows.",
      },
      {
        title: "Drive Elbows Down",
        desc: "Pull yourself up by driving elbows down into back pockets until chin clears bar comfortably.",
      },
      {
        title: "Controlled Descent",
        desc: "Lower body slowly to full dead hang stretch under control.",
      },
    ],
    dos: [
      "Achieve full dead-hang stretch at bottom of each rep.",
      "Lead pull with chest slightly angled up towards bar.",
    ],
    donts: [
      "Avoid kicking legs or kipping for artificial momentum.",
      "Do not roll shoulders forward at top of pull.",
    ],
    breathingCue: "Exhale on way up as you drive elbows down; inhale during controlled lowering.",
  },

  "bent-over-row": {
    guideId: "bent-over-row",
    name: "Barbell Bent Over Row",
    primaryMuscles: ["Latissimus Dorsi", "Rhomboids", "Middle Traps"],
    secondaryMuscles: ["Biceps Brachii", "Rear Deltoids", "Erector Spinae"],
    category: "Compound",
    force: "Pull",
    steps: [
      {
        title: "Hinge Angle (45° to Parallel)",
        desc: "Hold bar with overhand grip just outside knees. Hinge hips back until torso is at 45° angle with flat back.",
      },
      {
        title: "Pull to Lower Ribs",
        desc: "Pull bar towards belly button/lower ribs, leading with elbows and retracting shoulder blades.",
      },
      {
        title: "Squeeze & Return",
        desc: "Pause for brief squeeze at top, then lower bar under full control without jerking torso.",
      },
    ],
    dos: [
      "Keep torso stationary without using hip thrust momentum.",
      "Pull through elbows rather than hands.",
    ],
    donts: [
      "Do not round upper or lower back.",
      "Do not bounce upright on every repetition.",
    ],
    breathingCue: "Inhale at bottom hang; exhale as bar reaches torso.",
  },

  "lat-pulldown": {
    guideId: "lat-pulldown",
    name: "Lat Pulldown",
    primaryMuscles: ["Latissimus Dorsi"],
    secondaryMuscles: ["Biceps Brachii", "Rear Deltoids", "Middle Traps"],
    category: "Compound",
    force: "Pull",
    steps: [
      {
        title: "Setup & Thigh Pad",
        desc: "Secure thigh pad snugly over knees to prevent lifting off seat. Grip bar wider than shoulder width.",
      },
      {
        title: "Lean Slightly Back (10°–15°)",
        desc: "Keep slight backward torso lean with chest open and upright.",
      },
      {
        title: "Pull to Upper Clavicle",
        desc: "Pull bar down to upper chest, driving elbows downward and back.",
      },
      {
        title: "Full Overhead Stretch",
        desc: "Extend arms smoothly back up to full stretch at top without releasing shoulder tension.",
      },
    ],
    dos: [
      "Drive elbows downward and slightly inward into ribs.",
      "Keep chest tall to maximize lat engagement.",
    ],
    donts: [
      "Do not swing torso backwards with momentum to move weight.",
      "Do not pull bar behind neck (strains cervical spine and rotator cuffs).",
    ],
    breathingCue: "Exhale as bar descends to collarbone; inhale on controlled return.",
  },

  "shoulder-press": {
    guideId: "shoulder-press",
    name: "Overhead Barbell Press",
    primaryMuscles: ["Anterior & Lateral Deltoids"],
    secondaryMuscles: ["Triceps Brachii", "Upper Pectoralis", "Trapezius", "Core"],
    category: "Compound",
    force: "Push",
    steps: [
      {
        title: "Rack Position & Grip",
        desc: "Grip bar just outside shoulders with forearms vertical. Rest bar across anterior deltoids.",
      },
      {
        title: "Brace & Head Clearance",
        desc: "Squeeze glutes and quads. Pull chin slightly back to allow bar a vertical clearance path.",
      },
      {
        title: "Vertical Press",
        desc: "Press bar straight up. Once bar clears forehead, bring head forward into 'window' formed by arms.",
      },
      {
        title: "Lockout & Shrug",
        desc: "Lock elbows overhead with traps engaged supporting bar directly over spine and mid-foot.",
      },
    ],
    dos: [
      "Keep glutes and core rock solid to prevent excessive lower back arching.",
      "Lock elbows out fully overhead with bar aligned over mid-foot.",
    ],
    donts: [
      "Do not bend knees into a push press unless intentionally training push presses.",
      "Do not lean back excessively to turn it into an incline bench press.",
    ],
    breathingCue: "Inhale and brace hard at collarbone; press overhead while holding breath or exhaling past forehead.",
  },

  "lateral-raise": {
    guideId: "lateral-raise",
    name: "Dumbbell Lateral Raise",
    primaryMuscles: ["Lateral Deltoids (Side Shoulders)"],
    secondaryMuscles: ["Trapezius", "Supraspinatus"],
    category: "Isolation",
    force: "Push",
    steps: [
      {
        title: "Stance & Starting Position",
        desc: "Stand with slight forward torso tilt (10°–15°). Hold dumbbells at sides with slight elbow bend.",
      },
      {
        title: "Lead with Elbows in Scapular Plane",
        desc: "Raise arms out in scapular plane (30° forward of pure side plane) leading with elbows.",
      },
      {
        title: "Raise to Shoulder Height",
        desc: "Stop when upper arm is parallel to floor. Pause for 0.5s without shrugging traps.",
      },
      {
        title: "Slow Descent",
        desc: "Control descent over 2–3 seconds to maintain lateral delt tension.",
      },
    ],
    dos: [
      "Raise in the scapular plane (~30° forward of direct side).",
      "Control the eccentric descent slowly.",
    ],
    donts: [
      "Do not swing torso or use leg bounce to launch the dumbbells.",
      "Do not raise weights higher than shoulder level as it transfers tension to traps.",
    ],
    breathingCue: "Exhale as dumbbells raise to shoulder height; inhale on descent.",
  },

  "bicep-curl": {
    guideId: "bicep-curl",
    name: "Dumbbell Bicep Curl",
    primaryMuscles: ["Biceps Brachii"],
    secondaryMuscles: ["Brachialis", "Brachioradialis"],
    category: "Isolation",
    force: "Pull",
    steps: [
      {
        title: "Setup",
        desc: "Stand tall holding dumbbells with neutral palms facing inward.",
      },
      {
        title: "Curl & Supinate",
        desc: "Curl weights upward while turning palms up (supination) toward shoulders.",
      },
      {
        title: "Peak Squeeze",
        desc: "Squeeze biceps at top without swinging elbows forward.",
      },
      {
        title: "Controlled Lower",
        desc: "Lower weights over 2 seconds to full elbow extension.",
      },
    ],
    dos: [
      "Keep elbows pinned to your sides throughout the curl.",
      "Actively turn pinkies upward at top for full bicep peak contraction.",
    ],
    donts: [
      "Do not swing lower back or hips to move heavy dumbbells.",
      "Do not cut range of motion short at the bottom.",
    ],
    breathingCue: "Exhale as you curl up; inhale on controlled lowering.",
  },

  "tricep-pushdown": {
    guideId: "tricep-pushdown",
    name: "Tricep Pushdown",
    primaryMuscles: ["Triceps Brachii (Lateral & Medial Heads)"],
    secondaryMuscles: ["Anconeus"],
    category: "Isolation",
    force: "Push",
    steps: [
      {
        title: "Setup",
        desc: "Face cable station with bar or rope attachment at chest height. Pin elbows to sides.",
      },
      {
        title: "Push Down",
        desc: "Extend elbows downward until arms are completely straight.",
      },
      {
        title: "Full Lockout & Squeeze",
        desc: "Squeeze triceps hard at bottom for 1 full second.",
      },
      {
        title: "Return to 90°",
        desc: "Allow forearms to rise back to 90° angle while elbows remain stationary.",
      },
    ],
    dos: [
      "Keep upper arms perpendicular to the floor and locked in place.",
      "Achieve full, crisp tricep lockout at bottom.",
    ],
    donts: [
      "Do not allow elbows to flare outward or drift forward on descent.",
      "Do not lean your upper body over the bar to use body weight.",
    ],
    breathingCue: "Exhale on pushdown; inhale on return.",
  },

  dip: {
    guideId: "dip",
    name: "Parallel Bar Dip",
    primaryMuscles: ["Triceps Brachii", "Lower Pectoralis"],
    secondaryMuscles: ["Anterior Deltoids"],
    category: "Compound",
    force: "Push",
    steps: [
      {
        title: "Support Position",
        desc: "Grip parallel bars and press into straight arm support with shoulders pushed down away from ears.",
      },
      {
        title: "Torso Lean (Triceps vs Chest)",
        desc: "Stay upright for triceps emphasis, or lean torso forward 20°–30° for chest focus.",
      },
      {
        title: "Descent to 90°",
        desc: "Lower body smoothly until elbows reach 90 degrees.",
      },
      {
        title: "Press to Lockout",
        desc: "Press through palms to return to full support at top.",
      },
    ],
    dos: [
      "Keep shoulder blades depressed and stable throughout rep.",
      "Control descent to avoid sudden shoulder joint shock.",
    ],
    donts: [
      "Do not sink into shoulders or let them shrug up toward ears.",
      "Do not descend past 90° if feeling sharp shoulder joint pain.",
    ],
    breathingCue: "Inhale on descent; exhale forcefully on the press up.",
  },

  "hanging-leg-raise": {
    guideId: "hanging-leg-raise",
    name: "Hanging Leg Raise",
    primaryMuscles: ["Rectus Abdominis (Lower Core)"],
    secondaryMuscles: ["Hip Flexors", "Obliques", "Forearms (Grip)"],
    category: "Isolation",
    force: "Pull",
    steps: [
      {
        title: "Dead Hang Setup",
        desc: "Hang from pull-up bar with overhand grip, legs straight, and core engaged.",
      },
      {
        title: "Posterior Pelvic Tilt",
        desc: "Tilt pelvis backward and raise legs forward by curling pelvis toward sternum.",
      },
      {
        title: "Raise to 90° or Parallel",
        desc: "Bring toes to hip height (or higher to bar). Pause for 0.5s.",
      },
      {
        title: "Slow Eccentric Lowering",
        desc: "Lower legs smoothly without swinging body like a pendulum.",
      },
    ],
    dos: [
      "Focus on curling your pelvis upward, not just lifting thighs with hip flexors.",
      "Eliminate swing before beginning the next repetition.",
    ],
    donts: [
      "Do not kick legs wildly with momentum.",
      "Do not let lower back hyper-arch at the bottom of the hang.",
    ],
    breathingCue: "Exhale as you raise your legs; inhale on controlled descent.",
  },

  plank: {
    guideId: "plank",
    name: "Plank",
    primaryMuscles: ["Transverse Abdominis", "Rectus Abdominis"],
    secondaryMuscles: ["Gluteus Maximus", "Deltoids", "Quadriceps"],
    category: "Isolation",
    force: "Hold",
    steps: [
      {
        title: "Forearm Setup",
        desc: "Place forearms on floor with elbows directly under shoulders, hands separated.",
      },
      {
        title: "Body Alignment",
        desc: "Step feet back. Engage glutes and brace core into a completely flat line from head to heels.",
      },
      {
        title: "Active Tension Hold",
        desc: "Actively pull elbows towards toes to create maximal isometric abdominal tension.",
      },
    ],
    dos: [
      "Maintain posterior pelvic tilt (tuck tailbone under).",
      "Keep neck neutral by looking at floor between thumbs.",
    ],
    donts: [
      "Do not allow hips to sag downward toward floor.",
      "Do not pike hips up into a pyramid shape.",
    ],
    breathingCue: "Take shallow, controlled diaphragmatic breaths while maintaining full abdominal brace.",
  },
};

export function getExerciseGuide(guideId?: string | null, exerciseName = ""): ExerciseGuideData {
  if (guideId && EXERCISE_GUIDES[guideId]) {
    return EXERCISE_GUIDES[guideId]!;
  }

  // Fallback matching by name
  const lower = exerciseName.toLowerCase();
  for (const [key, data] of Object.entries(EXERCISE_GUIDES)) {
    if (lower.includes(key.replace(/-/g, " ")) || lower.includes(data.name.toLowerCase())) {
      return data;
    }
  }

  // Generic fallback for custom exercises
  return {
    guideId: guideId || "custom",
    name: exerciseName || "Custom Exercise",
    primaryMuscles: ["Target Muscle"],
    secondaryMuscles: ["Assisting Stabilizers"],
    category: "Compound",
    force: "Push",
    steps: [
      {
        title: "Setup & Stance",
        desc: "Position body with solid, stable base and grip the weight with neutral wrists.",
      },
      {
        title: "Controlled Movement",
        desc: "Move through full, comfortable range of motion with constant muscle tension.",
      },
      {
        title: "Peak Contraction & Return",
        desc: "Briefly pause at peak contraction and control the eccentric return over 2–3 seconds.",
      },
    ],
    dos: [
      "Control the eccentric (lowering) phase smoothly on every repetition.",
      "Maintain neutral spine and stable joint alignment throughout.",
    ],
    donts: [
      "Do not use excessive body momentum or jerk the weights.",
      "Do not sacrifice proper form for heavier weight.",
    ],
    breathingCue: "Exhale through the effort/concentric phase; inhale smoothly on the return.",
  };
}
