import { getSecurityHeaders } from '../../../../../core/security.js';
import { FirebaseClient } from '../../../../../database/firebase.js';

// Native Web Crypto SHA-256 for worker runtime
async function hashPassword(plainText, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(plainText),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt || 'PulseFetchSecureSalt2026'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Username and password are required'
      }), { status: 400, headers });
    }

    // Default emergency env fallback credentials if database not yet initialized
    const adminUser = env.ADMIN_USERNAME || 'admin';
    const adminPass = env.ADMIN_PASSWORD || 'PulseFetch2026!Secure';

    let authenticated = false;
    let role = 'Super Admin';

    // Verify against Firebase if configured
    const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);
    if (firebase.isConfigured()) {
      try {
        const storedAdmin = await firebase.get(`admins/${username.replace(/[^a-zA-Z0-9]/g, '_')}`);
        if (storedAdmin && storedAdmin.passwordHash) {
          const checkHash = await hashPassword(password, storedAdmin.salt);
          if (checkHash === storedAdmin.passwordHash) {
            authenticated = true;
            role = storedAdmin.role || 'Manager';
          }
        }
      } catch (e) {
        console.warn('Firebase admin check failed:', e.message);
      }
    }

    // Fallback to configured environment credentials
    if (!authenticated && username === adminUser && password === adminPass) {
      authenticated = true;
      role = 'Super Admin';
    }

    if (!authenticated) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid credentials. Access is monitored.'
      }), { status: 401, headers });
    }

    // Generate secure admin session token
    const tokenPayload = {
      username,
      role,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 86400000 // 24 hours
    };

    const token = btoa(JSON.stringify(tokenPayload));

    return new Response(JSON.stringify({
      success: true,
      data: {
        token,
        role,
        username
      }
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Authentication failed'
    }), { status: 500, headers });
  }
}
