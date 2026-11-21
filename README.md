# 🛡️ RideAlert — Real-Time Multi-Tenant Driver Fatigue & Safety Ecosystem

RideAlert is a production-grade, real-time driver monitoring and safety ecosystem engineered to prevent road accidents caused by driver fatigue, micro-sleeps, and sudden physical impacts/falls. 

The platform operates as a **Multi-Tenant SaaS architecture**, allowing transport companies and fleet operators to register, manage driver fleets with strict data isolation, and monitor live vehicle telematics through a real-time web command dashboard.

---

## 🌐 Live Production Deployments & Mobile App

| Component | Platform / Host | Live Link / Asset |
| :--- | :--- | :--- |
| **Web Dashboard** | **Vercel** | [Live Fleet Dashboard](https://ridealert-dashboard.vercel.app) |
| **Backend API** | **Render (Node.js)** | [`https://ridealert-backend-lo8w.onrender.com`](https://ridealert-backend-lo8w.onrender.com) |
| **Database** | **Neon (AWS US-East)** | Serverless PostgreSQL (Prisma ORM) |
| **Android App** | **Standalone APK** | [📱 Download RideAlert.apk](./apk/RideAlert.apk) |

---

## 📱 Mobile App Download & Installation Guide

You can install and run the standalone RideAlert mobile client directly on any Android device without Android Studio:

### 📥 Download Links:
* **Repository Link:** [Download `apk/RideAlert.apk`](./apk/RideAlert.apk)
* **Direct GitHub Raw Download:** [https://github.com/sagarkumarpatel/RideAlert/raw/main/apk/RideAlert.apk](https://github.com/sagarkumarpatel/RideAlert/raw/main/apk/RideAlert.apk)

### 📲 Quick Installation Steps:
1. Download **`RideAlert.apk`** to your Android phone (via Chrome, WhatsApp, or Google Drive).
2. Tap the downloaded file in your **Downloads** folder or notification shade.
3. If prompted by Android, enable **"Allow from this source"** (or *Install unknown apps*).
4. Tap **Install** and open **RideAlert**.
5. Grant **Camera** and **Location** permissions when prompted.
6. Log in with your **Driver ID** created on the dashboard, tap **Start Driving**, and you are live!

---

## 🚀 1. System Architecture & Real-Time Flow

```
   ┌────────────────────────────────────────────────────────┐
   │             Edge Device (Android Client)               │
   │  • Front Camera: Google ML Kit Face & Eye Detection    │
   │  • Hardware Sensors: Accelerometer & Gyroscope Fusion  │
   │  • Offline Resilience: SQLite Room DB + WorkManager    │
   └───────────────────────────┬────────────────────────────┘
                               │
                      HTTPS / REST Payloads
                               │
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │            Backend Server (Node.js & Express)          │
   │  • Tenant Validation & JWT Scoping (companyId)         │
   │  • Prisma ORM Engine                                   │
   │  • Socket.io Room Partitioning: io.to(companyId)       │
   └─────────────┬───────────────────────────┬──────────────┘
                 │                           │
          PostgreSQL Pooler          WebSockets Stream
                 │                           │
                 ▼                           ▼
   ┌───────────────────────────┐ ┌───────────────────────────┐
   │    Neon Cloud Database    │ │   React Web Dashboard     │
   │  • Multi-Tenant Tables    │ │  • Zero-Latency Live Feed │
   │  • Event Logs & Telemetry │ │  • Leaflet GPS Nav Links  │
   │  • Relational Schema      │ │  • 3D Animated Background │
   └───────────────────────────┘ └───────────────────────────┘
```

1. **Edge Detection (Android App):** Runs continuous, local computer vision (ML Kit) and hardware sensor analysis directly on the device. No video frames leave the device, preserving privacy and eliminating network latency.
2. **Instant Event Ingestion (Backend API):** When a threshold is crossed (Warning/Critical fatigue or sudden impact), the client immediately dispatches a JSON payload to the backend via Retrofit over HTTPS.
3. **Offline Sync Guarantee (Room DB + WorkManager):** If the vehicle passes through an area without cellular network coverage, incidents are safely persisted in a local Room database and automatically dispatched once connectivity is restored.
4. **Live Telemetry Broadcast (Socket.io):** The backend saves the event to Neon PostgreSQL and immediately broadcasts it via **Socket.io** room channels (`io.to(companyId).emit('fatigue_event', payload)`). The web dashboard updates instantly without HTTP polling.

---

## 🏢 2. Multi-Tenant Architecture & Data Isolation

RideAlert enforces strict tenant boundary isolation at every layer:

* **Company Registration:** Organizations register via `/api/auth/admin-signup` with their `companyName`, `email`, and `username`.
* **Database Row-Level Scoping:** PostgreSQL schema utilizes mandatory `companyId` foreign keys across `User`, `Driver`, `Vehicle`, `Trip`, `FatigueEvent`, and `Alert` models.
* **Authentication Scoping:** JWT tokens issued upon login embed the admin's `companyId`. Middleware verifies that all subsequent fleet management queries are strictly constrained to the authenticated tenant.
* **Socket.io Room Partitioning:** Admin dashboard connections join a tenant-scoped socket room (`socket.join(companyId)`). Live alerts triggered by a driver are routed exclusively to that company's room, preventing cross-tenant data leakage.

---

## 👁️ 3. Eye & Drowsiness Detection Logic (In-Depth)

Face and eye tracking are computed entirely on the edge device using Google ML Kit:

* **Detection Engine:** Google ML Kit Vision API (`FaceDetection`).
* **Settings:** `PERFORMANCE_MODE_FAST`, `CLASSIFICATION_MODE_ALL`.
* **Eye Openness Metric:** ML Kit calculates continuous probabilities `leftEyeOpenProbability` and `rightEyeOpenProbability` ($0.0 \le p \le 1.0$).

### Detection Thresholds (`EyeStateTracker.kt`):
* **Closure Threshold:** An eye is registered as closed if `OpenProbability < 0.3f`. Both eyes must fall below this threshold simultaneously (`leftEyeOpen < 0.3f && rightEyeOpen < 0.3f`).
* **Warning Alert (Drowsiness):** Continuous closure for **$\ge 1000\text{ ms}$ (1.0 second)** triggers a `WARNING` fatigue event.
* **Critical Alert (Micro-Sleep):** Continuous closure for **$\ge 2000\text{ ms}$ (2.0 seconds)** triggers a `CRITICAL` fatigue event.

### Alert Escalation:
* Once `CRITICAL` fatigue is detected, the device sounds an urgent alarm (using the system's default alarm ringtone), triggers a continuous haptic pulse sequence (`[0, 500, 200, 500, 200, 500]`), and renders a full-screen red emergency overlay.
* The incident with driver ID, timestamp, and GPS coordinates is dispatched to the backend and broadcast live to the fleet dashboard.

---

## 🚨 4. Sudden Movement & Fall Detection Logic (In-Depth)

The mobile client detects harsh braking, vehicle swerving, and falls using device hardware sensors:

* **Hardware Sensors:** Android `SensorManager` subscribing to `TYPE_ACCELEROMETER` and `TYPE_GYROSCOPE` at `SENSOR_DELAY_NORMAL`.

### Detection Thresholds (`DriftPatternDetector.kt`):
* **Acceleration Spike (Impact / Hard Braking):** The instantaneous G-force magnitude is calculated as:
  $$\text{Magnitude} = \sqrt{x^2 + y^2 + z^2}$$
  If the calculated force exceeds **$15.0\text{ m/s}^2$** (standard gravity is $\approx 9.8\text{ m/s}^2$), a `CRITICAL` motion event is triggered.
* **Angular Velocity (Sharp Swerve / Drift):** If the absolute delta between consecutive gyroscope $X$ or $Y$ axis readings exceeds **$2.0\text{ rad/s}$**, a `CRITICAL` motion event is triggered.
* **Debounce Throttling:** A hardcoded **$2000\text{ ms}$ (2-second)** cooldown window prevents multiple duplicated alerts during an ongoing event.

---

## ✨ 5. Dashboard UI/UX & Live Navigation

* **Glassmorphism Design System:** The dashboard features translucent frosted glass panels with dynamic contrast borders and responsive typography.
* **3D Animated Background:** Features a full-screen, responsive 3D animated mesh gradient powered by `@firecms/neat` and Three.js.
* **Live Incident Map (Leaflet OpenStreetMap):** Automatically centers and plots color-coded pins for critical (Red) and warning (Orange) incidents.
* **Turn-by-Turn GPS Navigation Links:** Every incident card and map popup includes a direct turn-by-turn navigation deep-link:
  ```text
  https://www.google.com/maps/dir/?api=1&destination=LATITUDE,LONGITUDE
  ```
  Clicking the navigation icon opens Google Maps or Apple Maps with directions directly to the driver's location.

---

## 🛠️ 6. Tech Stack & Repository Structure

```
RideAlert/
├── apk/                        # Standalone Android APK for direct distribution
│   └── RideAlert.apk
├── ridealert-android/          # Android Native Client (Kotlin, Jetpack Compose, ML Kit)
├── ridealert-backend-node/     # Node.js API & Socket.io Server (Express, Prisma, TypeScript)
├── ridealert-dashboard/        # React 19 Fleet Dashboard (Vite, Tailwind, Leaflet, Neat)
└── README.md
```

### Technologies Used:
* **Mobile Client:** Kotlin, Jetpack Compose, CameraX, Google ML Kit Vision, Android SensorManager, Room Database, WorkManager, Retrofit, OkHttp.
* **Backend Services:** Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL (Neon Cloud), Socket.io, JWT, Bcrypt.
* **Web Dashboard:** React 19, Vite, React Router DOM, Recharts, React-Leaflet, Leaflet, `@firecms/neat`, Socket.io-client.

---

## 💻 7. Local Development Setup

### Prerequisites
* Node.js (v18+)
* PostgreSQL running locally (or a free Neon database connection string)
* Android Studio (Ladybug / Koala / Electric Eel or newer)

### 1. Backend Setup
```bash
cd ridealert-backend-node
npm install

# Configure environment variables in .env
# DATABASE_URL="postgresql://user:password@localhost:5432/ridealert"
# JWT_SECRET="your-super-secret-key"
# PORT=3000

npx prisma db push
npm run dev
```
Backend starts on `http://localhost:3000`.

### 2. Dashboard Setup
```bash
cd ../ridealert-dashboard
npm install
npm run dev
```
Dashboard opens on `http://localhost:5173`.

### 3. Android Client Setup
1. Open the **`ridealert-android`** folder directly in **Android Studio**.
2. Allow Gradle to sync dependencies.
3. In `RideAlertApi.kt`, ensure `BASE_URL` points to your backend:
   ```kotlin
   private const val BASE_URL = "https://ridealert-backend-lo8w.onrender.com/"
   ```
4. Click **Run (Shift + F10)** on a connected physical Android device.

---

## 🔌 8. REST Endpoints & Socket Specifications

### Core REST Endpoints:
* `POST /api/auth/admin-signup`: Registers a new tenant organization and creates the master administrator account.
* `POST /api/auth/admin-login`: Authenticates an admin using email/username and password, returning a scoped JWT.
* `POST /api/auth/driver-login`: Authenticates an edge driver client using `driverId`.
* `POST /api/trips`: Initiates a new monitoring shift for a driver.
* `PATCH /api/trips/:tripId/end`: Concludes an active driving shift.
* `POST /api/trips/:tripId/fatigue-events`: Ingests a new facial fatigue or sensor motion incident with GPS telemetry.
* `GET /api/fleet/summary`: Retrieves tenant-scoped summary KPIs and active drivers count.
* `GET /api/fleet/incidents`: Fetches incident event history with GPS coordinates for map plotting.

### Socket.io Event Channels:
* `fatigue_event`: Real-time push payload dispatched to `io.to(companyId)` when drowsiness or micro-sleep is reported.
* `fall_detected`: Dispatched to `io.to(companyId)` upon high G-force accelerometer or gyro drift detection.
* `trip_status_change`: Dispatched when a driver starts or finishes a trip to update active vehicle counts instantly.

---

## 📄 License
This project is licensed under the ISC License.
