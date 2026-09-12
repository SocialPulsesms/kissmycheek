#!/bin/bash
# ==============================================================================
# Kiss My Cheek — Live Production Deployment Script
# Server: Asource (162.0.233.103)
# Domain: kissmycheek.org
# ==============================================================================

set -e

SERVER_IP="162.0.233.103"
SERVER_USER="${DEPLOY_USER:-Asource}"
# Server Path: Home / web / kissmycheek.org / public_html
REMOTE_DIR="/home/${SERVER_USER}/web/kissmycheek.org/public_html"

echo "========================================================"
echo "🚀 Starting Deployment to ${SERVER_IP} (kissmycheek.org)..."
echo "👤 User: ${SERVER_USER}"
echo "📁 Target Directory: ${REMOTE_DIR}"
echo "========================================================"

# Step 1: Create remote folder if it does not exist
echo "📁 [1/4] Ensuring remote directory structure exists..."
ssh ${SERVER_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}"

# Step 2: Sync Codebase (Excluding node_modules, .next, and git caches)
echo "📦 [2/4] Uploading files to ${REMOTE_DIR}..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude '.DS_Store' \
  ./ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/

# Step 3: Install dependencies, Build Next.js & Restart PM2
echo "⚡ [3/4] Installing dependencies & compiling Next.js build on server..."
ssh ${SERVER_USER}@${SERVER_IP} << 'EOF'
  set -e
  # Navigate to the website folder
  cd ~/web/kissmycheek.org/public_html || cd /home/*/web/kissmycheek.org/public_html

  # Load NVM and Node environment if present
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  export PATH="$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -n 1)/bin:$HOME/.npm-global/bin:$PATH"

  # Install Node.js 20 LTS via NVM if node is not found
  if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20 LTS (no root required)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
    nvm alias default 20
  fi

  echo "✅ Node version: $(node -v)"
  echo "✅ NPM version: $(npm -v)"

  # Ensure .htaccess is properly configured for PHP-to-Node proxy bridge
  cat << 'HTACCESS' > .htaccess
DirectoryIndex index.php

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    RewriteCond %{REQUEST_FILENAME} -f
    RewriteRule ^ - [L]

    RewriteRule ^ index.php [QSA,L]
</IfModule>
HTACCESS
  echo "✅ Apache .htaccess routing active."

  # Ensure PM2 is installed in user environment
  if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 process manager..."
    npm install -g pm2
  fi

  # Install project dependencies & generate Prisma client
  echo "Installing project dependencies..."
  npm install
  npx prisma generate 2>/dev/null || true

  # Build production bundle
  echo "Building Next.js luxury application..."
  npm run build

  # Start or restart PM2 background service
  if pm2 describe kissmycheek > /dev/null 2>&1; then
    echo "Restarting active PM2 instance..."
    pm2 restart kissmycheek --update-env
  else
    echo "Launching new PM2 instance on port 3000..."
    pm2 start npm --name "kissmycheek" -- start
    pm2 save || true
  fi
EOF

echo "========================================================"
echo "✅ Deployment Successful!"
echo "🌐 Website: https://kissmycheek.org (or http://${SERVER_IP})"
echo "👑 Admin Portal: https://kissmycheek.org/admin/login"
echo "========================================================"
