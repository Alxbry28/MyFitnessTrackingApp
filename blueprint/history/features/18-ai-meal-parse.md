# Feature: AI meal parse

**From build-plan:** feature 18
**Build attempt:** 1
**Status:** verified
**Branch:** `feature/ai-meal-parse`

## Goal

Epic D / Feature 18 in `1_docs/business_analyst/user_story/01_user_story.md` (§3, D1-D4):
1. **Natural meal text input:** Paste natural meal logs (e.g., Breakfast: 220g taho; Lunch: 250g white rice, 110g boiled eggs, 250g boiled chicken breast, 50g okra).
2. **AI Nutrition Lookup (Gemini / OpenAI):** Direct React Native fetch to Google Gemini 1.5 Flash (free tier) or OpenAI. The AI extracts meals, items, portion grams, calories, protein, carbs, and fat per item and per 100g.
3. **Structured Preview & Review:** Review parsed foods grouped by meal with item macros and meal totals. Allow adjusting grams or values before saving.
4. **1-Tap Save to SQLite:** Save entries to `food_log_entries`, update Today's calorie ring and macro progress, and automatically save new foods to `products` library for offline reuse.
5. **AI Settings:** Configure Gemini API key (or OpenAI key) in Settings with a helpful guide link.

## In scope

- **Settings integration (`settingsRepo.ts`):**
  - Store `ai_api_key` and `ai_provider` (`"gemini" | "openai"`).
  - UI in `apps/mobile/src/app/(tabs)/settings.tsx` with API key field, provider selector, and instructions for getting a free key from Google AI Studio.
- **Pure AI parser service (`aiMealParser.ts`):**
  - Prompt engineering with structured JSON schema for meals, foods, grams, and macros.
  - Gemini 1.5 Flash & OpenAI compatible callers.
  - Robust error handling (invalid key, rate limits, network offline, malformed responses).
- **Screens & UI Integration:**
  - Enhance `apps/mobile/src/app/paste-log.tsx` with a prominent **"✨ Parse with AI"** action and AI review preview.
  - Add "✨ AI Meal Parse" option to `QuickAddSheet.tsx`.
  - Save parsed meals directly to local SQLite database (`foodLogRepo` + `productRepo`).

## Out of scope

- Backend proxy server (runs 100% in React Native).
- Audio speech-to-text recording (text/paste first).

## Build steps

- [x] 1. **Settings persistence & AI config UI.** Add `getAiApiKey`, `setAiApiKey`, `getAiProvider`, `setAiProvider` to `settingsRepo.ts`. Add AI Configuration Card in `apps/mobile/src/app/(tabs)/settings.tsx`. Done when typecheck and lint pass.
- [x] 2. **AI Meal Parser service.** Create `apps/mobile/src/modules/nutrition/services/aiMealParser.ts` with direct Gemini Flash / OpenAI structured JSON fetch, validation, and schema parsing. Done when typecheck and lint pass.
- [x] 3. **AI Parse integration & Preview UI.** Update `apps/mobile/src/app/paste-log.tsx` to add "✨ Parse with AI" button, loading state, AI preview review screen, and batch SQLite log + product save. Add AI quick-add button in `QuickAddSheet.tsx`. Done when typecheck, lint, and `npx expo-doctor` pass.

## Verification

Evidence:
- `npm.cmd run typecheck`: clean exit code 0.
- `npx.cmd expo lint`: clean exit code 0.
- `npx.cmd expo-doctor`: 21/21 checks passed. No issues detected.
