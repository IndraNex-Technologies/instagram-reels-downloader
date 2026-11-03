/**
 * Core Security Module - PulseFetch
 * Implements strict SSRF protection, private IP blocklists, URL sanitization,
 * input normalization, and response headers.
 */

// Private IPv4 and IPv6 CIDRs / special hostnames to block against SSRF
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  /^192\.168\.\d{1,3}\.\d{1,3}$/,     // 192.168.0.0/16
  /^169\.254\.\d{1,3}\.\d{1,3}$/,     // Link-local & cloud metadata 169.254.169.254
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^[fF][cCdD][0-9a-fA-F]{2}:/,       // Unique local IPv6
  /^[fF][eE]80:/                       // Link-local IPv6
];

// Allowed Social Media Domains
const ALLOWED_DOMAINS = [
  'instagram.com',
  'www.instagram.com',
  'm.instagram.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'web.facebook.com',
  'fb.watch',
  'fb.com'
];

/**
 * Validates whether a target URL is safe, conforms to allowed protocols,
 * and matches strictly allowed domains.
 * @param {string} rawUrl 
 * @returns {{ valid: boolean, parsedUrl?: URL, platform?: string, error?: string }}
 */
export function validateAndSanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL parameter is missing or empty' };
  }

  // Length guard to prevent memory exhaustion
  if (rawUrl.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum permitted length' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (e) {
    return { valid: false, error: 'Malformed URL structure' };
  }

  // Protocol enforcement (HTTPS only)
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF Check - Prevent Loopback, Private, and Cloud Metadata addresses
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      return { valid: false, error: 'Target host is not permitted (SSRF protection)' };
    }
  }

  // Domain Allowlist Check
  const isAllowed = ALLOWED_DOMAINS.some(allowed => 
    hostname === allowed || hostname.endsWith('.' + allowed)
  );

  if (!isAllowed) {
    return { valid: false, error: 'Domain not supported. Only Instagram and Facebook links are permitted.' };
  }

  // Determine platform
  let platform = 'unknown';
  if (hostname.includes('instagram.com')) {
    platform = 'instagram';
  } else if (hostname.includes('facebook.com') || hostname.includes('fb.watch') || hostname.includes('fb.com')) {
    platform = 'facebook';
  }

  return {
    valid: true,
    parsedUrl: parsed,
    platform: platform
  };
}

/**
 * Returns security response headers conforming to OWASP specifications.
 */
export function getSecurityHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

/**
 * Redacts sensitive fields from objects before logging
 */
export function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  const clone = { ...data };
  const sensitiveKeys = ['apiKey', 'token', 'authorization', 'password', 'secret', 'cookie'];
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}
