#!/usr/bin/env bash
# Self-hosted LiveKit (open source, no cloud vendor).
# Local:  docker compose -f livekit/docker-compose.yml up
#         then: livekit-server --dev   (or this script)
# App env:
#   LIVEKIT_API_KEY=devkey
#   LIVEKIT_API_SECRET=secret
#   NEXT_PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880
# Production (this VPS): generate keys, put them in livekit.yaml AND the Next.js env,
#   NEXT_PUBLIC_LIVEKIT_URL=wss://YOUR_PUBLIC_HOST:7880
# Open UDP 50000-50100 and TCP 7880/7881 on the firewall.

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/livekit"

if command -v docker >/dev/null 2>&1; then
  echo "Starting LiveKit with Docker..."
  docker compose up -d
  echo "LiveKit listening on :7880"
  exit 0
fi

if command -v livekit-server >/dev/null 2>&1; then
  echo "Starting livekit-server --dev (API key devkey / secret)..."
  exec livekit-server --dev
fi

echo "Install Docker or the LiveKit server binary, then re-run this script."
echo "Docs: https://docs.livekit.io/home/self-hosting/local/"
exit 1
