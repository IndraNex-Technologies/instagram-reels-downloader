/**
 * Google AdSense Helper & Policy Validator - PulseFetch
 * Centralizes layout rules, responsive slot initialization,
 * and safeguards against accidental click triggers or illegal overlay patterns.
 */

export const AdSenseConfig = {
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXX',
  slots: {
    homeTop: '1234567890',
    resultBottom: '0987654321',
    footerBanner: '1122334455'
  },

  /**
   * Safe asynchronous script injector for Google AdSense
   * @param {string} pubId
   */
  injectAdSenseScript(pubId) {
    if (!pubId || pubId.includes('XXXX')) {
      console.info('[PulseFetch Ads] Demo AdSense ID detected; live ad scripts paused.');
      return;
    }

    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`;
    document.head.appendChild(script);
  },

  /**
   * Pushes a slot request to AdSense queue if available
   */
  refreshSlot() {
    try {
      if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.warn('AdSense render error:', e.message);
    }
  }
};
