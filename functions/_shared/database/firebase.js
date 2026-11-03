/**
 * Firebase Realtime Database Client - PulseFetch
 * Communicates strictly from trusted backend operations over HTTPS REST.
 * Zero client-side Firebase libraries or exposed credentials.
 */

export class FirebaseClient {
  constructor(databaseUrl, databaseSecret) {
    this.databaseUrl = (databaseUrl || '').replace(/\/$/, '');
    this.databaseSecret = databaseSecret;
  }

  isConfigured() {
    return Boolean(this.databaseUrl && this.databaseSecret);
  }

  /**
   * Reads data at specific database path
   * @param {string} path 
   */
  async get(path) {
    if (!this.isConfigured()) return null;
    const cleanPath = path.replace(/^\//, '');
    const url = `${this.databaseUrl}/Downloader/${cleanPath}.json?auth=${encodeURIComponent(this.databaseSecret)}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Firebase read error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  /**
   * Sets or overwrites data at a path
   * @param {string} path 
   * @param {any} data 
   */
  async set(path, data) {
    if (!this.isConfigured()) return null;
    const cleanPath = path.replace(/^\//, '');
    const url = `${this.databaseUrl}/Downloader/${cleanPath}.json?auth=${encodeURIComponent(this.databaseSecret)}`;

    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Firebase write error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  /**
   * Appends record with Firebase auto-generated key (push)
   * @param {string} path 
   * @param {any} data 
   */
  async push(path, data) {
    if (!this.isConfigured()) return null;
    const cleanPath = path.replace(/^\//, '');
    const url = `${this.databaseUrl}/Downloader/${cleanPath}.json?auth=${encodeURIComponent(this.databaseSecret)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      throw new Error(`Firebase push error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  /**
   * Partial update at a path
   * @param {string} path 
   * @param {object} updates 
   */
  async update(path, updates) {
    if (!this.isConfigured()) return null;
    const cleanPath = path.replace(/^\//, '');
    const url = `${this.databaseUrl}/Downloader/${cleanPath}.json?auth=${encodeURIComponent(this.databaseSecret)}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      throw new Error(`Firebase update error (${res.status}): ${await res.text()}`);
    }
    return await res.json();
  }

  /**
   * Logs an extraction request to Firebase systemLogs and increments stats
   */
  async logRequest(meta) {
    if (!this.isConfigured()) return;
    try {
      const timestamp = Date.now();
      await this.push('requests', {
        platform: meta.platform,
        status: meta.status,
        timestamp: timestamp,
        executionTimeMs: meta.duration || 0,
        ipHash: meta.ipHash || 'anon'
      });
    } catch (e) {
      console.warn('Non-blocking Firebase log failure:', e.message);
    }
  }

  /**
   * Check if an IP or identifier is blocked
   */
  async isBlocked(identifier) {
    if (!this.isConfigured()) return false;
    try {
      const blocked = await this.get(`blockedUsers/${identifier}`);
      return Boolean(blocked);
    } catch (e) {
      return false;
    }
  }
}
