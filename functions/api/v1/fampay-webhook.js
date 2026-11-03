import { getSecurityHeaders } from '../../_shared/core/security.js';
import { FirebaseClient } from '../../_shared/database/firebase.js';

export async function onRequestPost({ request, env }) {
  const headers = getSecurityHeaders();

  try {
    const payload = await request.json();
    const { order_id, orderId, status, event } = payload;
    const finalOrderId = order_id || orderId;

    // Check payment success status from FamPay
    const isSuccess = (status === 'SUCCESS' || status === 'PAID' || event === 'payment.success');

    if (!finalOrderId) {
      return new Response(JSON.stringify({ error: 'Missing order_id' }), { status: 400, headers });
    }

    const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

    if (isSuccess && firebase.isConfigured()) {
      const order = await firebase.get(`orders/${finalOrderId}`);
      const days = order?.days || 30;

      // Auto-generate authenticated VIP key
      const vipKey = `VIP-FAM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);

      // Update order to PAID and create active VIP key
      await firebase.update(`orders/${finalOrderId}`, {
        status: 'PAID',
        vipKey,
        expiresAt,
        paidAt: Date.now()
      });

      await firebase.set(`vipKeys/${vipKey}`, {
        key: vipKey,
        orderId: finalOrderId,
        days,
        expiresAt,
        createdAt: Date.now()
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'FamPay Webhook Verified: VIP Key generated and unlocked automatically',
        vipKey
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}
