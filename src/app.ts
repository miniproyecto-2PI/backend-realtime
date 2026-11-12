import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import healthRoutes from './routes/health.routes';
import { env } from './config/env';
import { createCorsDelegate, parseAllowedOrigins } from './config/cors';
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

  // Render termina TLS antes de Express: confiar en el primer proxy (req.protocol = https)
  app.set('trust proxy', 1);

  // CORS restringido a los orígenes de CORS_ORIGIN (ver config/cors.ts)
  app.use(cors(createCorsDelegate(parseAllowedOrigins(env.CORS_ORIGIN))));

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
