#!/bin/bash
# ==============================================================================
# Kiss My Cheek — Server Diagnostic & Auto-Fix Script
# ==============================================================================

SERVER_IP="162.0.233.103"
SERVER_USER="Asource"

echo "========================================================"
echo "🔍 Running Server Health Check & Fix on ${SERVER_IP}..."
echo "========================================================"

ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
  echo "--- 1. Configuring Apache .htaccess rewrite to index.php ---"
  cat << 'HTACCESS' > ~/web/kissmycheek.org/public_html/.htaccess
DirectoryIndex index.php

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]

    RewriteRule ^ index.php [QSA,L]
</IfModule>
HTACCESS
  echo "✅ Apache .htaccess routing bridge created."

  echo "--- 2. Checking Node.js and PM2 ---"
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$PATH"

  if ! command -v node &> /dev/null; then
    echo "Installing Node.js via NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
  fi

  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi

  echo "Node version: $(node -v)"
  echo "PM2 version: $(pm2 -v)"

  echo "--- 3. Checking and Launching App on Port 3000 ---"
  cd ~/web/kissmycheek.org/public_html
  pm2 delete kissmycheek 2>/dev/null || true
  pm2 start npm --name "kissmycheek" -- start
  pm2 save

  sleep 3

  echo "--- 4. Testing Port 3000 locally ---"
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 | grep -q "200\|307\|308\|302"; then
    echo "✅ PM2 App is RUNNING and responding on port 3000!"
  else
    echo "⚠️ Port 3000 response: $(curl -s -I http://127.0.0.1:3000 | head -n 1)"
  fi

  echo "--- 5. Checking Web Server Error Log ---"
  tail -n 10 ~/logs/kissmycheek.org.error.log 2>/dev/null || tail -n 10 /var/log/apache2/domains/kissmycheek.org.error.log 2>/dev/null || echo "No log files found in user home."
EOF

echo "========================================================"
echo "✨ Health Check & Fix completed!"
echo "========================================================"
