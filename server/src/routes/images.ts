import { Router, Request, Response } from 'express';
import https from 'https';
import http from 'http';

const router = Router();

// GET /api/images?url=<encoded> — open proxy for external images (no auth required)
router.get('/', (req: Request, res: Response): void => {
  const { url } = req.query as { url?: string };

  if (!url) {
    res.status(400).json({ error: 'url is required' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    res.status(400).json({ error: 'Only http/https URLs are allowed' });
    return;
  }

  // Block private/local addresses
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.')
  ) {
    res.status(403).json({ error: 'Private addresses are not allowed' });
    return;
  }

  const client = parsed.protocol === 'https:' ? https : http;

  const upstream = client.get(url, { timeout: 8000 }, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] ?? 'image/jpeg';

    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      res.status(415).json({ error: 'URL does not point to an image' });
      proxyRes.destroy();
      return;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (proxyRes.headers['content-length']) {
      res.setHeader('Content-Length', proxyRes.headers['content-length']);
    }

    proxyRes.pipe(res);
  });

  upstream.on('error', () => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to fetch image' });
    }
  });

  upstream.on('timeout', () => {
    upstream.destroy();
    if (!res.headersSent) {
      res.status(504).json({ error: 'Image fetch timed out' });
    }
  });
});

export default router;
