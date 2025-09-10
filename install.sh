#!/bin/bash
# --- Boxy Peerflix Server Automated Installer (v1.1) ---

echo "--- Installing Dependencies for Boxy Peerflix Server ---"
echo "This may take several minutes..."

# Step 1: Update Ubuntu and install necessary packages
apt-get update -y > /dev/null
apt-get install -y nodejs npm curl > /dev/null

# Step 2: Download and install the cloudflared client
echo "Installing Cloudflare Tunnel client..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb > /dev/null 2>&1
dpkg -i cloudflared.deb > /dev/null
apt-get install -f -y > /dev/null

# Step 3: Install Node.js project dependencies
echo "Installing Node.js packages (this is the longest step)..."
npm install --no-fund --no-audit

# Step 4: Make the start script executable (Permission Fix)
chmod +x start.sh

echo ""
echo "✅ --- Installation Complete! --- ✅"
echo ""
echo "You are all set. To start the server, run the following command from this directory:"
echo ""
echo "   ./start.sh"
echo ""
