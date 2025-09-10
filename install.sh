#!/bin/bash
# --- Boxy Peerflix Server Automated Installer (v1.2 - Lean Edition) ---

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

# Step 4: Make the start script executable
chmod +x start.sh

# --- NEW: Step 5: Run Cleanup to Reduce Final Storage Size ---
echo "Running cleanup to reduce storage footprint..."
# Clean the npm cache (frees up the most space)
npm cache clean --force > /dev/null
# Clean the apt cache (frees up installer files)
apt-get clean > /dev/null
# Remove the cloudflared installer package
rm -f cloudflared.deb

echo ""
echo "✅ --- Lean Installation Complete! --- ✅"
echo ""
echo "The final installation size has been significantly reduced."
echo "To start the server, run the following command from this directory:"
echo ""
echo "   ./start.sh"
echo ""
