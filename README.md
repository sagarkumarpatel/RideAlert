# RideAlert

RideAlert is an end-to-end intelligent driver monitoring system that uses Android smartphones to detect driver fatigue in real-time and instantly syncs critical alerts to a centralized Node.js/React Fleet Dashboard.

## 🚀 System Architecture

The project consists of three main components:

1. **RideAlert Android App** (Smart Dashcam)
   - Built with **Kotlin** and Jetpack Compose.
   - Uses **CameraX** and **Google ML Kit** for real-time facial recognition and eye-closure detection (microsleeps).
   - Fuses signals into a state machine (`NORMAL` -> `WARNING` -> `CRITICAL`).
   - Uses **Retrofit** to sync alerts to the cloud over REST APIs.

2. **Node.js Backend** (Cloud Brain)
   - Built with **Express.ts** and **Prisma ORM**.
   - Uses **PostgreSQL** for relational storage of trips, fleets, devices, and fatigue events.
   - Exposes REST APIs for the Android app to push data, and for the Dashboard to pull data.

3. **React Fleet Dashboard** (Monitoring Station)
   - Built with **React** and **Vite**.
   - Auto-refreshes every 3 seconds to display live fatigue trends and critical alerts.
   - Visualizes data using **Recharts**.

## 🛠️ Setup Instructions

### 1. Database & Backend
- Ensure PostgreSQL is running.
- In `ridealert-backend-node/.env`, set `DATABASE_URL`.
- Run `npx prisma db push` to sync the schema.
- Run `npm install` and `npm run dev` to start the Express server on port `3000`.

### 2. Fleet Dashboard
- Navigate to `ridealert-dashboard`.
- Run `npm install` and `npm run dev` to start the Vite server.
- Open `http://localhost:5173` in your browser.

### 3. Android App
- Open `ridealert-android` in Android Studio.
- Update `BASE_URL` in `RideAlertApi.kt` to match your laptop's local IPv4 address (e.g., `http://192.168.x.x:3000`).
- Connect a physical Android device (emulators cannot test live camera streams effectively).
- Build and run the app. Grant Camera permissions.
- Close your eyes to trigger a warning/critical state and watch the React dashboard update in real-time!

## 📦 Current Progress

- **Phase 1:** Initialized Node.js backend and React dashboard.
- **Phase 2:** Configured Prisma schema and PostgreSQL database.
- **Phase 3:** Built the Android core using CameraX and ML Kit.
- **Phase 4:** Integrated Android app with the Node.js backend for live End-to-End syncing.

- **Phase 5:** Built Offline-First Room DB synchronization, advanced Audio/Haptic alerting, and Motion Sensor Fusion.
- **Phase 6:** Implemented JWT-based Driver/Admin authentication, FusedLocationProvider GPS tracking, and a Live React-Leaflet Map Dashboard.
