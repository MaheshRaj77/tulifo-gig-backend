import type { VercelRequest, VercelResponse } from '@vercel/node';

async function proxyRequest(
  serviceUrl: string,
  req: VercelRequest,
  res: VercelResponse,
  pathRewrite?: string
) {
  try {
    const path = pathRewrite || req.url?.replace(/^\/api\/[^/]+/, '') || '/';
    const url = new URL(serviceUrl);
    const queryString = req.url?.includes('?') ? `?${req.url.split('?')[1]}` : '';
    const fullUrl = `${url.protocol}//${url.host}${path}${queryString}`;

    const options = {
      method: req.method || 'GET',
      headers: req.headers as Record<string, string>,
    };

    // Remove host header to avoid conflicts
    delete (options.headers as Record<string, any>).host;
    (options.headers as Record<string, string>)['Content-Type'] = 'application/json';

    const response = await fetch(fullUrl, {
      ...options,
      body: req.body ? JSON.stringify(req.body) : undefined,
    } as RequestInit);

    // Copy response headers
    response.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const data = await response.text();
    return res.status(response.status).send(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(503).json({
      error: 'Service unavailable',
      details: message,
      service: serviceUrl,
    });
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const path = req.url || '/';

  // Health check endpoint
  if (path === '/health' || path === '/health/') {
    return res.status(200).json({
      status: 'healthy',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
    });
  }

  // Service routing configuration
  const routes: Record<string, string> = {
    '/api/auth': process.env.AUTH_SERVICE_URL || 'https://auth-service.onrender.com',
    '/api/users': process.env.USER_SERVICE_URL || 'https://user-service.onrender.com',
    '/api/projects': process.env.PROJECT_SERVICE_URL || 'https://project-service.onrender.com',
    '/api/payments': process.env.PAYMENT_SERVICE_URL || 'https://payment-service.onrender.com',
    '/api/messages': process.env.MESSAGE_SERVICE_URL || 'https://message-service.onrender.com',
    '/api/notifications': process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service.onrender.com',
    '/api/bookings': process.env.BOOKING_SERVICE_URL || 'https://booking-service.onrender.com',
    '/api/availability': process.env.BOOKING_SERVICE_URL || 'https://booking-service.onrender.com',
    '/api/matching': process.env.MATCHING_SERVICE_URL || 'https://matching-service.onrender.com',
    '/api/sessions': process.env.SESSION_SERVICE_URL || 'https://session-service.onrender.com',
    '/api/workers': process.env.WORKER_SERVICE_URL || 'https://worker-service.onrender.com',
    '/api/escrow': process.env.ESCROW_SERVICE_URL || 'https://escrow-service.onrender.com',
    '/api/disputes': process.env.DISPUTE_SERVICE_URL || 'https://dispute-service.onrender.com',
    '/api/reviews': process.env.REVIEW_SERVICE_URL || 'https://review-service.onrender.com',
    '/api/search': process.env.SEARCH_SERVICE_URL || 'https://search-service.onrender.com',
  };

  // Find matching route
  const serviceUrl = Object.entries(routes).find(([prefix]) => path.startsWith(prefix))?.[1];

  if (serviceUrl) {
    return proxyRequest(serviceUrl, req, res);
  }

  return res.status(404).json({
    error: 'Not found',
    message: 'Endpoint does not exist',
    path,
  });
}
