# Building an installable app (Android APK & iOS IPA)

How to turn the app into an installable build on your phone without Expo Go.
Run every command from `apps/mobile/`.

The build bundles the JavaScript, so the app runs fully offline with no dev
server. Keep using Expo Go (`npx expo start`) for day-to-day development and
build a standalone package only when you want a stable version installed.

---

# Part 1: Android (APK)

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
     "package": "com.bryan.myfitnesstrackingapp",
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

# Part 2: iOS (IPA / Sideloading)

Unlike Android which allows direct APK sideloading with a simple toggle, Apple
strictly restricts iOS app installation. An **`.ipa`** is the iOS equivalent of
an APK, but iOS will refuse to install it unless it is signed with a valid Apple
Provisioning Profile tied to your device.

You have two main paths to install on your iPhone without the App Store:

| Method | Apple Account Needed | Ease of Install | Limitations |
| :--- | :--- | :--- | :--- |
| **Option A: EAS Internal (Ad Hoc)** | Paid Apple Developer ($99/yr) | Very easy (QR scan / Safari link) | Requires paid Apple account |
| **Option B: Sideloading (Sideloadly / AltStore)** | Free Personal Apple ID | Moderate (PC + USB cable) | Must re-sign every 7 days; max 3 apps |
| **Option C: iOS Simulator** | None (Free) | Easy (Mac only) | Mac only, virtual simulator |

---

## One-time iOS setup (All methods)

Add `bundleIdentifier` to `app.json` under `expo.ios` (alongside `expo.android`):

```json
"ios": {
  "supportsTablet": false,
  "bundleIdentifier": "com.bryan.myfitnesstrackingapp",
  "infoPlist": {
    "NSCameraUsageDescription": "This app uses the camera to scan product barcodes."
  }
}
```

**Keep this ID permanent.** Like Android's package name, changing it creates a
separate app on the device.

---

## Option A: EAS Internal Distribution (Paid Apple Developer Account)

If you have an active Apple Developer Program membership ($99/year), you can
install the `.ipa` directly over-the-air via Safari/QR code.

### 1. Register your iPhone's UDID with EAS

Run from `apps/mobile/`:

```powershell
eas device:create
```

Follow the on-screen prompt:
1. It generates a URL / QR code.
2. Open that URL on your **iPhone using Safari**.
3. Install the temporary configuration profile when prompted (Settings →
   Profile Downloaded → Install).
4. This securely registers your iPhone's UDID into your Apple Developer account
   and EAS.

### 2. Configure `eas.json` for iOS internal distribution

Make sure `eas.json` has `distribution: internal`:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "ios": {
        "simulator": false
      }
    }
  }
}
```

### 3. Run the iOS build

```powershell
eas build -p ios --profile preview
```

- When prompted for credentials, log in with your Apple Developer account.
- Let EAS generate and manage your iOS Distribution Certificate and
  Provisioning Profile automatically.
- Once completed, open the provided Expo URL on your registered iPhone in
  **Safari**, tap **Install**, and the app will install on your home screen.
- On iOS 16+, you may need to enable Developer Mode:
  **Settings → Privacy & Security → Developer Mode → On** (requires restart).

---

## Option B: Free Sideloading via Sideloadly (No paid developer account)

If you **do not** have a paid Apple Developer account, you can use your standard
free personal Apple ID and a PC utility like **Sideloadly** or **AltStore**.

### 1. Configure EAS to build an `.ipa` for Ad Hoc / Internal

In `eas.json`, keep `"distribution": "internal"`.

Run:
```powershell
eas build -p ios --profile preview
```

When prompted, log in with your free Apple ID. EAS will generate an `.ipa`
archive file once the build succeeds. Download this `.ipa` file to your PC from
the expo.dev build link.

*(Alternative if you have a Mac: run `npx expo prebuild -p ios` and archive the
runner in Xcode using your personal free team).*

### 2. Install Sideloadly on your Windows PC

1. Download and install **Sideloadly** (from https://sideloadly.io).
2. Install iTunes and iCloud for Windows (non-Microsoft Store versions as
   recommended by Sideloadly) so your PC can communicate with your iPhone over
   USB.

### 3. Sideload the IPA

1. Connect your iPhone to your PC with a lightning/USB-C cable and tap **Trust
   This Computer** on your phone.
2. Open Sideloadly on your PC:
   - Your connected iPhone should appear in the device dropdown.
   - Enter your personal Apple ID email under **Apple ID**.
   - Drag and drop the downloaded `.ipa` file into Sideloadly.
3. Click **Start**. Sideloadly will sign the `.ipa` with your personal Apple ID
   certificate and push it to your iPhone.
4. On your iPhone:
   - Go to **Settings → General → VPN & Device Management**.
   - Under *Developer App*, tap your Apple ID and select **Trust**.
   - (iOS 16+): Go to **Settings → Privacy & Security → Developer Mode** and
     turn it **On** (phone will reboot).

> [!NOTE]
> **Free Apple ID Limitation:** Free developer signatures expire after **7
> days**. Sideloadly supports automatic Wi-Fi refresh if your PC and iPhone
> are on the same network, or you can simply reconnect your phone and re-click
> Start every week to keep the app working. Data in SQLite is preserved during
> refresh.

---

## Option C: iOS Simulator build (Mac only, Free)

If you have a Mac and just want to run the standalone app in the Xcode
Simulator without any physical device signing:

1. In `eas.json`, set `"simulator": true`:
   ```json
   "preview": {
     "distribution": "internal",
     "ios": {
       "simulator": true
     }
   }
   ```
2. Run:
   ```powershell
   eas build -p ios --profile preview
   ```
3. Download the resulting `.tar.gz`, extract the `.app`, and drag it directly
   into the macOS Simulator.

---

# Checklist before each release build

Run these from `apps/mobile/`:

- [ ] `npx tsc --noEmit` passes
- [ ] `npx expo lint` passes
- [ ] `npx expo-doctor` is clean
- [ ] Bump `version` in `app.json` (e.g. `1.0.0` → `1.0.1`)
- [ ] **Export the data first** (JSON export in the app), in case anything goes
      wrong during update

## Updating the installed app

Install the new build over the old one. As long as the **bundle identifier /
package name** and **signing profile** match, your SQLite data and settings are
retained. Do not uninstall the old app before installing the update, or your
local database will be erased.
