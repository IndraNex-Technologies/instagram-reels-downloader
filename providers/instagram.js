/**
 * Instagram Public Media Resolver - PulseFetch
 * Extracts public metadata from Instagram Reels, Posts, and Carousels.
 * Supports public Graph / Embed endpoints and authorized rapid providers when configured.
 */

import { MediaProvider } from './provider-interface.js';

export class InstagramProvider extends MediaProvider {
  constructor() {
    super('instagram');
  }

  canHandle(url) {
    const host = url.hostname.toLowerCase();
    return host.includes('instagram.com');
  }

  /**
   * Resolves public Instagram media.
   * @param {URL} targetUrl 
   * @param {object} env Cloudflare environment bindings
   */
  async resolve(targetUrl, env = {}) {
    const cleanUrl = this.normalizeUrl(targetUrl);
    const shortcode = this.extractShortcode(cleanUrl);

    if (!shortcode) {
      throw new Error('Could not identify a valid Instagram post or reel code from this link.');
    }

    // Step 1: If rapid/partner provider API key is configured in Worker environment
    if (env.INSTAGRAM_PROVIDER_API_KEY && env.INSTAGRAM_PROVIDER_ENDPOINT) {
      try {
        const upstream = await fetch(env.INSTAGRAM_PROVIDER_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.INSTAGRAM_PROVIDER_API_KEY}`
          },
          body: JSON.stringify({ url: cleanUrl.toString() })
        });

        if (upstream.ok) {
          const res = await upstream.json();
          if (res && res.data) {
            return this.formatUpstreamResponse(res.data, shortcode);
          }
        }
      } catch (e) {
        console.warn('Configured upstream Instagram provider failed, falling back to public embed extraction:', e.message);
      }
    }

    // Step 2: Native Public Embed Resolver
    // Uses Instagram's public embed page with high-definition assets
    const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;

    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      throw new Error('This Instagram post is private, age-restricted, or removed by creator.');
    }

    const html = await response.text();
    return this.parseEmbedHtml(html, shortcode, cleanUrl.toString());
  }

  normalizeUrl(url) {
    const parsed = new URL(url.toString());
    // Strip tracking parameters
    parsed.search = '';
    return parsed;
  }

  extractShortcode(url) {
    const match = url.pathname.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  parseEmbedHtml(html, shortcode, originalUrl) {
    // Extract thumbnail
    let thumbnail = '';
    const imgMatch = html.match(/class="EmbeddedMediaImage"[^>]+src="([^">]+)"/) ||
                     html.match(/<img[^>]+class="[^"]*EmbeddedMediaImage[^"]*"[^>]+src="([^">]+)"/) ||
                     html.match(/class="Avatar"[^>]+src="([^">]+)"/);
    if (imgMatch) {
      thumbnail = this.decodeHtmlEntities(imgMatch[1]);
    }

    // Extract author username
    let author = 'Instagram Creator';
    const authorMatch = html.match(/class="UsernameText"[^>]*>([^<]+)<\/span>/) ||
                        html.match(/class="Username"[^>]*>([^<]+)<\/a>/);
    if (authorMatch) {
      author = authorMatch[1].trim();
    }

    // Extract Caption
    let caption = '';
    const captionMatch = html.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/);
    if (captionMatch) {
      caption = captionMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Detect if this is video or photo
    const isVideo = html.includes('EmbeddedMediaVideo') || html.includes('video_url') || originalUrl.includes('/reel/');

    // Extract direct media stream if embedded in JSON payload
    let directMediaUrl = null;
    const videoUrlMatch = html.match(/"video_url":\s*"([^"]+)"/);
    if (videoUrlMatch) {
      directMediaUrl = JSON.parse(`"${videoUrlMatch[1]}"`);
    } else if (!isVideo && thumbnail) {
      directMediaUrl = thumbnail;
    }

    if (!directMediaUrl && !thumbnail) {
      throw new Error('The media stream for this public post could not be extracted. Provider access is currently limited.');
    }

    const downloads = [];
    if (isVideo && directMediaUrl) {
      downloads.push({
        quality: 'Full HD',
        format: 'MP4',
        url: directMediaUrl,
        filename: `PulseFetch_Instagram_${shortcode}.mp4`
      });
    } else if (thumbnail) {
      downloads.push({
        quality: 'Original Quality',
        format: 'JPG',
        url: thumbnail,
        filename: `PulseFetch_Instagram_${shortcode}.jpg`
      });
    }

    return {
      success: true,
      platform: 'instagram',
      id: shortcode,
      type: isVideo ? 'video' : 'image',
      title: caption ? caption.slice(0, 100) : 'Instagram Post',
      caption: caption || 'Instagram public media',
      author: author,
      thumbnail: thumbnail || directMediaUrl,
      downloadUrl: directMediaUrl || thumbnail,
      downloads: downloads
    };
  }

  formatUpstreamResponse(data, shortcode) {
    return {
      success: true,
      platform: 'instagram',
      id: data.id || shortcode,
      type: data.type || 'video',
      title: data.caption ? data.caption.slice(0, 100) : 'Instagram Post',
      caption: data.caption || '',
      author: data.author || 'Instagram Creator',
      thumbnail: data.thumbnail || '',
      downloadUrl: data.downloadUrl || (data.downloads && data.downloads[0]?.url),
      downloads: data.downloads || []
    };
  }

  decodeHtmlEntities(str) {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
  }
}
