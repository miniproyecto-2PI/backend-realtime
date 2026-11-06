import { Router, Request, Response } from 'express';
import { getActiveClientsCount } from '../sockets/socketHandler';
import { env } from '../config/env';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    service: 'backend-realtime',
    description: 'Servidor de Tiempo Real (Socket.IO & WebRTC Signaling)',
    environment: env.NODE_ENV,
    activeSockets: getActiveClientsCount(),
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

export default router;
