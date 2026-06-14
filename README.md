# Habit Tracker

A simple, local habit tracker with a dark theme, GitHub-style heatmaps, streak counters, weekly stats, optional notes, and reminders.

## How to run this on your computer

### 1. Install Node.js
If you don't have it yet, download and install Node.js (LTS version) from https://nodejs.org

### 2. Open this folder in a terminal
Navigate to the `habit-tracker` folder using your terminal / command prompt:

```
cd path/to/habit-tracker
```

### 3. Install dependencies
```
npm install
```

This downloads React, Vite (the dev server), and Recharts (for the charts).

### 4. Start the app
```
npm run dev
```

This will print a local URL (usually `http://localhost:5173`). Open it in your browser — that's your app!

### 5. Make changes
- The whole app lives in `src/App.jsx`. Edit it, save, and the browser will auto-refresh.
- Your habit data is saved in your browser's local storage, so it persists between visits (but only on that browser/device).

## How to use the app

- **Add a habit**: click "Add habit", give it a name, pick a color, set frequency, and optionally turn on a daily reminder.
- **Mark today done**: click the circle next to the habit name.
- **Toggle any past day**: click a square in the heatmap.
- **Add a note to a day**: double-click a square in the heatmap.
- **Edit or delete a habit**: click "Edit" on a habit card.
- **Reminders**: if enabled, your browser will ask for notification permission. Reminders only fire while the app tab is open.

## Notes on reminders
Browser notifications only work while this tab/app is open in your browser. For "real" phone-style reminders that work when the app is closed, you'd eventually need to convert this to a mobile app (e.g. with React Native or Capacitor) — happy to help with that step later.

## Next steps / ideas
- Add cloud sync (e.g. with Supabase) so data follows you across devices.
- Wrap with Capacitor to turn it into a real Android/iOS app.
- Add export/import of your data as a JSON file.
