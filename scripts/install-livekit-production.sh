#!/usr/bin/env bash
# Installs self-hosted LiveKit next to the site (Linux VPS) and keeps it running in PM2.
# Keys and the binary live in $HOME/kmc-livekit so rsync --delete cannot wipe them.
set -euo pipefail

LIVEKIT_HOME="${LIVEKIT_HOME:-$HOME/kmc-livekit}"
WEB_ROOT="${WEB_ROOT:-$HOME/web/kissmycheek.org/public_html}"
DOMAIN="${KMC_DOMAIN:-kissmycheek.org}"
mkdir -p "$LIVEKIT_HOME/bin"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin:$PATH:$LIVEKIT_HOME/bin"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to run PM2 for LiveKit."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

BIN="$LIVEKIT_HOME/bin/livekit-server"
if [ ! -x "$BIN" ]; then
  echo "Downloading LiveKit server (linux amd64)..."
  TAG=$(curl -fsSL -H 'User-Agent: kissmycheek' https://api.github.com/repos/livekit/livekit/releases/latest | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n 1)
  TAG="${TAG:-v1.13.7}"
  TMP="$LIVEKIT_HOME/livekit.tgz"
  curl -fsSL -H 'User-Agent: kissmycheek' -o "$TMP" \
    "https://github.com/livekit/livekit/releases/download/${TAG}/livekit_${TAG#v}_linux_amd64.tar.gz"
  tar -xzf "$TMP" -C "$LIVEKIT_HOME/bin"
  chmod +x "$BIN"
  rm -f "$TMP"
  echo "Installed $BIN"
fi

KEYS_ENV="$LIVEKIT_HOME/keys.env"
if [ ! -f "$KEYS_ENV" ]; then
  echo "Generating LiveKit API keys (saved once in $KEYS_ENV)..."
  PAIR="$("$BIN" generate-keys)"
  API_KEY=$(printf '%s\n' "$PAIR" | awk -F': *' '/API Key/ {print $2; exit}')
  API_SECRET=$(printf '%s\n' "$PAIR" | awk -F': *' '/API Secret/ {print $2; exit}')
  if [ -z "$API_KEY" ] || [ -z "$API_SECRET" ]; then
    API_KEY=$(printf '%s\n' "$PAIR" | awk 'NF {print $1; exit}')
    API_SECRET=$(printf '%s\n' "$PAIR" | awk 'NF {print $2; exit}')
  fi
  cat > "$KEYS_ENV" <<ENV
LIVEKIT_API_KEY=${API_KEY}
LIVEKIT_API_SECRET=${API_SECRET}
NEXT_PUBLIC_LIVEKIT_URL=wss://${DOMAIN}
ENV
  chmod 600 "$KEYS_ENV"
fi

# shellcheck disable=SC1090
set -a
. "$KEYS_ENV"
set +a

CONFIG="$LIVEKIT_HOME/livekit.yaml"
cat > "$CONFIG" <<YAML
port: 7880
bind_addresses:
  - 127.0.0.1
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: true
keys:
  ${LIVEKIT_API_KEY}: ${LIVEKIT_API_SECRET}
logging:
  level: info
room:
  auto_create: true
YAML

NGINX_INC="$HOME/conf/web/${DOMAIN}/nginx.ssl.conf_2.inc"
NGINX_SNIPPET=$(cat <<'NGX'
# Kiss My Cheek — LiveKit signaling (media UDP still hits the origin IP)
location /rtc {
    proxy_pass http://127.0.0.1:7880;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400;
}
location /twirp {
    proxy_pass http://127.0.0.1:7880;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
NGX
)

if [ -d "$HOME/conf/web/${DOMAIN}" ]; then
  if [ ! -f "$NGINX_INC" ] || ! grep -q 'proxy_pass http://127.0.0.1:7880' "$NGINX_INC" 2>/dev/null; then
    echo "$NGINX_SNIPPET" >> "$NGINX_INC"
    echo "Wrote LiveKit Nginx proxy snippet to $NGINX_INC"
    sudo nginx -s reload 2>/dev/null || nginx -s reload 2>/dev/null || \
      echo "Reload Nginx (or Hestia) so wss://${DOMAIN} can reach LiveKit."
  fi
else
  echo "No Hestia Nginx conf dir found. Add a 443 websocket proxy for /rtc and /twirp → 127.0.0.1:7880"
fi

if pm2 describe kmc-livekit >/dev/null 2>&1; then
  pm2 restart kmc-livekit --update-env
else
  pm2 start "$BIN" --name kmc-livekit -- --config "$CONFIG"
fi
pm2 save || true

echo "LiveKit production process: kmc-livekit (127.0.0.1:7880)"
echo "App env for Next.js build:"
echo "  LIVEKIT_API_KEY=$LIVEKIT_API_KEY"
echo "  NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}"
echo "Open firewall UDP 50000-50100 and TCP 7881 on the origin (media does not go through Cloudflare)."
