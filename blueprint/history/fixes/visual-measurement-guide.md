# Fix: Visual body measurement guide screen and entry points

**Type:** Fix
**Status:** verified
**Branch:** `fix/visual-measurement-guide`

## The problem

The app has body measurement tracking (Feature 20), but users cannot easily find or see the measurement guide. In the prototype ([`prototypes/measure-guide.html`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/prototypes/measure-guide.html)) and documentation ([`1_docs/guides/body_measurement_guide.md`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/1_docs/guides/body_measurement_guide.md)), a comprehensive visual measurement guide was specified with an interactive body silhouette map, anatomical tape placement diagrams, site-by-site how-to instructions, landmark consistency distances, and common mistake callouts.

In the shipped mobile app, this was reduced to brief text bullets tucked inside the "Sites & Guide" settings screen ([`apps/mobile/src/app/measurements/sites.tsx`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/apps/mobile/src/app/measurements/sites.tsx)), with no visual diagrams, no anatomical illustrations, and no prominent entry point from the Progress tab or Measurements hub.

## The fix

1. **New dedicated screen [`apps/mobile/src/app/measurements/guide.tsx`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/apps/mobile/src/app/measurements/guide.tsx) (`/measurements/guide`):**
   - Built to match `prototypes/measure-guide.html` (Frames 1 & 2) and `1_docs/guides/body_measurement_guide.md`.
   - Interactive body silhouette SVG map with numbered anatomical pins (1–9: Neck, Shoulders, Chest, Upper arm, Forearm, Waist, Hips, Thigh, Calf) highlighting active tracked status from user profile.
   - Interactive site inspector: tapping any site displays its anatomical diagram (tape placement and landmark reference lines), how-to steps, common mistakes (with ✕ callouts), and "same spot every time" landmark advice.
   - "Before you start" checklist card (soft tailor's tape, morning timing, mirror, posture).
   - "Golden rules" card (consistency, tape tension, measure twice, 2-4 week cadence, flexed vs relaxed).
   - Action buttons: "Customize tracked sites" and "Log measurements".
2. **Prominent Entry Points:**
   - On [`apps/mobile/src/app/measurements/index.tsx`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/apps/mobile/src/app/measurements/index.tsx): Add a dedicated "How to Measure Guide" card with preview illustration and a quick "Guide" action in the app bar.
   - On [`apps/mobile/src/app/measurements/log.tsx`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/apps/mobile/src/app/measurements/log.tsx): Add a "Guide ›" link in the header / sites section.
   - On [`apps/mobile/src/app/(tabs)/progress.tsx`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/apps/mobile/src/app/(tabs)/progress.tsx): Add a "Guide" link in the Body Measurements card header.
   - On [`apps/mobile/src/app/measurements/sites.tsx`](file:///c:/Users/Bryan/Desktop/mine/1_personal/draft/fitness_app/apps/mobile/src/app/measurements/sites.tsx): Add a "View visual guide with diagrams ›" banner at the top of the card.

## Build steps

- [x] 1. **Implement `measurements/guide.tsx` screen and SVG anatomical components.**
  - Create the SVG body map and anatomical site placement illustrations using `react-native-svg`.
  - Include "Before you start", "Golden rules", interactive site inspector with mistakes and landmark guidance, and quick actions.
  - Done when `cmd /c npm run typecheck` and `cmd /c npx expo lint` pass with zero errors.
- [x] 2. **Integrate entry points across Progress, Measurements Hub, Sites, and Log screens.**
  - Add guide banner/link in `apps/mobile/src/app/measurements/index.tsx`.
  - Add guide link in `apps/mobile/src/app/measurements/log.tsx`.
  - Add guide entry in `apps/mobile/src/app/(tabs)/progress.tsx`.
  - Add visual guide link in `apps/mobile/src/app/measurements/sites.tsx`.
  - Done when `cmd /c npm run typecheck` and `cmd /c npx expo lint` pass with zero errors.

## Verify

1. Run `npx expo start` and inspect in mobile preview.
2. From Progress tab, tap "Guide" -> confirm `/measurements/guide` opens cleanly.
3. Verify the SVG body map renders with site pins corresponding to tracked sites.
4. Tap different sites (Chest, Waist, Arm, Thigh) -> verify anatomical diagram, how-to instructions, and common mistakes appear.
5. Tap "Log measurements" -> verify it navigates to `/measurements/log`.
