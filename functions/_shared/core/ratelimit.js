/**
 * Edge Rate Limiter - PulseFetch
 * Implements sliding window IP-based rate limiting suitable for Cloudflare Workers / KV.
 */

// In-memory fallback map for sub-request contexts
const memoryRateMap = new Map();

/**
 * Checks and increments rate limiting counters
 * @param {string} clientIp 
 * @param {object} env Cloudflare environment bindings
 * @param {number} maxRequestsPerWindow Defaults to 20
 * @param {number} windowSeconds Defaults to 60
 * @returns {Promise<{ allowed: boolean, remaining: number, resetIn: number }>}
 */
export async function checkRateLimit(clientIp, env = {}, maxRequestsPerWindow = 25, windowSeconds = 60) {
  const ip = clientIp || '127.0.0.1';
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${ip}:${Math.floor(now / windowSeconds)}`;

  // If KV is bound in environment
  if (env.PULSEFETCH_KV && typeof env.PULSEFETCH_KV.get === 'function') {
    try {
      const current = parseInt(await env.PULSEFETCH_KV.get(windowKey) || '0', 10);
      if (current >= maxRequestsPerWindow) {
        return {
          allowed: false,
          remaining: 0,
          resetIn: windowSeconds - (now % windowSeconds)
        };
      }
      await env.PULSEFETCH_KV.put(windowKey, (current + 1).toString(), {
        expirationTtl: windowSeconds * 2
      });
      return {
        allowed: true,
        remaining: maxRequestsPerWindow - (current + 1),
        resetIn: windowSeconds - (now % windowSeconds)
      };
    } catch (e) {
      // Fall through to memory fallback on KV transient error
    }
  }

  // In-memory sliding window fallback
  const record = memoryRateMap.get(ip);
  if (!record || now - record.startTime > windowSeconds) {
    memoryRateMap.set(ip, { startTime: now, count: 1 });
    return {
      allowed: true,
      remaining: maxRequestsPerWindow - 1,
      resetIn: windowSeconds
    };
  }

  if (record.count >= maxRequestsPerWindow) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: windowSeconds - (now - record.startTime)
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxRequestsPerWindow - record.count,
    resetIn: windowSeconds - (now - record.startTime)
  };
}
