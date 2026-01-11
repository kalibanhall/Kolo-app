#!/bin/bash
set -e

echo "=== KOLO Backend Startup with Cloudflare Tunnel ==="

# Download and install cloudflared if not exists
if [ ! -f "./cloudflared" ]; then
    echo "Downloading cloudflared..."
    curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
    chmod +x cloudflared
    echo "cloudflared installed successfully"
fi

# Start the tunnel in background
if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
    echo "Starting Cloudflare Tunnel..."
    ./cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN" &
    TUNNEL_PID=$!
    echo "Tunnel started with PID: $TUNNEL_PID"
    sleep 3
else
    echo "WARNING: No CLOUDFLARE_TUNNEL_TOKEN found, running without tunnel"
fi

# Start the Node.js server
echo "Starting Node.js server..."
cd /opt/render/project/src/server 2>/dev/null || cd "$(dirname "$0")/.."
node src/server.js
