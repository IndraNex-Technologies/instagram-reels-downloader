import { validateAndSanitizeUrl, getSecurityHeaders } from '../../../../core/security.js';
import { checkRateLimit } from '../../../../core/ratelimit.js';
import { InstagramProvider } from '../../../../providers/instagram.js';
import { FacebookProvider } from '../../../../providers/facebook.js';
import { FirebaseClient } from '../../../../database/firebase.js';

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();
  const startTime = Date.now();
  const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

  // 1. Sliding window Rate Limiter check
  const rateLimit = await checkRateLimit(clientIp, env, 30, 60);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please wait ${rateLimit.resetIn} seconds before trying again.`
      }
    }), { status: 429, headers });
  }

  // 2. Parse request body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'INVALID_BODY', message: 'Invalid JSON request.' }
    }), { status: 400, headers });
  }

  // 3. SSRF & URL validation
  const validation = validateAndSanitizeUrl(body.url);
  if (!validation.valid) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'VALIDATION_FAILED', message: validation.error }
    }), { status: 400, headers });
  }

  // 4. Initialize Firebase backend client
  const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

  // Check if IP is explicitly blocked by admin
  const isBlocked = await firebase.isBlocked(clientIp.replace(/\./g, '_'));
  if (isBlocked) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'Your network has been temporarily blocked due to automated activity.' }
    }), { status: 403, headers });
  }

  // 5. Select Media Provider
  let provider;
  if (validation.platform === 'instagram') {
    provider = new InstagramProvider();
  } else if (validation.platform === 'facebook') {
    provider = new FacebookProvider();
  } else {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'UNSUPPORTED_PLATFORM', message: 'No registered resolver available for this platform.' }
    }), { status: 400, headers });
  }

  // 6. Execute public resolution
  try {
    const result = await provider.resolve(validation.parsedUrl, env);

    // Asynchronous background telemetry
    const duration = Date.now() - startTime;
    firebase.logRequest({
      platform: validation.platform,
      status: 'success',
      duration,
      ipHash: clientIp.slice(0, 7) + '***'
    });

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), { status: 200, headers });
  } catch (err) {
    const duration = Date.now() - startTime;
    firebase.logRequest({
      platform: validation.platform,
      status: 'error',
      duration,
      ipHash: clientIp.slice(0, 7) + '***'
    });

    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'EXTRACTION_ERROR',
        message: err.message || 'Media extraction failed. Post may be private or restricted.'
      }
    }), { status: 422, headers });
  }
}
