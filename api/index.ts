import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tulifo Backend - API Gateway</title>
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
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .container {
      max-width: 800px;
      width: 100%;
    }
    
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    
    h1 {
      color: #333;
      font-size: 36px;
      margin-bottom: 10px;
    }
    
    .subtitle {
      color: #666;
      font-size: 18px;
      margin-bottom: 30px;
    }
    
    .endpoints {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      text-align: left;
    }
    
    .endpoints h2 {
      color: #333;
      font-size: 18px;
      margin-bottom: 15px;
    }
    
    .endpoint {
      background: white;
      padding: 12px;
      margin: 8px 0;
      border-radius: 6px;
      border-left: 4px solid #667eea;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      color: #555;
    }
    
    .button-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 30px;
    }
    
    .btn {
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-size: 15px;
      transition: all 0.3s ease;
      display: inline-block;
    }
    
    .btn-primary {
      background: #667eea;
      color: white;
    }
    
    .btn-primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(102, 126, 234, 0.4);
    }
    
    .btn-secondary {
      background: #e5e7eb;
      color: #333;
    }
    
    .btn-secondary:hover {
      background: #d1d5db;
      transform: translateY(-2px);
    }
    
    .services-info {
      background: #f0f9ff;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
      border: 1px solid #7dd3fc;
    }
    
    .services-info h3 {
      color: #0369a1;
      margin-bottom: 10px;
    }
    
    .services-info p {
      color: #0c4a6e;
      font-size: 14px;
      line-height: 1.6;
    }
    
    .footer {
      margin-top: 30px;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h1>🚀 Tulifo Backend</h1>
      <p class="subtitle">Microservices API Gateway</p>
      
      <div class="endpoints">
        <h2>📍 Available Endpoints</h2>
        <div class="endpoint">GET /health</div>
        <div class="endpoint">GET /status</div>
        <div class="endpoint">POST /api/auth/login</div>
        <div class="endpoint">POST /api/auth/register</div>
        <div class="endpoint">GET /api/users/:id</div>
        <div class="endpoint">GET /api/projects</div>
        <div class="endpoint">POST /api/payments/process</div>
        <div class="endpoint">GET /api/messages</div>
      </div>
      
      <div class="services-info">
        <h3>ℹ️ 14 Microservices</h3>
        <p>Auth • User • Project • Payment • Message • Notification • Booking • Matching • Session • Worker • Escrow • Dispute • Review • Search</p>
      </div>
      
      <div class="button-group">
        <a href="/status" class="btn btn-primary">📊 View Status</a>
        <a href="/health" class="btn btn-secondary">💚 Health Check</a>
      </div>
      
      <div class="footer">
        <p>Deployed on Vercel • Last Updated: ${new Date().toLocaleString()}</p>
        <p>For API documentation, visit: <code>/api/docs</code></p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
