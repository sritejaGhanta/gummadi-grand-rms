# 🍽️ Gummadi Grand Restaurant Management System (RMS)

> An Enterprise Intranet & Cloud-Ready Restaurant Operating System connecting Dining Floors, Handheld Waiter POS, Kitchen KDS, Cashier Billing, and Executive Analytics with Zero Latency.

![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Android%20APK%20%7C%20Local%20LAN-orange)
![Backend](https://img.shields.io/badge/Backend-NestJS%20%2B%20PostgreSQL-red)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-blue)
![Mobile](https://img.shields.io/badge/Mobile-React%20Native%20%2B%20Expo-green)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)

---

## 🌟 Key Features

### 👑 1. Executive Admin Control Tower
* **Real-Time Performance Telemetry:** Today's Revenue, Active Orders, Table Occupancy percentage, and Kitchen ticket velocity.
* **Role-Based Access Control (RBAC):** Granular permissions for Admin, Manager, Waiter, and Chef.
* **Audit & Activity Logs:** Track every action taken across the system in real time.
* **Dynamic Branding Suite:** 1-click updates for Restaurant Name, Logo, Favicon, Address, GSTIN, and Luxury Color Palettes (Royal Gold, Emerald Luxe, Crimson, Midnight).

### 🍽️ 2. Waiter Handheld & Web POS
* **Interactive Floor Plan:** Ground Floor and Banquet layouts with live capacity indicators.
* **Color-Coded Table Statuses:**
  * 🟢 **Available (Green):** Ready for walk-in guests
  * 🔴 **Occupied (Red):** Dining and active orders in kitchen
  * 🟡 **Billing (Amber / Pulsing):** Bill requested by customer; prioritized for cashier
  * 🔵 **Reserved (Blue):** Scheduled reservations
* **Digital Catalog & Smart Cart:** Category tabs (Biryanis, Starters, Tandoor, Curries, Drinks), Veg / Non-Veg badges, price calculation, and special cooking instructions modal ("Less spicy", "Extra gravy").
* **1-Tap Bill Request:** Instantly notifies the manager and cashier when dining concludes.

### 🍳 3. Kitchen Display System (KDS)
* **Paperless Digital Kitchen:** Live Kitchen Order Tickets (KOT) with elapsed preparation timers.
* **Order Status Workflow:** `Received` ➔ `In Preparation (Blue)` ➔ `Ready to Serve (Green)`.
* **Instant Sound & Visual Alerts:** Beep notification on new incoming orders.
* **Live Food Availability:** 1-click toggle to mark dishes as **Sold Out**, immediately disabling them on all waiter handhelds.

### 🧾 4. Manager & Cashier Billing Desk
* **Priority Billing Queue:** Requested tables automatically sort to the top with pulsing badges.
* **Official GST Tax Invoicing:** Itemized billing with CGST (2.5%), SGST (2.5%), discounts, and dynamic UPI QR code.
* **Multi-Mode Settlement:** Instant recording for UPI, Cash, Card, and Split Payments.
* **Table Auto-Free:** Settling payment automatically resets the table status to Available (Green).

### 📱 5. Standalone Android Mobile App
* Native Android APK for handheld waiter terminals and kitchen wall-mounted tablets.
* Works seamlessly over local Wi-Fi without needing an internet connection.

---

## 🚀 Quick Start & Setup

### 1. Environment Configuration
Update `.env` in the root folder with your host LAN IP:
```bash
SERVER_IP=192.168.20.131
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rms_db
```
Or run the 1-click IP updater:
```bash
./update-ip.sh
```

### 2. Start Backend (NestJS)
```bash
cd backend
npm install
npm run build
npm run start:prod
# Runs on http://0.0.0.0:3000
```

### 3. Start Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev -- --host
# Runs on http://0.0.0.0:5173
```

### 4. Start Mobile Metro Bundler (Expo)
```bash
cd mobile
npm install
npx expo start --host lan --port 8081
```

---

## 🔐 Default Credentials

| Role | Username | Password | Default Landing Page |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | `/admin` (Executive Tower) |
| **Manager** | `manager` | `manager123` | `/manager` (Billing & Invoices) |
| **Waiter** | `waiter` | `waiter123` | `/pos` (Floor Plan & Ordering) |
| **Chef** | `chef` | `chef123` | `/kitchen` (Kitchen Display System) |

---

## 📱 Mobile APK Download
Download the Android APK directly from your browser:
* **Download Page:** `http://<SERVER_IP>/Restorent/download.html`
* **Direct APK File:** `http://<SERVER_IP>/Restorent/mobile/rms-restaurant-app.apk`

---

## 🎬 Client Demo Video (Telugu Voiceover)
* **Web Player & Interactive Chapters:** `http://<SERVER_IP>/Restorent/demo_video.html`
* **Direct MP4 Download:** `http://<SERVER_IP>/Restorent/restaurant_rms_client_demo_telugu.mp4`

---

## 📄 License
Proprietary software for **Gummadi Grand Restaurant Eluru**. All rights reserved.
