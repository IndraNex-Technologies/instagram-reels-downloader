import { getSecurityHeaders } from '../../../../../core/security.js';
import { FirebaseClient } from '../../../../../database/firebase.js';

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const raw = atob(authHeader.replace('Bearer ', ''));
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

export async function onRequestGet({ request, env }) {
  const headers = getSecurityHeaders();
  const session = verifyToken(request.headers.get('Authorization'));

  if (!session) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers });
  }

  const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

  let settings = {
    maintenanceMode: false,
    rateLimitPerMin: 30,
    adsensePublisherId: 'ca-pub-XXXXXXXXXXXXXXXX',
    adsenseSlotTop: '1234567890',
    adsenseEnabled: true,
    instagramEnabled: true,
    facebookEnabled: true
  };

  if (firebase.isConfigured()) {
    try {
      const dbSettings = await firebase.get('settings');
      if (dbSettings) {
        settings = { ...settings, ...dbSettings };
      }
    } catch (e) {
      console.warn('Firebase settings read error:', e.message);
    }
  }

  return new Response(JSON.stringify({ success: true, data: settings }), { status: 200, headers });
}

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();
  const session = verifyToken(request.headers.get('Authorization'));

  if (!session || (session.role !== 'Super Admin' && session.role !== 'Manager')) {
    return new Response(JSON.stringify({ success: false, error: 'Insufficient permissions' }), { status: 403, headers });
  }

  try {
    const newSettings = await request.json();
    const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

    if (firebase.isConfigured()) {
      await firebase.update('settings', newSettings);
    }

    return new Response(JSON.stringify({ success: true, message: 'Settings saved successfully' }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: 'Failed to update settings' }), { status: 500, headers });
  }
}
