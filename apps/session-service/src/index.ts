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

// Routes will be imported here
// import sessionRoutes from './routes/session.routes';
// app.use('/api/sessions', sessionRoutes);

app.listen(PORT, () => {
  console.log(`Session Service running on port ${PORT}`);
});
