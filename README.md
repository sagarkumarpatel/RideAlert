# 🛡️ RideAlert Dashboard

RideAlert is a comprehensive, real-time driver monitoring and safety ecosystem designed to prevent accidents caused by fatigue, microsleeps, and erratic driving behavior. The system consists of an Android client application running on edge devices in the vehicle, a robust backend API for event processing, and a high-performance web dashboard (this repository) for real-time fleet management.

---

## 🚀 1. Project Overview & Architecture

**Purpose:** 
The `ridealert-dashboard` serves as the central command center for fleet managers to monitor driver safety in real time. It aggregates telemetric data, visualizes fatigue trends, and highlights critical incidents (e.g., micro-sleeps or sudden impacts) immediately as they are reported from the driver's device.

**System Architecture Flow:**
1. **Edge Detection (Android App):** The driver's Android device runs continuous, offline-first computer vision (ML Kit) and hardware sensor (Accelerometer/Gyroscope) analysis to detect fatigue and motion anomalies locally.
2. **Event Sync (Backend Node.js API):** Critical incidents (Warning/Critical fatigue) or sudden impacts trigger an immediate payload to the backend via HTTP/REST. If offline, events are cached via Room DB and synced later via Android WorkManager.
3. **Data Visualization (React Dashboard):** The web dashboard continuously polls the backend API (every 3 seconds) to reflect the live status of the fleet, update active driver counts, and populate the real-time Incident Map.

---

## 👁️ 2. Eye & Drowsiness Detection Logic (In-Depth)

The Android client handles eye and face tracking locally to ensure zero latency and maximum privacy.

* **Detection Algorithm:** Google ML Kit Vision API (`FaceDetection`).
* **Configuration:** `PERFORMANCE_MODE_FAST`, `CLASSIFICATION_MODE_ALL`.
* **Metric Calculation:** The ML Kit provides `leftEyeOpenProbability` and `rightEyeOpenProbability` (ranging from `0.0` to `1.0`).

**Exact Thresholds (from `EyeStateTracker.kt`):**
* **Blink/Closure Threshold:** An eye is considered "closed" if `OpenProbability < 0.3f`. Both eyes must fall below this threshold simultaneously to trigger closure logic (`leftEyeOpen < 0.3f && rightEyeOpen < 0.3f`).
* **Warning Alert (Drowsiness):** If both eyes remain closed continuously for **`>= 1000ms` (1 second)**, a `WARNING` fatigue event is triggered.
* **Critical Alert (Micro-sleep):** If both eyes remain closed continuously for **`>= 2000ms` (2 seconds)**, a `CRITICAL` fatigue event is triggered.

**Alert Escalation:**
* Upon triggering a `CRITICAL` event, the Android app plays an immediate loud alarm (using the default device alarm ringtone), triggers a severe haptic vibration pattern (`[0, 500, 200, 500, 200, 500]`), and displays a red full-screen overlay.
* This event is instantly dispatched to the backend, storing it in PostgreSQL via Prisma, which the dashboard retrieves on its next polling cycle.

---

## 🚨 3. Fall & Sudden Movement Detection Logic (In-Depth)

The system detects severe impacts, rapid swerving, and falls using device hardware sensors.

* **Sensor Data Ingestion:** Uses Android `SensorManager` listening to `TYPE_ACCELEROMETER` and `TYPE_GYROSCOPE` at `SENSOR_DELAY_NORMAL`.

**Exact Thresholds (from `DriftPatternDetector.kt`):**
* **Acceleration Spike (Impact/Hard Braking):** The G-force magnitude is calculated as `sqrt(x² + y² + z²)`. If the calculated force exceeds the **`shakeAccelerationThreshold = 15.0f` m/s²** (standard gravity is ~9.8m/s²), a critical `MOTION` event is triggered.
* **Angular Velocity (Sharp Correction/Swerve):** If the absolute delta between consecutive Gyroscope `X` or `Y` readings exceeds the **`sharpCorrectionThreshold = 2.0f` rad/s**, a critical `MOTION` event is triggered.
* **Debounce / Event Throttling:** A hardcoded `2000ms` (2-second) cooldown window is applied after any detected event to prevent flooding the backend with duplicate readings during a sustained incident. There is no delayed static verification window; the alert triggers instantaneously upon crossing the threshold.

---

## 📊 4. Active Driver Fleet Management Mechanics

The system meticulously tracks which drivers are currently behind the wheel to provide an accurate "Active Drivers" metric on the dashboard.

* **Driver State Machine:** 
  * `NORMAL`: Camera active, monitoring driver.
  * `WARNING`: Eyes closed > 1 sec.
  * `CRITICAL`: Eyes closed > 2 sec.
* **Real-Time Counter Logic (`server.ts` & `CameraPreviewScreen.kt`):**
  * When a driver taps "Start Driving" in the Android app, a new `Trip` record is created in the database with `status = 'ACTIVE'` and the current timestamp.
  * The dashboard calculates "Active Drivers" by counting distinct `driverId`s that possess a Trip where `status == 'ACTIVE'`.
  * **Termination (Expected):** When a driver navigates away from the camera screen (e.g., clicks the Profile or Activity tab) or manually taps "Stop Driving", a `DisposableEffect` in Jetpack Compose triggers the `/api/trips/:tripId/end` endpoint, changing the status to `COMPLETED`. The dashboard counter immediately decrements by 1 on its next 3-second poll.
  * **Termination (Crash/Force Kill Fallback):** To prevent "ghost" drivers from inflating the active count if the app crashes or is killed by the OS without sending the End Trip signal, the backend applies a strict 24-hour expiration query filter on active trips.

---

## 🛠️ 5. Tech Stack & Setup Instructions

### Technology Stack
* **Frontend Dashboard:** React 19, Vite, React Router DOM, Recharts (for analytics), React-Leaflet (for maps), Axios.
* **Backend API:** Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL.
* **Android Client:** Kotlin, Jetpack Compose, CameraX, Google ML Kit Vision, Room Database, WorkManager, Retrofit.

### Environment Variables (`.env`)
The frontend dashboard currently relies on standard Vite configuration and proxying. Ensure your backend has the following configured:
```env
# Backend .env
DATABASE_URL="postgresql://user:password@localhost:5432/ridealert"
JWT_SECRET="your_secure_jwt_secret"
PORT=3000
```

### Local Development Setup

**1. Clone the repository:**
```bash
git clone https://github.com/sagarkumarpatel/RideAlert.git
```

**2. Start the Backend API:**
```bash
cd ridealert-backend-node
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

**3. Start the Frontend Dashboard:**
```bash
cd ../ridealert-dashboard
npm install
npm run dev
```
*(Runs on `http://localhost:5173` or port mapped by Vite)*
