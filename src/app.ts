import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import healthRoutes from './routes/health.routes';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';

export function createExpressApp(): Application {
  const app = express();

  app.use(helmet());

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
    })
  );

  app.use(express.json());

  // Rutas de salud
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // Ruta raíz
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'Salón de Estudio - Backend Realtime',
      status: 'active',
      technology: 'Node.js + TypeScript + Socket.IO',
      standards: 'TS-05: Contrato API y Errores Estándar',
      health: '/health',
      sprint: 'Sprint 0: Base Técnica End-to-End',
      timestamp: new Date().toISOString(),
    });
  });

  // Manejo de 404 bajo estándar TS-05
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `La ruta '${req.method} ${req.originalUrl}' no existe en el servidor de tiempo real.`,
        fields: null,
      },
    });
  });

  // Middleware global de errores
  app.use(errorHandler);

  return app;
}
