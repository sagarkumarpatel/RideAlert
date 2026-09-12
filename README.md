# RideAlert 🚗🚨

RideAlert is an end-to-end intelligent driver monitoring system that uses Android smartphones to detect driver fatigue in real-time and instantly syncs critical alerts to a centralized Node.js/React Fleet Dashboard.

## 🚀 System Architecture

The project is structured as a monorepo containing three main components:

### 1. RideAlert Android App (Smart Dashcam)
*Located in `/ridealert-android`*
- Built with **Kotlin** and Jetpack Compose.
- Uses **CameraX** and **Google ML Kit** for real-time facial recognition and eye-closure detection (microsleeps).
- Implements **Motion Sensor Fusion** to detect phone shaking (simulating swerving or erratic driving).
- Fuses signals into a state machine (`NORMAL` -> `WARNING` -> `CRITICAL`).
- Uses **FusedLocationProvider** to actively track high-accuracy GPS coordinates during active trips.
- Implements an **Offline-First Room Database** and **WorkManager** to queue alerts when offline and sync them via **Retrofit** when the network is restored.
- Triggers advanced **Audio and Haptic alerts** to wake up drowsy drivers.

### 2. Node.js Backend (Cloud Brain)
*Located in `/ridealert-backend-node`*
- Built with **Express.ts** and **Prisma ORM**.
- Uses **PostgreSQL** for relational storage of trips, fleets, devices, drivers, and fatigue events.
- Secures endpoints using **JWT-based Authentication**.
- Exposes REST APIs for the Android app to push telemetry data, and for the React Dashboard to pull real-time analytics.

### 3. React Fleet Dashboard (Monitoring Station)
*Located in `/ridealert-dashboard`*
- Built with **React**, **Vite**, and **Tailwind CSS**.
- Features an Admin Login portal for secure access.
- Auto-refreshes every 3 seconds to display live fatigue trends and critical alerts.
- Visualizes time-series data using **Recharts**.
- Renders a Live **React-Leaflet Map** to pinpoint exactly where on the road fatigue events occurred.
- Includes comprehensive sub-pages for managing **Registered Drivers** and exploring historical **Fatigue Event Logs**.

## 🛠️ Setup Instructions

### 1. Database & Backend
- Ensure PostgreSQL is installed and running on your machine.
- In `ridealert-backend-node/.env`, set `DATABASE_URL` to point to your local PostgreSQL instance (e.g., `postgresql://postgres:password@localhost:5432/ridealert?schema=public`).
- Run `npx prisma db push` to sync the database schema.
- Run `npm install` and `npm run dev` to start the Express server on port `3000`.

### 2. Fleet Dashboard
- Navigate to `ridealert-dashboard`.
- Run `npm install` and `npm run dev` to start the Vite server.
- Open `http://localhost:5173` in your browser.
- Login using the default Admin credentials.

### 3. Android App
- Open `ridealert-android` in Android Studio.
- Update `BASE_URL` in `RideAlertApi.kt` to match your laptop's local IPv4 address (e.g., `http://192.168.x.x:3000/`). *Note: `localhost` will not work on a physical device.*
- Connect a physical Android device (emulators cannot test live camera streams effectively).
- Build and run the app. 
- Log in using a valid Driver ID and PIN (e.g., ID: `DRV-001`, PIN: `1234`).
- Grant Camera and Location permissions when prompted. Ensure your device's GPS toggle is turned on.
- Close your eyes or shake the phone to trigger a warning/critical state and watch the React dashboard update in real-time!

## 📦 Project Status

This project is feature-complete for its initial release. All planned phases have been successfully implemented:
- ✅ Node.js backend and React dashboard initialization.
- ✅ Prisma schema and PostgreSQL database configuration.
- ✅ Android core using CameraX and ML Kit.
- ✅ Live End-to-End syncing via REST APIs.
- ✅ Offline-First Room DB synchronization, Audio/Haptic alerting, and Motion Sensor Fusion.
- ✅ JWT Authentication, FusedLocationProvider GPS tracking, and a Live React-Leaflet Map Dashboard.
- ✅ Comprehensive Driver Management and Fatigue Event Log pages.
