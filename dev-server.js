/**
 * Local Development Server - PulseFetch
 * Serves static files and mounts local mock/edge handlers for API testing.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname.startsWith('/api/v1/')) {
    if (pathname === '/api/v1/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          status: 'operational',
          mode: 'local_preview',
          version: '1.2.0'
        }
      }));
      return;
    }

    if (pathname === '/api/v1/resolve' && req.method === 'POST') {
      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', () => {
        try {
          const body = JSON.parse(bodyStr || '{}');
          const targetUrl = (body.url || '').toLowerCase();

          const isInsta = targetUrl.includes('instagram.com');
          const isFb = targetUrl.includes('facebook.com') || targetUrl.includes('fb.watch');

          if (!isInsta && !isFb) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: { message: 'Invalid URL. Only Instagram & Facebook public links are supported.' }
            }));
            return;
          }

          // Return preview data
          const platform = isInsta ? 'instagram' : 'facebook';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: {
              success: true,
              platform: platform,
              id: 'preview_12345',
              type: 'video',
              title: isInsta ? 'Trending Instagram Reel (HD Audio)' : 'Viral Facebook Public Video',
              caption: 'Public Instagram Reel verified and extracted cleanly by Reel Save (IndraNex-Technologies). Ready for HD download.',
              author: isInsta ? '@creator_preview' : 'Creator Page',
              thumbnail: '/assets/placeholder-preview.svg',
              downloadUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              downloads: [
                {
                  quality: 'Full HD 1080p',
                  format: 'MP4',
                  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                  filename: `PulseFetch_${platform}_1080p.mp4`
                },
                {
                  quality: 'HD 720p',
                  format: 'MP4',
                  url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
                  filename: `PulseFetch_${platform}_720p.mp4`
                }
              ]
            }
          }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: { message: 'Invalid JSON body' } }));
        }
      });
      return;
    }

    if (pathname === '/api/v1/download') {
      const targetUrl = parsedUrl.searchParams.get('url');
      if (targetUrl) {
        res.writeHead(302, { Location: targetUrl });
        res.end();
        return;
      }
    }

    // Default admin mock for preview
    if (pathname === '/api/v1/admin/login' && req.method === 'POST') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          token: btoa(JSON.stringify({ username: 'admin', role: 'Super Admin', expiresAt: Date.now() + 86400000 })),
          username: 'admin',
          role: 'Super Admin'
        }
      }));
      return;
    }

    if (pathname === '/api/v1/admin/dashboard') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          stats: {
            totalRequests: 248,
            successRate: '99.2%',
            avgLatencyMs: 180,
            activeBlockedIps: 1
          },
          recentRequests: [
            { timestamp: Date.now() - 10000, platform: 'instagram', status: 'success', ipHash: '192.168.***', executionTimeMs: 140 },
            { timestamp: Date.now() - 40000, platform: 'facebook', status: 'success', ipHash: '10.0.***', executionTimeMs: 210 },
            { timestamp: Date.now() - 90000, platform: 'instagram', status: 'success', ipHash: '172.16.***', executionTimeMs: 195 }
          ]
        }
      }));
      return;
    }
  }

  // Static file serving from public directory
  if (pathname === '/') {
    pathname = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, pathname);

  if (!fs.existsSync(filePath)) {
    // Check if appending .html works
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 Not Found - PulseFetch Local Preview</h1>');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`PulseFetch preview server is running at http://localhost:${PORT}`);
});
