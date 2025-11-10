# How to Convert Your Hydrate App into Production Apps

This guide explains how to build your Expo/React Native app for different platforms.

## Prerequisites

1. **Node.js** installed (v18 or higher)
2. **Expo CLI** installed globally:
   ```bash
   npm install -g expo-cli
   ```
3. **EAS CLI** for mobile builds (install globally):
   ```bash
   npm install -g eas-cli
   ```

## Option 1: Build for Web (PWA - Progressive Web App)

Your app already supports web! You can build it immediately:

### Steps:
1. **Build the web version:**
   ```bash
   npm run build:web
   ```
   or
   ```bash
   npm run build
   ```

2. **Output:** The built files will be in the `dist/` folder

3. **Deploy to hosting:**
   - Upload the `dist/` folder to any web hosting service:
     - **Vercel**: `vercel --prod`
     - **Netlify**: Drag and drop the `dist/` folder
     - **GitHub Pages**: Push `dist/` folder
     - **Any web server**: Upload files via FTP

## Option 2: Build for iOS (iPhone/iPad)

### Steps:

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS Build** (first time only):
   ```bash
   eas build:configure
   ```
   This creates an `eas.json` file.

4. **Build for iOS:**
   ```bash
   npm run build:ios
   ```
   or
   ```bash
   eas build --platform ios
   ```

5. **Build Options:**
   - **Development Build**: For testing on your device
   - **Production Build**: For App Store submission
   - **Ad-hoc Build**: For internal testing (requires Apple Developer account)

6. **App Store Submission:**
   - After build completes, download the `.ipa` file
   - Use **Transporter** app or **Xcode** to submit to App Store
   - Or use: `eas submit --platform ios`

### Requirements for iOS:
- **Apple Developer Account** ($99/year) - Required for App Store
- **macOS** - Required for local builds (optional with EAS cloud builds)

## Option 3: Build for Android

### Steps:

1. **Install EAS CLI** (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS Build** (first time only):
   ```bash
   eas build:configure
   ```

4. **Build for Android:**
   ```bash
   npm run build:android
   ```
   or
   ```bash
   eas build --platform android
   ```

5. **Build Options:**
   - **APK**: For direct installation (testing)
   - **AAB**: For Google Play Store submission

6. **Google Play Submission:**
   - After build completes, download the `.aab` file
   - Upload to Google Play Console
   - Or use: `eas submit --platform android`

### Requirements for Android:
- **Google Play Developer Account** ($25 one-time fee) - Required for Play Store

## Option 4: Build All Platforms at Once

```bash
eas build --platform all
```

## Testing Before Building

1. **Test on your device:**
   ```bash
   npm run dev
   ```
   Then scan the QR code with:
   - **iOS**: Camera app or Expo Go app
   - **Android**: Expo Go app

2. **Test on emulator/simulator:**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator

## Important Notes

1. **App Icons & Splash Screens:**
   - Your app icon is at: `./assets/images/icon.png`
   - Make sure it's 1024x1024 pixels for best results

2. **Bundle Identifiers:**
   - iOS: `com.hydrate.app` (configured in `app.json`)
   - Android: `com.hydrate.app` (configured in `app.json`)
   - Change these if needed for your organization

3. **Permissions:**
   - Your app requests notification permissions
   - Android permissions are configured in `app.json`

4. **Service Worker:**
   - Web builds automatically include service worker for PWA functionality
   - Works offline after first load

## Quick Commands Reference

```bash
# Development
npm run dev                    # Start development server

# Web Build
npm run build:web              # Build for web (PWA)

# Mobile Builds (requires EAS account)
npm run build:ios              # Build iOS app
npm run build:android          # Build Android app

# Testing
npm run typecheck              # Type check
npm run lint                   # Lint code
```

## Need Help?

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Expo Forums**: https://forums.expo.dev

