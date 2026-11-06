import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import healthRoutes from './routes/health.routes';
import { env } from './config/env';
import { swaggerSpec } from './docs/swagger';
import { errorHandler } from './middlewares/errorHandler';

export function createExpressApp(): Application {
  const app = express();

  // Cabeceras de seguridad permitiendo Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // Configuración de CORS dinámico
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'OPTIONS'],
    })
  );

  app.use(express.json());

  // Rutas de documentación Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customSiteTitle: 'Salón de Estudio - Backend Realtime Docs (Swagger)',
    })
  );

  app.get('/api-docs', (_req: Request, res: Response) => {
    res.redirect('/api/docs');
  });

  app.get('/docs', (_req: Request, res: Response) => {
    res.redirect('/api/docs');
  });

  app.get('/api/docs.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Rutas de salud
  app.use('/health', healthRoutes);
  app.use('/api/health', healthRoutes);

  // Ruta raíz informativa
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      service: 'Salón de Estudio - Backend Realtime',
      status: 'active',
      technology: 'Node.js + TypeScript + Socket.IO',
      documentation: '/api/docs',
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
