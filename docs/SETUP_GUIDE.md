# Setup & Deployment Guide

This guide walks through setting up the complete Restaurant Management System (RMS) on an intranet server (Ubuntu / Debian / Linux) for local network access.

---

## 1. Prerequisites
- **Node.js**: v18.x or v20.x LTS
- **Docker & Docker Compose**: Installed and running
- **PostgreSQL**: 15+ (Provided via Docker Compose)
- **Local Network**: Server and client devices connected to the same Wi-Fi router / switch

---

## 2. Fast-Track Start via Docker Compose

```bash
cd /var/www/html/Restorent/docker
docker-compose up -d
```
This spins up PostgreSQL (`rms_postgres`) on port 5432 with default credentials:
- Database: `rms_db`
- User: `postgres`
- Password: `postgres`

---

## 3. Backend Setup

```bash
cd /var/www/html/Restorent/backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Seed database with initial roles, 19 permissions, floors, tables, menu, and seed users
npx ts-node src/seed.ts

# Start the NestJS backend
node dist/main.js
```
The backend starts on `http://0.0.0.0:3000/api`.
Interactive Swagger API documentation: `http://localhost:3000/api/docs`.

---

## 4. Frontend Setup

```bash
cd /var/www/html/Restorent/frontend

# Install dependencies
npm install

# Build for production or start development server
npm run dev -- --host 0.0.0.0
```
Access the web application in any browser on the LAN at `http://<SERVER_IP>:5173`.

---

## 5. Mobile Android APK Installation

The standalone, installable Android APK is located at:
`/var/www/html/Restorent/mobile/rms-restaurant-app.apk`

### Option A: Install via ADB (USB or Wi-Fi)
```bash
adb install /var/www/html/Restorent/mobile/rms-restaurant-app.apk
```

### Option B: Download directly on Phone via Local Browser
1. Ensure your Android phone is connected to the same restaurant Wi-Fi.
2. In the mobile app, enter the Server IP address (e.g., `192.168.1.50`).
3. Tap **Connect** to sync tables and menu.
