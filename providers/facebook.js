/**
 * Facebook Public Media Resolver - PulseFetch
 * Extracts public videos, Watch clips, and Reels.
 * Supports public Graph, OpenGraph parsers, and authorized upstream gateways.
 */

import { MediaProvider } from './provider-interface.js';

export class FacebookProvider extends MediaProvider {
  constructor() {
    super('facebook');
  }

  canHandle(url) {
    const host = url.hostname.toLowerCase();
    return host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com');
  }

  /**
   * Resolves public Facebook media
   * @param {URL} targetUrl 
   * @param {object} env 
   */
  async resolve(targetUrl, env = {}) {
    const cleanUrl = this.normalizeUrl(targetUrl);
    const videoId = this.extractMediaId(cleanUrl);

    // Step 1: Upstream authorized provider if present
    if (env.FACEBOOK_PROVIDER_API_KEY && env.FACEBOOK_PROVIDER_ENDPOINT) {
      try {
        const upstream = await fetch(env.FACEBOOK_PROVIDER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.FACEBOOK_PROVIDER_API_KEY}`
          },
          body: JSON.stringify({ url: cleanUrl.toString() })
        });

        if (upstream.ok) {
          const res = await upstream.json();
          if (res && res.data) {
            return this.formatUpstreamResponse(res.data, videoId);
          }
        }
      } catch (e) {
        console.warn('Configured Facebook provider API failed, falling back to public oEmbed:', e.message);
      }
    }

    // Step 2: Public OpenGraph / oEmbed Fallback
    const response = await fetch(cleanUrl.toString(), {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error('This Facebook media is either private, geo-blocked, or deleted.');
    }

    const html = await response.text();
    return this.parseOpenGraph(html, videoId, cleanUrl.toString());
  }

  normalizeUrl(url) {
    const parsed = new URL(url.toString());
    parsed.search = '';
    return parsed;
  }

  extractMediaId(url) {
    const path = url.pathname;
    const match = path.match(/\/(?:videos|reel|watch)\/([0-9]+)/) ||
                  path.match(/v=([0-9]+)/);
    return match ? match[1] : (path.split('/').filter(Boolean).pop() || 'facebook_media');
  }

  parseOpenGraph(html, videoId, originalUrl) {
    // Open Graph meta tag regexes
    const ogTitle = this.extractMeta(html, 'og:title') || 'Facebook Public Video';
    const ogDesc = this.extractMeta(html, 'og:description') || '';
    const ogImage = this.extractMeta(html, 'og:image') || '';
    const ogVideo = this.extractMeta(html, 'og:video') || this.extractMeta(html, 'og:video:secure_url');

    // Search for direct stream URLs in HTML state
    let hdUrl = null;
    let sdUrl = null;

    const hdMatch = html.match(/"browser_native_hd_url":\s*"([^"]+)"/) || html.match(/"playable_url_quality_hd":\s*"([^"]+)"/);
    if (hdMatch) {
      hdUrl = JSON.parse(`"${hdMatch[1]}"`);
    }

    const sdMatch = html.match(/"browser_native_sd_url":\s*"([^"]+)"/) || html.match(/"playable_url":\s*"([^"]+)"/);
    if (sdMatch) {
      sdUrl = JSON.parse(`"${sdMatch[1]}"`);
    }

    const primaryUrl = hdUrl || sdUrl || ogVideo;

    if (!primaryUrl && !ogImage) {
      throw new Error('Unable to extract downloadable video stream from this Facebook post. Content may be restricted.');
    }

    const downloads = [];
    if (hdUrl) {
      downloads.push({
        quality: 'High Definition (HD)',
        format: 'MP4',
        url: hdUrl,
        filename: `PulseFetch_Facebook_HD_${videoId}.mp4`
      });
    }
    if (sdUrl && sdUrl !== hdUrl) {
      downloads.push({
        quality: 'Standard (SD)',
        format: 'MP4',
        url: sdUrl,
        filename: `PulseFetch_Facebook_SD_${videoId}.mp4`
      });
    }
    if (downloads.length === 0 && primaryUrl) {
      downloads.push({
        quality: 'Default Quality',
        format: 'MP4',
        url: primaryUrl,
        filename: `PulseFetch_Facebook_${videoId}.mp4`
      });
    }

    return {
      success: true,
      platform: 'facebook',
      id: videoId,
      type: primaryUrl ? 'video' : 'image',
      title: ogTitle,
      caption: ogDesc,
      author: 'Facebook Creator',
      thumbnail: ogImage,
      downloadUrl: primaryUrl || ogImage,
      downloads: downloads
    };
  }

  extractMeta(html, property) {
    const match = html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
                  html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
    return match ? match[1] : null;
  }

  formatUpstreamResponse(data, videoId) {
    return {
      success: true,
      platform: 'facebook',
      id: data.id || videoId,
      type: data.type || 'video',
      title: data.title || 'Facebook Video',
      caption: data.caption || '',
      author: data.author || 'Facebook Page',
      thumbnail: data.thumbnail || '',
      downloadUrl: data.downloadUrl || (data.downloads && data.downloads[0]?.url),
      downloads: data.downloads || []
    };
  }
}
