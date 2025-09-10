#!/bin/bash
# This script automates the entire startup process, including tunnel creation.

cleanup() {
    echo -e "\n🛑 Shutting down services..."
    # Kill all child processes of this script
    pkill -P $$
    rm -f /tmp/addon_tunnel.log /tmp/video_tunnel.log
    echo "Cleanup complete."
    exit 0
}
trap cleanup INT

echo "🚀 Starting all Boxy services and creating temporary tunnels..."
cd "$(dirname "$0")" # Ensure we are in the script's directory

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
    if [ ! -z "$ADDON_URL" ] && [ ! -z "$VIDEO_URL" ]; then
        break
    fi
    sleep 1
    let COUNTER=COUNTER+1
done

if [ -z "$ADDON_URL" ] || [ -z "$VIDEO_URL" ]; then
    echo "❌ FATAL: Failed to create tunnels after 15 seconds."
    echo "Please check cloudflared logs in /tmp/addon_tunnel.log and /tmp/video_tunnel.log"
    cleanup
    exit 1
fi

echo "✅ Tunnels are live!"
echo ""

# Export URLs so the Node.js app can access them
export PUBLIC_ADDON_URL=$ADDON_URL
export PUBLIC_VIDEO_URL=$VIDEO_URL

# Start the servers
node server.js &
node addon.js

# Wait indefinitely to keep tunnels alive. The trap will handle cleanup.
wait
