/**
 * Base Provider Contract
 * All platform metadata resolvers must adhere to this standard structure.
 */

export class MediaProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Determine if provider can handle the given URL
   * @param {URL} url 
   * @returns {boolean}
   */
  canHandle(url) {
    throw new Error('Method not implemented: canHandle');
  }

  /**
   * Resolve public media from given target URL
   * @param {URL} url 
   * @param {object} env Edge environment bindings & API keys
   * @returns {Promise<MediaResult>}
   */
  async resolve(url, env) {
    throw new Error('Method not implemented: resolve');
  }
}

/**
 * @typedef {Object} MediaDownloadOption
 * @property {string} quality - e.g. "HD 1080p", "SD 720p", "Original"
 * @property {string} format - "mp4", "jpg", etc.
 * @property {string} url - Direct media stream URL
 * @property {string} [filename] - Clean proposed filename
 * @property {number} [width]
 * @property {number} [height]
 */

/**
 * @typedef {Object} MediaResult
 * @property {boolean} success
 * @property {string} platform - "instagram" | "facebook"
 * @property {string} id - Media identifier
 * @property {string} type - "video" | "image" | "carousel"
 * @property {string} title - Caption or summary
 * @property {string} author - Post author or profile
 * @property {string} thumbnail - Preview image URL
 * @property {MediaDownloadOption[]} downloads - List of downloadable assets
 * @property {string} [downloadUrl] - Primary fallback direct download URL
 * @property {string} [caption] - Full text caption
 */
