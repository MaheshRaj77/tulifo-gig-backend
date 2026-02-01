import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  lastChecked: string;
  error?: string;
}

const SERVICES: Record<string, string> = {
  'Auth Service': process.env.AUTH_SERVICE_URL || 'https://auth-service.onrender.com',
  'User Service': process.env.USER_SERVICE_URL || 'https://user-service.onrender.com',
  'Project Service': process.env.PROJECT_SERVICE_URL || 'https://project-service.onrender.com',
  'Payment Service': process.env.PAYMENT_SERVICE_URL || 'https://payment-service.onrender.com',
  'Message Service': process.env.MESSAGE_SERVICE_URL || 'https://message-service.onrender.com',
  'Notification Service': process.env.NOTIFICATION_SERVICE_URL || 'https://notification-service.onrender.com',
  'Booking Service': process.env.BOOKING_SERVICE_URL || 'https://booking-service.onrender.com',
  'Matching Service': process.env.MATCHING_SERVICE_URL || 'https://matching-service.onrender.com',
  'Session Service': process.env.SESSION_SERVICE_URL || 'https://session-service.onrender.com',
  'Worker Service': process.env.WORKER_SERVICE_URL || 'https://worker-service.onrender.com',
  'Escrow Service': process.env.ESCROW_SERVICE_URL || 'https://escrow-service.onrender.com',
  'Dispute Service': process.env.DISPUTE_SERVICE_URL || 'https://dispute-service.onrender.com',
  'Review Service': process.env.REVIEW_SERVICE_URL || 'https://review-service.onrender.com',
  'Search Service': process.env.SEARCH_SERVICE_URL || 'https://search-service.onrender.com',
};

async function checkService(name: string, url: string): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        name,
        url,
        status: 'healthy',
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        name,
        url,
        status: 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        error: `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      name,
      url,
      status: 'unhealthy',
      responseTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function generateHTML(statuses: ServiceStatus[]): string {
  const healthy = statuses.filter(s => s.status === 'healthy').length;
  const unhealthy = statuses.filter(s => s.status === 'unhealthy').length;
  const timestamp = new Date().toLocaleString();

  const statusRows = statuses
    .map((service) => {
      const statusClass = service.status === 'healthy' ? 'status-healthy' : 'status-unhealthy';
      const statusIcon = service.status === 'healthy' ? '✓' : '✗';
      return `
        <tr>
          <td>${service.name}</td>
          <td class="${statusClass}">${statusIcon} ${service.status.toUpperCase()}</td>
          <td>${service.responseTime}ms</td>
          <td>${service.error || '-'}</td>
          <td><a href="${service.url}" target="_blank">Link</a></td>
        </tr>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tulifo Backend - Service Status</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
        sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .header {
      background: white;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .header h1 {
      color: #333;
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }
    
    .stat-box {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .stat-box.healthy {
      border-left-color: #10b981;
    }
    
    .stat-box.unhealthy {
      border-left-color: #ef4444;
    }
    
    .stat-box h3 {
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .stat-box .number {
      font-size: 28px;
      font-weight: bold;
      color: #333;
    }
    
    .table-container {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    thead {
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    
    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      font-size: 13px;
      text-transform: uppercase;
    }
    
    td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
      color: #555;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .status-healthy {
      color: #10b981;
      font-weight: 600;
      display: inline-block;
      padding: 4px 8px;
      background: #ecfdf5;
      border-radius: 4px;
    }
    
    .status-unhealthy {
      color: #ef4444;
      font-weight: 600;
      display: inline-block;
      padding: 4px 8px;
      background: #fef2f2;
      border-radius: 4px;
    }
    
    a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .footer {
      background: white;
      border-radius: 12px;
      padding: 15px 30px;
      margin-top: 20px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    
    .refresh-btn {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
      margin-top: 15px;
      border: none;
      font-size: 14px;
    }
    
    .refresh-btn:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Tulifo Backend Status</h1>
      <p><strong>Last Updated:</strong> ${timestamp}</p>
      <p><strong>Environment:</strong> Vercel Deployment</p>
      
      <div class="stats">
        <div class="stat-box healthy">
          <h3>Healthy</h3>
          <div class="number">${healthy}</div>
        </div>
        <div class="stat-box ${unhealthy > 0 ? 'unhealthy' : 'healthy'}">
          <h3>Unhealthy</h3>
          <div class="number">${unhealthy}</div>
        </div>
        <div class="stat-box">
          <h3>Total</h3>
          <div class="number">${statuses.length}</div>
        </div>
        <div class="stat-box">
          <h3>Success Rate</h3>
          <div class="number">${Math.round((healthy / statuses.length) * 100)}%</div>
        </div>
      </div>
      
      <form method="get" action="/api/status" style="margin-top: 15px;">
        <button class="refresh-btn" type="submit">Refresh Status</button>
      </form>
    </div>
    
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Service Name</th>
            <th>Status</th>
            <th>Response Time</th>
            <th>Error</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          ${statusRows}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>Status Dashboard • Auto-refreshes every 60 seconds</p>
      <p>For issues, check individual service logs or contact the DevOps team</p>
    </div>
  </div>
  
  <script>
    // Auto-refresh every 60 seconds
    setTimeout(() => {
      location.reload();
    }, 60000);
  </script>
</body>
</html>
  `;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check all services in parallel
    const statusPromises = Object.entries(SERVICES).map(([name, url]) =>
      checkService(name, url)
    );
    
    const statuses = await Promise.all(statusPromises);
    
    // If Accept header is application/json, return JSON
    if (req.headers.accept?.includes('application/json')) {
      return res.status(200).json({
        timestamp: new Date().toISOString(),
        services: statuses,
        summary: {
          total: statuses.length,
          healthy: statuses.filter(s => s.status === 'healthy').length,
          unhealthy: statuses.filter(s => s.status === 'unhealthy').length,
        },
      });
    }
    
    // Otherwise return HTML dashboard
    const html = generateHTML(statuses);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check service status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
