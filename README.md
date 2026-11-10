# MINEGUARD — IoT-Based Smart Safety Helmet Monitoring Platform

> **Protecting Lives Through Intelligent Monitoring**

MINEGUARD is a professional IoT-based mine worker safety monitoring system that continuously monitors environmental conditions, hazardous gases, worker movement, GPS location, and emergency situations using ESP32-based smart safety helmets.

![MINEGUARD](https://img.shields.io/badge/MINEGUARD-v1.0.0-06b6d4?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3fcf8e?style=flat-square)
![ESP32](https://img.shields.io/badge/ESP32-Hardware-e7352c?style=flat-square)

---

## Features

### Real-Time Monitoring
- **Environmental Sensors**: Temperature (DHT11), Humidity, Gas Detection (MQ-3, MQ-7)
- **Motion Tracking**: MPU6050 accelerometer/gyroscope for movement, inactivity, and fall detection
- **GPS Tracking**: Live location tracking with NEO-6M GPS module
- **Supabase Realtime**: Instant updates via WebSocket subscriptions

### Safety Management
- **Geofencing**: Create safe zones, restricted zones, and danger zones with polygon/circle drawing
- **Alert System**: 12 alert categories from gas detection to emergency SOS
- **Fall Detection**: Configurable impact thresholds for possible fall detection
- **Inactivity Monitoring**: Configurable duration-based worker inactivity alerts
- **Emergency SOS**: Physical panic button with instant critical alerts

### Analytics & Reporting
- Daily, weekly, and monthly sensor trends
- Alert distribution by category and severity
- Worker safety statistics and device availability
- CSV export for all reports

### Administration
- Worker and helmet management
- Configurable sensor thresholds (clearly labeled as demonstration values)
- Device connection monitoring
- Alert acknowledgment and resolution workflow

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS |
| **UI Components** | Lucide React Icons, Recharts, Leaflet + OpenStreetMap |
| **Backend** | Supabase (PostgreSQL, Realtime, Auth, Edge Functions) |
| **Hardware** | ESP32, DHT11, MQ-3, MQ-7, MPU6050, NEO-6M GPS |
| **State Management** | TanStack React Query, React Context |

---

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── layout/          # Sidebar, TopNav, AppLayout
│   │   ├── dashboard/       # Overview dashboard widgets
│   │   ├── monitoring/      # Live sensor monitoring components
│   │   ├── workers/         # Worker management components
│   │   ├── maps/            # GPS tracking and map components
│   │   ├── alerts/          # Alert center components
│   │   ├── charts/          # Recharts-based chart components
│   │   └── common/          # Reusable UI components
│   ├── pages/               # Route page components
│   ├── services/            # Supabase service layer
│   ├── hooks/               # Custom React hooks (realtime subscriptions)
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── context/             # React context providers
│   └── config/              # Application configuration
├── supabase/
│   ├── migrations/          # SQL migration files
│   └── functions/           # Supabase Edge Functions
├── hardware/                # ESP32 Arduino firmware
└── public/                  # Static assets
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account and project
- (Optional) **ESP32** development board with sensors

---

## Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd mineguard
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **⚠ Security Note**: Never expose your Supabase service role key in frontend code. The anon/publishable key is safe for client-side use with proper RLS policies.

### 3. Set Up Supabase Database

Run the migration SQL in your Supabase SQL Editor:

1. Open your Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Execute the SQL to create all tables, indexes, RLS policies, and triggers

### 4. Deploy Edge Function (Optional)

If using ESP32 hardware, deploy the sensor data ingestion function:

```bash
supabase functions deploy ingest-sensor-data
```

Set the required environment variables in Supabase:
- `DEVICE_API_KEY`: A secret key shared with the ESP32 for authentication

### 5. Run the Application

```bash
npm run dev
```

The application will start at `http://localhost:5173`.

### Demo Mode

If Supabase credentials are not configured, the application runs in **DEMO MODE** with simulated data. Demo data is clearly labeled and does not represent real sensor readings or GPS coordinates.

---

## Hardware Integration

### ESP32 Sensor Setup

See `hardware/mineguard_esp32.ino` for the complete firmware.

**Required Components:**
- ESP32 Dev Board
- DHT11 Temperature/Humidity Sensor
- MQ-3 Gas Sensor (Alcohol/Volatile Compounds)
- MQ-7 Carbon Monoxide Sensor
- MPU6050 6-Axis Accelerometer/Gyroscope
- NEO-6M GPS Module
- Push Button (Emergency SOS)

**Wiring:** Refer to the pin definitions in the firmware file.

### Data Flow

```
ESP32 Sensors → WiFi → Edge Function (validate) → Supabase DB → Realtime → Dashboard
```

### JSON Payload Format

```json
{
  "helmet_id": "HELMET-001",
  "temperature": 32.5,
  "humidity": 65.0,
  "mq3_raw": 1200,
  "mq7_raw": 950,
  "accel_x": 0.12,
  "accel_y": 0.25,
  "accel_z": 9.65,
  "gyro_x": 0.02,
  "gyro_y": 0.01,
  "gyro_z": 0.03,
  "latitude": 12.9716,
  "longitude": 77.5946,
  "gps_valid": true,
  "emergency_pressed": false
}
```

---

## Sensor Threshold Configuration

> **⚠ IMPORTANT**: The default thresholds in this application are **demonstration values only**. They are NOT officially approved mining safety standards. All thresholds MUST be calibrated and approved by qualified safety personnel before any operational use in a mining environment.

| Sensor | Warning Threshold | Critical Threshold |
|--------|------------------|--------------------|
| Temperature | 35°C | 45°C |
| Humidity | 80% | 95% |
| MQ-3 Raw | 1500 | 3000 |
| MQ-7 CO (ppm) | 50 | 200 |
| Inactivity | 300 seconds | — |
| Fall Impact | 25 (accel magnitude) | — |

---

## Database Schema

The database includes the following tables:

| Table | Purpose |
|-------|---------|
| `workers` | Worker profiles and assignments |
| `helmets` | Helmet device registry |
| `sensor_readings` | Time-series sensor data |
| `worker_locations` | GPS location history |
| `alerts` | Alert events and management |
| `geofences` | Geofence boundary definitions |
| `geofence_events` | Geofence entry/exit events |
| `worker_activity` | Worker activity tracking |
| `system_settings` | Application configuration |

All tables have Row Level Security (RLS) enabled. Authenticated users can read all data. Sensor data insertion is restricted to the service role (via Edge Functions).

---

## Architecture Decisions

1. **Supabase Realtime over polling**: WebSocket subscriptions for instant sensor updates
2. **Edge Functions for ingestion**: ESP32 sends data to an authenticated endpoint, not directly to the database
3. **Demo mode fallback**: Application remains functional without Supabase for development/demonstration
4. **Point-in-polygon for geofencing**: Ray-casting algorithm for reliable polygon-based geofence detection
5. **Haversine formula for distance**: Used for circular geofence calculations
6. **Configurable thresholds**: No hardcoded safety limits — all thresholds are configurable and clearly labeled as demonstration values
7. **Alert deduplication**: Geofence events are tracked to prevent duplicate alerts for the same zone entry/exit

---

## License

This project is provided for educational and demonstration purposes.

---

## Disclaimer

This system is a **demonstration platform**. It should NOT be used as the sole safety monitoring system in actual mining operations without:

1. Proper sensor calibration by qualified personnel
2. Regulatory compliance review
3. Redundant safety systems
4. Professional safety engineering review
5. Thorough testing under operational conditions

All sensor thresholds, fall detection logic, and safety alerts are demonstration implementations and require validation by mining safety professionals before operational deployment.

