#!/bin/bash
# --- Boxy Peerflix Server Automated Installer (v1.5 - Priority apt-utils) ---

echo "--- Installing Dependencies for Boxy Peerflix Server ---"
echo "This may take several minutes..."

# Step 1: Update Ubuntu and install apt-utils first for clean logs
apt-get update -y > /dev/null
apt-get install -y apt-utils > /dev/null

# Step 2: Install the rest of the required system packages
apt-get install -y nodejs npm curl > /dev/null

# Step 3: Download and install the cloudflared client
echo "Installing Cloudflare Tunnel client..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb > /dev/null 2>&1
dpkg -i cloudflared.deb > /dev/null
apt-get install -f -y > /dev/null

# Step 4: Install Node.js project dependencies
echo "Installing Node.js packages (this is the longest step)..."
npm install --no-fund --no-audit

# Step 5: Make the start script executable
chmod +x start.sh

# Step 6: Run Safe Cleanup to Reduce Storage Size
echo "Running safe cleanup to reduce storage footprint..."
apt-get clean > /dev/null
rm -f cloudflared.deb

echo ""
echo "✅ --- Clean Installation Complete! --- ✅"
echo ""
echo "The server is now installed and ready to use."
echo "To start the server, run the following command from this directory:"
echo ""
echo "   ./start.sh"
echo ""
