import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createExpressApp } from './app';
import { initSocketHandlers } from './sockets/socketHandler';
import { env } from './config/env';

const app = createExpressApp();
const httpServer = http.createServer(app);

// Inicializar Socket.IO sobre el servidor HTTP
const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 20000,
  pingInterval: 25000,
});

initSocketHandlers(io);

httpServer.listen(env.PORT, env.HOST, () => {
  console.log('========================================================');
  console.log(`⚡ Servidor Backend Realtime (Socket.IO) iniciado`);
  console.log(`📡 URL Base:      http://${env.HOST}:${env.PORT}`);
  console.log(`🩺 Health Check:  http://${env.HOST}:${env.PORT}/health`);
  console.log(`🌍 Entorno:       ${env.NODE_ENV}`);
  console.log('========================================================');
});

// Manejo de apagado elegante
const shutdown = (signal: string) => {
  console.log(`\n[Realtime] Señal ${signal} recibida. Cerrando conexiones...`);
  io.close(() => {
    httpServer.close(() => {
      console.log('[Realtime] Servidor cerrado correctamente.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
