import { getSecurityHeaders } from '../../_shared/core/security.js';
import { FirebaseClient } from '../../_shared/database/firebase.js';

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();

  try {
    const { planId, days, price, email, utr } = await request.json();

    if (!planId || !price) {
      return new Response(JSON.stringify({ success: false, error: 'Plan and price are required' }), { status: 400, headers });
    }

    const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

    // If FamPay Gateway API endpoint and API key are configured in environment
    if (env.FAMPAY_API_KEY && env.FAMPAY_ENDPOINT) {
      try {
        const fampayRes = await fetch(env.FAMPAY_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.FAMPAY_API_KEY}`
          },
          body: JSON.stringify({
            amount: price,
            currency: 'INR',
            orderId: `ORDER_${Date.now()}`,
            customerEmail: email || 'supporter@indranex.tech',
            notes: { planId, days, brand: 'IndraNex-Technologies' }
          })
        });

        if (fampayRes.ok) {
          const gatewayData = await fampayRes.json();
          return new Response(JSON.stringify({
            success: true,
            mode: 'gateway',
            data: gatewayData
          }), { status: 200, headers });
        }
      } catch (e) {
        console.warn('FamPay gateway direct call error, falling back to instant UPI deep-link:', e.message);
      }
    }

    // Default FamPay UPI Instant Link Generation (tsayush@fam)
    const upiPayee = env.UPI_ID || 'tsayush@fam';
    const payeeName = 'Ayush Kumar Chaurasiya';
    const note = encodeURIComponent(`ReelSave VIP ${days} Days Plan`);
    const upiUri = `upi://pay?pa=${upiPayee}&pn=${encodeURIComponent(payeeName)}&am=${price}&cu=INR&tn=${note}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

    // Log pending order to Firebase for Admin approval
    if (firebase.isConfigured()) {
      await firebase.push('orders', {
        planId,
        days,
        price,
        email: email || 'guest',
        upiId: upiPayee,
        status: 'pending_verification',
        createdAt: Date.now()
      });
    }

    return new Response(JSON.stringify({
      success: true,
      mode: 'upi',
      data: {
        upiUri,
        qrUrl,
        planId,
        price,
        days,
        payeeUpi: upiPayee
      }
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}
