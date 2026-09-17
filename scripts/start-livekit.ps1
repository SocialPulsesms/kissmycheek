# Kiss My Cheek — start self-hosted LiveKit on Windows (no WSL/Docker required).
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts/start-livekit.ps1

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ToolsDir = Join-Path $Root '.tools\livekit'
New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/livekit/livekit/releases/latest' -Headers @{ 'User-Agent' = 'kissmycheek' }
$asset = $release.assets | Where-Object { $_.name -like '*windows_amd64.zip' } | Select-Object -First 1
if (-not $asset) { throw 'No windows_amd64 LiveKit zip on the latest GitHub release.' }

$ZipPath = Join-Path $ToolsDir $asset.name
$ExePath = Join-Path $ToolsDir 'livekit-server.exe'

if (-not (Test-Path $ExePath)) {
  Write-Host "Downloading $($asset.name)..."
  Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $ZipPath -UseBasicParsing -Headers @{ 'User-Agent' = 'kissmycheek' }
  Expand-Archive -Path $ZipPath -DestinationPath $ToolsDir -Force
  $found = Get-ChildItem -Path $ToolsDir -Recurse -Filter 'livekit-server.exe' | Select-Object -First 1
  if (-not $found) {
    throw 'livekit-server.exe was not found inside the downloaded zip.'
  }
  if ($found.FullName -ne $ExePath) {
    Copy-Item $found.FullName $ExePath -Force
  }
  Write-Host "Installed: $ExePath"
}

$inUse = Get-NetTCPConnection -LocalPort 7880 -State Listen -ErrorAction SilentlyContinue
if ($inUse) {
  Write-Host "LiveKit is already running on ws://127.0.0.1:7880"
  Write-Host "Do not start a second copy. Open another terminal and run: npm run dev"
  Write-Host "One-PC test: two browser windows (normal + Incognito), two member logins, then Messages video button."
  exit 0
}

Write-Host "Starting LiveKit in --dev mode (API key: devkey, ws://127.0.0.1:7880)"
Write-Host "Keep this window open. In another terminal run: npm run dev"
& $ExePath --dev --bind 0.0.0.0
