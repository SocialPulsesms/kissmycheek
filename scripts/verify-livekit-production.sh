#!/usr/bin/env bash
# Called on the VPS after PM2 restart. Ensures LiveKit health is reachable
# via Node (3000) and via Apache/PHP, then prints PM2 status.
set -u

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin:$PATH"

WEB_ROOT="${WEB_ROOT:-$HOME/web/kissmycheek.org/public_html}"
cd "$WEB_ROOT" || cd /home/*/web/kissmycheek.org/public_html

echo "=== LiveKit production verify ==="
echo "Route file: $( [ -f app/api/livekit/health/route.ts ] && echo present || echo MISSING )"
echo "PHP bridge: $( [ -f index.php ] && echo present || echo MISSING )"
echo "WSS proxy:  $( [ -f scripts/livekit-wss-proxy.js ] && echo present || echo MISSING )"

echo
echo "--- PM2 ---"
pm2 list || true

echo
echo "--- localhost:7880 (LiveKit process) ---"
if curl -sS -o /dev/null --max-time 3 http://127.0.0.1:7880/; then
  echo "LiveKit HTTP responded on 127.0.0.1:7880"
else
  echo "WARNING: nothing answered on 127.0.0.1:7880 (kmc-livekit may be down)"
fi

echo
echo "--- Next.js health http://127.0.0.1:3000/api/livekit/health ---"
NODE_HEALTH=$(curl -sS --max-time 8 -w "\nHTTP:%{http_code}" http://127.0.0.1:3000/api/livekit/health || true)
echo "$NODE_HEALTH"

echo
echo "--- PHP/Apache health http://127.0.0.1/api/livekit/health ---"
PHP_HEALTH=$(curl -sS --max-time 8 -w "\nHTTP:%{http_code}" -H "Host: kissmycheek.org" http://127.0.0.1/api/livekit/health || true)
echo "$PHP_HEALTH"

echo
echo "If PHP health returns JSON with livekitProcessListening, the public URL will work after Cloudflare cache."
