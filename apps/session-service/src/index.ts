import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';

config();

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'session-service' });
});

// Session management is handled by auth-service (JWT refresh token families in Redis).
// This service is reserved for future analytics (active user tracking, login history).

app.listen(PORT, () => {
  console.log(`Session Service running on port ${PORT}`);
});
