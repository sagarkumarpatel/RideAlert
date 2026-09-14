# 🛡️ RideAlert Dashboard

RideAlert is a comprehensive, real-time driver monitoring and safety ecosystem designed to prevent accidents caused by fatigue, microsleeps, and erratic driving behavior. The system operates as a **Multi-Tenant SaaS platform**, allowing independent companies to register, isolate their driver fleets, and monitor telematics through a real-time web dashboard.

The system consists of an Android client application running on edge devices in the vehicle, a robust backend API for event processing, and a high-performance web dashboard (this repository) for real-time fleet management.

---

## 🚀 1. Project Overview & Architecture

**Purpose:** 
The `ridealert-dashboard` serves as the central command center for fleet managers to monitor driver safety in real time. It aggregates telemetric data, visualizes fatigue trends, and highlights critical incidents (e.g., micro-sleeps or sudden impacts) immediately as they are reported from the driver's device.

**System Architecture Flow:**
1. **Edge Detection (Android App):** The driver's Android device runs continuous, offline-first computer vision (ML Kit) and hardware sensor (Accelerometer/Gyroscope) analysis to detect fatigue and motion anomalies locally.
2. **Event Sync (Backend Node.js API):** Critical incidents (Warning/Critical fatigue) or sudden impacts trigger an immediate payload to the backend via HTTP/REST. If offline, events are cached via Room DB and synced later via Android WorkManager.
3. **Data Visualization (React Dashboard & WebSockets):** The web dashboard connects to the backend via **Socket.io** event channels (`io.to(companyId).emit`). This provides instant, zero-latency telemetry pushes from the backend to the dashboard, replacing old HTTP polling mechanics.

---

## 🏢 2. Multi-Tenant Architecture & Data Isolation

RideAlert utilizes a strict multi-tenant architecture to guarantee zero cross-tenant data leakage.

* **Company/Admin Multi-Tenancy:** Each organization registers via the `/admin-signup` endpoint with a unique `companyName`, `email`, and `username`.
* **Database Isolation:** PostgreSQL/Prisma row-level scoping is enforced via `companyId` foreign keys across the `User`, `Driver`, `Vehicle`, `Trip`, `FatigueEvent`, and `Alert` models.
* **Authentication:** JWT issuance is strictly scoped to the `companyId`. The login endpoint supports flexible authentication (accepting either `email` or `username` as the `identifier`).
* **Real-Time Channel Isolation:** Socket.io room partitioning ensures that edge devices only broadcast real-time events to their specific company room (e.g., `io.to(companyId).emit('fatigue_event', payload)`), ensuring dashboards only receive live updates for their own fleets.

---

## 👁️ 3. Eye & Drowsiness Detection Logic (In-Depth)

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
* This event is instantly dispatched to the backend, storing it in PostgreSQL via Prisma, which the dashboard retrieves immediately via Socket.io.

---

## 🚨 4. Fall & Sudden Movement Detection Logic (In-Depth)

The system detects severe impacts, rapid swerving, and falls using device hardware sensors.

* **Sensor Data Ingestion:** Uses Android `SensorManager` listening to `TYPE_ACCELEROMETER` and `TYPE_GYROSCOPE` at `SENSOR_DELAY_NORMAL`.

**Exact Thresholds (from `DriftPatternDetector.kt`):**
* **Acceleration Spike (Impact/Hard Braking):** The G-force magnitude is calculated as `sqrt(x² + y² + z²)`. If the calculated force exceeds the **`shakeAccelerationThreshold = 15.0f` m/s²** (standard gravity is ~9.8m/s²), a critical `MOTION` event is triggered.
* **Angular Velocity (Sharp Correction/Swerve):** If the absolute delta between consecutive Gyroscope `X` or `Y` readings exceeds the **`sharpCorrectionThreshold = 2.0f` rad/s**, a critical `MOTION` event is triggered.
* **Debounce / Event Throttling:** A hardcoded `2000ms` (2-second) cooldown window is applied after any detected event to prevent flooding the backend with duplicate readings during a sustained incident. There is no delayed static verification window; the alert triggers instantaneously upon crossing the threshold.

---

## ✨ 5. UI/UX Enhancements & 3D Background

* **Glassmorphism Design System:** The dashboard utilizes responsive frosted glass panels, dynamic contrast scaling, and high-contrast slate typography to provide a premium, modern user experience.
* **3D NeatGradient Background:** A full-screen, fluid 3D animated mesh gradient is powered by `@firecms/neat` and Three.js. The canvas resolution and camera scaling have been specifically optimized for crisp rendering on mobile viewports.
* **GPS Navigation Deep-Linking:** The Leaflet OpenStreetMap popups and Recent Alerts feed include direct deep-linking for turn-by-turn navigation (e.g., `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG`), allowing managers to dispatch help instantly.

---

## 🛠️ 6. Tech Stack & Setup Instructions

### Technology Stack
* **Frontend Dashboard:** React 19, Vite, React Router DOM, Recharts, React-Leaflet, `@firecms/neat`.
* **Backend API:** Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL, Socket.io.
* **Android Client:** Kotlin, Jetpack Compose, CameraX, Google ML Kit Vision, Room Database, WorkManager, Retrofit.

### Environment Variables (`.env`)
Ensure your backend has the following configured:
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

**2. Database Migration:**
Run the Prisma migrations to instantiate the multi-tenant schema:
```bash
cd ridealert-backend-node
npx prisma migrate dev --name init
```

**3. Start the Backend API:**
```bash
npm install
npm run dev
```
*(Runs on `http://localhost:3000`)*

**4. Start the Frontend Dashboard:**
```bash
cd ../ridealert-dashboard
npm install
npm run dev
```
*(Runs on `http://localhost:5173` or port mapped by Vite)*

**5. Run the Android Client:**
Open the `ridealert-android` folder in **Android Studio**, build the project, and deploy it to a physical device (Emulators do not support ML Kit camera vision effectively).

---

## 🔌 7. API & WebSocket Event Specifications

### Core REST Endpoints
* **`POST /api/auth/admin-signup`**: Registers a new tenant company and creates an admin account.
* **`POST /api/auth/admin-login`**: Authenticates an admin (via `identifier` and `password`) and returns a tenant-scoped JWT.
* **`POST /api/trips/:tripId/events`**: Ingests a new fatigue or motion event from the edge client (requires valid driver authorization).
* **`GET /api/dashboard/summary`**: Retrieves high-level KPIs and event trends scoped to the authenticated admin's `companyId`.

### WebSocket (Socket.io) Events
Connections are established at `ws://localhost:3000`. Admins authenticate their socket connection by passing their JWT token in the `auth` payload.

**Incoming Dashboard Events:**
* **`fatigue_event`**: Emitted when a driver triggers a drowsiness/microsleep threshold.
* **`fall_detected`**: Emitted upon high G-force hardware sensor impact.
* **`trip_status_change`**: Emitted when a driver starts or stops a shift, prompting the dashboard to instantly update the "Active Drivers" count.
