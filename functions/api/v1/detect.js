import { validateAndSanitizeUrl, getSecurityHeaders } from '../../_shared/core/security.js';

export async function onRequestPost({ request }) {
  const headers = getSecurityHeaders();

  try {
    const body = await request.json();
    const result = validateAndSanitizeUrl(body.url);

    if (!result.valid) {
      return new Response(JSON.stringify({
        success: false,
        error: { code: 'INVALID_URL', message: result.error }
      }), { status: 400, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        platform: result.platform,
        normalizedUrl: result.parsedUrl.toString()
      }
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Malformed JSON payload' }
    }), { status: 400, headers });
  }
}
