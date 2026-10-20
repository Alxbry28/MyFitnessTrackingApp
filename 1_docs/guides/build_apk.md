# Building an installable APK

How to turn the app into an APK you can install on the phone without Expo Go.
Run every command from `apps/mobile/`.

The APK bundles the JavaScript, so the app runs fully offline with no dev
server. Keep using Expo Go (`npx expo start`) for day-to-day development and
build an APK only when you want a stable version installed.

---

## Option A: EAS cloud build (recommended)

Expo builds the APK on its servers, so no Java or Gradle is needed locally. The
free plan includes a monthly quota of Android builds, which is enough for a
personal app.

### One-time setup

1. Install the CLI and log in (free expo.dev account):

   ```powershell
   npm install -g eas-cli
   eas login
   ```

2. Link the project and create `eas.json`:

   ```powershell
   eas build:configure
   ```

3. Make sure `eas.json` has a `preview` profile that outputs an **APK**. The
   default output is `.aab`, which is for the Play Store and can't be
   installed directly:

   ```json
   {
     "build": {
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" }
       },
       "production": {}
     }
   }
   ```

4. Set a permanent Android package name in `app.json` under `expo.android`
   (the first build prompts for it if it's missing):

   ```json
   "android": {
     "package": "com.bryan.myfitness",
     ...
   }
   ```

   **Never change it later.** A different package name is a different app to
   Android: it installs alongside the old one and starts with an empty
   database.

### Every build

```powershell
eas build -p android --profile preview
```

- First build only: when asked about a keystore, let EAS **generate and store
  it**. Every later APK is then signed with the same key, so it installs as an
  update and the local SQLite data is kept.
- When the build finishes, open the link or scan the QR code on the phone,
  download the APK, and allow "install unknown apps" for the browser when
  Android asks.
- Past builds are listed at expo.dev → your project → Builds.

---

## Option B: Local build (no Expo account)

Needs JDK 17 and the Android SDK (`ANDROID_HOME` is already set on this PC).

```powershell
npx expo prebuild -p android
cd android
./gradlew assembleRelease
```

The APK lands in `android/app/build/outputs/apk/release/`.

Caveats:

- It's signed with the **debug key** unless you set up your own release
  keystore. Switching keys later means uninstalling, which wipes the app's
  data.
- `prebuild` generates an `android/` folder. Either add it to `.gitignore`
  (regenerate on demand) or commit it. Don't hand-edit it while it's
  ignored.

---

## Before each release build

Run these from `apps/mobile/`:

- [ ] `npx tsc --noEmit` passes
- [ ] `npx expo lint` passes
- [ ] `npx expo-doctor` is clean
- [ ] Bump `version` in `app.json` (e.g. `1.0.0` → `1.0.1`) so you can tell
      builds apart in Android settings
- [ ] **Export the data first** (JSON export in the app), in case the install
      goes wrong

## Updating the installed app

Install the new APK over the old one. As long as the **package name** and the
**signing key** are the same, Android updates in place and keeps your data. If
Android says "App not installed" or reports a conflict, one of those two
changed. Don't uninstall until you've exported your data.
