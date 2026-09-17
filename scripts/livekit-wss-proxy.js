#!/usr/bin/env node
/**
 * TLS/WebSocket reverse proxy: public 8443 → LiveKit 127.0.0.1:7880
 * Cloudflare allows HTTPS on 8443; Apache/PHP cannot upgrade websockets.
 */
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const path = require('path');
const os = require('os');

const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = Number(process.env.LIVEKIT_LOCAL_PORT || 7880);
const LISTEN_PORT = Number(process.env.LIVEKIT_WSS_PORT || 8443);
const DOMAIN = process.env.KMC_DOMAIN || 'kissmycheek.org';
const HOME = process.env.HOME || os.homedir();

function firstExisting(pairs) {
  for (const [cert, key] of pairs) {
    if (cert && key && fs.existsSync(cert) && fs.existsSync(key)) {
      return { cert, key };
    }
  }
  return null;
}

const files = firstExisting([
  [path.join(HOME, 'conf/web', DOMAIN, 'ssl', `${DOMAIN}.pem`), path.join(HOME, 'conf/web', DOMAIN, 'ssl', `${DOMAIN}.key`)],
  [path.join(HOME, 'conf/web', DOMAIN, 'ssl', 'fullchain.pem'), path.join(HOME, 'conf/web', DOMAIN, 'ssl', 'privkey.pem')],
  [`/etc/letsencrypt/live/${DOMAIN}/fullchain.pem`, `/etc/letsencrypt/live/${DOMAIN}/privkey.pem`]
]);

if (!files) {
  console.error('No TLS certificate found for', DOMAIN);
  process.exit(1);
}

const tls = {
  cert: fs.readFileSync(files.cert),
  key: fs.readFileSync(files.key)
};

function proxyHttp(req, res) {
  const p = http.request(
    {
      hostname: TARGET_HOST,
      port: TARGET_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `${TARGET_HOST}:${TARGET_PORT}` }
    },
    (upstream) => {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
    }
  );
  p.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end('LiveKit upstream unavailable');
  });
  req.pipe(p);
}

const server = https.createServer(tls, proxyHttp);

server.on('upgrade', (req, clientSocket, head) => {
  const backend = net.connect(TARGET_PORT, TARGET_HOST, () => {
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n');
    backend.write(`${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`);
    if (head && head.length) backend.write(head);
    backend.pipe(clientSocket);
    clientSocket.pipe(backend);
  });
  backend.on('error', () => clientSocket.destroy());
  clientSocket.on('error', () => backend.destroy());
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`LiveKit WSS proxy listening on :${LISTEN_PORT} → ${TARGET_HOST}:${TARGET_PORT}`);
});
