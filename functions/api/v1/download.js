import { getSecurityHeaders } from '../../_shared/core/security.js';

/**
 * Direct Download Redirector
 * Issues a clean 302 Found redirect to the authorized CDN media stream
 * while attaching Content-Disposition header guidance and stripping referrers.
 */
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const targetMediaUrl = url.searchParams.get('url');
  const filename = url.searchParams.get('filename') || 'PulseFetch-media.mp4';

  if (!targetMediaUrl) {
    return new Response(JSON.stringify({
      error: 'Missing media target url parameter'
    }), { status: 400, headers: getSecurityHeaders() });
  }

  try {
    const parsedTarget = new URL(targetMediaUrl);
    
    // Strict origin verification for media redirect (Instagram/FB CDN domains)
    const host = parsedTarget.hostname.toLowerCase();
    const isLegitCdn = host.includes('fbcdn.net') ||
                       host.includes('cdninstagram.com') ||
                       host.includes('instagram.com') ||
                       host.includes('facebook.com');

    if (!isLegitCdn) {
      return new Response(JSON.stringify({
        error: 'Redirect destination is not an authorized media CDN'
      }), { status: 403, headers: getSecurityHeaders() });
    }

    // Direct redirect with sanitized attachment header
    return new Response(null, {
      status: 302,
      headers: {
        'Location': targetMediaUrl,
        'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'Invalid target media parameter'
    }), { status: 400, headers: getSecurityHeaders() });
  }
}
