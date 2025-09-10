#!/bin/bash
# This script automates the entire startup process, including tunnel creation and cleanup.

# --- DEFINITIVE FIX: Define a cleanup function that runs on exit ---
cleanup() {
    echo -e "\n🛑 Shutting down services and cleaning up temporary files..."
    # Kill all child processes of this script (cloudflared, node, etc.)
    pkill -P $$
    # Delete the temporary download folder and all its contents
    rm -rf ~/Poxio/temp_downloads
    # Clean up the log files
    rm -f /tmp/addon_tunnel.log /tmp/video_tunnel.log
    echo "Cleanup complete. Storage has been freed."
    exit 0
}
# Trap the Ctrl+C signal and run the cleanup function
trap cleanup INT

echo "🚀 Starting all Boxy services and creating temporary tunnels..."
cd "$(dirname "$0")"

# Create the temporary download directory in case it doesn't exist
mkdir -p ~/Poxio/temp_downloads

# Start tunnels in background & log output
cloudflared tunnel --url http://localhost:7000 > /tmp/addon_tunnel.log 2>&1 &
cloudflared tunnel --url http://localhost:8888 > /tmp/video_tunnel.log 2>&1 &

echo "Waiting for tunnels to establish (this may take up to 15 seconds)..."
sleep 2

# Loop until both URLs are found or timeout
COUNTER=0
while [ $COUNTER -lt 15 ]; do
    ADDON_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/addon_tunnel.log | head -n 1)
    VIDEO_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' /tmp/video_tunnel.log | head -n 1)
    if [ ! -z "$ADDON_URL" ] && [ ! -z "$VIDEO_URL" ]; then break; fi
    sleep 1; let COUNTER=COUNTER+1
done

if [ -z "$ADDON_URL" ] || [ -z "$VIDEO_URL" ]; then
    echo "❌ FATAL: Failed to create tunnels after 15 seconds."; cleanup; exit 1;
fi

echo "✅ Tunnels are live!"; echo ""

# Export URLs so the Node.js app can access them
export PUBLIC_ADDON_URL=$ADDON_URL
export PUBLIC_VIDEO_URL=$VIDEO_URL

# Start the servers
node server.js &
node addon.js

# Wait indefinitely to keep tunnels alive. The 'trap' command will handle cleanup on Ctrl+C.
wait
