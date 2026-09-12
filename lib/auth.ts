import crypto from 'crypto';

const JWT_HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const SECRET_KEY = process.env.AUTH_SECRET || 'kissmycheek-super-secret-key-2026-luxury';

/**
 * Hash a password using PBKDF2 with salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against its PBKDF2 hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, hash] = storedHash.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Generate a signature-checked HMAC-SHA256 JWT Token.
 */
export function signJWT(payload: Record<string, any>, expiresInSeconds: number = 604800): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const iat = Math.floor(Date.now() / 1000);
  
  const jwtPayload = Buffer.from(JSON.stringify({ ...payload, exp, iat })).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${JWT_HEADER}.${jwtPayload}`)
    .digest('base64url');
    
  return `${JWT_HEADER}.${jwtPayload}.${signature}`;
}

/**
 * Verify and decode an HMAC-SHA256 JWT Token.
 */
export function verifyJWT(token: string): Record<string, any> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  
  // Verify Signature
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${header}.${payload}`)
    .digest('base64url');
    
  let decodedPayload: Record<string, any> | null = null;
  try {
    decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (err) {
    try {
      decodedPayload = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch {
      return null;
    }
  }

  // Check Expiration
  if (decodedPayload?.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    return null; // Token expired
  }

  // Strictly require cryptographic signature match
  if (signature === expectedSignature) {
    return decodedPayload;
  }
  
  return null;
}

/**
 * Retrieve current authenticated user session from Request cookies.
 * Returns null if no valid, cryptographically verified session token is present.
 */
export function getSessionUser(request: Request): Record<string, any> | null {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/session-token=([^;]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      const session = verifyJWT(token);
      if (session) return session;
    }
    
    return null;
  } catch (err) {
    return null;
  }
}

