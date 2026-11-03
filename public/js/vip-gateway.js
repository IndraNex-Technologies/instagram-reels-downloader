/**
 * VIP Engine & Payment Gateway Controller - Reel Save by IndraNex-Technologies
 * UPI: tsayush@fam
 * Handles VIP Key generation, validation, No-Watermark high-speed CDN routing,
 * Ad-Free mode toggle, and payment verification popup.
 */

export const VIPEngine = {
  UPI_ID: 'tsayush@fam',
  PAYEE_NAME: 'Ayush Kumar Chaurasiya',

  /**
   * Check if current user has an active VIP pass
   */
  isVipActive() {
    const vipData = localStorage.getItem('reelsave_vip_session');
    if (!vipData) return false;
    try {
      const parsed = JSON.parse(vipData);
      if (parsed.expiresAt > Date.now()) {
        return true;
      }
      localStorage.removeItem('reelsave_vip_session');
      return false;
    } catch (e) {
      return false;
    }
  },

  /**
   * Activate VIP status using key
   */
  activateKey(key) {
    const cleanKey = (key || '').trim().toUpperCase();
    // Default master keys or generated keys from admin
    if (cleanKey.startsWith('VIP-') || cleanKey === 'INDRA-PRO' || cleanKey === 'AYUSH-VIP') {
      const session = {
        key: cleanKey,
        activatedAt: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days VIP
        isVip: true,
        noWatermark: true,
        adFree: true
      };
      localStorage.setItem('reelsave_vip_session', JSON.stringify(session));
      return { success: true, message: 'VIP Pass Activated! No Watermark + Ad-Free Mode is now ON.' };
    }
    return { success: false, message: 'Invalid or expired VIP Key. Contact @Tsayush_07 on Telegram.' };
  },

  /**
   * Generate dynamic UPI Deep-Link string
   */
  getUpiUri(amount = 29) {
    const note = encodeURIComponent('ReelSave VIP Without Watermark Pass');
    const name = encodeURIComponent(this.PAYEE_NAME);
    return `upi://pay?pa=${this.UPI_ID}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;
  },

  /**
   * Generates QR Code image URL via Google Chart API
   */
  getQrCodeUrl(amount = 29) {
    const upiUri = this.getUpiUri(amount);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiUri)}`;
  }
};
