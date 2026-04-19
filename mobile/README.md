# SalesCRM Mobile App

React Native (Expo) mobile app for SalesCRM.

## Setup

1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Set your server URL in `src/api/client.ts`:
   - Android emulator: `http://10.0.2.2:8000`
   - Physical device: `http://YOUR_LAN_IP:8000`
   - Production: `https://yourdomain.com`

3. Create placeholder icons (required by Expo):
   ```bash
   npx expo install expo-asset
   ```
   Or copy any PNG as assets/icon.png, assets/splash.png, assets/adaptive-icon.png

4. Start development:
   ```bash
   npx expo start
   ```
   Then press `a` for Android emulator or scan QR with Expo Go app.

5. Build APK:
   ```bash
   npx eas build --platform android --profile preview
   ```

## Screens
- Login
- Dashboard (stats + recent leads)
- Leads (search, filter, infinite scroll)
- Lead Detail (timeline, call, status update, comment)
- Add Lead
- Profile
