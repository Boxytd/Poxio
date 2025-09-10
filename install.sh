#!/bin/bash
# --- Boxy Peerflix Server Automated Installer (v1.4 - Clean Log Edition) ---

echo "--- Installing Dependencies for Boxy Peerflix Server ---"
echo "This may take several minutes..."

# Step 1: Update Ubuntu and install necessary packages
apt-get update -y > /dev/null
# apt-utils is now included to prevent the harmless debconf warning
apt-get install -y nodejs npm curl apt-utils > /dev/null

# Step 2: Download and install the cloudflared client
echo "Installing Cloudflare Tunnel client..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb > /dev/null 2>&1
dpkg -i cloudflared.deb > /dev/null
apt-get install -f -y > /dev/null

# Step 3: Install Node.js project dependencies
echo "Installing Node.js packages (this is the longest step)..."
npm install --no-fund --no-audit

# Step 4: Make the start script executable
chmod +x start.sh

# Step 5: Run Safe Cleanup to Reduce Storage Size
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
