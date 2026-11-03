import { getSecurityHeaders } from '../../../../core/security.js';
import { FirebaseClient } from '../../../../database/firebase.js';

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();
  const clientIp = request.headers.get('cf-connecting-ip') || '127.0.0.1';

  try {
    const { email } = await request.json();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please enter a valid business or personal email address.'
      }), { status: 400, headers });
    }

    const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);
    const sanitizedEmailKey = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedIpKey = clientIp.replace(/[^a-zA-Z0-9]/g, '_');

    // Anti-abuse check 1: Check if email already claimed 1-Hour Free VIP trial
    if (firebase.isConfigured()) {
      const emailRecord = await firebase.get(`trials/emails/${sanitizedEmailKey}`);
      if (emailRecord) {
        return new Response(JSON.stringify({
          success: false,
          error: 'This email address has already redeemed the 1-Hour Free VIP Trial. Please upgrade to a VIP plan.'
        }), { status: 409, headers });
      }

      // Anti-abuse check 2: Check if this IP address already claimed trial in last 24 hours
      const ipRecord = await firebase.get(`trials/ips/${sanitizedIpKey}`);
      if (ipRecord && (Date.now() - ipRecord.claimedAt < 86400000)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'A free trial was already claimed from your network recently. To prevent abuse, please purchase a plan or try later.'
        }), { status: 429, headers });
      }
    }

    // Generate unique 1-Hour VIP Trial Token
    const trialDurationMs = 60 * 60 * 1000; // Exact 1 hour
    const expiresAt = Date.now() + trialDurationMs;
    const trialKey = `TRIAL-1H-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Store in Firebase leads & trial collections for marketing & branding
    if (firebase.isConfigured()) {
      await firebase.set(`trials/emails/${sanitizedEmailKey}`, {
        email: cleanEmail,
        trialKey,
        claimedAt: Date.now(),
        expiresAt,
        ip: clientIp
      });

      await firebase.set(`trials/ips/${sanitizedIpKey}`, {
        claimedAt: Date.now(),
        email: cleanEmail
      });

      // Save to company marketing leads
      await firebase.push('leads', {
        email: cleanEmail,
        source: '1_hour_vip_trial',
        company: 'IndraNex-Technologies',
        timestamp: Date.now()
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '1-Hour Free VIP Trial Activated Successfully!',
      data: {
        key: trialKey,
        email: cleanEmail,
        expiresAt: expiresAt,
        durationMinutes: 60
      }
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unable to process trial claim. ' + err.message
    }), { status: 500, headers });
  }
}
