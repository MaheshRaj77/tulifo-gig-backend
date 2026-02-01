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
    const fullUrl = `${url.protocol}//${url.host}${path}${req.url?.includes('?') ? `?${req.url.split('?')[1]}` : ''}`;

    const options = {
      method: req.method || 'GET',
      headers: {
        ...req.headers,
        'Content-Type': 'application/json',
      },
    };

    // Remove host header to avoid conflicts
    delete options.headers.host;

    const response = await fetch(fullUrl, {
      ...options,
      body: req.body ? JSON.stringify(req.body) : undefined,
    });

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

  // Route to appropriate service
  if (path.startsWith('/api/auth')) {
    return proxyRequest(process.env.AUTH_SERVICE_URL || 'https://auth-service.onrender.com', req, res);
  } else if (path.startsWith('/api/users')) {
    return proxyRequest(process.env.USER_SERVICE_URL || 'https://user-service.onrender.com', req, res);
  } else if (path.startsWith('/api/projects')) {
    return proxyRequest(process.env.PROJECT_SERVICE_URL || 'https://project-service.onrender.com', req, res);
  } else if (path.startsWith('/api/payments')) {
    return proxyRequest(process.env.PAYMENT_SERVICE_URL || 'https://payment-service.onrender.com', req, res);
  } else if (path.startsWith('/api/messages')) {
    return proxyRequest(process.env.MESSAGE_SERVICE_URL || 'https://message-service.onrender.com', req, res);
  } else if (path.startsWith('/api/notifications')) {
    return proxyRequest(process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service.onrender.com', req, res);
  } else if (path.startsWith('/api/bookings')) {
    return proxyRequest(process.env.BOOKING_SERVICE_URL || 'https://booking-service.onrender.com', req, res);
  } else if (path.startsWith('/api/matching')) {
    return proxyRequest(process.env.MATCHING_SERVICE_URL || 'https://matching-service.onrender.com', req, res);
  } else if (path.startsWith('/api/sessions')) {
    return proxyRequest(process.env.SESSION_SERVICE_URL || 'https://session-service.onrender.com', req, res);
  } else if (path.startsWith('/api/workers')) {
    return proxyRequest(process.env.WORKER_SERVICE_URL || 'https://worker-service.onrender.com', req, res);
  } else if (path.startsWith('/api/escrow')) {
    return proxyRequest(process.env.ESCROW_SERVICE_URL || 'https://escrow-service.onrender.com', req, res);
  } else if (path.startsWith('/api/disputes')) {
    return proxyRequest(process.env.DISPUTE_SERVICE_URL || 'https://dispute-service.onrender.com', req, res);
  } else if (path.startsWith('/api/reviews')) {
    return proxyRequest(process.env.REVIEW_SERVICE_URL || 'https://review-service.onrender.com', req, res);
  } else if (path.startsWith('/api/search')) {
    return proxyRequest(process.env.SEARCH_SERVICE_URL || 'https://search-service.onrender.com', req, res);
  } else {
    return res.status(404).json({
      error: 'Not found',
      message: 'Endpoint does not exist',
      path,
    });
  }
}
