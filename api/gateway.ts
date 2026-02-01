import type { VercelRequest, VercelResponse } from '@vercel/node';
import http from 'http';

async function proxyRequest(
  serviceUrl: string,
  req: VercelRequest,
  res: VercelResponse
) {
  const options = {
    hostname: new URL(serviceUrl).hostname,
    port: 443,
    path: req.url?.replace(/^\/api\/[^/]+/, '') || '/',
    method: req.method,
    headers: {
      ...req.headers,
      host: new URL(serviceUrl).hostname,
    },
  };

  return new Promise((resolve, reject) => {
    const proxyReq = http.request(options, (proxyRes) => {
      res.status(proxyRes.statusCode || 200);
      Object.entries(proxyRes.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      proxyRes.pipe(res);
      resolve(null);
    });

    proxyReq.on('error', (err) => {
      res.status(503).json({ error: 'Service unavailable', details: err.message });
      reject(err);
    });

    if (req.body) {
      proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const path = req.url || '';

  if (path.startsWith('/api/auth')) {
    return proxyRequest(process.env.AUTH_SERVICE_URL || '', req, res);
  } else if (path.startsWith('/api/users')) {
    return proxyRequest(process.env.USER_SERVICE_URL || '', req, res);
  } else if (path.startsWith('/api/projects')) {
    return proxyRequest(process.env.PROJECT_SERVICE_URL || '', req, res);
  } else if (path.startsWith('/api/payments')) {
    return proxyRequest(process.env.PAYMENT_SERVICE_URL || '', req, res);
  } else if (path.startsWith('/health')) {
    return res.status(200).json({ status: 'ok', service: 'api-gateway' });
  } else {
    return res.status(404).json({ error: 'Not found' });
  }
}
