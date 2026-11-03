import { getSecurityHeaders } from '../../_shared/core/security.js';
import { FirebaseClient } from '../../_shared/database/firebase.js';

export async function onRequestGet({ request, env }) {
  const headers = getSecurityHeaders();
  const url = new URL(request.url);
  const orderId = url.searchParams.get('orderId');

  if (!orderId) {
    return new Response(JSON.stringify({ success: false, error: 'Order ID is required' }), { status: 400, headers });
  }

  const firebase = new FirebaseClient(env.FIREBASE_DATABASE_URL, env.FIREBASE_DATABASE_SECRET);

  if (firebase.isConfigured()) {
    const order = await firebase.get(`orders/${orderId}`);
    if (order && order.status === 'PAID' && order.vipKey) {
      return new Response(JSON.stringify({
        success: true,
        paid: true,
        vipKey: order.vipKey,
        expiresAt: order.expiresAt
      }), { status: 200, headers });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    paid: false,
    status: 'PENDING'
  }), { status: 200, headers });
}
