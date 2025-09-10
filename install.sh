#!/bin/bash
# --- Boxy Peerflix Server Automated Installer (v2.0 - Yarn Edition) ---
# This version replaces npm with the more reliable Yarn package manager to prevent cache corruption errors.

echo "--- Installing Dependencies for Boxy Peerflix Server ---"
echo "This may take several minutes..."

# Step 1: Update Ubuntu and install base dependencies
apt-get update -y > /dev/null
apt-get install -y nodejs curl apt-utils > /dev/null

# Step 2: Install Yarn package manager
echo "Installing Yarn..."
# The corepack utility is the modern, official way to manage Yarn
corepack enable
corepack prepare yarn stable --activate

# Step 3: Download and install the cloudflared client
echo "Installing Cloudflare Tunnel client..."
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb > /dev/null 2>&1
dpkg -i cloudflared.deb > /dev/null
apt-get install -f -y > /dev/null

# Step 4: Install project dependencies using Yarn
echo "Installing Node.js packages with Yarn (this is the longest step)..."
# Yarn is more resilient to network errors than npm
yarn install

# Step 5: Make the start script executable
chmod +x start.sh

# Step 6: Run Safe Cleanup
echo "Running safe cleanup to reduce storage footprint..."
apt-get clean > /dev/null
rm -f cloudflared.deb

echo ""
echo "✅ --- Yarn Installation Complete! --- ✅"
echo ""
echo "The server is now installed and ready to use."
echo "To start the server, run the following command from this directory:"
echo ""
echo "   ./start.sh"
echo ""
