<?php
// ==============================================================================
// Kiss My Cheek — High-Performance PHP-to-NodeJS Reverse Proxy Bridge
// Enables Next.js & PM2 to run seamlessly on standard Apache + PHP-FPM hosting
// ==============================================================================

// Disable output compression buffers that can cause double-compression 520 errors with Cloudflare
if (ini_get('zlib.output_compression')) {
    ini_set('zlib.output_compression', 'Off');
}

$target_host = 'http://127.0.0.1:3000';
$request_uri = $_SERVER['REQUEST_URI'];
$request_path = parse_url($request_uri, PHP_URL_PATH) ?: '/';

// LiveKit health must work even if the Next.js build is missing /api/livekit/health
if ($request_path === '/api/livekit' || $request_path === '/api/livekit/health' || $request_path === '/api/livekit/health/') {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $errno = 0;
    $errstr = '';
    $fp = @fsockopen('127.0.0.1', 7880, $errno, $errstr, 1.5);
    $listening = is_resource($fp);
    if ($listening) {
        fclose($fp);
    }
    http_response_code(200);
    echo json_encode([
        'ok' => $listening,
        'livekitProcessListening' => $listening,
        'publicUrlConfigured' => null,
        'publicUrl' => null,
        'source' => 'origin-php-health'
    ]);
    exit;
}

$url = $target_host . $request_uri;
$method = $_SERVER['REQUEST_METHOD'];

// 1. Gather all incoming client headers
$headers = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if ($lower !== 'host' && $lower !== 'content-length' && $lower !== 'accept-encoding') {
            $headers[] = "$name: $value";
        }
    }
}
$headers[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'kissmycheek.org');
$headers[] = "X-Real-IP: " . ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$headers[] = "X-Forwarded-For: " . ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
$headers[] = "X-Forwarded-Proto: " . ((isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') ? 'https' : 'http');

// 2. Initialize cURL proxy request to Node.js / PM2 on Port 3000
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);
curl_setopt($ch, CURLOPT_ENCODING, ''); // Automatically decode gzip/deflate from Node.js

if (in_array($method, ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $input = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
}

$response = curl_exec($ch);

if (curl_errno($ch)) {
    $error_msg = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><title>Kiss My Cheek — Starting Server</title>';
    echo '<style>body{background:#0a0708;color:#f3e8cb;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}';
    echo '.card{background:#161113;border:1px solid #d4af37;padding:30px;border-radius:12px;text-align:center;max-width:500px;}';
    echo 'h1{color:#d4af37;margin-top:0;}</style></head><body>';
    echo '<div class="card"><h1>👑 Kiss My Cheek</h1>';
    echo '<p>The application engine is starting up on the live server.</p>';
    echo '<p style="color:#a89f91;font-size:13px;">Node.js service is initializing on port 3000. Please refresh in a few seconds.</p>';
    echo '<button onclick="location.reload()" style="background:#d4af37;color:#000;border:none;padding:10px 20px;border-radius:6px;font-weight:bold;cursor:pointer;margin-top:10px;">Refresh Page</button>';
    echo '</div></body></html>';
    exit;
}

$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$res_headers_str = substr($response, 0, $header_size);
$res_body = substr($response, $header_size);

// 3. Set response code and pass headers cleanly
http_response_code($http_code);
$header_lines = explode("\r\n", $res_headers_str);
foreach ($header_lines as $line) {
    if (empty($line) || stripos($line, 'HTTP/') === 0) continue;
    if (stripos($line, 'Transfer-Encoding:') === 0) continue;
    if (stripos($line, 'Connection:') === 0) continue;
    if (stripos($line, 'Content-Encoding:') === 0) continue; // Decoded by curl
    if (stripos($line, 'Content-Length:') === 0) continue; // Length recalculated by PHP/Apache
    header($line, false);
}

// 4. Output response body
echo $res_body;
