<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1UzovQi8_ZF4lIK36zVhA0NdvzogXmfUO

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Desktop (Tauri)

### Set the app icon

1. Save your source icon as: src-tauri/icons/icon.png
2. Regenerate all Tauri icons (including icon.ico):
   `npm run tauri:icon`

Then run the desktop app:
`npm run tauri:dev`

## Offline testing

### Web (PWA asset caching)

1. Build and preview:
    `npm run build`
    `npm run preview`
2. Open the preview URL in a browser, then open DevTools → Network and check “Offline”.
3. Hard reload the page.

If the app loads while offline, the service worker is caching build assets correctly.

To simulate a fresh install (web):

- In DevTools → Application:
   - Clear Storage → “Clear site data”
   - Service Workers → “Unregister”
   - Then reload.

### Desktop (Tauri)

- Cold boot offline: build once, disconnect internet, and launch the installed app.
- Simulate a fresh install:
   - Uninstall the app (or delete its app data folder), then reinstall.
   - “Clear All Data” in Settings clears localStorage, but does not remove auto-backup files.
