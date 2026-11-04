#!/usr/bin/env bash
# ==============================================================================
# RMS Automatic Network / IP Sync Script
# Usage:
#   ./update-ip.sh              # Auto-detects your active Wi-Fi / LAN IP
#   ./update-ip.sh 192.168.1.50 # Or specify custom IP manually
# ==============================================================================

PROJECT_DIR="/var/www/html/Restorent"
NEW_IP="$1"

if [ -z "$NEW_IP" ]; then
  # Auto-detect first non-loopback IP (excluding docker 172.x)
  NEW_IP=$(hostname -I | tr ' ' '\n' | grep -v '^172\.' | grep -v '^127\.' | head -n 1)
fi

if [ -z "$NEW_IP" ]; then
  echo "❌ Could not detect LAN IP automatically. Please provide it: ./update-ip.sh <IP>"
  exit 1
fi

echo "======================================================="
echo "🔄 Updating RMS Network Configuration to: $NEW_IP"
echo "======================================================="

# 1. Update Root .env
cat <<EOF > "$PROJECT_DIR/.env"
# RMS Central Network Configuration
SERVER_IP=$NEW_IP
BACKEND_PORT=3000
FRONTEND_PORT=5173
EXPO_PORT=8081

API_BASE_URL=http://$NEW_IP:3000/api
WEB_URL=http://$NEW_IP:5173
EXPO_URL=exp://$NEW_IP:8081
EOF
echo "✓ Updated $PROJECT_DIR/.env"

# 2. Update Frontend .env
cat <<EOF > "$PROJECT_DIR/frontend/.env"
VITE_SERVER_IP=$NEW_IP
VITE_BACKEND_PORT=3000
VITE_API_BASE_URL=/api
VITE_BACKEND_URL=http://$NEW_IP:3000
EOF
echo "✓ Updated $PROJECT_DIR/frontend/.env"

# 3. Update Backend .env
if grep -q "SERVER_IP=" "$PROJECT_DIR/backend/.env"; then
  sed -i "s/^SERVER_IP=.*/SERVER_IP=$NEW_IP/" "$PROJECT_DIR/backend/.env"
else
  echo "SERVER_IP=$NEW_IP" >> "$PROJECT_DIR/backend/.env"
fi
echo "✓ Updated $PROJECT_DIR/backend/.env"

# 4. Update Mobile .env
cat <<EOF > "$PROJECT_DIR/mobile/.env"
EXPO_PUBLIC_SERVER_IP=$NEW_IP
EXPO_PUBLIC_API_URL=http://$NEW_IP:3000/api
EOF
echo "✓ Updated $PROJECT_DIR/mobile/.env"

# 5. Reverse ADB ports for connected USB Android device
if command -v adb >/dev/null 2>&1; then
  DEVICE_COUNT=$(adb devices | grep -w "device" | wc -l)
  if [ "$DEVICE_COUNT" -gt 0 ]; then
    adb reverse tcp:3000 tcp:3000 2>/dev/null
    adb reverse tcp:5173 tcp:5173 2>/dev/null
    adb reverse tcp:8081 tcp:8081 2>/dev/null
    echo "✓ ADB USB reverse ports synced for connected Android device"
  fi
fi

echo "======================================================="
echo "✅ IP Configuration updated successfully!"
echo "   • Web App (Desktop/Mobile): http://$NEW_IP:5173"
echo "   • Backend API & Docs:       http://$NEW_IP:3000/api/docs"
echo "   • Mobile Expo App:          exp://$NEW_IP:8081"
echo "   • APK Download Page:        http://$NEW_IP/Restorent/download.html"
echo "======================================================="

