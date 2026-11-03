import { getSecurityHeaders } from '../../_shared/core/security.js';

export async function onRequestGet({ env }) {
  const headers = getSecurityHeaders();

  return new Response(JSON.stringify({
    success: true,
    data: {
      status: 'operational',
      version: '1.2.0',
      timestamp: new Date().toISOString(),
      platforms: {
        instagram: { status: 'active', supported: ['reels', 'videos', 'photos', 'carousels'] },
        facebook: { status: 'active', supported: ['videos', 'reels', 'watch'] }
      },
      monetization: 'Google AdSense Compliant'
    }
  }), { status: 200, headers });
}
