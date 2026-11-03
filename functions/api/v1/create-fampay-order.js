import { getSecurityHeaders } from '../../../../core/security.js';
import { FirebaseClient } from '../../../../database/firebase.js';

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();

  try {
    const { planId, days, price, email } = await request.json();

    if (!planId || !price) {
      return new Response(JSON.stringify({ success: false, error: 'Plan and price required' }), { status: 400, headers });
    }

    const orderId = `INDRA_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const apiKey = env.FAMPAY_API_KEY || 'fam_67ac8f029fef464348033dec25ea7f314e999b76';
    const endpoint = env.FAMPAY_ENDPOINT || 'https://api.fampay.in/v1/checkout';

    const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

    // Save pending transaction in Firebase
    if (firebase.isConfigured()) {
      await firebase.set(`orders/${orderId}`, {
        orderId,
        planId,
        days,
        price,
        email: email || 'supporter@indranex.tech',
        status: 'PENDING',
        createdAt: Date.now()
      });
    }

    // Call FamPay Gateway endpoint if external live API is ready
    let checkoutUrl = null;
    try {
      const gatewayRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          order_id: orderId,
          amount: price,
          currency: 'INR',
          description: `ReelSave VIP ${days} Days Plan`,
          customer: { email: email || 'supporter@indranex.tech' },
          callback_url: `https://indranexadnet.dpdns.org/api/v1/fampay-webhook`
        })
      });

      if (gatewayRes.ok) {
        const gwData = await gatewayRes.json();
        if (gwData.checkout_url || gwData.payment_url) {
          checkoutUrl = gwData.checkout_url || gwData.payment_url;
        }
      }
    } catch (e) {
      console.warn('FamPay direct checkout call note:', e.message);
    }

    // FamPay UPI deep-link fallback with exact unique order note
    const upiUri = `upi://pay?pa=tsayush@fam&pn=Ayush%20Kumar%20Chaurasiya&am=${price}&cu=INR&tn=${orderId}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;

    return new Response(JSON.stringify({
      success: true,
      data: {
        orderId,
        checkoutUrl,
        upiUri,
        qrUrl,
        price,
        days,
        apiKeyUsed: apiKey.slice(0, 10) + '...'
      }
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500, headers });
  }
}
